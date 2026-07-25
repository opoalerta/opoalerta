import Link from "next/link";
import { confirmarSuscripcion } from "@/lib/suscripciones";
import { Container } from "../../components/Container";
import { NoticeBox } from "../../components/NoticeBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar alerta" };

export default async function Confirmar({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await confirmarSuscripcion(token) : false;

  return (
    <Container className="py-16">
      {ok ? (
        <NoticeBox variant="success" title="Alerta confirmada">
          Ya está. Te avisaremos por email cuando salga una convocatoria que
          coincida con tu búsqueda. Puedes <Link href="/">volver al inicio</Link>.
        </NoticeBox>
      ) : (
        <NoticeBox variant="warning" title="No pudimos confirmar la alerta">
          El enlace no es válido o ya ha caducado. Vuelve a suscribirte desde{" "}
          <Link href="/">la página principal</Link>.
        </NoticeBox>
      )}
    </Container>
  );
}
