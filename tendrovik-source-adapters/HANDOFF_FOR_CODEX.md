# HANDOFF FOR CODEX — tendrovik-source-adapters

Модуль нормализации тендерных источников для «Тендровик AI».
Независим от `tendrovik-backend` — можно перенести как npm workspace или скопировать.

---

## Содержимое

```
tendrovik-source-adapters/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── HANDOFF_FOR_CODEX.md
├── src/
│   ├── index.ts                    # barrel export
│   ├── interfaces/index.ts         # TenderSource, NormalizedTender, SourceTermsGate, etc.
│   ├── registry/sources.ts         # 15 площадок с метаданными
│   ├── gate/index.ts               # ImportBlockedError, assertImportAllowed, guardedImport
│   ├── normalizer/index.ts         # normalize() + deduplicate()
│   └── fixtures/index.ts           # 3 формата: EIS, B2B-Center, Sberbank-AST
└── tests/
    ├── registry.test.ts            # 14 тестов реестра
    ├── gate.test.ts                # 7 тестов gate-механизма
    └── normalizer.test.ts          # 11 тестов нормализации + дедупликации
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
{ "workspaces": ["tendrovik-backend", "tendrovik-source-adapters"] }
```
```json
// tendrovik-backend/package.json
{ "dependencies": { "tendrovik-source-adapters": "workspace:*" } }
```
```typescript
// tendrovik-backend/src/services/adapters/tender-source.ts
import { normalize, guardedImport, getSource } from "tendrovik-source-adapters";
```

### Вариант B — копирование модуля
Скопировать `src/` в `tendrovik-backend/src/sources/` и обновить импорты.

### Вариант C — относительный импорт
```typescript
import { normalize } from "../../tendrovik-source-adapters/src/index.js";
```

---

## Интеграция с существующим TenderSourceAdapter

В `tendrovik-backend/src/services/adapters/index.ts` определён интерфейс `TenderSourceAdapter`.
Для подключения реального источника:

```typescript
import type { TenderSourceAdapter } from "../adapters/index.js";
import { getSource, assertImportAllowed, normalize } from "tendrovik-source-adapters";

class EisAdapter implements TenderSourceAdapter {
  async search(query) {
    const source = getSource("eis")!;
    assertImportAllowed(source); // бросает если gate закрыт
    // ... HTTP-вызов к ЕИС ...
    return results.map(raw => normalize({ format: "eis", ...raw }));
  }
}
```

---

## Площадки, требующие отдельного юридического и технического согласования

### Юридическое согласование обязательно

| Площадка | Причина | Действие |
|----------|---------|----------|
| ЕИС (API ЕИС ОО) | Доступ к API по сертификату от Казначейства | Подать заявку на подключение к ЕИС ОО |
| Сбербанк-АСТ | Аккредитация через ЕРУЗ + КЭП для подачи | Пройти аккредитацию, получить КЭП юрлица |
| РТС-тендер | Аккредитация ЕРУЗ + КЭП | Аналогично Сбербанк-АСТ |
| Росэлторг | Аккредитация ЕРУЗ + КЭП | Аналогично |
| ЭТП ГПБ | Аккредитация + КЭП + договор с площадкой | Подписать договор с ГПБ |
| ТЭК-Торг | Аккредитация + КЭП | Пройти аккредитацию |
| РАД / Lot-online | Аккредитация + КЭП | Пройти аккредитацию |
| ЗаказРФ / НЭП | Аккредитация ЕРУЗ + КЭП | Пройти аккредитацию |
| Фабрикант | Аккредитация + КЭП для 223-ФЗ | Пройти аккредитацию |
| ЕРУЗ | Регистрация через Госуслуги + КЭП | Зарегистрироваться в ЕРУЗ |

### Техническое согласование

| Площадка | Требование |
|----------|------------|
| ЕИС API | Сертификат ГОСТ, TLS mutual auth, rate limit 10 req/min |
| B2B-Center API | Договор на API-доступ, OAuth2, rate limit по договору |
| Контур.Закупки API | Подписка + API-ключ по договору |
| Все ЭТП | robots.txt: проверить перед каждым парсингом; не скрейпить кабинеты |

### Площадки без специального согласования (публичный поиск)

| Площадка | Примечание |
|----------|------------|
| B2B-Center | Публичный поиск без регистрации; API — отдельно |
| ТендерПро | Публичный поиск; документы — после регистрации |
| OTC.ru | Публичный поиск; КЭП не требуется |
| Контур.Закупки | Агрегатор; подписка; документы — ссылки на ЕИС/ЭТП |

---

## Gate-механизм

Импорт из любого источника заблокирован по умолчанию (`CLOSED_GATE`).
Чтобы разрешить импорт, нужно явно подтвердить 4 условия:

1. `publicUrlVerified` — URL площадки доступен и верифицирован
2. `robotsOrApiAllowed` — robots.txt или условия API разрешают автоматический доступ
3. `rateLimitConfigured` — настроен rate limiter (не более N запросов в минуту)
4. `testFixturePresent` — есть тестовая фикстура для проверки нормализации

```typescript
import { openGate, getSource, assertImportAllowed } from "tendrovik-source-adapters";

const eis = openGate(getSource("eis")!); // все 4 условия → true
assertImportAllowed(eis); // OK — не бросает

const raw = getSource("eis")!;
assertImportAllowed(raw); // ImportBlockedError: 4 reasons
```

---

## Что Codex может менять

- **Можно:** добавлять новые источники в реестр, новые форматы фикстур, расширять интерфейсы.
- **Можно:** реализовать реальные HTTP-адаптеры за gate.
- **Нельзя:** убирать gate-механизм или делать `CLOSED_GATE` открытым по умолчанию.
- **Нельзя:** добавлять автоматическую подачу заявок (`submission: true`).
- **Нельзя:** хранить реальные credentials в исходниках.
