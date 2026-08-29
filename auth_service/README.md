# Auth Service

Внутренний NestJS gRPC-сервис, который регистрирует пользователей, проверяет
пароли, выпускает JWT и управляет refresh-сессиями.

## Текущий сценарий

```text
Register
  -> Protovalidate + ровно один identifier: canonical email или E.164 phone
  -> обязательные first_name + last_name
  -> PENDING identity + bcrypt credential в auth PostgreSQL
  -> unary gRPC CreateUser(id, name, registration contact) в user_service
  -> ACTIVE identity
  -> access JWT + refresh JWT
  -> fingerprint refresh token в Redis

Login
  -> identity + bcrypt credential из auth PostgreSQL
  -> access JWT + refresh JWT
  -> fingerprint refresh token в Redis

RefreshToken
  -> проверка refresh JWT
  -> атомарная замена fingerprint в Redis
  -> новая пара JWT

ValidateAccessToken
  -> проверка access JWT
  -> проверка активной Redis-сессии
  -> актуальный статус и роли identity из auth PostgreSQL

Logout
  -> удаление Redis-сессии
```

Обычные защищённые HTTP-запросы не вызывают `ValidateAccessToken`: Gateway
проверяет access JWT локально по публичному RSA-ключу. RPC сохранён для будущих
чувствительных операций, которым нужны актуальные статус, роли и состояние
сессии.

`Register` вызывается только после заполнения финальной формы с именем и
фамилией, поэтому отдельного состояния «пустой профиль» нет. SMTP, проверка email
и SMS-проверка телефона пока намеренно не подключены. Таблица
`auth.email_codes` уже присутствует в Prisma и миграции, но текущая регистрация
её не читает и не изменяет. Место будущей проверки отмечено
`TODO(identifier-verification)`.

`auth_service` владеет identity, email/phone, credentials, OAuth-привязками,
ролями и состоянием доступа. `user_service` владеет профилем, образованием,
опытом и резюме. Оба сервиса используют один UUID, но не читают таблицы друг
друга во время обычной работы.

После локального создания identity auth вызывает идемпотентный unary-метод
`UserService.CreateUser`. `user_service` одной транзакцией создаёт `User`,
обязательный `UserProfile` и `UserContact` с регистрационным email либо
телефоном. До успешного ответа identity остаётся `PENDING` и не может войти.
Повторный `Register` с тем же паролем продолжает незаконченную регистрацию; с
другим паролем получить такую identity нельзя.

Пароли хэшируются асинхронным `bcrypt` с cost factor 12. Из-за ограничения
bcrypt входной пароль ограничен 72 байтами UTF-8, а не 72 символами.

## Контракт

Сервис публикует пакет `jobaggregator.auth.v1` на `0.0.0.0:5005`:

- `Register`;
- `Login`;
- `RefreshToken`;
- `ValidateAccessToken`;
- `Logout`.

Исходный контракт находится в `../contracts/auth/v1/auth.proto`. TypeScript-типы
и descriptor set генерируются из единого корневого `buf.gen.yaml`:

```bash
npm run proto:generate
```

Сгенерированные файлы вручную не редактируются.

## Архитектура

```text
src/modules/auth/
├── auth.module.ts                    # сборка Nest-модуля
├── auth.controller.ts                # gRPC controller и mapping ответа
├── auth.service.ts                   # register/login/refresh/validate/logout
├── clients/
│   └── user.client.ts                # gRPC-клиент идемпотентного CreateUser
├── repositories/
│   └── identity.repository.ts        # Prisma-доступ к identity/credentials
├── services/
│   ├── password.service.ts           # bcrypt
│   ├── token.service.ts              # JWT и SHA-256 fingerprint
│   └── session.service.ts            # Redis-сессии и rotation
└── types/
    └── auth.types.ts                 # внутренние типы auth
```

Структура повторяет подход Gateway: controller вызывает основной service, а
технические зависимости подключаются через обычный Nest dependency injection.
Отдельных слоёв ports/adapters и DI-токенов для локальных классов нет. Prisma
участвует в runtime registration/login и изолирован в repository.

`@nestjs/passport` здесь не используется намеренно: он решает извлечение
credentials/bearer-token из HTTP request, запуск strategy и заполнение
`req.user`. У этого сервиса входом служат protobuf-сообщения gRPC. Passport
используется в HTTP Gateway для JWT guard и в будущем для OAuth, а
создание identity, проверка хеша, выпуск JWT и Redis rotation всё равно
оркестрируются auth-сервисом. Credentials принадлежат `auth_service`, а Passport
не заменяет эту доменную логику.

## gRPC и будущая Kafka

Сейчас создание user синхронное: HTTP-регистрация должна сразу вернуть либо
полностью готовую учётную запись, либо ошибку. Для такого запроса/ответа unary
gRPC проще и прозрачнее.

Если регистрацию понадобится отвязать от доступности `user_service`, после
локальной транзакции можно публиковать `IdentityRegistered` через transactional
outbox и Kafka. Consumer обязан быть идемпотентным. Kafka полезна для событий и
нескольких независимых подписчиков (уведомления, аналитика, поисковый индекс),
но не заменяет синхронные запросы профиля или проверки токена.

## PostgreSQL и миграции

Prisma-схема: `prisma/schema.prisma`.

Миграции создают:

- `auth.email_codes` — задел для подтверждения email/reset password;
- enum `auth.EmailCodePurpose`;
- индексы очистки/поиска email codes.
- `auth.identities`, `auth.password_credentials`, `auth.external_identities`;
- перенос существующих auth-данных из `user.users`/`user.external_accounts`.
- nullable email для phone-only identity и DB-проверку наличия хотя бы одного login identifier.

Для непустой существующей базы сначала применяется миграция `auth_service`, а
затем `user_service/202608250002_move_auth_ownership`, удаляющая старые auth-поля.

Команды:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev -- --name migration_name
npm run prisma:migrate:deploy
```

Development Compose выполняет `prisma migrate deploy` перед стартом сервиса.
В production миграции нужно запускать отдельным deployment/CI шагом до обновления
контейнера приложения: production image не содержит Prisma CLI.

## Redis и JWT

В Redis хранится не refresh-token, а его SHA-256 fingerprint. Rotation выполнена
Lua-скриптом compare-and-set: одновременно применить один старый refresh-token
дважды нельзя. Logout удаляет refresh-сессию и запрещает дальнейшее обновление
пары токенов. Уже выпущенный access JWT остаётся действительным до конца
короткого TTL; по умолчанию это не более 10 минут.

Access JWT подписывается закрытым RSA-ключом в `auth_service` (`RS256`), а
Gateway получает только соответствующий публичный ключ. Refresh JWT остаётся
симметричным (`HS256`), потому что выпускается и проверяется только Auth. Оба
типа имеют отдельные ключи, TTL и поле `typ`; проверка также фиксирует issuer и
audience.

## Конфигурация

| Переменная                      | По умолчанию              | Назначение                                           |
| ------------------------------- | ------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                      | `development`             | `development`, `test` или `production`               |
| `GRPC_HOST`                     | `0.0.0.0`                 | адрес gRPC-сервера                                   |
| `GRPC_PORT`                     | `5005`                    | порт gRPC-сервера                                    |
| `DATABASE_URL`                  | локальная auth schema     | PostgreSQL connection string                         |
| `USER_GRPC_URL`                 | `127.0.0.1:5000`          | адрес внутреннего `user_service`                     |
| `USER_GRPC_TIMEOUT_MS`          | `3000`                    | timeout одного gRPC-запроса к `user_service`         |
| `REDIS_HOST`                    | `127.0.0.1`               | Redis host                                           |
| `REDIS_PORT`                    | `6379`                    | Redis port                                           |
| `REDIS_PASSWORD`                | `change-me`               | Redis password                                       |
| `REDIS_DB`                      | `1`                       | отдельная Redis DB auth-сервиса                      |
| `AUTH_SESSION_NAMESPACE`        | `job-aggregator:auth`     | prefix ключей сессий                                 |
| `JWT_ACCESS_PRIVATE_KEY_BASE64` | встроенный dev-ключ       | base64 PKCS#8 RSA private key для подписи access JWT |
| `JWT_REFRESH_SECRET`            | dev-значение              | отдельный refresh key                                |
| `JWT_ACCESS_TTL_SECONDS`        | `600`                     | TTL access token                                     |
| `JWT_REFRESH_TTL_SECONDS`       | `2592000`                 | TTL refresh token                                    |
| `JWT_ISSUER`                    | `job-aggregator-auth`     | JWT issuer                                           |
| `JWT_AUDIENCE`                  | `job-aggregator-services` | JWT audience                                         |
| `LOG_LEVEL`                     | `info`                    | минимальный уровень Winston                          |
| `LOG_DIR`                       | `logs`                    | каталог файлов логов                                 |

В production встроенный RSA private key, dev refresh-secret и локальный
`DATABASE_URL` запрещены. Соответствующий публичный ключ передаётся Gateway
через `JWT_ACCESS_PUBLIC_KEY_BASE64`.

Пару production-ключей можно подготовить так (base64 здесь только удобный
формат передачи PEM через environment, а не шифрование):

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out access-private.pem
openssl pkey -in access-private.pem -pubout -out access-public.pem
base64 -w0 access-private.pem
base64 -w0 access-public.pem
```

## Локальная проверка

Требуется Node.js 22:

```bash
npm ci
npm run prisma:validate
npm run prisma:generate
npm run format:check
npm run lint
npm test -- --runInBand
npm run build
```
