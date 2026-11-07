import { NextResponse } from "next/server";
import { buscarConvocatorias, type Orden, POR_PAGINA } from "@/lib/db";

export const runtime = "nodejs";
// Los datos cambian con cada ingesta diaria; servir una página cacheada
// mostraría convocatorias que ya no están o esconderá las recién publicadas.
export const dynamic = "force-dynamic";

const ORDENES_VALIDOS = new Set<Orden>(["recientes", "urgencia"]);

/** Tope del texto de búsqueda: el mismo que admiten las alertas. */
const MAX_Q = 200;
/** Tope de resultados por petición. El buscador pide 24; 50 deja margen. */
const MAX_CUANTAS = 50;

/**
 * Cinco minutos en el CDN por URL. Era `force-dynamic` sin caché: cada
 * petición eran dos consultas a Neon, y un bot que recorriera combinaciones
 * de filtros lo mantenía despierto y gastaba invocaciones de Vercel. Los datos
 * solo cambian con la ingesta diaria, así que cinco minutos no se notan.
 */
const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

/**
 * Búsqueda paginada de convocatorias.
 *
 * GET /api/convocatorias?q=&fuente=&ambito=&ccaa=&orden=recientes&desde=0&cuantas=24
 *   → { items, total, desde, cuantas }
 *
 * Existe para que el buscador deje de filtrar en el navegador. Filtrando allí
 * había que mandarle todas las convocatorias, y el `LIMIT 500` que evitaba que
 * la página creciera sin control acabó ocultando las que no cabían.
 *
 * `total` es el recuento real de lo que cumple los filtros, no el número de
 * elementos devueltos: es lo que permite decir «24 de 640» en vez de «500
 * resultados» cuando hay más.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const desde = Number.parseInt(p.get("desde") ?? "0", 10);
  const cuantas = Number.parseInt(p.get("cuantas") ?? String(POR_PAGINA), 10);
  const orden = p.get("orden") ?? "recientes";
  const q = p.get("q") ?? "";
  if (q.length > MAX_Q) {
    return NextResponse.json({ error: "Búsqueda demasiado larga." }, { status: 400 });
  }

  let pagina;
  try {
    pagina = await buscarConvocatorias({
      q,
      fuente: p.get("fuente") ?? "",
      ambito: p.get("ambito") ?? "",
      ccaa: p.get("ccaa") ?? "",
      orden: ORDENES_VALIDOS.has(orden as Orden) ? (orden as Orden) : "recientes",
      // Number.isFinite descarta NaN de un parámetro inventado; la capa de datos
      // ya recorta los rangos, aquí basta con no pasarle basura.
      desde: Number.isFinite(desde) ? desde : 0,
      cuantas: Number.isFinite(cuantas) ? Math.min(cuantas, MAX_CUANTAS) : POR_PAGINA,
    });
  } catch {
    // La capa de datos ya propaga y registra el error. Lo que importa aquí es
    // no responder 200 con una lista vacía: el buscador trata cualquier
    // respuesta no-ok como fallo y avisa, mientras que un 200 sin elementos lo
    // pinta como «no hay convocatorias que encajen» —que es mentira cuando lo
    // que ha pasado es que la base no contesta.
    return NextResponse.json(
      { error: "No se ha podido consultar la base de datos." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ...pagina,
      desde: Number.isFinite(desde) ? Math.max(0, desde) : 0,
      cuantas: pagina.items.length,
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
