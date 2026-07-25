import { getConvocatorias } from "@/lib/db";
import { Container } from "./components/Container";
import { ConvocatoriaSearch } from "./components/ConvocatoriaSearch";
import { FeatureBlock } from "./components/FeatureBlock";
import { NoticeBox } from "./components/NoticeBox";

export const dynamic = "force-dynamic";

const FUENTES = [
  { codigo: "BOE", nombre: "Boletín Oficial del Estado", estado: "activo" },
  { codigo: "BOJA", nombre: "Boletín Oficial de la Junta de Andalucía", estado: "previsto" },
  { codigo: "BOCM", nombre: "Boletín Oficial de la Comunidad de Madrid", estado: "previsto" },
  { codigo: "DOGV", nombre: "Diari Oficial de la Generalitat Valenciana", estado: "previsto" },
  { codigo: "BOPG", nombre: "Boletín Oficial de Pontevedra (Galicia)", estado: "previsto" },
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
      "Por ahora puedes consultar la web y el estado del servicio. Las alertas por email y Telegram están en la hoja de ruta de la Fase 1.",
  },
  {
    question: "¿Puedo contribuir o replicar el proyecto?",
    answer:
      "Sí. El código es AGPL-3.0, la documentación CC BY-SA 4.0 y los datos transformados ODbL-1.0. Puedes añadir un boletín, mejorar la web o desplegar tu propia instancia.",
  },
];

export default async function Home() {
  const convocatorias = await getConvocatorias(30);

  return (
    <>
      <section className="bg-[#f3f5f6] py-16">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 inline-block rounded bg-[#01689b] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Proyecto cívico · Open source
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-[#154273] sm:text-5xl">
              Todas las convocatorias de empleo público de España, en un solo sitio.
            </h1>
            <p className="mt-6 text-xl text-[#595959]">
              OpoAlerta agrega automáticamente las oposiciones del BOE y los boletines
              autonómicos. Gratis, sin publicidad, con el código y los datos abiertos.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#convocatorias"
                className="inline-flex items-center rounded bg-[#01689b] px-6 py-3 text-base font-semibold text-white no-underline hover:bg-[#154273]"
              >
                Buscar convocatorias
              </a>
              <a
                href="https://github.com/opoalerta/opoalerta"
                className="inline-flex items-center rounded border border-[#cccccc] bg-white px-6 py-3 text-base font-semibold text-[#01689b] no-underline hover:bg-[#f3f5f6]"
              >
                Ver el código
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <NoticeBox title="Estamos en Fase 1 · MVP" variant="info">
            La ingesta del BOE ya está activa y corre cada día a las 06:00 UTC. Estamos
            incorporando los boletines autonómicos (BOJA, BOCM, DOGV…) para cubrir más
            del 50% de las convocatorias estatales. Si ves algo incorrecto, puedes{" "}
            <a href="https://github.com/opoalerta/opoalerta/issues">abrir una incidencia</a>.
          </NoticeBox>
        </Container>
      </section>

      <section id="convocatorias" className="py-8">
        <Container>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#154273]">Últimas convocatorias</h2>
            <p className="mt-1 text-[#595959]">
              Consulta las últimas publicaciones o filtra por puesto, organismo o fuente.
            </p>
          </div>
          <ConvocatoriaSearch convocatorias={convocatorias} />
        </Container>
      </section>

      <section className="bg-[#f3f5f6] py-16">
        <Container>
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-[#154273]">Cómo funciona</h2>
            <p className="mt-1 text-[#595959]">
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
            <h2 className="text-2xl font-bold text-[#154273]">Fuentes oficiales</h2>
            <p className="mt-1 text-[#595959]">
              Usamos exclusivamente datos públicos y citamos siempre la fuente original.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUENTES.map((f) => (
              <li
                key={f.codigo}
                className="flex items-center justify-between rounded border border-[#e5e5e5] bg-white p-4"
              >
                <div>
                  <span className="block text-base font-semibold text-[#01689b]">
                    {f.codigo}
                  </span>
                  <span className="text-sm text-[#595959]">{f.nombre}</span>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold uppercase ${
                    f.estado === "activo"
                      ? "bg-[#f4f9f0] text-[#39870c]"
                      : f.estado === "previsto"
                        ? "bg-[#f3f5f6] text-[#595959]"
                        : "bg-[#fff4f4] text-[#d52b1e]"
                  }`}
                >
                  {f.estado}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[#595959]">
            El objetivo es cubrir los 19 boletines autonómicos. Si falta el tuyo, puedes{" "}
            <a href="https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md">
              añadirlo siguiendo esta guía
            </a>
            .
          </p>
        </Container>
      </section>

      <section className="bg-[#f3f5f6] py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#154273]">Open source y contribución</h2>
            <p className="mt-1 text-[#595959]">
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
                className="block rounded border border-[#e5e5e5] bg-white p-4 no-underline shadow-sm transition hover:border-[#01689b]"
              >
                <span className="block text-base font-semibold text-[#01689b]">
                  {item.label}
                </span>
                <span className="text-sm text-[#595959]">{item.desc}</span>
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#154273]">Preguntas frecuentes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="mb-1 text-lg font-semibold text-[#154273]">
                  {item.question}
                </h3>
                <p className="text-[#595959]">{item.answer}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
