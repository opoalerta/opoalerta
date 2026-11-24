import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CCAA_POR_SLUG, CCAA_SLUG } from "@/lib/ccaa";
import { contarOposiciones, listarOposiciones } from "@/lib/db";
import { PERFIL_POR_SLUG, PERFILES } from "@/lib/perfiles";
import {
  descripcionOposiciones,
  hrefOposiciones,
  MIN_INDEXABLE,
  OposicionesPagina,
  tituloOposiciones,
} from "../../../components/OposicionesPagina";

/**
 * /oposiciones/<perfil>/<comunidad>. Son 28 × 19 combinaciones y la mayoría no
 * tiene nada. Solo se enlazan (y van al sitemap) las que tienen contenido, y
 * solo esas se prerenderizan en el build de producción: es lo que antes pedía
 * `calentar.yml` tras cada deploy, una escritura ISR por página (ver la ficha,
 * app/convocatoria/[id]/page.tsx). Las demás se generan al pedirlas y quedan
 * en caché.
 */
export const revalidate = false;

export async function generateStaticParams() {
  if (process.env.VERCEL_ENV !== "production") return [];
  const conteo = await contarOposiciones(PERFILES);
  return PERFILES.flatMap((p) =>
    Object.entries(CCAA_SLUG)
      .filter(([c]) => (conteo.porPar[`${p.slug}|${c}`] ?? 0) >= MIN_INDEXABLE)
      .map(([, slug]) => ({ a: p.slug, b: slug })),
  );
}

type Props = { params: Promise<{ a: string; b: string }> };

function resolver({ a, b }: { a: string; b: string }) {
  const perfil = PERFIL_POR_SLUG[a];
  const ccaa = CCAA_POR_SLUG[b];
  return perfil && ccaa ? { perfil, ccaa } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolver(await params);
  if (!r) return {};
  const datos = await listarOposiciones(r.perfil, r.ccaa);
  return {
    title: tituloOposiciones(r.perfil, r.ccaa),
    description: descripcionOposiciones(r.perfil, r.ccaa, datos),
    alternates: { canonical: hrefOposiciones(r.perfil.slug, r.ccaa) },
    robots: datos.totalAnio < MIN_INDEXABLE ? { index: false, follow: true } : undefined,
  };
}

export default async function Page({ params }: Props) {
  const r = resolver(await params);
  if (!r) notFound();
  const [datos, conteo] = await Promise.all([
    listarOposiciones(r.perfil, r.ccaa),
    contarOposiciones(PERFILES),
  ]);
  return <OposicionesPagina perfil={r.perfil} ccaa={r.ccaa} datos={datos} conteo={conteo} />;
}
