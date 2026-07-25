# Roadmap

## Fase 0 — Fundación ✅ (en curso)

- Repositorio con licencias (AGPL-3.0 / CC BY-SA 4.0 / ODbL), CONTRIBUTING, gobernanza.
- Esquema común de convocatoria (JSON Schema) y esquema de base de datos.
- CI básico (ruff + pytest + build web).
- Scraper del BOE funcional (modo dry-run sin base de datos).
- Web mínima: landing + página `/estado`.
- Dominio `opoalerta.es`.

## Fase 1 — MVP

- Scrapers **BOE + BOJA (Andalucía) + BOCM (Madrid) + DOGV (Valencia)**: cubren >50% de las convocatorias.
- Base de datos real (Supabase) con ingesta diaria automatizada.
- Buscador web con filtros (cuerpo, CCAA, titulación, plazo).
- Alertas por email (filtros guardados).
- Página `/estado` alimentada por los workflows.
- Lanzamiento público + difusión en comunidades de opositores y CivicTech.

## Fase 2 — Cobertura nacional

- Los 19 boletines autonómicos completos (vía contribuciones de la comunidad).
- Boletines provinciales.
- Alertas por Telegram.
- Dump público de datos mensual (CSV/JSON en Releases).

## Fase 3 — Valor añadido

- Universidades, diputaciones y grandes ayuntamientos.
- Histórico de convocatorias y plazas; estadísticas por cuerpo.
- Resúmenes en lenguaje llano con IA («qué significa esta convocatoria para ti»).
- API pública documentada.
