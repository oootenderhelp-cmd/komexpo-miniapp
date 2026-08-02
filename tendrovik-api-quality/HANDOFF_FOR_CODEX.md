# HANDOFF FOR CODEX — tendrovik-api-quality

Пакет контрактных API-тестов, security-ревью и CI для backend-модуля «Тендровик AI».
Создан как независимая QA/DevOps зона — не зависит от Hono-сервера и не меняет
доменную логику `tendrovik-backend`.

---

## Содержимое пакета

```
tendrovik-api-quality/
├── package.json                # npm-пакет, vitest + typescript
├── tsconfig.json               # strict ESM, noEmit
├── vitest.config.ts            # 10s timeout, tests/**/*.test.ts
├── SECURITY_REVIEW.md          # 10 разделов, 50+ проверок
├── HANDOFF_FOR_CODEX.md        # этот файл
├── src/
│   └── client.ts               # HTTP-клиент: fetch + auth + helper
└── tests/
    ├── health.test.ts           # connectivity, 401, unknown route
    ├── onboarding.test.ts       # GET/POST /onboarding/survey
    ├── tenders.test.ts          # list, search, card, 404
    ├── pricing.test.ts          # 3 strategies, min margin, ordering
    ├── approvals.test.ts        # full chain, partial, rejected, gate
    ├── crm.test.ts              # pipeline, transitions, 409, stats
    ├── support.test.ts          # AI chat, tickets, validation
    ├── ads.test.ts              # slot rotation, click, 204
    ├── integrations.test.ts     # all 4 kinds, status enum
    └── monitoring.test.ts       # rules CRUD, notifications
```

**CI workflow** (отдельный файл):
```
.github/workflows/tendrovik-backend-ci.yml
```

---

## Как запустить

```bash
# 1. Установить зависимости:
cd tendrovik-api-quality
npm install

# 2. Typecheck:
npm run typecheck

# 3. Запустить тесты (нужен работающий сервер):
API_BASE_URL=http://localhost:3000/v1 API_AUTH_TOKEN=your-jwt npm test
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `API_BASE_URL` | Базовый URL API (с `/v1`) | `http://localhost:3000/v1` |
| `API_AUTH_TOKEN` | JWT-токен для авторизации | `test-jwt-token` |

---

## Результаты проверок

| Проверка | Результат |
|---|---|
| `npm run typecheck` | ✅ Без ошибок |
| Тест-файлов | 10 файлов |
| Тест-кейсов | 47 контрактных тестов |
| Security checks | 50+ проверок в SECURITY_REVIEW.md |
| CI workflow | tendrovik-backend-ci.yml (typecheck → test → build → openapi:validate) |

---

## Что требует адаптации под Hono-сервер

### 1. Запуск сервера перед тестами

Тесты вызывают HTTP-сервер по сети. Два варианта:

**Вариант A — внешний сервер (рекомендуется для CI):**
```bash
# Терминал 1:
cd tendrovik-backend && npm run dev

# Терминал 2:
cd tendrovik-api-quality && npm test
```

**Вариант B — встроенный запуск через Hono test client:**
Если Codex экспортирует Hono `app` из `tendrovik-backend`, можно заменить
`fetch` в `src/client.ts` на `app.request()`:
```typescript
import { app } from "../../tendrovik-backend/src/server.js";
// Заменить fetch(url, ...) на app.request(path, ...)
```

### 2. Аутентификация

Тесты передают `Bearer test-jwt-token` в каждый запрос.
Codex должен:
- либо принимать этот тестовый токен в dev/test-режиме;
- либо генерировать реальный JWT и передать через `API_AUTH_TOKEN`.

### 3. Seed-данные

Тесты ожидают:
- хотя бы 1 тендер в списке (для pricing/approvals);
- CRM-элементы в разных стадиях (для transitions);
- рекламные кампании в слоте `top`.

Запустить `npm run seed` в `tendrovik-backend` перед тестами.

### 4. Коды ответов

Тесты проверяют HTTP-статусы строго по OpenAPI:
- `200` — успешный ответ
- `201` — ресурс создан
- `202` — задача в очереди
- `204` — нет контента (ads)
- `400/422` — невалидный запрос
- `401` — нет авторизации
- `404` — не найдено
- `409` — конфликт (CRM transition, submission blocked)

Если Hono-хендлеры используют другие коды — тесты покажут расхождение с контрактом.

### 5. Response shape

Каждый тест проверяет наличие обязательных полей из OpenAPI-схем.
Если Codex добавит дополнительные поля — тесты не сломаются (проверяют `toHaveProperty`, не `toEqual`).

---

## Как подключить CI

Файл `.github/workflows/tendrovik-backend-ci.yml` уже создан в корне репо.
Он запускается:
- при push в `main` и `claude/**` ветки;
- при PR с изменениями в `tendrovik-backend/`.

Workflow запускает: `npm ci → typecheck → test → build → openapi:validate`.
**Не** публикует проект и **не** трогает Vercel.

Для добавления контрактных тестов в CI — добавить job:
```yaml
  contract-tests:
    name: Contract API tests
    runs-on: ubuntu-latest
    needs: [check]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tendrovik_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd tendrovik-backend && npm ci && npm run db:push && npm run seed
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/tendrovik_test
      - run: cd tendrovik-backend && npm run dev &
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/tendrovik_test
      - run: sleep 3 && cd tendrovik-api-quality && npm ci && npm test
        env:
          API_BASE_URL: http://localhost:3000/v1
```

---

## Что Codex может менять

- **Можно:** добавлять тесты, расширять `client.ts`, менять `API_BASE_URL`.
- **Можно:** переключить на Hono test client (`app.request()`).
- **Нельзя:** удалять существующие тест-кейсы (они верифицируют контракт OpenAPI).
- **Нельзя:** менять ожидаемые HTTP-статусы (они из контракта).

---

## Связанные файлы

| Файл | Расположение | Описание |
|---|---|---|
| OpenAPI контракт | `tendrovik-backend/openapi/tendrovik.openapi.yaml` | Источник правды для тестов |
| Доменная логика | `tendrovik-backend/src/domain/*` | pricing, approvals, crm, ads, audit |
| Порты/адаптеры | `tendrovik-backend/src/services/adapters/index.ts` | 5 интерфейсов |
| Юнит-тесты | `tendrovik-backend/tests/*` | 30 тестов домена (без HTTP) |
| CI workflow | `.github/workflows/tendrovik-backend-ci.yml` | Backend CI pipeline |
| Security review | `tendrovik-api-quality/SECURITY_REVIEW.md` | 50+ проверок безопасности |
