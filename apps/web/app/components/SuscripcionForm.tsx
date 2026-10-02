"use client";

import { useState } from "react";

type Estado = "idle" | "enviando" | "ok" | "error";

export function SuscripcionForm({
  q,
  fuente,
  ambito,
}: {
  q: string;
  fuente: string;
  ambito: string;
}) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [tgEstado, setTgEstado] = useState<Estado>("idle");
  const [mensaje, setMensaje] = useState("");

  async function suscribirTelegram() {
    setTgEstado("enviando");
    setMensaje("");
    try {
      const resp = await fetch("/api/suscribir-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, ambito, fuente_codigo: fuente }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok && data.url) {
        window.open(data.url, "_blank", "noopener");
        setTgEstado("idle");
      } else {
        setTgEstado("error");
        setMensaje(data.error ?? "No se pudo abrir Telegram.");
      }
    } catch {
      setTgEstado("error");
      setMensaje("Error de red. Inténtalo de nuevo.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setMensaje("");
    try {
      const resp = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, q, ambito, fuente_codigo: fuente }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        setEstado("ok");
      } else {
        setEstado("error");
        setMensaje(data.error ?? "No se pudo completar la suscripción.");
      }
    } catch {
      setEstado("error");
      setMensaje("Error de red. Inténtalo de nuevo.");
    }
  }

  const criterios = [
    q && `“${q}”`,
    fuente && fuente.toUpperCase(),
    ambito && ambito,
  ].filter(Boolean);

  if (estado === "ok") {
    return (
      <div className="mt-8 rounded-r border-l-4 border-l-success bg-success-bg p-5 text-sm text-ink">
        <p className="font-semibold">Casi listo: revisa tu correo.</p>
        <p className="mt-1">
          Te hemos enviado un email para <strong>confirmar</strong> la alerta.
          Solo empezarás a recibir avisos cuando pulses el enlace de confirmación.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded border border-border bg-cream p-6">
      <h3 className="text-lg font-semibold text-navy">
        Recibe estas convocatorias por email
      </h3>
      <p className="mt-1 text-sm text-slate">
        Te avisamos cuando salga una nueva que coincida con
        {criterios.length ? (
          <> tu búsqueda ({criterios.join(", ")}).</>
        ) : (
          <> cualquier convocatoria.</>
        )}{" "}
        Gratis, sin spam, con baja en un clic.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="email-alerta" className="sr-only">
          Tu correo electrónico
        </label>
        <input
          id="email-alerta"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.es"
          className="grow rounded border border-border-strong bg-white px-4 py-2.5 text-base text-ink placeholder:text-slate focus:border-focus focus:ring-2 focus:ring-focus focus:ring-offset-1"
        />
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="shrink-0 rounded bg-gold px-6 py-2.5 text-base font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-60"
        >
          {estado === "enviando" ? "Enviando…" : "Avisadme"}
        </button>
      </form>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate">o si lo prefieres</span>
        <button
          type="button"
          onClick={suscribirTelegram}
          disabled={tgEstado === "enviando"}
          className="inline-flex items-center gap-2 rounded border border-navy-700 bg-white px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream disabled:opacity-60"
        >
          <span aria-hidden="true">✈️</span>
          {tgEstado === "enviando" ? "Abriendo…" : "Recibir por Telegram"}
        </button>
      </div>

      {(estado === "error" || tgEstado === "error") && (
        <p className="mt-2 text-sm text-danger">{mensaje}</p>
      )}
      <p className="mt-2 text-xs text-slate">
        Al suscribirte aceptas recibir avisos por email o Telegram. Guardamos solo
        tu contacto y los filtros; puedes darte de baja cuando quieras.
      </p>
    </div>
  );
}
