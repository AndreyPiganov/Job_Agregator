COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
VACANCY_DIR := vacancy_service
GATEWAY_DIR := gateway_service

.DEFAULT_GOAL := help

.PHONY: help dev up build rebuild up-build pull stop down down-volumes restart \
	restart-vacancy restart-gateway ps config logs logs-vacancy logs-gateway \
	restart-nginx restart-redis logs-nginx logs-redis logs-postgres postgres redis \
	health health-nginx health-redis health-vacancy health-gateway shell-vacancy \
	shell-gateway db-shell redis-cli vacancy-deps vacancy-run vacancy-build vacancy-test \
	vacancy-vet vacancy-format vacancy-check gateway-deps gateway-run \
	gateway-build gateway-test gateway-lint gateway-format gateway-format-check \
	gateway-check test vet fmt check sqlc-install sqlc-vet sqlc-generate \
	proto-tools proto-generate \
	prod-config prod-up prod-build prod-down prod-ps prod-logs

help:
	@echo "Development:"
	@echo "  make dev              Build and run containers in the foreground"
	@echo "  make up               Run containers in the background"
	@echo "  make up-build         Build and run containers in the background"
	@echo "  make down             Stop and remove containers"
	@echo "  make logs             Follow all container logs"
	@echo "  make health           Check gateway and vacancy health endpoints"
	@echo ""
	@echo "Source code:"
	@echo "  make test             Run tests for all implemented services"
	@echo "  make vet              Run go vet for vacancy_service"
	@echo "  make vacancy-build    Build vacancy_service"
	@echo "  make gateway-build    Build gateway_service"
	@echo "  make gateway-run      Run gateway_service locally in watch mode"
	@echo "  make check            Check and build all implemented services"
	@echo "  make proto-generate   Generate Go/NestJS code and the protobuf descriptor"
	@echo "  make sqlc-generate    Generate database code"
	@echo ""
	@echo "Utilities:"
	@echo "  make config           Validate development Compose config"
	@echo "  make logs-vacancy     Follow vacancy_service logs"
	@echo "  make logs-gateway     Follow gateway_service logs"
	@echo "  make logs-nginx       Follow Nginx logs"
	@echo "  make logs-redis       Follow Redis logs"
	@echo "  make logs-postgres    Follow PostgreSQL logs"
	@echo "  make db-shell         Open psql in the PostgreSQL container"
	@echo "  make redis-cli        Open redis-cli with authentication"
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

restart-gateway:
	$(COMPOSE) restart gateway_service

restart-nginx:
	$(COMPOSE) restart nginx

restart-redis:
	$(COMPOSE) restart redis

ps:
	$(COMPOSE) ps

config:
	$(COMPOSE) config --quiet

logs:
	$(COMPOSE) logs -f

logs-vacancy:
	$(COMPOSE) logs -f vacancy_service

logs-gateway:
	$(COMPOSE) logs -f gateway_service

logs-nginx:
	$(COMPOSE) logs -f nginx

logs-redis:
	$(COMPOSE) logs -f redis

logs-postgres:
	$(COMPOSE) logs -f postgres

postgres:
	$(COMPOSE) up -d postgres

redis:
	$(COMPOSE) up -d redis

health: health-redis health-vacancy health-gateway health-nginx

health-nginx:
	$(COMPOSE) exec -T nginx wget -qO- http://127.0.0.1/nginx-health

health-redis:
	$(COMPOSE) exec -T redis sh -c 'redis-cli --no-auth-warning -a "$$REDIS_PASSWORD" ping'

health-vacancy:
	$(COMPOSE) exec -T vacancy_service wget -qO- http://localhost:5003/health

health-gateway:
	$(COMPOSE) exec -T gateway_service wget -qO- http://127.0.0.1:3000/health

shell-vacancy:
	$(COMPOSE) exec vacancy_service sh

shell-gateway:
	$(COMPOSE) exec gateway_service sh

db-shell:
	$(COMPOSE) exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis-cli:
	$(COMPOSE) exec redis sh -c 'redis-cli --no-auth-warning -a "$$REDIS_PASSWORD"'

# vacancy_service commands run directly on the host.
vacancy-deps:
	$(MAKE) -C $(VACANCY_DIR) deps

vacancy-run:
	$(MAKE) -C $(VACANCY_DIR) run

vacancy-build:
	$(MAKE) -C $(VACANCY_DIR) build

vacancy-test:
	$(MAKE) -C $(VACANCY_DIR) test

vacancy-vet:
	$(MAKE) -C $(VACANCY_DIR) vet

vacancy-format:
	cd $(VACANCY_DIR) && go fmt ./...

vacancy-check: vacancy-vet vacancy-test vacancy-build

# gateway_service commands run directly on the host.
gateway-deps:
	cd $(GATEWAY_DIR) && npm ci

gateway-run:
	cd $(GATEWAY_DIR) && npm run start:dev

gateway-build:
	cd $(GATEWAY_DIR) && npm run build

gateway-test:
	cd $(GATEWAY_DIR) && npm test -- --runInBand
	cd $(GATEWAY_DIR) && npm run test:e2e -- --runInBand

gateway-lint:
	cd $(GATEWAY_DIR) && npm run lint

gateway-format:
	cd $(GATEWAY_DIR) && npm run format

gateway-format-check:
	cd $(GATEWAY_DIR) && npm run format:check

gateway-check: gateway-format-check gateway-lint gateway-test gateway-build

test: vacancy-test gateway-test

vet: vacancy-vet

fmt: vacancy-format gateway-format

check: vacancy-check gateway-check

proto-tools:
	$(MAKE) -C $(VACANCY_DIR) proto-tools

proto-generate:
	$(MAKE) -C $(VACANCY_DIR) proto-generate

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
