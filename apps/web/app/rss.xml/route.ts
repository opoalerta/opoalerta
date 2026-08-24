import { getConvocatorias } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

// Tampoco lee la petición, y un feed lo pollean los lectores en bucle: sin
// caché, cada uno de ellos despertaba la base de datos.
export const revalidate = 3600;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const base = getBaseUrl();
  const convocatorias = await getConvocatorias(50);

  const items = convocatorias
    .map((c) => {
      const link = `${base}/convocatoria/${encodeURIComponent(c.id)}`;
      const pubDate = new Date(`${c.fecha_publicacion}T00:00:00Z`).toUTCString();
      const desc = `${c.organismo} · ${c.fuente_codigo.toUpperCase()}`;
      return (
        "<item>" +
        `<title>${esc(c.titulo)}</title>` +
        `<link>${link}</link>` +
        `<guid isPermaLink="false">${esc(c.id)}</guid>` +
        `<pubDate>${pubDate}</pubDate>` +
        `<description>${esc(desc)}</description>` +
        "</item>"
      );
    })
    .join("");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' +
    "<channel>" +
    "<title>OpoAlerta — Convocatorias de empleo público</title>" +
    `<link>${base}</link>` +
    `<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>` +
    "<description>Últimas convocatorias de empleo público en España (BOE y boletines autonómicos), agregadas por OpoAlerta.</description>" +
    "<language>es-ES</language>" +
    items +
    "</channel>" +
    "</rss>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
