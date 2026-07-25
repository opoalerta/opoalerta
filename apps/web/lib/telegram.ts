/**
 * Utilidades de Telegram (lado servidor).
 *  - TELEGRAM_BOT_TOKEN       token del bot (obligatorio para enviar).
 *  - TELEGRAM_BOT_USERNAME    username del bot (para el deep-link). Def: opoalertbot.
 */

export const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "opoalertbot";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function deepLink(token: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${token}`;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!resp.ok) return { ok: false, error: `Telegram ${resp.status}: ${await resp.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
