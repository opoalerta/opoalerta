---
title: "Cómo leemos trece boletines oficiales cada día con dos dependencias"
slug: "como-scrapeamos-trece-boletines-oficiales"
description: "La arquitectura de scraping de OpoAlerta: por qué no usamos BeautifulSoup ni Scrapy, cómo se detecta que un boletín ha cambiado de formato y qué pasa con los plazos en días hábiles."
date: "2026-08-10"
author: "Equipo OpoAlerta"
tags:
  - ingeniería
  - scraping
  - datos abiertos
  - python
---

OpoAlerta lee cada madrugada trece boletines oficiales, normaliza lo que publican y lo deja buscable en un mismo sitio. Todo el código de scraping son unas 2.900 líneas de Python y tiene exactamente dos dependencias de producción:

```toml
dependencies = [
    "httpx>=0.27",
    "jsonschema>=4.21",
]
```

Ni BeautifulSoup, ni Scrapy, ni Selenium, ni un navegador headless. Esto va de por qué, y de las decisiones que resultaron más útiles de lo que parecían al escribirlas.

## Los boletines no son una web, son trece APIs mal documentadas

La intuición al empezar es que scrapear boletines oficiales significa parsear HTML. Es falso para buena parte de ellos:

- **BOE**: tiene una API pública de datos abiertos que devuelve JSON. `GET /datosabiertos/api/boe/sumario/{fecha}` y ya está.
- **BOCM**: publica un XML por número de boletín, con una URL predecible a partir de la fecha.
- **BOA, DOGV, BOPA y compañía**: HTML, y ahí no queda otra.

Cuando un tercio de tus fuentes ya te da datos estructurados, montar un framework de scraping alrededor de todas es pagar complejidad por adelantado. Lo que necesitas de verdad es un contrato común, no un motor común.

## Un contrato de tres métodos

Cada boletín es una subclase de `BaseScraper` que rellena tres pasos:

```python
fetch()      -> descarga los datos crudos (única parte que toca la red)
parse(raw)   -> extrae registros en bruto
normalize(r) -> convierte un registro al esquema común
```

Y `run()` los orquesta, validando cada convocatoria contra un JSON Schema antes de devolverla.

La separación entre `fetch` y `parse` parece burocracia hasta que escribes el primer test. Como `run()` acepta un `raw` opcional que salta la descarga, cada scraper se prueba contra un fixture guardado en disco: HTML real de un día real. Trece boletines, trece ficheros de tests, cero peticiones de red en CI.

Esa es también la razón de que sean 2.900 líneas y no muchas más. El scraper más corto ronda las 130 líneas y el más largo las 200. Todo lo compartido —descargas, esquema, plazos, persistencia, orquestación— vive en `common/` y ninguno de esos módulos pasa de 175 líneas.

## Reintentar no es opcional

Los portales oficiales dan timeouts. No de vez en cuando: a diario. Nuestro `http.get` es un `httpx.get` con reintentos y backoff, y el comentario que lo encabeza dice por qué existe:

> Los portales oficiales (sobre todo los Drupal lentos como el BOCM) dan timeouts transitorios. Reintentar con backoff evita falsos `scraper-roto`.

Tres intentos con espera creciente y un timeout de 45 segundos. La cifra alta es deliberada: un boletín autonómico un lunes por la mañana puede tardar treinta segundos en responder, y abortar antes significa fabricar una alerta falsa.

También mandamos un User-Agent que dice quiénes somos y cómo contactar:

```
OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)
```

Si vas a leer una web pública todos los días, lo mínimo es que quien mire sus logs sepa qué eres.

## El problema de verdad: saber cuándo te has roto

Un scraper de boletines oficiales no falla con una excepción. Falla en silencio: la administración rediseña su portal, tu selector deja de encontrar nada, y tu scraper devuelve cero convocatorias tan contento. Nadie se entera hasta que alguien pregunta por qué su comunidad lleva un mes sin publicar nada.

La ingesta corre como una matriz de GitHub Actions, un job por boletín, y cuando uno falla el propio workflow abre una incidencia etiquetada:

```yaml
- name: Abrir o actualizar issue si el scraper falla
  if: failure()
```

Si ya hay una abierta para esa fuente, añade un comentario en vez de crear otra. Hasta ahí, lo previsible.

Lo interesante vino después. Del comentario que hay en el workflow:

> Sin esto nadie las cerraba: las cuatro issues abiertas el 31 de julio correspondían a roturas ya arregladas días antes.

Abrir incidencias automáticamente es la mitad fácil. Si no cierras las que se resuelven solas —porque el boletín volvió a funcionar, o porque alguien arregló el parser—, en dos semanas tienes una lista de incidencias que no significa nada y que todo el mundo ignora. Ahora un job simétrico cierra la incidencia cuando esa fuente vuelve a completar su ingesta.

El estado de cada scraper es público en [la página de estado del servicio](/estado): cuándo se leyó por última vez cada boletín y si su última ejecución fue bien.

## Los plazos, o por qué guardamos la frase literal

De todo el proyecto, la parte con más trampa es calcular hasta cuándo puedes presentar la solicitud.

El plazo no está en el sumario. Está en el cuerpo de la disposición, redactado en castellano administrativo: *«…en el plazo de veinte días hábiles a partir del día siguiente al de la publicación…»*. Hay que extraerlo del texto, y ahí aparecen tres problemas encadenados.

**Primero: no todos los plazos de una disposición son *el* plazo.** El mismo documento habla de plazos de subsanación, de alegaciones, de recursos, de reclamaciones. Coger el primero que encuentres es coger el equivocado con bastante frecuencia. Filtramos por dos lados: la frase tiene que mencionar presentación o solicitud, y no puede mencionar subsanación, exclusiones, alegaciones, recursos ni impugnaciones. Si ninguna frase es claramente la de presentación, devolvemos `None`. Mejor sin dato que con un plazo falso.

**Segundo: los números vienen escritos con letra.** «Veinte días hábiles», no «20». Hay un diccionario de cardinales del uno al cuarenta, que cubre prácticamente todo lo que aparece en la vida real.

**Tercero, y este no tiene solución limpia: los días hábiles dependen de dónde vivas.** La Ley 39/2015 dice que sábados, domingos y festivos no son hábiles. Pero los festivos son nacionales, autonómicos y locales, y nosotros solo conocemos los nacionales. Contar veinte días hábiles desde una publicación en el BOJA sin saber los festivos de Andalucía te puede dejar la fecha uno o dos días corta.

Podríamos haber mantenido un calendario de festivos de diecisiete comunidades y varios miles de municipios. Preferimos hacer tres cosas:

1. Guardar siempre **la frase literal** del boletín, tal cual. Riesgo cero.
2. Calcular la fecha igualmente, pero marcarla como aproximada cuando el plazo va en días hábiles.
3. Decirlo en la interfaz. Donde la fecha es estimada, la ficha lo avisa: *«Fecha estimada en días hábiles (sin festivos autonómicos); confirma en la convocatoria»*.

Un dato aproximado y etiquetado como tal es útil. Un dato aproximado que se presenta como exacto es una trampa, y en algo de lo que depende que alguien llegue o no a tiempo a presentar una instancia, la diferencia no es académica.

## Lo que nos llevamos

Tres cosas, si vas a montar algo parecido:

**Mira si hay datos abiertos antes de escribir un parser.** Varias administraciones publican API o XML y no lo anuncian en ningún sitio visible.

**El fallo silencioso es el enemigo, no la excepción.** La excepción se ve; devolver cero resultados, no. Todo el andamiaje de detección y cierre automático de incidencias existe por eso.

**Marca lo que no sabes con certeza.** Es más barato que fingir precisión, y mucho más fácil de defender cuando alguien te pregunta de dónde sale un dato.

El código es AGPL-3.0 y está [en GitHub](https://github.com/opoalerta/opoalerta). Si quieres añadir el boletín de tu comunidad, [hay una guía paso a paso](https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md): son las tres funciones de arriba y un fichero de tests con un fixture. Faltan Cataluña, País Vasco, Murcia, Navarra, Cantabria y La Rioja.
