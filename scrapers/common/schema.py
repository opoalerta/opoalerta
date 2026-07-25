"""Carga y validación contra el JSON Schema de convocatoria."""

from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

# packages/normalizer/convocatoria.schema.json, relativo a la raíz del repo.
SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "packages" / "normalizer" / "convocatoria.schema.json"
)


@functools.lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def validate(convocatoria: dict[str, Any]) -> None:
    """Lanza jsonschema.ValidationError si la convocatoria no cumple el esquema."""
    _validator().validate(convocatoria)


def is_valid(convocatoria: dict[str, Any]) -> bool:
    return _validator().is_valid(convocatoria)
