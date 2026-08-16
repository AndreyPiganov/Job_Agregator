# vacancy_service

Go service for storing and reading vacancies over HTTP and gRPC.

The service uses `pgx` for PostgreSQL connections and `sqlc` for generated,
type-safe query code.

## HTTP API

- `GET /health`
- `GET /api/v1/vacancies?page=1&itemsPerPage=10`
- `GET /api/v1/vacancies/{id}`
- `POST /api/v1/vacancies`
- `POST /api/v1/vacancies/batch`
- `GET /api/v1/vacancies/filter?q=Acme&search_field=company_name&city=Moscow&minSalary=50000&sort=salary_desc&period=week`

Filter query parameters:

- `sort`: `date_desc` (default), `date_asc`, `salary_desc`, or `salary_asc`.
- `period`: `day`, `3_days`, or `week`; filters by `createdAt`.
- `search_field`: `title`, `description`, or `company_name`; may be repeated.

`POST /api/v1/vacancies/batch` accepts either a JSON array or `{ "vacancies": [...] }`.

## gRPC API

The versioned contract is stored in `../contracts/vacancy/v1/vacancy.proto`.
The API exposes:

- `jobaggregator.vacancy.v1.VacancyService/GetVacancy`
- `jobaggregator.vacancy.v1.VacancyService/ListVacancies`
- `jobaggregator.vacancy.v1.VacancyService/CreateVacancy`
- `jobaggregator.vacancy.v1.VacancyService/BatchCreateVacancies`
- standard `grpc.health.v1.Health` service

`ListVacancies` accepts pagination and optional filters in one request. Search
fields, sorting, and time periods are protobuf enums, so unsupported values are
rejected at the contract boundary rather than passed to the database.

The HTTP and gRPC transports call the same application service. The default
gRPC port is `50051`. Example with `grpcurl` from the repository root:

```bash
grpcurl -plaintext \
  -import-path contracts \
  -proto vacancy/v1/vacancy.proto \
  -d '{"id": 1}' \
  localhost:50051 \
  jobaggregator.vacancy.v1.VacancyService/GetVacancy
```

Filter and sort vacancies:

```bash
grpcurl -plaintext \
  -import-path contracts \
  -proto vacancy/v1/vacancy.proto \
  -d '{
    "page": 1,
    "itemsPerPage": 20,
    "keyword": "Go",
    "cities": ["Moscow", "Kazan"],
    "searchFields": ["VACANCY_SEARCH_FIELD_TITLE", "VACANCY_SEARCH_FIELD_COMPANY_NAME"],
    "minSalary": 100000,
    "sort": "VACANCY_SORT_SALARY_DESC",
    "period": "VACANCY_PERIOD_WEEK"
  }' \
  localhost:50051 \
  jobaggregator.vacancy.v1.VacancyService/ListVacancies
```

Create a vacancy:

```bash
grpcurl -plaintext \
  -import-path contracts \
  -proto vacancy/v1/vacancy.proto \
  -d '{
    "title": "Go developer",
    "description": "Build vacancy services",
    "salary": 250000,
    "link": "https://example.com/vacancies/42",
    "city": "Moscow",
    "companyName": "Acme"
  }' \
  localhost:50051 \
  jobaggregator.vacancy.v1.VacancyService/CreateVacancy
```

## Run

```bash
go run ./cmd/vacancy
```

Required environment:

```bash
DATABASE_URL=postgresql://root:example@localhost:5425/job?schema=public
PORT=5003
GRPC_PORT=50051
LOG_LEVEL=debug
LOG_DIR=var/log
```

## Project Structure

- `cmd/vacancy`: application entrypoint.
- `internal/app`: dependency wiring and HTTP/gRPC lifecycle management.
- `internal/config`: environment configuration.
- `internal/storage`: PostgreSQL connection pool setup.
- `internal/db`: database schema, SQL queries, migrations, and generated `sqlc` code.
- `internal/repository`: application-facing database methods and transactions.
- `internal/domain`: domain structs and filters.
- `internal/transport/http`: routes, request validation, transport errors, and JSON responses.
- `internal/transport/grpc`: Protovalidate interceptor, error translation, mapping, and logging.
- `internal/proto/vacancy/v1`: Go code generated from the protobuf contract.

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

## Protobuf generation

Install the pinned Buf and Go plugins, then regenerate the Go types after
changing the `.proto` contract. Buf resolves the Protovalidate schema through
the dependency pinned in the root `buf.lock`:

```bash
make proto-tools
make proto-generate
go test ./...
```

Generated `.pb.go` files are committed so normal builds and Docker images do
not need `protoc` installed.
