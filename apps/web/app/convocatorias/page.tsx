import type { Metadata } from "next";
import { listarArchivo, POR_PAGINA_ARCHIVO } from "@/lib/db";
import { ArchivoLista, hrefPagina, tituloPagina } from "../components/ArchivoLista";

/**
 * Primera página del archivo completo de convocatorias.
 *
 * El buscador de la portada es un componente de cliente que pide a
 * `/api/convocatorias`, y esa ruta está en `Disallow`. Así que las ~1.400 fichas
 * no tenían ni un enlace que un rastreador pudiera seguir: existían en el
 * sitemap y en ningún otro sitio, que es la señal de descubrimiento más débil
 * que hay, y Google las dejaba en «Descubierta: actualmente sin indexar».
 * El archivo es el camino de rastreo que faltaba — enlaces corrientes, sin
 * JavaScript de por medio, desde la portada hasta la ficha más antigua.
 *
 * Lista **todas**, también las de plazo cerrado, con el mismo criterio que el
 * sitemap: su página de detalle sigue existiendo, y es lo que busca en Google
 * quien recuerda una convocatoria concreta meses después.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: tituloPagina(1),
  description:
    "Archivo completo de convocatorias de empleo público y oposiciones publicadas en el BOE " +
    "y en los boletines autonómicos, ordenadas de más reciente a más antigua.",
  alternates: { canonical: hrefPagina(1) },
};

export default async function ArchivoPage() {
  const { items, total } = await listarArchivo(1);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_ARCHIVO));

  return (
    <ArchivoLista items={items} total={total} pagina={1} totalPaginas={totalPaginas} />
  );
}
