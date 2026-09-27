/**
 * Utilidades de Telegram (lado servidor).
 *  - TELEGRAM_BOT_TOKEN       token del bot (obligatorio para enviar).
 *  - TELEGRAM_BOT_USERNAME    username del bot (para el deep-link). Def: opoalertbot.
 *  - TELEGRAM_WEBHOOK_SECRET secreto compartido con setWebhook (obligatorio).
 */

import { timingSafeEqual } from "node:crypto";

export const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "opoalertbot";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN) && webhookSecretConfigured();
}

export function webhookSecretConfigured(): boolean {
  return /^[A-Za-z0-9_-]{32,256}$/.test(process.env.TELEGRAM_WEBHOOK_SECRET ?? "");
}

export function validWebhookSecret(candidate: string | null): boolean {
  if (!webhookSecretConfigured() || !candidate) return false;
  const expected = Buffer.from(process.env.TELEGRAM_WEBHOOK_SECRET!);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function deepLink(token: string): string {
  return `https://t.me/${encodeURIComponent(BOT_USERNAME)}?start=${encodeURIComponent(token)}`;
}

export async function sendTelegram(
  chatId: number | string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN no configurado" };
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!resp.ok) return { ok: false, error: `Telegram ${resp.status}` };
    const result: unknown = await resp.json();
    if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
      return { ok: false, error: "Telegram no aceptó el mensaje" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Telegram no disponible" };
  }
}
