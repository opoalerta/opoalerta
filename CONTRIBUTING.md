# Guía de contribución

¡Gracias por querer aportar a OpoAlerta! Este es un proyecto cívico: cada scraper de una comunidad autónoma que se añade acerca a miles de opositores a no perderse una plaza.

## Código de conducta

Este proyecto sigue el [Código de Conducta](CODE_OF_CONDUCT.md). Al participar, te comprometes a respetarlo.

## Entorno en 10 minutos

Requisitos: **Python ≥ 3.12** y **Node ≥ 20** con `pnpm`.

```bash
git clone https://github.com/opoalerta/opoalerta.git
cd opoalerta

# Scrapers
cd scrapers
pip install -e ".[dev]"
pytest                 # debe pasar en verde (usa fixtures, no red)
python -m boe --dry-run

# Web (opcional para trabajar solo en scrapers)
cd ../apps/web
pnpm install
pnpm dev
```

No necesitas base de datos para desarrollar un scraper: sin `DATABASE_URL`, el pipeline corre en **modo dry-run** y escribe el resultado como JSON.

## La tarea estrella: añade tu comunidad autónoma

Hay 19 boletines oficiales (17 CCAA + Ceuta y Melilla). Cada uno que falta es una contribución perfecta para empezar. Sigue [docs/guia-nueva-ccaa.md](docs/guia-nueva-ccaa.md). Checklist resumido:

- [ ] Crea `scrapers/<boletin>.py` heredando de `BaseScraper`.
- [ ] Implementa `fetch()`, `parse()` y `normalize()`; cada convocatoria debe validar contra `packages/normalizer/convocatoria.schema.json`.
- [ ] Guarda una respuesta real como fixture en `scrapers/tests/fixtures/` y escribe un test que parsee esa fixture **sin acceder a la red**.
- [ ] Documenta la fuente y su licencia (la mostraremos junto a cada convocatoria).
- [ ] Añade tu boletín a la matriz del workflow de ingesta.
- [ ] `pytest` y `ruff check .` en verde.

## Etiquetas de issues

- `good first issue` — ideal para empezar.
- `nueva-fuente` — añadir un boletín/portal nuevo.
- `scraper-roto` — un scraper existente dejó de funcionar (a menudo abierta automáticamente por el bot de ingesta).
- `help wanted` — necesitamos manos.

## Estándares

- **Tests obligatorios** para todo scraper (offline, con fixture).
- **[Conventional Commits](https://www.conventionalcommits.org/es/)**: `feat(boja): añade scraper de Andalucía`, `fix(boe): ...`.
- **Scraping respetuoso**: usa APIs/datos abiertos oficiales cuando existan, respeta rate limits, identifícate con un User-Agent claro, cita siempre la fuente.
- Todo PR pasa CI (ruff + pytest + build web) y requiere revisión de al menos un mantenedor.
- Sigue el estilo del código existente. `ruff` formatea y lintea Python.

## Flujo de trabajo

1. Haz fork y crea una rama descriptiva (`feat/scraper-boja`).
2. Commits pequeños y con mensaje convencional.
3. Abre el PR contra `main` rellenando la plantilla.
4. La preview de Vercel y el CI se ejecutan solos; resuelve lo que marquen.

## ¿Dudas?

Abre una [Discussion](https://github.com/opoalerta/opoalerta/discussions) o una issue con la etiqueta `pregunta`.
