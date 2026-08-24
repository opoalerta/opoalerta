import Link from "next/link";
import { notFound } from "next/navigation";
import { getConvocatoriaById, type ConvocatoriaDetalle } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";
import { tituloCorto } from "@/lib/titulo";
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

function getAmbito(conv: ConvocatoriaDetalle) {
  if (conv.ambito === "estatal") return "Estatal";
  if (conv.ambito === "europeo") return "Unión Europea";
  return CCAA_NOMBRE[conv.ccaa ?? ""] ?? conv.ambito ?? "—";
}

/**
 * Fin de plazo en ISO 8601 **con hora**, para el `validThrough` del JobPosting.
 *
 * Google entiende una fecha sin hora como las 00:00 de ese día, así que mandar
 * la fecha pelada retiraba la oferta de los resultados el día antes de que se
 * cerrara el plazo de verdad. Se emite el final del día con el desfase horario
 * real de la convocatoria —Canarias va una hora por detrás de la península, y
 * el resto alterna CET/CEST según la fecha—, no con uno fijo.
 *
 * Devuelve `undefined` cuando no hay fecha (la mayoría: el boletín solo da el
 * plazo en texto). Ahí la clave se omite; mandar `validThrough: null` es peor
 * que no mandarla.
 */
function getValidThrough(conv: ConvocatoriaDetalle): string | undefined {
  const fecha = conv.fecha_fin_plazo;
  if (!fecha) return undefined;

  const zona = conv.ccaa === "CN" ? "Atlantic/Canary" : "Europe/Madrid";
  const bruto =
    new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${fecha}T12:00:00Z`))
      .find((parte) => parte.type === "timeZoneName")?.value ?? "GMT+01:00";
  // "GMT+02:00" -> "+02:00". Con desfase cero el formato es "GMT" a secas.
  const desfase = bruto === "GMT" ? "+00:00" : bruto.replace("GMT", "");

  return `${fecha}T23:59:59${desfase}`;
}

/** Escapa el texto del boletín para poder incrustarlo en el HTML de `description`. */
function esc(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * `description` del JobPosting. Es campo obligatorio y Google valora su
 * contenido, así que en vez de una frase de relleno se arma con lo que la
 * ingesta sí guarda de cada convocatoria (cuerpo, grupo, plazas, titulación,
 * acceso y plazo). Va en HTML porque es lo que pide la documentación.
 */
function getDescripcion(conv: ConvocatoriaDetalle, ambito: string): string {
  const datos: string[] = [];
  if (conv.cuerpo) datos.push(`Cuerpo o escala: ${esc(conv.cuerpo)}`);
  if (conv.grupo) datos.push(`Grupo de clasificación: ${esc(conv.grupo)}`);
  if (conv.num_plazas !== null) datos.push(`Plazas convocadas: ${conv.num_plazas}`);
  if (conv.titulacion_requerida)
    datos.push(`Titulación requerida: ${esc(conv.titulacion_requerida)}`);
  if (conv.tipo_acceso) datos.push(`Sistema de acceso: ${esc(conv.tipo_acceso)}`);

  const plazo = conv.fecha_fin_plazo
    ? `Plazo de presentación de solicitudes hasta el ${fmtFecha(conv.fecha_fin_plazo)}${
        conv.fecha_fin_aprox ? " (fecha estimada en días hábiles)" : ""
      }.`
    : conv.plazo_texto
      ? `Plazo de presentación de solicitudes: ${esc(conv.plazo_texto)}.`
      : "El plazo de presentación consta en el texto oficial de la convocatoria.";

  return [
    `<p>${esc(conv.titulo)}. Convocatoria de empleo público de ${esc(conv.organismo)}`,
    ` (ámbito: ${esc(ambito)}), publicada en ${esc(conv.fuente_codigo)}`,
    ` el ${fmtFecha(conv.fecha_publicacion)}.</p>`,
    datos.length ? `<ul>${datos.map((dato) => `<li>${dato}</li>`).join("")}</ul>` : "",
    `<p>${plazo} Las solicitudes se presentan ante el organismo convocante,`,
    " conforme a las bases publicadas en el boletín oficial.</p>",
  ].join("");
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
  // Sin «| OpoAlerta»: el layout ya aplica `template: "%s — OpoAlerta"`, así que
  // las fichas se estaban publicando como «… | OpoAlerta — OpoAlerta».
  //
  // Sin «Convocatoria de empleo público:» tampoco: eran 31 caracteres iguales en
  // las 2.800 fichas por delante de lo único que las distingue. El organismo va
  // detrás del asunto ya recortado para que quepa dentro de los ~60 que enseña
  // Google; los términos de búsqueda siguen en la description y en el H1.
  const title = `${tituloCorto(conv.titulo)} — ${conv.organismo}`;
  // Misma enfermedad que el título: la description arrancaba con una frase fija
  // y metía el título del boletín entero, así que el fragmento que enseña Google
  // —unos 155 caracteres— se iba en «RESOLUCIÓN de 31 de julio de 2026, de la…».
  // Ahora abre por el asunto, y el contexto (organismo, ámbito, fuente) va
  // detrás, que es el orden en que sirve para decidir si abres el resultado.
  const asunto = tituloCorto(conv.titulo, 90);
  const description =
    `${asunto}${asunto.endsWith("…") ? "" : "."} Convocatoria de empleo público de ` +
    `${conv.organismo} (${ambito}), publicada en ${conv.fuente_codigo}. ` +
    `Plazos y enlace al texto oficial.`;

  return {
    title,
    description,
    alternates: { canonical: `/convocatoria/${id}` },
    openGraph: {
      // El `template` del layout no llega a openGraph, así que la marca va aquí
      // a mano; si no, la tarjeta compartida sale sin ella.
      title: `${title} | OpoAlerta`,
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

  const validThrough = getValidThrough(conv);

  // Search Console avisa de tres campos recomendados que aquí no se rellenan a
  // propósito, y que no hay que "arreglar" inventándolos:
  //   - streetAddress / postalCode / addressLocality: una convocatoria de un
  //     boletín no trae domicilio. El destino suele ser toda una comunidad o
  //     todo el Estado, y el organismo convocante no es el centro de trabajo.
  //   - baseSalary: no existe en la tabla ni en la fuente. Deducirlo del grupo
  //     (A1, C2…) sería un sueldo inventado: depende del complemento
  //     específico de cada plaza y de los PGE del año.
  // Son campos recomendados, no obligatorios: sin ellos el elemento sigue
  // siendo válido, y rellenarlos a ojo sería datos estructurados falsos.
  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: conv.titulo,
    description: getDescripcion(conv, ambito),
    datePosted: conv.fecha_publicacion,
    ...(validThrough ? { validThrough } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: conv.organismo,
    },
    // La inmensa mayoría de las plazas de empleo público son de jornada
    // completa y el boletín no distingue, así que se asume FULL_TIME.
    employmentType: "FULL_TIME",
    // La solicitud no se tramita en OpoAlerta: se va al organismo convocante.
    directApply: false,
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
