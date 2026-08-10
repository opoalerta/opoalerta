import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contarPaginasArchivo, listarArchivo, POR_PAGINA_ARCHIVO } from "@/lib/db";
import { ArchivoLista, hrefPagina, tituloPagina } from "../../../components/ArchivoLista";

/** Ver el porqué del archivo en `app/convocatorias/page.tsx`. */
export const revalidate = 3600;

/**
 * Se prerenderizan todas las páginas que existen hoy. Las que aparezcan después
 * (la ingesta añade convocatorias a diario) se generan bajo demanda y quedan
 * cacheadas igual, gracias a `dynamicParams` — activo por defecto.
 */
export async function generateStaticParams() {
  const totalPaginas = await contarPaginasArchivo();
  // La 1 tiene su propia ruta, `/convocatorias`, para no duplicar el listado.
  return Array.from({ length: Math.max(0, totalPaginas - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

function parsePagina(n: string): number {
  // Solo dígitos: "02" o "2e1" apuntarían al mismo listado con otra URL.
  if (!/^[1-9]\d*$/.test(n)) return 0;
  return Number(n);
}

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = parsePagina((await params).n);
  if (pagina < 2) return { title: "Archivo de convocatorias", robots: { index: false } };

  return {
    title: tituloPagina(pagina),
    description:
      `Archivo completo de convocatorias de empleo público y oposiciones del BOE y los ` +
      `boletines autonómicos, ordenadas de más reciente a más antigua. Página ${pagina}.`,
    // Cada página es canónica de sí misma: son listados distintos, no variantes
    // de la primera. Apuntarlas todas a /convocatorias haría que Google
    // descartara justo las que llevan a las fichas más antiguas.
    alternates: { canonical: hrefPagina(pagina) },
  };
}

export default async function ArchivoPaginaPage({ params }: Props) {
  const pagina = parsePagina((await params).n);
  // La 1 se sirve desde /convocatorias; /convocatorias/pagina/1 no existe.
  if (pagina < 2) notFound();

  const { items, total } = await listarArchivo(pagina);
  if (items.length === 0) notFound();

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_ARCHIVO));

  return (
    <ArchivoLista items={items} total={total} pagina={pagina} totalPaginas={totalPaginas} />
  );
}
