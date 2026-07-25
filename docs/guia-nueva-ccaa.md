# Guía: añade el boletín de tu comunidad autónoma

Esta es la contribución estrella de OpoAlerta. Cada boletín que añades acerca a
miles de opositores a no perderse una plaza. Tardarás una tarde y no necesitas
base de datos.

## Antes de empezar

1. Comprueba si ya hay una issue `nueva-fuente` para tu boletín. Si no, [ábrela](https://github.com/opoalerta/opoalerta/issues/new?template=nueva-fuente.yml) y decláralo para no duplicar trabajo.
2. Averigua **cómo se accede** a tu boletín, en este orden de preferencia:
   - API o datos abiertos (JSON/XML/RDF) — lo mejor.
   - RSS.
   - Scraping de HTML — último recurso, respetuoso (rate limit, User-Agent claro).
3. Anota la **licencia** de los datos (aviso legal del boletín, o ficha en datos.gob.es).

## Paso a paso

Toma como referencia [`scrapers/boe.py`](../scrapers/boe.py), que consume la API
de datos abiertos del BOE.

### 1. Crea el módulo

`scrapers/<codigo>.py`, donde `<codigo>` es corto y en minúsculas (`boja`, `bocm`, `dogv`…):

```python
from datetime import UTC, date, datetime
from typing import Any

import httpx

from common.base import BaseScraper


class BojaScraper(BaseScraper):
    codigo = "boja"
    nombre = "Boletín Oficial de la Junta de Andalucía"
    licencia = "..."  # condiciones de reutilización de la fuente

    def fetch(self) -> Any:
        # Única parte que toca la red.
        ...

    def parse(self, raw: Any) -> list[dict[str, Any]]:
        # Extrae registros en bruto (dicts) de la respuesta.
        ...

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        # Devuelve una convocatoria que valide contra el JSON Schema.
        return {
            "id": f"boja:{registro['id']}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"],
            "ambito": "autonomico",
            "ccaa": "AN",  # código ISO 3166-2:ES sin prefijo
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": registro["url"],
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }
```

Campos obligatorios y opcionales: ver [`convocatoria.schema.json`](../packages/normalizer/convocatoria.schema.json).

### 2. Guarda una fixture y escribe un test (offline)

- Descarga una respuesta real y guárdala **recortada** en `scrapers/tests/fixtures/<codigo>-YYYYMMDD.json` (o `.xml`).
- Crea `scrapers/tests/test_<codigo>.py` que cargue la fixture y compruebe que
  `scraper.run(raw=fixture)` produce convocatorias válidas. **El test no debe
  acceder a la red.** Mira [`test_boe.py`](../scrapers/tests/test_boe.py).

### 3. Añade tu boletín a la ingesta

Añade el código de tu boletín a la matriz `fuente` de
[`ingest.yml`](../.github/workflows/ingest.yml) (p. ej. `[boe, boja, tu_codigo]`).
El resto del workflow (artefacto, auto-issue `scraper-roto`) ya es genérico.

### 4. Verifica en local

```bash
cd scrapers
ruff check . && ruff format --check .
pytest
python -m <codigo> --dry-run   # prueba contra la fuente real, sin base de datos
```

### 5. Abre el PR

Rellena la plantilla, enlaza la issue (`Closes #NN`) y marca el checklist. Un
mantenedor lo revisará.

## Códigos de comunidad autónoma (ISO 3166-2:ES)

`AN` Andalucía · `AR` Aragón · `AS` Asturias · `CB` Cantabria · `CE` Ceuta ·
`CL` Castilla y León · `CM` Castilla-La Mancha · `CN` Canarias · `CT` Cataluña ·
`EX` Extremadura · `GA` Galicia · `IB` Illes Balears · `MC` Murcia · `MD` Madrid ·
`ML` Melilla · `NC` Navarra · `PV` País Vasco · `RI` La Rioja · `VC` C. Valenciana
