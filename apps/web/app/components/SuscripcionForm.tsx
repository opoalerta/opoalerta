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
      <div className="mt-8 rounded-r border-l-4 border-l-[#39870c] bg-[#f4f9f0] p-5 text-sm text-[#1a1a1a]">
        <p className="font-semibold">Casi listo: revisa tu correo.</p>
        <p className="mt-1">
          Te hemos enviado un email para <strong>confirmar</strong> la alerta.
          Solo empezarás a recibir avisos cuando pulses el enlace de confirmación.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded border border-[#e5e5e5] bg-[#f3f5f6] p-6">
      <h3 className="text-lg font-semibold text-[#154273]">
        Recibe estas convocatorias por email
      </h3>
      <p className="mt-1 text-sm text-[#595959]">
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
          className="grow rounded border border-[#cccccc] bg-white px-4 py-2.5 text-base text-[#1a1a1a] placeholder:text-[#999999] focus:border-[#01689b] focus:ring-2 focus:ring-[#01689b] focus:ring-offset-1"
        />
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="shrink-0 rounded bg-[#01689b] px-6 py-2.5 text-base font-semibold text-white hover:bg-[#154273] disabled:opacity-60"
        >
          {estado === "enviando" ? "Enviando…" : "Avisadme"}
        </button>
      </form>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-[#595959]">o si lo prefieres</span>
        <button
          type="button"
          onClick={suscribirTelegram}
          disabled={tgEstado === "enviando"}
          className="inline-flex items-center gap-2 rounded border border-[#01689b] bg-white px-4 py-2 text-sm font-semibold text-[#01689b] hover:bg-[#eaf3f8] disabled:opacity-60"
        >
          <span aria-hidden="true">✈️</span>
          {tgEstado === "enviando" ? "Abriendo…" : "Recibir por Telegram"}
        </button>
      </div>

      {(estado === "error" || tgEstado === "error") && (
        <p className="mt-2 text-sm text-[#d52b1e]">{mensaje}</p>
      )}
      <p className="mt-2 text-xs text-[#595959]">
        Al suscribirte aceptas recibir avisos por email o Telegram. Guardamos solo
        tu contacto y los filtros; puedes darte de baja cuando quieras.
      </p>
    </div>
  );
}
