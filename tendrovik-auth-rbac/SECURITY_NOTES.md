# SECURITY_NOTES — tendrovik-auth-rbac

## JWT

| Аспект | Статус | Описание |
|--------|--------|----------|
| Алгоритм | HS256 | HMAC-SHA256 через `node:crypto` |
| Timing-safe verify | OK | `timingSafeEqual` для сравнения подписей |
| exp / iat | OK | Проверка истечения и времени выпуска |
| iss / aud | OK | Опциональная проверка издателя и аудитории |
| Clock tolerance | OK | Настраиваемый допуск (clockToleranceSeconds) |
| Секрет | Снаружи | Передаётся как аргумент, не хранится в коде |
| none-алгоритм | Заблокирован | Принимает только `HS256` |
| Обязательные claims | sub, role, workspaceId | Отсутствие → `MISSING_CLAIM` |

## RBAC

| Аспект | Статус | Описание |
|--------|--------|----------|
| Матрица прав | 5 ролей × 34 права | Жёсткая, не конфигурируемая |
| submission:execute | Только owner | Подача заявок требует ручного подтверждения |
| workspace:manage | Только owner | Управление рабочим пространством |
| billing:manage | Только owner | Управление тарифом и оплатой |
| Иерархия ролей | owner > admin > specialist > lawyer > estimator | Числовые уровни |

## Workspace isolation

| Аспект | Статус | Описание |
|--------|--------|----------|
| Скоупинг | OK | `scopeToWorkspace()` добавляет workspaceId к запросам |
| Проверка | OK | `assertWorkspace()` сравнивает token.workspaceId с запрашиваемым |
| Cross-workspace | Заблокирован | `WorkspaceMismatchError` при несовпадении |

## Middleware

| Аспект | Статус | Описание |
|--------|--------|----------|
| Framework | Agnostic | Не зависит от Hono/Express/Fastify |
| extractBearerToken | OK | Парсит `Authorization: Bearer <token>` |
| authenticate | OK | Полный пайплайн: extract → verify → validate role |
| requirePermission | OK | Проверка конкретного права для AuthContext |
| requireWorkspace | OK | Проверка workspace для AuthContext |
| Ответы | Structured | `AuthOutcome = AuthResult | AuthFailure` с status + code |

## Что нельзя

- Хранить секретные ключи в исходниках
- Убирать ограничение `submission:execute` только для `owner`
- Добавлять автоматическую подачу заявок без ручного подтверждения
- Отключать проверку подписи или exp
- Использовать алгоритм `none`

## Рекомендации для продакшена

1. Секрет JWT — минимум 32 байта, ротация через переменные окружения
2. Включить проверку iss/aud для каждого сервиса
3. exp — не более 15 минут для access token
4. Добавить refresh token механизм (отдельный модуль)
5. Rate limiting на уровне HTTP-сервера
6. Логирование неудачных попыток аутентификации
7. HTTPS-only для передачи токенов
