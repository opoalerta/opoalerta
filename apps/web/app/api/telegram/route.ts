import { NextResponse } from "next/server";
import { vincularTelegram, bajaTelegram, resumenFiltros } from "@/lib/suscripciones";
import { sendTelegram } from "@/lib/telegram";

export const runtime = "nodejs";

/**
 * Webhook de Telegram. Al recibir "/start <token>" vincula el chat a la
 * suscripción y la confirma. Los tokens son UUID no públicos, así que un
 * mensaje con un token inexistente simplemente no hace nada.
 */
export async function POST(request: Request) {
  // Verificación opcional del secreto del webhook.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: {
    message?: { text?: string; chat?: { id?: number } };
  };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true }); // ignora payloads no válidos
  }

  const text = update.message?.text?.trim() ?? "";
  const chatId = update.message?.chat?.id;

  if (chatId && text.startsWith("/start")) {
    const token = text.split(/\s+/)[1];
    const filtros = token ? await vincularTelegram(token, chatId) : null;
    if (filtros) {
      await sendTelegram(
        chatId,
        `✅ <b>Alerta activada.</b> Te avisaré cuando salga una convocatoria de: <b>${resumenFiltros(filtros)}</b>.\n\nPara cambiar los criterios, vuelve a opoalerta.es y suscríbete con otra búsqueda. Para darte de baja, escribe /stop.`
      );
    } else {
      await sendTelegram(
        chatId,
        "👋 Soy el bot de <b>OpoAlerta</b>. Para recibir alertas, entra en opoalerta.es, elige tu búsqueda y pulsa «Recibir por Telegram»."
      );
    }
  } else if (chatId && text.startsWith("/stop")) {
    const n = await bajaTelegram(chatId);
    await sendTelegram(
      chatId,
      n > 0
        ? "🚫 Te has dado de baja. No recibirás más alertas por aquí."
        : "No tenías ninguna alerta activa en este chat."
    );
  }

  // Telegram espera siempre 200.
  return NextResponse.json({ ok: true });
}
