import { NextResponse } from "next/server";
import { buscarConvocatorias, POR_PAGINA } from "@/lib/db";

export const runtime = "nodejs";
// Los datos cambian con cada ingesta diaria; servir una página cacheada
// mostraría convocatorias que ya no están o esconderá las recién publicadas.
export const dynamic = "force-dynamic";

/**
 * Búsqueda paginada de convocatorias.
 *
 * GET /api/convocatorias?q=&fuente=&ambito=&desde=0&cuantas=24
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

  const pagina = await buscarConvocatorias({
    q: p.get("q") ?? "",
    fuente: p.get("fuente") ?? "",
    ambito: p.get("ambito") ?? "",
    // Number.isFinite descarta NaN de un parámetro inventado; la capa de datos
    // ya recorta los rangos, aquí basta con no pasarle basura.
    desde: Number.isFinite(desde) ? desde : 0,
    cuantas: Number.isFinite(cuantas) ? cuantas : POR_PAGINA,
  });

  return NextResponse.json({
    ...pagina,
    desde: Number.isFinite(desde) ? Math.max(0, desde) : 0,
    cuantas: pagina.items.length,
  });
}
