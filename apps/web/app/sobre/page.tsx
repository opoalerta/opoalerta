import { getEstado } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";
import { Container } from "../components/Container";
import { JsonLd } from "../components/JsonLd";
import { NoticeBox } from "../components/NoticeBox";
import { PageHeader } from "../components/PageHeader";

// De la página solo cambia la lista de fuentes activas, y eso lo mueve la
// ingesta diaria. Con `force-dynamic` cada visita —también la de un rastreador—
// pagaba una consulta a Postgres por un texto que es prácticamente fijo.
export const revalidate = 3600;

const DESCRIPCION =
  "Qué es OpoAlerta, de dónde salen las convocatorias, cómo se tratan los datos " +
  "y con qué licencias. Preguntas frecuentes y fuentes oficiales citadas.";

export const metadata = {
  title: "Sobre el proyecto",
  description: DESCRIPCION,
  alternates: { canonical: "/sobre" },
};

// Las respuestas se muestran en la página y además alimentan el FAQPage de
// schema.org, para que las dos versiones no puedan divergir.
const FAQ = [
  {
    question: "¿Es gratis? ¿Hay letra pequeña?",
    answer:
      "Es gratis y no hay letra pequeña. No hay publicidad, no se venden datos, no se cobra por los avisos y no hace falta registrarse para buscar. El único gasto del proyecto es el dominio.",
  },
  {
    question: "¿De dónde salen las convocatorias?",
    answer:
      "De los boletines oficiales, leídos directamente de su fuente: el BOE, los boletines autonómicos y EPSO para las oposiciones de la Unión Europea. Cada ficha enlaza al documento original con su fecha, para que puedas comprobar cualquier dato en la fuente.",
  },
  {
    question: "¿Cada cuánto se actualiza?",
    answer:
      "Una vez al día, a las 06:00 UTC. Cada boletín se procesa por separado, así que si uno falla los demás siguen publicándose. El estado de cada fuente y la hora de su última ingesta están en la página de estado del servicio.",
  },
  {
    question: "¿Modificáis el texto de las convocatorias?",
    answer:
      "Prácticamente no. El título se guarda tal y como lo publica el boletín; la única excepción son los boletines que anteponen un guion decorativo, que se quita. El organismo también es el del boletín, salvo cuando el sumario no lo trae y hay que deducirlo del propio título. Lo que sí se añade es clasificación: ámbito, comunidad autónoma, tipo de acceso y, cuando el documento lo dice explícitamente, el plazo de presentación.",
  },
  {
    question: "¿Es fiable el filtro de ámbito?",
    answer:
      "Hoy no del todo, y preferimos decirlo. El ámbito se asigna según dónde se publicó la convocatoria, no según quién convoca, y el BOE publica muchos procesos selectivos de ayuntamientos que constan como estatales. Si buscas plazas de administración local, no te fíes solo del filtro «Local»: busca también por el nombre del municipio. Está abierto como incidencia y es de lo próximo que se arregla.",
  },
  {
    question: "¿Cómo recibo avisos de convocatorias nuevas?",
    answer:
      "Guarda una búsqueda con tus filtros desde la página principal y deja tu correo. Recibirás un aviso cuando aparezca una convocatoria que encaje. Si prefieres no dar tu email, en /rss.xml tienes un feed con las últimas convocatorias.",
  },
  {
    question: "He visto un error en una convocatoria. ¿Qué hago?",
    answer:
      "Compruébalo primero en el enlace oficial de la ficha: la fuente manda siempre. Si el error es nuestro, abre una incidencia en GitHub indicando la convocatoria; se corrige en cuanto se puede.",
  },
  {
    question: "¿Puedo usar estos datos o montar mi propia copia?",
    answer:
      "Sí. El código es AGPL-3.0, la documentación CC BY-SA 4.0 y los datos transformados ODbL-1.0, con atribución a las fuentes oficiales. Puedes desplegar tu propia instancia, reutilizar los volcados o añadir el boletín de tu comunidad.",
  },
  {
    question: "¿Guardáis datos míos?",
    answer:
      "Solo el correo de quien se suscribe a una alerta, y únicamente para enviarla. No hace falta cuenta para buscar ni para consultar una convocatoria.",
  },
];

const LICENCIAS = [
  {
    contenido: "Código",
    licencia: "AGPL-3.0",
    href: "https://github.com/opoalerta/opoalerta/blob/main/LICENSE",
  },
  {
    contenido: "Documentación",
    licencia: "CC BY-SA 4.0",
    href: "https://github.com/opoalerta/opoalerta/blob/main/docs/LICENSE",
  },
  {
    contenido: "Datos transformados",
    licencia: "ODbL-1.0",
    href: "https://github.com/opoalerta/opoalerta/blob/main/data/LICENSE",
  },
];

export default async function Sobre() {
  // Las fuentes se leen de la base de datos en vez de mantener una lista a
  // mano: una fuente nueva aparece aquí sola, y su estado es el real.
  const fuentes = await getEstado();
  const activas = fuentes.filter((f) => f.estado === "ok");
  const baseUrl = getBaseUrl();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${baseUrl}/sobre#webpage`,
      url: `${baseUrl}/sobre`,
      name: "Sobre el proyecto — OpoAlerta",
      description: DESCRIPCION,
      isPartOf: { "@id": `${baseUrl}/#website` },
      inLanguage: "es-ES",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
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
          name: "Sobre el proyecto",
          item: `${baseUrl}/sobre`,
        },
      ],
    },
  ];

  return (
    <Container>
      <JsonLd data={structuredData} />

      <PageHeader
        title="Sobre el proyecto"
        lead="OpoAlerta reúne en un solo buscador las convocatorias de empleo público que hoy están repartidas por veinte boletines oficiales distintos."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Sobre el proyecto" }]}
      />

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-navy">Por qué existe</h2>
        <div className="prose max-w-3xl text-ink">
          <p>
            Una convocatoria de empleo público es información oficial y gratuita, pero
            encontrarla no lo es tanto: cada administración publica en su propio boletín, con
            su propio buscador y su propio formato. Quien opta a una plaza acaba revisando
            varias webs cada día, o pagando a un intermediario por algo que ya es público.
          </p>
          <p>
            OpoAlerta lee esos boletines, los normaliza a una misma estructura y los deja
            buscables en un sitio, con un aviso por correo cuando aparece algo que encaja. No
            sustituye al boletín: cada ficha enlaza al documento oficial, que es el que tiene
            valor legal.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-navy">De dónde salen los datos</h2>
        <p className="mb-4 max-w-3xl text-ink">
          {activas.length > 0
            ? `Ahora mismo hay ${activas.length} ${
                activas.length === 1 ? "fuente activa" : "fuentes activas"
              }. Cada una se lee una vez al día directamente de su boletín:`
            : "Estas son las fuentes que lee el proyecto, una vez al día y directamente de su boletín:"}
        </p>

        {activas.length > 0 && (
          <ul className="mb-4 grid gap-2 sm:grid-cols-2">
            {activas.map((fuente) => (
              <li
                key={fuente.fuente_codigo}
                className="rounded border border-border bg-white px-4 py-3 text-sm"
              >
                <span className="font-semibold text-navy">{fuente.fuente_codigo.toUpperCase()}</span>
                <span className="text-slate"> · {fuente.nombre}</span>
              </li>
            ))}
          </ul>
        )}

        <NoticeBox title="La fuente oficial manda">
          Los datos originales pertenecen a los boletines que los publican y se citan siempre
          con enlace y fecha. Si algo aquí no coincide con el boletín, vale lo que diga el
          boletín. Puedes ver cuándo se leyó cada fuente por última vez en{" "}
          <a href="/estado">el estado del servicio</a>.
        </NoticeBox>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-navy">Cómo se tratan</h2>
        <div className="prose max-w-3xl text-ink">
          <p>
            De cada boletín se toma solo su sección de oposiciones, porque en el mismo
            documento conviven subvenciones, expedientes ambientales y licitaciones que no
            son ofertas de empleo. El título se guarda como lo publica el boletín, y el
            organismo también salvo cuando el sumario no lo trae y hay que deducirlo del
            título.
          </p>
          <p>
            Lo que se añade es clasificación —ámbito, comunidad autónoma y tipo de acceso— y,
            un paso aparte, el plazo de presentación cuando el documento lo indica de forma
            explícita. Si no lo dice, el campo se queda vacío en lugar de estimarlo.
          </p>
          <p>
            El ámbito es hoy la clasificación menos fiable: se asigna según dónde se publicó
            la convocatoria y no según quién la convoca, así que los procesos selectivos de
            ayuntamientos publicados en el BOE constan como estatales. Está{" "}
            <a href="https://github.com/opoalerta/opoalerta/issues/94">
              abierto como incidencia
            </a>
            .
          </p>
          <p>
            Todo el proceso está en el repositorio y cualquiera puede revisarlo o replicarlo.
            Cada boletín se procesa por separado, de modo que el fallo de una fuente no
            arrastra a las demás.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-navy">Preguntas frecuentes</h2>
        <dl className="max-w-3xl divide-y divide-border">
          {FAQ.map((item) => (
            <div key={item.question} className="py-4">
              <dt className="text-base font-semibold text-navy">{item.question}</dt>
              <dd className="mt-1 text-ink">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-navy">Licencias</h2>
        <div className="max-w-3xl overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Licencias de cada parte del proyecto</caption>
            <thead>
              <tr className="border-b border-border-strong text-left">
                <th scope="col" className="py-2 pr-4 font-semibold text-navy">
                  Contenido
                </th>
                <th scope="col" className="py-2 font-semibold text-navy">
                  Licencia
                </th>
              </tr>
            </thead>
            <tbody>
              {LICENCIAS.map((fila) => (
                <tr key={fila.contenido} className="border-b border-border">
                  <td className="py-2 pr-4 text-ink">{fila.contenido}</td>
                  <td className="py-2">
                    <a href={fila.href} target="_blank" rel="noopener noreferrer">
                      {fila.licencia}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate">
          Los datos originales pertenecen a sus fuentes oficiales. La licencia ODbL se aplica
          a la versión normalizada que produce el proyecto, con atribución a esas fuentes.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold text-navy">Contribuir</h2>
        <p className="mb-4 max-w-3xl text-ink">
          Falta cobertura de varias comunidades autónomas, y añadir un boletín es la
          contribución que más se nota. También hay tareas de web y de accesibilidad.
        </p>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-ink">
          <li>
            <a
              href="https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Guía para añadir el boletín de tu comunidad
            </a>
          </li>
          <li>
            <a
              href="https://github.com/opoalerta/opoalerta/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tareas marcadas como buen primer issue
            </a>
          </li>
          <li>
            <a
              href="https://github.com/opoalerta/opoalerta"
              target="_blank"
              rel="noopener noreferrer"
            >
              Código del proyecto en GitHub
            </a>
          </li>
        </ul>
      </section>
    </Container>
  );
}
