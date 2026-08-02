# tendrovik-auth-rbac

Переносимый модуль JWT-аутентификации и RBAC для платформы «Тендровик AI».
Использует только `node:crypto` (HS256), без внешних зависимостей.

## Безопасность

- **Без внешних провайдеров.** JWT подписывается HMAC-SHA256 через `node:crypto`.
- **Timing-safe сравнение.** Верификация подписи через `timingSafeEqual`.
- **Импорт заблокирован.** `submission:execute` доступен только роли `owner`.
- **Нет ключей, логинов, сетевых вызовов.**

## Роли (5)

| # | Роль | Уровень | Особенности |
|---|------|---------|------------|
| 1 | `owner` | 100 | Все права, включая `workspace:manage`, `billing:manage`, `submission:execute` |
| 2 | `admin` | 80 | Почти все, кроме `workspace:manage`, `billing:manage`, `submission:execute` |
| 3 | `tender_specialist` | 50 | CRUD тендеров, создание заявок на одобрение, импорт, CRM |
| 4 | `lawyer` | 40 | Чтение тендеров, одобрение/отклонение, документы |
| 5 | `estimator` | 30 | Чтение тендеров, ценообразование, документы |

## Права (34)

`workspace:manage`, `workspace:read`, `users:invite`, `users:remove`, `users:list`,
`roles:assign`, `tenders:create`, `tenders:read`, `tenders:update`, `tenders:delete`,
`tenders:search`, `tenders:import`, `approvals:create`, `approvals:approve`,
`approvals:reject`, `approvals:view`, `pricing:read`, `pricing:write`, `crm:read`,
`crm:write`, `documents:read`, `documents:upload`, `documents:delete`,
`integrations:manage`, `integrations:read`, `monitoring:manage`, `monitoring:read`,
`support:read`, `support:write`, `ads:read`, `ads:manage`, `billing:read`,
`billing:manage`, `audit:read`, `submission:execute`

## Запуск

```bash
cd tendrovik-auth-rbac
npm install
npm run typecheck
npm test
```
