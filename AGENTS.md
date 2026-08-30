# AGENTS.md

Этот файл задаёт архитектурные и рабочие правила для всего репозитория. Перед
изменением конкретного сервиса сначала изучите соседние файлы его текущего
модуля, соответствующий protobuf-контракт и корневой `README.md`.

Цель проекта — коммерчески понятная архитектура без формального
переусложнения. Разделяйте реальные ответственности, но не создавайте отдельный
класс или файл для каждого метода только ради соответствия шаблону.

## Границы сервисов

- `gateway_service` — единственный публичный HTTP API. Здесь находятся HTTP
  controllers/DTO, Swagger, Passport JWT, HTTP-to-gRPC mapping и кэш чтения.
- `auth_service` — владелец identity, email/телефона для входа, password/OAuth
  credentials, ролей, статуса доступа, JWT и refresh-сессий.
- `user_service` — владелец user anchor, публичных контактов, профиля,
  образования, опыта, резюме и пользовательских справочников.
- `vacancy_service` — владелец компаний и вакансий. Он предоставляет только
  внутренний gRPC API; не возвращайте в него HTTP transport.
- `contracts` — единственный источник межсервисных protobuf-контрактов.
- `parser_service` пока не реализован. Не проектируйте его поведение без
  отдельной задачи.

Не дублируйте ownership. Например, пароль не хранится в `user_service`, а
контактные данные профиля не нужно получать из `auth_service` при каждом чтении
пользователя.

## Межсервисное взаимодействие

- Текущие request/response операции используют unary gRPC.
- Регистрация синхронно вызывает `UserService/CreateUser`. Этот RPC должен
  оставаться идемпотентным, чтобы можно было продолжить `PENDING` регистрацию.
- Kafka и outbox в проекте сейчас отсутствуют. Не добавляйте их как побочный
  рефакторинг; это отдельное архитектурное решение.
- Generated NestJS gRPC clients возвращают `Observable`, но прикладной код
  работает с `Promise` через общий `createUnaryGrpcClientProxy`.
- Не размножайте `firstValueFrom`, `timeout`, `executeGrpcRequest` и одинаковый
  try/catch по каждому client-методу. Таймаут и преобразование gRPC-ошибок
  настраиваются один раз в proxy.
- `ValidateAccessToken` не вызывается для каждого HTTP-запроса. Gateway локально
  проверяет access JWT; RPC предназначен для будущих чувствительных операций,
  которым нужна актуальная сессия/identity.

## NestJS: структура модулей

Используйте feature-first структуру `src/modules/<feature>`. Внутри одного
бизнес-модуля допустимы:

```text
<feature>.module.ts
<feature>.controller.ts
services/
repositories/
clients/
mappers/
interfaces/
constants/
dto/                    # только в HTTP Gateway
utils/                  # только чистые предметные helpers
```

Не обязательно создавать все каталоги: добавляйте их, когда в модуле реально
есть соответствующая ответственность. Сохраняйте текущий локальный стиль
модуля, если перенос не является частью задачи.

- Controller занимается только transport boundary: принимает validated input,
  вызывает сервис и формирует transport response.
- Service реализует сценарий и бизнес-правила.
- Repository инкапсулирует Prisma/БД, запросы и транзакции.
- Client инкапсулирует внешний gRPC dependency.
- Mapper преобразует DTO/protobuf/Prisma/domain формы и является
  `@Injectable()`, если используется controller/service через DI.
- Не создавайте отдельный Nest-модуль только для mapper.
- Связанные локальные интерфейсы храните вместе в одном-двух файлах
  `interfaces/<feature>.interfaces.ts`; не нужен файл на каждый маленький type.
- Модульные константы находятся в `constants`, а переиспользуемые
  инфраструктурные вещи — в `src/common`.
- Прикладные ошибки находятся в `common/errors`, exception filters — в
  `common/filters`, error mappers — в `common/mappers`.

Не складывайте feature-specific types/constants/errors в общий каталог без
реального переиспользования.

## Gateway conventions

- Публичные payload и query parameters используют текущий `snake_case` API.
- HTTP input проверяется DTO через глобальный `ValidationPipe`.
- Защищённые маршруты используют `JwtAuthGuard`/Passport JWT. Login, register,
  refresh и logout не защищаются access guard.
- Не добавляйте повторный вызов `auth_service` после успешной локальной проверки
  JWT без требования чувствительной операции.
- gRPC ошибки сначала преобразуются в `UpstreamServiceError`, затем глобальный
  HTTP filter отображает их в HTTP status.
- Проверяйте отсутствующие поля upstream response только если protobuf
  генератор сделал поле optional, а его отсутствие действительно нарушает
  контракт. Не добавляйте универсальные `require/getRequiredGrpcField` wrappers
  без конкретной необходимости.
- Кэш профилей, резюме и вакансий реализуется через `cache-manager` и
  `AppCacheService`. Mutation должна обновлять или инвалидировать связанные
  ключи.
- Кэш не должен быть источником истины и не должен делать запрос недоступным при
  временной ошибке Redis.

## Auth conventions

- Пароли хэшируются через `bcrypt`; не возвращайте и не логируйте password hash.
- Fingerprint токена создаётся библиотекой `js-sha256`, а не самописной
  реализацией SHA-256.
- Для refresh-сессий используется прямой Redis client, потому что rotation и
  revoke требуют атомарных операций и строгого управления ключами/TTL.
  `cache-manager` для auth-сессий не использовать.
- Passport JWT живёт в Gateway. `auth_service` реализует gRPC use cases, выпуск
  токенов и session lifecycle, а не HTTP Passport strategy.
- `email_codes` пока зарезервирована и не участвует в регистрации. Не включайте
  обязательное подтверждение без SMTP/phone verification задачи.
- OAuth-модели не означают, что OAuth flow уже реализован.
- Сохраняйте разбиение auth-модуля на `clients`, `constants`, `interfaces`,
  `mappers`, `repositories` и `services`.

## User conventions

- `CreateUser` создаёт минимальный `User`, обязательный `UserProfile` с именем и
  фамилией и начальный `UserContact` с регистрационным email или телефоном.
- `user_service` не хранит password credentials, auth roles или refresh-сессии.
- Profile, Resume и User остаются отдельными feature-модулями.
- Mapper — DI-класс, repository работает с Prisma, service содержит сценарий.
- Предметные проверки находятся в service. Проверки, необходимые для атомарной
  целостности нескольких записей, могут выполняться внутри repository
  transaction.
- Не возвращайте union-result вида `{ kind: ... }`, если проект уже выражает
  этот исход прикладным исключением.
- Независимые read-запросы можно выполнять через `Promise.all`. Транзакция нужна
  для атомарной записи или согласованного snapshot, а не просто потому, что
  запросов несколько.
- Чистые вычисления, например стаж в месяцах, выносятся в именованный utility,
  но обычные use-case шаги не маскируются под utils.

## Prisma, проверки и ошибки

- TypeScript/Prisma поля остаются в camelCase; физические PostgreSQL имена
  задаются через `@map` и `@@map` в snake_case. Не переводите Prisma API в
  snake_case ради устранения mapper-слоя.
- Известные Prisma errors преобразуются централизованными Prisma exception
  filters/mappers. Не размножайте `isPrismaError` и проверки `P2002/P2003/P2025`
  в каждом service/repository.
- Если смысл одной Prisma-ошибки зависит от конкретного use case, service может
  преобразовать её в предметную ошибку, но общий transport status остаётся в
  filter.
- Protovalidate проверяет внутренние protobuf requests; Gateway DTO проверяют
  HTTP boundary. Не дублируйте те же ограничения вручную в service.
- `trim`, изменение регистра валюты/кодов и парсинг дат являются
  canonicalization/mapping, а не заменой валидации.
- Не используйте `requireInput` для protobuf-полей, обязательность которых уже
  гарантирована Protovalidate, если нет реальной `undefined`-границы generated
  type.

## Vacancy service (Go)

Сохраняйте текущую прагматичную структуру:

```text
cmd/api/                         запуск API
cmd/healthcheck/                 container healthcheck
internal/app/                    composition root и lifecycle
internal/config/                 конфигурация
internal/domain/                 сущности, бизнес-типы и ошибки
internal/service/                единый VacancyService и service DTO
internal/repository/             repository ports
internal/repository/postgres/    PostgreSQL adapter
internal/repository/postgres/db/ schema, SQL и generated sqlc
internal/handler/grpc/           gRPC handler, mappers, interceptor, rpcerror
internal/proto/                  generated protobuf Go code
internal/logging/                настройка логирования
```

- Направление зависимостей: handler -> service -> repository port/domain;
  PostgreSQL реализует repository port; `app` связывает concrete dependencies.
- Не разносите каждый метод `VacancyService` по отдельному файлу. Делите файл,
  когда появляется самостоятельная ответственность, а не по количеству методов.
- Domain не импортирует protobuf, sqlc, pgx или HTTP/JSON presentation types.
- Handler не содержит SQL и бизнес-правил.
- Service не импортирует pgx/sqlc или generated protobuf.
- PostgreSQL adapter отвечает за mapping DB rows, SQL details и транзакции.
- `vacancy_service` остаётся gRPC-only; внешний HTTP находится в Gateway.
- Пока схема запускается из embedded idempotent `schema.sql`. Не изображайте это
  как полноценные versioned migrations.

## Контракты и generated code

- Редактируйте `contracts/auth/v1/auth.proto`, `contracts/user/v1/user.proto` и
  `contracts/vacancy/v1/vacancy.proto`, а не generated файлы.
- После изменения контракта выполняйте `make proto-generate`.
- Не меняйте generated Prisma, protobuf, Protovalidate или sqlc code вручную.
- Внешний HTTP DTO может отличаться от protobuf; преобразование выполняется в
  mapper на границе.
- Изменение существующего protobuf field number запрещено. Новые поля получают
  новые номера; удалённые номера/имена резервируются при необходимости.

## Миграции и справочники

- Для `auth_service` и `user_service` создавайте новую Prisma migration. Не
  редактируйте уже применённую миграцию для изменения текущей схемы.
- Reference data заполняется идемпотентными migration SQL/seed scripts с
  предсказуемыми натуральными кодами там, где они существуют.
- После Prisma schema/migration изменений выполняйте generate, validate, тесты
  и build соответствующего сервиса.
- Не удаляйте пользовательские или чужие изменения из dirty worktree.

## Проверка изменений

Запускайте проверки пропорционально затронутому коду:

```bash
make vacancy-check
make gateway-check
make auth-check
make user-check
make check
```

Для инфраструктурных изменений дополнительно:

```bash
make config
make prod-config
```

Для contract/DB generation:

```bash
make proto-generate
make sqlc-vet
make sqlc-generate
```

Не запускайте одну и ту же падающую команду много раз. Сначала определите,
является ли причина кодом, окружением WSL/sandbox, отсутствующим dependency или
недоступной инфраструктурой, затем выберите одну осмысленную проверку.

## Поддержание документации

При изменении публичного route, payload name, порта, env-переменной, команды,
границы ownership или структуры сервиса одновременно обновляйте:

- корневой `README.md`;
- Swagger decorators/DTO, если меняется HTTP API;
- `.env.example` и оба Compose-файла, если меняется конфигурация;
- Postman/smoke flow, если меняется публичный сценарий;
- этот `AGENTS.md`, только если изменилось долговременное архитектурное правило.
