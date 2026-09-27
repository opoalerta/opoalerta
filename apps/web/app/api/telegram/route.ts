import { NextResponse } from "next/server";
import { vincularTelegram, bajaTelegram, resumenFiltros } from "@/lib/suscripciones";
import { BOT_USERNAME, sendTelegram, webhookSecretConfigured, validWebhookSecret } from "@/lib/telegram";
import { readJsonObject } from "@/lib/alert-input";
import { escapeHtml } from "@/lib/html";

export const runtime = "nodejs";

/**
 * Webhook de Telegram. Al recibir "/start <token>" vincula el chat a la
 * suscripción y la confirma. Los tokens son UUID no públicos, así que un
 * mensaje con un token inexistente simplemente no hace nada.
 */
async function handleWebhook(request: Request) {
  if (!webhookSecretConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!validWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: Record<string, unknown>;
  try {
    update = await readJsonObject(request, 16384);
  } catch {
    return NextResponse.json({ ok: true }); // ignora payloads no válidos
  }

  const message = update.message;
  if (!message || typeof message !== "object" || !("text" in message)
    || typeof message.text !== "string" || !("chat" in message)) {
    return NextResponse.json({ ok: true });
  }
  const chat = message.chat;
  if (!chat || typeof chat !== "object" || !("type" in chat) || chat.type !== "private"
    || !("id" in chat) || typeof chat.id !== "number" || !Number.isSafeInteger(chat.id) || chat.id <= 0) {
    return NextResponse.json({ ok: true });
  }
  const chatId = chat.id;
  const [addressedCommand, ...args] = message.text.trim().split(/\s+/);
  const [command, username, extra] = addressedCommand.split("@");
  if (extra !== undefined || (username !== undefined && username.toLowerCase() !== BOT_USERNAME.toLowerCase())) {
    return NextResponse.json({ ok: true });
  }

  if (command === "/start" && args.length <= 1) {
    const token = args[0];
    if (token && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return NextResponse.json({ ok: true });
    }
    const filtros = token ? await vincularTelegram(token, chatId) : null;
    if (filtros) {
      await sendTelegram(
        chatId,
        `✅ <b>Alerta activada.</b> Te avisaré cuando salga una convocatoria de: <b>${escapeHtml(resumenFiltros(filtros))}</b>.\n\nPara cambiar los criterios, vuelve a opoalerta.es y suscríbete con otra búsqueda. Para darte de baja, escribe /stop.`
      );
    } else {
      await sendTelegram(
        chatId,
        "👋 Soy el bot de <b>OpoAlerta</b>. Para recibir alertas, entra en opoalerta.es, elige tu búsqueda y pulsa «Recibir por Telegram»."
      );
    }
  } else if (command === "/stop" && args.length === 0) {
    const n = await bajaTelegram(chatId);
    await sendTelegram(
      chatId,
      n > 0
        ? "🚫 Te has dado de baja. No recibirás más alertas por aquí."
        : "No tenías ninguna alerta activa en este chat."
    );
  }

  // Acknowledge valid updates, including commands we do not handle.
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  try {
    return await handleWebhook(request);
  } catch {
    // Preserve Telegram retries without logging database parameters or chat identifiers.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
