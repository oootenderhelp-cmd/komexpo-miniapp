# HANDOFF FOR CODEX — tendrovik-auth-rbac

Модуль JWT-аутентификации и RBAC для «Тендровик AI».
Независим от `tendrovik-backend` — можно перенести как npm workspace или скопировать.

---

## Содержимое

```
tendrovik-auth-rbac/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── SECURITY_NOTES.md
├── HANDOFF_FOR_CODEX.md
├── src/
│   ├── index.ts                    # barrel export
│   ├── jwt/index.ts                # signJwt, verifyJwt, decodeJwt, JwtError
│   ├── rbac/index.ts               # 5 ролей, 34 права, hasPermission, assertPermission
│   ├── workspace/index.ts          # assertWorkspace, scopeToWorkspace, belongsToWorkspace
│   └── middleware/index.ts         # extractBearerToken, authenticate, requirePermission, requireWorkspace
└── tests/
    ├── jwt.test.ts                 # 17 тестов JWT
    ├── rbac.test.ts                # 22 теста RBAC
    ├── workspace.test.ts           # 6 тестов workspace
    └── middleware.test.ts          # 20 тестов middleware
```

---

## Команды

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
```

---

## Как Codex перенесёт модуль в backend

### Вариант A — npm workspace (рекомендуется)
```json
// корневой package.json
{ "workspaces": ["tendrovik-backend", "tendrovik-auth-rbac"] }
```
```json
// tendrovik-backend/package.json
{ "dependencies": { "tendrovik-auth-rbac": "workspace:*" } }
```
```typescript
// tendrovik-backend/src/middleware/auth.ts
import { authenticate, requirePermission, requireWorkspace } from "tendrovik-auth-rbac";
```

### Вариант B — копирование модуля
Скопировать `src/` в `tendrovik-backend/src/auth/` и обновить импорты.

---

## Интеграция с Hono

```typescript
import { Hono } from "hono";
import { authenticate, requirePermission, requireWorkspace } from "tendrovik-auth-rbac";

const JWT_SECRET = process.env.JWT_SECRET!;

const app = new Hono();

// Middleware: аутентификация
app.use("/v1/*", async (c, next) => {
  const result = authenticate(c.req.header("Authorization"), JWT_SECRET, {
    issuer: "tendrovik",
    audience: "tendrovik-api",
  });
  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.status as 401 | 403);
  }
  c.set("auth", result.ctx);
  await next();
});

// Пример: защита эндпоинта правами
app.delete("/v1/tenders/:id", async (c) => {
  const auth = c.get("auth");
  const perm = requirePermission(auth, "tenders:delete");
  if (perm) {
    return c.json({ error: perm.error, code: perm.code }, perm.status as 403);
  }
  const ws = requireWorkspace(auth, c.req.param("workspaceId") ?? auth.workspaceId);
  if (ws) {
    return c.json({ error: ws.error, code: ws.code }, ws.status as 403);
  }
  // ... удаление тендера ...
});
```

---

## Матрица ролей

| Право | owner | admin | specialist | lawyer | estimator |
|-------|-------|-------|------------|--------|-----------|
| workspace:manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| workspace:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| users:invite | ✅ | ✅ | ❌ | ❌ | ❌ |
| users:remove | ✅ | ✅ | ❌ | ❌ | ❌ |
| users:list | ✅ | ✅ | ✅ | ✅ | ✅ |
| roles:assign | ✅ | ✅ | ❌ | ❌ | ❌ |
| tenders:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| tenders:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| tenders:update | ✅ | ✅ | ✅ | ❌ | ❌ |
| tenders:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| tenders:search | ✅ | ✅ | ✅ | ✅ | ✅ |
| tenders:import | ✅ | ✅ | ✅ | ❌ | ❌ |
| approvals:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| approvals:approve | ✅ | ✅ | ❌ | ✅ | ❌ |
| approvals:reject | ✅ | ✅ | ❌ | ✅ | ❌ |
| approvals:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| pricing:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| pricing:write | ✅ | ✅ | ❌ | ❌ | ✅ |
| crm:read | ✅ | ✅ | ✅ | ❌ | ❌ |
| crm:write | ✅ | ✅ | ✅ | ❌ | ❌ |
| documents:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents:upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| integrations:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| integrations:read | ✅ | ✅ | ✅ | ❌ | ❌ |
| monitoring:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| monitoring:read | ✅ | ✅ | ✅ | ❌ | ❌ |
| support:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| support:write | ✅ | ✅ | ✅ | ❌ | ❌ |
| ads:read | ✅ | ✅ | ❌ | ❌ | ❌ |
| ads:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| billing:read | ✅ | ✅ | ❌ | ❌ | ❌ |
| billing:manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| audit:read | ✅ | ✅ | ❌ | ❌ | ❌ |
| submission:execute | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## JWT payload (обязательные поля)

```typescript
interface JwtPayload {
  sub: string;           // userId
  role: string;          // одна из 5 ролей
  workspaceId: string;   // ID рабочего пространства
  iss?: string;          // издатель (рекомендуется "tendrovik")
  aud?: string;          // аудитория (рекомендуется "tendrovik-api")
  exp?: number;          // unix timestamp истечения
  iat?: number;          // unix timestamp выпуска (автоматически)
}
```

---

## Что Codex может менять

- **Можно:** добавлять новые права в матрицу, расширять роли, добавлять refresh tokens.
- **Можно:** интегрировать с Hono middleware через `c.set("auth", ctx)`.
- **Нельзя:** убирать ограничение `submission:execute` только для `owner`.
- **Нельзя:** отключать проверку подписи JWT или exp.
- **Нельзя:** хранить секреты в исходниках.
- **Нельзя:** добавлять автоматическую подачу заявок без ручного подтверждения.
