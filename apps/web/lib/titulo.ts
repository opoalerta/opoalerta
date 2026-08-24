/**
 * Título corto para el `<title>` de una ficha, a partir del título del boletín.
 *
 * Los boletines no titulan, encabezan: «RESOLUCIÓN de 31 de julio de 2026, del
 * Vicerrectorado de Personal y Planificación Académica, por la que se convoca
 * un concurso para la provisión de plazas de profesorado asociado…». Sobre las
 * 200 fichas del listado vivo la mediana son 219 caracteres y el 86 % pasa de
 * 60, que es lo que enseña Google. Resultado: el resultado de búsqueda de todas
 * las fichas era el mismo trozo de preámbulo, con el asunto fuera de pantalla.
 *
 * Se recorta el preámbulo —tipo de acto, fecha y órgano— y se deja el asunto,
 * que es lo que alguien busca. Medido sobre esas mismas 200: la mediana del
 * `<title>` baja de 285 a 94 caracteres y los primeros 60 pasan de 106 a 155
 * valores distintos.
 *
 * No se toca el H1 ni el cuerpo de la ficha: ahí sigue el título oficial
 * íntegro, que es el que permite reconocer el documento en el boletín.
 */

/** Tipos de acto con los que abren los boletines, antes de la fecha y el órgano. */
const ACTO =
  "(?:RESOLUCI[ÓO]N|ANUNCIO|ORDEN|ACUERDO|DECRETO|EDICTO|CORRECCI[ÓO]N(?:\\s+DE\\s+ERRORES)?|EXTRACTO|BASES|CONVOCATORIA)";

/** «RESOLUCIÓN de <fecha>, de <órgano>, por la que se convoca…» → «convoca…». */
const PREAMBULO = new RegExp(`^${ACTO}\\b[\\s\\S]*?,\\s*por (?:la|el) (?:que|cual) se\\s+`, "i");

/** «ANUNCIO de la convocatoria para…» → «convocatoria para…». */
const ACTO_DE = new RegExp(`^${ACTO}\\s+(?:de|del|sobre|relativ[oa] a)\\s+(?:l[ao]s?\\s+)?`, "i");

export function tituloCorto(titulo: string, limite = 70): string {
  let t = titulo.replace(/\s+/g, " ").trim();

  const preambulo = PREAMBULO.exec(t);
  if (preambulo) {
    // El «se» del original se conserva delante: sin él queda «Convoca un
    // concurso», que no es una frase. Con él, «Se convoca un concurso».
    t = `Se ${t.slice(preambulo[0].length).trim()}`;
  } else {
    const acto = ACTO_DE.exec(t);
    if (acto) t = t.slice(acto[0].length).trim();
  }

  if (!t) return titulo.replace(/\s+/g, " ").trim();
  t = t[0].toUpperCase() + t.slice(1);

  if (t.length > limite) {
    // Se corta por palabra: un tajo a medias («…profesorado asocia») se lee
    // como un error, no como un recorte.
    const corte = t.slice(0, limite).replace(/\s+\S*$/, "");
    t = `${corte.replace(/[\s,;:.…]+$/, "")}…`;
  }

  return t;
}
