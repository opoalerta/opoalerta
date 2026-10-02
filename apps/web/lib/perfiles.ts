/**
 * Perfiles de oposición para las páginas /oposiciones/<perfil>.
 *
 * La columna `cuerpo` no la rellena ningún scraper (0 de 9.812 filas a
 * 2026-10-02), así que el perfil se reconoce por el TÍTULO: patrones LIKE sobre
 * el texto en minúsculas y sin tildes (mismo `translate` que el buscador).
 *
 * Las exclusiones importan tanto como los patrones. Sin ellas, «hacienda» casa
 * con cualquier resolución de una Consejería de Hacienda, «enfermería» con las
 * plazas de auxiliar de enfermería y «administrativo» con el recurso
 * contencioso-administrativo. Cada lista se midió contra la base: un perfil que
 * devuelve ruido es peor que no tenerlo.
 *
 * `busqueda` es el texto con el que se rellena el formulario de alerta de la
 * página: lo que la persona escribiría en el buscador para ese perfil.
 */
export type Perfil = {
  slug: string;
  nombre: string;
  /** Para frases del tipo «oposiciones de ${en}». */
  en: string;
  incluye: string[];
  excluye?: string[];
  busqueda: string;
};

export const PERFILES: Perfil[] = [
  {
    slug: "auxiliar-administrativo",
    nombre: "Auxiliar administrativo",
    en: "auxiliar administrativo",
    incluye: ["%auxiliar% administrativ%", "%auxiliar% administratiu%"],
    busqueda: "auxiliar administrativo",
  },
  {
    slug: "administrativo",
    nombre: "Administrativo",
    en: "administrativo",
    incluye: ["%cuerpo administrativo%", "%escala administrativa%", "%plaza% de administrativ%", "%categoria de administrativ%", "%cuerpo general administrativo%", "%administratiu%", "%administrativo/a%"],
    excluye: ["%auxiliar%"],
    busqueda: "administrativo",
  },
  {
    slug: "policia-local",
    nombre: "Policía local",
    en: "policía local",
    incluye: ["%policia local%", "%policia municipal%", "%agente% de policia%"],
    busqueda: "policía local",
  },
  {
    slug: "bombero",
    nombre: "Bombero",
    en: "bombero",
    incluye: ["%bomber%", "%bombeir%", "%prevencion y extincion de incendios%"],
    busqueda: "bombero",
  },
  {
    slug: "maestro",
    nombre: "Maestro",
    en: "maestro",
    incluye: ["%cuerpo de maestros%", "%maestr%", "%mestre%"],
    excluye: ["%maestro de obras%", "%master%"],
    busqueda: "maestros",
  },
  {
    slug: "profesor-secundaria",
    nombre: "Profesor de secundaria y FP",
    en: "profesor de secundaria y FP",
    incluye: ["%ensenanza secundaria%", "%profesores tecnicos de formacion profesional%", "%escuelas oficiales de idiomas%", "%musica y artes escenicas%"],
    busqueda: "enseñanza secundaria",
  },
  {
    slug: "universidad",
    nombre: "Profesorado universitario",
    en: "profesorado universitario",
    incluye: ["%catedratic%", "%profesor% titular%", "%profesor% contratad% doctor%", "%profesor% ayudante doctor%", "%cuerpos docentes universitarios%"],
    busqueda: "profesor titular",
  },
  {
    slug: "enfermeria",
    nombre: "Enfermería",
    en: "enfermería",
    incluye: ["%enfermer%", "%enfermeir%", "%infermer%", "%matron%", "%llevador%"],
    excluye: ["%auxiliar% de enfermeria%", "%auxiliar% d'infermeria%", "%cuidados auxiliares%", "%coidados auxiliares%"],
    busqueda: "enfermería",
  },
  {
    slug: "tcae",
    nombre: "TCAE (auxiliar de enfermería)",
    en: "TCAE",
    incluye: ["%cuidados auxiliares de enfermeria%", "%auxiliar% de enfermeria%", "%auxiliar% d'infermeria%", "%coidados auxiliares de enfermaria%", "%tcae%"],
    busqueda: "cuidados auxiliares de enfermería",
  },
  {
    slug: "celador",
    nombre: "Celador",
    en: "celador",
    incluye: ["%celador%", "%zelador%"],
    busqueda: "celador",
  },
  {
    slug: "medicina",
    nombre: "Medicina",
    en: "medicina",
    incluye: ["%facultativo especialista%", "%medico%", "%medicina%", "%pediatr%", "%metge%"],
    excluye: ["%veterinari%", "%medio ambiente%"],
    busqueda: "facultativo",
  },
  {
    slug: "fisioterapia",
    nombre: "Fisioterapia",
    en: "fisioterapia",
    incluye: ["%fisioterapeut%"],
    busqueda: "fisioterapeuta",
  },
  {
    slug: "psicologia",
    nombre: "Psicología",
    en: "psicología",
    incluye: ["%psicolog%", "%psicoleg%"],
    busqueda: "psicólogo",
  },
  {
    slug: "trabajo-social",
    nombre: "Trabajo social",
    en: "trabajo social",
    incluye: ["%trabajador% social%", "%trabajo social%", "%treballador% social%", "%traballador% social%"],
    busqueda: "trabajador social",
  },
  {
    slug: "educacion-infantil",
    nombre: "Educación infantil",
    en: "educación infantil",
    incluye: ["%educador% infantil%", "%educacion infantil%", "%escuela% infantil%"],
    busqueda: "educación infantil",
  },
  {
    slug: "justicia",
    nombre: "Justicia (auxilio, tramitación y gestión procesal)",
    en: "justicia",
    incluye: ["%auxilio judicial%", "%tramitacion procesal%", "%gestion procesal%", "%letrados de la administracion de justicia%"],
    busqueda: "procesal",
  },
  {
    slug: "informatica",
    nombre: "Informática y sistemas",
    en: "informática",
    incluye: ["%informatic%", "%sistemas y tecnologias de la informacion%", "%tecnologias de la informacion%"],
    busqueda: "informática",
  },
  {
    slug: "arquitectura-ingenieria",
    nombre: "Arquitectura e ingeniería",
    en: "arquitectura e ingeniería",
    incluye: ["%arquitect%", "%ingenier%", "%enginyer%", "%enxeneir%"],
    excluye: ["%catedratic%", "%profesor%", "%area de conocimiento%"],
    busqueda: "arquitecto",
  },
  {
    slug: "secretario-interventor",
    nombre: "Secretaría e intervención local",
    en: "secretaría e intervención",
    incluye: ["%secretari%-interven%", "%secretaria-intervencion%", "%secretario% interventor%", "%habilitacion de caracter nacional%", "%interventor%", "%tesorer%"],
    busqueda: "secretaría-intervención",
  },
  {
    slug: "tecnico-administracion-general",
    nombre: "Técnico de Administración General",
    en: "Técnico de Administración General",
    incluye: ["%tecnico de administracion general%", "%tecnica de administracion general%", "%tecnico/a de administracion general%"],
    busqueda: "técnico de administración general",
  },
  {
    slug: "biblioteca-archivo",
    nombre: "Bibliotecas y archivos",
    en: "bibliotecas y archivos",
    incluye: ["%bibliotec%", "%archiver%", "%arxiver%", "%archivo% y biblioteca%", "%facultativos de archivos%"],
    busqueda: "biblioteca",
  },
  {
    slug: "conserje-ordenanza",
    nombre: "Conserje y ordenanza",
    en: "conserje y ordenanza",
    incluye: ["%conserje%", "%conserge%", "%conserxe%", "%ordenanza%", "%subaltern%"],
    excluye: ["%ordenanza fiscal%", "%ordenanzas fiscales%", "%ordenanza reguladora%"],
    busqueda: "conserje",
  },
  {
    slug: "operario-peon",
    nombre: "Operario, peón y oficios",
    en: "operario y peón",
    incluye: ["%operari%", "%peon%", "%peo de%", "%peo -%", "%oficial de primera%", "%oficial de segunda%", "%oficial de oficios%", "%jardiner%", "%electricist%", "%fontaner%"],
    busqueda: "operario",
  },
  {
    slug: "conductor",
    nombre: "Conductor",
    en: "conductor",
    incluye: ["%conductor%"],
    excluye: ["%conductora de%"],
    busqueda: "conductor",
  },
  {
    slug: "veterinaria",
    nombre: "Veterinaria",
    en: "veterinaria",
    incluye: ["%veterinari%"],
    busqueda: "veterinario",
  },
  {
    slug: "farmacia",
    nombre: "Farmacia",
    en: "farmacia",
    incluye: ["%farmaceutic%", "%farmacia%"],
    busqueda: "farmacéutico",
  },
  {
    slug: "laboratorio",
    nombre: "Técnico de laboratorio",
    en: "técnico de laboratorio",
    incluye: ["%tecnic% de laboratori%", "%laboratorio clinico%", "%tecnico superior sanitario de laboratorio%"],
    busqueda: "laboratorio",
  },
];

export const PERFIL_POR_SLUG: Record<string, Perfil> = Object.fromEntries(
  PERFILES.map((p) => [p.slug, p]),
);
