/**
 * Счётчики на страницах записи: Яндекс.Метрика и пиксель VK.
 *
 * Подключаются только если заданы соответствующие переменные окружения, и
 * только на страницах DAREMA — на остальной платформе счётчиков клиники быть
 * не должно. Пиксель нужен для ретаргетинга и оценки кампаний: сегмент живёт
 * на стороне рекламной системы, к нам списки людей не выгружаются.
 */

import { useEffect } from "react";

const METRIKA_ID = import.meta.env.VITE_YANDEX_METRIKA_ID as string | undefined;
const VK_PIXEL_ID = import.meta.env.VITE_VK_PIXEL_ID as string | undefined;

const injectOnce = (id: string, src: string, onLoad?: () => void) => {
  if (document.getElementById(id)) {
    onLoad?.();
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  if (onLoad) script.onload = onLoad;
  document.head.appendChild(script);
};

export default function DentalAnalytics() {
  useEffect(() => {
    if (!METRIKA_ID) return;
    const w = window as any;
    w.ym =
      w.ym ||
      function (...args: unknown[]) {
        (w.ym.a = w.ym.a || []).push(args);
      };
    w.ym.l = Date.now();
    injectOnce("ym-script", "https://mc.yandex.ru/metrika/tag.js", () => {
      w.ym(METRIKA_ID, "init", {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false,
      });
    });
  }, []);

  useEffect(() => {
    if (!VK_PIXEL_ID) return;
    injectOnce("vk-pixel", "https://vk.com/js/api/openapi.js?169", () => {
      const w = window as any;
      w.VK?.Retargeting?.Init(VK_PIXEL_ID);
      w.VK?.Retargeting?.Hit();
    });
  }, []);

  return null;
}

/**
 * Цель «оставлена заявка». Передаём в системы только факт события и
 * направление — без контактов пациента.
 */
export function trackLeadSubmitted(serviceSlug: string) {
  const w = window as any;
  try {
    if (METRIKA_ID && typeof w.ym === "function") {
      w.ym(METRIKA_ID, "reachGoal", "dental_lead", { service: serviceSlug });
    }
    w.VK?.Goal?.("lead");
  } catch (error) {
    // Аналитика не должна ломать подтверждение записи.
    console.warn("[Dental] Не удалось отправить цель:", error);
  }
}
