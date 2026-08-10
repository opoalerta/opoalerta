import Link from "next/link";
import { notFound } from "next/navigation";
import { getConvocatoriaById } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";
import { Container } from "../../components/Container";
import { JsonLd } from "../../components/JsonLd";

// Una convocatoria publicada ya no cambia: el organismo, el plazo y el enlace
// oficial son los del boletín. Con `force-dynamic` cada visita golpeaba Postgres
// y Vercel respondía `no-store`, así que Googlebot pagaba el precio completo por
// cada una de las ~1400 fichas y se le acababa el presupuesto de rastreo antes
// de llegar a las viejas. La ingesta corre una vez al día; una hora de margen
// sobra para recoger correcciones.
export const revalidate = 3600;

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

function getAmbito(conv: NonNullable<Awaited<ReturnType<typeof getConvocatoriaById>>>) {
  if (conv.ambito === "estatal") return "Estatal";
  if (conv.ambito === "europeo") return "Unión Europea";
  return CCAA_NOMBRE[conv.ccaa ?? ""] ?? conv.ambito ?? "—";
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
  const ambito = getAmbito(conv);
  const title = `Convocatoria de empleo público: ${conv.titulo} — ${conv.organismo} | OpoAlerta`;
  const description = `Convocatoria de empleo público publicada en ${conv.fuente_codigo}: ${conv.titulo}. Organismo: ${conv.organismo}. Ámbito: ${ambito}. Consulta plazos, requisitos y enlace oficial en OpoAlerta.`;

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
  const ambito = getAmbito(conv);

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

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Convocatoria",
        item: `${baseUrl}/convocatoria/${id}`,
      },
    ],
  };

  return (
    <Container className="py-12">
      <JsonLd data={[breadcrumb, jobPosting]} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate">
        <Link href="/" className="text-navy-700 no-underline hover:underline">
          Inicio
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>Convocatoria</span>
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate">
        <span className="rounded bg-cream px-2 py-1 font-semibold uppercase text-navy-700">
          {conv.fuente_codigo}
        </span>
        <span>{ambito}</span>
        <span className="text-slate">· Publicada el {fmtFecha(conv.fecha_publicacion)}</span>
      </div>

      <h1 className="mb-4 text-3xl font-bold leading-tight text-navy sm:text-4xl">
        {conv.titulo}
      </h1>

      <p className="mb-6 text-lg text-slate">{conv.organismo}</p>

      <dl className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-border bg-cream p-4">
          <dt className="text-sm font-semibold uppercase text-slate">Ámbito</dt>
          <dd className="text-base text-ink">{ambito}</dd>
        </div>
        <div className="rounded border border-border bg-cream p-4">
          <dt className="text-sm font-semibold uppercase text-slate">Fuente</dt>
          <dd className="text-base text-ink">{conv.fuente_codigo}</dd>
        </div>
        <div className="rounded border border-border bg-cream p-4">
          <dt className="text-sm font-semibold uppercase text-slate">Publicación</dt>
          <dd className="text-base text-ink">{fmtFecha(conv.fecha_publicacion)}</dd>
        </div>
        <div className="rounded border border-border bg-cream p-4">
          <dt className="text-sm font-semibold uppercase text-slate">Fin de plazo</dt>
          <dd className="text-base text-ink">
            {conv.fecha_fin_plazo
              ? `${conv.fecha_fin_aprox ? "≈ " : ""}${fmtFecha(conv.fecha_fin_plazo)}${
                  conv.fecha_fin_aprox ? " (aprox.)" : ""
                }`
              : conv.plazo_texto
                ? conv.plazo_texto
                : "—"}
          </dd>
          {(conv.fecha_fin_aprox || (!conv.fecha_fin_plazo && conv.plazo_texto)) && (
            <p className="mt-1 text-xs text-slate">
              {conv.fecha_fin_aprox
                ? "Fecha estimada en días hábiles (sin festivos autonómicos); confirma en la convocatoria."
                : "Plazo según el texto oficial; confirma la fecha exacta en la convocatoria."}
            </p>
          )}
        </div>
      </dl>

      <div className="flex flex-wrap gap-4">
        <a
          href={conv.url_oficial}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded bg-gold px-6 py-3 text-base font-semibold text-navy no-underline hover:bg-navy hover:text-white"
        >
          Ver convocatoria oficial
        </a>
        <Link
          href="/"
          className="inline-flex items-center rounded border border-border bg-white px-6 py-3 text-base font-semibold text-navy-700 no-underline hover:border-gold"
        >
          Volver al buscador
        </Link>
      </div>
    </Container>
  );
}
