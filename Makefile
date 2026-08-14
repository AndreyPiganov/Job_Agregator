COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
VACANCY_DIR := vacancy_service

.DEFAULT_GOAL := help

.PHONY: help dev up build rebuild up-build pull stop down down-volumes restart \
	restart-vacancy ps config logs logs-vacancy logs-postgres postgres health \
	shell-vacancy db-shell vacancy-deps vacancy-run vacancy-build test vet fmt \
	check sqlc-install sqlc-vet sqlc-generate prod-config prod-up prod-build \
	prod-down prod-ps prod-logs

help:
	@echo "Development:"
	@echo "  make dev              Build and run containers in the foreground"
	@echo "  make up               Run containers in the background"
	@echo "  make up-build         Build and run containers in the background"
	@echo "  make down             Stop and remove containers"
	@echo "  make logs             Follow all container logs"
	@echo "  make health           Check vacancy_service health endpoint"
	@echo ""
	@echo "Go service:"
	@echo "  make test             Run Go tests"
	@echo "  make vet              Run go vet"
	@echo "  make vacancy-build    Build vacancy_service"
	@echo "  make check            Run vet, tests, and build"
	@echo "  make sqlc-generate    Generate database code"
	@echo ""
	@echo "Utilities:"
	@echo "  make config           Validate development Compose config"
	@echo "  make logs-vacancy     Follow vacancy_service logs"
	@echo "  make logs-postgres    Follow PostgreSQL logs"
	@echo "  make db-shell         Open psql in the PostgreSQL container"
	@echo "  make down-volumes     Stop containers and DELETE database data"
	@echo "  make prod-build       Build and run the production stack"
	@echo "  make prod-down        Stop the production stack"

# Development environment
dev:
	$(COMPOSE) up --build

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

up-build:
	$(COMPOSE) up --build -d

pull:
	$(COMPOSE) pull

stop:
	$(COMPOSE) stop

down:
	$(COMPOSE) down

# Removes containers and PostgreSQL data. Use explicitly and with care.
down-volumes:
	$(COMPOSE) down -v

restart:
	$(COMPOSE) restart

restart-vacancy:
	$(COMPOSE) restart vacancy_service

ps:
	$(COMPOSE) ps

config:
	$(COMPOSE) config --quiet

logs:
	$(COMPOSE) logs -f

logs-vacancy:
	$(COMPOSE) logs -f vacancy_service

logs-postgres:
	$(COMPOSE) logs -f postgres

postgres:
	$(COMPOSE) up -d postgres

health:
	$(COMPOSE) exec vacancy_service wget -qO- http://localhost:5003/health

shell-vacancy:
	$(COMPOSE) exec vacancy_service sh

db-shell:
	$(COMPOSE) exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# vacancy_service commands run directly on the host.
vacancy-deps:
	$(MAKE) -C $(VACANCY_DIR) deps

vacancy-run:
	$(MAKE) -C $(VACANCY_DIR) run

vacancy-build:
	$(MAKE) -C $(VACANCY_DIR) build

test:
	$(MAKE) -C $(VACANCY_DIR) test

vet:
	$(MAKE) -C $(VACANCY_DIR) vet

fmt:
	cd $(VACANCY_DIR) && go fmt ./...

check: vet test vacancy-build

sqlc-install:
	$(MAKE) -C $(VACANCY_DIR) sqlc-install

sqlc-vet:
	$(MAKE) -C $(VACANCY_DIR) sqlc-vet

sqlc-generate:
	$(MAKE) -C $(VACANCY_DIR) sqlc-generate

# Production environment
prod-config:
	$(COMPOSE_PROD) config --quiet

prod-up:
	$(COMPOSE_PROD) up -d

prod-build:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-ps:
	$(COMPOSE_PROD) ps

prod-logs:
	$(COMPOSE_PROD) logs -f
