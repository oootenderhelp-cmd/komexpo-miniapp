# HANDOFF — Тендровик AI Backend Foundation

Переносимый backend-модуль платформы автоматизации тендеров. Документ описывает
структуру, команды, что реально работает, что заглушка, переменные окружения и
как передать проект в Codex для проверки и интеграции.

> ⚠️ Границы модуля: только backend foundation. Нет лендинга/дизайна, публикации,
> покупок сервисов, реальных ключей и реальных тендерных площадок. Финальная
> подача заявки, КЭП, платежи и любые юридически значимые действия **всегда
> требуют подтверждения человека** — код лишь разблокирует шаг подтверждения.

Путь модуля в репозитории: **`tendrovik-backend/`**.

---

## 1. Структура файлов

```
tendrovik-backend/
├── package.json               # скрипты и зависимости
├── tsconfig.json              # strict TypeScript (ESM)
├── drizzle.config.ts          # конфиг миграций Drizzle
├── .env.example               # переменные окружения БЕЗ значений
├── README.md
├── HANDOFF.md                 # этот файл
│
├── openapi/
│   └── tendrovik.openapi.yaml # API-контракт OpenAPI 3.1 (22 пути, 33 схемы)
│
├── scripts/
│   └── validate-openapi.mjs   # лёгкая проверка контракта
│
├── drizzle/
│   ├── 0000_init.sql          # сгенерированная SQL-миграция (46 таблиц, 21 enum)
│   └── meta/                  # снапшот/журнал миграций
│
├── src/
│   ├── index.ts               # smoke-прогон всех подсистем (npm run dev)
│   │
│   ├── db/
│   │   ├── schema.ts          # PostgreSQL-схема (Drizzle) — единый источник правды
│   │   ├── index.ts           # ленивый клиент (postgres.js), работает без БД в тестах
│   │   ├── seed-data.ts       # чистые демо-данные (переиспользуются тестами)
│   │   └── seed.ts            # раннер сидов в БД
│   │
│   ├── domain/                # ЧИСТАЯ бизнес-логика (тестируется без БД)
│   │   ├── audit.ts           # AuditSink + InMemoryAuditSink + withAudit
│   │   ├── crm.ts             # стейт-машина воронки + переходы + статистика
│   │   ├── pricing.ts         # себестоимость + 3 стратегии + гарантия мин. маржи
│   │   ├── approvals.ts       # цепочка согласований + блокировка подачи
│   │   └── ads.ts             # ротация баннеров (weighted round-robin + random)
│   │
│   └── services/
│       ├── adapters/index.ts  # ПОРТЫ: TenderSourceAdapter, AIProvider,
│       │                      #        CRMAdapter, PaymentProvider, NotificationProvider
│       ├── stubs/index.ts     # безопасные заглушки портов (без сети)
│       └── queue/
│           ├── index.ts       # TaskQueue: ingest|parse|enrich|score|pricing|monitor|notify
│           └── pipeline.ts    # связка стадий с заглушками (end-to-end demo)
│
└── tests/
    ├── crm-pipeline.test.ts   # переходы CRM-воронки
    ├── approvals.test.ts      # запрет подачи без всех согласований
    ├── pricing.test.ts        # цена не ниже минимальной маржи
    ├── ads-rotation.test.ts   # ротация рекламных баннеров
    └── audit.test.ts          # запись аудита при важных действиях
```

---

## 2. Команды запуска и тестов

```bash
# из папки tendrovik-backend/
npm install

# качество и проверки (без БД и без сети)
npm test                 # 26 unit-тестов (vitest)
npm run typecheck        # tsc --noEmit, strict
npm run openapi:validate # проверка OpenAPI-контракта
npm run dev              # smoke-прогон: очередь, цены, согласования, CRM, реклама, аудит

# сборка
npm run build            # tsc → dist/
npm start                # node dist/index.js

# база данных (опционально, нужен DATABASE_URL)
npm run db:generate      # сгенерировать SQL-миграцию из схемы
npm run db:push          # применить схему к PostgreSQL
npm run db:migrate       # применить миграции
npm run db:studio        # Drizzle Studio
npm run seed             # залить демо-данные
```

Ожидаемый результат `npm test`: **5 файлов, 26 тестов — passed**.
Ожидаемый результат `npm run openapi:validate`: `OpenAPI OK: 22 paths, 33 schemas, 33 refs resolved.`

---

## 3. Что реально работает

Всё нижеперечисленное исполняется и покрыто тестами/прогоном, **без БД и без сети**:

- **Схема БД (Drizzle):** 46 таблиц, 21 enum. Сгенерирована валидная SQL-миграция
  `drizzle/0000_init.sql`. Покрывает все запрошенные сущности: identity/tenancy,
  RBAC, профили и реквизиты, база знаний и чанки, тендеры/лоты/документы,
  конкуренты и реестры, решения/сценарии/расчёты, согласования, пакеты
  документов, мониторинг/уведомления, CRM, поддержка, биллинг (заглушки),
  интеграции, реклама, очередь задач, audit_log.
- **Ценообразование** (`domain/pricing.ts`): расчёт себестоимости (прямые +
  накладные + налог) и **три стратегии** (aggressive/balanced/premium).
  Инвариант: ни одна цена не опускается ниже минимальной маржи —
  `assertMinMargin` бросает `MinMarginViolationError`.
- **Согласования** (`domain/approvals.ts`): цепочка сметчик → юрист →
  тендеровик → владелец. `authorizeSubmission` **жёстко блокирует** подачу,
  пока не получены все обязательные согласования (и нет отклонений).
- **CRM-воронка** (`domain/crm.ts`): стейт-машина с проверкой допустимости
  переходов, терминальные стадии won/lost, агрегированная статистика.
- **Ротация рекламы** (`domain/ads.ts`): детерминированный weighted
  round-robin + weighted random; учитывает статус и окно показа кампании.
- **Аудит** (`domain/audit.ts`): `AuditSink`, `withAudit`; каждое важное
  действие (решение, подпись согласования, авторизация подачи, переход воронки,
  показ баннера, завершение/провал задачи) пишет запись.
- **Фоновая очередь** (`services/queue`): in-process раннер с ретраями; полный
  конвейер ingest→parse→enrich→score→pricing→monitor→notify прогоняется
  end-to-end на заглушках.
- **Сервисные порты + заглушки:** все пять интерфейсов реализованы заглушками,
  которые ничего не отправляют наружу.
- **Seed-данные** (`db/seed-data.ts` + `db/seed.ts`): организация, 6 ролей и
  пользователей, ≥5 тендеров, повторяющиеся победители (СтройГарант ×2,
  ЛогоПро ×2), пример расчёта и три ценовых сценария, заявка на согласование с
  подтверждениями сметчика и юриста, 4 рекламных баннера (KomExpo, курсы,
  франшиза, образовательный центр), CRM-воронка со статистикой.
- **OpenAPI 3.1** (`openapi/tendrovik.openapi.yaml`): онбординг/AI-опросник,
  поиск и список тендеров, карточка тендера, расчёт цены и три стратегии,
  решение участвуем/не участвуем, маршруты согласования, база знаний и загрузка
  документа, CRM-воронка и статистика, поддержка (AI-чат + эскалация в тикет),
  рекламные места и ротация, интеграции и статусы, мониторинг сроков и
  уведомления.

---

## 4. Что является заглушкой

- **HTTP-сервер** — не реализован. Есть контракт OpenAPI и вся домейн-логика,
  которую нужно подключить к роутеру (Express/Fastify/Hono) как следующий шаг.
- **Тендерные площадки** — `StubTenderSourceAdapter` отдаёт статический каталог.
  Реальные площадки (44-ФЗ/223-ФЗ) не подключены и не должны подключаться в
  foundation.
- **AI/OpenAI** — `StubAIProvider` отдаёт детерминированные ответы и
  псевдо-эмбеддинги. Реального вызова LLM нет.
- **CRM Bitrix24** — `Bitrix24CRMAdapterStub` держит сделки в памяти.
- **Платежи** — `StubPaymentProvider`, **без реальных списаний**. Таблицы
  plans/subscriptions/invoices/payment_events — только заглушки.
- **Уведомления/email** — `StubNotificationProvider` пишет в память (outbox).
- **Интеграции** — таблица `integrations` хранит только статусы и НЕ секретные
  placeholders; реальные секреты живут в env, не в БД.
- **Хранилище файлов** — `storageUri` в knowledge/tender documents —
  placeholder; объектного хранилища нет.
- **Эмбеддинги/RAG** — `document_chunks.embedding` — jsonb-заглушка (pgvector в
  foundation не требуется).
- **Аутентификация** — в контракте описан bearer JWT, реализация не входит в
  foundation.

---

## 5. Переменные окружения (без значений)

См. `.env.example`. Реальные значения не коммитятся.

| Переменная | Назначение |
|---|---|
| `NODE_ENV` | окружение выполнения |
| `PORT` | порт HTTP-сервера (когда будет добавлен) |
| `DATABASE_URL` | строка подключения PostgreSQL (нужна только для db/seed/API) |
| `OPENAI_API_KEY` | ключ AI-провайдера (пусто → StubAIProvider) |
| `OPENAI_BASE_URL` | базовый URL AI-провайдера |
| `OPENAI_MODEL` | модель AI-провайдера |
| `BITRIX24_WEBHOOK_URL` | вебхук Bitrix24 (пусто → заглушка) |
| `BITRIX24_CLIENT_ID` | client id Bitrix24 |
| `BITRIX24_CLIENT_SECRET` | client secret Bitrix24 |
| `SMTP_HOST` / `SMTP_PORT` | SMTP для email-уведомлений |
| `SMTP_USER` / `SMTP_PASSWORD` | учётные данные SMTP |
| `NOTIFY_FROM_EMAIL` | адрес отправителя уведомлений |
| `PAYMENT_PROVIDER` | провайдер платежей (пусто → StubPaymentProvider) |
| `PAYMENT_API_KEY` | ключ платежей |
| `PAYMENT_WEBHOOK_SECRET` | секрет вебхука платежей |
| `ZAKUPKI_API_BASE` | база API площадки закупок (заглушка) |
| `SBERAST_API_BASE` | база API площадки закупок (заглушка) |
| `QUEUE_CONCURRENCY` | параллелизм пула БД/очереди |
| `DEFAULT_MIN_MARGIN_PCT` | минимальная маржа по умолчанию для ценообразования |

---

## 6. Как передать проект в Codex для проверки и интеграции

1. **Точка входа для ревью:** начните с этого `HANDOFF.md`, затем `README.md`,
   затем `src/domain/*` (чистая логика) и `src/db/schema.ts` (модель данных).
2. **Воспроизвести без внешних зависимостей:**
   ```bash
   cd tendrovik-backend
   npm install
   npm test && npm run typecheck && npm run openapi:validate && npm run dev
   ```
   Всё зелёное — значит сборка, типы, контракт и логика согласованы.
3. **Контракт как источник задач:** `openapi/tendrovik.openapi.yaml` описывает
   HTTP-поверхность. Интеграционный шаг для Codex — сгенерировать роутер
   (Fastify/Hono) и связать хендлеры с уже готовыми функциями `src/domain/*` и
   портами `src/services/adapters`.
4. **Замена заглушек на реальные адаптеры:** реализуйте интерфейсы из
   `src/services/adapters/index.ts` (TenderSourceAdapter, AIProvider,
   CRMAdapter, PaymentProvider, NotificationProvider) и подмените заглушки —
   домейн-код менять не нужно.
5. **БД:** `npm run db:push` применяет схему; `npm run seed` заливает демо.
   Инварианты (мин. маржа, запрет подачи без согласований, аудит) уже покрыты
   тестами — используйте их как контрольные точки при интеграции.
6. **Границы безопасности:** не подключайте реальные площадки/ключи в рамках
   foundation; сохраняйте человеческое подтверждение для подачи, КЭП и платежей.

### Формат передачи
Модуль самодостаточен в папке `tendrovik-backend/`. Для передачи:
- через git — ветка `claude/tendrovick-backend-foundation-c30mbs` в репозитории
  `oootenderhelp-cmd/komexpo-miniapp`;
- либо архивом: `git archive --format=zip -o tendrovik-backend.zip HEAD:tendrovik-backend`
  (или `zip -r tendrovik-backend.zip tendrovik-backend -x '*/node_modules/*' '*/dist/*'`).
