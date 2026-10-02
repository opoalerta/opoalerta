/** Nombres legibles de las comunidades autónomas (códigos ISO 3166-2:ES). */
export const CCAA_NOMBRE: Record<string, string> = {
  AN: "Andalucía",
  AR: "Aragón",
  AS: "Asturias",
  CB: "Cantabria",
  CE: "Ceuta",
  CL: "Castilla y León",
  CM: "Castilla-La Mancha",
  CN: "Canarias",
  CT: "Cataluña",
  EX: "Extremadura",
  GA: "Galicia",
  IB: "Illes Balears",
  MC: "Murcia",
  MD: "Madrid",
  ML: "Melilla",
  NC: "Navarra",
  PV: "País Vasco",
  RI: "La Rioja",
  VC: "C. Valenciana",
};

export type CcaaOption = { codigo: string; nombre: string };

/** Lista ordenada alfabéticamente por nombre, lista para desplegables. */
export const CCAA_OPCIONES: CcaaOption[] = Object.entries(CCAA_NOMBRE)
  .map(([codigo, nombre]) => ({ codigo, nombre }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-ES"));

/**
 * Slug de URL de cada comunidad, para /oposiciones/<ccaa>. Escrito a mano y no
 * derivado del nombre: «C. Valenciana» daría «c-valenciana», que no es lo que
 * nadie busca.
 */
export const CCAA_SLUG: Record<string, string> = {
  AN: "andalucia",
  AR: "aragon",
  AS: "asturias",
  CB: "cantabria",
  CE: "ceuta",
  CL: "castilla-y-leon",
  CM: "castilla-la-mancha",
  CN: "canarias",
  CT: "cataluna",
  EX: "extremadura",
  GA: "galicia",
  IB: "illes-balears",
  MC: "murcia",
  MD: "madrid",
  ML: "melilla",
  NC: "navarra",
  PV: "pais-vasco",
  RI: "la-rioja",
  VC: "comunitat-valenciana",
};

export const CCAA_POR_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CCAA_SLUG).map(([codigo, slug]) => [slug, codigo]),
);

/** Nombre largo para frases: «en la Comunitat Valenciana», no «en C. Valenciana». */
export const CCAA_NOMBRE_LARGO: Record<string, string> = {
  ...CCAA_NOMBRE,
  VC: "la Comunitat Valenciana",
  IB: "las Illes Balears",
  RI: "La Rioja",
  MD: "la Comunidad de Madrid",
  MC: "la Región de Murcia",
};
