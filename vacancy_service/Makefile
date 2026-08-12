SQLC_VERSION := v1.31.1

.PHONY: deps run build test vet sqlc-install sqlc-vet sqlc-generate

deps:
	go mod download
	go mod tidy

run:
	go run ./cmd/vacancy

build:
	go build -o bin/vacancy-service ./cmd/vacancy

test:
	go test ./...

vet:
	go vet ./...

sqlc-install:
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

sqlc-vet:
	sqlc vet

sqlc-generate:
	sqlc generate
