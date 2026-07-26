import { getBaseUrl } from "@/lib/site";
import { getConvocatorias, getConvocatoriasEuropeas, getEstado } from "@/lib/db";
import { Container } from "./components/Container";
import { ConvocatoriaCard } from "./components/ConvocatoriaCard";
import { ConvocatoriaSearch } from "./components/ConvocatoriaSearch";
import { FeatureBlock } from "./components/FeatureBlock";
import { JsonLd } from "./components/JsonLd";
import { NoticeBox } from "./components/NoticeBox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "OpoAlerta — Convocatorias de empleo público en España",
  description:
    "Buscador gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España. Datos oficiales del BOE y boletines autonómicos, con alertas por email.",
  alternates: { canonical: "/" },
};

const FUENTES = [
  { codigo: "BOE", nombre: "Boletín Oficial del Estado", estado: "activo" },
  { codigo: "BOJA", nombre: "Boletín Oficial de la Junta de Andalucía", estado: "activo" },
  { codigo: "BOCM", nombre: "Boletín Oficial de la Comunidad de Madrid", estado: "activo" },
  { codigo: "BOCYL", nombre: "Boletín Oficial de Castilla y León", estado: "activo" },
  { codigo: "BOA", nombre: "Boletín Oficial de Aragón", estado: "activo" },
  { codigo: "BOIB", nombre: "Butlletí Oficial de les Illes Balears", estado: "activo" },
  { codigo: "EPSO", nombre: "Oposiciones de la Unión Europea (EPSO)", estado: "activo" },
  { codigo: "DOGV", nombre: "Diari Oficial de la Generalitat Valenciana", estado: "previsto" },
  { codigo: "DOG", nombre: "Diario Oficial de Galicia", estado: "activo" },
  { codigo: "BOC", nombre: "Boletín Oficial de Canarias", estado: "activo" },
  { codigo: "DOCM", nombre: "Diario Oficial de Castilla-La Mancha", estado: "activo" },
  { codigo: "DOE", nombre: "Diario Oficial de Extremadura", estado: "activo" },
  { codigo: "BORME", nombre: "Boletín Oficial del Registro Mercantil", estado: "no aplica" },
];

const FAQ = [
  {
    question: "¿Es gratis usar OpoAlerta?",
    answer:
      "Sí. No hay publicidad, no se venden datos ni se cobra por avisos. Es un proyecto cívico mantenido por voluntarios y con licencias abiertas.",
  },
  {
    question: "¿De dónde sacáis las convocatorias?",
    answer:
      "Directamente de los boletines oficiales: BOE y, progresivamente, los 19 boletines autonómicos. Cada convocatoria incluye enlace y fecha de la fuente original.",
  },
  {
    question: "¿Cómo puedo recibir alertas?",
    answer:
      "Puedes suscribirte por email desde la página principal. Guarda una búsqueda con tus filtros y te avisamos cuando salga una convocatoria que encaje contigo.",
  },
  {
    question: "¿Puedo contribuir o replicar el proyecto?",
    answer:
      "Sí. El código es AGPL-3.0, la documentación CC BY-SA 4.0 y los datos transformados ODbL-1.0. Puedes añadir un boletín, mejorar la web o desplegar tu propia instancia.",
  },
];

export default async function Home() {
  const convocatorias = await getConvocatorias();
  const europeas = await getConvocatoriasEuropeas(9);
  const estado = await getEstado();

  const activas = estado.filter((e) => e.estado === "ok").length;
  const totalConvocatorias = estado.reduce((sum, e) => sum + e.total, 0);
  const ultimaActualizacion = estado
    .filter((e) => e.ultima_ingesta)
    .map((e) => e.ultima_ingesta!)
    .sort()
    .at(-1);

  const baseUrl = getBaseUrl();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "OpoAlerta",
      url: baseUrl,
      inLanguage: "es-ES",
      description:
        "Buscador unificado y gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "OpoAlerta",
      url: baseUrl,
      sameAs: ["https://github.com/opoalerta/opoalerta"],
      logo: `${baseUrl}/icon.svg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${baseUrl}/#webpage`,
      url: baseUrl,
      name: "OpoAlerta — Convocatorias de empleo público en España",
      description:
        "Buscador unificado y gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España.",
      isPartOf: { "@id": `${baseUrl}/#website` },
      inLanguage: "es-ES",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <section className="bg-cream py-16">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 inline-block rounded bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Proyecto cívico · Open source
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              Todas las convocatorias de empleo público de España, en un solo sitio.
            </h1>
            <p className="mt-6 text-xl text-slate">
              OpoAlerta agrega automáticamente las oposiciones del BOE y los boletines
              autonómicos. Gratis, sin publicidad, con el código y los datos abiertos.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#convocatorias"
                className="inline-flex items-center rounded bg-gold px-6 py-3 text-base font-semibold text-navy no-underline shadow-sm hover:bg-gold-dark hover:text-navy-900 focus-visible:outline-offset-2"
              >
                Buscar convocatorias
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <NoticeBox title="Cobertura nacional en expansión" variant="info">
            {activas > 0 ? (
              <>
                Ya rastreamos <strong>{activas} boletines oficiales</strong> (BOE, boletines
                autonómicos y las oposiciones de la UE)
                {totalConvocatorias > 0 && (
                  <>
                    {" "}
                    con <strong>{totalConvocatorias} convocatorias</strong> abiertas
                  </>
                )}{" "}
                y vamos sumando el resto de comunidades. La ingesta corre cada día a las
                06:00 UTC.{" "}
                {ultimaActualizacion && (
                  <>
                    Última actualización:{" "}
                    <time dateTime={ultimaActualizacion}>
                      {new Date(ultimaActualizacion).toLocaleDateString("es-ES", {
                        dateStyle: "medium",
                      })}
                    </time>
                    .{" "}
                  </>
                )}
                Si ves algo incorrecto, puedes{" "}
                <a href="https://github.com/opoalerta/opoalerta/issues">abrir una incidencia</a>.
              </>
            ) : (
              <>
                La ingesta del BOE ya está activa y corre cada día a las 06:00 UTC. Vamos
                incorporando los boletines autonómicos para cubrir toda España. Si ves algo
                incorrecto, puedes{" "}
                <a href="https://github.com/opoalerta/opoalerta/issues">abrir una incidencia</a>.
              </>
            )}
          </NoticeBox>
        </Container>
      </section>

      <section id="convocatorias" className="py-8">
        <Container>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy">Últimas convocatorias</h2>
            <p className="mt-1 text-slate">
              Consulta las últimas publicaciones o filtra por puesto, organismo o fuente.
            </p>
          </div>
          <ConvocatoriaSearch convocatorias={convocatorias} />
        </Container>
      </section>

      {europeas.length > 0 && (
        <section className="border-t border-border bg-cream py-12">
          <Container>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-navy">
                <span aria-hidden="true">🇪🇺</span> Oposiciones de la Unión Europea
              </h2>
              <p className="mt-1 text-slate">
                Convocatorias de las instituciones de la UE (EPSO), abiertas a
                nacionales de cualquier país de la UE — también a los españoles.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {europeas.map((c) => (
                <li key={c.id}>
                  <ConvocatoriaCard convocatoria={c} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-cream py-16">
        <Container>
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-navy">Cómo funciona</h2>
            <p className="mt-1 text-slate">
              Tres pasos para pasar de cientos de portales a una lista clara y usable.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureBlock number="1" title="Ingesta diaria">
              Cada madrugada descargamos los sumarios de los boletines oficiales con
              GitHub Actions. Si un boletín cambia de formato, se abre automáticamente
              una incidencia etiquetada como <code>scraper-roto</code>.
            </FeatureBlock>
            <FeatureBlock number="2" title="Normalización">
              Extraemos título, organismo, ámbito, comunidad, plazo y enlace oficial.
              Todo se guarda en un esquema común para poder buscar y comparar.
            </FeatureBlock>
            <FeatureBlock number="3" title="Alertas y búsqueda">
              Pronto podrás guardar filtros (cuerpo, CCAA, titulación…) y recibir avisos
              por email o Telegram cuando salga una plaza que encaje contigo.
            </FeatureBlock>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy">Fuentes oficiales</h2>
            <p className="mt-1 text-slate">
              Usamos exclusivamente datos públicos y citamos siempre la fuente original.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUENTES.map((f) => (
              <li
                key={f.codigo}
                className="flex items-center justify-between rounded border border-border bg-white p-4"
              >
                <div>
                  <span className="block text-base font-semibold text-navy-700">
                    {f.codigo}
                  </span>
                  <span className="text-sm text-slate">{f.nombre}</span>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold uppercase ${
                    f.estado === "activo"
                      ? "bg-success-bg text-success"
                      : f.estado === "previsto"
                        ? "bg-cream text-slate"
                        : "bg-danger-bg text-danger"
                  }`}
                >
                  {f.estado}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate">
            El objetivo es cubrir los 19 boletines autonómicos. Si falta el tuyo, puedes{" "}
            <a href="https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md">
              añadirlo siguiendo esta guía
            </a>
            .
          </p>
        </Container>
      </section>

      <section className="bg-cream py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy">Open source y contribución</h2>
            <p className="mt-1 text-slate">
              El proyecto vive en GitHub y mejora con la comunidad.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Código", href: "https://github.com/opoalerta/opoalerta", desc: "AGPL-3.0" },
              { label: "Contribuir", href: "https://github.com/opoalerta/opoalerta/blob/main/CONTRIBUTING.md", desc: "Guía paso a paso" },
              { label: "Roadmap", href: "https://github.com/opoalerta/opoalerta/blob/main/ROADMAP.md", desc: "Fases 0-3" },
              { label: "Estado", href: "/estado", desc: "Ingestas y salud" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block rounded border border-border bg-white p-4 no-underline shadow-sm transition hover:border-gold"
              >
                <span className="block text-base font-semibold text-navy-700">
                  {item.label}
                </span>
                <span className="text-sm text-slate">{item.desc}</span>
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy">Preguntas frecuentes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="mb-1 text-lg font-semibold text-navy">
                  {item.question}
                </h3>
                <p className="text-slate">{item.answer}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
