import type { Metadata } from "next";
import Link from "next/link";
import { CCAA_NOMBRE, CCAA_SLUG } from "@/lib/ccaa";
import { contarOposiciones } from "@/lib/db";
import { PERFILES } from "@/lib/perfiles";
import { Container } from "../components/Container";
import { hrefOposiciones, MIN_INDEXABLE } from "../components/OposicionesPagina";
import { PageHeader } from "../components/PageHeader";

/**
 * Índice de /oposiciones: por puesto y por comunidad.
 *
 * Lo que la gente busca es «oposiciones de auxiliar administrativo en
 * Andalucía», no «convocatorias del BOJA». La portada responde a eso con un
 * buscador de cliente que ningún rastreador ejecuta; estas páginas lo
 * responden con HTML.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Oposiciones por puesto y comunidad autónoma",
  description:
    "Oposiciones abiertas y recientes por puesto (auxiliar administrativo, policía local, " +
    "enfermería, maestros…) y por comunidad autónoma, recogidas a diario del BOE y los " +
    "boletines autonómicos.",
  alternates: { canonical: "/oposiciones" },
};

const tarjeta =
  "flex items-baseline justify-between gap-3 rounded border border-border bg-white px-4 py-3 " +
  "no-underline shadow-sm transition hover:border-gold";

export default async function OposicionesIndice() {
  const conteo = await contarOposiciones(PERFILES);
  const perfiles = PERFILES.map((p) => ({ p, n: conteo.porPerfil[p.slug] ?? 0 }))
    .filter((x) => x.n >= MIN_INDEXABLE)
    .sort((a, b) => b.n - a.n);
  const ccaas = Object.keys(CCAA_SLUG)
    .map((c) => ({ c, n: conteo.porCcaa[c] ?? 0 }))
    .filter((x) => x.n >= MIN_INDEXABLE)
    .sort((a, b) => CCAA_NOMBRE[a.c].localeCompare(CCAA_NOMBRE[b.c], "es-ES"));

  return (
    <Container className="py-12">
      <PageHeader
        title="Oposiciones por puesto y comunidad"
        lead="Las convocatorias de los últimos 12 meses agrupadas por puesto y por comunidad autónoma, con las que tienen el plazo abierto ahora primero."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Oposiciones" }]}
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-navy">Por puesto</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perfiles.map(({ p, n }) => (
            <li key={p.slug}>
              <Link href={hrefOposiciones(p.slug, null)} className={tarjeta}>
                <span className="font-semibold text-ink">{p.nombre}</span>
                <span className="text-sm text-slate">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-navy">Por comunidad autónoma</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ccaas.map(({ c, n }) => (
            <li key={c}>
              <Link href={hrefOposiciones(null, c)} className={tarjeta}>
                <span className="font-semibold text-ink">{CCAA_NOMBRE[c]}</span>
                <span className="text-sm text-slate">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate">
          Solo aparecen las comunidades cuyo boletín ya recogemos. El estado de cada fuente está
          en <Link href="/estado">/estado</Link>.
        </p>
      </section>
    </Container>
  );
}
