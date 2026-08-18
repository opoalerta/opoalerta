# Guía de contribución

¡Gracias por querer aportar a OpoAlerta! Este es un proyecto cívico: cada scraper de una comunidad autónoma que se añade acerca a miles de opositores a no perderse una plaza.

## Código de conducta

Este proyecto sigue el [Código de Conducta](CODE_OF_CONDUCT.md). Al participar, te comprometes a respetarlo.

## Entorno en 10 minutos

Requisitos: **Python ≥ 3.12**, **Node ≥ 22** y **pnpm** (el repo fija `pnpm@11.9.0` vía `packageManager`; con Corepack se instala solo).

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
pnpm lint        # eslint directamente (next lint se eliminó en Next.js 16)
pnpm build
pnpm dev
```

No necesitas base de datos para desarrollar un scraper: sin `DATABASE_URL`, el pipeline corre en **modo dry-run** y escribe el resultado como JSON.

## Por dónde empezar

¿Primera vez? Mira los issues marcados como
[**`good first issue`**](https://github.com/opoalerta/opoalerta/issues?q=is%3Aopen+label%3A%22good+first+issue%22)
— cambios acotados y bien descritos. Si te va el scraping, echa un ojo a
[**`nueva-fuente`**](https://github.com/opoalerta/opoalerta/issues?q=is%3Aopen+label%3Anueva-fuente).
Comenta en el issue que lo coges, para que no haya trabajo duplicado.

## Reportar un bug o proponer una mejora

Abre una issue con la plantilla correspondiente (bug, scraper roto, nueva fuente o feature). Si un scraper deja de funcionar, es probable que el bot de ingesta ya haya abierto una issue `scraper-roto`: compruébalo antes de duplicar.

## La tarea estrella: añade tu comunidad autónoma

Hay 19 boletines oficiales (17 CCAA + Ceuta y Melilla) y ya funcionan 12 comunidades. Faltan País Vasco, Murcia, Navarra, Cantabria, La Rioja, Ceuta y Melilla: cada uno es una contribución perfecta para empezar. Sigue [docs/guia-nueva-ccaa.md](docs/guia-nueva-ccaa.md). Checklist resumido:

- [ ] Crea `scrapers/<boletin>.py` heredando de `BaseScraper`.
- [ ] Implementa `fetch()`, `parse()` y `normalize()`; cada convocatoria debe validar contra `packages/normalizer/convocatoria.schema.json`.
- [ ] **Quédate solo con la sección de oposiciones** del boletín, y comprueba que el parámetro de sección filtra de verdad: alguno los acepta y los ignora.
- [ ] Guarda una respuesta real como fixture en `scrapers/tests/fixtures/` y escribe un test que parsee esa fixture **sin acceder a la red**.
- [ ] **La fixture tiene que traer también secciones que no son la buena.** Si solo lleva la de oposiciones, un filtro roto da el mismo resultado que uno sano y ningún test se entera. Añade un test que compruebe que el filtro descarta algo.
- [ ] Documenta la fuente y su licencia (la mostraremos junto a cada convocatoria).
- [ ] Añade tu boletín a la matriz del workflow de ingesta.
- [ ] `pytest` y `ruff check .` en verde.

## Etiquetas de issues

- `good first issue` — ideal para empezar.
- `nueva-fuente` — añadir un boletín/portal nuevo.
- `scraper-roto` — un scraper existente dejó de funcionar (a menudo abierta automáticamente por el bot de ingesta).
- `help wanted` — necesitamos manos.

## Estándares

- **Tests obligatorios** para todo scraper (offline, con fixture que incluya secciones descartadas).
- **[Conventional Commits](https://www.conventionalcommits.org/es/)**: `feat(boja): añade scraper de Andalucía`, `fix(boe): ...`.
- **Scraping respetuoso**: usa APIs/datos abiertos oficiales cuando existan, respeta rate limits, identifícate con un User-Agent claro, cita siempre la fuente.
- Todo PR pasa CI (`ruff` + `pytest` + `pnpm lint` + `pnpm build`) y requiere revisión de al menos un mantenedor.
- Sigue el estilo del código existente. `ruff` formatea y lintea Python.
- Si trabajas en la web, sigue el [diseño institucional documentado en `apps/web/DESIGN.md`](apps/web/DESIGN.md): paleta, tipografía, componentes y accesibilidad.
- Si cambias dependencias principales (Next.js, React, Tailwind, ESLint), actualiza también `apps/web/DESIGN.md` y `docs/guia-proteccion-proyecto.md` si es necesario.

## Flujo de trabajo

1. Haz fork y crea una rama descriptiva (`feat/scraper-boja`).
2. Commits pequeños y con mensaje convencional.
3. Abre el PR contra `main` rellenando la plantilla.
4. La preview de Vercel y el CI se ejecutan solos; resuelve lo que marquen.

## Reconocimiento

Toda persona que contribuye aparece en el historial del proyecto y en la lista de contribuidores de GitHub. Las aportaciones cuentan por igual: código, documentación, reportar un scraper roto o proponer una fuente nueva. ¡Gracias por hacer OpoAlerta mejor!

## ¿Dudas?

Abre una [Discussion](https://github.com/opoalerta/opoalerta/discussions) o una issue con la etiqueta `pregunta`.
