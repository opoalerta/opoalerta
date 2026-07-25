"""Test offline del volcado a CSV/JSON (sin base de datos)."""

import csv
import json

from exportar import COLUMNAS, escribir

FILA = {c: None for c in COLUMNAS}
FILA.update(
    {
        "id": "boe:BOE-A-2026-1",
        "titulo": "Convocatoria de prueba",
        "organismo": "Ministerio X",
        "ambito": "estatal",
        "fuente_codigo": "boe",
        "fecha_publicacion": "2026-07-24",
        "url_oficial": "https://www.boe.es/x",
        "fecha_ingesta": "2026-07-24T06:00:00+00:00",
    }
)


def test_escribe_json_y_csv(tmp_path):
    escribir([FILA], tmp_path)

    data = json.loads((tmp_path / "convocatorias.json").read_text(encoding="utf-8"))
    assert data[0]["id"] == "boe:BOE-A-2026-1"

    with (tmp_path / "convocatorias.csv").open(encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    assert filas[0]["fuente_codigo"] == "boe"
    assert list(filas[0].keys()) == COLUMNAS
