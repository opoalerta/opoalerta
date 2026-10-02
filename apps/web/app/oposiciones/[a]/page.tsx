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
} from "../../components/OposicionesPagina";

/** /oposiciones/<perfil> (toda España) o /oposiciones/<comunidad> (todos los puestos). */
export const revalidate = 3600;

// Son pocas y fijas: se prerenderizan todas.
export function generateStaticParams() {
  return [
    ...PERFILES.map((p) => ({ a: p.slug })),
    ...Object.values(CCAA_SLUG).map((a) => ({ a })),
  ];
}
export const dynamicParams = false;

type Props = { params: Promise<{ a: string }> };

function resolver(a: string) {
  const perfil = PERFIL_POR_SLUG[a] ?? null;
  const ccaa = perfil ? null : (CCAA_POR_SLUG[a] ?? null);
  return perfil || ccaa ? { perfil, ccaa } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolver((await params).a);
  if (!r) return {};
  const datos = await listarOposiciones(r.perfil, r.ccaa);
  return {
    title: tituloOposiciones(r.perfil, r.ccaa),
    description: descripcionOposiciones(r.perfil, r.ccaa, datos),
    alternates: { canonical: hrefOposiciones(r.perfil?.slug ?? null, r.ccaa) },
    robots: datos.totalAnio < MIN_INDEXABLE ? { index: false, follow: true } : undefined,
  };
}

export default async function Page({ params }: Props) {
  const r = resolver((await params).a);
  if (!r) notFound();
  const [datos, conteo] = await Promise.all([
    listarOposiciones(r.perfil, r.ccaa),
    contarOposiciones(PERFILES),
  ]);
  return <OposicionesPagina perfil={r.perfil} ccaa={r.ccaa} datos={datos} conteo={conteo} />;
}
