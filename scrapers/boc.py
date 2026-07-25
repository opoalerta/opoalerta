"""Scraper del Boletín Oficial de Canarias (BOC).

El BOC publica cada número en HTML server-side con un sumario por secciones:

    https://www.gobiernodecanarias.org/boc/YYYY/NNN/

Las convocatorias están en la parte **"II. Autoridades y personal"**, subsección
**"Oposiciones y concursos"** (`<h3 class="titboc">`). Bajo ella, cada organismo
va en un `<h5>` y cada disposición en un `<li class="justificado_boc">`. La portada
enlaza los últimos números como `/boc/YYYY/NNN`. Licencia: reutilización de
información del sector público citando la fuente (Gobierno de Canarias).

Uso:
    python -m boc --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

HOME_URL = "https://www.gobiernodecanarias.org/boc/"
BASE = "https://www.gobiernodecanarias.org"
SECCION_OPOSICIONES = "Oposiciones y concursos"

_NUM_RE = re.compile(r"/boc/(\d{4})/(\d+)")
# Alternancia en orden de documento: cabecera de organismo (h5) o artículo (li).
_ITEM_RE = re.compile(
    r"<h5>(?P<org>.*?)</h5>"
    r'|<li class="justificado_boc">\s*'
    r'<a href="[^"]*"\s+title="Ir a la disposición '
    r"(?P<y>\d+)/(?P<n>\d+)/(?P<d>\d+)\"[^>]*>.*?</a>\s*"
    r'<a href="[^"]*">(?P<tit>.*?)</a>',
    re.S,
)
_MESES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}
_FECHA_RE = re.compile(r"(\d{1,2}) de (\w+) de (\d{4})")


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _parse_fecha(raw: str) -> date | None:
    m = _FECHA_RE.search(raw)
    if not m:
        return None
    dia, mes, anio = int(m.group(1)), _MESES.get(m.group(2).lower()), int(m.group(3))
    if not mes:
        return None
    return date(anio, mes, dia)


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "oposición" in t or "oposiciones" in t:
        return "oposicion"
    if "bolsa" in t or "lista de reserva" in t or "listas de empleo" in t:
        return "bolsa"
    if "concurso" in t:
        return "concurso"
    return None


class BocScraper(BaseScraper):
    codigo = "boc"
    nombre = "Boletín Oficial de Canarias"
    licencia = "Reutilización de información pública citando fuente (Gobierno de Canarias)"

    def fetch(self) -> str:
        home = http_get(HOME_URL).text
        pares = _NUM_RE.findall(home)
        if not pares:
            raise ValueError("No se encontró ningún número de BOC en la portada")
        anio, num = max((int(y), int(n)) for y, n in pares)
        raw = http_get(f"{BASE}/boc/{anio}/{num}/").text
        self.fecha = _parse_fecha(raw) or date.today()
        return raw

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []
        if SECCION_OPOSICIONES not in raw:
            # Número correcto pero sin oposiciones ese día; si ni parece un
            # sumario del BOC, el formato ha cambiado.
            if "titboc" in raw or "Autoridades y personal" in raw:
                return []
            raise ValueError("El fragmento no es un sumario del BOC de Canarias")

        # Aísla la subsección "Oposiciones y concursos" hasta la siguiente
        # subsección (titboc) o parte (h4).
        inicio = raw.find(SECCION_OPOSICIONES)
        resto = raw[inicio + len(SECCION_OPOSICIONES) :]
        fin = len(resto)
        for marcador in ('<h3 class="titboc"', "<h4"):
            k = resto.find(marcador)
            if k != -1:
                fin = min(fin, k)
        seccion = resto[:fin]

        registros: list[dict[str, Any]] = []
        organismo = ""
        for m in _ITEM_RE.finditer(seccion):
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue
            registros.append(
                {
                    "anio": m.group("y"),
                    "num": m.group("n"),
                    "disp": m.group("d"),
                    "titulo": _clean(m.group("tit")),
                    "organismo": organismo,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        anio, num, disp = registro["anio"], registro["num"], registro["disp"]
        return {
            "id": f"boc:{anio}-{num}-{disp}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Gobierno de Canarias",
            "ambito": "autonomico",
            "ccaa": "CN",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": f"{BASE}/boc/{anio}/{num}/{disp}.html",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOC (Canarias)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BocScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
