"""Interfaz común de scraper.

Cada boletín se implementa como una subclase de ``BaseScraper`` que rellena
``codigo``, ``nombre``, ``licencia`` y los tres pasos del pipeline:

    fetch()      -> descarga los datos crudos (red)
    parse(raw)   -> extrae registros en bruto (dicts)
    normalize(r) -> convierte un registro en una convocatoria del esquema común

``run()`` orquesta los tres pasos y valida cada convocatoria contra el JSON
Schema antes de devolverlas. Así un contribuidor puede añadir su CCAA sin tocar
el resto del proyecto.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Any

from .schema import validate


class BaseScraper(ABC):
    #: Código corto de la fuente: 'boe', 'boja', 'bocm'…
    codigo: str
    #: Nombre legible de la fuente.
    nombre: str
    #: Licencia / condiciones de reutilización de la fuente oficial.
    licencia: str

    def __init__(self, fecha: date | None = None) -> None:
        self.fecha = fecha or date.today()

    @abstractmethod
    def fetch(self) -> Any:
        """Descarga los datos crudos de la fuente (única parte que toca la red)."""

    @abstractmethod
    def parse(self, raw: Any) -> list[dict[str, Any]]:
        """Extrae registros en bruto a partir de la respuesta cruda."""

    @abstractmethod
    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        """Convierte un registro en bruto en una convocatoria del esquema común."""

    def fuente(self) -> dict[str, str]:
        return {"codigo": self.codigo, "nombre": self.nombre, "licencia": self.licencia}

    def run(self, raw: Any | None = None) -> list[dict[str, Any]]:
        """Ejecuta el pipeline completo y devuelve convocatorias validadas.

        Si se pasa ``raw`` se salta ``fetch()`` (útil para tests con fixtures).
        """
        if raw is None:
            raw = self.fetch()
        convocatorias = [self.normalize(r) for r in self.parse(raw)]
        for c in convocatorias:
            validate(c)
        return convocatorias
