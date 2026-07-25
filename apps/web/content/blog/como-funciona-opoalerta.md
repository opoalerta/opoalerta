---
title: "Cómo funciona OpoAlerta: boletines oficiales, alertas y datos abiertos"
slug: "como-funciona-opoalerta"
description: "Explicación técnica y ciudadana de OpoAlerta: de dónde sacamos las convocatorias, cómo se normalizan y cómo puedes recibir alertas gratis."
date: "2026-07-25"
author: "Equipo OpoAlerta"
tags:
  - proyecto
  - datos abiertos
  - alertas
---

OpoAlerta es un buscador gratuito de convocatorias de empleo público en España. Nuestro objetivo es simple: que no tengas que visitar 20 portales distintos para enterarte de las oposiciones que te interesan.

## De dónde vienen los datos

Leemos los sumarios de los boletines oficiales cada madrugada mediante scrapers programados en GitHub Actions. Actualmente cubrimos el BOE y varias comunidades autónomas; el plan es llegar a los 19 boletines regionales.

## Qué datos extraemos

Cada convocatoria se normaliza con los siguientes campos:

- Título y organismo convocante.
- Ámbito (estatal, autonómico, local…) y comunidad autónoma.
- Fecha de publicación y fin de plazo, cuando aparece.
- Enlace oficial al boletín.

## Cómo recibir alertas

Puedes suscribirte por email desde la página principal. Guardamos tu contacto y los filtros que elijas; cada día a las 06:00 UTC revisamos si hay novedades y, si las hay, te enviamos un resumen.

## Open source

Todo el código, la documentación y los datos transformados están publicados con licencias abiertas. Puedes contribuir añadiendo un boletín, mejorando la web o desplegando tu propia instancia.
