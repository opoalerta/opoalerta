import Link from "next/link";
import { bajaSuscripcion } from "@/lib/suscripciones";
import { Container } from "../../components/Container";
import { NoticeBox } from "../../components/NoticeBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Darse de baja" };

export default async function Baja({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await bajaSuscripcion(token) : false;

  return (
    <Container className="py-16">
      {ok ? (
        <NoticeBox variant="info" title="Baja completada">
          Hemos eliminado tu alerta y tu correo. No recibirás más avisos de esa
          búsqueda. Puedes <Link href="/">volver al inicio</Link>.
        </NoticeBox>
      ) : (
        <NoticeBox variant="warning" title="No encontramos esa alerta">
          El enlace no es válido o la alerta ya no existe.{" "}
          <Link href="/">Volver al inicio</Link>.
        </NoticeBox>
      )}
    </Container>
  );
}
