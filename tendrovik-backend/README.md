# Тендровик AI — Backend Foundation

Переносимый backend-модуль для облачной платформы автоматизации тендеров.
Портативный, самодостаточный: домейн-логика, схема БД, API-контракт, сервисный
каркас (порты + заглушки), фоновая очередь, seed-данные и тесты.

> ⚠️ Это **foundation**, а не готовый продукт. Внешние интеграции —
> заглушки. Финальная подача заявки, КЭП, платежи и любые юридически значимые
> действия **всегда требуют подтверждения человека**.

Полное описание — в [`HANDOFF.md`](./HANDOFF.md).

## Быстрый старт

```bash
npm install
npm test                 # 26 unit-тестов, без БД
npm run typecheck
npm run openapi:validate
npm run dev              # smoke-прогон конвейера/цены/согласований/рекламы
```

## С базой данных (опционально)

```bash
cp .env.example .env     # заполнить DATABASE_URL
npm run db:generate      # SQL-миграция из схемы (уже сгенерирована в ./drizzle)
npm run db:push          # применить схему к PostgreSQL
npm run seed             # демо-данные
```

## Структура

- `src/db` — Drizzle-схема (46 таблиц), клиент, seed.
- `src/domain` — чистая бизнес-логика (CRM, цены, согласования, реклама, аудит).
- `src/services/adapters` — порты (TenderSource, AI, CRM, Payment, Notification).
- `src/services/stubs` — безопасные заглушки без сетевых вызовов.
- `src/services/queue` — фоновая очередь: ingest→parse→enrich→score→pricing→monitor→notify.
- `openapi` — контракт OpenAPI 3.1.
- `tests` — тесты воронки, согласований, цены, рекламы, аудита.
