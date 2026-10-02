import Link from "next/link";
import { CCAA_NOMBRE, CCAA_NOMBRE_LARGO, CCAA_SLUG } from "@/lib/ccaa";
import type { ConteoOposiciones, Convocatoria, ListadoOposiciones } from "@/lib/db";
import { PERFILES, type Perfil } from "@/lib/perfiles";
import { getBaseUrl } from "@/lib/site";
import { Container } from "./Container";
import { ConvocatoriaCard } from "./ConvocatoriaCard";
import { JsonLd } from "./JsonLd";
import { PageHeader } from "./PageHeader";
import { SuscripcionForm } from "./SuscripcionForm";

/** Por debajo de esto la página es fina: se sirve, pero con noindex y sin
    enlazarla desde las demás ni anunciarla en el sitemap. */
export const MIN_INDEXABLE = 3;

export function hrefOposiciones(perfil: string | null, ccaa: string | null): string {
  const partes = ["/oposiciones"];
  if (perfil) partes.push(perfil);
  if (ccaa) partes.push(CCAA_SLUG[ccaa]);
  return partes.join("/");
}

export function tituloOposiciones(perfil: Perfil | null, ccaa: string | null): string {
  const anio = new Date().getFullYear();
  const de = perfil ? ` de ${perfil.en}` : "";
  const en = ccaa ? ` en ${CCAA_NOMBRE_LARGO[ccaa]}` : "";
  return `Oposiciones${de}${en} ${anio}`;
}

export function descripcionOposiciones(
  perfil: Perfil | null,
  ccaa: string | null,
  datos: ListadoOposiciones,
): string {
  const que = tituloOposiciones(perfil, ccaa).replace(/ \d{4}$/, "");
  return (
    `${que}: ${datos.abiertas.length} con plazo abierto y ${datos.totalAnio} publicadas en los ` +
    `últimos 12 meses en el BOE y los boletines autonómicos. Con fecha límite y enlace oficial.`
  );
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Plazo({ c }: { c: Convocatoria }) {
  if (!c.fecha_fin_plazo) return null;
  return (
    <p className="mt-1 px-1 text-xs font-semibold text-navy-700">
      Plazo hasta el {fmtFecha(c.fecha_fin_plazo)}
      {c.fecha_fin_aprox ? " (aprox.)" : ""}
    </p>
  );
}

function Rejilla({ items, plazo }: { items: Convocatoria[]; plazo?: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.id}>
          <ConvocatoriaCard convocatoria={c} />
          {plazo && <Plazo c={c} />}
        </li>
      ))}
    </ul>
  );
}

function Pildoras({ enlaces }: { enlaces: { href: string; label: string; n: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {enlaces.map((e) => (
        <li key={e.href}>
          <Link
            href={e.href}
            className="inline-block rounded border border-border bg-white px-3 py-1 text-navy-700 no-underline hover:border-gold"
          >
            {e.label} <span className="text-slate">· {e.n}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Enlaces a las páginas vecinas que tienen contenido: desde un perfil, ese
 * perfil en cada comunidad; desde una comunidad, cada perfil en ella; desde un
 * par, el perfil en toda España y la comunidad entera. Es lo que deja al robot
 * recorrer todas las combinaciones sin depender solo del sitemap.
 */
function Vecinas({
  perfil,
  ccaa,
  conteo,
}: {
  perfil: Perfil | null;
  ccaa: string | null;
  conteo: ConteoOposiciones;
}) {
  if (perfil && !ccaa) {
    const enlaces = Object.keys(CCAA_SLUG)
      .map((c) => ({ c, n: conteo.porPar[`${perfil.slug}|${c}`] ?? 0 }))
      .filter((x) => x.n >= MIN_INDEXABLE)
      .sort((a, b) => b.n - a.n)
      .map(({ c, n }) => ({ href: hrefOposiciones(perfil.slug, c), label: CCAA_NOMBRE[c], n }));
    if (!enlaces.length) return null;
    return (
      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-navy">
          Oposiciones de {perfil.en} por comunidad
        </h2>
        <Pildoras enlaces={enlaces} />
      </section>
    );
  }
  if (ccaa && !perfil) {
    const enlaces = PERFILES.map((p) => ({ p, n: conteo.porPar[`${p.slug}|${ccaa}`] ?? 0 }))
      .filter((x) => x.n >= MIN_INDEXABLE)
      .sort((a, b) => b.n - a.n)
      .map(({ p, n }) => ({ href: hrefOposiciones(p.slug, ccaa), label: p.nombre, n }));
    if (!enlaces.length) return null;
    return (
      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-navy">
          Por puesto en {CCAA_NOMBRE_LARGO[ccaa]}
        </h2>
        <Pildoras enlaces={enlaces} />
      </section>
    );
  }
  if (perfil && ccaa) {
    const enlaces = [
      { href: hrefOposiciones(perfil.slug, null), label: `${perfil.nombre} en toda España`, n: conteo.porPerfil[perfil.slug] ?? 0 },
      { href: hrefOposiciones(null, ccaa), label: `Todas en ${CCAA_NOMBRE[ccaa]}`, n: conteo.porCcaa[ccaa] ?? 0 },
    ];
    return (
      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-navy">Ampliar la búsqueda</h2>
        <Pildoras enlaces={enlaces} />
      </section>
    );
  }
  return null;
}

export function OposicionesPagina({
  perfil,
  ccaa,
  datos,
  conteo,
}: {
  perfil: Perfil | null;
  ccaa: string | null;
  datos: ListadoOposiciones;
  conteo: ConteoOposiciones;
}) {
  const baseUrl = getBaseUrl();
  const titulo = tituloOposiciones(perfil, ccaa);
  const { abiertas, recientes, totalAnio } = datos;
  const proxima = abiertas.find((c) => c.fecha_fin_plazo);

  const migas: { label: string; href?: string }[] = [
    { label: "Inicio", href: "/" },
    { label: "Oposiciones", href: "/oposiciones" },
  ];
  if (perfil && ccaa) migas.push({ label: perfil.nombre, href: hrefOposiciones(perfil.slug, null) });
  migas.push({ label: perfil && ccaa ? CCAA_NOMBRE[ccaa] : perfil?.nombre ?? CCAA_NOMBRE[ccaa ?? ""] });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.label,
      item: `${baseUrl}${m.href ?? hrefOposiciones(perfil?.slug ?? null, ccaa)}`,
    })),
  };
  const lista = abiertas.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: titulo,
        numberOfItems: abiertas.length,
        itemListElement: abiertas.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${baseUrl}/convocatoria/${encodeURIComponent(c.id)}`,
          name: c.titulo,
        })),
      }
    : null;

  const lead =
    `${abiertas.length} ${abiertas.length === 1 ? "convocatoria" : "convocatorias"} con plazo ` +
    `abierto ahora y ${totalAnio} publicadas en los últimos 12 meses, recogidas a diario del BOE ` +
    `y los boletines autonómicos.` +
    (proxima?.fecha_fin_plazo
      ? ` La próxima en cerrar, el ${fmtFecha(proxima.fecha_fin_plazo)}.`
      : "");

  return (
    <Container className="py-12">
      <JsonLd data={breadcrumb} />
      {lista && <JsonLd data={lista} />}

      <PageHeader title={titulo} lead={lead} breadcrumbs={migas} />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-navy">Plazo abierto</h2>
        {abiertas.length ? (
          <Rejilla items={abiertas} plazo />
        ) : (
          <p className="rounded border border-dashed border-border p-5 text-slate">
            Ahora mismo no hay ninguna con el plazo abierto. Crea una alerta y te avisamos en
            cuanto se publique la siguiente.
          </p>
        )}
      </section>

      <SuscripcionForm q={perfil?.busqueda ?? ""} fuente="" ambito="" ccaa={ccaa ?? ""} />

      {recientes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-xl font-semibold text-navy">Cerradas en los últimos meses</h2>
          <p className="mb-4 text-sm text-slate">
            Para hacerse una idea de cada cuánto salen y quién las convoca.
          </p>
          <Rejilla items={recientes} />
        </section>
      )}

      <Vecinas perfil={perfil} ccaa={ccaa} conteo={conteo} />

      <p className="mt-12 text-sm text-slate">
        Las convocatorias se reconocen por el título publicado en el boletín, así que puede
        faltar alguna redactada de otra forma. Para buscar con tus propias palabras, usa el{" "}
        <Link href="/#convocatorias">buscador de la portada</Link>.
      </p>
    </Container>
  );
}
