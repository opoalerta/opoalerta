"""Scraper del Boletín Oficial del Principado de Asturias (BOPA).

El BOPA vive en un portal Liferay que no expone sumario por ruta de fecha
(`/bopa/AAAA/MM/DD` devuelve 404), pero sí lo renderiza en servidor bajo:

    https://miprincipado.asturias.es/bopa/ultimos-boletines?p_r_p_summaryLastBopa=true

Un día concreto se pide con `?p_r_p_summaryDate=DD/MM/AAAA`, que es lo que usa
la fixture del test.

El sumario está en `<div id="bopa-boletin">` con esta jerarquía:

    <h4> parte      — «I. Principado de Asturias», «IV. Administración Local»…
    <h5> sección    — «AUTORIDADES Y PERSONAL», «OTRAS DISPOSICIONES»…
    <h6> organismo
    <dl><dt> título … <strong>[Cód. AAAA-NNNNN]</strong></dt></dl>

El PDF de cada disposición es `/bopa/AAAA/MM/DD/CODIGO.pdf`, y el del boletín
entero `/bopa/AAAA/MM/DD/AAAAMMDD.pdf`, de donde se saca la fecha.

**Por qué hay filtro por palabras.** Los demás boletines tienen una subsección
propia de oposiciones que se puede tomar entera; el BOPA no. Su sección de
personal mezcla convocatorias con actos administrativos (sustituciones
temporales, delegaciones de competencias, ceses). Publicar un decreto de
sustitución como si fuera una convocatoria es ruido, así que se filtra por
marcadores de proceso selectivo. Es un filtro positivo: si el título no dice
que hay un proceso, no entra.

Los datos abiertos del BOPA en datos.gob.es (`a03002951-bopa1` y `-bopa2`)
tienen mejor estructura, pero el último año publicado es 2024, así que no
sirven para una ingesta diaria. Quedan documentados por si se reactivan.

**No corre en GitHub Actions.** Desde 2026-09-22 el cortafuegos del Principado
descarta las conexiones a `miprincipado.asturias.es` y `sede.asturias.es` que
llegan desde los runners de GitHub (rangos de Azure): el DNS resuelve, pero la
conexión TCP no se abre nunca. `www.asturias.es`, en la misma red, sí contesta.
Diagnóstico en la issue #140. Por eso se ejecuta desde una máquina con IP
residencial (`local/bopa.sh`), que repasa los últimos días cada vez: si un día
no corre, la pasada siguiente lo recupera.

**Un día sin boletín devuelve otro.** Pedir un sábado o un festivo trae el último
boletín publicado, no un sumario vacío. Por eso se compara la fecha del PDF con
la pedida y, si no coinciden, ese día no aporta nada.

Licencia: reutilización de información del sector público citando la fuente
(Principado de Asturias).

Uso:
    python -m bopa --dry-run                      # último boletín
    python -m bopa --fecha 2026-10-26             # un día
    python -m bopa --desde 2026-09-22             # de ese día a hoy
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

BASE = "https://miprincipado.asturias.es"
SUMARIO_URL = f"{BASE}/bopa/ultimos-boletines?p_r_p_summaryLastBopa=true"
SEDE = "https://sede.asturias.es"

# La sección de personal. Las convocatorias locales van en AYUNTAMIENTOS, pero
# allí se mezclan con presupuestos y padrones y el título rara vez basta para
# distinguirlas; se deja fuera hasta tener una señal fiable.
SECCION_PERSONAL = "AUTORIDADES Y PERSONAL"

# Fecha y número tomados del PDF del boletín completo: /bopa/AAAA/MM/DD/AAAAMMDD.pdf
_BOLETIN_RE = re.compile(r"/bopa/(\d{4})/(\d{2})/(\d{2})/(\d{8})\.pdf")

_CODIGO_RE = re.compile(r"\[Cód\.\s*(\d{4}-\d+)\]")

# Recorre el sumario en orden de documento.
_TOKEN_RE = re.compile(
    r"<h5>(?P<sec>.*?)</h5>|<h6[^>]*>(?P<org>.*?)</h6>|<dt>(?P<item>.*?)</dt>",
    re.S,
)

# Marcadores de que el título anuncia un proceso de selección o provisión.
_ES_CONVOCATORIA_RE = re.compile(
    r"convocatoria|se convoca|convocan|proceso selectivo|procesos selectivos"
    r"|pruebas selectivas|oposici|concurso|bolsa de (?:empleo|trabajo)"
    r"|lista[s]? de empleo|bolsín|promoción interna|provisión de puesto"
    r"|libre designación|lista[s]? de reserva",
    re.I,
)


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "pruebas selectivas" in t or "oposici" in t:
        return "oposicion"
    if "bolsa" in t or "lista de empleo" in t or "lista de reserva" in t or "bolsín" in t:
        return "bolsa"
    if "concurso" in t or "libre designación" in t or "provisión de puesto" in t:
        return "concurso"
    return None


class BopaScraper(BaseScraper):
    codigo = "bopa"
    nombre = "Boletín Oficial del Principado de Asturias"
    licencia = "Reutilización de información pública citando fuente (Principado de Asturias)"

    def __init__(self, fecha: date | None = None) -> None:
        super().__init__(fecha)
        # La fecha real del boletín sale del sumario; esta es la que se pidió.
        self.pedida = fecha

    def fetch(self) -> str:
        return http_get(sumario_url(self.pedida)).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []

        inicio = raw.find('<div id="bopa-boletin"')
        if inicio == -1:
            raise ValueError("El fragmento no contiene el sumario del BOPA")

        # La fecha va antes del sumario, en el enlace al boletín completo.
        boletin = _BOLETIN_RE.search(raw)
        if not boletin:
            raise ValueError("No se encontró el enlace al PDF del boletín")
        anio, mes, dia, _ = boletin.groups()
        self.fecha = date(int(anio), int(mes), int(dia))
        if self.pedida and self.fecha != self.pedida:
            return []

        registros: list[dict[str, Any]] = []
        seccion = ""
        organismo = ""

        for m in _TOKEN_RE.finditer(raw[inicio:]):
            if m.group("sec") is not None:
                seccion = _clean(m.group("sec"))
                organismo = ""
                continue
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue

            if seccion != SECCION_PERSONAL:
                continue

            bruto = m.group("item")
            codigo = _CODIGO_RE.search(bruto)
            if not codigo:
                continue

            titulo = _CODIGO_RE.sub("", _clean(bruto)).strip()
            if not _ES_CONVOCATORIA_RE.search(titulo):
                continue

            registros.append(
                {
                    "codigo": codigo.group(1),
                    "titulo": titulo,
                    "organismo": organismo,
                }
            )

        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        codigo = registro["codigo"]
        ruta = self.fecha.strftime("%Y/%m/%d")
        return {
            "id": f"bopa:{codigo}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Principado de Asturias",
            "ambito": "autonomico",
            "ccaa": "AS",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": f"{SEDE}/bopa/{ruta}/{codigo}.pdf",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def sumario_url(fecha: date | None) -> str:
    if fecha is None:
        return SUMARIO_URL
    return f"{BASE}/bopa/ultimos-boletines?p_r_p_summaryDate={fecha:%d/%m/%Y}"


def dias_habiles(desde: date, hasta: date) -> list[date]:
    """Días de lunes a viernes entre las dos fechas, ambas incluidas."""
    dias = (desde + timedelta(n) for n in range((hasta - desde).days + 1))
    return [d for d in dias if d.weekday() < 5]


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOPA (Asturias)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    grupo = p.add_mutually_exclusive_group()
    grupo.add_argument("--fecha", help="Fecha del boletín (YYYY-MM-DD). Por defecto, el último.")
    grupo.add_argument("--desde", help="De esta fecha (YYYY-MM-DD) a hoy, lunes a viernes.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if not args.desde:
        fecha = date.fromisoformat(args.fecha) if args.fecha else None
        return execute(BopaScraper(fecha), dry_run=args.dry_run, out=args.out)

    # Un día que falle no detiene el resto: se registra y se sigue.
    fallos = 0
    for dia in dias_habiles(date.fromisoformat(args.desde), date.today()):
        out = f"{args.out.removesuffix('.json')}-{dia}.json" if args.out else None
        try:
            execute(BopaScraper(dia), dry_run=args.dry_run, out=out)
        except Exception as exc:  # noqa: BLE001 — execute ya lo registró
            print(f"BOPA {dia}: {type(exc).__name__}: {exc}", file=sys.stderr)
            fallos += 1
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
