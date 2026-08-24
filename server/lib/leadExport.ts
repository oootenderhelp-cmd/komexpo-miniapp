/**
 * Выгрузка лидов в Excel: общий лист, вкладка на каждый день и сводный отчёт.
 *
 * Вкладка на дату — требование учёта по договору с клиникой: видно, сколько
 * заявок отдано в какой день и сколько из них дошло до приёма.
 */

import {
  LEAD_STATUS_LABELS,
  MESSENGER_LABELS,
  URGENCY_SHORT,
  formatSlaLabel,
  getService,
  getSlaState,
  readinessLabel,
  symptomLabel,
  type LeadStatus,
  type MessengerType,
  type ReadinessWindow,
  type Symptom,
  type UrgencyTier,
} from "@shared/dental";
import { buildXlsx, safeSheetName, type Sheet } from "./xlsx";

export type ExportLead = {
  publicId: string;
  name: string;
  phone: string;
  email?: string | null;
  messengerType: string;
  messengerHandle?: string | null;
  city: string;
  serviceSlug: string;
  comment?: string | null;
  painLevel: number;
  symptoms?: unknown;
  readiness: string;
  urgencyScore: number;
  urgencyTier: string;
  urgencyReasons?: unknown;
  sourceChannel?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
  consentPd: boolean;
  consentMarketing: boolean;
  optedOut: boolean;
  status: string;
  partnerId?: number | null;
  /** Название клиники-партнёра — подставляется при выгрузке. */
  partnerName?: string | null;
  region?: string | null;
  routedAt?: Date | string | null;
  firstTouchAt?: Date | string | null;
  visitAt?: Date | string | null;
  createdAt: Date | string;
};

const TZ = "Europe/Moscow";

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Дата в часовом поясе Петербурга: отчётные сутки считаются по клинике. */
export function dayKey(value: Date | string | null | undefined): string {
  const d = asDate(value);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // YYYY-MM-DD
}

export function formatDateTime(
  value: Date | string | null | undefined
): string {
  const d = asDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(v => String(v));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => String(v));
    } catch {
      // В колонке json может лежать и обычная строка — отдаём как есть.
      return [value];
    }
  }
  return [];
};

/** «Где поймали»: канал и метка кампании, из которой пришла заявка. */
function sourceLabel(lead: ExportLead): string {
  const parts = [lead.sourceChannel, lead.utmSource, lead.utmMedium].filter(
    Boolean
  );
  return parts.join(" / ");
}

const COLUMNS: {
  header: string;
  width: number;
  value: (lead: ExportLead) => string | number;
}[] = [
  {
    header: "Дата и время",
    width: 18,
    value: l => formatDateTime(l.createdAt),
  },
  { header: "ID заявки", width: 14, value: l => l.publicId },
  { header: "Имя", width: 22, value: l => l.name },
  { header: "Телефон", width: 18, value: l => l.phone },
  { header: "E-mail", width: 26, value: l => l.email ?? "" },
  {
    header: "Мессенджер",
    width: 14,
    value: l =>
      MESSENGER_LABELS[l.messengerType as MessengerType] ?? l.messengerType,
  },
  { header: "Ник / контакт", width: 22, value: l => l.messengerHandle ?? "" },
  { header: "Город", width: 18, value: l => l.city },
  { header: "Регион", width: 20, value: l => l.region ?? "" },
  {
    header: "Клиника-партнёр",
    width: 28,
    value: l => l.partnerName ?? "не распределена",
  },
  {
    header: "Услуга",
    width: 24,
    value: l => getService(l.serviceSlug)?.name ?? l.serviceSlug,
  },
  {
    header: "Срочность",
    width: 12,
    value: l => URGENCY_SHORT[l.urgencyTier as UrgencyTier] ?? l.urgencyTier,
  },
  { header: "Балл срочности", width: 15, value: l => l.urgencyScore },
  {
    header: "Почему такой приоритет",
    width: 40,
    value: l => asStringArray(l.urgencyReasons).join(", "),
  },
  {
    header: "Готовность прийти",
    width: 22,
    value: l => readinessLabel(l.readiness as ReadinessWindow),
  },
  { header: "Боль (0-10)", width: 12, value: l => l.painLevel },
  {
    header: "Симптомы",
    width: 30,
    value: l =>
      asStringArray(l.symptoms)
        .map(s => symptomLabel(s as Symptom))
        .join(", "),
  },
  { header: "Комментарий", width: 40, value: l => l.comment ?? "" },
  { header: "Источник", width: 22, value: l => sourceLabel(l) },
  { header: "Кампания", width: 24, value: l => l.utmCampaign ?? "" },
  { header: "Объявление", width: 20, value: l => l.utmContent ?? "" },
  { header: "Ключевой запрос", width: 24, value: l => l.utmTerm ?? "" },
  { header: "Страница заявки", width: 26, value: l => l.landingPath ?? "" },
  {
    header: "Согласие на ПД",
    width: 15,
    value: l => (l.consentPd ? "да" : "нет"),
  },
  {
    header: "Согласие на связь",
    width: 17,
    value: l => (l.consentMarketing ? "да" : "нет"),
  },
  { header: "Отписался", width: 12, value: l => (l.optedOut ? "да" : "нет") },
  {
    header: "Статус",
    width: 18,
    value: l => LEAD_STATUS_LABELS[l.status as LeadStatus] ?? l.status,
  },
  {
    header: "Первое касание",
    width: 18,
    value: l => formatDateTime(l.firstTouchAt),
  },
  {
    header: "SLA первого касания",
    width: 22,
    value: l => formatSlaLabel(getSlaState(l)),
  },
  { header: "Дата приёма", width: 18, value: l => formatDateTime(l.visitAt) },
];

const leadRow = (lead: ExportLead) => COLUMNS.map(c => c.value(lead));
const leadColumns = COLUMNS.map(c => ({ header: c.header, width: c.width }));

/** Группирует заявки по отчётным суткам, свежие сверху. */
export function groupByDay(
  leads: ExportLead[]
): { day: string; leads: ExportLead[] }[] {
  const map = new Map<string, ExportLead[]>();
  for (const lead of leads) {
    const key = dayKey(lead.createdAt);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(lead);
    else map.set(key, [lead]);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([day, dayLeads]) => ({ day, leads: dayLeads }));
}

export type DailyStatRow = {
  day: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  scheduled: number;
  visited: number;
  conversion: number;
};

/** Сводка по дням: сколько заявок, какого приоритета и сколько дошло до клиники. */
export function buildDailyStats(leads: ExportLead[]): DailyStatRow[] {
  return groupByDay(leads).map(({ day, leads: dayLeads }) => {
    const count = (tier: UrgencyTier) =>
      dayLeads.filter(l => l.urgencyTier === tier).length;
    const scheduled = dayLeads.filter(
      l => l.status === "scheduled" || l.status === "visited"
    ).length;
    const visited = dayLeads.filter(l => l.status === "visited").length;
    return {
      day,
      total: dayLeads.length,
      critical: count("critical"),
      high: count("high"),
      medium: count("medium"),
      low: count("low"),
      scheduled,
      visited,
      conversion:
        dayLeads.length > 0 ? Math.round((visited / dayLeads.length) * 100) : 0,
    };
  });
}

export type PartnerStatRow = {
  partner: string;
  city: string;
  leads: number;
  scheduled: number;
  visited: number;
  conversion: number;
};

/** Разрез по клиникам-партнёрам: кому отдали заявки и как они их отработали. */
export function buildPartnerStats(leads: ExportLead[]): PartnerStatRow[] {
  const map = new Map<string, ExportLead[]>();
  for (const lead of leads) {
    const key = `${lead.partnerName ?? "не распределена"}|${lead.city}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(lead);
    else map.set(key, [lead]);
  }
  return Array.from(map.entries())
    .map(([key, group]) => {
      const [partner, city] = key.split("|");
      const visited = group.filter(l => l.status === "visited").length;
      return {
        partner,
        city,
        leads: group.length,
        scheduled: group.filter(
          l => l.status === "scheduled" || l.status === "visited"
        ).length,
        visited,
        conversion:
          group.length > 0 ? Math.round((visited / group.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

/** Сколько вкладок-дней класть в книгу: дальше Excel становится неудобным. */
const MAX_DAY_SHEETS = 60;

export type WorkbookResult = {
  buffer: Buffer;
  /** Дни, которые не поместились в лимит вкладок — о них нужно сказать вслух. */
  omittedDays: string[];
  totalLeads: number;
};

export function buildLeadWorkbook(leads: ExportLead[]): WorkbookResult {
  const sorted = [...leads].sort((a, b) => {
    const da = asDate(a.createdAt)?.getTime() ?? 0;
    const db = asDate(b.createdAt)?.getTime() ?? 0;
    if (db !== da) return db - da;
    return b.urgencyScore - a.urgencyScore;
  });

  const stats = buildDailyStats(sorted);

  const reportSheet: Sheet = {
    name: "Отчёт по дням",
    columns: [
      { header: "Дата", width: 14 },
      { header: "Лидов за день", width: 15 },
      { header: "Критичных", width: 12 },
      { header: "Высоких", width: 12 },
      { header: "Средних", width: 12 },
      { header: "Низких", width: 12 },
      { header: "Записаны", width: 12 },
      { header: "Дошли до клиники", width: 18 },
      { header: "Конверсия в приход, %", width: 22 },
    ],
    rows: stats.map(s => [
      s.day,
      s.total,
      s.critical,
      s.high,
      s.medium,
      s.low,
      s.scheduled,
      s.visited,
      s.conversion,
    ]),
  };

  const allSheet: Sheet = {
    name: "Все лиды",
    columns: leadColumns,
    rows: sorted.map(leadRow),
  };

  const partnerSheet: Sheet = {
    name: "Клиники",
    columns: [
      { header: "Клиника", width: 30 },
      { header: "Город", width: 20 },
      { header: "Лидов", width: 12 },
      { header: "Записаны", width: 12 },
      { header: "Дошли", width: 12 },
      { header: "Конверсия в приход, %", width: 22 },
    ],
    rows: buildPartnerStats(sorted).map(p => [
      p.partner,
      p.city,
      p.leads,
      p.scheduled,
      p.visited,
      p.conversion,
    ]),
  };

  const days = groupByDay(sorted);
  const shown = days.slice(0, MAX_DAY_SHEETS);
  const omittedDays = days.slice(MAX_DAY_SHEETS).map(d => d.day);

  const daySheets: Sheet[] = shown.map((d, i) => ({
    name: safeSheetName(d.day, `День ${i + 1}`),
    columns: leadColumns,
    rows: d.leads.map(leadRow),
  }));

  return {
    buffer: buildXlsx([reportSheet, partnerSheet, allSheet, ...daySheets]),
    omittedDays,
    totalLeads: sorted.length,
  };
}
