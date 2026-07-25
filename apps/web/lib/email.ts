/**
 * Envío de email vía la API REST de Resend (sin dependencia extra).
 *
 * Config por entorno:
 *  - RESEND_API_KEY   clave de Resend (obligatoria para enviar).
 *  - ALERTAS_FROM     remitente. Por defecto el dominio de pruebas de Resend;
 *                     cámbialo a "OpoAlerta <alertas@opoalerta.es>" cuando el
 *                     dominio esté verificado en Resend.
 *  - SITE_URL         base para los enlaces de los emails.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const FROM = process.env.ALERTAS_FROM ?? "OpoAlerta <onboarding@resend.dev>";
export const SITE_URL = process.env.SITE_URL ?? "https://opoalerta.es";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY no configurada" };

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!resp.ok) {
      return { ok: false, error: `Resend ${resp.status}: ${await resp.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
