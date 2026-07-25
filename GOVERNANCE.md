# Gobernanza

OpoAlerta es un proyecto comunitario. Esta gobernanza es deliberadamente ligera y crecerá con el proyecto.

## Roles

- **Mantenedor fundador.** Al inicio, tiene la decisión final sobre dirección técnica y merges. Su prioridad es documentar todo para no ser un cuello de botella.
- **Mantenedores.** Personas con permiso de merge, añadidas por contribución sostenida y de calidad. Cuando haya **5 o más contribuidores activos**, se constituye un comité de mantenedores que decide por consenso (y, si no lo hay, por mayoría simple).
- **Contribuidores.** Cualquiera que abra issues o PRs. No hace falta permiso previo para proponer.

## Cómo se toman las decisiones

- **Cambios normales** (un scraper nuevo, un fix, mejoras de UI): PR + revisión de al menos un mantenedor.
- **Decisiones técnicas de calado** (stack, esquema de datos, licencias, arquitectura): se documentan como **ADR** (Architecture Decision Record) en [`docs/adr/`](docs/adr/). Se debaten en una Discussion o issue antes de escribir el ADR.
- **Conflictos**: se resuelven buscando consenso en abierto. Mientras exista comité, decide el comité; antes, el mantenedor fundador, dejando constancia del razonamiento.

## Principios

- **Datos públicos, siempre citados.** Nunca ocultamos la fuente ni la fecha de una convocatoria.
- **Cero coste de entrada.** El proyecto debe poder desarrollarse sin pagar nada y sin infraestructura propia.
- **Sostenibilidad sobre heroísmo.** Documentación exhaustiva y arquitectura modular para que nadie sea imprescindible.

## Sostenibilidad

Buscamos activamente la adopción por colectivos (sindicatos, academias, asociaciones de opositores) y la participación en ecosistemas de datos abiertos (CivicTech España, hackathones de datos.gob.es). Si el proyecto necesita costes recurrentes, se documentarán de forma transparente en `FUNDING.yml`.
