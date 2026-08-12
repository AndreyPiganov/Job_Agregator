.PHONY: up build up-build down down-volumes restart ps logs logs-vacancy postgres prod-up prod-build prod-down

# Development environment
up:
	docker compose up -d

build:
	docker compose build

up-build:
	docker compose up --build -d

down:
	docker compose down

# Removes containers and PostgreSQL data. Use explicitly and with care.
down-volumes:
	docker compose down -v

restart:
	docker compose restart

ps:
	docker compose ps

logs:
	docker compose logs -f

logs-vacancy:
	docker compose logs -f vacancy_service

postgres:
	docker compose up -d postgres

# Production environment
prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-build:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down
