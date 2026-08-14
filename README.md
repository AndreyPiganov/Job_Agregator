# Job Aggregator

Сервис для хранения, обновления и поиска вакансий. Сейчас в проекте полностью
реализован `vacancy_service`: HTTP API на Go, PostgreSQL, фильтрация, сортировка,
валидация запросов и структурированное логирование.

Каталоги `parser_service` и `auth_service` зарезервированы под будущие сервисы и
пока не входят в Docker Compose.

## Возможности

- создание одной вакансии или пакета до 1000 вакансий;
- обновление существующей вакансии при повторной отправке той же ссылки;
- получение списка и отдельной вакансии по ID;
- поиск по заголовку, описанию и названию компании;
- фильтрация по городам, зарплате и времени публикации;
- сортировка по дате и зарплате;
- пагинация;
- HTTP-валидация и единый формат ошибок;
- request ID, access logs и восстановление после panic;
- JSON-логи в stdout и отдельные файлы по уровням;
- автоматическая подготовка схемы PostgreSQL при запуске.

## Технологии

- Go 1.25;
- PostgreSQL 16;
- `chi` — HTTP-маршрутизация;
- `pgx` и `sqlc` — доступ к PostgreSQL;
- `go-playground/validator` — валидация HTTP-запросов;
- `slog` и `lumberjack` — структурированные логи и ротация;
- Docker и Docker Compose.

## Архитектура

```mermaid
flowchart LR
    Client[HTTP client] --> Handler[HTTP handler]
    Handler --> Service[Service]
    Service --> Repository[Repository]
    Repository --> SQLC[pgx / sqlc]
    SQLC --> PostgreSQL[(PostgreSQL)]
```

- `handler` разбирает HTTP-запрос, валидирует DTO и формирует ответ;
- `service` содержит прикладные правила, нормализацию пагинации и периода;
- `repository` выполняет запросы и транзакции;
- `internal/db` содержит схему, SQL и сгенерированный `sqlc`-код.

## Структура проекта

```text
Job_Agregator/
├── vacancy_service/          # реализованный сервис вакансий
│   ├── cmd/vacancy/          # точка входа
│   ├── internal/config/      # переменные окружения
│   ├── internal/domain/      # доменные модели и параметры фильтрации
│   ├── internal/http/        # router, middleware, handler и DTO
│   ├── internal/service/     # прикладная логика
│   ├── internal/repository/  # PostgreSQL repository
│   ├── internal/db/          # schema.sql, SQL-запросы и sqlc-код
│   ├── internal/logging/     # настройка логирования
│   └── internal/validation/  # validator и сообщения об ошибках
├── parser_service/           # запланирован
├── auth_service/             # запланирован
├── docker-compose.yml        # development
├── docker-compose.prod.yml   # production
├── Makefile                  # единые команды запуска и проверок
└── .env.example              # пример конфигурации
```

## Быстрый запуск

### Требования

- Docker Desktop или Docker Engine;
- Docker Compose v2.
- GNU Make для сокращённых команд (необязательно: их можно заменить на `docker compose`).

Go и PostgreSQL на хосте для запуска через Docker не требуются.

### 1. Настройте окружение

Создайте `.env` из примера, если файла ещё нет.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

Для локальной разработки достаточно значений из примера. Файл `.env` не нужно
добавлять в Git.

### 2. Запустите проект

Основной запуск всей системы с логами в терминале:

```bash
make dev
```

Или запуск в фоне:

```bash
make up-build
make ps
```

После запуска:

- HTTP API: `http://localhost:5003`;
- health check: `http://localhost:5003/health`;
- PostgreSQL: `localhost:5425`.

Проверка:

```bash
curl http://localhost:5003/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```

### Управление контейнерами

```bash
docker compose logs -f vacancy_service
docker compose restart vacancy_service
docker compose down
```

Обычный `docker compose down` сохраняет данные PostgreSQL. Команда ниже удаляет
named volume вместе с базой данных:

```bash
docker compose down -v
```

Корневые сокращения для Docker Compose:

```bash
make up             # запустить development-контейнеры
make up-build       # пересобрать и запустить
make logs-vacancy   # смотреть логи vacancy_service
make down           # остановить, сохранив PostgreSQL volume
make down-volumes   # остановить и удалить данные PostgreSQL
```

Проверки исходного кода также запускаются из корня через Makefile:

```bash
make test             # запустить тесты vacancy_service
make vet              # выполнить go vet
make vacancy-build    # собрать vacancy_service
make check            # последовательно выполнить vet, test и build
make sqlc-generate    # обновить код, сгенерированный sqlc
```

## HTTP API

Все ответы имеют `Content-Type: application/json`.

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| `GET` | `/health` | состояние сервиса |
| `GET` | `/vacancies/?page=1&itemsPerPage=10` | список вакансий |
| `GET` | `/vacancies/{id}` | вакансия по ID |
| `POST` | `/vacancies/` | создать или обновить вакансию |
| `POST` | `/vacancies/batch` | создать или обновить пакет вакансий |
| `GET` | `/vacancies/filter` | поиск, фильтрация и сортировка |

### Создание вакансии

```bash
curl -X POST http://localhost:5003/vacancies/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go developer",
    "description": "Разработка backend-сервисов",
    "salary": 180000,
    "city": "Moscow",
    "link": "https://example.com/vacancies/42",
    "companyName": "Example"
  }'
```

Ограничения основных полей:

- `title` — обязательное, до 200 символов;
- `description` — обязательное, до 10 000 символов;
- `salary` — неотрицательное число;
- `city` — обязательное, до 100 символов;
- `link` — обязательный URL, до 2048 символов;
- `companyName` — обязательное, до 200 символов.

Поле `link` уникально. Если вакансия с такой ссылкой уже существует, сервис
обновит её данные вместо создания дубликата.

### Пакетное создание

Endpoint принимает JSON-массив:

```json
[
  {
    "title": "Go developer",
    "description": "Backend",
    "salary": 180000,
    "city": "Moscow",
    "link": "https://example.com/vacancies/42",
    "companyName": "Example"
  }
]
```

Или объект с полем `vacancies`:

```json
{
  "vacancies": [
    {
      "title": "Go developer",
      "description": "Backend",
      "salary": 180000,
      "city": "Moscow",
      "link": "https://example.com/vacancies/42",
      "companyName": "Example"
    }
  ]
}
```

Максимальный размер пакета — 1000 вакансий. Пакет сохраняется в одной
транзакции: при ошибке изменения откатываются.

### Поиск и фильтрация

Пример комбинированного запроса:

```text
GET /vacancies/filter?q=Backend&search_field=title&search_field=company_name&city=Moscow,Kazan&minSalary=100000&sort=salary_desc&period=week&page=1&itemsPerPage=20
```

| Параметр | Значения | Описание |
| --- | --- | --- |
| `q` | строка до 200 символов | искомая подстрока, регистр не учитывается |
| `search_field` | `title`, `description`, `company_name` | поле поиска; параметр можно повторять или передать через запятую |
| `city` | название города | точное совпадение без учёта регистра; можно повторять или перечислять через запятую |
| `minSalary` | число `>= 0` | минимальная зарплата |
| `maxSalary` | число `>= 0` | максимальная зарплата |
| `sort` | `date_desc`, `date_asc`, `salary_desc`, `salary_asc` | сортировка; по умолчанию `date_desc` |
| `period` | `day`, `3_days`, `week` | публикации за последние 24, 72 или 168 часов |
| `page` | целое число от 1 | страница, по умолчанию 1 |
| `itemsPerPage` | от 1 до 100 | размер страницы, по умолчанию 10 |

Если передан `q`, но отсутствует `search_field`, поиск выполняется одновременно
по `title`, `description` и `company_name`. Передавать `search_field` без `q`
нельзя.

Период является скользящим: `day` означает последние 24 часа, а не время с
начала текущего календарного дня.

### Формат ошибок

```json
{
  "code": "validation_failed",
  "message": "Validation failed",
  "errors": [
    {
      "field": "Title",
      "code": "required",
      "message": "Title is required"
    }
  ]
}
```

Внутренние ошибки не раскрывают детали PostgreSQL или stack trace клиенту — они
попадают только в логи.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `POSTGRES_USER` | `root` в development | пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | `example` в development | пароль PostgreSQL |
| `POSTGRES_DB` | `job` | база данных |
| `POSTGRES_PORT` | `5425` | порт PostgreSQL на хосте |
| `DATABASE_URL` | обязательна для production | строка подключения сервиса |
| `VACANCY_PORT` | `5003` | порт API на хосте |
| `LOG_LEVEL` | `debug` в development, `info` в production | минимальный уровень stdout-логов |
| `LOG_DIR` | `/var/log/vacancy-service` в контейнере | каталог файловых логов |

Значения production-секретов нельзя хранить в Git. Перед production-запуском
обязательно замените пароль и проверьте, что он совпадает в `POSTGRES_PASSWORD`
и `DATABASE_URL`.

## Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
```

Production-образ:

- собирает статический Go-бинарник в multi-stage build;
- запускает приложение от непривилегированного пользователя `app`;
- использует read-only filesystem и отдельный writable-каталог логов;
- ограничивает размер Docker JSON-логов;
- корректно обрабатывает `SIGTERM` и завершает активные HTTP-запросы.

Порт API привязан к `127.0.0.1`. Для внешнего доступа рекомендуется поставить
перед сервисом reverse proxy с HTTPS.

## Логи

Сервис пишет JSON-логи в stdout и разделяет файловые логи по уровню:

```text
var/log/vacancy_service/
├── debug.log
├── info.log
├── warn.log
└── error.log
```

Ротация каждого файла:

- максимальный размер — 20 MB;
- до 5 резервных файлов;
- хранение до 14 дней;
- старые файлы сжимаются.

Просмотр stdout:

```bash
docker compose logs -f vacancy_service
```

Docker healthcheck обращается к `/health` каждые 10 секунд. Поэтому регулярные
записи `GET /health` с `user_agent: Wget` в debug-логах являются нормальными.

## Локальный запуск без Docker для Go-приложения

Сначала запустите только PostgreSQL:

```bash
docker compose up -d postgres
cd vacancy_service
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://root:change-me@localhost:5425/job?sslmode=disable"
$env:PORT="5003"
go run ./cmd/vacancy
```

Bash:

```bash
export DATABASE_URL="postgresql://root:change-me@localhost:5425/job?sslmode=disable"
export PORT="5003"
go run ./cmd/vacancy
```

Пароль в строке подключения должен совпадать со значением в вашем `.env`.

## Тесты и проверка кода

```bash
cd vacancy_service
go test ./...
go vet ./...
```

Или через Makefile сервиса:

```bash
make test
make vet
```

## SQL и sqlc

Исходные SQL-файлы:

- `vacancy_service/internal/db/schema.sql`;
- `vacancy_service/internal/db/queries/vacancy.sql`.

После изменения схемы или запросов необходимо обновить сгенерированный код:

```bash
cd vacancy_service
make sqlc-install
make sqlc-vet
make sqlc-generate
go test ./...
```

Сейчас `schema.sql` выполняется приложением при старте через `CREATE TABLE IF NOT
EXISTS` и `CREATE INDEX IF NOT EXISTS`. Для сложных изменений схемы в дальнейшем
стоит подключить версионируемые миграции.

## Планы развития

- реализовать `parser_service` для сбора вакансий из внешних источников;
- реализовать `auth_service` и разграничение доступа;
- вынести изменения схемы в отдельный migration tool;
- добавить интеграционные тесты PostgreSQL;
- добавить OpenAPI-спецификацию и метрики.
