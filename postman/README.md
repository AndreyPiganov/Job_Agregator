# Postman assets

## Что импортировать

1. `job-aggregator.postman_collection.json` — полный последовательный happy path
   по всем 25 HTTP routes Gateway.
2. Один environment из `environments/`.
3. `job-aggregator.negative.postman_collection.json` — проверки валидации и
   границ аутентификации без успешных записей в БД.
4. `job-aggregator.performance.postman_collection.json` — только безопасные
   read-only запросы для Performance Runner.

Файлы можно импортировать через **Import → Files** или перетащить в Postman.

## Functional run

Выберите environment и запустите `Job Aggregator API` через Collection Runner в
исходном порядке. Коллекция сама создаёт уникальный email, передаёт JWT и
сохраняет ID между запросами. Лимит `max_response_time_ms=2000` — это
диагностическая проверка, а не production SLO.

После основного сценария отдельно запустите `Negative and Security Checks`.
Коллекция ожидает только `400` и `401`, поэтому её можно повторять.

## Performance run

В Postman выберите коллекцию `Read-only Performance`, затем **Run →
Performance**. Сначала запускайте папку `Public read-only`:

- 1 минута, 5 virtual users — прогрев;
- 5 минут, 20 virtual users — базовый результат;
- затем ступени 50 и 100 virtual users до появления роста p95/error rate.

Перед `Get vacancy by ID` установите существующий `vacancy_id`. Для папки
`Authenticated read-only` вставьте свежий access JWT в collection variable
`access_token`. Пока эти variables пусты, соответствующие запросы автоматически
пропускаются. Access token живёт недолго, поэтому длинный прогон может начать
получать ожидаемые `401` после его истечения.

Не используйте основной happy path как performance test: он создаёт
пользователей, вакансии и сессии, а bcrypt-login намеренно потребляет CPU.

## Visual Flow

Инструкция, схема и готовый Postman AI prompt находятся в
`flows/job-aggregator-happy-path.blueprint.md`. Flow создаётся после импорта
коллекции, чтобы HTTP blocks получили корректные request IDs текущего workspace.

Секреты, production JWT и реальные пользовательские данные в эти JSON-файлы
добавлять нельзя. Локальные токены хранятся только в runtime variables Postman.
