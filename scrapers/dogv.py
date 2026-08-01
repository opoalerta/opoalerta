"""Scraper del Diari Oficial de la Generalitat Valenciana (DOGV).

El portal es una SPA sobre Liferay y el HTML servido no trae ni un enlace al
sumario, pero detrás hay una API JSON limpia. El camino para encontrarla, por
si vuelve a cambiar:

1. `https://dogv.gva.es/es/` incrusta un iframe a `/dogv-portal-frontend/es`.
2. Ese frontend es un bundle Angular cuyo `main.<hash>.js` declara
   `server_url: "https://dogv.gva.es/dogv-portal"` y el mapa de rutas.
3. La API responde 403 a secas. No pide token: le basta con que la petición
   traiga `Referer` y `X-Request-URL` del frontend. Con eso pasa a 200.

Endpoints útiles (todos bajo `/dogv-portal`):

    /dogv?date=AAAA-MM-DD&lang=es   sumario de un día
    /dogv/latest?lang=es            último sumario publicado
    /dogv/calendar?startDate=…      días con boletín
    /disposicion, /busqueda         detalle y búsqueda

Las convocatorias van en la subsección **«A) OFERTAS DE EMPLEO PÚBLICO,
OPOSICIONES Y CONCURSOS»** de la sección «II. AUTORIDADES Y PERSONAL», que
llega ya clasificada en el JSON: no hace falta adivinar por el título.

**Cuidado con los bis.** El DOGV publica ediciones extraordinarias con su
propio número y `esBis: true`, a veces con una sola disposición. Esa edición
pasa a ser el «último» sumario y tapa el boletín ordinario del día, así que
cada ejecución pide una ventana corta de días en vez de fiarse de `latest`.
Cada disposición se publica con la fecha de su propio sumario, no con la del
día en que se ejecutó la ingesta.

Licencia: reutilización de información del sector público citando la fuente
(Generalitat Valenciana).

Uso:
    python -m dogv --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

API = "https://dogv.gva.es/dogv-portal"
FRONTEND = "https://dogv.gva.es/dogv-portal-frontend/es"
PDF_BASE = "https://dogv.gva.es/datos"

# Sin estas cabeceras la API responde 403 Access Denied a todo.
HEADERS = {
    "Accept": "application/json",
    "Referer": FRONTEND,
    "X-Request-URL": FRONTEND,
}

SUBSECCION_OPOSICIONES = "A) OFERTAS DE EMPLEO PÚBLICO, OPOSICIONES Y CONCURSOS"

# Días de sumario que se piden en cada ejecución. Uno solo no basta: el DOGV
# publica ediciones extraordinarias («bis») que se convierten en el último
# sumario del día, así que `latest` puede tapar el boletín ordinario. Pedir una
# ventana corta cubre eso, los fines de semana y una ejecución que se saltó; los
# repetidos los descarta el id.
DIAS_VENTANA = int(os.environ.get("DOGV_DIAS_VENTANA", "4"))


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposició" in t or "concurso oposició" in t or "concurs-oposició" in t:
        return "concurso_oposicion"
    if "promoción interna" in t or "promoció interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "procés selectiu" in t or "oposici" in t:
        return "oposicion"
    if "bolsa" in t or "borsa" in t or "lista de reserva" in t:
        return "bolsa"
    if "concurso" in t or "concurs" in t:
        return "concurso"
    return None


def _fecha_sumario(sumario: dict[str, Any]) -> date:
    """`fechaSumario` llega como DD-MM-AAAA. Sin ella no se publica nada."""
    crudo = sumario.get("fechaSumario") or ""
    try:
        dia, mes, anio = crudo.split("-")
        return date(int(anio), int(mes), int(dia))
    except (ValueError, AttributeError) as exc:
        raise ValueError(f"Fecha de sumario ilegible: {crudo!r}") from exc


def _sumario(fecha: date | None = None) -> dict[str, Any]:
    """Pide el sumario de un día, o el último si no se indica fecha."""
    if fecha is None:
        url = f"{API}/dogv/latest?lang=es"
    else:
        url = f"{API}/dogv?date={fecha.isoformat()}&lang=es"
    datos = http_get(url, headers=HEADERS).json()
    # Algunas respuestas envuelven el sumario en una lista de un elemento.
    if isinstance(datos, list):
        datos = datos[0] if datos else {}
    return datos if isinstance(datos, dict) else {}


def _oposiciones(sumario: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        d
        for d in (sumario.get("disposiciones") or [])
        if (d.get("subseccion") or {}).get("descripcion") == SUBSECCION_OPOSICIONES
    ]


class DogvScraper(BaseScraper):
    codigo = "dogv"
    nombre = "Diari Oficial de la Generalitat Valenciana"
    licencia = "Reutilización de información pública citando fuente (Generalitat Valenciana)"

    def fetch(self) -> list[dict[str, Any]]:
        """Devuelve los sumarios de la ventana, del más reciente al más antiguo."""
        sumarios = [_sumario()]
        hoy = date.today()
        for dias in range(DIAS_VENTANA):
            dia = hoy - timedelta(days=dias)
            sumario = _sumario(dia)
            if sumario:
                sumarios.append(sumario)
        return sumarios

    def parse(self, raw: Any) -> list[dict[str, Any]]:
        # `run(raw=...)` de los tests pasa un solo sumario; fetch() pasa varios.
        sumarios = raw if isinstance(raw, list) else [raw]
        sumarios = [s for s in sumarios if s]
        if not sumarios:
            return []

        registros: list[dict[str, Any]] = []
        vistos: set[str] = set()

        for sumario in sumarios:
            if not isinstance(sumario, dict) or "disposiciones" not in sumario:
                raise ValueError("La respuesta no es un sumario del DOGV")

            oposiciones = _oposiciones(sumario)
            if not oposiciones:
                # Un día sin convocatorias no necesita fecha legible, y algunos
                # sumarios vacíos llegan sin ella. Romper por eso tiraría la
                # ingesta entera por un día que no aportaba nada.
                continue

            fecha = _fecha_sumario(sumario)
            for disposicion in oposiciones:
                codigo = str(disposicion.get("codigoInsercion") or disposicion.get("id"))
                if codigo in vistos:
                    continue
                vistos.add(codigo)
                # Cada disposición lleva la suya: la ventana mezcla varios días.
                disposicion = {**disposicion, "_fecha": fecha}
                registros.append(disposicion)

        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        # El código de inserción viene como "2026/23124"; sirve de id estable.
        codigo = str(registro.get("codigoInsercion") or registro.get("id"))
        url_pdf = registro.get("urlPdf") or ""
        fecha = registro.get("_fecha") or self.fecha
        return {
            "id": f"dogv:{codigo.replace('/', '-')}",
            "titulo": registro["titulo"],
            "organismo": registro.get("organismo") or "Generalitat Valenciana",
            "ambito": "autonomico",
            "ccaa": "VC",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": fecha.isoformat(),
            "url_oficial": f"{PDF_BASE}{url_pdf}" if url_pdf else FRONTEND,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del DOGV (C. Valenciana)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(DogvScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
