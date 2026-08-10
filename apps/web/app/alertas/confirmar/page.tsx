import Link from "next/link";
import { Container } from "../../components/Container";
import { NoticeBox } from "../../components/NoticeBox";
import { ejecutarConfirmacion } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirmar alerta",
  description: "Confirma tu suscripción a alertas de convocatorias de empleo público en OpoAlerta.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/alertas/confirmar" },
};

/** El porqué del botón, en `app/alertas/actions.ts`. */
export default async function Confirmar({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; resultado?: string }>;
}) {
  const { token, resultado } = await searchParams;

  if (resultado === "ok") {
    return (
      <Container className="py-16">
        <NoticeBox variant="success" title="Alerta confirmada">
          Ya está. Te avisaremos por email cuando salga una convocatoria que
          coincida con tu búsqueda. Puedes <Link href="/">volver al inicio</Link>.
        </NoticeBox>
      </Container>
    );
  }

  if (resultado === "error" || !token) {
    return (
      <Container className="py-16">
        <NoticeBox variant="warning" title="No pudimos confirmar la alerta">
          El enlace no es válido o ya ha caducado. Vuelve a suscribirte desde{" "}
          <Link href="/">la página principal</Link>.
        </NoticeBox>
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-navy">Confirma tu alerta</h1>
        <p className="mt-4 text-ink">
          Solo queda un paso. Al confirmar, empezarás a recibir un aviso por email
          cuando se publique una convocatoria que encaje con tu búsqueda. Puedes darte
          de baja en cualquier momento desde el enlace de cada aviso.
        </p>
        <form
          action={ejecutarConfirmacion}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="inline-flex items-center rounded bg-gold px-6 py-3 text-base font-semibold text-navy hover:bg-navy hover:text-white"
          >
            Confirmar la alerta
          </button>
          <Link href="/" className="text-navy-700 hover:text-navy">
            Cancelar
          </Link>
        </form>
      </div>
    </Container>
  );
}
