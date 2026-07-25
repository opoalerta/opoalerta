# Política de seguridad

## Cómo reportar una vulnerabilidad

Si encuentras un problema de seguridad (exposición de datos, inyección, fuga de secretos, etc.), **no abras una issue pública**.

- Usa el aviso privado de GitHub: pestaña **Security → Report a vulnerability** del repositorio (GitHub Security Advisories).
- Si no puedes, escribe a `seguridad@opoalerta.es`.

Incluye pasos para reproducir, impacto estimado y, si puedes, una propuesta de mitigación. Intentaremos responder en un plazo de **7 días** y acordaremos contigo una divulgación coordinada.

## Alcance

OpoAlerta solo procesa **datos públicos oficiales**. No almacena documentos de identidad ni datos sensibles de opositores. Los únicos datos personales son los correos/identificadores de quienes se suscriben a alertas, protegidos como se describa en la política de privacidad de la web.

## Buenas prácticas del proyecto

- Los secretos viven en GitHub Actions Secrets / variables de entorno, nunca en el código.
- Dependabot vigila dependencias vulnerables.
- Los scrapers acceden solo a fuentes oficiales y respetan sus términos.
