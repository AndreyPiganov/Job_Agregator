# vacancy_service

Internal gRPC service for storing, reading, and searching vacancies. Public HTTP
requests are handled by `gateway_service`; this service does not expose an HTTP
transport.

The service uses `pgx` and generated `sqlc` code for PostgreSQL, Protovalidate
for gRPC request validation, and the standard `grpc.health.v1.Health` service
for readiness checks.

## gRPC API

The versioned contract is stored in `../contracts/vacancy/v1/vacancy.proto` and
exposes:

- `jobaggregator.vacancy.v1.VacancyService/GetVacancy`
- `jobaggregator.vacancy.v1.VacancyService/ListVacancies`
- `jobaggregator.vacancy.v1.VacancyService/CreateVacancy`
- `jobaggregator.vacancy.v1.VacancyService/BatchCreateVacancies`
- standard `grpc.health.v1.Health`

Example from the repository root:

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

## Architecture

Dependencies point inward:

```text
handler/grpc ──> service ──> repository (port) ──> domain
                                ^
                                │ implements VacancyRepository
                    repository/postgres

app ──> composition root for all concrete adapters
```

- `internal/domain`: transport- and database-independent entities and value types.
- `internal/repository`: persistence interfaces required by the business service.
- `internal/service`: the readable `VacancyService` use cases and their input DTOs.
- `internal/handler/grpc`: gRPC input adapter, Protovalidate, mappers, and public errors.
- `internal/repository/postgres`: PostgreSQL adapter, schema, SQL, and generated `sqlc` code.
- `internal/app`: dependency wiring and gRPC lifecycle.
- `internal/proto/vacancy/v1`: generated private Go protobuf types.

The protobuf contract was not changed by the architecture refactoring.

## Run

```bash
DATABASE_URL='postgresql://root:example@localhost:5425/job?schema=public' \
GRPC_PORT=50051 \
go run ./cmd/api
```

Optional environment variables:

- `GRPC_PORT` defaults to `50051`.
- `LOG_LEVEL` defaults to `info`.
- `LOG_DIR` defaults to `var/log`.

Docker Compose uses `/usr/local/bin/vacancy-healthcheck`, which calls
`grpc.health.v1.Health/Check` for the Vacancy service.

## Checks

```bash
go test ./...
go vet ./...
go build ./...
```

Regenerate `sqlc` code after changing SQL:

```bash
make sqlc-vet
make sqlc-generate
```

Regenerate protobuf code after changing the contract:

```bash
make proto-tools
make proto-generate
```
