/**
 * Стоматологический лид-модуль (DAREMA, Санкт-Петербург).
 *
 * Модуль работает только с заявками, которые человек оставил сам: контакты
 * попадают в базу из формы записи вместе с отметками о согласии на обработку
 * персональных данных (152-ФЗ) и на рекламные коммуникации (ст. 18 38-ФЗ).
 * Ничего, что собирает контакты из внешних источников, здесь нет и быть не
 * должно — первое касание уходит только тому, кто его запросил.
 */

// ============ КАТАЛОГ УСЛУГ ============

export type DentalServiceSlug =
  | "neotlozhnaya"
  | "terapiya"
  | "endodontiya"
  | "hirurgiya"
  | "implantaciya"
  | "protezirovanie"
  | "ortodontiya"
  | "parodontologiya"
  | "gigiena"
  | "detskaya";

export type DentalService = {
  slug: DentalServiceSlug;
  name: string;
  short: string;
  /** Лид-магнит первого касания — то, что человек получает бесплатно. */
  leadMagnet: string;
  /** Базовая надбавка к срочности: у направления своя «температура». */
  baseUrgency: number;
};

export const DENTAL_SERVICES: readonly DentalService[] = [
  {
    slug: "neotlozhnaya",
    name: "Неотложная помощь",
    short: "Острая боль, флюс, травма зуба — приём в день обращения",
    leadMagnet: "Осмотр и снимок в день обращения бесплатно",
    baseUrgency: 30,
  },
  {
    slug: "terapiya",
    name: "Лечение кариеса",
    short: "Пломбирование, реставрация, лечение под микроскопом",
    leadMagnet: "Бесплатная диагностика и план лечения",
    baseUrgency: 10,
  },
  {
    slug: "endodontiya",
    name: "Лечение каналов",
    short: "Эндодонтия, перелечивание каналов, пульпит и периодонтит",
    leadMagnet: "Бесплатная консультация эндодонтиста по снимку",
    baseUrgency: 20,
  },
  {
    slug: "hirurgiya",
    name: "Хирургия и удаление",
    short: "Удаление зубов, в том числе восьмёрок, костная пластика",
    leadMagnet: "Бесплатная консультация хирурга",
    baseUrgency: 20,
  },
  {
    slug: "implantaciya",
    name: "Имплантация",
    short: "Восстановление зубов имплантами, all-on-4 и all-on-6",
    leadMagnet: "Бесплатный подбор системы импланта и расчёт стоимости",
    baseUrgency: 5,
  },
  {
    slug: "protezirovanie",
    name: "Протезирование",
    short: "Коронки, виниры, съёмные и несъёмные протезы",
    leadMagnet: "Бесплатная примерка цифрового макета улыбки",
    baseUrgency: 5,
  },
  {
    slug: "ortodontiya",
    name: "Ортодонтия",
    short: "Брекеты, элайнеры, исправление прикуса",
    leadMagnet: "Бесплатная консультация ортодонта и расчёт срока лечения",
    baseUrgency: 0,
  },
  {
    slug: "parodontologiya",
    name: "Лечение дёсен",
    short: "Пародонтит, кровоточивость и подвижность зубов",
    leadMagnet: "Бесплатная диагностика состояния дёсен",
    baseUrgency: 10,
  },
  {
    slug: "gigiena",
    name: "Гигиена и отбеливание",
    short: "Профессиональная чистка, Air Flow, отбеливание",
    leadMagnet: "Бесплатный осмотр перед чисткой",
    baseUrgency: 0,
  },
  {
    slug: "detskaya",
    name: "Детская стоматология",
    short: "Лечение без страха, герметизация фиссур, детский ортодонт",
    leadMagnet: "Бесплатное знакомство с врачом и адаптационный приём",
    baseUrgency: 10,
  },
] as const;

const SERVICE_BY_SLUG = new Map(DENTAL_SERVICES.map(s => [s.slug, s]));

export const getService = (slug: string): DentalService | undefined =>
  SERVICE_BY_SLUG.get(slug as DentalServiceSlug);

export const DENTAL_SERVICE_SLUGS = DENTAL_SERVICES.map(
  s => s.slug
) as DentalServiceSlug[];

// ============ КАНАЛЫ СВЯЗИ ============

/**
 * Куда человек сам разрешил ему написать. Пустой канал означает «только
 * телефон» — молча подставлять мессенджер по номеру нельзя.
 */
export type MessengerType = "telegram" | "max" | "vk" | "whatsapp" | "none";

export const MESSENGER_LABELS: Record<MessengerType, string> = {
  telegram: "Telegram",
  max: "Max",
  vk: "ВКонтакте",
  whatsapp: "WhatsApp",
  none: "Только звонок",
};

// ============ РЕЙТИНГ СРОЧНОСТИ ============

/** Когда человек готов прийти — главный признак горячего лида. */
export type ReadinessWindow =
  | "today"
  | "this_week"
  | "this_month"
  | "researching";

/** Симптомы из анкеты. Влияют на приоритет очереди, не на медицинский вывод. */
export type Symptom =
  | "acute_pain"
  | "swelling"
  | "bleeding"
  | "trauma"
  | "lost_filling"
  | "aesthetic"
  | "none";

export type UrgencyTier = "critical" | "high" | "medium" | "low";

export type UrgencyInput = {
  serviceSlug: string;
  painLevel: number; // 0..10 по анкете
  symptoms: Symptom[];
  readiness: ReadinessWindow;
};

export type UrgencyResult = {
  score: number; // 0..100
  tier: UrgencyTier;
  /** Человекочитаемая расшифровка: почему лид попал в этот приоритет. */
  reasons: string[];
};

const READINESS_WEIGHT: Record<ReadinessWindow, number> = {
  today: 35,
  this_week: 22,
  this_month: 10,
  researching: 0,
};

const READINESS_LABEL: Record<ReadinessWindow, string> = {
  today: "готов прийти сегодня",
  this_week: "готов прийти на этой неделе",
  this_month: "планирует в течение месяца",
  researching: "пока выбирает клинику",
};

const SYMPTOM_WEIGHT: Record<Symptom, number> = {
  acute_pain: 20,
  swelling: 18,
  trauma: 15,
  bleeding: 8,
  lost_filling: 6,
  aesthetic: 0,
  none: 0,
};

const SYMPTOM_LABEL: Record<Symptom, string> = {
  acute_pain: "острая боль",
  swelling: "отёк или флюс",
  trauma: "травма зуба",
  bleeding: "кровоточивость дёсен",
  lost_filling: "выпала пломба или коронка",
  aesthetic: "эстетический запрос",
  none: "жалоб нет",
};

export const symptomLabel = (s: Symptom): string => SYMPTOM_LABEL[s] ?? s;
export const readinessLabel = (r: ReadinessWindow): string =>
  READINESS_LABEL[r] ?? r;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Считает приоритет заявки в очереди на связь. Формула открытая и линейная:
 * менеджер должен понимать, почему лид наверху списка, — иначе он ей не верит
 * и звонит по своему порядку.
 */
export function scoreUrgency(input: UrgencyInput): UrgencyResult {
  const reasons: string[] = [];
  const service = getService(input.serviceSlug);

  let score = service?.baseUrgency ?? 0;
  if (service && service.baseUrgency > 0) {
    reasons.push(`направление «${service.name}»`);
  }

  const pain = clamp(Math.round(input.painLevel), 0, 10);
  if (pain > 0) {
    score += pain * 3;
    reasons.push(`боль ${pain} из 10`);
  }

  // Симптомы не суммируются бесконечно: два тяжёлых уже дают потолок,
  // иначе длинная анкета механически перевешивает реальную остроту.
  const uniqueSymptoms = input.symptoms.filter(
    (s, i) => input.symptoms.indexOf(s) === i
  );
  const symptomPoints = uniqueSymptoms
    .map(s => SYMPTOM_WEIGHT[s] ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 2);
  score += symptomPoints.reduce((a, b) => a + b, 0);
  for (const s of uniqueSymptoms) {
    if ((SYMPTOM_WEIGHT[s] ?? 0) > 0) reasons.push(SYMPTOM_LABEL[s]);
  }

  score += READINESS_WEIGHT[input.readiness] ?? 0;
  reasons.push(READINESS_LABEL[input.readiness] ?? input.readiness);

  score = clamp(Math.round(score), 0, 100);

  const tier: UrgencyTier =
    score >= 70
      ? "critical"
      : score >= 45
        ? "high"
        : score >= 20
          ? "medium"
          : "low";

  return { score, tier, reasons };
}

export const URGENCY_LABELS: Record<UrgencyTier, string> = {
  critical: "Критично — связаться в течение 15 минут",
  high: "Высокий — связаться в течение часа",
  medium: "Средний — связаться сегодня",
  low: "Низкий — связаться в течение суток",
};

export const URGENCY_SHORT: Record<UrgencyTier, string> = {
  critical: "Критично",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

/** Целевое время первого касания в минутах — основа SLA по договору с клиникой. */
export const URGENCY_SLA_MINUTES: Record<UrgencyTier, number> = {
  critical: 15,
  high: 60,
  medium: 480,
  low: 1440,
};

// ============ ПАРТНЁРСКИЕ КЛИНИКИ ============

/**
 * Модель агрегатора: заявку оставляет пациент, а покупает её клиника-партнёр.
 * Маршрутизация решает, какому партнёру уходит конкретная заявка.
 */
export type PartnerLike = {
  id: number;
  name: string;
  city: string;
  /** Направления, которые партнёр готов принимать; пустой список — все. */
  services?: string[] | null;
  status: string;
  /** Сколько заявок партнёр готов принять в сутки; 0 — без ограничения. */
  dailyCap?: number | null;
  /** Сколько заявок уже ушло ему сегодня. */
  todayCount?: number;
};

export const normalizeCity = (city: string): string =>
  city.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");

/** Партнёр подходит заявке: активен, тот же город, берёт это направление. */
export function partnerFits(
  partner: PartnerLike,
  lead: { city: string; serviceSlug: string }
): boolean {
  if (partner.status !== "active") return false;
  if (normalizeCity(partner.city) !== normalizeCity(lead.city)) return false;
  const services = partner.services;
  if (
    services &&
    services.length > 0 &&
    services.indexOf(lead.serviceSlug) === -1
  ) {
    return false;
  }
  const cap = partner.dailyCap ?? 0;
  if (cap > 0 && (partner.todayCount ?? 0) >= cap) return false;
  return true;
}

/**
 * Выбирает партнёра под заявку.
 *
 * Между подходящими распределяем по наименьшей сегодняшней загрузке: если
 * отдавать всё первому в списке, он упрётся в свой лимит к обеду, а остальные
 * партнёры останутся без заявок и уйдут. При равенстве берём меньший id, чтобы
 * распределение было воспроизводимым и его можно было объяснить партнёру.
 */
export function pickPartner(
  partners: PartnerLike[],
  lead: { city: string; serviceSlug: string }
): PartnerLike | null {
  const fitting = partners.filter(p => partnerFits(p, lead));
  if (fitting.length === 0) return null;
  return fitting.reduce((best, candidate) => {
    const bestLoad = best.todayCount ?? 0;
    const load = candidate.todayCount ?? 0;
    if (load !== bestLoad) return load < bestLoad ? candidate : best;
    return candidate.id < best.id ? candidate : best;
  });
}

export const PARTNER_STATUS_LABELS: Record<string, string> = {
  active: "Принимает заявки",
  paused: "На паузе",
  archived: "В архиве",
};

// ============ КОНТРОЛЬ SLA ============

/** Статусы, при которых часы SLA уже остановлены — с человеком связались. */
const SLA_CLOSED_STATUSES = [
  "contacted",
  "scheduled",
  "visited",
  "rejected",
  "spam",
];

export type SlaState = {
  /** Крайний срок первого касания. */
  dueAt: Date;
  /** Минуты до срока; отрицательные — просрочка. */
  minutesLeft: number;
  breached: boolean;
  /** Часы ещё идут: с пациентом не связались и заявку не закрыли. */
  running: boolean;
};

/**
 * Считает, сколько осталось до обещанного времени первого касания.
 *
 * Смысл в том, чтобы просроченная заявка была видна менеджеру сама, а не
 * всплывала на разборе в конце месяца: по договору с клиникой платят за
 * приход, а приход теряется именно на медленном первом звонке.
 */
export function getSlaState(
  lead: {
    urgencyTier: string;
    status: string;
    createdAt: Date | string;
    firstTouchAt?: Date | string | null;
  },
  now: Date = new Date()
): SlaState {
  const created =
    lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
  const budget =
    URGENCY_SLA_MINUTES[lead.urgencyTier as UrgencyTier] ??
    URGENCY_SLA_MINUTES.low;
  const dueAt = new Date(created.getTime() + budget * 60_000);

  const touched = Boolean(lead.firstTouchAt);
  const closed = SLA_CLOSED_STATUSES.indexOf(lead.status) !== -1;
  const running = !touched && !closed;

  // У закрытой заявки счётчик замирает на моменте касания, а не бежит дальше.
  const reference = touched
    ? lead.firstTouchAt instanceof Date
      ? lead.firstTouchAt
      : new Date(lead.firstTouchAt as string)
    : now;

  const minutesLeft = Math.round(
    (dueAt.getTime() - reference.getTime()) / 60_000
  );

  return {
    dueAt,
    minutesLeft,
    breached: minutesLeft < 0 && (running || touched),
    running,
  };
}

/** Короткая подпись для кабинета: «просрочено на 12 мин» / «осталось 40 мин». */
export function formatSlaLabel(state: SlaState): string {
  const abs = Math.abs(state.minutesLeft);
  const human = abs < 60 ? `${abs} мин` : `${Math.round(abs / 60)} ч`;
  if (state.breached) return `просрочено на ${human}`;
  if (!state.running) return "в срок";
  return `осталось ${human}`;
}

// ============ СТАТУСЫ ВОРОНКИ ============

export type LeadStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "visited"
  | "no_answer"
  | "rejected"
  | "spam";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новый",
  contacted: "Взят в работу",
  scheduled: "Записан",
  visited: "Дошёл до клиники",
  no_answer: "Не дозвонились",
  rejected: "Отказ",
  spam: "Спам",
};

/** Статусы, которые закрывают заявку по договору — приход в клинику. */
export const BILLABLE_STATUSES: readonly LeadStatus[] = ["visited"];

// ============ ПЕРВОЕ КАСАНИЕ В МЕССЕНДЖЕРЕ ============

export type FirstTouchInput = {
  name: string;
  serviceSlug: string;
  tier: UrgencyTier;
  messenger: MessengerType;
  managerName?: string;
};

/**
 * Готовит текст первого сообщения. Это шаблон для менеджера, а не автоматическая
 * рассылка: отправлять его можно только по заявке с согласием на коммуникации,
 * и вызывающий код обязан это проверить (см. canContact).
 */
export function buildFirstTouchMessage(input: FirstTouchInput): string {
  const service = getService(input.serviceSlug);
  const serviceName = service?.name.toLowerCase() ?? "стоматологии";
  const magnet = service?.leadMagnet ?? "бесплатная консультация";
  const manager = input.managerName?.trim() || "Администратор";
  const name = input.name.trim() || "Здравствуйте";

  const opener =
    input.tier === "critical"
      ? `${name}, здравствуйте! Вижу вашу заявку с острой болью — можем принять сегодня, у нас есть окно.`
      : input.tier === "high"
        ? `${name}, здравствуйте! Получили вашу заявку по направлению «${serviceName}», подберём удобное время на этой неделе.`
        : `${name}, здравствуйте! Спасибо за заявку в DAREMA по направлению «${serviceName}».`;

  return [
    opener,
    ``,
    `Меня зовут ${manager}, я администратор сети клиник DAREMA в Санкт-Петербурге.`,
    ``,
    `По вашей заявке действует: ${magnet}.`,
    ``,
    input.tier === "critical"
      ? `Скажите, вам удобнее подъехать в ближайшие часы или ближе к вечеру? Подскажу ближайшую к вам клинику.`
      : `Подскажите, в какие дни и часы вам удобно — подберу врача и запишу на приём.`,
    ``,
    `Если заявка больше не актуальна, просто напишите «не актуально», и я вас больше не побеспокою.`,
  ].join("\n");
}

/**
 * Единственные ворота к отправке сообщения. Нет согласия на коммуникации,
 * отзыв согласия или отсутствие канала — писать нельзя.
 */
export function canContact(lead: {
  consentMarketing: boolean;
  optedOut?: boolean;
  messengerType?: string | null;
  messengerHandle?: string | null;
}): boolean {
  if (!lead.consentMarketing) return false;
  if (lead.optedOut) return false;
  if (!lead.messengerType || lead.messengerType === "none") return false;
  return Boolean(lead.messengerHandle && lead.messengerHandle.trim());
}
