/**
 * Приём заявки — общий путь для всех источников.
 *
 * Через эту функцию проходит и своя форма записи, и заявки с чужих сайтов по
 * API. Иначе правила разъезжаются: где-то забыли посчитать срочность, где-то
 * не проверили согласие, где-то не отдали заявку клинике.
 */

import { nanoid } from "nanoid";
import {
  URGENCY_SLA_MINUTES,
  getService,
  pickPartner,
  scoreUrgency,
  type ReadinessWindow,
  type Symptom,
} from "@shared/dental";
import * as db from "../db";

export type IntakeInput = {
  name: string;
  phone: string;
  email?: string | null;
  messengerType?: string;
  messengerHandle?: string | null;
  city: string;
  region?: string | null;
  serviceSlug: string;
  comment?: string | null;
  painLevel?: number;
  symptoms?: Symptom[];
  readiness?: ReadinessWindow;
  sourceChannel?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
  consentMarketing: boolean;
  consentText?: string;
  sourceId?: number | null;
  externalId?: string | null;
};

export type IntakeResult = {
  publicId: string;
  urgencyScore: number;
  urgencyTier: "critical" | "high" | "medium" | "low";
  slaMinutes: number;
  leadMagnet: string;
  clinic: { id: number; name: string; city: string } | null;
};

/** Российский номер приводится к одному виду, иначе не найти дубли. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const national =
    digits.length === 11 && (digits[0] === "8" || digits[0] === "7")
      ? digits.slice(1)
      : digits;
  if (national.length !== 10) return raw.trim();
  return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8)}`;
}

export class IntakeError extends Error {
  constructor(
    message: string,
    readonly code: "bad_request" | "conflict" | "server_error" = "bad_request"
  ) {
    super(message);
  }
}

/**
 * Записывает заявку, считает срочность, отдаёт клинике и оповещает штат.
 * Согласие на обработку данных проверяет вызывающий код — сюда заявка
 * попадает только после того, как оно подтверждено.
 */
export async function intakeLead(input: IntakeInput): Promise<IntakeResult> {
  const service = getService(input.serviceSlug);
  if (!service) throw new IntakeError("Неизвестное направление");

  const phone = normalizePhone(input.phone);
  const city = input.city.trim();
  if (!city) throw new IntakeError("Не указан город");

  const urgency = scoreUrgency({
    serviceSlug: input.serviceSlug,
    painLevel: input.painLevel ?? 0,
    symptoms: input.symptoms ?? [],
    readiness: input.readiness ?? "researching",
  });

  // Канал связи сохраняем только вместе с согласием на коммуникации: иначе
  // ник в базе есть, права написать нет — и кто-нибудь всё равно напишет.
  const messengerAllowed =
    input.consentMarketing &&
    Boolean(input.messengerType) &&
    input.messengerType !== "none";

  const candidates = await db.getPartnerCandidates(city);
  const partner = pickPartner(
    candidates.map(c => ({
      id: c.id,
      name: c.name,
      city: c.city,
      services: Array.isArray(c.services) ? (c.services as string[]) : null,
      status: c.status,
      dailyCap: c.dailyCap,
      todayCount: c.todayCount,
    })),
    { city, serviceSlug: input.serviceSlug }
  );

  const publicId = `DL-${nanoid(8).toUpperCase()}`;

  const leadId = await db.createDentalLead({
    publicId,
    name: input.name.trim(),
    phone,
    email: input.email || null,
    messengerType: (messengerAllowed ? input.messengerType : "none") as any,
    messengerHandle: messengerAllowed ? (input.messengerHandle ?? null) : null,
    city,
    region: input.region ?? null,
    serviceSlug: input.serviceSlug,
    comment: input.comment ?? null,
    painLevel: input.painLevel ?? 0,
    symptoms: input.symptoms ?? [],
    readiness: (input.readiness ?? "researching") as any,
    urgencyScore: urgency.score,
    urgencyTier: urgency.tier,
    urgencyReasons: urgency.reasons,
    sourceChannel: input.sourceChannel ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmContent: input.utmContent ?? null,
    utmTerm: input.utmTerm ?? null,
    landingPath: input.landingPath ?? null,
    consentPd: true,
    consentMarketing: input.consentMarketing,
    consentAt: new Date(),
    consentText: input.consentText ?? "dental-v1",
    status: "new",
    partnerId: partner?.id ?? null,
    routedAt: partner ? new Date() : null,
    sourceId: input.sourceId ?? null,
    externalId: input.externalId ?? null,
  });

  // Заявка не записалась — нельзя отвечать «принято»: человек с острой болью
  // решит, что ему перезвонят, и будет ждать зря.
  if (!leadId) {
    throw new IntakeError(
      "Не смогли сохранить заявку. Позвоните, пожалуйста, в клинику напрямую.",
      "server_error"
    );
  }

  if (urgency.tier === "critical" || urgency.tier === "high") {
    try {
      const staffIds = await db.getStaffUserIds();
      await db.createNotifications(staffIds, {
        type: "dental_urgent_lead",
        title:
          urgency.tier === "critical"
            ? `Критичная заявка ${publicId}: связаться за ${URGENCY_SLA_MINUTES.critical} минут`
            : `Срочная заявка ${publicId}: связаться за час`,
        message: `${service.name}, ${city}, ${input.name}, ${phone}. ${urgency.reasons.join(", ")}.`,
        link: "/dental/leads",
      });
    } catch (error) {
      // Заявка уже сохранена — сбой оповещения не должен её отменять.
      console.warn("[Dental] Не удалось оповестить администраторов:", error);
    }
  }

  return {
    publicId,
    urgencyScore: urgency.score,
    urgencyTier: urgency.tier,
    slaMinutes: URGENCY_SLA_MINUTES[urgency.tier],
    leadMagnet: service.leadMagnet,
    clinic: partner
      ? { id: partner.id, name: partner.name, city: partner.city }
      : null,
  };
}
