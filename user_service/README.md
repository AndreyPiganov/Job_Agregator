# User Service

Внутренний NestJS gRPC-микросервис, который владеет пользовательскими профилями,
резюме и связанными данными. Данные хранятся в PostgreSQL-схеме `user`, доступ
к БД изолирован в Prisma repositories.

## Модули

- `user` — идемпотентное создание `User`, минимального профиля и регистрационного контакта;
- `profile` — профиль, добровольные контакты, языки, гражданства, образование и опыт работы;
- `resume` — черновики резюме, выбранный опыт/образование, навыки, роли, сертификаты и публикация;
- `common` — Prisma lifecycle, gRPC errors/filter, logging interceptor, enum/date mappers;
- `config` — типизированная проверка переменных окружения и Winston.

Контракт находится в `../contracts/user/v1/user.proto`. Один proto-файл содержит
три отдельных сервиса: `UserService`, `UserProfileService` и
`ResumeService`. Сейчас все RPC unary; saved searches и favorite/hidden vacancies
есть в модели данных, но намеренно ещё не вынесены в API.

Таблица `user.users` содержит только UUID и timestamps. Email, password hash,
OAuth-привязки, роли и статус принадлежат `auth_service`. Перед удаляющей
миграцией `202608250002_move_auth_ownership` на существующей непустой базе нужно
сначала применить auth-миграцию `202608250001_identity_credentials`.

Регистрационный `email` либо `phone_number` передаётся из auth в `CreateUser` и
автоматически сохраняется как начальный контакт. Пользователь затем может
изменить или удалить его, а также добавить `telegram_username` и
`github_username`. `PUT profile` выполняет полную замену: если contacts не
переданы или все их поля пусты, строка `user.user_contacts` удаляется. Повторный
`CreateUser` существующий контакт не восстанавливает и не перезаписывает.

## Справочники

Справочники заполняются двумя versioned data migrations:

- `20260823151148_seed_country_language_reference_data` — 250 стран/территорий и 183 языка с русскими названиями; коды основаны на ISO 3166-1 alpha-2 и ISO 639-1, названия зафиксированы из Unicode CLDR 48.0;
- `20260823162019_seed_education_roles_skills_reference_data` — 58 укрупнённых направлений ОКСО ОК 009-2016, 194 профессиональные роли из публичного справочника hh.ru и 246 стартовых мультиотраслевых навыков.

Последующие изменения справочников должны оформляться новой data migration;
уже применённый SQL изменять нельзя.

## Локальный запуск

Требуется Node.js 22 и доступная PostgreSQL с применённой миграцией.

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev
```

Через Docker Compose из корня проекта:

```bash
docker compose up --build -d user_service
docker compose logs -f user_service
```

По умолчанию gRPC слушает `127.0.0.1:5000` на хосте.

## Проверки

```bash
npm run prisma:validate
npm run format:check
npm run lint
npm test -- --runInBand
npm run build
```

Из корня те же проверки доступны командой `make user-check`.

## Переменные окружения

- `DATABASE_URL` — PostgreSQL URL, обязательный в production;
- `GRPC_HOST` — адрес прослушивания, по умолчанию `0.0.0.0`;
- `GRPC_PORT` — порт, по умолчанию `5000`;
- `LOG_LEVEL` — уровень Winston;
- `LOG_DIR` — каталог файловых логов.

Production-контейнер не запускает миграции автоматически: перед развёртыванием
нужно отдельно выполнить `npm run prisma:migrate:deploy` в миграционном job/этапе.
