/**
 * Лид-модуль стоматологии DAREMA.
 *
 * Единственный вход для заявки — публичная форма записи, которую заполняет сам
 * человек. Без галочки согласия на обработку ПД заявка не принимается, без
 * галочки согласия на коммуникации нельзя сформировать сообщение в мессенджер.
 * Импорта контактов извне здесь нет намеренно.
 */

import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  BILLABLE_STATUSES,
  DENTAL_SERVICES,
  DENTAL_SERVICE_SLUGS,
  URGENCY_SLA_MINUTES,
  buildFirstTouchMessage,
  canContact,
  getService,
  getSlaState,
  type UrgencyTier,
} from "@shared/dental";
import { regionOf } from "@shared/cities";
import * as db from "../db";
import { IntakeError, intakeLead, normalizePhone } from "./../lib/leadService";
import { generateApiKey } from "../leadIntake";
import { LEAD_SOURCE_TYPES } from "@shared/leadSources";
import { buildLeadWorkbook, type ExportLead } from "../lib/leadExport";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

/** Заявки видят администраторы платформы и владелец. */
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Доступ к заявкам только у администраторов",
    });
  }
  return next({ ctx });
});

const serviceSlugSchema = z.enum(DENTAL_SERVICE_SLUGS as [string, ...string[]]);
const symptomSchema = z.enum([
  "acute_pain",
  "swelling",
  "bleeding",
  "trauma",
  "lost_filling",
  "aesthetic",
  "none",
]);
const readinessSchema = z.enum([
  "today",
  "this_week",
  "this_month",
  "researching",
]);
const messengerSchema = z.enum(["telegram", "max", "vk", "whatsapp", "none"]);
const statusSchema = z.enum([
  "new",
  "contacted",
  "scheduled",
  "visited",
  "no_answer",
  "rejected",
  "spam",
]);
const tierSchema = z.enum(["critical", "high", "medium", "low"]);

/** Российский номер в любом привычном написании. */
const phoneSchema = z
  .string()
  .trim()
  .min(10, "Укажите телефон")
  .max(32)
  .regex(
    /^[\d\s()+\-]+$/,
    "Телефон может содержать только цифры и знаки + ( ) -"
  );

/**
 * Защита от случайного дубля: одна и та же форма, отправленная дважды подряд,
 * не должна создавать две заявки. Память процесса — этого хватает одному
 * инстансу; при горизонтальном масштабировании нужен общий Redis.
 */
const recentSubmissions = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

function isDuplicate(key: string, now: number): boolean {
  for (const [k, ts] of Array.from(recentSubmissions.entries())) {
    if (now - ts > DEDUPE_WINDOW_MS) recentSubmissions.delete(k);
  }
  const seen = recentSubmissions.get(key);
  recentSubmissions.set(key, now);
  return seen !== undefined && now - seen < DEDUPE_WINDOW_MS;
}

/** Латинский slug для адреса партнёра: кириллица транслитерируется. */
const TRANSLIT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .split("")
    .map(ch => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "clinic";

const toExportLead = (lead: Record<string, any>): ExportLead =>
  lead as ExportLead;

export const dentalRouter = router({
  /** Каталог направлений — для формы записи и лендинга. */
  services: publicProcedure.query(() => DENTAL_SERVICES),

  /** Города, где есть клиника-партнёр, принимающая заявки. */
  cities: publicProcedure.query(async () => db.getDentalCities()),

  /** Приём заявки с формы записи. */
  submitLead: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Как к вам обращаться?").max(255),
        phone: phoneSchema,
        email: z
          .string()
          .trim()
          .email("Проверьте адрес почты")
          .max(320)
          .optional()
          .or(z.literal("")),
        messengerType: messengerSchema.default("none"),
        messengerHandle: z.string().trim().max(255).optional(),
        city: z.string().trim().max(128).default("Санкт-Петербург"),
        region: z.string().trim().max(128).optional(),
        serviceSlug: serviceSlugSchema,
        comment: z.string().trim().max(2000).optional(),
        painLevel: z.number().int().min(0).max(10).default(0),
        symptoms: z.array(symptomSchema).max(7).default([]),
        readiness: readinessSchema.default("researching"),

        // «Где поймали» — метки кампании со страницы, а не данные о человеке
        sourceChannel: z.string().trim().max(64).optional(),
        utmSource: z.string().trim().max(128).optional(),
        utmMedium: z.string().trim().max(128).optional(),
        utmCampaign: z.string().trim().max(255).optional(),
        utmContent: z.string().trim().max(255).optional(),
        utmTerm: z.string().trim().max(255).optional(),
        landingPath: z.string().trim().max(512).optional(),

        // Согласия. Без первого заявка не принимается вовсе.
        consentPd: z.literal(true, {
          message: "Без согласия на обработку данных заявку принять нельзя",
        }),
        consentMarketing: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const service = getService(input.serviceSlug);
      if (!service) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Неизвестное направление",
        });
      }

      const phone = normalizePhone(input.phone);
      const dedupeKey = `${phone}:${input.serviceSlug}`;
      if (isDuplicate(dedupeKey, Date.now())) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Заявка уже принята, администратор свяжется с вами",
        });
      }

      try {
        const result = await intakeLead({
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          messengerType: input.messengerType,
          messengerHandle: input.messengerHandle ?? null,
          city: input.city,
          region: input.region ?? regionOf(input.city) ?? null,
          serviceSlug: input.serviceSlug,
          comment: input.comment ?? null,
          painLevel: input.painLevel,
          symptoms: input.symptoms,
          readiness: input.readiness,
          sourceChannel: input.sourceChannel ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent: input.utmContent ?? null,
          utmTerm: input.utmTerm ?? null,
          landingPath: input.landingPath ?? null,
          consentMarketing: input.consentMarketing,
        });

        return {
          publicId: result.publicId,
          urgency: { score: result.urgencyScore, tier: result.urgencyTier },
          slaMinutes: result.slaMinutes,
          leadMagnet: result.leadMagnet,
          clinic: result.clinic
            ? { name: result.clinic.name, city: result.clinic.city }
            : null,
        };
      } catch (error) {
        // Заявка не записалась — снимаем защиту от дубля, чтобы человек мог
        // отправить форму повторно, а не упёрся в «уже принято».
        recentSubmissions.delete(dedupeKey);
        if (error instanceof IntakeError) {
          throw new TRPCError({
            code:
              error.code === "server_error"
                ? "INTERNAL_SERVER_ERROR"
                : "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /** Отзыв согласия по номеру заявки — обязателен по 152-ФЗ. */
  optOut: publicProcedure
    .input(z.object({ publicId: z.string().trim().min(3).max(32) }))
    .mutation(async ({ input }) => {
      const lead = await db.getDentalLeadByPublicId(input.publicId);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });
      await db.updateDentalLead(lead.id, {
        optedOut: true,
        optedOutAt: new Date(),
        consentMarketing: false,
      });
      await db.addDentalLeadEvent({
        leadId: lead.id,
        type: "opt_out",
        body: "Пациент отозвал согласие на коммуникации",
      });
      return { success: true };
    }),

  // ============ КАБИНЕТ ============

  list: staffProcedure
    .input(
      z
        .object({
          status: statusSchema.optional(),
          urgencyTier: tierSchema.optional(),
          serviceSlug: serviceSlugSchema.optional(),
          from: z.date().optional(),
          to: z.date().optional(),
          search: z.string().trim().max(255).optional(),
          overdueOnly: z.boolean().optional(),
          partnerId: z.number().int().optional(),
          sourceId: z.number().int().optional(),
          unrouted: z.boolean().optional(),
          city: z.string().trim().max(128).optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .default({ limit: 50, offset: 0 })
    )
    .query(async ({ input }) => {
      const { items, total } = await db.getDentalLeads(input);
      const now = new Date();
      return {
        total,
        items: items.map(lead => {
          const sla = getSlaState(lead, now);
          return {
            ...lead,
            slaMinutes: URGENCY_SLA_MINUTES[lead.urgencyTier as UrgencyTier],
            slaMinutesLeft: sla.minutesLeft,
            slaBreached: sla.breached,
            slaRunning: sla.running,
            contactable: canContact(lead),
          };
        }),
      };
    }),

  byId: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const lead = await db.getDentalLeadById(input.id);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });
      const events = await db.getDentalLeadEvents(input.id);
      return { lead, events, contactable: canContact(lead) };
    }),

  dailyStats: staffProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .default({ days: 30 })
    )
    .query(async ({ input }) => db.getDentalDailyStats(input.days)),

  campaignStats: staffProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .default({ days: 30 })
    )
    .query(async ({ input }) => db.getDentalCampaignStats(input.days)),

  /** Сколько заявок уже просрочено по SLA — счётчик для шапки кабинета. */
  overdueCount: staffProcedure.query(async () => {
    const { total } = await db.getDentalLeads({
      overdueOnly: true,
      limit: 1,
      offset: 0,
    });
    return { total };
  }),

  setStatus: staffProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: statusSchema,
        note: z.string().trim().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await db.getDentalLeadById(input.id);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });

      const patch: Record<string, unknown> = { status: input.status };
      if (BILLABLE_STATUSES.indexOf(input.status) !== -1 && !lead.visitAt) {
        patch.visitAt = new Date();
      }
      await db.updateDentalLead(lead.id, patch);
      await db.addDentalLeadEvent({
        leadId: lead.id,
        type: "status_change",
        fromStatus: lead.status,
        toStatus: input.status,
        body: input.note ?? null,
        actorUserId: ctx.user.id,
      });
      return { success: true };
    }),

  /**
   * Готовит текст первого сообщения. Не отправляет: отправку делает менеджер
   * своими руками из своего аккаунта, а модуль только проверяет право написать
   * и фиксирует факт касания.
   */
  firstTouchMessage: staffProcedure
    .input(
      z.object({
        id: z.number().int(),
        managerName: z.string().trim().max(120).optional(),
      })
    )
    .query(async ({ input }) => {
      const lead = await db.getDentalLeadById(input.id);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });
      if (!canContact(lead)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Пациент не давал согласия на переписку — только звонок по указанному телефону",
        });
      }
      return {
        channel: lead.messengerType,
        handle: lead.messengerHandle,
        text: buildFirstTouchMessage({
          name: lead.name,
          serviceSlug: lead.serviceSlug,
          tier: lead.urgencyTier as UrgencyTier,
          messenger: lead.messengerType,
          managerName: input.managerName,
        }),
      };
    }),

  markContacted: staffProcedure
    .input(
      z.object({
        id: z.number().int(),
        channel: z.string().trim().max(32),
        body: z.string().trim().max(4000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await db.getDentalLeadById(input.id);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });
      await db.updateDentalLead(lead.id, {
        firstTouchAt: lead.firstTouchAt ?? new Date(),
        status: lead.status === "new" ? "contacted" : lead.status,
      });
      await db.addDentalLeadEvent({
        leadId: lead.id,
        type: "message_sent",
        channel: input.channel,
        body: input.body ?? null,
        actorUserId: ctx.user.id,
      });
      return { success: true };
    }),

  // ============ ИСТОЧНИКИ ЗАЯВОК ============

  sources: staffProcedure.query(async () => {
    const sources = await db.getDentalLeadSources();
    // Хеш ключа наружу не отдаём — сам ключ показывается один раз при создании.
    return sources.map(({ apiKeyHash, ...rest }) => rest);
  }),

  sourceStats: staffProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .default({ days: 30 })
    )
    .query(async ({ input }) => db.getDentalSourceStats(input.days)),

  createSource: staffProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        type: z.enum(LEAD_SOURCE_TYPES as [string, ...string[]]),
        domain: z.string().trim().max(255).optional(),
        defaultCity: z.string().trim().max(128).optional(),
        defaultService: serviceSlugSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { key, prefix, hash } = generateApiKey();
      const sourceId = await db.createDentalLeadSource({
        name: input.name,
        type: input.type as any,
        apiKeyPrefix: prefix,
        apiKeyHash: hash,
        domain: input.domain || null,
        defaultCity: input.defaultCity || null,
        defaultService: input.defaultService || null,
        status: "active",
      });
      if (!sourceId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось сохранить источник",
        });
      }
      // Единственный момент, когда ключ виден целиком: дальше только хеш.
      return { id: Number(sourceId), apiKey: key };
    }),

  updateSource: staffProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["active", "paused"]).optional(),
        domain: z.string().trim().max(255).optional(),
        defaultCity: z.string().trim().max(128).optional(),
        defaultService: serviceSlugSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.domain !== undefined) patch.domain = input.domain || null;
      if (input.defaultCity !== undefined)
        patch.defaultCity = input.defaultCity || null;
      if (input.defaultService !== undefined)
        patch.defaultService = input.defaultService;
      await db.updateDentalLeadSource(input.id, patch);
      return { success: true };
    }),

  // ============ ПАРТНЁРСКИЕ КЛИНИКИ ============

  partners: staffProcedure
    .input(
      z
        .object({
          city: z.string().trim().max(128).optional(),
          status: z.enum(["active", "paused", "archived"]).optional(),
        })
        .default({})
    )
    .query(async ({ input }) => db.getDentalPartners(input)),

  partnerStats: staffProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .default({ days: 30 })
    )
    .query(async ({ input }) => db.getDentalPartnerStats(input.days)),

  createPartner: staffProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        city: z.string().trim().min(2).max(128),
        region: z.string().trim().max(128).optional(),
        address: z.string().trim().max(512).optional(),
        site: z.string().trim().max(512).optional(),
        contactName: z.string().trim().max(255).optional(),
        contactPhone: z.string().trim().max(32).optional(),
        contactEmail: z
          .string()
          .trim()
          .email()
          .max(320)
          .optional()
          .or(z.literal("")),
        services: z.array(serviceSlugSchema).optional(),
        pricePerLead: z.number().min(0).max(1000000).optional(),
        pricePerVisit: z.number().min(0).max(1000000).optional(),
        dailyCap: z.number().int().min(0).max(1000).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const slug = `${slugify(input.name)}-${slugify(input.city)}-${nanoid(4).toLowerCase()}`;
      const partnerId = await db.createDentalPartner({
        name: input.name,
        slug,
        city: input.city,
        region: input.region ?? null,
        address: input.address ?? null,
        site: input.site ?? null,
        contactName: input.contactName ?? null,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ? input.contactEmail : null,
        services: input.services ?? [],
        pricePerLead: input.pricePerLead?.toFixed(2) ?? "0.00",
        pricePerVisit: input.pricePerVisit?.toFixed(2) ?? "0.00",
        dailyCap: input.dailyCap,
        status: "active",
      });
      if (!partnerId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось сохранить клинику",
        });
      }
      return { id: Number(partnerId), slug };
    }),

  updatePartner: staffProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        dailyCap: z.number().int().min(0).max(1000).optional(),
        pricePerLead: z.number().min(0).max(1000000).optional(),
        pricePerVisit: z.number().min(0).max(1000000).optional(),
        contactName: z.string().trim().max(255).optional(),
        contactPhone: z.string().trim().max(32).optional(),
        contactEmail: z
          .string()
          .trim()
          .email()
          .max(320)
          .optional()
          .or(z.literal("")),
        services: z.array(serviceSlugSchema).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const partner = await db.getDentalPartnerById(input.id);
      if (!partner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Клиника не найдена",
        });
      }
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.dailyCap !== undefined) patch.dailyCap = input.dailyCap;
      if (input.pricePerLead !== undefined)
        patch.pricePerLead = input.pricePerLead.toFixed(2);
      if (input.pricePerVisit !== undefined)
        patch.pricePerVisit = input.pricePerVisit.toFixed(2);
      if (input.contactName !== undefined)
        patch.contactName = input.contactName;
      if (input.contactPhone !== undefined)
        patch.contactPhone = input.contactPhone;
      if (input.contactEmail !== undefined)
        patch.contactEmail = input.contactEmail || null;
      if (input.services !== undefined) patch.services = input.services;
      await db.updateDentalPartner(input.id, patch);
      return { success: true };
    }),

  /** Ручная передача заявки другой клинике — когда партнёр отказался. */
  routeLead: staffProcedure
    .input(
      z.object({ id: z.number().int(), partnerId: z.number().int().nullable() })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await db.getDentalLeadById(input.id);
      if (!lead)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена",
        });

      let partnerName = "не распределена";
      if (input.partnerId !== null) {
        const partner = await db.getDentalPartnerById(input.partnerId);
        if (!partner) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Клиника не найдена",
          });
        }
        partnerName = partner.name;
      }

      await db.updateDentalLead(lead.id, {
        partnerId: input.partnerId,
        routedAt: input.partnerId === null ? null : new Date(),
      });
      await db.addDentalLeadEvent({
        leadId: lead.id,
        type: "note",
        body: `Заявка передана: ${partnerName}`,
        actorUserId: ctx.user.id,
      });
      return { success: true };
    }),

  /** Выгрузка в .xlsx: сводка по дням, общий лист и вкладка на каждый день. */
  exportXlsx: staffProcedure
    .input(
      z
        .object({
          status: statusSchema.optional(),
          urgencyTier: tierSchema.optional(),
          serviceSlug: serviceSlugSchema.optional(),
          partnerId: z.number().int().optional(),
          city: z.string().trim().max(128).optional(),
          from: z.date().optional(),
          to: z.date().optional(),
        })
        .default({})
    )
    .query(async ({ input }) => {
      const leads = await db.getDentalLeadsForExport(input);
      // Подставляем названия клиник: в строке лида лежит только их id.
      const partners = await db.getDentalPartners();
      const partnerNames = new Map(partners.map(p => [p.id, p.name]));
      const { buffer, omittedDays, totalLeads } = buildLeadWorkbook(
        leads.map(lead => ({
          ...toExportLead(lead),
          partnerName: lead.partnerId
            ? (partnerNames.get(lead.partnerId) ?? null)
            : null,
        }))
      );
      return {
        filename: `darema-leads-${new Date().toISOString().slice(0, 10)}.xlsx`,
        base64: buffer.toString("base64"),
        totalLeads,
        omittedDays,
      };
    }),
});
