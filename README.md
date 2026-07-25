# OpoAlerta

> Buscador unificado y gratuito de convocatorias de empleo público en España. Open source, sin publicidad, construido sobre datos abiertos oficiales.

[![CI](https://github.com/opoalerta/opoalerta/actions/workflows/ci.yml/badge.svg)](https://github.com/opoalerta/opoalerta/actions/workflows/ci.yml)
[![Ingesta diaria](https://github.com/opoalerta/opoalerta/actions/workflows/ingest.yml/badge.svg)](https://github.com/opoalerta/opoalerta/actions/workflows/ingest.yml)
[![Licencia: AGPL-3.0](https://img.shields.io/badge/licencia-AGPL--3.0-blue)](LICENSE)

## El problema

Las convocatorias de empleo público se publican dispersas en el BOE, 17 boletines autonómicos (más Ceuta y Melilla), boletines provinciales, webs de universidades, diputaciones y ayuntamientos. Quien opposita y no quiere perderse una plaza depende hoy de servicios privados de pago o de revisar a mano decenas de portales.

## La solución

Una web pública y gratuita que agrega automáticamente todas las convocatorias, las normaliza y permite:

- **Búsqueda unificada** por cuerpo/categoría, comunidad, titulación, fecha, plazo y texto libre.
- **Alertas personalizadas** (email / Telegram) con filtros guardados.
- **Vista clara de plazos** abiertos y próximos a cerrar.
- **Código y datos abiertos**: cualquiera puede mejorarlo, corregirlo o replicarlo.
- **Interfaz pública y accesible** con diseño inspirado en las administraciones neerlandesas.

Todo el valor se construye sobre datos públicos (BOE, boletines oficiales, datos.gob.es) con licencias abiertas; el proyecto los devuelve a la sociedad mejor presentados, siempre citando fuente y fecha.

## Cómo funciona

```
06:00 UTC  GitHub Action "ingest" (matrix)   descarga BOE + BOJA + … → normaliza → upsert en Postgres
06:15 UTC  GitHub Actions por CCAA (matrix)  BOJA, BOCM, DOGV, …
07:00 UTC  "match-alerts"                    cruza novedades con filtros guardados → email/Telegram
```

- Cada boletín es un **scraper independiente** (`scrapers/boe.py`, `scrapers/boja.py`, …) con una interfaz común: puedes añadir tu comunidad autónoma sin tocar el resto.
- Si un scraper falla (el boletín cambió de formato), la Action abre automáticamente una issue etiquetada `scraper-roto`.
- Cero servidores propios: Vercel (web) + Supabase (Postgres) + GitHub Actions (ingesta). Coste ≈ 0 €.

## Estructura del repositorio

```
apps/web/             Next.js 16: buscador, alertas, /estado, diseño institucional
scrapers/             Python: un módulo por boletín + interfaz común + tests
packages/normalizer/  Esquema común de convocatoria (JSON Schema)
data/schema/          Esquema de base de datos (SQL)
docs/                 Arquitectura, guía para añadir una CCAA, ADRs, guía de protección y diseño UI
```

> El diseño de la web está documentado en [`apps/web/DESIGN.md`](apps/web/DESIGN.md). La configuración de seguridad y gobernanza está en [`docs/guia-proteccion-proyecto.md`](docs/guia-proteccion-proyecto.md).

## Quiero contribuir

¡Genial! Lee [CONTRIBUTING.md](CONTRIBUTING.md). La tarea estrella para empezar: **añade el boletín de tu comunidad autónoma** — hay 19 boletines y cada uno es una primera contribución perfecta. Guía paso a paso en [docs/guia-nueva-ccaa.md](docs/guia-nueva-ccaa.md).

## Desarrollo local

```bash
# Scrapers (Python ≥ 3.12)
cd scrapers
pip install -e ".[dev]"
python -m boe --dry-run          # ingesta del sumario BOE de hoy, sin base de datos
pytest                            # tests offline con fixtures

# Web (Node ≥ 22, pnpm)
cd ../apps/web
pnpm install
pnpm lint        # eslint directamente (next lint se eliminó en Next.js 16)
pnpm build
pnpm dev
```

## Licencias

| Contenido | Licencia |
|---|---|
| Código | [AGPL-3.0](LICENSE) |
| Documentación | [CC BY-SA 4.0](docs/LICENSE) |
| Datos transformados | [ODbL-1.0](data/LICENSE), con atribución a las fuentes oficiales |

Los datos originales pertenecen a sus fuentes oficiales (BOE, boletines autonómicos), que se citan siempre con enlace y fecha.

## Estado del proyecto

**Fase 1 — MVP.** Ver [ROADMAP.md](ROADMAP.md). La web ya incluye el rediseño institucional, el buscador funcional y la página `/estado`.
