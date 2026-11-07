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
      {
        // Rastreadores que no traen a nadie: entrenamiento de modelos y
        // herramientas de SEO. Barrían las ~13.000 fichas varias veces al mes
        // (2,9 M de peticiones en octubre de 2026 frente a ~800 visitas
        // humanas) y agotaron el cupo de Vercel de toda la cuenta. Los
        // buscadores, y los asistentes que citan y enlazan la fuente
        // (OAI-SearchBot, ChatGPT-User, PerplexityBot), siguen entrando.
        // Quien ignore robots.txt lo para el firewall de Vercel.
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "anthropic-ai",
          "CCBot",
          "Bytespider",
          "meta-externalagent",
          "Amazonbot",
          "Applebot-Extended",
          "Google-Extended",
          "PetalBot",
          "AhrefsBot",
          "SemrushBot",
          "MJ12bot",
          "DotBot",
          "DataForSeoBot",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
