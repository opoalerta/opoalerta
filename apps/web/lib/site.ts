/**
 * URL canónica del sitio. Se resuelve en este orden:
 * 1. NEXT_PUBLIC_SITE_URL (variable que puedes configurar en Vercel)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (dominio de producción asignado por Vercel)
 * 3. VERCEL_URL (dominio de preview/deployment actual)
 * 4. Fallback manual al dominio objetivo del proyecto.
 *
 * Usa siempre la URL con la que quieras que Google indexe el contenido.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "https://opoalerta.es";
}
