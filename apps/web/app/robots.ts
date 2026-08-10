import { getBaseUrl } from "@/lib/site";

export default function robots() {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/estado", "/convocatoria/"],
        // /alertas/ sale del Disallow. Sus páginas ya declaran `noindex`, y las
        // dos reglas se anulaban entre sí: sin poder rastrear la URL, Google no
        // puede leer el noindex, así que una que se hubiera colado seguiría
        // indexada. Bloquearlas tampoco protegía de nada —los escáneres de
        // correo ignoran robots.txt—; de eso se encarga ahora que la escritura
        // viva en un POST.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
