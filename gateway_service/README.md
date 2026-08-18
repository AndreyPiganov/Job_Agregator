# Gateway Service

HTTP gateway для Job Aggregator на NestJS 11. Gateway принимает
публичные HTTP-запросы и вызывает `vacancy_service` по gRPC.

- проверка переменных окружения при старте;
- глобальная HTTP-валидация;
- Swagger по адресу `/api-docs`;
- структурированные логи в stdout и файлы;
- unit- и e2e-тесты;
- health check `GET /health`;
- типизированный gRPC-клиент Vacancy с deadline для каждого вызова;
- перевод gRPC-кодов ошибок в HTTP-статусы.

## Требования для локального запуска

- Node.js 22;
- npm 10 или новее.

При использовании `nvm`:

```bash
source ~/.nvm/nvm.sh
nvm install
nvm use
npm ci
```

Версия Node закреплена в `.nvmrc`.

## Запуск

```bash
npm run start:dev
```

После запуска:

- health check: `http://localhost:3000/health`;
- Swagger: `http://localhost:3000/api-docs`.

## Vacancy HTTP API

| Метод  | Маршрут                    | gRPC-метод                          |
| ------ | -------------------------- | ----------------------------------- |
| `GET`  | `/api/v1/vacancies`        | `ListVacancies`                     |
| `GET`  | `/api/v1/vacancies/filter` | `ListVacancies` (совместимый алиас) |
| `GET`  | `/api/v1/vacancies/:id`    | `GetVacancy`                        |
| `POST` | `/api/v1/vacancies`        | `CreateVacancy`                     |
| `POST` | `/api/v1/vacancies/batch`  | `BatchCreateVacancies`              |

Batch endpoint принимает массив вакансий напрямую:

```json
[
  {
    "title": "Senior Go Developer",
    "description": "Develop and maintain backend services in Go.",
    "salary": 250000,
    "link": "https://example.com/vacancies/123",
    "city": "Moscow",
    "company_name": "Yandex"
  }
]
```

Обёртка `{ "vacancies": [...] }` в публичном HTTP API не используется. Gateway
добавляет её сам при формировании gRPC-запроса `BatchCreateVacanciesRequest`.

Пример фильтра:

```text
GET /api/v1/vacancies?q=Go&search_field=title,company_name&city=Moscow&items_per_page=25&min_salary=100000
```

HTTP API использует snake_case для составных имён полей: например,
`company_name`, `items_per_page`, `min_salary` и `max_salary`. Это совпадает с
именами полей protobuf и исключает отдельное преобразование перед gRPC-вызовом.

HTTP DTO проверяют наличие обязательных полей, типы и форму входных
JSON/query-данных. Ограничения предметной области — допустимые длины,
диапазоны, enum-значения и связи между полями — проверяются Protovalidate в
`vacancy_service`. Поэтому те же правила защищают сервис и при вызове не через
Gateway, например из другого gRPC-сервиса.

## Protobuf-контракт

Gateway генерирует из общего контракта TypeScript-типы и интерфейс
gRPC-клиента командой `npm run proto:generate`. Режим `nestJs=true`
не создаёт отдельный runtime-клиент или кодеки. Опция `snakeToCamel=false`
сохраняет protobuf-имена в сгенерированных TypeScript-интерфейсах. Эта же
команда собирает `src/generated/contracts.binpb` со всеми импортами, включая
Protovalidate.

Nest передаёт descriptor в `packageDefinition`, поэтому контейнеру Gateway не
нужны исходные `.proto`, `validate.proto` или volume с контрактами.

## Проверки

```bash
npm run format:check
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Из корня репозитория те же задачи доступны через Makefile:

```bash
make gateway-deps
make gateway-run
make gateway-test
make gateway-build
make gateway-check
```

## Переменные окружения

| Переменная                | По умолчанию      | Назначение                                  |
| ------------------------- | ----------------- | ------------------------------------------- |
| `NODE_ENV`                | `development`     | `development`, `test` или `production`      |
| `PORT`                    | `3000`            | HTTP-порт приложения                        |
| `LOG_LEVEL`               | `info`            | Минимальный уровень логирования             |
| `LOG_DIR`                 | `logs`            | Каталог файловых логов                      |
| `VACANCY_GRPC_URL`        | `localhost:50051` | Адрес gRPC-сервера Vacancy                  |
| `VACANCY_GRPC_TIMEOUT_MS` | `3000`            | Deadline одного gRPC-вызова в миллисекундах |

Gateway не подключается напрямую к базе данных `vacancy_service`.

## Docker

Из корня репозитория:

```bash
make up-build
make logs-gateway
make health-gateway
```

Development-образ использует Node 22 и watch mode. Production-образ собирается в
отдельной стадии и содержит только `dist` и production-зависимости.
