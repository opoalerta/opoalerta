---
title: "Cómo funciona OpoAlerta: boletines oficiales, alertas y datos abiertos"
slug: "como-funciona-opoalerta"
description: "De dónde salen las convocatorias de OpoAlerta, qué datos extraemos y cuáles todavía no, cómo funcionan las alertas por email y Telegram, y qué puedes hacer con los datos abiertos."
date: "2026-07-25"
author: "Equipo OpoAlerta"
tags:
  - proyecto
  - datos abiertos
  - alertas
---

> Actualizado el 7 de noviembre de 2026.

OpoAlerta es un buscador gratuito de convocatorias de empleo público en España. Cada administración publica sus oposiciones en su propio boletín, con su formato y su buscador, y nadie las junta. Nosotros leemos esos boletines cada día y ponemos lo que publican en un mismo sitio, con un enlace a la publicación original.

No vendemos cursos ni temarios, no hay publicidad y no pedimos registro para buscar. El código y los datos son abiertos.

## De dónde salen los datos

Cada madrugada, un programa por fuente lee el sumario del día y guarda lo que aparece en la sección de oposiciones. Hoy leemos:

- **El BOE**, que además de las oposiciones del Estado publica los anuncios de convocatorias de ayuntamientos de toda España.
- **13 boletines autonómicos**: Andalucía, Aragón, Asturias, Canarias, Castilla-La Mancha, Castilla y León, Cataluña, Comunitat Valenciana, Extremadura, Galicia, Illes Balears, Madrid y País Vasco.
- **El CIDO** de la Diputació de Barcelona, que recoge los procesos de los ayuntamientos catalanes, incluidos los que solo se anuncian en la web municipal.
- **EPSO**, las oposiciones de las instituciones de la Unión Europea.

Faltan Murcia, Navarra, Cantabria, La Rioja, Ceuta y Melilla. La [página de estado](/estado) dice cuándo se leyó cada fuente por última vez y si la lectura fue bien. Si un boletín cambia de formato y nuestro programa deja de entenderlo, se abre un aviso automático en GitHub.

## Qué datos extraemos

De cada convocatoria guardamos:

- **Título, organismo y enlace** a la publicación oficial. Esto sale siempre.
- **Ámbito** (estatal, autonómico, local, universidad, europeo) y comunidad autónoma.
- **Fecha de publicación.**
- **La frase literal del plazo**, cuando la encontramos en el texto, y con ella una **fecha de cierre**. Si el plazo va en días hábiles, la fecha es estimada, porque no conocemos los festivos autonómicos ni los locales, y la ficha lo indica. Si el plazo empieza a contar con otra publicación (el anuncio en el BOE, por ejemplo), no calculamos fecha. [Aquí explicamos por qué](/blog/como-contar-un-plazo-de-dias-habiles).

Lo que todavía no sacamos bien: el plazo de los documentos en PDF, el número de plazas y el grupo de titulación. Aparecen en el texto, pero hoy solo los extraemos en una pequeña parte de las convocatorias. Lo decimos para que no te fíes de un hueco: que una ficha no tenga fecha de cierre no quiere decir que el plazo esté abierto.

## Lo que hay en el buscador

En la sección de oposiciones de un boletín sale de todo: convocatorias nuevas, listas de admitidos, libres designaciones para funcionarios, bolsas de empleo. Lo mostramos todo porque a cada persona le sirve una parte distinta. Pero conviene saber que [solo una de cada tres publicaciones](/blog/cuantas-oposiciones-hay-noviembre-2026) es un proceso nuevo al que puede presentarse alguien de fuera. En [este artículo](/blog/oposicion-concurso-bolsa-libre-designacion) explicamos cómo distinguir cada tipo por el título.

Una convocatoria se queda en el buscador hasta que vence su plazo. Si no conocemos el plazo, se queda un año desde que se publicó.

## Cómo recibir alertas

Desde la [portada](/) eliges los filtros (palabras clave, boletín, ámbito, comunidad) y cómo quieres recibir el aviso:

- **Por email.** Te mandamos un correo para confirmar la suscripción, y hasta que no lo confirmas no te llega nada.
- **Por Telegram**, a través del bot [@opoalertbot](https://t.me/opoalertbot). Se da de baja con `/stop`.

Cada mañana, después de leer los boletines, recibes un resumen con lo nuevo que encaja con tus filtros. Si no hay nada nuevo, no te escribimos. Cuando una convocatoria que encaja está a punto de cerrar, te avisamos otra vez: tres días antes, o cinco si la fecha es estimada. Cada email trae un enlace para darte de baja.

Para las alertas guardamos el email o el chat de Telegram y los filtros que elegiste, y no los usamos para nada más. Para frenar abusos del formulario guardamos además, durante poco tiempo, una huella de la dirección IP (un hash, no la IP) que caduca sola.

También hay **[páginas por perfil](/oposiciones)** (auxiliar administrativo, policía local, maestro, enfermería…) y un **[feed RSS](/rss.xml)**.

## Datos abiertos

El día 1 de cada mes publicamos [un volcado completo](https://github.com/opoalerta/opoalerta/releases) de todas las convocatorias en CSV y JSON, con licencia ODbL. Puedes usarlo para un análisis, una app o un trabajo de clase, siempre que cites la fuente y compartas con la misma licencia lo que derives de él. Así están hechos los números de [este artículo](/blog/cuantas-oposiciones-hay-noviembre-2026).

## Open source

El código está [en GitHub](https://github.com/opoalerta/opoalerta) con licencia AGPL-3.0, y la documentación con CC BY-SA 4.0. Si sabes programar, la contribución que más se nota es añadir un boletín: [hay una guía paso a paso](https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md). Si no programas, también ayuda [avisar](https://github.com/opoalerta/opoalerta/issues) cuando una fecha no cuadra o cuando falta una convocatoria que sí está en el boletín. Muchos de los errores que hemos corregido los encontró alguien así.

Y lo de siempre: la fuente oficial manda. Antes de presentar nada, comprueba plazos y requisitos en la publicación original.
