# HANDOFF FOR CODEX — tendrovik-competitor-intelligence

Модуль конкурентной разведки и прогноза шансов победы в тендере для «Тендровик AI».
Независим от `tendrovik-backend` — можно перенести как npm workspace или скопировать.

---

## Содержимое

```
tendrovik-competitor-intelligence/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── PRIVACY_LEGAL_NOTES.md
├── HANDOFF_FOR_CODEX.md
├── src/
│   ├── index.ts                        # barrel export
│   ├── interfaces/
│   │   ├── company.ts                  # CompanyProfile, CompanyFinancials, PastContract, CompanyRisk
│   │   ├── tender.ts                   # TenderContext
│   │   ├── scoring.ts                  # ScoreResult, FactorScore, CompetitiveAnalysis
│   │   └── index.ts                    # re-exports
│   ├── scoring/
│   │   ├── factors.ts                  # 6 factor scoring functions
│   │   └── index.ts                    # computeScore() main entry
│   ├── comparison/
│   │   └── index.ts                    # compareWithCompetitors()
│   ├── providers/
│   │   ├── interface.ts                # CompanyDataProvider, ImportableRecord
│   │   └── rusprofile-import.ts        # RusprofileImportAdapter (manual data only)
│   └── fixtures/
│       └── index.ts                    # FIXTURE_CLIENT, FIXTURE_COMPETITOR_A/B, FIXTURE_TENDER
└── tests/
    ├── scoring.test.ts                 # 32 теста скоринга + human checks + детерминизм
    ├── comparison.test.ts              # 9 тестов сравнения конкурентов
    ├── providers.test.ts               # 10 тестов RusprofileImportAdapter
    └── fixtures.test.ts               # 8 тестов целостности фикстур
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
{ "workspaces": ["tendrovik-backend", "tendrovik-competitor-intelligence"] }
```
```json
// tendrovik-backend/package.json
{ "dependencies": { "tendrovik-competitor-intelligence": "workspace:*" } }
```
```typescript
// tendrovik-backend/src/services/intelligence.ts
import { computeScore, compareWithCompetitors } from "tendrovik-competitor-intelligence";
```

### Вариант B — копирование модуля
Скопировать `src/` в `tendrovik-backend/src/intelligence/` и обновить импорты.

---

## Интеграция с Hono API

```typescript
import { Hono } from "hono";
import {
  computeScore,
  compareWithCompetitors,
  RusprofileImportAdapter,
} from "tendrovik-competitor-intelligence";
import type { CompanyProfile, TenderContext } from "tendrovik-competitor-intelligence";

const app = new Hono();

// POST /v1/intelligence/score — оценка одной компании
app.post("/v1/intelligence/score", async (c) => {
  const { company, tender } = await c.req.json<{
    company: CompanyProfile;
    tender: TenderContext;
  }>();
  const result = computeScore(company, tender);
  return c.json(result);
});

// POST /v1/intelligence/compare — сравнение с конкурентами
app.post("/v1/intelligence/compare", async (c) => {
  const { client, competitors, tender } = await c.req.json<{
    client: CompanyProfile;
    competitors: CompanyProfile[];
    tender: TenderContext;
  }>();
  const analysis = compareWithCompetitors(client, competitors, tender);
  return c.json(analysis);
});

// POST /v1/intelligence/import — загрузка данных из ручного экспорта
app.post("/v1/intelligence/import", async (c) => {
  const { records, importedAt } = await c.req.json();
  const adapter = new RusprofileImportAdapter();
  adapter.loadFromRecords(records, importedAt);
  return c.json({ loaded: adapter.listLoadedInns() });
});
```

---

## Scoring: 6 факторов

| # | Фактор | Вес | Что оценивает |
|---|--------|-----|---------------|
| 1 | `subject_match` | 25% | ОКВЭД/ОКПД компании vs предмет закупки |
| 2 | `relevant_experience` | 20% | Количество, объём, давность релевантных контрактов |
| 3 | `financial_capacity` | 20% | Выручка/НМЦ, прибыль, долг/активы, штат |
| 4 | `production_capacity` | 10% | Штат, возраст компании, действующий статус |
| 5 | `price_position` | 10% | Масштаб прошлых контрактов vs НМЦ |
| 6 | `risk_profile` | 15% | Арбитраж, банкротство, РНП, налог. задолженность |

Результат:
```typescript
interface ScoreResult {
  totalScore: number;        // 0–100
  confidence: number;        // 0–100 (полнота данных)
  dataFreshnessDays: number; // давность самого старого факта
  factors: FactorScore[];    // 6 факторов с score/maxScore/weight/rationale
  humanChecks: HumanCheckItem[]; // что требует проверки человеком
  limitations: string[];     // ограничения и оговорки
  recommendation: "strong" | "moderate" | "weak" | "insufficient_data";
}
```

---

## Human checks (что требует проверки человеком)

Модуль автоматически выявляет ситуации, где данных недостаточно:

| Проверка | Severity | Когда срабатывает |
|----------|----------|------------------|
| Аккредитация | blocking | Тендер требует, компания `hasAccreditation === null` |
| КЭП | blocking | Тендер требует, компания `hasKep === null` |
| Лицензия | blocking/warning | Лицензия не подтверждена или отсутствует |
| Статус компании | blocking | `isActive === false` |
| РНП | blocking | Компания в реестре недобросовестных поставщиков |

При наличии `blocking` → `recommendation = "insufficient_data"`.

---

## Провайдеры данных

### CompanyDataProvider (интерфейс)
```typescript
interface CompanyDataProvider {
  readonly name: string;
  loadCompanyProfile(inn: string): CompanyProfile | null;
}
```

### RusprofileImportAdapter
Принимает **только ручной** CSV/JSON/PDF экспорт. Не делает сетевых запросов.

```typescript
const adapter = new RusprofileImportAdapter();
adapter.loadFromRecords(records, "2026-07-15T10:00:00Z");
const profile = adapter.loadCompanyProfile("7707083893");
adapter.clear(); // удаляет все данные
```

---

## Что Codex может менять

- **Можно:** добавлять новые факторы, расширять интерфейсы, новые провайдеры.
- **Можно:** интегрировать с Hono endpoints.
- **Можно:** добавлять кэширование профилей на уровне backend.
- **Нельзя:** убирать disclaimer и limitations из ScoreResult.
- **Нельзя:** делать сетевые запросы к Rusprofile или другим сайтам.
- **Нельзя:** автоматически подавать заявки на основании скоринга.
- **Нельзя:** хранить API-ключи или credentials в коде.
- **Нельзя:** парсить/скрейпить сайты для получения данных.
