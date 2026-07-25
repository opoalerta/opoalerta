# Diseño de interfaz de OpoAlerta

Este documento recoge las decisiones de diseño, el sistema visual y los componentes de la aplicación web de OpoAlerta. Está pensado para mantener la coherencia a medida que el proyecto crece y para facilitar la contribución de nuevos desarrolladores.

## Principios de diseño

1. **Claridad institucional**: la interfaz debe leerse como un servicio público de confianza, no como una aplicación comercial.
2. **Sencillez maximalista**: mostrar todos los detalles relevantes del proyecto (fuentes, estado, licencias, roadmap…) pero sin recargar la página.
3. **Accesibilidad primero**: contraste suficiente, foco visible, navegación por teclado y etiquetas semánticas.
4. **Mobile-first**: el diseño debe funcionar igual de bien en móvil que en escritorio.
5. **Sin publicidad ni distracciones**: no hay anuncios, pop-ups, ni llamadas la acción agresivas.

## Inspiración

El rediseño toma como referencia el estilo visual de las administraciones neerlandesas, en especial el de la **Belastingdienst** y el **Rijksoverheid Design System**:

- Fondo blanco con franjas gris muy claro para separar secciones.
- Azul oscuro institucional en cabecera y pie.
- Acento amarillo como detalle de identidad.
- Tipografía limpia y jerarquía tipográfica evidente.
- Cajas de aviso con borde lateral de color.
- Tablas con encabezados azules y filas alternadas suaves.

## Sistema visual

### Paleta de colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| Blanco | `#ffffff` | Fondo principal y tarjetas. |
| Gris superficie | `#f3f5f6` | Franjas de sección y fondos de cajas. |
| Texto principal | `#1a1a1a` | Títulos, párrafos y cuerpo. |
| Texto secundario | `#595959` | Subtítulos, metadatos, pies. |
| Azul primario | `#01689b` | Enlaces, botones primarios, acentos. |
| Azul oscuro | `#154273` | Cabecera, pie, títulos de página. |
| Amarillo acento | `#f9e11e` | Franja de identidad, badges destacados. |
| Verde éxito | `#39870c` | Estados positivos, fuentes activas. |
| Rojo advertencia | `#d52b1e` | Errores, sin datos, advertencias. |
| Borde suave | `#e5e5e5` | Bordes de tarjetas y tablas. |
| Borde medio | `#cccccc` | Bordes de inputs y botones secundarios. |
| Foco | `#2b7bb9` | Outline de foco visible. |

### Tipografía

- **Familia**: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- **Tamaños**:
  - Hero: `text-4xl sm:text-5xl`, negrita, tracking ligeramente ajustado.
  - H1 de página: `text-3xl sm:text-4xl`, color azul oscuro.
  - H2 de sección: `text-2xl`, color azul oscuro.
  - H3 / subtítulo: `text-lg`, color azul oscuro.
  - Cuerpo: tamaño base (`1rem`), color texto principal.
  - Metadatos: `text-sm` o `text-xs`, color texto secundario.
- **Interlineado**: `1.6` en el body para legibilidad.

### Espaciado y layout

- Contenedor principal: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8`.
- Padding vertical de secciones: `py-12` a `py-16`.
- Gap entre tarjetas y bloques: `gap-3`, `gap-4`, `gap-6` o `gap-8` según densidad.
- Bordes redondeados: `rounded` o `rounded-r` para cajas; `rounded` para tarjetas.

## Componentes

Todos los componentes están en `app/components/`.

### `Header`

- Fondo azul oscuro (`#154273`), texto blanco.
- Logo textual "OpoAlerta" + subtítulo "Convocatorias de empleo público".
- Navegación principal: Inicio, Estado del servicio, Código en GitHub.
- Franja amarilla de 4 px en la parte inferior como detalle de identidad institucional.

### `Footer`

- Fondo azul oscuro, texto blanco, tres columnas en escritorio.
- Columnas: descripción del proyecto, enlaces del proyecto, licencias y datos.
- Nota final: "Proyecto cívico · Open source · Fase 1 · MVP".

### `Container`

Contenedor centrado con padding responsive. Se usa para envolver el contenido de cada sección.

### `PageHeader`

- Breadcrumb simple (`Inicio / Página actual`).
- Título de página (`h1`) en azul oscuro.
- Descripción opcional (lead) en texto secundario.

### `NoticeBox`

Caja informativa con borde lateral de color para destacar avisos. Variantes:

- `info`: borde azul, fondo gris superficie.
- `warning`: borde rojo, fondo rojo muy claro.
- `success`: borde verde, fondo verde muy claro.

### `FeatureBlock`

Bloque de características con un número en un círculo azul, título y párrafo. Se usa para explicar "Cómo funciona".

### `ConvocatoriaCard`

Tarjeta de convocatoria con:

- Badge de fuente (`BOE`, `BOJA`…).
- Ámbito/CCAA y fecha de publicación.
- Título y organismo.
- Enlace a la URL oficial.
- Estado hover: borde azul y sombra suave.

### `ConvocatoriaSearch`

Componente cliente (`"use client"`) que combina:

- Input de búsqueda con `label` oculto para lectores de pantalla.
- Botón para limpiar la búsqueda.
- Contador de resultados.
- Lista de `ConvocatoriaCard` filtrada por título, organismo o fuente.
- Normalización de tildes y mayúsculas en el filtro.

### `EstadoTable`

Tabla de fuentes con columnas:

- Fuente (código + nombre).
- Convocatorias ingeridas.
- Última ingesta (formateada en hora española).
- Badge "sin datos" en rojo cuando no hay convocatorias.

## Estructura de páginas

### `/` (home)

1. **Hero**: título, descripción, CTAs a buscador y GitHub.
2. **Aviso MVP**: explica la fase actual, la ingesta diaria y cómo reportar incidencias.
3. **Buscador y convocatorias**: input funcional + tarjetas de las últimas 30 convocatorias.
4. **Cómo funciona**: 3 bloques explicando ingesta, normalización y alertas futuras.
5. **Fuentes oficiales**: listado de BOE y boletines autonómicos con badges de estado (activo/previsto).
6. **Open source y contribución**: enlaces a GitHub, CONTRIBUTING, Roadmap y Estado.
7. **FAQ**: 4 preguntas frecuentes sobre precio, datos, alertas y contribución.

### `/estado`

1. Breadcrumb.
2. Título y descripción.
3. Resumen de totales (fuentes configuradas y convocatorias ingeridas).
4. Tabla de estado de fuentes.
5. Mensaje de aviso si no hay conexión a base de datos.

## Accesibilidad

- `html lang="es"`.
- Navegación con `<nav aria-label="Principal">` y `<nav aria-label="Breadcrumb">`.
- Inputs con `label` asociado (visualmente oculto si es necesario).
- Foco visible en enlaces, botones e inputs mediante `focus-visible` con outline de 3 px.
- Contraste de colores compatible con WCAG AA.
- Uso de elementos semánticos: `<header>`, `<main>`, `<footer>`, `<section>`, `<table>`, `<thead>`, `<tbody>`.

## Decisiones de diseño tomadas

- **Tema claro en lugar de oscuro**: se alinea con el estilo de servicios públicos neerlandeses y mejora la legibilidad en exteriores y pantallas de bajo brillo.
- **Sin dark mode por ahora**: simplifica el mantenimiento. Se puede añadir más adelante si hay demanda.
- **Sin iconos externos**: se usan solo elementos tipográficos y formas geométricas (círculos, badges) para evitar dependencias y mantener la carga ligera.
- **Buscador en cliente**: filtra las 30 convocatorias cargadas sin añadir backend, manteniendo la página principal como Server Component para el fetch inicial.
- **Layout compartido**: Header y Footer se incluyen en `layout.tsx` para no repetir código en cada página.

## Cómo probar el diseño

```bash
cd apps/web
pnpm install
pnpm dev
```

Y para verificar que no se rompe nada antes de subir cambios:

```bash
pnpm lint
pnpm build
```

## Mantenimiento futuro

Cuando se añadan nuevas páginas o secciones:

1. Usar `Container` para centrar el contenido.
2. Usar `PageHeader` para títulos de página.
3. Usar `NoticeBox` para avisos importantes.
4. Mantener la paleta de colores; no introducir nuevos colores sin consenso.
5. Asegurar que los nuevos componentes pasan `pnpm lint` y `pnpm build`.
