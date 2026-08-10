---
title: "Cuántas oposiciones se convocan de verdad en España: los números de 13 boletines oficiales"
slug: "cuantas-oposiciones-se-convocan-en-espana"
description: "Analizamos las 1.568 convocatorias de empleo público abiertas en 13 boletines oficiales: cuántas publica cada comunidad, cuántas salen por habitante y qué no cuentan estas cifras."
date: "2026-08-10"
author: "Equipo OpoAlerta"
tags:
  - datos abiertos
  - análisis
  - boletines oficiales
  - comunidades autónomas
---

Si buscas cuántas oposiciones hay abiertas ahora mismo en España, no encontrarás la cifra en ningún sitio. Cada administración publica en su propio boletín, con su propio formato y su propio buscador, y nadie los suma. El Estado no lleva ese recuento agregado.

Nosotros sí lo tenemos, porque leer esos boletines cada día es literalmente lo que hace este proyecto. A 10 de agosto de 2026 hay **1.568 convocatorias de empleo público con el plazo abierto** en los 13 boletines que rastreamos. Estos son los números, y también sus límites, que importan tanto como los números.

## El reparto por boletín

| Boletín | Administración | Convocatorias |
|---|---|---|
| BOE | Estado | 448 |
| BOA | Aragón | 404 |
| BOCM | Madrid | 152 |
| BOCYL | Castilla y León | 125 |
| BOJA | Andalucía | 104 |
| BOIB | Illes Balears | 84 |
| DOG | Galicia | 83 |
| DOCM | Castilla-La Mancha | 45 |
| DOGV | C. Valenciana | 43 |
| BOC | Canarias | 27 |
| EPSO | Unión Europea | 24 |
| BOPA | Asturias | 18 |
| DOE | Extremadura | 11 |

Lo primero que llama la atención: **Aragón publica casi tantas convocatorias como el BOE**. 404 frente a 448, cuando en Aragón vive el 2,8 % de la población española.

## Lo mismo, por habitante

Cruzando cada boletín autonómico con la población de su comunidad (padrón del INE), el contraste se vuelve difícil de creer:

| Comunidad | Convocatorias | Habitantes | Por 100.000 hab. |
|---|---|---|---|
| Aragón | 404 | 1,36 M | **29,7** |
| Illes Balears | 84 | 1,25 M | 6,7 |
| Castilla y León | 125 | 2,38 M | 5,3 |
| Galicia | 83 | 2,71 M | 3,1 |
| Madrid | 152 | 7,05 M | 2,2 |
| Castilla-La Mancha | 45 | 2,10 M | 2,1 |
| Asturias | 18 | 1,01 M | 1,8 |
| Canarias | 27 | 2,24 M | 1,2 |
| Andalucía | 104 | 8,63 M | 1,2 |
| Extremadura | 11 | 1,05 M | 1,0 |
| C. Valenciana | 43 | 5,35 M | **0,8** |

Entre el primero y el último hay un factor de casi cuarenta. Y aquí es donde conviene frenar.

## Lo que estos números *no* dicen

Una diferencia de cuarenta veces entre comunidades no significa que en Aragón haya cuarenta veces más empleo público que en la Comunidad Valenciana. Significa otra cosa, y es importante entenderla antes de citar estas cifras en ningún sitio.

**Cada boletín decide qué publica y con qué grano.** Algunos boletines autonómicos recogen también las convocatorias de ayuntamientos, comarcas y diputaciones de su territorio; otros solo publican las de la administración autonómica, y las locales aparecen en boletines provinciales que todavía no leemos. Un boletín que publique cada plaza de cada ayuntamiento sumará muchas más entradas que otro que agrupe procesos grandes, aunque se convoquen las mismas plazas.

**Una convocatoria no es una plaza.** Contamos anuncios publicados, no puestos ofertados. Una sola convocatoria puede sacar doscientas plazas; otra, una. Sumar convocatorias mide actividad publicadora, no volumen de empleo.

**El ámbito que mostramos es el del boletín, no el de quien convoca.** Es el ejemplo más claro de este sesgo: de las 448 convocatorias del BOE, **286 mencionan un ayuntamiento**. El BOE publica extractos de procesos selectivos de administración local, pero en nuestra clasificación las 448 constan como «estatal», porque el ámbito lo asignamos según dónde se publicó. Por eso nuestra etiqueta «local» aparece con solo 38 convocatorias, cuando la realidad es que hay muchas más repartidas entre las otras categorías.

Lo decimos porque preferimos que uses estos datos sabiendo lo que miden. Cualquiera que te dé un ranking de comunidades por número de oposiciones sin explicar esto te está vendiendo una conclusión que sus datos no sostienen.

## Lo que todavía no se ve

Faltan comunidades. No están Cataluña, País Vasco, Murcia, Navarra, Cantabria, La Rioja ni las ciudades autónomas de Ceuta y Melilla. Entre ellas suman más de trece millones de personas, así que el mapa está incompleto y cualquier total nacional que leas aquí es un suelo, no una cifra final.

Estamos incorporando boletines de forma continua, y el estado de cada fuente —cuándo se leyó por última vez, si su scraper está funcionando— es público en [la página de estado del servicio](/estado). Si falta el boletín de tu comunidad y sabes programar, [añadirlo está documentado](https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md) y es la contribución que más se nota.

## Cómo están hechos estos números

Sin trucos: un scraper por boletín, ejecutado cada día a las 06:00 UTC, que lee el sumario oficial y extrae título, organismo, ámbito, fechas y el enlace al documento original. Todo se normaliza a un mismo esquema para poder compararlo. El código es AGPL-3.0 y los datos transformados, ODbL-1.0.

Puedes comprobar cualquier cifra de este artículo tú mismo: [el archivo completo](/convocatorias) lista las 1.568 convocatorias una a una, cada ficha enlaza a su publicación oficial, y el buscador de la portada filtra por fuente y ámbito. Si algo no cuadra, la fuente oficial manda siempre —y [abrir una incidencia](https://github.com/opoalerta/opoalerta/issues) es bienvenido.

Volveremos a publicar estos números conforme crezca la cobertura. La cifra interesante no es la de hoy, sino cómo se mueve cuando el mapa esté completo.
