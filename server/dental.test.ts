import { describe, expect, it, vi } from "vitest";
import { inflateRawSync } from "node:zlib";
import {
  DENTAL_SERVICES,
  buildFirstTouchMessage,
  canContact,
  formatSlaLabel,
  getService,
  getSlaState,
  scoreUrgency,
} from "@shared/dental";
import { buildXlsx, columnLetter, safeSheetName } from "./lib/xlsx";
import {
  buildDailyStats,
  buildLeadWorkbook,
  dayKey,
  groupByDay,
  type ExportLead,
} from "./lib/leadExport";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(
  overrides: Partial<AuthenticatedUser> | null = {}
): TrpcContext {
  const base = {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
  if (overrides === null) return { ...base, user: null };
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    passwordHash: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return { ...base, user };
}

/** Читает наш zip: последовательные локальные заголовки, без data descriptor. */
function unzip(buffer: Buffer): Map<string, string> {
  const files = new Map<string, string>();
  let offset = 0;
  while (
    offset + 4 <= buffer.length &&
    buffer.readUInt32LE(offset) === 0x04034b50
  ) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 30, offset + 30 + nameLen)
      .toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    files.set(
      name,
      inflateRawSync(
        buffer.subarray(dataStart, dataStart + compressedSize)
      ).toString("utf8")
    );
    offset = dataStart + compressedSize;
  }
  return files;
}

const validLead = {
  name: "Иван",
  phone: "89001234567",
  serviceSlug: "neotlozhnaya",
  painLevel: 9,
  symptoms: ["acute_pain"] as const,
  readiness: "today" as const,
  consentPd: true as const,
  consentMarketing: true,
};

describe("рейтинг срочности", () => {
  it("острая боль с готовностью прийти сегодня даёт критичный приоритет", () => {
    const result = scoreUrgency({
      serviceSlug: "neotlozhnaya",
      painLevel: 9,
      symptoms: ["acute_pain", "swelling"],
      readiness: "today",
    });
    expect(result.tier).toBe("critical");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons).toContain("острая боль");
    expect(result.reasons).toContain("готов прийти сегодня");
  });

  it("плановая гигиена без жалоб остаётся в низком приоритете", () => {
    const result = scoreUrgency({
      serviceSlug: "gigiena",
      painLevel: 0,
      symptoms: ["none"],
      readiness: "researching",
    });
    expect(result.tier).toBe("low");
    expect(result.score).toBe(0);
  });

  it("длинный список симптомов не перевешивает реальную остроту", () => {
    const many = scoreUrgency({
      serviceSlug: "terapiya",
      painLevel: 3,
      symptoms: ["bleeding", "lost_filling", "aesthetic", "none"],
      readiness: "this_month",
    });
    const two = scoreUrgency({
      serviceSlug: "terapiya",
      painLevel: 3,
      symptoms: ["bleeding", "lost_filling"],
      readiness: "this_month",
    });
    // Учитываются два самых тяжёлых симптома, поэтому оценки совпадают.
    expect(many.score).toBe(two.score);
  });

  it("повторы симптомов не удваивают балл", () => {
    const once = scoreUrgency({
      serviceSlug: "terapiya",
      painLevel: 2,
      symptoms: ["acute_pain"],
      readiness: "this_week",
    });
    const twice = scoreUrgency({
      serviceSlug: "terapiya",
      painLevel: 2,
      symptoms: ["acute_pain", "acute_pain"],
      readiness: "this_week",
    });
    expect(twice.score).toBe(once.score);
  });

  it("балл не выходит за 0..100 при экстремальных входных данных", () => {
    const result = scoreUrgency({
      serviceSlug: "neotlozhnaya",
      painLevel: 99,
      symptoms: ["acute_pain", "swelling", "trauma", "bleeding"],
      readiness: "today",
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("у каждой услуги каталога есть лид-магнит", () => {
    for (const service of DENTAL_SERVICES) {
      expect(service.leadMagnet.length).toBeGreaterThan(5);
      expect(getService(service.slug)?.name).toBe(service.name);
    }
  });
});

describe("право на переписку", () => {
  const base = {
    consentMarketing: true,
    optedOut: false,
    messengerType: "telegram",
    messengerHandle: "@ivan",
  };

  it("разрешает писать при согласии и указанном канале", () => {
    expect(canContact(base)).toBe(true);
  });

  it("запрещает без согласия на коммуникации", () => {
    expect(canContact({ ...base, consentMarketing: false })).toBe(false);
  });

  it("запрещает после отзыва согласия", () => {
    expect(canContact({ ...base, optedOut: true })).toBe(false);
  });

  it("запрещает, если человек оставил только телефон", () => {
    expect(
      canContact({ ...base, messengerType: "none", messengerHandle: null })
    ).toBe(false);
    expect(canContact({ ...base, messengerHandle: "   " })).toBe(false);
  });
});

describe("контроль SLA", () => {
  const created = new Date("2026-08-21T10:00:00Z");

  it("считает остаток до срока первого касания", () => {
    const state = getSlaState(
      { urgencyTier: "critical", status: "new", createdAt: created },
      new Date("2026-08-21T10:05:00Z")
    );
    expect(state.minutesLeft).toBe(10);
    expect(state.breached).toBe(false);
    expect(state.running).toBe(true);
    expect(formatSlaLabel(state)).toBe("осталось 10 мин");
  });

  it("помечает просрочку по критичной заявке через 15 минут", () => {
    const state = getSlaState(
      { urgencyTier: "critical", status: "new", createdAt: created },
      new Date("2026-08-21T10:27:00Z")
    );
    expect(state.breached).toBe(true);
    expect(formatSlaLabel(state)).toBe("просрочено на 12 мин");
  });

  it("останавливает часы в момент касания, а не тикает дальше", () => {
    const lead = {
      urgencyTier: "critical",
      status: "contacted",
      createdAt: created,
      firstTouchAt: new Date("2026-08-21T10:05:00Z"),
    };
    const soon = getSlaState(lead, new Date("2026-08-21T10:06:00Z"));
    const muchLater = getSlaState(lead, new Date("2026-08-25T10:00:00Z"));
    expect(soon.minutesLeft).toBe(muchLater.minutesLeft);
    expect(muchLater.breached).toBe(false);
    expect(formatSlaLabel(muchLater)).toBe("в срок");
  });

  it("фиксирует, что связались с опозданием", () => {
    const state = getSlaState({
      urgencyTier: "critical",
      status: "scheduled",
      createdAt: created,
      firstTouchAt: new Date("2026-08-21T11:00:00Z"),
    });
    expect(state.breached).toBe(true);
    expect(state.running).toBe(false);
  });

  it("у плановой заявки срок сутки, а не 15 минут", () => {
    const state = getSlaState(
      { urgencyTier: "low", status: "new", createdAt: created },
      new Date("2026-08-21T22:00:00Z")
    );
    expect(state.breached).toBe(false);
    expect(state.minutesLeft).toBe(720);
  });

  it("закрытая без касания заявка не считается просроченной", () => {
    const state = getSlaState(
      { urgencyTier: "critical", status: "spam", createdAt: created },
      new Date("2026-08-25T10:00:00Z")
    );
    expect(state.breached).toBe(false);
    expect(state.running).toBe(false);
  });
});

describe("первое сообщение", () => {
  it("содержит имя, лид-магнит и способ отписаться", () => {
    const text = buildFirstTouchMessage({
      name: "Иван",
      serviceSlug: "implantaciya",
      tier: "high",
      messenger: "telegram",
      managerName: "Мария",
    });
    expect(text).toContain("Иван");
    expect(text).toContain("Мария");
    expect(text).toContain(getService("implantaciya")!.leadMagnet);
    expect(text).toContain("не актуально");
  });

  it("для критичной заявки предлагает приём сегодня", () => {
    const text = buildFirstTouchMessage({
      name: "Пётр",
      serviceSlug: "neotlozhnaya",
      tier: "critical",
      messenger: "max",
    });
    expect(text).toContain("сегодня");
  });
});

describe("генератор xlsx", () => {
  it("буквы колонок считаются за пределами Z", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(27)).toBe("AB");
  });

  it("имя вкладки очищается от запрещённых символов и обрезается", () => {
    expect(safeSheetName("отчёт/за:2026", "x")).toBe("отчёт-за-2026");
    expect(safeSheetName("", "Лист1")).toBe("Лист1");
    expect(safeSheetName("я".repeat(50), "x").length).toBe(31);
  });

  it("собирает валидный zip с нужными частями и содержимым листа", () => {
    const buffer = buildXlsx([
      {
        name: "Первый",
        columns: [{ header: "Имя" }, { header: "Балл" }],
        rows: [["Иван", 42]],
      },
    ]);
    expect(buffer.subarray(0, 4).toString("hex")).toBe("504b0304"); // сигнатура zip
    const text = buffer.toString("latin1");
    expect(text).toContain("[Content_Types].xml");
    expect(text).toContain("xl/worksheets/sheet1.xml");

    // Распаковываем содержимое и убеждаемся, что deflate обратим, а лист цел.
    const files = unzip(buffer);
    expect(files.get("[Content_Types].xml")).toContain("spreadsheetml");
    const sheet = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("Имя");
    expect(sheet).toContain("<v>42</v>");
  });

  it("экранирует спецсимволы XML в значениях", () => {
    const buffer = buildXlsx([
      {
        name: "Лист",
        columns: [{ header: "Комментарий" }],
        rows: [['Боль <5> & "сильная"']],
      },
    ]);
    const sheet = unzip(buffer).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("Боль &lt;5&gt; &amp; &quot;сильная&quot;");
    expect(sheet).not.toContain("Боль <5>");
  });

  it("разводит одинаковые имена вкладок", () => {
    const buffer = buildXlsx([
      { name: "День", columns: [{ header: "A" }], rows: [] },
      { name: "День", columns: [{ header: "A" }], rows: [] },
    ]);
    const workbook = unzip(buffer).get("xl/workbook.xml")!;
    expect(workbook).toContain("День (2)");
  });

  it("отказывается собирать книгу без листов", () => {
    expect(() => buildXlsx([])).toThrow();
  });
});

const makeLead = (over: Partial<ExportLead> = {}): ExportLead => ({
  publicId: "DL-TEST",
  name: "Иван",
  phone: "+7 (900) 123-45-67",
  email: "i@example.com",
  messengerType: "telegram",
  messengerHandle: "@ivan",
  city: "Санкт-Петербург",
  serviceSlug: "neotlozhnaya",
  comment: null,
  painLevel: 8,
  symptoms: ["acute_pain"],
  readiness: "today",
  urgencyScore: 80,
  urgencyTier: "critical",
  urgencyReasons: ["острая боль"],
  sourceChannel: "vk_ads",
  utmSource: "vk",
  utmMedium: "cpc",
  utmCampaign: "spb",
  utmContent: null,
  utmTerm: null,
  landingPath: "/dental",
  consentPd: true,
  consentMarketing: true,
  optedOut: false,
  status: "new",
  firstTouchAt: null,
  visitAt: null,
  createdAt: new Date("2026-08-21T09:00:00Z"),
  ...over,
});

describe("выгрузка лидов", () => {
  it("отчётные сутки считаются по московскому времени", () => {
    // 22:30 UTC 20 августа — это уже 21 августа в Петербурге.
    expect(dayKey(new Date("2026-08-20T22:30:00Z"))).toBe("2026-08-21");
    expect(dayKey(null)).toBe("");
  });

  it("группирует по дням, свежие сверху", () => {
    const groups = groupByDay([
      makeLead({ createdAt: new Date("2026-08-19T09:00:00Z") }),
      makeLead({ createdAt: new Date("2026-08-21T09:00:00Z") }),
      makeLead({ createdAt: new Date("2026-08-21T10:00:00Z") }),
    ]);
    expect(groups.map(g => g.day)).toEqual(["2026-08-21", "2026-08-19"]);
    expect(groups[0].leads).toHaveLength(2);
  });

  it("считает дневную сводку и конверсию в приход", () => {
    const stats = buildDailyStats([
      makeLead({ status: "visited" }),
      makeLead({ status: "scheduled" }),
      makeLead({ status: "new", urgencyTier: "low" }),
      makeLead({ status: "new", urgencyTier: "high" }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      total: 4,
      critical: 2,
      high: 1,
      low: 1,
      scheduled: 2,
      visited: 1,
      conversion: 25,
    });
  });

  it("книга содержит отчёт, общий лист и вкладку на каждый день", () => {
    const { buffer, totalLeads, omittedDays } = buildLeadWorkbook([
      makeLead({ createdAt: new Date("2026-08-21T09:00:00Z") }),
      makeLead({ createdAt: new Date("2026-08-20T09:00:00Z") }),
    ]);
    const files = unzip(buffer);
    expect(files.get("xl/worksheets/sheet2.xml")).toContain(
      "SLA первого касания"
    );
    const workbook = files.get("xl/workbook.xml")!;
    expect(workbook).toContain("Отчёт по дням");
    expect(workbook).toContain("Все лиды");
    expect(workbook).toContain("2026-08-21");
    expect(workbook).toContain("2026-08-20");
    expect(totalLeads).toBe(2);
    expect(omittedDays).toEqual([]);
  });

  it("сообщает о днях, не поместившихся в лимит вкладок", () => {
    const leads = Array.from({ length: 70 }, (_, i) =>
      makeLead({ createdAt: new Date(2026, 0, 1 + i, 12, 0, 0) })
    );
    const { omittedDays } = buildLeadWorkbook(leads);
    expect(omittedDays.length).toBe(10);
  });
});

describe("роутер заявок", () => {
  it("не принимает заявку без согласия на обработку данных", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.dental.submitLead({
        ...validLead,
        consentPd: false as unknown as true,
      })
    ).rejects.toThrow();
  });

  it("не принимает заявку с мусорным телефоном", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.dental.submitLead({ ...validLead, phone: "позвоните мне" })
    ).rejects.toThrow();
  });

  it("не отвечает «принято», если заявку не удалось сохранить", async () => {
    // База в тестовом окружении недоступна, вставка возвращает undefined.
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.dental.submitLead(validLead)).rejects.toThrow(
      /Позвоните/
    );
  });

  it("отдаёт каталог услуг всем", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const services = await caller.dental.services();
    expect(services.length).toBe(DENTAL_SERVICES.length);
  });

  it("закрывает список заявок от обычного пользователя", async () => {
    const caller = appRouter.createCaller(createContext({ role: "user" }));
    await expect(caller.dental.list({ limit: 10, offset: 0 })).rejects.toThrow(
      /администратор/i
    );
  });

  it("закрывает список заявок от неавторизованного гостя", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.dental.list({ limit: 10, offset: 0 })
    ).rejects.toThrow();
  });

  it("пускает администратора к списку заявок", async () => {
    const caller = appRouter.createCaller(createContext({ role: "admin" }));
    const result = await caller.dental.list({ limit: 10, offset: 0 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("закрывает отчёт по кампаниям от обычного пользователя", async () => {
    const caller = appRouter.createCaller(createContext({ role: "user" }));
    await expect(caller.dental.campaignStats({ days: 30 })).rejects.toThrow(
      /администратор/i
    );
  });

  it("отдаёт администратору счётчик просроченных заявок", async () => {
    const caller = appRouter.createCaller(createContext({ role: "admin" }));
    await expect(caller.dental.overdueCount()).resolves.toEqual({ total: 0 });
  });

  it("принимает фильтр по просроченным заявкам", async () => {
    const caller = appRouter.createCaller(
      createContext({ role: "owner" as any })
    );
    const result = await caller.dental.list({
      overdueOnly: true,
      limit: 10,
      offset: 0,
    });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("выгружает книгу Excel даже на пустой базе", async () => {
    const caller = appRouter.createCaller(createContext({ role: "admin" }));
    const result = await caller.dental.exportXlsx({});
    expect(result.filename).toMatch(/^darema-leads-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(
      Buffer.from(result.base64, "base64").subarray(0, 4).toString("hex")
    ).toBe("504b0304");
    expect(result.totalLeads).toBe(0);
  });
});
