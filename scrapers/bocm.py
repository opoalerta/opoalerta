"""Scraper del Boletín Oficial de la Comunidad de Madrid (BOCM).

El BOCM publica un sumario diario en XML. La portada enlaza el del día, así que
no hay que adivinar el número de boletín:

    https://www.bocm.es/boletin/CM_Boletin_BOCM/YYYY/MM/DD/BOCM-YYYYMMDDNNN.xml

El sumario anida `seccion > apartado > organismo > disposicion`. Se recogen dos
sitios:

1. **Sección I, apartado «B) Autoridades y Personal»** — la Comunidad de Madrid.
   Convocatorias, procesos selectivos y provisión de puestos. Ámbito autonómico.
2. **Sección III, «ADMINISTRACIÓN LOCAL AYUNTAMIENTOS»** — los ayuntamientos
   madrileños. Ámbito local.

La sección III no tiene apartados con nombre (vienen con `nombre=""`), pero el
BOCM prefija cada título con su propia categoría, que sí es vocabulario
controlado:

    – Móstoles. Ofertas de empleo. Convocatoria proceso selectivo
    – Alcorcón. Régimen económico. Modificación presupuestaria

Se filtra por esa categoría, no por el texto libre: entra `Ofertas de empleo` y
se queda fuera `Régimen económico`, `Urbanismo`, `Licencias`, `Contratación`,
`Organización y funcionamiento` y `Otros anuncios`. También queda fuera
`Personal`, que son plantillas, relaciones de puestos y nombramientos ya
resueltos —el equivalente al II.a del BOA—, no algo a lo que presentarse.

El BOCM traspapela alguna: sobre 7 días había una `Régimen económico.
Convocatoria proceso selectivo`. Por eso la subcategoría también vale como
entrada, y también es vocabulario suyo.

Licencia: reutilización de datos públicos citando la fuente (aviso legal BOCM).

Uso:
    python -m bocm --dry-run
    python -m bocm --out ../out/bocm.json
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

HOME_URL = "https://www.bocm.es/"
SUMARIO_RE = re.compile(r"/boletin/CM_Boletin_BOCM/\d{4}/\d{2}/\d{2}/BOCM-\d+\.xml")
APARTADO_OPOSICIONES = "Autoridades y Personal"

#: Sección de los ayuntamientos madrileños. Sus apartados vienen sin nombre.
SECCION_LOCAL = "III."
#: Categoría del BOCM para el empleo público local.
CATEGORIA_EMPLEO = "Ofertas de empleo"
#: Subcategorías que delatan una convocatoria mal archivada bajo otra categoría.
_SUBCATEGORIA_EMPLEO_RE = re.compile(
    r"proceso selectivo|oposici|oferta empleo|bolsa de (?:empleo|trabajo)",
    re.I,
)
#: Título de la sección III: "– Municipio. Categoría. Subcategoría".
_TITULO_LOCAL_RE = re.compile(r"^[–-]\s*(?P<municipio>[^.]+)\.\s*(?P<cat>[^.]+)\.\s*(?P<sub>.*)$")
_GUION_INICIAL_RE = re.compile(r"^[–-]\s*")


class BocmScraper(BaseScraper):
    codigo = "bocm"
    nombre = "Boletín Oficial de la Comunidad de Madrid"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal BOCM)"

    def fetch(self) -> str:
        home = http_get(HOME_URL)
        m = SUMARIO_RE.search(home.text)
        if not m:
            raise ValueError("No se encontró el enlace al sumario XML en la portada del BOCM")
        return http_get("https://www.bocm.es" + m.group(0)).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        root = ET.fromstring(raw)
        if root.tag != "sumario":
            raise ValueError(f"El XML del BOCM no es un sumario (raíz: {root.tag!r})")

        fecha = self._fecha(root)
        parent = {child: p for p in root.iter() for child in p}

        def ancestor_attr(el: ET.Element, tag: str, attr: str) -> str:
            cur: ET.Element | None = el
            while cur is not None:
                if cur.tag == tag:
                    return cur.get(attr, "")
                cur = parent.get(cur)
            return ""

        registros: list[dict[str, Any]] = []
        vistos: set[str] = set()
        for disp in root.iter("disposicion"):
            ident = (disp.findtext("identificador") or "").strip()
            if not ident or ident in vistos:
                continue
            titulo = re.sub(r"\s+", " ", disp.findtext("titulo") or "").strip()
            seccion = ancestor_attr(disp, "seccion", "nombre")
            apartado = ancestor_attr(disp, "apartado", "nombre")

            organismo = ancestor_attr(disp, "organismo", "nombre").strip()

            if seccion.startswith(SECCION_LOCAL):
                if not _es_empleo_local(titulo):
                    continue
                ambito = "local"
                # Hay días en que el <organismo> de la sección III viene sin
                # atributo `nombre`. El municipio abre siempre el título, así
                # que sale de ahí antes que caer en «Comunidad de Madrid», que
                # sería sencillamente falso para un ayuntamiento.
                organismo = organismo or _municipio(titulo)
                titulo = _limpia_titulo_local(titulo)
            elif APARTADO_OPOSICIONES in apartado:
                ambito = "autonomico"
            else:
                continue

            vistos.add(ident)
            registros.append(
                {
                    "identificador": ident,
                    "titulo": titulo,
                    "organismo": organismo,
                    "ambito": ambito,
                    "url_html": (disp.findtext("url_html") or "").strip(),
                    "fecha": fecha,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ident = registro["identificador"]
        url = registro["url_html"] or f"https://www.bocm.es/{ident.lower()}"
        return {
            "id": f"bocm:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Comunidad de Madrid",
            "ambito": registro["ambito"],
            "ccaa": "MD",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": registro["fecha"],
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }

    @staticmethod
    def _fecha(root: ET.Element) -> str:
        # metadatos/fecha_publicacion viene como YYYY/MM/DD.
        raw = (root.findtext(".//fecha_publicacion") or "").strip()
        if re.fullmatch(r"\d{4}/\d{2}/\d{2}", raw):
            return raw.replace("/", "-")
        return datetime.now(UTC).date().isoformat()


def _es_empleo_local(titulo: str) -> bool:
    """¿Es esta disposición de la sección III una convocatoria de empleo?

    Decide por la categoría que el propio BOCM pone al principio del título, no
    por el texto libre. La subcategoría vale de red: el BOCM archiva alguna
    convocatoria bajo `Régimen económico` y así no se pierde.
    """
    m = _TITULO_LOCAL_RE.match(titulo)
    if not m:
        return False
    if m.group("cat").strip() == CATEGORIA_EMPLEO:
        return True
    return bool(_SUBCATEGORIA_EMPLEO_RE.search(m.group("sub")))


def _municipio(titulo: str) -> str:
    """Municipio que abre el título de la sección III, como organismo."""
    m = _TITULO_LOCAL_RE.match(titulo)
    return f"Ayuntamiento de {m.group('municipio').strip()}" if m else ""


def _limpia_titulo_local(titulo: str) -> str:
    """Quita el guion inicial de los títulos de la sección III.

    El BOCM los publica como «– Móstoles. Ofertas de empleo. Proceso selectivo».
    El guion no aporta nada y descuadra el listado junto al resto de fuentes.
    """
    return _GUION_INICIAL_RE.sub("", titulo).strip()


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "proceso selectivo" in t or "oposición" in t or "oposiciones" in t:
        return "oposicion"
    if "concurso" in t:
        return "concurso"
    if "bolsa" in t:
        return "bolsa"
    if "libre designación" in t or "libre desiganción" in t:
        return "otro"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOCM")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BocmScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
