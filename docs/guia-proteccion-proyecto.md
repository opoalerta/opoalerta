# Guía paso a paso: proteger OpoAlerta de cambios no deseados

Esta guía explica cómo evitar que cualquier persona modifique la web oficial o el repositorio sin supervisión. Está pensada para un proyecto open source pequeño, como OpoAlerta, donde tú eres el propietario y responsable final de lo que se publica.

> **Idea clave**: en un proyecto open source cualquiera puede *proponer* cambios, pero solo tú (o quienes autorices) pueden *aceptarlos* y *publicarlos*.

---

## Paso 1: Proteger tu cuenta de GitHub

Antes de proteger el repositorio, protege la cuenta que tiene el control.

1. Ve a **Settings → Password and authentication** de tu cuenta de GitHub.
2. Activa la **autenticación de dos factores (2FA)**. Usa una app como Google Authenticator, Authy o una llave de seguridad física.
3. Guarda los **códigos de recuperación** en un lugar seguro (no en el mismo móvil).
4. Revisa las **sesiones activas** y revoca las que no reconozcas.
5. No compartas tu contraseña ni uses la misma en varios sitios.

> Enlace: https://github.com/settings/security

---

## Paso 2: Configurar ruleset de protección en `main`

La forma recomendada en GitHub actual es usar **Rulesets** (Settings → Rules → Rulesets), no las reglas clásicas de rama. Un ruleset permite reutilizar la misma configuración, auditar cambios y aplicarla a varias ramas.

1. Entra en tu repositorio: `https://github.com/opoalerta/opoalerta`.
2. Ve a **Settings → Rules → Rulesets**.
3. Pulsa **New ruleset → New branch ruleset**.
4. Rellena:
   - **Ruleset name**: `main-protection`.
   - **Enforcement status**: `Active`.
   - **Bypass list**: solo añade aquí si necesitas bypass para deploys automáticos. Como admin, evita añadirte a ti mismo para no saltarte tus propias reglas por descuido.
   - **Target branches**: añade un target con **Default branch** (o patrón `main`).
5. En **Branch rules**, activa:
   - ☑ **Restrict deletions** (evita borrar `main`).
   - ☑ **Require linear history** (sin merge commits).
   - ☑ **Block force pushes**.
   - ☑ **Require a pull request before merging**
     - **Required approving review count**: `1` si tienes colaboradores de confianza; `0` si eres el único mantenedor (un autor no puede aprobar su propio PR).
     - ☑ **Dismiss stale pull request approvals when new commits are pushed**.
   - ☑ **Require status checks to pass**
     - ☑ **Require branches to be up to date before merging**.
     - Añade los checks exactos de tu CI:
       - `Scrapers (ruff + pytest)`
       - `Web (lint + build)`
6. Guarda con **Create**.

> **Nota importante**: en GitHub, el autor de un pull request **no puede aprobar su propio PR**. Si eres el único mantenedor y pones `Required approving review count: 1`, tus propios PRs quedarán bloqueados con el mensaje *“Review required”*. Verás un botón **“Bypass rules and merge”** porque eres administrador.
>
> - **No uses el bypass para mergear PRs de otras personas.** Úsalo solo para tus propios PRs, y solo cuando los checks de CI hayan pasado.
> - El bypass es una válvula de seguridad, no una forma habitual de trabajar. Si un PR tuyo no pasa los checks, corrígelo en lugar de saltarte las reglas.
> - Si consigues un segundo mantenedor de confianza, sube el conteo a `1` y deja de usar el bypass; así cada cambio tendrá revisión humana independiente.
> - Si prefieres no depender del bypass mientras eres solo, deja `Required approving review count` en `0` y deja que los checks de CI actúen como gatekeeper.

### Si ya existe la regla clásica

Si tienes una regla antigua en **Settings → Branches**, bórrala o desactívala para evitar que entre en conflicto con el ruleset nuevo.

---

## Paso 3: Controlar quién tiene acceso al repositorio

1. Ve a **Settings → Access → Collaborators and teams**.
2. Revisa la lista de **collaborators**.
3. Mantén solo a personas de confianza con permisos de escritura.
4. Para contribuidores ocasionales, no hace falta darles acceso de escritura: pueden hacer un *fork* y enviar un PR desde su cuenta.
5. Si tienes un equipo, asigna roles:
   - **Read**: puede ver y comentar.
   - **Triage**: puede gestionar issues y PRs.
   - **Write**: puede proponer cambios en ramas.
   - **Maintain**: puede administrar el repositorio, pero no cambiar reglas críticas.
   - **Admin**: control total (dáselo solo a quien realmente necesite).

---

## Paso 4: Usar CODEOWNERS para revisión obligatoria (recomendado)

El repositorio ya incluye el archivo `.github/CODEOWNERS`:

```text
# Todo el repositorio requiere revisión del propietario del proyecto.
* @zaswear

# Aplicación web
apps/web/ @zaswear

# Scrapers y datos
scrapers/ @zaswear
data/ @zaswear

# Workflows de CI/CD
.github/workflows/ @zaswear

# Documentación de gobierno del proyecto
docs/ @zaswear
CONTRIBUTING.md @zaswear
GOVERNANCE.md @zaswear
SECURITY.md @zaswear
```

Este archivo hace que GitHub solicite automáticamente la revisión de `@zaswear` para cualquier PR. Para que sea obligatorio:

1. Ve a **Settings → Rules → Rulesets → main-protection**.
2. Edita la regla **Require a pull request before merging**.
3. Activa **Require review from CODEOWNERS**.
4. Guarda los cambios.

> **Consecuencia práctica**: si activas CODEOWNERS review y eres el único maintainer, tus propios PRs seguirán requiriendo el botón **“Bypass rules and merge”**. El beneficio es que **ningún contribuidor externo podrá mergear sin tu aprobación explícita**, aunque tenga permisos de escritura.

> Sustituye `@zaswear` por tu nombre de usuario real de GitHub si el archivo no está actualizado.

---

## Paso 5: Reforzar los workflows de CI

Ya tienes workflows en `.github/workflows`. Asegúrate de que se ejecuten en cada PR y bloqueen el merge si fallan.

### 5.1 Revisar el workflow existente

Mira el archivo `.github/workflows/ci.yml` (o el equivalente). Debería contener al menos:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  scrapers:
    name: Scrapers (ruff + pytest)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: scrapers
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -e ".[dev]"
      - run: ruff check .
      - run: ruff format --check .
      - run: pytest -q

  web:
    name: Web (lint + build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 11.9.0
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
          cache: pnpm
          cache-dependency-path: apps/web/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint      # ejecuta eslint . (next lint se eliminó en Next.js 16)
      - run: pnpm build
```

Si no tienes `ruff`, `pytest`, `pnpm lint` o `pnpm build`, añádelos.

### 5.2 Proteger los checks

En el ruleset del Paso 2, añade los checks obligatorios con los nombres exactos de los jobs de CI:

- `Scrapers (ruff + pytest)`
- `Web (lint + build)`

GitHub los muestra con esos nombres exactos en la lista de checks de cada PR.

---

## Paso 6: Gestionar PRs de Dependabot

Dependabot abre PRs automáticos para actualizar dependencias. **No los mergees a ciegas**.

1. **No mergees nunca un PR con ❌** en los checks.
2. Si el PR está anticuado y falla por un workflow corregido en `main`, escribe un comentario con `@dependabot rebase` para que actualice la rama.
3. Revisa si la actualización es **major** (cambia el primer número de versión, por ejemplo `15 → 16`). Los cambios major pueden romper el build y requieren revisión manual.
4. Actualizaciones de **GitHub Actions** (`actions/checkout`, `actions/setup-node`, etc.) suelen ser seguras si pasan los checks.
5. Actualizaciones menores y de parche (`^1.2.3 → ^1.2.4`) generalmente son seguras si pasan CI.

---

## Paso 7: Configurar Vercel de forma segura

La web se despliega en Vercel. Es importante que solo se despliegue desde tu repo y tu rama `main`.

1. Ve al dashboard de Vercel: https://vercel.com/dashboard.
2. Selecciona el proyecto de OpoAlerta.
3. Ve a **Settings → Git**.
4. Asegúrate de que:
   - **Production Branch** es `main`.
   - **Deploy Preview** está activado (para ver los PRs antes de mergear).
   - No hay despliegues automáticos desde forks extraños.
5. Ve a **Settings → Environment Variables**.
6. Verifica que `DATABASE_URL` esté marcada como **Production** y **Encrypted**. No la compartas.
7. Si hay otras variables (tokens de Telegram, claves de API), configúralas solo en el entorno necesario y no en *Preview* si no es imprescindible.
8. En **Settings → General**, activa **Protection Bypass for Automation** solo si es necesario para CI; en general, mantenlo desactivado.

### 7.1 Revertir un deploy rápidamente

Si algo malo llega a producción:

1. En Vercel, ve a la pestaña **Deployments**.
2. Busca el último deploy correcto.
3. Haz clic en los tres puntos y selecciona **Promote to Production**.

Así la web vuelve a la versión anterior en segundos, sin depender de GitHub.

---

## Paso 8: Establecer un proceso de revisión de PRs

Aunque tengas checks automáticos, la revisión humana es clave.

Antes de aprobar un PR, revisa:

- ¿Qué problema o mejora resuelve? ¿Está claro en la descripción?
- ¿Qué archivos cambia? Revisa el diff línea por línea.
- ¿Añade dependencias nuevas? Si es así, ¿son necesarias y seguras?
- ¿Hay cambios en `apps/web` sin explicación?
- ¿Se tocan variables de entorno, credenciales o URLs de servicios?
- ¿Pasa `pnpm build` y `pnpm lint`?
- ¿El preview de Vercel se ve correcto?

Si algo no te convence, pide cambios con **Request changes** en lugar de aceptar.

---

## Paso 9: Proteger datos e inputs de usuarios (cuando añadas interacción)

Ahora la web es principalmente lectura. Cuando añadas alertas, filtros guardados o suscripciones:

1. **Valida todo lo que entra**. Nunca confíes en lo que envía el navegador.
2. **Sanitiza** textos, emails y cualquier dato que se guarde.
3. **Usa prepared statements** en PostgreSQL (ya lo haces con `neon`).
4. **No ejecutes código** a partir de datos de usuario.
5. **Limita la frecuencia** de peticiones (*rate limiting*) para evitar abuso.
6. **No expongas** `DATABASE_URL`, claves de API ni logs con información sensible.
7. Guarda datos personales solo si es necesario y cumple con el RGPD.

---

## Paso 10: Monitorear y mantener el proyecto

1. Activa las notificaciones de GitHub para:
   - Nuevos PRs e issues.
   - Nuevos deploys en Vercel (si lo permite tu plan).
2. Revisa periódicamente:
   - Los **Dependabot alerts** si los activas (GitHub avisa de dependencias vulnerables).
   - Los **secretos** del repo para que no hayan quedado expuestos.
   - Los **deploys** de Vercel.
3. Mantén actualizados `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `apps/web/DESIGN.md` y esta guía.
4. Si un contribuidor rompe las reglas repetidamente, bloquéalo o revócale el acceso.

---

## Checklist rápido

| Acción | Hecho |
|--------|-------|
| 2FA activado en tu cuenta de GitHub | [ ] |
| Ruleset `main-protection` creado y activo | [x] |
| Requiere PR antes de mergear | [x] |
| Checks de CI obligatorios antes de mergear | [x] |
| Colaboradores revisados y con permisos mínimos | [ ] |
| Archivo `.github/CODEOWNERS` creado | [x] |
| "Require review from CODEOWNERS" activado en el ruleset | [ ] |
| Variables de entorno en Vercel protegidas | [ ] |
| Deploys solo desde `main` | [ ] |
| Proceso de revisión de PRs definido | [ ] |
| Plan de rollback conocido | [ ] |

---

## Conclusión

Con estas medidas, el riesgo de que alguien publique cambios no deseados en la web oficial se reduce prácticamente a cero:

- **La web solo cambia cuando tú aceptas un PR bien revisado.**
- **Los checks automáticos detectan errores antes de que lleguen a producción.**
- **Vercel te permite volver atrás en segundos si algo sale mal.**
- **Dependabot propone, pero tú decides** cuándo actualizar dependencias.

Si quieres, el siguiente paso concreto es revisar el ruleset de `main`, comprobar que los checks de CI son obligatorios y decidir si quieres añadir un archivo `CODEOWNERS`.
