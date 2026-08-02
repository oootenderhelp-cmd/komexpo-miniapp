# tendrovik-competitor-intelligence

Переносимый модуль конкурентной разведки и прогноза шансов победы в тендере
для платформы «Тендровик AI». Чисто аналитический — все выводы являются
рекомендацией для человека, не юридическим заключением.

## Безопасность и ограничения

- **Никаких сетевых вызовов.** Модуль работает только с данными, предоставленными пользователем.
- **Никакого парсинга сайтов.** `RusprofileImportAdapter` принимает только ручной CSV/JSON экспорт.
- **Не юридическое заключение.** Каждый `ScoreResult` содержит `limitations[]` и `disclaimer`.
- **Нет автоподачи.** Подача заявок и юридически значимые действия требуют ручного подтверждения.
- **Нет API-ключей, логинов, CAPTCHA.**

## Scoring (0–100)

Детерминированная функция `computeScore(company, tender)` раскладывает оценку по 6 факторам:

| Фактор | Вес | Описание |
|--------|-----|----------|
| `subject_match` | 25% | Совпадение ОКВЭД/ОКПД компании с предметом закупки |
| `relevant_experience` | 20% | Количество, объём и давность релевантных контрактов |
| `financial_capacity` | 20% | Выручка/НМЦ, прибыль, долговая нагрузка, штат |
| `production_capacity` | 10% | Штат, возраст компании, действующий статус |
| `price_position` | 10% | Масштаб прошлых контрактов vs НМЦ тендера |
| `risk_profile` | 15% | Арбитраж, банкротство, РНП, налоговая задолженность |

Плюс `confidence` (0–100), `dataFreshnessDays`, `humanChecks[]`, `limitations[]`.

## Контракт импорта данных

```typescript
import { RusprofileImportAdapter } from "tendrovik-competitor-intelligence";

const adapter = new RusprofileImportAdapter();

// Загрузить данные из ручного экспорта (CSV → JSON, PDF → JSON, снимок профиля)
adapter.loadFromRecords([
  {
    inn: "7707083893",
    name: "ООО СтройМонтаж-М",
    okvedMain: "41.20",
    annualRevenue: 85_000_000,
    employeeCount: 65,
  },
], "2026-07-15T10:00:00Z");

const profile = adapter.loadCompanyProfile("7707083893");
```

Источник данных — **только** ручной ввод пользователем: сохранённый PDF/CSV/JSON.
Сетевые запросы, браузерная автоматизация, scraping, API-ключи запрещены.

## Запуск

```bash
cd tendrovik-competitor-intelligence
npm install
npm run typecheck
npm test
```
