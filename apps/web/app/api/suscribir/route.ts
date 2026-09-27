import { NextResponse } from "next/server";
import { crearSuscripcion, type FiltrosSuscripcion } from "@/lib/suscripciones";
import { sendEmail, emailConfigured, SITE_URL } from "@/lib/email";
import { InvalidInput, readJsonObject, parseEmail, parseFilters } from "@/lib/alert-input";
import { limitSubscription } from "@/lib/alert-rate-limit";
import { escapeHtml } from "@/lib/html";

export const runtime = "nodejs";

function describeFiltros(f: FiltrosSuscripcion): string {
  const partes: string[] = [];
  if (f.q) partes.push(`texto “${f.q}”`);
  if (f.fuente_codigo) partes.push(`fuente ${f.fuente_codigo.toUpperCase()}`);
  if (f.ambito) partes.push(`ámbito ${f.ambito}`);
  if (f.ccaa) partes.push(`comunidad ${f.ccaa}`);
  return partes.length ? partes.join(", ") : "todas las convocatorias";
}

export async function POST(request: Request) {
  let email: string;
  let filtros: FiltrosSuscripcion;
  try {
    const body = await readJsonObject(request);
    email = parseEmail(body.email);
    filtros = parseFilters(body);
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Email o filtros no válidos" },
      { status: error instanceof InvalidInput ? error.status : 400 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "El envío de alertas no está configurado todavía." },
      { status: 503 }
    );
  }

  const quota = await limitSubscription(request, "email", email);
  if (!quota.ok) {
    return NextResponse.json({ ok: false, error: quota.status === 429
      ? "Demasiadas solicitudes. Inténtalo más tarde."
      : "Las alertas no están disponibles temporalmente." }, {
      status: quota.status,
      headers: quota.retryAfter ? { "Retry-After": String(quota.retryAfter) } : {},
    });
  }
  // Do not include database errors (which may contain the address) in logs or responses.
  const creada = await crearSuscripcion(email, filtros).catch(() => null);
  if (!creada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la suscripción." },
      { status: 500 }
    );
  }

  const confirmar = escapeHtml(`${SITE_URL}/alertas/confirmar?token=${encodeURIComponent(creada.token)}`);
  const baja = escapeHtml(`${SITE_URL}/alertas/baja?token=${encodeURIComponent(creada.token)}`);
  const resumen = escapeHtml(describeFiltros(filtros));

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h1 style="color:#1B3358;font-size:20px">Confirma tu alerta de OpoAlerta</h1>
      <p>Has pedido recibir avisos de nuevas convocatorias que coincidan con: <strong>${resumen}</strong>.</p>
      <p>Para activarla, confirma que este correo es tuyo:</p>
      <p><a href="${confirmar}" style="display:inline-block;background:#D9A62B;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:600">Confirmar alerta</a></p>
      <p style="color:#8792A2;font-size:13px">Si no has sido tú, ignora este correo y no recibirás nada. También puedes <a href="${baja}" style="color:#33507A">darte de baja</a> en cualquier momento.</p>
      <hr style="border:none;border-top:1px solid #E5E5E5;margin:24px 0">
      <p style="color:#8792A2;font-size:12px">OpoAlerta · buscador cívico y gratuito de empleo público · datos oficiales</p>
    </div>`;

  const enviado = await sendEmail({
    to: email,
    subject: "Confirma tu alerta de OpoAlerta",
    html,
  });
  if (!enviado.ok) {
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el correo de confirmación." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
