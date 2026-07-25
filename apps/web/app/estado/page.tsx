import { getEstado } from "@/lib/db";
import { Container } from "../components/Container";
import { EstadoTable } from "../components/EstadoTable";
import { NoticeBox } from "../components/NoticeBox";
import { PageHeader } from "../components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Estado del servicio",
};

export default async function Estado() {
  const fuentes = await getEstado();

  return (
    <Container className="py-12">
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
