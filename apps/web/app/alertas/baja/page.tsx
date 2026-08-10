import Link from "next/link";
import { Container } from "../../components/Container";
import { NoticeBox } from "../../components/NoticeBox";
import { ejecutarBaja } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Darse de baja",
  description: "Cancela tu alerta de convocatorias de empleo público en OpoAlerta.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/alertas/baja" },
};

/** El porqué del botón, en `app/alertas/actions.ts`. */
export default async function Baja({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; resultado?: string }>;
}) {
  const { token, resultado } = await searchParams;

  if (resultado === "ok") {
    return (
      <Container className="py-16">
        <NoticeBox variant="info" title="Baja completada">
          Hemos eliminado tu alerta y tu correo. No recibirás más avisos de esa
          búsqueda. Puedes <Link href="/">volver al inicio</Link>.
        </NoticeBox>
      </Container>
    );
  }

  if (resultado === "error" || !token) {
    return (
      <Container className="py-16">
        <NoticeBox variant="warning" title="No encontramos esa alerta">
          El enlace no es válido o la alerta ya no existe.{" "}
          <Link href="/">Volver al inicio</Link>.
        </NoticeBox>
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-navy">Darse de baja</h1>
        <p className="mt-4 text-ink">
          Vas a cancelar esta alerta. Dejarás de recibir avisos de esa búsqueda y se
          borrará tu correo. La acción no se puede deshacer, pero puedes volver a
          suscribirte cuando quieras.
        </p>
        <form action={ejecutarBaja} className="mt-8 flex flex-wrap items-center gap-4">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="inline-flex items-center rounded bg-gold px-6 py-3 text-base font-semibold text-navy hover:bg-navy hover:text-white"
          >
            Confirmar la baja
          </button>
          <Link href="/" className="text-navy-700 hover:text-navy">
            No, mantener la alerta
          </Link>
        </form>
      </div>
    </Container>
  );
}
