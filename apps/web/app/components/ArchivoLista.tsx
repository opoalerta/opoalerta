import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import type { Convocatoria } from "@/lib/db";
import { Container } from "./Container";
import { ConvocatoriaCard } from "./ConvocatoriaCard";
import { JsonLd } from "./JsonLd";
import { PageHeader } from "./PageHeader";

/**
 * Página 1 vive en `/convocatorias`; el resto cuelga de `/convocatorias/pagina/N`.
 *
 * Van en segmentos de ruta y no en `?page=`, porque leer `searchParams` obliga a
 * Next a renderizar en cada petición, y estas páginas existen precisamente para
 * que un rastreador con poco presupuesto pueda recorrerlas baratas.
 */
export function hrefPagina(pagina: number): string {
  return pagina <= 1 ? "/convocatorias" : `/convocatorias/pagina/${pagina}`;
}

export function tituloPagina(pagina: number): string {
  return pagina > 1
    ? `Todas las convocatorias de empleo público (página ${pagina})`
    : "Todas las convocatorias de empleo público";
}

export function ArchivoLista({
  items,
  total,
  pagina,
  totalPaginas,
}: {
  items: Convocatoria[];
  total: number;
  pagina: number;
  totalPaginas: number;
}) {
  const baseUrl = getBaseUrl();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Todas las convocatorias",
        item: `${baseUrl}${hrefPagina(pagina)}`,
      },
    ],
  };

  return (
    <Container className="py-12">
      <JsonLd data={breadcrumb} />

      <PageHeader
        title="Todas las convocatorias"
        lead={
          `Archivo completo, de la más reciente a la más antigua: ${total} convocatorias ` +
          `recogidas del BOE y de los boletines autonómicos, cada una con enlace a su ` +
          `publicación oficial.`
        }
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Todas las convocatorias" }]}
      />

      <p className="mb-6 text-sm text-slate">
        Página {pagina} de {totalPaginas}. Para buscar una en concreto, el{" "}
        <Link href="/#convocatorias">buscador de la portada</Link> filtra por texto, fuente
        y ámbito.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <li key={c.id}>
            <ConvocatoriaCard convocatoria={c} />
          </li>
        ))}
      </ul>

      <nav aria-label="Paginación del archivo" className="mt-10 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-4">
          {pagina > 1 ? (
            <Link
              href={hrefPagina(pagina - 1)}
              rel="prev"
              className="rounded border border-border bg-white px-4 py-2 font-semibold text-navy-700 no-underline hover:border-gold"
            >
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {pagina < totalPaginas && (
            <Link
              href={hrefPagina(pagina + 1)}
              rel="next"
              className="rounded border border-border bg-white px-4 py-2 font-semibold text-navy-700 no-underline hover:border-gold"
            >
              Siguientes →
            </Link>
          )}
        </div>

        {/*
          Solo con prev/next, la última página del archivo quedaría a 30 saltos
          en fila de la portada — y ahí es justo donde están las fichas antiguas
          que no enlaza nadie. Con la lista completa, cualquiera está a dos clics.
        */}
        <ol className="mt-6 flex flex-wrap gap-2 text-sm">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              {n === pagina ? (
                <span
                  aria-current="page"
                  className="inline-block rounded bg-navy px-3 py-1 font-semibold text-white"
                >
                  {n}
                </span>
              ) : (
                <Link
                  href={hrefPagina(n)}
                  className="inline-block rounded border border-border px-3 py-1 text-navy-700 no-underline hover:border-gold"
                >
                  {n}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </Container>
  );
}
