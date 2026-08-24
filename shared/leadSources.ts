/**
 * Источники заявок для агрегатора.
 *
 * Заявка может прийти не только с нашей формы: с сайта клиники-партнёра, из
 * лид-формы ВК, из формы на Тильде, из колл-трекинга. Каждый источник заводится
 * в системе, получает свой ключ и присылает заявки на общий вход.
 *
 * Единое правило для всех источников: заявка принимается только с отметкой,
 * что человек дал согласие на обработку данных на стороне источника. Источник,
 * который не может это подтвердить, подключать нельзя.
 */

export type LeadSourceType =
  | "own_form"
  | "widget"
  | "partner_site"
  | "vk_lead_form"
  | "yandex_form"
  | "tilda"
  | "telephony"
  | "api";

export const LEAD_SOURCE_LABELS: Record<LeadSourceType, string> = {
  own_form: "Своя форма записи",
  widget: "Виджет на чужом сайте",
  partner_site: "Сайт партнёра",
  vk_lead_form: "Лид-форма ВКонтакте",
  yandex_form: "Яндекс Формы",
  tilda: "Форма на Тильде",
  telephony: "Колл-трекинг",
  api: "Прямая интеграция по API",
};

export const LEAD_SOURCE_TYPES = Object.keys(
  LEAD_SOURCE_LABELS
) as LeadSourceType[];

/** Нормализованная заявка — то, что попадает в базу от любого источника. */
export type NormalizedIntake = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  serviceSlug?: string;
  comment?: string;
  messengerType?: string;
  messengerHandle?: string;
  painLevel?: number;
  readiness?: string;
  consentPd: boolean;
  consentMarketing: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** Идентификатор заявки в системе-источнике — защита от дублей. */
  externalId?: string;
};

const str = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const bool = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "да" || v === "on";
  }
  return false;
};

/** Достаёт первое непустое значение по списку возможных имён полей. */
const pick = (
  payload: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const found = str(payload[key]);
    if (found) return found;
  }
  return undefined;
};

const NAME_KEYS = [
  "name",
  "Name",
  "имя",
  "Имя",
  "fio",
  "FIO",
  "client_name",
  "first_name",
  "username",
];
const PHONE_KEYS = [
  "phone",
  "Phone",
  "телефон",
  "Телефон",
  "tel",
  "phone_number",
  "contact_phone",
];
const EMAIL_KEYS = ["email", "Email", "почта", "e-mail", "mail"];
const CITY_KEYS = ["city", "City", "город", "Город", "town"];
const COMMENT_KEYS = [
  "comment",
  "Comment",
  "комментарий",
  "message",
  "Message",
  "text",
  "question",
  "problem",
];
const SERVICE_KEYS = ["service", "serviceSlug", "услуга", "direction", "tag"];
const EXTERNAL_ID_KEYS = [
  "id",
  "lead_id",
  "leadId",
  "form_id",
  "requestId",
  "external_id",
];

/**
 * Приводит полезную нагрузку любого источника к общему виду.
 *
 * Поля называются у всех по-разному: Тильда шлёт `Name`/`Phone`, лид-форма ВК
 * кладёт ответы в массив, колл-трекинг присылает только номер. Разбор вынесен
 * в чистую функцию, чтобы новый источник подключался правкой одного списка и
 * покрывался тестом, а не отладкой на боевом трафике.
 */
export function normalizeIntake(
  type: LeadSourceType,
  raw: Record<string, unknown>
): NormalizedIntake | { error: string } {
  let payload: Record<string, unknown> = raw;

  // Лид-форма ВК присылает ответы списком {key, value} — разворачиваем в объект.
  if (type === "vk_lead_form") {
    const answers = (raw.answers ?? (raw.object as any)?.answers) as unknown;
    if (Array.isArray(answers)) {
      const flat: Record<string, unknown> = { ...raw };
      for (const item of answers as Array<Record<string, unknown>>) {
        const key = str(item.key) ?? str(item.question);
        const value = str(item.answer) ?? str(item.value);
        if (key && value) flat[key] = value;
      }
      payload = flat;
    }
  }

  // Яндекс Формы кладут ответы в объект answer.data с вложенным value.
  if (type === "yandex_form") {
    const data = (raw as any)?.answer?.data;
    if (data && typeof data === "object") {
      const flat: Record<string, unknown> = { ...raw };
      for (const [key, field] of Object.entries(data as Record<string, any>)) {
        const value = str(field?.value) ?? str(field);
        if (value) flat[key] = value;
      }
      payload = flat;
    }
  }

  const phone = pick(payload, PHONE_KEYS);
  if (!phone) return { error: "В заявке нет телефона" };

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { error: "Телефон в заявке слишком короткий" };

  // Колл-трекинг — это входящий звонок: имени нет, есть только номер.
  const name =
    pick(payload, NAME_KEYS) ??
    (type === "telephony" ? "Входящий звонок" : undefined);
  if (!name) return { error: "В заявке нет имени" };

  // Звонок в клинику — это уже обращение: человек сам набрал номер.
  const consentPd =
    type === "telephony"
      ? true
      : bool(payload.consentPd ?? payload.consent ?? payload.agree);
  if (!consentPd) {
    return {
      error: "Источник не подтвердил согласие на обработку персональных данных",
    };
  }

  return {
    name,
    phone,
    email: pick(payload, EMAIL_KEYS),
    city: pick(payload, CITY_KEYS),
    serviceSlug: pick(payload, SERVICE_KEYS),
    comment: pick(payload, COMMENT_KEYS),
    messengerType: str(payload.messengerType),
    messengerHandle: str(payload.messengerHandle),
    painLevel:
      typeof payload.painLevel === "number" ? payload.painLevel : undefined,
    readiness: str(payload.readiness),
    consentPd: true,
    consentMarketing: bool(
      payload.consentMarketing ?? payload.consent_marketing
    ),
    utmSource: str(payload.utm_source) ?? str(payload.utmSource),
    utmMedium: str(payload.utm_medium) ?? str(payload.utmMedium),
    utmCampaign: str(payload.utm_campaign) ?? str(payload.utmCampaign),
    utmContent: str(payload.utm_content) ?? str(payload.utmContent),
    utmTerm: str(payload.utm_term) ?? str(payload.utmTerm),
    externalId: pick(payload, EXTERNAL_ID_KEYS),
  };
}

/** Ключ вида dlk_<префикс>_<секрет>: по префиксу ищем, секрет сверяем по хешу. */
export const API_KEY_PREFIX_LENGTH = 8;

export function parseApiKey(
  key: string
): { prefix: string; secret: string } | null {
  const parts = key.trim().split("_");
  if (parts.length !== 3 || parts[0] !== "dlk") return null;
  if (parts[1].length !== API_KEY_PREFIX_LENGTH || parts[2].length < 16)
    return null;
  return { prefix: parts[1], secret: parts[2] };
}
