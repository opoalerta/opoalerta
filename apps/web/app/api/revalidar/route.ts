import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * Invalida la caché de todas las páginas cuando termina la ingesta diaria.
 *
 * Las páginas se revalidan una vez al día (`revalidate = 86400`) para que
 * los rastreadores no tengan despierto el compute de Neon. Sin este aviso, una
 * convocatoria nueva tardaría hasta un día en salir en la portada y los
 * listados. Lo llama el job `revalidar` de `ingest.yml`.
 *
 * Protegido con `REVALIDATE_SECRET` (Vercel y secreto de GitHub). Sin la
 * variable responde 503 y no invalida nada: así no queda abierto a cualquiera.
 */
export const dynamic = "force-dynamic";

function autorizado(cabecera: string | null, secreto: string): boolean {
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(cabecera ?? "");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export async function POST(request: Request) {
  const secreto = process.env.REVALIDATE_SECRET;
  if (!secreto) {
    return Response.json({ ok: false, error: "REVALIDATE_SECRET no configurado" }, { status: 503 });
  }
  if (!autorizado(request.headers.get("authorization"), secreto)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
