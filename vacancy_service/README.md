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
- `GET /vacancies/company/{companyName}`
- `GET /vacancies/salary?minSalary=50000&maxSalary=150000`

`POST /vacancies/batch` accepts either a JSON array or `{ "vacancies": [...] }`.

## Run

```bash
go run ./cmd/vacancy-service
```

Required environment:

```bash
DATABASE_URL=postgresql://root:example@localhost:5425/job?schema=public
PORT=5003
```

## Project Structure

- `cmd/vacancy-service`: application entrypoint.
- `internal/config`: environment configuration.
- `internal/storage`: PostgreSQL connection pool setup.
- `internal/db`: database schema, SQL queries, migrations, and generated `sqlc` code.
- `internal/repository`: application-facing database methods and transactions.
- `internal/model`: API/domain structs.
- `internal/http`: routes, request validation, and JSON responses.

## sqlc

SQL lives in:

- `internal/db/schema.sql`
- `internal/db/queries/*.sql`

Regenerate typed query code after changing SQL:

```bash
go run github.com/sqlc-dev/sqlc/cmd/sqlc@latest generate
```
