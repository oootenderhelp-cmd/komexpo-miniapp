import type { TenderSource } from "../interfaces/index.js";
import { CLOSED_GATE } from "../interfaces/index.js";

export const SOURCE_REGISTRY: TenderSource[] = [
  {
    code: "eis",
    name: "ЕИС (zakupki.gov.ru)",
    url: "https://zakupki.gov.ru",
    segments: ["federal_44fz", "federal_223fz"],
    accessMethods: ["public_search", "api_stub"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: false,
    requiresKep: false,
    notes: "Единая информационная система. Публичный поиск без регистрации. API (ЕИС ОО) требует сертификат.",
  },
  {
    code: "eruz",
    name: "ЕРУЗ (Единый реестр участников закупок)",
    url: "https://zakupki.gov.ru/epz/eruz",
    segments: ["federal_44fz", "federal_223fz"],
    accessMethods: ["public_search"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: false, monitoring: false, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Реестр аккредитованных участников. Регистрация требует КЭП и подтверждённый ИНН.",
  },
  {
    code: "sberbank_ast",
    name: "Сбербанк-АСТ",
    url: "https://www.sberbank-ast.ru",
    segments: ["federal_44fz"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Крупнейшая федеральная ЭТП по 44-ФЗ. Аккредитация через ЕРУЗ, подача заявки только с КЭП.",
  },
  {
    code: "rts_tender",
    name: "РТС-тендер",
    url: "https://www.rts-tender.ru",
    segments: ["federal_44fz", "federal_223fz"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Федеральная ЭТП. Поиск публичный; подача — КЭП + аккредитация ЕРУЗ.",
  },
  {
    code: "roseltorg",
    name: "Росэлторг (ЕЭТП)",
    url: "https://www.roseltorg.ru",
    segments: ["federal_44fz", "federal_223fz"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Единая электронная торговая площадка. Аккредитация через ЕРУЗ.",
  },
  {
    code: "etp_gpb",
    name: "ЭТП ГПБ (Газпромбанк)",
    url: "https://etpgpb.ru",
    segments: ["federal_223fz", "commercial"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "ЭТП Газпромбанка. 223-ФЗ и коммерческие закупки. Требует аккредитации и КЭП.",
  },
  {
    code: "tektorg",
    name: "ТЭК-Торг",
    url: "https://www.tektorg.ru",
    segments: ["federal_223fz", "commercial"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "ЭТП для ТЭК-сектора и 223-ФЗ. Поиск публичный; подача — КЭП.",
  },
  {
    code: "rad_lot_online",
    name: "РАД / Lot-online",
    url: "https://www.lot-online.ru",
    segments: ["federal_44fz", "federal_223fz", "commercial"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: false, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Российский аукционный дом. Имущество, приватизация, аренда. КЭП обязательна.",
  },
  {
    code: "zakazrf",
    name: "ЗаказРФ",
    url: "https://www.zakazrf.ru",
    segments: ["federal_44fz", "federal_223fz"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Национальная электронная площадка. Аккредитация через ЕРУЗ.",
  },
  {
    code: "nep",
    name: "НЭП (Национальная электронная площадка)",
    url: "https://etp.zakazrf.ru",
    segments: ["federal_44fz", "federal_223fz", "municipal"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "Муниципальные и федеральные закупки. КЭП + ЕРУЗ.",
  },
  {
    code: "b2b_center",
    name: "B2B-Center",
    url: "https://www.b2b-center.ru",
    segments: ["commercial", "corporate"],
    accessMethods: ["public_search", "official_cabinet", "api_stub"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: false,
    requiresKep: false,
    notes: "Коммерческая B2B-площадка. Регистрация без КЭП. API по договору.",
  },
  {
    code: "tenderpro",
    name: "ТендерПро",
    url: "https://www.tenderpro.ru",
    segments: ["commercial", "corporate"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: false, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: false,
    requiresKep: false,
    notes: "Коммерческая площадка закупок. Доступ к документам — после регистрации.",
  },
  {
    code: "fabrikant",
    name: "Фабрикант",
    url: "https://www.fabrikant.ru",
    segments: ["commercial", "federal_223fz"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: true,
    requiresKep: true,
    notes: "ЭТП для 223-ФЗ и коммерческих закупок. КЭП для подачи.",
  },
  {
    code: "otc",
    name: "OTC.ru (ОТС)",
    url: "https://www.otc.ru",
    segments: ["commercial", "municipal"],
    accessMethods: ["public_search", "official_cabinet"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: true, monitoring: false, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: false,
    requiresKep: false,
    notes: "Площадка малых закупок и коммерческих тендеров. КЭП не требуется.",
  },
  {
    code: "kontur_zakupki",
    name: "Контур.Закупки",
    url: "https://zakupki.kontur.ru",
    segments: ["federal_44fz", "federal_223fz", "commercial"],
    accessMethods: ["public_search", "api_stub"],
    capabilities: { search: true, fetchCard: true, fetchDocuments: false, monitoring: true, submission: false },
    gate: CLOSED_GATE,
    requiresAccreditation: false,
    requiresKep: false,
    notes: "Агрегатор тендеров (не ЭТП). Подписка. API по договору. Документы — ссылки на ЕИС/ЭТП.",
  },
];

export function getSource(code: string): TenderSource | undefined {
  return SOURCE_REGISTRY.find((s) => s.code === code);
}

export function listSources(): TenderSource[] {
  return [...SOURCE_REGISTRY];
}

export function sourcesBySegment(segment: string): TenderSource[] {
  return SOURCE_REGISTRY.filter((s) =>
    s.segments.includes(segment as TenderSource["segments"][number]),
  );
}

export function sourcesRequiringKep(): TenderSource[] {
  return SOURCE_REGISTRY.filter((s) => s.requiresKep);
}

export function sourcesWithPublicSearch(): TenderSource[] {
  return SOURCE_REGISTRY.filter((s) => s.accessMethods.includes("public_search"));
}
