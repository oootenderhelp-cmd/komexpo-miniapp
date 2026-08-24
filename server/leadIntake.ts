/**
 * Внешний вход для заявок и встраиваемый виджет.
 *
 * Сюда шлют заявки сайты клиник, лид-формы ВК, Тильда, колл-трекинг — всё, что
 * умеет отправить HTTP-запрос. tRPC для этого не подходит: у внешних сервисов
 * нет нашего клиента, им нужен обычный POST с JSON.
 *
 * Заявка принимается только от источника с действующим ключом и только с
 * подтверждённым согласием на обработку данных.
 */

import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import {
  API_KEY_PREFIX_LENGTH,
  normalizeIntake,
  parseApiKey,
  type LeadSourceType,
} from "@shared/leadSources";
import { DENTAL_SERVICE_SLUGS, getService } from "@shared/dental";
import { regionOf } from "@shared/cities";
import * as db from "./db";
import { IntakeError, intakeLead } from "./lib/leadService";

export const hashApiKey = (secret: string): string =>
  crypto.createHash("sha256").update(secret).digest("hex");

/** Выдаётся один раз при создании источника: в базе лежит только хеш. */
export function generateApiKey(): {
  key: string;
  prefix: string;
  hash: string;
} {
  const prefix = crypto
    .randomBytes(8)
    .toString("hex")
    .slice(0, API_KEY_PREFIX_LENGTH);
  const secret = crypto.randomBytes(24).toString("base64url");
  return { key: `dlk_${prefix}_${secret}`, prefix, hash: hashApiKey(secret) };
}

/**
 * Сравнение секретов постоянным по времени способом: обычное === утекает
 * информацию о том, сколько символов ключа угадано.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Простое ограничение частоты на ключ: внешний вход открыт в интернет. */
const hits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;

function rateLimited(key: string, now: number): boolean {
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const originAllowed = (
  origin: string | undefined,
  domain: string | null
): boolean => {
  if (!domain) return true;
  if (!origin) return true; // серверные вызовы Origin не присылают
  try {
    const host = new URL(origin).hostname.toLowerCase();
    const allowed = domain.toLowerCase().replace(/^www\./, "");
    return (
      host === allowed ||
      host === `www.${allowed}` ||
      host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
};

export function registerLeadIntake(app: Express) {
  // Виджет ставится на чужие сайты, поэтому вход и скрипт открыты для всех
  // источников; доступ ограничивает ключ, а не заголовок Origin.
  const allowCors = (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, X-Api-Key");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Vary", "Origin");
  };

  app.options("/api/lead-intake", (req, res) => {
    allowCors(req, res);
    res.sendStatus(204);
  });

  app.post("/api/lead-intake", async (req: Request, res: Response) => {
    allowCors(req, res);

    const rawKey =
      (req.headers["x-api-key"] as string | undefined) ??
      (typeof req.body?.apiKey === "string" ? req.body.apiKey : undefined);
    if (!rawKey) {
      return res
        .status(401)
        .json({ ok: false, error: "Не передан ключ источника" });
    }

    const parsed = parseApiKey(rawKey);
    if (!parsed) {
      return res
        .status(401)
        .json({ ok: false, error: "Ключ источника имеет неверный формат" });
    }

    if (rateLimited(parsed.prefix, Date.now())) {
      return res
        .status(429)
        .json({ ok: false, error: "Слишком много заявок, попробуйте позже" });
    }

    const source = await db.getLeadSourceByPrefix(parsed.prefix);
    if (!source || !safeEqual(hashApiKey(parsed.secret), source.apiKeyHash)) {
      return res.status(401).json({ ok: false, error: "Источник не найден" });
    }
    if (source.status !== "active") {
      return res.status(403).json({ ok: false, error: "Источник отключён" });
    }
    if (
      !originAllowed(req.headers.origin as string | undefined, source.domain)
    ) {
      return res
        .status(403)
        .json({ ok: false, error: "Домен не разрешён для этого источника" });
    }

    const payload = (req.body ?? {}) as Record<string, unknown>;
    const normalized = normalizeIntake(source.type as LeadSourceType, payload);
    if ("error" in normalized) {
      return res.status(400).json({ ok: false, error: normalized.error });
    }

    // Внешние системы любят повторять доставку вебхука — отвечаем тем же
    // номером заявки вместо второй строки в базе.
    if (normalized.externalId) {
      const existing = await db.findLeadByExternalId(
        source.id,
        normalized.externalId
      );
      if (existing) {
        return res.json({
          ok: true,
          duplicate: true,
          publicId: existing.publicId,
        });
      }
    }

    const serviceSlug =
      normalized.serviceSlug && getService(normalized.serviceSlug)
        ? normalized.serviceSlug
        : (source.defaultService ?? "terapiya");
    if (DENTAL_SERVICE_SLUGS.indexOf(serviceSlug as any) === -1) {
      return res
        .status(400)
        .json({ ok: false, error: "Неизвестное направление" });
    }

    const city = normalized.city ?? source.defaultCity ?? "";
    if (!city) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Не указан город, и у источника нет города по умолчанию",
        });
    }

    try {
      const result = await intakeLead({
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email ?? null,
        messengerType: normalized.messengerType,
        messengerHandle: normalized.messengerHandle ?? null,
        city,
        region: regionOf(city) ?? null,
        serviceSlug,
        comment: normalized.comment ?? null,
        painLevel: normalized.painLevel,
        readiness: normalized.readiness as any,
        sourceChannel: source.type,
        utmSource: normalized.utmSource ?? null,
        utmMedium: normalized.utmMedium ?? null,
        utmCampaign: normalized.utmCampaign ?? null,
        utmContent: normalized.utmContent ?? null,
        utmTerm: normalized.utmTerm ?? null,
        landingPath: source.domain ?? null,
        consentMarketing: normalized.consentMarketing,
        consentText: `source-${source.id}`,
        sourceId: source.id,
        externalId: normalized.externalId ?? null,
      });

      await db.updateDentalLeadSource(source.id, { lastLeadAt: new Date() });

      return res.json({
        ok: true,
        publicId: result.publicId,
        urgency: result.urgencyTier,
        clinic: result.clinic?.name ?? null,
      });
    } catch (error) {
      if (error instanceof IntakeError) {
        const status = error.code === "server_error" ? 500 : 400;
        return res.status(status).json({ ok: false, error: error.message });
      }
      console.error("[LeadIntake] Ошибка приёма заявки:", error);
      return res.status(500).json({ ok: false, error: "Внутренняя ошибка" });
    }
  });

  // Виджет: сайт подключает один скрипт, он рисует кнопку и форму в модалке.
  app.get("/api/lead-widget.js", (req, res) => {
    allowCors(req, res);
    res.type("application/javascript; charset=utf-8");
    res.send(WIDGET_SOURCE);
  });
}

/**
 * Исходник виджета. Держим строкой, чтобы он не попадал в сборку клиента и
 * отдавался как есть с любого домена.
 */
const WIDGET_SOURCE = String.raw`(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key");
  var city = script.getAttribute("data-city") || "";
  var service = script.getAttribute("data-service") || "";
  var title = script.getAttribute("data-title") || "Записаться к стоматологу";
  var endpoint = new URL(script.src).origin + "/api/lead-intake";
  if (!key) return console.warn("[Заявки] Не указан data-key");

  var css = document.createElement("style");
  css.textContent = ".dlw-btn{position:fixed;right:20px;bottom:20px;z-index:99998;background:#0e6b5e;color:#fff;border:0;border-radius:999px;padding:14px 22px;font:600 15px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2)}.dlw-back{position:fixed;inset:0;z-index:99999;background:rgba(10,20,18,.55);display:none;align-items:center;justify-content:center;padding:16px}.dlw-back.open{display:flex}.dlw-card{background:#fff;color:#14201d;border-radius:14px;max-width:400px;width:100%;padding:22px;font:400 15px/1.5 system-ui,sans-serif;max-height:90vh;overflow:auto}.dlw-card h3{margin:0 0 4px;font-size:19px}.dlw-card p.dlw-sub{margin:0 0 16px;color:#5b6b66;font-size:13px}.dlw-card label{display:block;font-size:13px;color:#5b6b66;margin:12px 0 4px}.dlw-card input,.dlw-card select,.dlw-card textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #dbe3e0;border-radius:8px;font:inherit;color:inherit;background:#fff}.dlw-consent{display:flex;gap:9px;align-items:flex-start;margin-top:14px;font-size:12.5px;color:#5b6b66}.dlw-consent input{width:auto;margin-top:2px}.dlw-send{width:100%;margin-top:16px;background:#0e6b5e;color:#fff;border:0;border-radius:9px;padding:12px;font:600 15px/1 system-ui,sans-serif;cursor:pointer}.dlw-send:disabled{opacity:.6;cursor:default}.dlw-close{float:right;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:#5b6b66}.dlw-msg{margin-top:12px;font-size:13px}";
  document.head.appendChild(css);

  var btn = document.createElement("button");
  btn.className = "dlw-btn";
  btn.type = "button";
  btn.textContent = title;
  document.body.appendChild(btn);

  var back = document.createElement("div");
  back.className = "dlw-back";
  back.innerHTML =
    '<div class="dlw-card" role="dialog" aria-modal="true">' +
    '<button class="dlw-close" type="button" aria-label="Закрыть">&times;</button>' +
    "<h3>" + title + "</h3>" +
    '<p class="dlw-sub">Администратор перезвонит и подберёт врача и время</p>' +
    '<label for="dlw-name">Имя</label><input id="dlw-name" autocomplete="name">' +
    '<label for="dlw-phone">Телефон</label><input id="dlw-phone" inputmode="tel" autocomplete="tel" placeholder="+7 (900) 000-00-00">' +
    (city ? "" : '<label for="dlw-city">Город</label><input id="dlw-city">') +
    '<label for="dlw-comment">Что беспокоит</label><textarea id="dlw-comment" rows="2"></textarea>' +
    '<label class="dlw-consent"><input type="checkbox" id="dlw-consent"><span>Согласен на обработку персональных данных для записи на приём</span></label>' +
    '<label class="dlw-consent"><input type="checkbox" id="dlw-marketing"><span>Можно написать мне в мессенджер</span></label>' +
    '<button class="dlw-send" type="button">Отправить заявку</button>' +
    '<div class="dlw-msg"></div>' +
    "</div>";
  document.body.appendChild(back);

  var msg = back.querySelector(".dlw-msg");
  var send = back.querySelector(".dlw-send");
  var open = function () { back.classList.add("open"); };
  var close = function () { back.classList.remove("open"); };

  btn.addEventListener("click", open);
  back.querySelector(".dlw-close").addEventListener("click", close);
  back.addEventListener("click", function (e) { if (e.target === back) close(); });

  send.addEventListener("click", function () {
    var name = (document.getElementById("dlw-name").value || "").trim();
    var phone = (document.getElementById("dlw-phone").value || "").trim();
    var cityEl = document.getElementById("dlw-city");
    var cityValue = city || (cityEl ? cityEl.value.trim() : "");
    var consent = document.getElementById("dlw-consent").checked;

    msg.style.color = "#b2372b";
    if (name.length < 2) return (msg.textContent = "Укажите имя");
    if (phone.replace(/\D/g, "").length < 10) return (msg.textContent = "Проверьте телефон");
    if (!cityValue) return (msg.textContent = "Укажите город");
    if (!consent) return (msg.textContent = "Нужно согласие на обработку данных");

    send.disabled = true;
    msg.style.color = "#5b6b66";
    msg.textContent = "Отправляем…";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        name: name,
        phone: phone,
        city: cityValue,
        service: service || undefined,
        comment: (document.getElementById("dlw-comment").value || "").trim(),
        consentPd: true,
        consentMarketing: document.getElementById("dlw-marketing").checked,
        utm_source: "widget",
        utm_medium: location.hostname
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        send.disabled = false;
        if (data && data.ok) {
          msg.style.color = "#2c7a51";
          msg.textContent = "Заявка принята. Номер: " + data.publicId;
        } else {
          msg.style.color = "#b2372b";
          msg.textContent = (data && data.error) || "Не удалось отправить заявку";
        }
      })
      .catch(function () {
        send.disabled = false;
        msg.style.color = "#b2372b";
        msg.textContent = "Нет связи с сервером. Попробуйте ещё раз";
      });
  });
})();`;
