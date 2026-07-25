import Link from "next/link";
import { notFound } from "next/navigation";
import { getConvocatoriaById } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";
import { Container } from "../../components/Container";
import { JsonLd } from "../../components/JsonLd";

export const dynamic = "force-dynamic";

const CCAA_NOMBRE: Record<string, string> = {
  AN: "Andalucía",
  AR: "Aragón",
  AS: "Asturias",
  CB: "Cantabria",
  CE: "Ceuta",
  CL: "Castilla y León",
  CM: "Castilla-La Mancha",
  CN: "Canarias",
  CT: "Cataluña",
  EX: "Extremadura",
  GA: "Galicia",
  IB: "Illes Balears",
  MC: "Murcia",
  MD: "Madrid",
  ML: "Melilla",
  NC: "Navarra",
  PV: "País Vasco",
  RI: "La Rioja",
  VC: "C. Valenciana",
};

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await getConvocatoriaById(id);
  if (!conv) {
    return {
      title: "Convocatoria no encontrada",
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = getBaseUrl();
  const title = `${conv.titulo} — OpoAlerta`;
  const description = `Convocatoria de empleo público publicada en ${conv.fuente_codigo}: ${conv.titulo}. Organismo: ${conv.organismo}. Consulta plazos, requisitos y enlace oficial en OpoAlerta.`;

  return {
    title,
    description,
    alternates: { canonical: `/convocatoria/${id}` },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/convocatoria/${id}`,
      type: "article",
      locale: "es_ES",
    },
    robots: { index: true, follow: true },
  };
}

export default async function ConvocatoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await getConvocatoriaById(id);
  if (!conv) notFound();

  const baseUrl = getBaseUrl();
  const ambito =
    conv.ambito === "estatal"
      ? "Estatal"
      : CCAA_NOMBRE[conv.ccaa ?? ""] ?? conv.ambito ?? "—";

  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: conv.titulo,
    description: `Convocatoria de empleo público publicada en ${conv.fuente_codigo}.`,
    datePosted: conv.fecha_publicacion,
    validThrough: conv.fecha_fin_plazo,
    hiringOrganization: {
      "@type": "Organization",
      name: conv.organismo,
    },
    employmentType: "FULL_TIME",
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "ES",
        addressRegion: ambito,
      },
    },
    url: `${baseUrl}/convocatoria/${id}`,
    identifier: {
      "@type": "PropertyValue",
      name: conv.fuente_codigo,
      value: id,
    },
  };

  return (
    <Container className="py-12">
      <JsonLd data={jobPosting} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[#595959]">
        <Link href="/" className="text-[#01689b] no-underline hover:underline">
          Inicio
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>Convocatoria</span>
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#595959]">
        <span className="rounded bg-[#f3f5f6] px-2 py-1 font-semibold uppercase text-[#01689b]">
          {conv.fuente_codigo}
        </span>
        <span>{ambito}</span>
        <span className="text-[#999999]">· Publicada el {fmtFecha(conv.fecha_publicacion)}</span>
      </div>

      <h1 className="mb-4 text-3xl font-bold leading-tight text-[#154273] sm:text-4xl">
        {conv.titulo}
      </h1>

      <p className="mb-6 text-lg text-[#595959]">{conv.organismo}</p>

      <dl className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-[#e5e5e5] bg-[#f3f5f6] p-4">
          <dt className="text-sm font-semibold uppercase text-[#595959]">Ámbito</dt>
          <dd className="text-base text-[#1a1a1a]">{ambito}</dd>
        </div>
        <div className="rounded border border-[#e5e5e5] bg-[#f3f5f6] p-4">
          <dt className="text-sm font-semibold uppercase text-[#595959]">Fuente</dt>
          <dd className="text-base text-[#1a1a1a]">{conv.fuente_codigo}</dd>
        </div>
        <div className="rounded border border-[#e5e5e5] bg-[#f3f5f6] p-4">
          <dt className="text-sm font-semibold uppercase text-[#595959]">Publicación</dt>
          <dd className="text-base text-[#1a1a1a]">{fmtFecha(conv.fecha_publicacion)}</dd>
        </div>
        <div className="rounded border border-[#e5e5e5] bg-[#f3f5f6] p-4">
          <dt className="text-sm font-semibold uppercase text-[#595959]">Fin de plazo</dt>
          <dd className="text-base text-[#1a1a1a]">{fmtFecha(conv.fecha_fin_plazo)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-4">
        <a
          href={conv.url_oficial}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded bg-[#01689b] px-6 py-3 text-base font-semibold text-white no-underline hover:bg-[#154273] hover:text-white"
        >
          Ver convocatoria oficial
        </a>
        <Link
          href="/"
          className="inline-flex items-center rounded border border-[#e5e5e5] bg-white px-6 py-3 text-base font-semibold text-[#01689b] no-underline hover:border-[#01689b]"
        >
          Volver al buscador
        </Link>
      </div>
    </Container>
  );
}
