# HANDOFF FOR CODEX — Тендровик AI (backend foundation)

Документ для передачи разработчику **Codex**. Описывает только то, что **фактически
сделано** в рабочей папке `tendrovik-backend/`. Ничего не опубликовано, реальные
ключи не используются, внешние интеграции — заглушки.

- **Проект:** «Тендровик AI» — облачная платформа для поиска, анализа и сопровождения тендеров.
- **Рабочая папка:** `/home/user/komexpo-miniapp/tendrovik-backend`
- **Репозиторий:** `oootenderhelp-cmd/komexpo-miniapp`, ветка `claude/tendrovick-backend-foundation-c30mbs`
- **Последний commit на момент хендоффа:** `c1bb14e` (правки по ревью Codex поверх `5cc3aba`)
- **Стек:** TypeScript (ESM, strict) · Node.js 22 · Drizzle ORM (PostgreSQL) · Vitest · OpenAPI 3.1
- **Package manager:** **npm** (единственный lock — `package-lock.json`)

> ⚠️ Границы: только backend foundation. Нет HTTP-сервера, лендинга, деплоя, платных
> сервисов и реальных площадок. Финальная подача заявки, КЭП, платежи и любые
> юридически значимые действия **требуют подтверждения человека** — код только
> разблокирует шаг подтверждения.

---

## Что реализовано (фактически работает, покрыто тестами/прогоном без БД и сети)

- **Модель данных (Drizzle):** 46 таблиц, 21 enum. Валидная SQL-миграция `drizzle/0000_init.sql`.
- **Ценообразование** (`src/domain/pricing.ts`): расчёт себестоимости (прямые + накладные + налог),
  три стратегии (aggressive / balanced / premium). Инвариант: ни одна цена не ниже минимальной
  маржи (`assertMinMargin` бросает `MinMarginViolationError`). Минимум читается из env
  `DEFAULT_MIN_MARGIN_PCT` (fallback 12).
- **Согласования** (`src/domain/approvals.ts`): цепочка сметчик → юрист → тендеровик → владелец.
  `authorizeSubmission` жёстко блокирует подачу, пока не получены все обязательные согласования и
  нет отклонений.
- **CRM-воронка** (`src/domain/crm.ts`): стейт-машина переходов, терминальные стадии `won`/`lost`,
  агрегированная статистика (`funnelStats`).
- **Ротация рекламы** (`src/domain/ads.ts`): детерминированный weighted round-robin + weighted
  random; учитывает статус и окно кампании; `SlotRotator` фильтрует кампании по своему слоту.
- **Аудит** (`src/domain/audit.ts`): `AuditSink` + `InMemoryAuditSink` + `withAudit`. Важные действия
  пишут запись (решение, подпись, авторизация подачи, переход воронки, показ баннера, статусы задач).
- **Фоновая очередь** (`src/services/queue`): in-process раннер с ретраями; полный конвейер
  `ingest → parse → enrich → score → pricing → monitor → notify` на заглушках. Сбой записи аудита
  завершения **не** приводит к повторному запуску уже выполненного handler.
- **Сервисные порты + заглушки** (`src/services/adapters`, `src/services/stubs`): `TenderSourceAdapter`,
  `AIProvider`, `CRMAdapter` (Bitrix24), `PaymentProvider`, `NotificationProvider` — все реализованы
  безопасными заглушками без сетевых вызовов.
- **Seed-данные** (`src/db/seed-data.ts`, `src/db/seed.ts`): организация, 6 ролей/пользователей,
  5+ тендеров, повторяющиеся победители, пример расчёта + 3 сценария, согласования сметчика и юриста,
  4 рекламных баннера (KomExpo / курсы / франшиза / образовательный центр), CRM-статистика.
- **OpenAPI 3.1** (`openapi/tendrovik.openapi.yaml`): контракт на 22 маршрута (см. ниже).
- **Smoke-прогон** (`src/index.ts`): выполняет очередь, ценообразование, согласования, CRM и рекламу
  без БД; `npm run dev` / `npm start`.

---

## Что является заглушкой

- **Тендерные площадки** — `StubTenderSourceAdapter` отдаёт статический каталог (реальные 44-ФЗ/223-ФЗ не подключены).
- **AI / OpenAI** — `StubAIProvider`: детерминированные ответы и псевдо-эмбеддинги, без вызова LLM.
- **CRM Bitrix24** — `Bitrix24CRMAdapterStub`: сделки хранятся в памяти.
- **Платежи** — `StubPaymentProvider`: имитация intents, **без реальных списаний**. Таблицы
  `plans/subscriptions/invoices/payment_events` — только заглушки.
- **Уведомления / email** — `StubNotificationProvider`: пишет в память (outbox).
- **Интеграции** — таблица `integrations` хранит только статусы и НЕ секретные placeholders.
- **Хранилище файлов** — `storageUri` в документах — placeholder, объектного хранилища нет.
- **Эмбеддинги/RAG** — `document_chunks.embedding` — jsonb-заглушка (pgvector не требуется).

---

## Что не реализовано

- **HTTP-сервер** — есть только контракт OpenAPI и доменная логика; роутер (Fastify/Hono/Express) не написан.
- **Аутентификация/авторизация** — bearer JWT описан в контракте, реализации нет.
- **Реальные адаптеры** внешних систем (площадки, LLM, Bitrix24, платежи, email).
- **Объектное хранилище / загрузка файлов** по существу (только метаданные-заглушки).
- **Постоянная (durable) очередь** — текущая очередь in-memory, single-process.
- **RAG-поиск по базе знаний** (эмбеддинги-заглушки).
- **CI-пайплайн для backend-модуля** — существующий Vercel-деплой обслуживает только лендинг в корне репо.

---

## Структура проекта

```
tendrovik-backend/
├── package.json / tsconfig.json / drizzle.config.ts / .env.example / .gitignore
├── README.md / HANDOFF.md / HANDOFF_FOR_CODEX.md
├── openapi/tendrovik.openapi.yaml        # OpenAPI 3.1 (22 пути, 33 схемы)
├── scripts/validate-openapi.mjs          # лёгкая проверка контракта
├── drizzle/
│   ├── 0000_init.sql                     # миграция: 46 таблиц, 21 enum
│   └── meta/                             # снапшот/журнал drizzle-kit
├── src/
│   ├── index.ts                          # smoke-прогон (npm run dev / start)
│   ├── db/{schema.ts, index.ts, seed-data.ts, seed.ts}
│   ├── domain/{audit.ts, crm.ts, pricing.ts, approvals.ts, ads.ts}   # чистая логика, без БД
│   └── services/
│       ├── adapters/index.ts             # 5 портов (интерфейсы)
│       ├── stubs/index.ts                # заглушки портов (без сети)
│       └── queue/{index.ts, pipeline.ts} # очередь + связка стадий
└── tests/{crm-pipeline, approvals, pricing, ads-rotation, audit, queue}.test.ts
```

---

## База данных и миграции

- **ORM:** Drizzle (`src/db/schema.ts` — единый источник правды).
- **Диалект:** PostgreSQL. **46 таблиц, 21 enum.**
- **Миграция:** `drizzle/0000_init.sql` (сгенерирована `drizzle-kit generate`, соответствует схеме).
- **Клиент:** `src/db/index.ts` — ленивый (postgres.js); нужен только для DB-кода. Требует `DATABASE_URL`.
- **Ключевые группы таблиц:** identity/tenancy (`organizations`, `users`, `workspaces`); RBAC
  (`roles`, `permissions`, `role_permissions`, `user_roles`); профили/реквизиты; база знаний
  (`knowledge_documents`, `document_chunks`, `pricing_rules`); тендеры (`tender_sources`, `tenders`,
  `tender_lots`, `tender_documents`); конкуренты/реестры (`competitors`, `winner_history`,
  `organizations_registry`); расчёты/решения (`cost_calculations`, `price_scenarios`,
  `tender_decisions`); согласования (`approval_requests`, `approval_steps`, `approvals`,
  `generated_document_packages`); мониторинг/уведомления; CRM (`crm_pipeline_items`, `crm_outcomes`,
  `loss_reasons`); поддержка; биллинг-заглушки; `integrations`; реклама (`ad_slots`, `ad_campaigns`,
  `ad_impressions`, `ad_clicks`); `jobs`; `audit_log`.
- **Мульти-тенант:** уникальность тендера — `(workspace_id, source_id, external_id)`.

Команды: `npm run db:generate` · `npm run db:push` · `npm run db:migrate` · `npm run seed`.

---

## API и маршруты (OpenAPI 3.1 — контракт; сервер ещё не реализован)

| Область | Маршруты |
|---|---|
| Онбординг / AI-опросник | `GET/POST /onboarding/survey` |
| Тендеры | `GET /tenders` · `POST /tenders/search` · `GET /tenders/{tenderId}` |
| Ценообразование | `POST /tenders/{tenderId}/pricing` |
| Решение | `PUT /tenders/{tenderId}/decision` |
| Согласования | `POST /tenders/{tenderId}/approval-requests` · `GET /approval-requests/{requestId}` · `POST /approval-requests/{requestId}/steps/{role}` · `POST /approval-requests/{requestId}/authorize-submission` |
| База знаний | `GET/POST /knowledge/documents` |
| CRM | `GET /crm/pipeline` · `PUT /crm/pipeline/{itemId}/stage` · `GET /crm/stats` |
| Поддержка | `POST /support/chat` · `POST /support/tickets` |
| Реклама | `GET /ads/slots/{slotCode}/serve` · `POST /ads/campaigns/{campaignId}/click` |
| Интеграции | `GET /integrations` · `GET /integrations/{kind}/status` |
| Мониторинг | `GET/POST /monitoring/rules` · `GET /notifications` |

Валидация контракта: `npm run openapi:validate`.

---

## Тесты и результаты команд

Все команды выполнены в `tendrovik-backend/` (Node v22.22.2, npm 10.9.7):

| Команда | Результат | Exit |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` — без ошибок | 0 |
| `npm test` | **6 файлов, 30 тестов — passed** (crm, approvals, pricing, ads, audit, queue) | 0 |
| `npm run build` | `tsc` — сборка успешна, вывод в `dist/` | 0 |
| `npm run openapi:validate` | `OpenAPI OK: 22 paths, 33 schemas, 33 refs resolved.` | 0 |
| `npm start` | запускает `dist/src/index.js`, smoke-прогон отрабатывает | 0 |

Точный вывод `npm test`:
```
 ✓ tests/approvals.test.ts (4 tests)
 ✓ tests/ads-rotation.test.ts (7 tests)
 ✓ tests/crm-pipeline.test.ts (7 tests)
 ✓ tests/audit.test.ts (3 tests)
 ✓ tests/pricing.test.ts (6 tests)
 ✓ tests/queue.test.ts (3 tests)
 Test Files  6 passed (6)
      Tests  30 passed (30)
```

Ни одна из проверок не падает. Тесты выполняются **без PostgreSQL** (доменная логика чистая).

---

## Переменные окружения (только названия, без значений)

Полный список — в `.env.example`. Секреты не коммитятся; при пустых значениях используются заглушки.

`NODE_ENV` · `PORT` · `DATABASE_URL` · `OPENAI_API_KEY` · `OPENAI_BASE_URL` · `OPENAI_MODEL` ·
`SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASSWORD` · `NOTIFY_FROM_EMAIL` ·
`PAYMENT_PROVIDER` · `PAYMENT_API_KEY` · `PAYMENT_WEBHOOK_SECRET` · `ZAKUPKI_API_BASE` ·
`SBERAST_API_BASE` · `QUEUE_CONCURRENCY` · `DEFAULT_MIN_MARGIN_PCT`

---

## Известные ошибки и риски

1. **HTTP-слой отсутствует** — контракт есть, но хендлеры не подключены к доменной логике. Это главный следующий шаг.
2. **Очередь in-memory** — не переживает рестарт процесса и не масштабируется на несколько инстансов; для прод нужен durable-бэкенд (pg-boss/BullMQ) с тем же контрактом стадий.
3. **Нет аутентификации** — любой маршрут в контракте помечен bearer JWT, но проверка не реализована.
4. **Заглушки не делают сетевых вызовов** — при подключении реальных адаптеров нужен таймаут/ретрай/circuit-breaker и обработка ошибок площадок.
5. **Seed требует чистой БД** — повторный `npm run seed` на непустой БД даст дубли/конфликты уникальных индексов (нет upsert-идемпотентности).
6. **`document_chunks.embedding` — заглушка** (jsonb); для реального RAG понадобится pgvector и миграция.
7. **CI backend-модуля отсутствует** — Vercel в репозитории собирает лендинг, а не этот модуль; тесты нужно завести в отдельный workflow.

---

## Как запустить локально

```bash
cd tendrovik-backend
npm install

# Проверки без БД и сети:
npm run typecheck
npm test
npm run build
npm run openapi:validate
npm run dev          # smoke-прогон всех подсистем (или: npm start после build)

# С базой данных (опционально):
cp .env.example .env         # заполнить DATABASE_URL
npm run db:push              # применить схему к PostgreSQL
npm run seed                 # демо-данные
```

---

## Что Codex должен сделать следующим шагом

1. **Поднять HTTP-сервер** (Fastify или Hono) строго по `openapi/tendrovik.openapi.yaml`; связать
   хендлеры с готовыми функциями `src/domain/*` и портами `src/services/adapters`, не меняя доменную логику.
2. **Добавить аутентификацию/авторизацию** (bearer JWT + RBAC на базе таблиц `roles`/`permissions`/`user_roles`).
3. **Заменить заглушки на реальные адаптеры**, реализовав интерфейсы из `src/services/adapters/index.ts`
   (площадка закупок, AIProvider, Bitrix24, платежи, уведомления) с таймаутами/ретраями.
4. **Перевести очередь на durable-бэкенд** (pg-boss/BullMQ), сохранив стадии `ingest→…→notify`, и
   сделать `seed` идемпотентным (upsert).
5. **Завести CI для модуля** (`npm ci && typecheck && test && build && openapi:validate`) отдельным
   GitHub Actions workflow, не затрагивая существующий Vercel-деплой лендинга.
