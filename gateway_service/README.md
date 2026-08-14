# Gateway Service

HTTP gateway для Job Aggregator на NestJS 11. Сейчас реализован базовый каркас:

- проверка переменных окружения при старте;
- глобальная HTTP-валидация;
- Swagger по адресу `/api-docs`;
- структурированные логи в stdout и файлы;
- unit- и e2e-тесты;
- health check `GET /health`.

Вызовы внутренних сервисов по gRPC пока намеренно не добавлены.

## Требования для локального запуска

- Node.js 22;
- npm 10 или новее.

При использовании `nvm`:

```bash
source ~/.nvm/nvm.sh
nvm install
nvm use
npm ci
```

Версия Node закреплена в `.nvmrc`.

## Запуск

```bash
npm run start:dev
```

После запуска:

- health check: `http://localhost:3000/health`;
- Swagger: `http://localhost:3000/api-docs`.

## Проверки

```bash
npm run format:check
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Из корня репозитория те же задачи доступны через Makefile:

```bash
make gateway-deps
make gateway-run
make gateway-test
make gateway-build
make gateway-check
```

## Переменные окружения

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` или `production` |
| `PORT` | `3000` | HTTP-порт приложения |
| `LOG_LEVEL` | `info` | Минимальный уровень логирования |
| `LOG_DIR` | `logs` | Каталог файловых логов |

Gateway не подключается напрямую к базе данных `vacancy_service`. В дальнейшем он
будет принимать публичные HTTP-запросы и обращаться к внутренним сервисам по
контрактам из корневого каталога `contracts/`.

## Docker

Из корня репозитория:

```bash
make up-build
make logs-gateway
make health-gateway
```

Development-образ использует Node 22 и watch mode. Production-образ собирается в
отдельной стадии и содержит только `dist` и production-зависимости.
