import { getEstado } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";
import { Container } from "../components/Container";
import { EstadoTable } from "../components/EstadoTable";
import { JsonLd } from "../components/JsonLd";
import { NoticeBox } from "../components/NoticeBox";
import { PageHeader } from "../components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Estado del servicio",
  description:
    "Consulta el estado de las fuentes de datos de OpoAlerta: BOE, boletines autonómicos, convocatorias ingeridas y última ejecución de los scrapers.",
  alternates: { canonical: "/estado" },
};

export default async function Estado() {
  const fuentes = await getEstado();
  const baseUrl = getBaseUrl();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${baseUrl}/estado#webpage`,
      url: `${baseUrl}/estado`,
      name: "Estado del servicio — OpoAlerta",
      description:
        "Consulta el estado de las fuentes de datos de OpoAlerta: BOE, boletines autonómicos, convocatorias ingeridas y última ejecución de los scrapers.",
      isPartOf: { "@id": `${baseUrl}/#website` },
      inLanguage: "es-ES",
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
          name: "Estado del servicio",
          item: `${baseUrl}/estado`,
        },
      ],
    },
  ];

  return (
    <Container className="py-12">
      <JsonLd data={structuredData} />
      <PageHeader
        title="Estado del servicio"
        lead="Convocatorias ingeridas por fuente y fecha de la última ingesta. La ingesta del BOE corre a diario a las 06:00 UTC."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Estado del servicio" }]}
      />

      {fuentes.length === 0 ? (
        <NoticeBox title="Sin datos todavía" variant="warning">
          No se ha podido consultar el estado de las fuentes. Comprueba que{" "}
          <code>DATABASE_URL</code> está configurada en el entorno.
        </NoticeBox>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-[#595959]">
            <span>
              <strong className="text-[#1a1a1a]">{fuentes.length}</strong> fuentes configuradas
            </span>
            <span>
              <strong className="text-[#1a1a1a]">
                {fuentes.reduce((sum, f) => sum + f.total, 0)}
              </strong>{" "}
              convocatorias ingeridas en total
            </span>
          </div>
          <EstadoTable fuentes={fuentes} />
        </>
      )}
    </Container>
  );
}
