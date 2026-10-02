"""Scraper del Boletín Oficial del País Vasco (BOPV / EHAA).

El BOPV publica de lunes a viernes un sumario HTML server-side. El último está
siempre en:

    https://www.euskadi.eus/bopv2/datos/Ultimo.shtml

y los anteriores en `bopv2/datos/YYYY/MM/sYY_NNNN.shtml`. Se ofrece también un
`Ultimo.xml`, pero es un RSS plano sin secciones, así que no sirve para
filtrar.

El sumario va por secciones (`h4.BOPVSumarioSeccion`) y subsecciones
(`h5.BOPVSumarioSubSeccion`). Una cabecera **vacía** significa que sigue la
anterior: el boletín repite el bloque de marcado para cada organismo y solo
rellena el texto cuando cambia. Nos quedamos con la subsección **«Oposiciones
y concursos»** de «Autoridades y personal»; los nombramientos van en otra
subsección y quedan fuera.

En el BOPV publican también las diputaciones forales, los ayuntamientos y la
UPV/EHU, así que el ámbito sale del organismo y no del boletín (#94).

La ingesta corre una vez al día y lee también los dos boletines anteriores al
último. Si el del día saliera después de la ejecución, al día siguiente
`Ultimo.shtml` ya apuntaría al nuevo y ese se perdería sin que nada fallara.
Repetir uno ya ingerido no cuesta nada: el upsert es idempotente.

Licencia: reutilización libre citando la fuente (Gobierno Vasco, Open Data
Euskadi).

Uso:
    python -m bopv --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

ULTIMO_URL = "https://www.euskadi.eus/bopv2/datos/Ultimo.shtml"
BASE_DOCS = "https://www.euskadi.eus/bopv2/datos"
SECCION_OPOSICIONES = "Oposiciones y concursos"
# Secciones que trae cualquier boletín. Si no aparece ninguna, el marcado ha
# cambiado: mejor fallar que devolver cero en silencio.
SECCIONES_CONOCIDAS = (
    "AUTORIDADES Y PERSONAL",
    "OTRAS DISPOSICIONES",
    "ANUNCIOS",
    "DISPOSICIONES GENERALES",
)

_TOKEN_RE = re.compile(
    r'<h4 class="BOPVSumarioSeccion">(?P<sec>.*?)</h4>'
    r'|<h5 class="BOPVSumarioSubSeccion">(?P<sub>.*?)</h5>'
    r'|<h5 class="BOPVSumarioOrganismo">(?P<org>.*?)</h5>'
    r'|<p class="BOPVSumarioTitulo"><a href="(?P<url>[^"]+)"[^>]*>(?P<titulo>.*?)</a>',
    re.S,
)
# El enlace es relativo y cambia de forma según la página: «2604066a.shtml» en
# el sumario de un día, «2026/10/2604066a.shtml» en Ultimo.shtml. Se queda solo
# el número y la ruta se rehace con la fecha del boletín.
_DOC_RE = re.compile(r"(\d{7})a\.shtml$")
_NUMERO_RE = re.compile(r'tituGeneral">Sumario[^<]*<span>(\d+)</span>')
# Cuántos boletines anteriores al último se vuelven a leer en cada ejecución.
ANTERIORES = 2
# Anclada al número entre <span>: con un comodín perezoso se iba hasta la
# primera fecha de cualquier título del sumario («de 10 de septiembre…»).
# `\s+` y no un espacio: el boletín escribe «de octubre de  2026», con dos.
_FECHA_RE = re.compile(
    r'tituGeneral">Sumario[^<]*<span>\d+</span>,\s*[^\d<]*?(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})',
    re.IGNORECASE,
)
_MESES = {
    m: i + 1
    for i, m in enumerate(
        [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ]
    )
}


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def fecha_sumario(raw: str) -> date | None:
    """La fecha del boletín, de la cabecera «Sumario n.º 188, jueves 1 de octubre de 2026»."""
    m = _FECHA_RE.search(raw)
    if not m or m.group(2).lower() not in _MESES:
        return None
    return date(int(m.group(3)), _MESES[m.group(2).lower()], int(m.group(1)))


def ambito_de(organismo: str) -> str:
    o = organismo.lower()
    if "universidad" in o or "unibertsitatea" in o:
        return "universidad"
    if "diputación foral" in o or "diputacion foral" in o or "foru aldundia" in o:
        return "provincial"
    if "ayuntamiento" in o or "udala" in o or "mancomunidad" in o or "cuadrilla" in o:
        return "local"
    return "autonomico"


class BopvScraper(BaseScraper):
    codigo = "bopv"
    nombre = "Boletín Oficial del País Vasco"
    licencia = "Reutilización libre citando la fuente (Gobierno Vasco, Open Data Euskadi)"

    def fetch(self) -> list[str]:
        # El sumario llega en ISO-8859-1 sin declararlo en la cabecera HTTP.
        ultimo = http_get(ULTIMO_URL).content.decode("iso-8859-1")
        fecha = fecha_sumario(ultimo)
        numero = _NUMERO_RE.search(ultimo)
        if fecha is None or numero is None:
            raise ValueError("No se encontró la fecha o el número del último sumario del BOPV")
        self.fecha = fecha
        sumarios = [ultimo]

        # Los anteriores cuelgan de la carpeta de su mes: el del día 1 está en
        # la del mes en curso y el de la víspera, en la del anterior.
        meses = [(fecha.year, fecha.month)]
        meses.append((fecha.year, fecha.month - 1) if fecha.month > 1 else (fecha.year - 1, 12))
        for n in range(int(numero.group(1)) - 1, int(numero.group(1)) - 1 - ANTERIORES, -1):
            if n < 1:
                break  # primer boletín del año: el anterior es de otra numeración
            for anio, mes in meses:
                url = f"{BASE_DOCS}/{anio}/{mes:02d}/s{anio % 100:02d}_{n:04d}.shtml"
                try:
                    sumarios.append(http_get(url).content.decode("iso-8859-1"))
                    break
                except httpx.HTTPStatusError:
                    continue
        return sumarios

    def parse(self, raw: str | list[str]) -> list[dict[str, Any]]:
        if isinstance(raw, list):
            return [r for sumario in raw for r in self.parse(sumario)]
        if not raw:
            return []
        fecha = fecha_sumario(raw) or self.fecha

        registros: list[dict[str, Any]] = []
        seccion = subseccion = organismo = ""
        vistas: set[str] = set()
        for m in _TOKEN_RE.finditer(raw):
            if m.group("sec") is not None:
                if texto := _clean(m.group("sec")):
                    seccion, subseccion = texto, ""
                    vistas.add(texto.upper())
                continue
            if m.group("sub") is not None:
                if texto := _clean(m.group("sub")):
                    subseccion = texto
                continue
            if m.group("org") is not None:
                # Igual que las secciones: vacío = mismo organismo que el anterior.
                if texto := _clean(m.group("org")):
                    organismo = texto
                continue
            if subseccion != SECCION_OPOSICIONES:
                continue
            doc = _DOC_RE.search(m.group("url"))
            if not doc:
                continue
            registros.append(
                {
                    "id_bopv": doc.group(1),
                    "titulo": _clean(m.group("titulo")),
                    "organismo": organismo.title() if organismo.isupper() else organismo,
                    "seccion": seccion,
                    "fecha": fecha,
                }
            )

        if not vistas.intersection(SECCIONES_CONOCIDAS):
            raise ValueError("El sumario del BOPV no trae ninguna sección reconocible")
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        organismo = registro["organismo"] or "Gobierno Vasco"
        fecha: date = registro.get("fecha") or self.fecha
        url = f"{BASE_DOCS}/{fecha:%Y/%m}/{registro['id_bopv']}a.shtml"
        return {
            "id": f"bopv:{registro['id_bopv']}",
            "titulo": registro["titulo"],
            "organismo": organismo,
            "ambito": ambito_de(organismo),
            "ccaa": "PV",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": fecha.isoformat(),
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "libre designación" in t:
        return "otro"
    if "proceso selectivo" in t or "oposición" in t or "pruebas selectivas" in t:
        return "oposicion"
    if "concurso" in t:
        return "concurso"
    if "bolsa" in t:
        return "bolsa"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOPV (País Vasco)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BopvScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
