import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CCAA_POR_SLUG } from "@/lib/ccaa";
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
 * tiene nada: no se prerenderiza ninguna, se generan al pedirlas y quedan en
 * caché. Solo se enlazan (y van al sitemap) las que tienen contenido.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
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
