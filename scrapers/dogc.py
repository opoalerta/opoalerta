"""Scraper del Diari Oficial de la Generalitat de Catalunya (DOGC).

El portal es una SPA: el HTML del sumario llega vacío y lo rellena jQuery. Detrás
hay una API REST sin token. El camino para encontrarla, por si vuelve a cambiar:

1. `https://dogc.gencat.cat/es/sumari-del-dogc/` carga
   `…/httpFetch/resources/fpca_sumari_DOGC/js/fpca_sumari_DOGC.js`.
2. Ese JS hace POST a `protocolo://hostConstant:puerto` + el `uriSumari` que la
   propia página trae en un `<input type="hidden">`.
3. `hostConstant` sale de `…/httpFetch/resources/common/js/constants.js`
   (`HOST_PRO = "portaldogc.gencat.cat"`), junto con el resto de rutas.

Endpoints usados (POST, `application/x-www-form-urlencoded`):

    /eadop-rest/api/dogc/calendarDOGC   month, year, language  → días con boletín
    /eadop-rest/api/dogc/summaryDOGC    numDOGC, language      → sumario completo

El sumario **no se puede pedir por fecha**: sólo por número de boletín. De ahí
que haga falta el calendario para traducir fecha → `numDOGC`.

Secciones del DOGC y qué se hace con cada una:

- **Cargos y personal** — la sección de empleo público de la Generalitat. Es la
  única, y mete en el mismo saco lo que el BOE separa en II.A (nombramientos) y
  II.B (oposiciones y concursos), así que hay que descartar por título los
  nombramientos, ceses, designaciones y encargos de despacho. Va en dos niveles:
  `_CERRADO_RE` descarta siempre, y `_DUDOSO_RE` sólo si el título no trae señal
  de convocatoria. Si no, se perdería «se resuelve la convocatoria para la
  provisión, por el sistema de libre **designación**, de dos puestos».
  Ámbito autonómico, salvo el epígrafe «Universidades catalanas» → `universidad`.
- **Administración local** — ayuntamientos, consejos comarcales y diputaciones,
  con un nivel extra de anidamiento (`subheader`). Aquí no hay subsección de
  empleo: la convocatoria de una plaza convive con urbanismo y subvenciones, así
  que se filtra por título (`_EMPLEO_RE` menos `_NO_EMPLEO_RE`). Ámbito local.
- **Otros sujetos emisores** — consorcios y entes públicos que también convocan
  plazas. Mismo filtro que la local; ámbito `otro`.
- Disposiciones generales, Otras disposiciones y Anuncios se descartan enteras.

Licencia: reutilización de la información pública citando la fuente (aviso legal
del DOGC / EADOP).

Uso:
    python -m dogc --dry-run
    python -m dogc --out ../out/dogc.json
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any

from common.base import BaseScraper
from common.http import post as http_post
from common.runner import execute

API = "https://portaldogc.gencat.cat/eadop-rest/api/dogc"
PORTAL = "https://dogc.gencat.cat/es"
HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Referer": f"{PORTAL}/sumari-del-dogc/",
}

#: Con `language=es` la API devuelve el sumario en castellano, títulos de sección
#: incluidos. Los filtros de abajo dependen de esos nombres.
IDIOMA = "es"

SECCION_PERSONAL = "Cargos y personal"
SECCION_LOCAL = "Administración local"
SECCION_OTROS = "Otros sujetos emisores"
#: Las tres que se descartan enteras. Están aquí para poder distinguir «hoy no
#: había oposiciones» de «el DOGC ha cambiado los nombres de las secciones».
SECCIONES_DESCARTADAS = ("Disposiciones generales", "Otras disposiciones", "Anuncios")
SECCIONES_CONOCIDAS = (SECCION_PERSONAL, SECCION_LOCAL, SECCION_OTROS, *SECCIONES_DESCARTADAS)

#: Epígrafe de «Cargos y personal» que agrupa a las universidades públicas.
EPIGRAFE_UNIVERSIDADES = "Universidades catalanas"

#: Días de calendario que se piden hacia atrás en cada ejecución. Uno solo dejaría
#: fuera el fin de semana y cualquier día que la ingesta se saltara; los repetidos
#: los descarta el id.
DIAS_VENTANA = int(os.environ.get("DOGC_DIAS_VENTANA", "5"))

#: Un nombramiento, un cese o maquinaria de altos cargos, dicho sin ambigüedad.
#: En el BOE esto vive en la sección II.A, que no se ingiere; el DOGC no lo
#: separa. Nunca es una convocatoria, por mucho que el título arrastre el nombre
#: del proceso del que sale: «se hace público el nombramiento como funcionarios
#: de las personas aspirantes aprobadas en las pruebas selectivas…».
_CERRADO_RE = re.compile(
    r"se hace p[úu]blico el nombramiento|se hace p[úu]blica la adjudicaci[óo]n|"
    r"\bde nombramientos? de\b|se nombran?\b|\bde ceses?\b|cese y nombramiento|"
    r"encargo del despacho|suplencia",
    re.I,
)
#: Más ambiguas: «designación» está tanto en el nombramiento de un vocal como en
#: la convocatoria de un puesto de libre designación, y una «adjudicación de
#: plaza» puede ser el desenlace de un concurso al que hubo que presentarse.
#: Sólo descartan si el título no trae ninguna señal de convocatoria.
_DUDOSO_RE = re.compile(
    r"designaci[óo]n|se designan|adjudicaci[óo]n de (?:una |la |)plazas?|\bnombramientos?\b",
    re.I,
)
#: Señales de que el título sí es una convocatoria. Vence a `_DUDOSO_RE`.
_CONVOCATORIA_RE = re.compile(
    r"convocatoria|convocan|proceso selectivo|proceso de selecci[óo]n|"
    r"pruebas selectivas|oposici|\bbases\b|aspirantes|bolsa",
    re.I,
)

#: Empleo público en las secciones que no lo separan (local y otros emisores).
_EMPLEO_RE = re.compile(
    r"oposici|procesos? selectivos?|procesos? de selecci[óo]n|pruebas selectivas|"
    r"bolsa de|oferta (?:p[úu]blica|de empleo|de ocupaci[óo]n|parcial de empleo)|"
    r"convocatoria.{0,80}(?:plazas?|puestos?|selecci[óo]n|personal)|"
    r"bases.{0,80}(?:selecci[óo]n|plazas?|puestos?|bolsa|convocatoria)|"
    r"selecci[óo]n.{0,40}plazas?|provisi[óo]n.{0,40}puestos? de trabajo|"
    r"concurso de cambio de destino",
    re.I,
)
#: Lo que usa el mismo vocabulario («bases», «convocatoria», «provisión») sin ser
#: empleo: subvenciones, y las plantillas y RPT, que son organigrama, no plaza.
_NO_EMPLEO_RE = re.compile(
    r"subvenci|\bayudas?\b|\bbecas?\b|\bpremios?\b|plantilla|relaci[óo]n de puestos de trabajo",
    re.I,
)

_DOCUMENT_ID_RE = re.compile(r"documentId=(\d+)")
_FECHA_RE = re.compile(r"^(\d{2})/(\d{2})/(\d{4})$")
_NUM_DOGC_RE = re.compile(r"numDOGC=(\d+)")


def _api(endpoint: str, data: dict[str, str]) -> dict[str, Any]:
    return http_post(f"{API}/{endpoint}", data=data, headers=HEADERS).json()


def _calendario(mes: int, anio: int) -> dict[date, str]:
    """Días de ese mes con boletín, mapeados a su `numDOGC`."""
    datos = _api("calendarDOGC", {"month": str(mes), "year": str(anio), "language": IDIOMA})
    dias: dict[date, str] = {}
    for entrada in datos.get("calendar") or []:
        if not entrada.get("hasDOGC"):
            continue
        m_fecha = _FECHA_RE.match((entrada.get("date") or "").strip())
        m_num = _NUM_DOGC_RE.search(entrada.get("linkDOGC") or "")
        if m_fecha and m_num:
            dia, mes_, anio_ = m_fecha.groups()
            dias[date(int(anio_), int(mes_), int(dia))] = m_num.group(1)
    return dias


def _titulo(elemento: dict[str, Any]) -> str:
    return re.sub(r"\s+", " ", elemento.get("title") or "").strip()


def _es_empleo(titulo: str) -> bool:
    """¿Es esta disposición de la local (o de otros emisores) una convocatoria?

    Filtro por título porque el DOGC no separa el empleo del resto en esas
    secciones: no hay ningún campo por el que discriminar.
    """
    return bool(_EMPLEO_RE.search(titulo)) and not _NO_EMPLEO_RE.search(titulo)


def _es_proceso_abierto(titulo: str) -> bool:
    """¿Sigue vivo el proceso, o es un nombramiento/cese ya resuelto?"""
    if _CERRADO_RE.search(titulo):
        return False
    if _DUDOSO_RE.search(titulo):
        return bool(_CONVOCATORIA_RE.search(titulo))
    return True


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "proceso de selección" in t or "oposici" in t:
        return "oposicion"
    if "bolsa" in t:
        return "bolsa"
    if "concurso" in t:
        return "concurso"
    if "libre designación" in t:
        return "otro"
    return None


class DogcScraper(BaseScraper):
    codigo = "dogc"
    nombre = "Diari Oficial de la Generalitat de Catalunya"
    licencia = "Reutilización de información pública citando fuente (aviso legal DOGC/EADOP)"

    def fetch(self) -> list[dict[str, Any]]:
        """Sumarios de los últimos `DIAS_VENTANA` días con boletín."""
        dias = [self.fecha - timedelta(days=n) for n in range(DIAS_VENTANA)]
        calendario: dict[date, str] = {}
        for mes, anio in dict.fromkeys((d.month, d.year) for d in dias):
            calendario.update(_calendario(mes, anio))

        if not calendario:
            # El calendario de un mes entero nunca viene vacío: si lo está, lo
            # que falla es la API, no que no hubiera boletines.
            raise ValueError("El calendario del DOGC no devolvió ningún día con boletín")

        sumarios = []
        for numero in dict.fromkeys(calendario[d] for d in dias if d in calendario):
            sumarios.append(_api("summaryDOGC", {"numDOGC": numero, "language": IDIOMA}))
        return sumarios

    def parse(self, raw: Any) -> list[dict[str, Any]]:
        # `run(raw=...)` de los tests pasa un sumario; fetch() pasa varios.
        respuestas = raw if isinstance(raw, list) else [raw]

        registros: list[dict[str, Any]] = []
        vistos: set[str] = set()
        for respuesta in respuestas:
            if not isinstance(respuesta, dict) or "sumaris" not in respuesta:
                raise ValueError("La respuesta no es un sumario del DOGC")
            for sumario in respuesta["sumaris"]:
                for registro in self._del_sumario(sumario):
                    if registro["identificador"] in vistos:
                        continue
                    vistos.add(registro["identificador"])
                    registros.append(registro)
        return registros

    def _del_sumario(self, sumario: dict[str, Any]) -> list[dict[str, Any]]:
        fecha = self._fecha(sumario)
        registros: list[dict[str, Any]] = []
        documentos = 0
        reconocidas = 0

        for seccion in sumario.get("section") or []:
            titulo_seccion = _titulo(seccion)
            if titulo_seccion in SECCIONES_CONOCIDAS:
                reconocidas += 1
            for epigrafe in seccion.get("header") or []:
                nombre = _titulo(epigrafe)
                # La local anida un nivel más: Ayuntamientos → Ayuntamiento de X.
                grupos = [(_titulo(sub), sub) for sub in epigrafe.get("subheader") or []]
                grupos.append((nombre, epigrafe))
                for organismo, contenedor in grupos:
                    for documento in contenedor.get("document") or []:
                        documentos += 1
                        registro = self._documento(
                            titulo_seccion, nombre, organismo, documento, fecha
                        )
                        if registro:
                            registros.append(registro)

        if documentos and not reconocidas:
            # Devolver cero es indistinguible de «hoy no había oposiciones», así
            # que un cambio de nombres de sección se quedaría callado.
            raise ValueError("El sumario del DOGC no trae ninguna sección conocida")
        return registros

    def _documento(
        self,
        seccion: str,
        epigrafe: str,
        organismo: str,
        documento: dict[str, Any],
        fecha: str,
    ) -> dict[str, Any] | None:
        titulo = _titulo(documento)
        if seccion == SECCION_PERSONAL:
            if not _es_proceso_abierto(titulo):
                return None
            ambito = "universidad" if epigrafe == EPIGRAFE_UNIVERSIDADES else "autonomico"
        elif seccion == SECCION_LOCAL:
            if not _es_empleo(titulo):
                return None
            ambito = "local"
        elif seccion == SECCION_OTROS:
            if not _es_empleo(titulo):
                return None
            ambito = "otro"
        else:
            return None

        m = _DOCUMENT_ID_RE.search(documento.get("linkDownloadDocumentPDF") or "")
        if not m:
            return None
        return {
            "identificador": m.group(1),
            "titulo": titulo,
            "organismo": organismo,
            "ambito": ambito,
            "fecha": fecha,
        }

    @staticmethod
    def _fecha(sumario: dict[str, Any]) -> str:
        """`dateDOGC` llega como DD/MM/AAAA. Cada sumario trae la suya: la
        ventana mezcla varios días y publicarlos todos con la fecha de hoy
        falsearía el listado."""
        m = _FECHA_RE.match((sumario.get("dateDOGC") or "").strip())
        if not m:
            raise ValueError(f"Fecha de sumario ilegible: {sumario.get('dateDOGC')!r}")
        dia, mes, anio = m.groups()
        return f"{anio}-{mes}-{dia}"

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ident = registro["identificador"]
        return {
            "id": f"dogc:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Generalitat de Catalunya",
            "ambito": registro["ambito"],
            "ccaa": "CT",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": registro["fecha"],
            "url_oficial": f"{PORTAL}/document-del-dogc/?documentId={ident}",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del DOGC (Cataluña)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(DogcScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
