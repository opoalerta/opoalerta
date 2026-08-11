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

- Descarga una respuesta real y guárdala recortada en
  `scrapers/tests/fixtures/<codigo>-YYYYMMDD.json` (o `.xml` / `.html`).
- Crea `scrapers/tests/test_<codigo>.py` que cargue la fixture y compruebe que
  `scraper.run(raw=fixture)` produce convocatorias válidas. **El test no debe
  acceder a la red.** Mira [`test_boe.py`](../scrapers/tests/test_boe.py).

> ⚠️ **Recorta a lo ancho, no a la sección buena.** Es el error que más caro ha salido
> en este repo. Si la fixture solo lleva la sección de oposiciones, el filtro del
> scraper nunca se prueba: uno roto que dejara pasar el boletín entero daría
> exactamente el mismo resultado, y los tests seguirían en verde.
>
> Deja en la fixture unas pocas disposiciones de **cada sección**, incluidas las que
> tienen que quedar fuera (anuncios, subvenciones, nombramientos), y escribe dos tests:

```python
def test_solo_la_seccion_de_oposiciones(raw):
    registros = MiScraper().parse(raw)
    assert [r["id_oficial"] for r in registros] == ["...", "..."]  # los que sí

def test_el_filtro_hace_algo(raw):
    """Sin filtro tienen que salir más registros que con él."""
    con = len(MiScraper().parse(raw))
    original = mi_modulo.SECCION_OPOSICIONES
    mi_modulo.SECCION_OPOSICIONES = ""   # filtro nulo
    try:
        sin = len(MiScraper().parse(raw))
    finally:
        mi_modulo.SECCION_OPOSICIONES = original
    assert sin > con
```

Ejemplos ya escritos: [`test_boa.py`](../scrapers/tests/test_boa.py) y
[`test_bocm.py`](../scrapers/tests/test_bocm.py).

### 2 bis. Filtra por sección, no por palabras del título

Un boletín trae mucho más que empleo público. **Quédate solo con la sección de
oposiciones**, que todos marcan de alguna forma: la `2B` del BOE, la `II.b Oposiciones y
concursos` del BOA, la `B.2` del BOCYL, el apartado `B) Autoridades y Personal` del
BOCM. Filtrar por sección evita a la vez el ruido y los falsos negativos que deja un
filtro por palabras.

Tres cosas aprendidas arreglándolo mal:

- **Comprueba que el parámetro de sección filtra de verdad.** El BOA acepta un
  `SEC=OPRSS` en la URL y lo ignora: devuelve el boletín entero. Pide el mismo día con
  y sin el parámetro y compara el resultado antes de fiarte
  ([#93](https://github.com/opoalerta/opoalerta/issues/93)).
- **Mira si hay una sección de administración local aparte.** Puede estar marcada de
  otra forma que la autonómica —en el BOCM viene sin nombre de apartado— y perderse
  entera sin que salte nada ([#95](https://github.com/opoalerta/opoalerta/issues/95)).
  Si la hay, esas convocatorias llevan `"ambito": "local"`.
- **Deja fuera nombramientos, ceses y plantillas.** Son el resultado de un proceso ya
  cerrado, no algo a lo que nadie pueda presentarse.

Y una guarda: si el boletín trae documentos pero no reconoces ninguna sección, **lanza
`ValueError`** en vez de devolver una lista vacía. Devolver cero es indistinguible de
«hoy no había oposiciones», así que el fallo se queda callado; el error abre la
incidencia `scraper-roto` automáticamente.

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
