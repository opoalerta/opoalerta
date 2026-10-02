import type { MetadataRoute } from "next";
import { contarOposiciones, contarPaginasArchivo, getConvocatoriaIds } from "@/lib/db";
import { CCAA_SLUG } from "@/lib/ccaa";
import { PERFILES } from "@/lib/perfiles";
import { hrefOposiciones, MIN_INDEXABLE } from "./components/OposicionesPagina";
import { getAllPosts } from "@/lib/blog";
import { getBaseUrl } from "@/lib/site";

// Regenerarlo en cada petición costaba ~1,6 s y 262 KB por rastreo, y el
// contenido solo cambia cuando entra la ingesta diaria de las 06:00 UTC.
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  // Sin recorte: el sitemap es lo que le dice a Google qué páginas existen, y
  // pedir 500 de 797 dejaba fuera precisamente las más antiguas, que son las
  // que la gente busca por nombre cuando ya no están en portada.
  const [fichas, posts, paginasArchivo, conteo] = await Promise.all([
    getConvocatoriaIds(),
    getAllPosts(),
    contarPaginasArchivo(),
    contarOposiciones(PERFILES),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/sobre`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      // Estaba anunciada como «daily» y con más prioridad que el blog. Es una
      // página de diagnóstico: cambia todos los días, así que Google volvía a
      // por ella constantemente, y no responde a ninguna búsqueda.
      url: `${baseUrl}/estado`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // El archivo paginado también va al sitemap: son las páginas que llevan a las
  // fichas, así que interesa que Google las rastree pronto y a menudo.
  const archivoPages: MetadataRoute.Sitemap = Array.from(
    { length: paginasArchivo },
    (_, i) => ({
      url: i === 0 ? `${baseUrl}/convocatorias` : `${baseUrl}/convocatorias/pagina/${i + 1}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: i === 0 ? 0.9 : 0.6,
    }),
  );

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // `lastModified: new Date()` anunciaba las ~2.800 fichas como modificadas en
  // cada rastreo. Google compara ese `lastmod` con lo que ya tiene indexado, ve
  // que el contenido no ha cambiado, y deja de fiarse del campo para TODO el
  // sitemap: entonces ya no puede distinguir la ficha de ayer de la de marzo, y
  // rastrea a ciegas. Con la fecha real, lo nuevo se rastrea antes.
  const convocatoriaPages: MetadataRoute.Sitemap = fichas.map(({ id, lastmod }) => ({
    url: `${baseUrl}/convocatoria/${id}`,
    lastModified: new Date(lastmod),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Páginas por puesto y comunidad: solo las que tienen contenido, con el mismo
  // umbral que las marca como indexables. Anunciar una con noindex sería
  // contradecirse.
  const rutasOposiciones = ["/oposiciones"];
  for (const p of PERFILES) {
    if ((conteo.porPerfil[p.slug] ?? 0) >= MIN_INDEXABLE) rutasOposiciones.push(hrefOposiciones(p.slug, null));
  }
  for (const c of Object.keys(CCAA_SLUG)) {
    if ((conteo.porCcaa[c] ?? 0) >= MIN_INDEXABLE) rutasOposiciones.push(hrefOposiciones(null, c));
    for (const p of PERFILES) {
      if ((conteo.porPar[`${p.slug}|${c}`] ?? 0) >= MIN_INDEXABLE) {
        rutasOposiciones.push(hrefOposiciones(p.slug, c));
      }
    }
  }
  const oposicionesPages: MetadataRoute.Sitemap = rutasOposiciones.map((ruta) => ({
    url: `${baseUrl}${ruta}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: ruta === "/oposiciones" ? 0.9 : 0.8,
  }));

  return [...staticPages, ...oposicionesPages, ...archivoPages, ...blogPages, ...convocatoriaPages];
}
