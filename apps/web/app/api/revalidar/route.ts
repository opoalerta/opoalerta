import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getIdsIngeridosDesde } from "@/lib/db";
import { rutaConvocatoria } from "@/lib/site";

/**
 * Invalida la caché de lo que cambia con la ingesta diaria.
 *
 * Las páginas se revalidan solas una vez a la semana, como red de seguridad;
 * quien las refresca de verdad es este aviso, que llama el job `revalidar` de
 * `ingest.yml` al terminar la ingesta.
 *
 * Devuelve las rutas de las fichas invalidadas para que ese mismo job las
 * vuelva a pedir, junto con los listados del sitemap, nada más invalidarlas.
 * Sin ese calentamiento las ~570 páginas de listado quedaban caducadas a la
 * vez y se regeneraban una a una según iban llegando los rastreadores a lo
 * largo del día: una consulta cada pocos minutos, justo lo que impide que el
 * compute de Neon se suspenda (80 % del cupo mensual gastado el día 11, en
 * noviembre de 2026). Regenerándolas seguidas, la base trabaja unos minutos
 * —ya está despierta por la ingesta— y duerme el resto del día.
 *
 * Antes invalidaba todo el sitio con `revalidatePath("/", "layout")`. Eso
 * incluía las ~13.000 fichas, que los rastreadores volvían a pedir y Vercel
 * volvía a generar cada noche: 1,2 M escrituras ISR en un mes contra un cupo de
 * 200.000, y la cuenta entera suspendida (2026-11). Ahora se invalidan los
 * listados y solo las fichas recién ingeridas.
 *
 * Protegido con `REVALIDATE_SECRET` (Vercel y secreto de GitHub). Sin la
 * variable responde 503 y no invalida nada: así no queda abierto a cualquiera.
 */
export const dynamic = "force-dynamic";

/** Días hacia atrás de fichas a refrescar: cubre un fin de semana sin ingesta. */
const DIAS_FICHAS = 3;

/** Páginas que muestran listados o recuentos, y por tanto cambian cada día. */
const LISTADOS: Array<[ruta: string, tipo?: "page"]> = [
  ["/", "page"],
  ["/convocatorias", "page"],
  ["/convocatorias/pagina/[n]", "page"],
  ["/oposiciones", "page"],
  ["/oposiciones/[a]", "page"],
  ["/oposiciones/[a]/[b]", "page"],
  ["/sobre", "page"],
  ["/estado", "page"],
  ["/rss.xml"],
  ["/sitemap.xml"],
];

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

  for (const [ruta, tipo] of LISTADOS) revalidatePath(ruta, tipo);
  const fichas = await getIdsIngeridosDesde(DIAS_FICHAS);
  const rutas = fichas.map(rutaConvocatoria);
  for (const ruta of rutas) revalidatePath(ruta);

  return Response.json({ ok: true, listados: LISTADOS.length, fichas: rutas.length, rutas });
}
