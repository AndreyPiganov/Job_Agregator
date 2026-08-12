# vacancy_service

Go service for storing and reading vacancies.

The service uses `pgx` for PostgreSQL connections and `sqlc` for generated,
type-safe query code.

## HTTP API

- `GET /health`
- `GET /vacancies?page=1&itemsPerPage=10`
- `GET /vacancies/{id}`
- `POST /vacancies`
- `POST /vacancies/batch`
- `GET /vacancies/filter?q=Acme&search_field=company_name&city=Moscow&minSalary=50000&sort=salary_desc&period=week`

Filter query parameters:

- `sort`: `date_desc` (default), `date_asc`, `salary_desc`, or `salary_asc`.
- `period`: `day`, `3_days`, or `week`; filters by `createdAt`.
- `search_field`: `title`, `description`, or `company_name`; may be repeated.

`POST /vacancies/batch` accepts either a JSON array or `{ "vacancies": [...] }`.

## Run

```bash
go run ./cmd/vacancy
```

Required environment:

```bash
DATABASE_URL=postgresql://root:example@localhost:5425/job?schema=public
PORT=5003
LOG_LEVEL=debug
LOG_DIR=var/log
```

## Project Structure

- `cmd/vacancy`: application entrypoint.
- `internal/config`: environment configuration.
- `internal/storage`: PostgreSQL connection pool setup.
- `internal/db`: database schema, SQL queries, migrations, and generated `sqlc` code.
- `internal/repository`: application-facing database methods and transactions.
- `internal/domain`: domain structs and filters.
- `internal/http`: routes, request validation, and JSON responses.

## Logs

The service writes structured JSON logs to stdout and separates file logs by
level into `debug.log`, `info.log`, `warn.log`, and `error.log`. Docker Compose
mounts them into `../var/log/vacancy_service` on the host.

```bash
docker compose logs -f vacancy_service
tail -f ../var/log/vacancy_service/error.log
```

File logs rotate at 20 MB, retain five backups for 14 days, and compress old
files.

## sqlc

SQL lives in:

- `internal/db/schema.sql`
- `internal/db/queries/*.sql`

Regenerate typed query code after changing SQL:

```bash
make sqlc-install
make sqlc-vet
make sqlc-generate
```
