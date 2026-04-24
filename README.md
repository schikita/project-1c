# Диагностический помощник бухгалтера 1С

MVP-скелет веб-приложения для read-only диагностики данных 1С:

- backend: FastAPI + SQLAlchemy + Alembic + Celery + Redis;
- frontend: React + Vite (JS);
- инфраструктура: Docker Compose (backend, worker, frontend, postgres, redis);
- интеграционный слой 1С: `OneCClient` + `BaseOneCClient` + `OneCHttpClient` + `OneCODataClient` + `MockOneCClient`.

## Что уже реализовано

- базовая backend-архитектура модулей;
- модели БД для пользователей, подключений, диагностик, базы знаний, audit/integration логов;
- начальная миграция Alembic;
- auth API (register/login);
- API подключений к 1С (создание, список, получение mock-организаций);
- запуск диагностики и получение issues;
- диагностический движок с первыми проверками:
  - `MonthCloseCostAccountsCheck`
  - `ManualOperationsImpactCheck`
  - `FixedAssetsDepreciationCheck`
- `MockOneCClient` для запуска без реальной 1С;
- базовый unit-тест для проверки диагностики;
- frontend-заглушка.

## Что добавлено на этапе 2

- расширенный auth API:
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- RBAC по ролям для защищенных endpoints;
- user management API:
  - `GET /api/users`
  - `GET /api/users/{id}`
  - `PATCH /api/users/{id}`
  - `DELETE /api/users/{id}`
- фоновый запуск диагностики через Celery (`run_diagnostic_task`);
- прогресс и статусы диагностических запусков;
- API действий по issue:
  - mark-fixed / ignore / false-positive;
- API rerun запуска;
- pre/post month close endpoints;
- API для manual operations / missing analytics / accounting policy;
- API для audit logs и integration logs;
- расширен набор проверок диагностического движка:
  - `InputVatPurchaseBookCheck`
  - `AdvancesClosingCheck`
  - `InventoryNegativeBalanceCheck`
  - `MissingAnalyticsCheck`
  - `AccountingPolicyCheck`
  - `ReportingBalanceLineCheck`

## Что добавлено на этапе 3 (backend API)

- endpoints подключений 1С доведены до полного CRUD + check:
  - `GET /api/onec/connections/{id}`
  - `PATCH /api/onec/connections/{id}`
  - `DELETE /api/onec/connections/{id}`
  - `POST /api/onec/connections/{id}/check`
- knowledge base API:
  - `GET /api/knowledge`
  - `GET /api/knowledge/{slug}`
  - `POST /api/knowledge`
  - `PATCH /api/knowledge/{id}`
  - `DELETE /api/knowledge/{id}`
- HTML экспорт отчета:
  - `GET /api/reports/diagnostic-runs/{id}/html`

## Быстрый старт

1. Скопируйте `.env.example` в `.env`.
2. Запустите:

```bash
docker compose up --build
```

3. Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)
4. Frontend: [http://localhost:5173](http://localhost:5173)

## Следующие шаги (roadmap реализации MVP)

1. Доработать auth: refresh/logout/me, JWT guards, RBAC по ролям.
2. Перевести запуск диагностик в полноценные фоновые Celery-задачи с прогрессом.
3. Добавить остальные MVP-checks и страницы:
   - pre/post month close;
   - manual operations;
   - missing analytics;
   - accounting policy;
   - issue impact map UI.
4. Реализовать API для knowledge base, отчеты HTML, audit и integration logs.
5. Расширить frontend до полного набора MVP-страниц.
