"use server";

import { redirect } from "next/navigation";
import { bajaSuscripcion, confirmarSuscripcion } from "@/lib/suscripciones";

/**
 * Las dos operaciones de una alerta —confirmarla y darla de baja— se hacían
 * durante el render del GET de su página. Como esos enlaces viajan por correo,
 * cualquier cosa que abra la URL sin que haya nadie delante ejecutaba la
 * operación: los escáneres de seguridad del correo (Safe Links de Microsoft 365
 * es el caso habitual) visitan los enlaces de los mensajes para analizarlos, y
 * no obedecen robots.txt, así que el `Disallow: /alertas/` no los frena.
 *
 * El resultado era que una suscripción podía borrarse sin que su dueño hiciera
 * clic, y que la confirmación podía darse sola —lo que anula el doble opt-in,
 * que existe justamente para probar que hay una persona detrás del correo.
 *
 * Ahora el GET solo pinta un botón y la escritura vive en un POST. Los
 * escáneres no envían formularios, y Next comprueba el origen de cada Server
 * Action, así que tampoco vale disparar el POST desde otro sitio.
 */

function leerToken(formData: FormData): string {
  const token = formData.get("token");
  return typeof token === "string" ? token.trim() : "";
}

export async function ejecutarConfirmacion(formData: FormData): Promise<void> {
  const token = leerToken(formData);
  const ok = token ? await confirmarSuscripcion(token) : false;
  // Se redirige sin el token: una vez usado no pinta nada en la barra del
  // navegador, ni en el historial, ni en el Referer de la siguiente petición.
  redirect(`/alertas/confirmar?resultado=${ok ? "ok" : "error"}`);
}

export async function ejecutarBaja(formData: FormData): Promise<void> {
  const token = leerToken(formData);
  const ok = token ? await bajaSuscripcion(token) : false;
  redirect(`/alertas/baja?resultado=${ok ? "ok" : "error"}`);
}
