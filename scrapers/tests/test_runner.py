"""Test offline del runner en modo dry-run (sin base de datos)."""

import json
from datetime import UTC, datetime
from typing import Any

from common.base import BaseScraper
from common.runner import execute


class _StubScraper(BaseScraper):
    codigo = "stub"
    nombre = "Fuente de prueba"
    licencia = "n/a"

    def fetch(self) -> Any:
        return None

    def parse(self, raw: Any) -> list[dict[str, Any]]:
        return [{"x": 1}]

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": "stub:1",
            "titulo": "Convocatoria de prueba",
            "organismo": "Organismo",
            "ambito": "estatal",
            "ccaa": None,
            "fecha_publicacion": "2026-01-01",
            "url_oficial": "https://example.org/1",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def test_execute_dry_run_escribe_json(tmp_path, capsys):
    out = tmp_path / "stub.json"
    code = execute(_StubScraper(), dry_run=True, out=str(out))
    assert code == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data[0]["id"] == "stub:1"
    assert "STUB: 1 convocatorias." in capsys.readouterr().out
