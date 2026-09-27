import { NextResponse } from "next/server";
import { crearSuscripcionTelegram, type FiltrosSuscripcion } from "@/lib/suscripciones";
import { telegramConfigured, deepLink } from "@/lib/telegram";
import { InvalidInput, readJsonObject, parseFilters } from "@/lib/alert-input";
import { limitSubscription } from "@/lib/alert-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Las alertas por Telegram no están configuradas todavía." },
      { status: 503 }
    );
  }

  let filtros: FiltrosSuscripcion;
  try {
    filtros = parseFilters(await readJsonObject(request));
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Filtros no válidos" },
      { status: error instanceof InvalidInput ? error.status : 400 });
  }

  const quota = await limitSubscription(request, "telegram");
  if (!quota.ok) {
    return NextResponse.json({ ok: false, error: quota.status === 429
      ? "Demasiadas solicitudes. Inténtalo más tarde."
      : "Las alertas no están disponibles temporalmente." }, {
      status: quota.status,
      headers: quota.retryAfter ? { "Retry-After": String(quota.retryAfter) } : {},
    });
  }
  const creada = await crearSuscripcionTelegram(filtros).catch(() => null);
  if (!creada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la suscripción." },
      { status: 500 }
    );
  }

  // La persona abre este enlace, pulsa Start y el webhook vincula su chat.
  return NextResponse.json({ ok: true, url: deepLink(creada.token) });
}
