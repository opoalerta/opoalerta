import { NextResponse } from "next/server";
import { crearSuscripcion, type FiltrosSuscripcion } from "@/lib/suscripciones";
import { sendEmail, emailConfigured, SITE_URL } from "@/lib/email";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describeFiltros(f: FiltrosSuscripcion): string {
  const partes: string[] = [];
  if (f.q) partes.push(`texto “${f.q}”`);
  if (f.fuente_codigo) partes.push(`fuente ${f.fuente_codigo.toUpperCase()}`);
  if (f.ambito) partes.push(`ámbito ${f.ambito}`);
  if (f.ccaa) partes.push(`comunidad ${f.ccaa}`);
  return partes.length ? partes.join(", ") : "todas las convocatorias";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Email no válido" }, { status: 400 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "El envío de alertas no está configurado todavía." },
      { status: 503 }
    );
  }

  const filtros: FiltrosSuscripcion = {
    q: (body.q as string) ?? null,
    ccaa: (body.ccaa as string) ?? null,
    ambito: (body.ambito as string) ?? null,
    fuente_codigo: (body.fuente_codigo as string) ?? null,
  };

  const creada = await crearSuscripcion(email, filtros);
  if (!creada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la suscripción." },
      { status: 500 }
    );
  }

  const confirmar = `${SITE_URL}/alertas/confirmar?token=${creada.token}`;
  const baja = `${SITE_URL}/alertas/baja?token=${creada.token}`;
  const resumen = describeFiltros(filtros);

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h1 style="color:#154273;font-size:20px">Confirma tu alerta de OpoAlerta</h1>
      <p>Has pedido recibir avisos de nuevas convocatorias que coincidan con: <strong>${resumen}</strong>.</p>
      <p>Para activarla, confirma que este correo es tuyo:</p>
      <p><a href="${confirmar}" style="display:inline-block;background:#01689b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:600">Confirmar alerta</a></p>
      <p style="color:#595959;font-size:13px">Si no has sido tú, ignora este correo y no recibirás nada. También puedes <a href="${baja}" style="color:#01689b">darte de baja</a> en cualquier momento.</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
      <p style="color:#999;font-size:12px">OpoAlerta · buscador cívico y gratuito de empleo público · datos oficiales</p>
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
