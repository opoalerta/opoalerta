# ADR 0001 — Stack tecnológico y hosting

- **Estado:** aceptado, con una enmienda (ver «Actualizaciones»)
- **Fecha:** 2026-07-25

## Contexto

OpoAlerta debe agregar convocatorias de decenas de boletines oficiales, servir un
buscador con alertas y ser mantenible por una comunidad de voluntarios cívicos,
todo con coste próximo a cero y sin infraestructura propia.

## Decisión

- **Web:** Next.js (App Router, TypeScript, Tailwind) en **Vercel**. SSR/SSG para
  SEO, previews por PR (útiles para revisar contribuciones), CDN y HTTPS gratis.
- **Datos:** PostgreSQL gestionado en **Supabase** (tier gratuito, auth integrada
  para alertas). Postgres estándar para no quedar atados al proveedor.
- **Ingesta:** scrapers en **Python** ejecutados por **GitHub Actions** (cron
  gratuito en repos públicos). Python es el lenguaje más accesible para
  contribuidores cívicos.
- **Contrato de datos:** un **JSON Schema** común; cada scraper valida contra él.

## Alternativas consideradas

- **Todo en un runtime (Next + scrapers en TS).** Descartado: Python tiene mejor
  ecosistema de parsing y menor barrera de entrada para la comunidad objetivo.
- **Backend propio (VPS con cron).** Descartado para el MVP por coste y
  mantenimiento; queda como plan de contingencia (Hetzner + Coolify) si el
  proyecto supera los tiers gratuitos.
- **Firebase/otros.** Descartado por menor portabilidad frente a Postgres estándar.

## Consecuencias

- Coste ≈ 0 €/mes hasta miles de usuarios; único gasto recurrente, el dominio.
- Portabilidad alta: migrar a Neon o a un VPS es cambiar variables de entorno.
- Dos lenguajes en el repo (Python + TypeScript); se asume por accesibilidad.
- La integración git de Vercel Hobby con repos de organización puede requerir plan
  Pro; si ocurre, se despliega vía CLI con un `VERCEL_TOKEN` desde GitHub Actions.

## Actualizaciones

**2026-08-11 — Postgres en Neon, no en Supabase.** La auth integrada de Supabase, que
era medio motivo de la elección, no se acabó usando: las alertas van por email y
Telegram con doble confirmación propia, sin cuentas de usuario. Sin esa pieza, Neon
salía mejor por el driver serverless (`@neondatabase/serverless`), que evita el problema
de pool de conexiones desde funciones de Vercel.

La decisión de fondo —**Postgres estándar para no quedar atados al proveedor**— es
justo lo que hizo que el cambio fuera indoloro: el esquema de `data/schema/` no se
tocó. El ADR se deja como estaba porque un ADR registra lo que se decidió entonces, no
lo que hay hoy.
