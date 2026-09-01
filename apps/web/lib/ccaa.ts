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
