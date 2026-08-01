"""Scraper del Diario Oficial de Extremadura (DOE).

El DOE publica el sumario de cada día en HTML server-side (codificado en
ISO-8859-1):

    https://doe.juntaex.es/ultimosdoe/mostrardoe.php?fecha=YYYYMMDD&t=o

Las convocatorias están en la parte **"II. AUTORIDADES Y PERSONAL"**, subsección
**"OPOSICIONES Y CONCURSOS"** (`<span class="DOE6">`). Cada organismo va en un
`<span class="DOE2">` suelto y cada disposición en un `<div class="justificado">`
con un epígrafe (`DOE2`), el título (`DOE4`) y un enlace `html.php?xml=…`.
La portada enlaza las fechas recientes. El servidor exige User-Agent de
navegador (si no, responde 403). Licencia: reutilización de información pública
citando la fuente (Junta de Extremadura).

Uso:
    python -m doe --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

HOME_URL = "https://doe.juntaex.es/"
SUMARIO_URL = "https://doe.juntaex.es/ultimosdoe/mostrardoe.php?fecha={fecha}&t=o"
SUBSECCION = "OPOSICIONES Y CONCURSOS"
# El DOE bloquea clientes sin apariencia de navegador (403).
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

# Cuántos días atrás buscar el último boletín. El DOE no publica fines de semana
# ni festivos, y una racha larga sin publicar es una anomalía que conviene que
# falle a la vista en vez de silenciarse.
DIAS_ATRAS = 10

# Un sumario real trae bloques `DOE2` (organismos y epígrafes); un día sin
# boletín devuelve la misma página de ~10 KB sin ninguno.
_TIENE_CONTENIDO_RE = re.compile(r'class="DOE2"')
_ITEM_RE = re.compile(
    r'<p\s*>\s*<span class="DOE2">(?P<org>[^<]+)</span\s*>\s*</p\s*>'
    r'|<div class="justificado"\s*>(?P<disp>.*?)</div\s*>',
    re.S,
)
_LINK_RE = re.compile(r"html\.php\?xml=(\d+)&(?:amp;)?anio=(\d+)&(?:amp;)?doe=([^&\"\s]+)")
_DOE4_RE = re.compile(r'<span class="DOE4">(.*?)</span\s*>', re.S)
_EPI_RE = re.compile(r'<span class="DOE2">(.*?)</span\s*>', re.S)


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    # "Procesos selectivos" en plural es el epígrafe habitual del DOE y no
    # casaba con el singular, así que estas convocatorias salían sin clasificar.
    if "proceso selectivo" in t or "procesos selectivos" in t or "oposici" in t:
        return "oposicion"
    if "bolsa" in t or "lista de reserva" in t or "listas de empleo" in t:
        return "bolsa"
    if "concurso" in t:
        return "concurso"
    return None


class DoeScraper(BaseScraper):
    codigo = "doe"
    nombre = "Diario Oficial de Extremadura"
    licencia = "Reutilización de información pública citando fuente (Junta de Extremadura)"

    def fetch(self) -> str:
        """
        Busca hacia atrás el último boletín publicado.

        La portada enlazaba las fechas como `mostrardoe.php?fecha=YYYYMMDD`, y
        el 1 de agosto de 2026 ese listado desapareció en un rediseño: quedó un
        formulario de mes y año que ignora los parámetros por GET. Preguntar por
        fecha sigue funcionando, así que se prueban los días recientes en vez de
        depender de un marcado que ya se ha roto una vez.
        """
        hoy = date.today()
        for dias in range(DIAS_ATRAS):
            dia = hoy - timedelta(days=dias)
            resp = http_get(
                SUMARIO_URL.format(fecha=dia.strftime("%Y%m%d")),
                headers={**_HEADERS, "Referer": HOME_URL},
            )
            raw = resp.content.decode("iso-8859-1", "replace")
            if _TIENE_CONTENIDO_RE.search(raw):
                self.fecha = dia
                return raw

        raise ValueError(f"El DOE no ha publicado ningún boletín en los últimos {DIAS_ATRAS} días")

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []
        if "AUTORIDADES Y PERSONAL" not in raw:
            if "mostrardoe" in raw or "SUMARIO" in raw:
                return []  # sumario del DOE sin sección de personal ese día
            raise ValueError("El fragmento no es un sumario del DOE")

        op = raw.find(SUBSECCION)
        if op == -1:
            return []  # ese día no hay oposiciones y concursos
        sub = raw[op:]
        # Termina en la siguiente subsección (DOE6) o sección (d2/d3/…).
        fin = len(sub)
        for m in re.finditer(r'<span class="(?:DOE6|d\d)">', sub[len(SUBSECCION) :]):
            fin = min(fin, m.start() + len(SUBSECCION))
            break
        sub = sub[:fin]

        registros: list[dict[str, Any]] = []
        organismo = ""
        for m in _ITEM_RE.finditer(sub):
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue
            disp = m.group("disp")
            link = _LINK_RE.search(disp)
            if not link:
                continue
            epi = _EPI_RE.search(disp)
            cuerpo = _DOE4_RE.search(disp)
            titulo = " ".join(
                p
                for p in (
                    _clean(epi.group(1)) if epi else "",
                    _clean(cuerpo.group(1)) if cuerpo else "",
                )
                if p
            ).strip()
            registros.append(
                {
                    "xml": link.group(1),
                    "anio": link.group(2),
                    "doe": link.group(3),
                    "titulo": titulo,
                    "organismo": organismo,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        xml, anio, doe = registro["xml"], registro["anio"], registro["doe"]
        url = f"https://doe.juntaex.es/otrosFormatos/html.php?xml={xml}&anio={anio}&doe={doe}"
        return {
            "id": f"doe:{xml}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Junta de Extremadura",
            "ambito": "autonomico",
            "ccaa": "EX",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del DOE (Extremadura)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(DoeScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
