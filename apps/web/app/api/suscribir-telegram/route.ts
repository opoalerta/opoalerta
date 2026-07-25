import { NextResponse } from "next/server";
import { crearSuscripcionTelegram, type FiltrosSuscripcion } from "@/lib/suscripciones";
import { telegramConfigured, deepLink } from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Las alertas por Telegram no están configuradas todavía." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const filtros: FiltrosSuscripcion = {
    q: (body.q as string) ?? null,
    ccaa: (body.ccaa as string) ?? null,
    ambito: (body.ambito as string) ?? null,
    fuente_codigo: (body.fuente_codigo as string) ?? null,
  };

  const creada = await crearSuscripcionTelegram(filtros);
  if (!creada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la suscripción." },
      { status: 500 }
    );
  }

  // La persona abre este enlace, pulsa Start y el webhook vincula su chat.
  return NextResponse.json({ ok: true, url: deepLink(creada.token) });
}
