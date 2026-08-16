SQLC_VERSION := v1.31.1
PROTOC_GEN_GO_VERSION := v1.36.11
PROTOC_GEN_GO_GRPC_VERSION := v1.6.2
BUF_VERSION := v1.72.0

.PHONY: deps run build test vet proto-tools proto-generate sqlc-install sqlc-vet sqlc-generate

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

proto-tools:
	go install github.com/bufbuild/buf/cmd/buf@$(BUF_VERSION)
	go install google.golang.org/protobuf/cmd/protoc-gen-go@$(PROTOC_GEN_GO_VERSION)
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@$(PROTOC_GEN_GO_GRPC_VERSION)

proto-generate:
	cd .. && buf lint && buf generate

sqlc-install:
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

sqlc-vet:
	sqlc vet

sqlc-generate:
	sqlc generate
