# Roadmap

## Fase 0 — Fundación ✅ (completada)

- Repositorio con licencias (AGPL-3.0 / CC BY-SA 4.0 / ODbL), CONTRIBUTING, gobernanza.
- Esquema común de convocatoria (JSON Schema) y esquema de base de datos.
- CI básico (ruff + pytest + build web).
- Scraper del BOE funcional (modo dry-run sin base de datos).
- Web mínima: landing + página `/estado`.
- Dominio `opoalerta.es`.

## Fase 1 — MVP ✅ (completada)

- Scrapers **BOE + BOJA (Andalucía) + BOCM (Madrid) + DOGV (Valencia)**: cubren >50% de las convocatorias.
- Base de datos real (**Postgres en Neon**) con ingesta diaria automatizada.
- Buscador web con filtros (fuente, ámbito, texto libre), servido desde el servidor.
- Alertas por email (filtros guardados, con doble confirmación).
- Página `/estado` alimentada por los workflows.
- Lanzamiento público + difusión en comunidades de opositores y CivicTech.

> La Fase 0 hablaba de Supabase. Se acabó usando Neon: mismo Postgres estándar, sin
> la parte de auth que no hacía falta. Ver [ADR 0001](adr/0001-stack.md).

## Fase 2 — Cobertura nacional 🚧 (en curso)

- **14 fuentes activas**: BOE, EPSO y doce boletines autonómicos (Andalucía, Aragón,
  Asturias, Canarias, Castilla-La Mancha, Castilla y León, Cataluña, C. Valenciana,
  Extremadura, Galicia, Illes Balears, Madrid).
- Faltan: País Vasco, Murcia, Navarra, Cantabria, La Rioja, Ceuta y Melilla
  (vía contribuciones de la comunidad).
- Boletines provinciales.
- ✅ Alertas por Telegram.
- ✅ Dump público de datos mensual (CSV/JSON en Releases).
- **Calidad de los datos**, que resultó pesar tanto como la cobertura:
  - ✅ Filtrado por sección en cada scraper, y tests que lo comprueban de verdad
    ([#93](https://github.com/opoalerta/opoalerta/issues/93),
    [#95](https://github.com/opoalerta/opoalerta/issues/95)).
  - Ámbito según quién convoca y no según dónde se publicó
    ([#94](https://github.com/opoalerta/opoalerta/issues/94)).

## Fase 3 — Valor añadido

- Universidades, diputaciones y grandes ayuntamientos.
- Histórico de convocatorias y plazas; estadísticas por cuerpo.
- Resúmenes en lenguaje llano con IA («qué significa esta convocatoria para ti»).
- API pública documentada.
