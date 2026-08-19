"""Scraper del CIDO (Cercador d'Informació i Documentació Oficials).

El CIDO lo mantiene la Diputació de Barcelona y **no es un boletín**: es un
agregador que vacía a fichas normalizadas los procesos selectivos de acceso
libre de toda Cataluña. Sus fuentes son el DOGC, los cuatro boletines
provinciales (BOPB, BOPG, BOPL, BOPT), el BOE y los tablones de anuncios
municipales (`TA`), así que cubre el empleo local catalán que nunca llega al
DOGC — lo que ningún otro scraper del proyecto ve.

Publica los mismos datos como open data (JSON:API, sin token, CC BY 4.0):

    https://api.diba.cat/dadesobertes/cido/v1/oposicions

Parámetros que se usan:

    filter[idEstat]=1,2,3                    pendiente de convocatoria, pendiente
                                             de plazo y plazo abierto (~8.500)
    filter[maxDataPublicacioDocument][GE]=…  ventana incremental por fecha
    include=documents                        adjunta las publicaciones oficiales
                                             (fecha, boletín, PDF) en `included`
    sort=-id | -maxDataPublicacioDocument    orden
    page[limit] / page[offset]               paginación (máx. 500 por página)

**Dos consultas por ejecución**, y no una, porque ninguna basta sola:

- Por fecha (`GE`) entra lo publicado o reactivado en la ventana, incluidas
  fichas antiguas a las que se les añade un documento nuevo (el `id` no cambia).
- Por `-id` descendente entran las altas recientes, que es la única forma de
  pescar las convocatorias **sin fecha de publicación**: las que sólo salen en
  la web del ayuntamiento traen `maxDataPublicacioDocument` a null y el filtro
  por fecha las deja fuera. Son pocas (2 de cada 500) pero son justo las que no
  aparecen en ningún boletín.

Los resultados se deduplican por `id` antes de normalizar.

Notas del mapeo:

- **Los títulos vienen en catalán** y se guardan tal cual. El DOGC sí se pide en
  castellano (`language=es`), pero aquí la API no ofrece idioma.
- **Solapa con `dogc.py`**: el ámbito autonómico y parte del local ya salen del
  DOGC, con otro `id` y otra URL. La deduplicación es cosa del pase posterior.
- `numPlaces` a 0 significa «no consta» (típico de bolsas), no cero plazas.
- El grupo llega como texto («A1 - Grau universitari…»); el grupo «A» a secas no
  distingue A1 de A2, así que se descarta en vez de inventar el subgrupo.

Licencia: Creative Commons Reconeixement (CC BY) 4.0, Diputació de Barcelona.

Uso:
    python -m cido --dry-run
    python -m cido --dias 30 --out ../out/cido.json
    python -m cido --todo            # backfill completo (~8.500 convocatorias)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

API = "https://api.diba.cat/dadesobertes/cido/v1/oposicions"
PORTAL = "https://cido.diba.cat/oposicions"

#: Estados con plazo por venir o abierto. El 4 en adelante ya está cerrado.
ESTADOS_VIVOS = "1,2,3"
#: Máximo que acepta `page[limit]`.
PAGINA = 500
#: Tope de páginas por consulta, para que un filtro roto no baje el catálogo entero.
MAX_PAGINAS = 40
#: Días hacia atrás que mira la ventana incremental por defecto.
DIAS_VENTANA = 7
#: Altas recientes que se revisan por `id` descendente en cada ejecución.
RECIENTES = 500

#: `idAmbit` → ámbito del esquema común. Los consejos comarcales son entes
#: locales supramunicipales (Ley 3/2019 de la Generalitat), de ahí `local`.
AMBITOS: dict[int, str] = {
    4: "autonomico",  # Administració autonòmica
    5: "local",  # Municipis província de Barcelona i ens adscrits
    6: "local",  # Municipis província de Girona
    7: "local",  # Municipis província de Lleida
    8: "local",  # Municipis província de Tarragona
    10: "estatal",  # Cossos de l'Administració de l'Estat
    71: "local",  # Consells comarcals i els seus ens adscrits
    72: "provincial",  # Diputacions i els seus ens adscrits
    93: "otro",  # Altres entitats públiques
    112: "otro",  # General
}

#: `idSistemaSeleccio` → `tipo_acceso`. El 99 («sense especificar») queda a null.
SISTEMAS: dict[int, str] = {
    2: "concurso",  # Concurs o valoració de mèrits
    4: "concurso_oposicion",  # Concurs oposició o valoració de mèrits i prova
    6: "oposicion",  # Oposició o prova
    15541162: "otro",  # Lliure designació
}

#: Prefijos del texto de `grupTitulacio` que sí son un grupo del EBEP.
GRUPOS = {"A1", "A2", "B", "C1", "C2", "E"}

#: «Universitat de Girona» sí; «Hospital Universitari Vall d'Hebron» no: el
#: límite de palabra corta antes de «universitari», que es el adjetivo con el
#: que se nombran hospitales, institutos y fundaciones que no son universidades.
_UNIVERSIDAD_RE = re.compile(r"\bUniversi(tat|dad)\b", re.I)


def _fecha_iso(valor: Any) -> str | None:
    """Normaliza una fecha de la API a `YYYY-MM-DD`, o None si no vale."""
    if not isinstance(valor, str):
        return None
    texto = valor[:10]
    try:
        date.fromisoformat(texto)
    except ValueError:
        return None
    return texto


class CidoScraper(BaseScraper):
    codigo = "cido"
    nombre = "CIDO — Processos selectius (Diputació de Barcelona)"
    licencia = "CC BY 4.0 (Diputació de Barcelona), citando la fuente"

    def __init__(
        self,
        fecha: date | None = None,
        *,
        dias: int = DIAS_VENTANA,
        todo: bool = False,
    ) -> None:
        super().__init__(fecha)
        self.dias = dias
        self.todo = todo

    # ---------------------------------------------------------------- fetch

    def fetch(self) -> list[dict[str, Any]]:
        """Devuelve las páginas crudas de la API (una o dos consultas)."""
        base = {"filter[idEstat]": ESTADOS_VIVOS, "include": "documents"}

        if self.todo:
            return self._paginar({**base, "sort": "-id"}, MAX_PAGINAS)

        desde = (self.fecha - timedelta(days=self.dias)).isoformat()
        por_fecha = self._paginar(
            {
                **base,
                "filter[maxDataPublicacioDocument][GE]": desde,
                "sort": "-maxDataPublicacioDocument",
            },
            MAX_PAGINAS,
        )
        # Segunda pasada por alta reciente: recoge lo que no tiene fecha de
        # publicación, invisible para el filtro anterior.
        por_id = self._paginar({**base, "sort": "-id"}, max(1, RECIENTES // PAGINA))
        return por_fecha + por_id

    def _paginar(self, params: dict[str, str], max_paginas: int) -> list[dict[str, Any]]:
        paginas: list[dict[str, Any]] = []
        for numero in range(max_paginas):
            query = {**params, "page[limit]": str(PAGINA), "page[offset]": str(numero * PAGINA)}
            pagina = json.loads(http_get(f"{API}?{urlencode(query)}").text)
            if errores := pagina.get("errors"):
                raise ValueError(f"La API del CIDO devuelve un error: {errores}")
            paginas.append(pagina)
            if len(pagina.get("data") or []) < PAGINA:
                break
        return paginas

    # ---------------------------------------------------------------- parse

    def parse(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not raw:
            return []

        # `included` trae los documentos de todas las fichas de la página juntos;
        # la ficha sólo guarda su relación, así que se indexa por id.
        documentos: dict[str, dict[str, Any]] = {}
        for pagina in raw:
            for doc in pagina.get("included") or []:
                if doc.get("type") == "oposicions-documents":
                    documentos[str(doc["id"])] = doc.get("attributes") or {}

        registros: dict[str, dict[str, Any]] = {}
        for pagina in raw:
            for ficha in pagina.get("data") or []:
                identificador = str(ficha.get("id") or "")
                atributos = ficha.get("attributes") or {}
                if not identificador or not atributos.get("titol"):
                    continue
                if identificador in registros:
                    continue
                relacion = (ficha.get("relationships") or {}).get("documents") or {}
                docs = [
                    documentos[str(d["id"])]
                    for d in (relacion.get("data") or [])
                    if str(d.get("id")) in documentos
                ]
                registros[identificador] = {**atributos, "id": identificador, "documentos": docs}

        if not registros:
            raise ValueError("La API del CIDO no ha devuelto ninguna convocatoria")
        return list(registros.values())

    # ------------------------------------------------------------ normalize

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ambito = self._ambito(registro)
        return {
            "id": f"cido:{registro['id']}",
            "titulo": registro["titol"].strip(),
            "organismo": (registro.get("institucioDesenvolupat") or "").strip()
            or "Administració pública catalana",
            "ambito": ambito,
            "ccaa": None if ambito == "estatal" else "CT",
            "grupo": _grupo(registro.get("grupTitulacio")),
            "titulacion_requerida": _texto(registro.get("titulacioRequerida")),
            "num_plazas": _plazas(registro.get("numPlaces")),
            "tipo_acceso": _tipo_acceso(registro),
            "fecha_publicacion": self._fecha_publicacion(registro),
            "fecha_fin_plazo": _fecha_iso(registro.get("dataFinalitzacio")),
            "plazo_texto": _texto(registro.get("observacionsTermini")),
            "url_oficial": registro.get("urlCido") or f"{PORTAL}/{registro['id']}",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }

    def _ambito(self, registro: dict[str, Any]) -> str:
        organismo = registro.get("institucioDesenvolupat") or ""
        if _UNIVERSIDAD_RE.search(organismo):
            return "universidad"
        return AMBITOS.get(registro.get("idAmbit") or 0, "otro")

    def _fecha_publicacion(self, registro: dict[str, Any]) -> str:
        """Fecha de la última publicación oficial, con caídas sucesivas.

        Sin documentos (convocatoria que sólo está en la web del organismo) no
        hay fecha de boletín: se usa el inicio del plazo y, si tampoco consta,
        el día en que se ingiere. El esquema la exige y dejarla en blanco
        rompería el orden cronológico del listado.
        """
        publicaciones = [
            fecha
            for doc in registro.get("documentos") or []
            if (fecha := _fecha_iso(doc.get("dataPublicacio")))
        ]
        if publicaciones:
            return max(publicaciones)
        for campo in ("maxDataPublicacioDocument", "dataInici"):
            if fecha := _fecha_iso(registro.get(campo)):
                return fecha
        return self.fecha.isoformat()


def _texto(valor: Any) -> str | None:
    if not isinstance(valor, str):
        return None
    return valor.strip() or None


def _plazas(valor: Any) -> int | None:
    """`numPlaces` a 0 es «no consta» en el CIDO, no una convocatoria sin plazas."""
    if not isinstance(valor, int) or valor <= 0:
        return None
    return valor


def _grupo(valor: Any) -> str | None:
    if not isinstance(valor, str) or not valor.strip():
        return None
    prefijo = valor.split("-", 1)[0].strip().upper()
    if prefijo in GRUPOS:
        return prefijo
    if valor.lower().startswith("agrupacions professionals"):
        return "AP"
    return None


def _tipo_acceso(registro: dict[str, Any]) -> str | None:
    if registro.get("borsaTreball"):
        return "bolsa"
    return SISTEMAS.get(registro.get("idSistemaSeleccio") or 0)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de procesos selectivos del CIDO (Cataluña)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    p.add_argument(
        "--dias",
        type=int,
        default=DIAS_VENTANA,
        help=f"Días hacia atrás de la ventana incremental (por defecto {DIAS_VENTANA}).",
    )
    p.add_argument(
        "--todo",
        action="store_true",
        help="Descarga el catálogo completo de convocatorias vivas en vez de la ventana.",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    scraper = CidoScraper(dias=args.dias, todo=args.todo)
    return execute(scraper, dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
