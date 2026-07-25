# Handoff: Logotipo y esquema de color — OpoAlerta

## Qué es esto
Paquete solo con el **logo** y la **paleta de color** de OpoAlerta, para integrarlos en el código real de opoalerta.es con Claude Code. No incluye el resto de la landing (eso es un diseño de referencia aparte).

## Fidelidad
Alta fidelidad. Colores exactos abajo — úsalos tal cual, no los reinterpretes.

## Archivos incluidos
- `logo-icon.svg` — icono solo (páginas + megáfono), fondo claro.
- `logo-icon-on-dark.svg` — icono solo, versión para fondo azul marino/oscuro.
- `logo-horizontal.svg` — icono + wordmark "OpoAlerta", fondo claro.
- `logo-horizontal-on-dark.svg` — icono + wordmark, para fondo oscuro.

El wordmark de los SVG horizontales usa `<text>` con la fuente Poppins (fallback Arial). Si Poppins no está cargada en el proyecto destino, instala la fuente (Google Fonts) o pide que Claude Code lo recree como texto HTML real con esa tipografía en vez del `<text>` del SVG.

## Concepto del icono
Una pila de páginas/documentos (trámites, convocatorias) de la que sale un megáfono dorado emitiendo una alerta — representa las alertas de oposiciones publicadas.

## Paleta de color

| Token | Hex | Uso |
|---|---|---|
| Azul marino (primario) | `#1B3358` | Fondos oscuros, texto de marca, botón secundario |
| Azul medio | `#33507A` | Superficies sobre azul marino, hover de azul |
| Dorado (acento) | `#D9A62B` | CTA principal, acento del megáfono, "Alerta" del wordmark |
| Dorado oscuro | `#C7941F` | Sombra/detalle del dorado (bocina del megáfono) |
| Dorado claro (sobre fondo oscuro) | `#F7C948` | Texto "Alerta" y acentos cuando el fondo es azul marino |
| Crema fondo | `#F7F5F0` | Fondo general de la web (no blanco puro) |
| Gris texto secundario | `#8792A2` | Texto secundario, metadatos |
| Blanco | `#ffffff` | Fondos de tarjeta, texto sobre azul marino |

## Tipografía
- Titulares / marca: **Poppins**, weight 700–800.
- Cuerpo de texto: **Inter**, weight 400–600.

## Uso recomendado
- Wordmark: "Opo" en azul marino (`#1B3358`) + "Alerta" en dorado (`#D9A62B`), sin espacio, weight 800, letter-spacing ligeramente negativo (`-0.4px` a `-0.5px`).
- Sobre fondo azul marino, usar la versión "on-dark" del icono y "Alerta" en `#F7C948` (dorado más claro, mejor contraste que el dorado base sobre azul).
- Mantener un margen de seguridad alrededor del icono de al menos el ancho de una de las "páginas" del icono.

## Instrucciones para Claude Code
Importa estos SVG como assets estáticos (o conviértelos a componentes React/Vue si el proyecto es de componentes) y sustituye el logo actual de la web por `logo-horizontal.svg` en el header (fondo claro) y `logo-horizontal-on-dark.svg` donde el header/footer tengan fondo azul marino. Aplica los tokens de color de la tabla como variables del proyecto (CSS custom properties o el theme del framework que use el repo) en vez de repetir hex sueltos.
