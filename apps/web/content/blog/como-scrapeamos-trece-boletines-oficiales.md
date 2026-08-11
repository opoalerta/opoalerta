---
title: "Cómo leemos trece boletines oficiales cada día con dos dependencias"
slug: "como-scrapeamos-trece-boletines-oficiales"
description: "La arquitectura de scraping de OpoAlerta: por qué no usamos BeautifulSoup ni Scrapy, cómo se detecta que un boletín ha cambiado de formato, las dos veces que un scraper siguió funcionando mientras guardaba lo que no debía, y qué pasa con los plazos en días hábiles."
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

Con una trampa que tardamos semanas en ver, y que cuento más abajo: **un fixture solo prueba lo que contiene**. Si lo recortas dejando únicamente la sección que te interesa —que es lo natural, para que no ocupe— dejas de probar precisamente la parte que decide qué se queda fuera.

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

## La otra forma de romperse: seguir funcionando

Todo lo anterior detecta que un scraper deja de traer nada. No detecta que traiga lo que no debe, ni que se deje algo por el camino. Nos han pasado las dos, y ninguna la vio ni el CI ni la página de estado.

Un boletín oficial no publica solo empleo público. Publica subvenciones, expedientes ambientales, licitaciones, ordenanzas fiscales y modificaciones de crédito. Cada scraper se queda con la sección de oposiciones de su boletín —la `2B` del BOE, la `B.2` del BOCYL, la `II.b Oposiciones y concursos` del BOA— y descarta el resto. Ahí está el noventa por ciento del trabajo real de un scraper de boletines: no extraer, sino decidir qué no extraer.

**El caso uno: un parámetro que no filtraba.** La URL con la que pedíamos el sumario del Boletín Oficial de Aragón llevaba un `SEC=OPRSS`, que en teoría pide la sección de oposiciones y personal. El servidor del BOA lo ignora y devuelve el boletín entero. Nunca lo comprobamos, porque el parámetro estaba ahí y parecía hacer su trabajo.

Durante semanas, expedientes de información pública del Instituto Aragonés de Gestión Ambiental estuvieron guardados en nuestra tabla como si fueran ofertas de empleo. Aragón aparecía con 404 convocatorias abiertas, casi las mismas que el BOE, teniendo el 2,8 % de la población. La cifra real era 112.

Basta pedir el mismo día con el parámetro y sin él y comparar las dos respuestas. Si son idénticas, no filtra.

**El caso dos: un filtro correcto que se pasaba de largo.** El sumario del BOCM viene en XML, con los apartados etiquetados. Filtrábamos por el apartado «B) Autoridades y Personal» y funcionaba perfectamente… para la Comunidad de Madrid. La sección de ayuntamientos del mismo boletín trae sus apartados **sin nombre**, así que caía entera junto con los anuncios. Se perdían unas ocho o nueve convocatorias al día de Móstoles, Alcorcón, Coslada, Rivas o Pozuelo.

Este es el peor de los dos, porque no deja rastro. Un dato de más lo ve cualquiera que mire el listado; un dato de menos no lo ve nadie. Nadie abre una incidencia por una convocatoria que no aparece: se limita a no enterarse de que existía.

**Y lo que permitió que los dos vivieran tanto: nuestros propios tests.** Cada fixture se había recortado a mano dejando solo la sección de oposiciones, que es lo razonable para que no ocupe. Pero si el fixture solo contiene lo que el filtro debe aceptar, el filtro no se está probando: uno roto que dejara pasar el boletín entero daría exactamente el mismo resultado, y los tests seguirían en verde.

Ahora los fixtures traen secciones que deben quedar fuera, y hay un test que neutraliza el filtro y comprueba que sin él salen más registros. Si esa diferencia desaparece, algo se rompió.

Es una lección barata de contar y cara de aprender: **un test que pasa igual con el código roto no es un test.**

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

El código es AGPL-3.0 y está [en GitHub](https://github.com/opoalerta/opoalerta). Si quieres añadir el boletín de tu comunidad, [hay una guía paso a paso](https://github.com/opoalerta/opoalerta/blob/main/docs/guia-nueva-ccaa.md): son las tres funciones de arriba y un fichero de tests con un fixture que —esto ya lo hemos aprendido— traiga también las secciones que hay que descartar. Faltan Cataluña, País Vasco, Murcia, Navarra, Cantabria, La Rioja, Ceuta y Melilla.
