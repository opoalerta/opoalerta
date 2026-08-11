# Arquitectura

OpoAlerta es una arquitectura sin servidores propios: todo corre en tiers gratuitos.

```
┌─────────────┐   cron 06:00 UTC   ┌──────────────────┐   upsert   ┌────────────┐
│ Fuentes     │ ─────────────────▶ │ Scrapers (Python)│ ─────────▶ │ Postgres   │
│ oficiales   │                    │ GitHub Actions   │            │  (Neon)    │
│ BOE, BOJA…  │                    └──────────────────┘            └─────┬──────┘
└─────────────┘                                                          │
                                                                         │ lee
                                              ┌──────────────────┐       │
                                              │ Web (Next.js)    │ ◀─────┘
                                              │ Vercel           │
                                              │ buscador+alertas │
                                              └──────────────────┘
```

## Componentes

### Scrapers (`scrapers/`)
- Python ≥ 3.12. Cada boletín es un módulo independiente que hereda de
  [`BaseScraper`](../scrapers/common/base.py) e implementa `fetch → parse → normalize`.
- `run()` valida cada convocatoria contra el JSON Schema antes de devolverla, así
  que un dato malformado falla pronto y de forma visible.
- La persistencia ([`common/db.py`](../scrapers/common/db.py)) hace un **upsert
  idempotente** por `id`. Sin `DATABASE_URL` corre en dry-run (no toca la base).

#### Filtrar por sección, no por palabras

Un boletín oficial trae mucho más que empleo público: subvenciones, expedientes
ambientales, licitaciones, ordenanzas. **Cada scraper se queda solo con la sección de
oposiciones de su boletín**, que todos marcan de alguna forma: la sección `2B` del BOE,
la `II.b Oposiciones y concursos` del BOA, la `B.2` del BOCYL, el apartado
`B) Autoridades y Personal` del BOCM.

Filtrar por sección y no por palabras del título es lo que evita a la vez el ruido y los
falsos negativos. Cuando la fuente no ofrece sección —solo pasa con el BOPA— se filtra
por marcadores de proceso selectivo, y eso se documenta en el módulo explicando por qué.

Dos matices que salieron de arreglarlo mal:

- **Que el parámetro exista no significa que filtre.** El scraper del BOA pedía
  `SEC=OPRSS` en la URL creyendo que era la sección de oposiciones. El CGI del BOA
  ignora ese parámetro y devuelve el boletín entero. El filtro tiene que aplicarse
  sobre lo que llega, o al menos comprobarse contra la respuesta real
  ([#93](https://github.com/opoalerta/opoalerta/issues/93)).
- **Un filtro por sección también se puede pasar de largo.** El BOCM marca sus
  apartados con nombre en la sección autonómica pero no en la de ayuntamientos, así
  que el mismo filtro se dejaba fuera todas las convocatorias municipales
  ([#95](https://github.com/opoalerta/opoalerta/issues/95)).

Por eso las fixtures de test tienen que traer secciones que **no** son la buena: si solo
llevan la sección correcta, un filtro roto da el mismo resultado que uno sano y ningún
test se entera. Ver la [guía para añadir una CCAA](guia-nueva-ccaa.md).

#### Correcciones de datos ya guardados

Arreglar un scraper no borra lo que metió mal. Para eso está `data/purgas/`: SQL de una
sola vez, con la lista de ids que el scraper arreglado sí devuelve al releer los mismos
boletines, y el borrado acotado a ese rango de fechas. Se lanza con
[`purga-manual.yml`](../.github/workflows/purga-manual.yml), que por defecto cambia el
`COMMIT` final por un `ROLLBACK` para poder ver el efecto antes de aplicarlo.

No van en `data/schema/`, que se reaplica entero en cada migración y por eso tiene que
ser idempotente.

### Modelo de datos
- **Contrato**: [`packages/normalizer/convocatoria.schema.json`](../packages/normalizer/convocatoria.schema.json).
  Es la fuente de verdad de qué es una convocatoria.
- **Almacenamiento**: [`data/schema/001_init.sql`](../data/schema/001_init.sql).
  Postgres estándar en Neon, portable a Supabase o a un VPS sin tocar el esquema.
- `id` estable con forma `<fuente>:<id-oficial>` (p. ej. `boe:BOE-A-2026-12345`)
  para que el upsell sea idempotente entre ejecuciones.

### Ingesta (`.github/workflows/`)
- [`ingest.yml`](../.github/workflows/ingest.yml): cron diario (matrix por fuente) +
  `workflow_dispatch`. Si el scraper falla, **abre automáticamente una issue
  etiquetada `scraper-roto`** (sin duplicar la del día).
- Cada nueva CCAA se añade como un job más (matrix), sin tocar las demás.

### Web (`apps/web/`)
- Next.js 16 (App Router) + Tailwind v4, desplegada en Vercel.
- Buscador con filtros servido desde el servidor, fichas por convocatoria, alertas por
  email y Telegram, `/estado`, RSS y blog.
- La lista de fuentes de `/estado` y `/sobre` **se lee de la base**, no se mantiene a
  mano: una lista escrita a mano se quedaba anunciando como activo un scraper roto.

## Principios de diseño

1. **Coste cero por defecto.** Vercel + Neon + GitHub Actions cubren el MVP.
2. **Modularidad por fuente.** Romper o añadir un boletín no afecta al resto.
3. **Trazabilidad.** Cada convocatoria guarda su fuente, licencia y URL oficial.
4. **Portabilidad.** Postgres estándar y Next.js exportable: migrar a un VPS
   Hetzner es cambiar variables de entorno, no reescribir.
