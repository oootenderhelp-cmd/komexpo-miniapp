/**
 * Deterministic seed dataset for Тендровик AI.
 *
 * Pure data (no DB dependency) so it can be reused by both the seed runner
 * (src/db/seed.ts) and unit tests. Contains ≥5 tenders, repeating winners,
 * example cost/price calculations, estimator+lawyer approvals, four ad banners
 * (KomExpo / курсы / франшиза / образовательный центр) and CRM funnel data.
 */

export const seedOrganization = {
  name: 'ООО «Тендровик Демо»',
  inn: '7701234567',
  kpp: '770101001',
  ogrn: '1157746000000',
};

export const seedUsers = [
  { key: 'owner', email: 'owner@demo.tendrovik.ai', fullName: 'Иван Владелец', role: 'owner' },
  { key: 'admin', email: 'admin@demo.tendrovik.ai', fullName: 'Анна Админ', role: 'admin' },
  { key: 'specialist', email: 'tender@demo.tendrovik.ai', fullName: 'Пётр Тендеровик', role: 'tender_specialist' },
  { key: 'lawyer', email: 'lawyer@demo.tendrovik.ai', fullName: 'Мария Юрист', role: 'lawyer' },
  { key: 'estimator', email: 'smeta@demo.tendrovik.ai', fullName: 'Олег Сметчик', role: 'estimator' },
  { key: 'sales', email: 'sales@demo.tendrovik.ai', fullName: 'Елена Продажи', role: 'sales' },
] as const;

export const seedRoles = [
  'owner',
  'admin',
  'tender_specialist',
  'lawyer',
  'estimator',
  'sales',
] as const;

export const seedPermissions = [
  { code: 'tender.view', description: 'Просмотр тендеров' },
  { code: 'tender.decide', description: 'Решение участвуем/не участвуем' },
  { code: 'pricing.calculate', description: 'Расчёт цены' },
  { code: 'approval.estimator', description: 'Согласование сметчика' },
  { code: 'approval.lawyer', description: 'Согласование юриста' },
  { code: 'approval.specialist', description: 'Согласование тендеровика' },
  { code: 'approval.owner', description: 'Согласование владельца' },
  { code: 'submission.confirm', description: 'Подтверждение подачи (человек)' },
  { code: 'crm.manage', description: 'Управление CRM-воронкой' },
  { code: 'ads.manage', description: 'Управление рекламой' },
];

export const seedTenderSource = {
  code: 'stub_zakupki',
  title: 'Демо-источник (заглушка)',
  adapter: 'stub',
};

/** ≥5 tenders. */
export const seedTenders = [
  {
    externalId: '0173100000123000001',
    title: 'Поставка канцелярских товаров',
    customerName: 'ГБУ «Центр закупок»',
    customerInn: '7702345678',
    region: 'Москва',
    law: '44-ФЗ',
    startPrice: '850000.00',
    status: 'scored' as const,
    score: '72.00',
  },
  {
    externalId: '0173100000123000002',
    title: 'Транспортно-экспедиционные услуги по перевозке грузов',
    customerName: 'АО «ЛогистикТранс»',
    customerInn: '7703456789',
    region: 'Московская область',
    law: '223-ФЗ',
    startPrice: '4200000.00',
    status: 'in_review' as const,
    score: '81.00',
  },
  {
    externalId: '0173100000123000003',
    title: 'Клининговые услуги для административного здания',
    customerName: 'ФКУ «Хозуправление»',
    customerInn: '7704567890',
    region: 'Москва',
    law: '44-ФЗ',
    startPrice: '1300000.00',
    status: 'enriched' as const,
    score: '64.00',
  },
  {
    externalId: '0173100000123000004',
    title: 'Поставка компьютерной техники',
    customerName: 'ГБОУ «Школа №123»',
    customerInn: '7705678901',
    region: 'Санкт-Петербург',
    law: '44-ФЗ',
    startPrice: '2750000.00',
    status: 'parsed' as const,
    score: '58.00',
  },
  {
    externalId: '0173100000123000005',
    title: 'Экспедирование и доставка грузов по РФ',
    customerName: 'ПАО «ТоргСеть»',
    customerInn: '7706789012',
    region: 'Москва',
    law: '223-ФЗ',
    startPrice: '6800000.00',
    status: 'decided' as const,
    score: '88.00',
  },
];

/** Repeating winners: «СтройГарант» wins twice, «ЛогоПро» wins twice. */
export const seedCompetitors = [
  { name: 'ООО «СтройГарант»', inn: '7712345678', winsCount: 2, avgDiscountPct: '14.50' },
  { name: 'ООО «ЛогоПро»', inn: '7713456789', winsCount: 2, avgDiscountPct: '9.20' },
  { name: 'ООО «ОфисМаркет»', inn: '7714567890', winsCount: 1, avgDiscountPct: '18.00' },
];

export const seedWinnerHistory = [
  { tenderExternalId: 'ARCH-2024-001', winnerName: 'ООО «СтройГарант»', winnerInn: '7712345678', startPrice: '1200000.00', finalPrice: '1026000.00', discountPct: '14.50' },
  { tenderExternalId: 'ARCH-2024-014', winnerName: 'ООО «СтройГарант»', winnerInn: '7712345678', startPrice: '980000.00', finalPrice: '840000.00', discountPct: '14.29' },
  { tenderExternalId: 'ARCH-2024-022', winnerName: 'ООО «ЛогоПро»', winnerInn: '7713456789', startPrice: '5000000.00', finalPrice: '4540000.00', discountPct: '9.20' },
  { tenderExternalId: 'ARCH-2024-031', winnerName: 'ООО «ЛогоПро»', winnerInn: '7713456789', startPrice: '3600000.00', finalPrice: '3270000.00', discountPct: '9.17' },
  { tenderExternalId: 'ARCH-2024-045', winnerName: 'ООО «ОфисМаркет»', winnerInn: '7714567890', startPrice: '700000.00', finalPrice: '574000.00', discountPct: '18.00' },
];

export const seedOrganizationsRegistry = [
  { inn: '7712345678', name: 'ООО «СтройГарант»', region: 'Москва' },
  { inn: '7713456789', name: 'ООО «ЛогоПро»', region: 'Московская область' },
  { inn: '7714567890', name: 'ООО «ОфисМаркет»', region: 'Москва' },
];

/** Example cost calculation + three price scenarios for tender #1. */
export const seedCostCalculation = {
  tenderExternalId: '0173100000123000001',
  lineItems: [
    { name: 'Бумага А4', qty: 500, unitCost: 350 },
    { name: 'Ручки шариковые', qty: 1000, unitCost: 25 },
    { name: 'Логистика', qty: 1, unitCost: 45000 },
  ],
  directCost: '245000.00',
  overhead: '24500.00',
  tax: '53900.00',
  totalCost: '323400.00',
};

export const seedPriceScenarios = [
  { strategy: 'aggressive' as const, price: '362208.00', marginPct: '12.00', winProbabilityPct: '70.00', rationale: 'Минимальная маржа, максимум шансов на победу.' },
  { strategy: 'balanced' as const, price: '371910.00', marginPct: '15.00', winProbabilityPct: '50.00', rationale: 'Баланс маржи и вероятности победы.' },
  { strategy: 'premium' as const, price: '420420.00', marginPct: '30.00', winProbabilityPct: '32.00', rationale: 'Высокая маржа, участие при слабой конкуренции.' },
];

export const seedPricingRule = {
  name: 'Базовые правила ценообразования',
  minMarginPct: '12.00',
  overheadPct: '10.00',
  taxPct: '20.00',
  strategyMarkupPct: { aggressive: 12, balanced: 15, premium: 30 },
};

/** Approval request for tender #1 with estimator + lawyer already approved. */
export const seedApproval = {
  tenderExternalId: '0173100000123000001',
  requestStatus: 'in_progress' as const,
  steps: [
    { role: 'estimator' as const, order: 1, status: 'approved' as const, comment: 'Себестоимость подтверждена.' },
    { role: 'lawyer' as const, order: 2, status: 'approved' as const, comment: 'Документация соответствует 44-ФЗ.' },
    { role: 'tender_specialist' as const, order: 3, status: 'pending' as const, comment: null },
    { role: 'owner' as const, order: 4, status: 'pending' as const, comment: null },
  ],
};

/** Four ad banners as required. */
export const seedAdSlots = [
  { code: 'dashboard_top', title: 'Верх дашборда', width: 970, height: 250 },
  { code: 'tender_card_side', title: 'Сайдбар карточки тендера', width: 300, height: 600 },
];

export const seedAdCampaigns = [
  { slotCode: 'dashboard_top', advertiser: 'KomExpo', title: 'KomExpo — франшиза экспедирования грузов', targetUrl: 'https://example.invalid/komexpo', weight: 4, status: 'active' as const },
  { slotCode: 'dashboard_top', advertiser: 'Курсы', title: 'Курсы по тендерам 44-ФЗ / 223-ФЗ', targetUrl: 'https://example.invalid/courses', weight: 2, status: 'active' as const },
  { slotCode: 'tender_card_side', advertiser: 'Франшиза', title: 'Франшиза «Тендровик» — открой филиал', targetUrl: 'https://example.invalid/franchise', weight: 2, status: 'active' as const },
  { slotCode: 'tender_card_side', advertiser: 'Образовательный центр', title: 'Образовательный центр закупок', targetUrl: 'https://example.invalid/edu', weight: 1, status: 'active' as const },
];

/** CRM funnel: counts per stage (statistics). */
export const seedCrmFunnel: Record<string, number> = {
  lead: 40,
  qualification: 28,
  analysis: 19,
  pricing: 12,
  approval: 7,
  submitted: 5,
  won: 3,
  lost: 6,
};

/** Individual CRM items (linked to seed tenders) for detailed views. */
export const seedCrmItems = [
  { title: 'Канцтовары — ГБУ Центр закупок', tenderExternalId: '0173100000123000001', stage: 'approval' as const, amount: '362208.00' },
  { title: 'Перевозка грузов — ЛогистикТранс', tenderExternalId: '0173100000123000002', stage: 'pricing' as const, amount: '3990000.00' },
  { title: 'Клининг — Хозуправление', tenderExternalId: '0173100000123000003', stage: 'analysis' as const, amount: '1235000.00' },
  { title: 'Компьютеры — Школа №123', tenderExternalId: '0173100000123000004', stage: 'qualification' as const, amount: '2600000.00' },
  { title: 'Экспедирование — ТоргСеть', tenderExternalId: '0173100000123000005', stage: 'submitted' as const, amount: '6460000.00' },
];

export const seedLossReasons = [
  { code: 'price', title: 'Проиграли по цене' },
  { code: 'docs', title: 'Ошибка в документации' },
  { code: 'no_capacity', title: 'Нет ресурсов на исполнение' },
  { code: 'deadline', title: 'Не успели к сроку' },
];

export const seedPlans = [
  { code: 'free', title: 'Free', priceMonthly: '0.00' },
  { code: 'pro', title: 'Pro', priceMonthly: '9900.00' },
  { code: 'enterprise', title: 'Enterprise', priceMonthly: '49000.00' },
];

export const seedIntegrations = [
  { kind: 'bitrix24' as const, title: 'Bitrix24 CRM', status: 'not_configured' as const, configPlaceholders: { webhookUrl: '<BITRIX24_WEBHOOK_URL>' } },
  { kind: 'email' as const, title: 'Email (SMTP)', status: 'not_configured' as const, configPlaceholders: { smtpHost: '<SMTP_HOST>' } },
  { kind: 'procurement_platform' as const, title: 'Площадка закупок', status: 'not_configured' as const, configPlaceholders: { apiBase: '<ZAKUPKI_API_BASE>' } },
  { kind: 'openai' as const, title: 'OpenAI', status: 'not_configured' as const, configPlaceholders: { model: '<OPENAI_MODEL>' } },
];
