deps:
	go mod download
	go mod tidy

migrate-up:
	migrate -path ./migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path ./migrations -database "$(DATABASE_URL)" down 1

# Если нужно собрать
build:
	go build -o service ./cmd/service

# Запуск
run:
	go run ./cmd/service/main.go