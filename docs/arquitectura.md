# Arquitectura

OpoAlerta es una arquitectura sin servidores propios: todo corre en tiers gratuitos.

```
┌─────────────┐   cron 06:00 UTC   ┌──────────────────┐   upsert   ┌────────────┐
│ Fuentes     │ ─────────────────▶ │ Scrapers (Python)│ ─────────▶ │ Postgres   │
│ oficiales   │                    │ GitHub Actions   │            │ (Supabase) │
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

### Modelo de datos
- **Contrato**: [`packages/normalizer/convocatoria.schema.json`](../packages/normalizer/convocatoria.schema.json).
  Es la fuente de verdad de qué es una convocatoria.
- **Almacenamiento**: [`data/schema/001_init.sql`](../data/schema/001_init.sql).
  Postgres estándar, portable entre Supabase, Neon o un VPS.
- `id` estable con forma `<fuente>:<id-oficial>` (p. ej. `boe:BOE-A-2026-12345`)
  para que el upsell sea idempotente entre ejecuciones.

### Ingesta (`.github/workflows/`)
- [`ingest.yml`](../.github/workflows/ingest.yml): cron diario (matrix por fuente) +
  `workflow_dispatch`. Si el scraper falla, **abre automáticamente una issue
  etiquetada `scraper-roto`** (sin duplicar la del día).
- Cada nueva CCAA se añade como un job más (matrix), sin tocar las demás.

### Web (`apps/web/`)
- Next.js 15 (App Router) + Tailwind v4, desplegada en Vercel.
- Fase 0: landing + `/estado` (placeholder). Fase 1: buscador con filtros y alertas.

## Principios de diseño

1. **Coste cero por defecto.** Vercel + Supabase + GitHub Actions cubren el MVP.
2. **Modularidad por fuente.** Romper o añadir un boletín no afecta al resto.
3. **Trazabilidad.** Cada convocatoria guarda su fuente, licencia y URL oficial.
4. **Portabilidad.** Postgres estándar y Next.js exportable: migrar a un VPS
   Hetzner es cambiar variables de entorno, no reescribir.
