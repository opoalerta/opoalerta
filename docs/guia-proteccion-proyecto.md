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

## Paso 2: Configurar branch protection en `main`

Esta es la regla más importante: **nadie puede modificar `main` directamente**, ni siquiera tú. Todo debe pasar por un *pull request* revisado.

1. Entra en tu repositorio: `https://github.com/opoalerta/opoalerta`.
2. Ve a **Settings → Branches**.
3. Pulsa **Add rule** (o edita la regla si ya existe).
4. En **Branch name pattern**, escribe: `main`.
5. Activa estas opciones:
   - ☑ **Require a pull request before merging**
     - ☑ **Require approvals**: pon `1` (o más si tienes mantenedores de confianza).
     - ☑ **Dismiss stale PR approvals when new commits are pushed**
     - ☑ **Require review from CODEOWNERS** (opcional, ver más abajo).
   - ☑ **Require status checks to pass before merging**
     - Busca y marca los checks que ya tengas, por ejemplo:
       - `ci` (si lo tienes configurado)
       - `build-web` o similar
       - Checks de Vercel (aparecen cuando hay un PR)
   - ☑ **Require conversation resolution before merging**
   - ☑ **Require linear history** (recomendado para mantener la historia limpia)
   - ☑ **Include administrators** (para que la regla también te afecte a ti)
   - ☑ **Restrict pushes that create files larger than 5 MiB** (opcional, evita archivos enormes)
6. Guarda los cambios con **Create** o **Save changes**.

A partir de ahora, para cambiar `main` se necesita:

1. Crear una rama.
2. Abrir un *pull request*.
3. Que pasen los checks automáticos.
4. Que alguien lo apruebe (tú mismo si eres el único, o un mantenedor).
5. Hacer *merge* desde GitHub.

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

## Paso 4: Usar CODEOWNERS para revisión obligatoria

Un archivo `CODEOWNERS` permite exigir que ciertos archivos o carpetas sean revisados por personas específicas.

1. Crea o edita el archivo `.github/CODEOWNERS` en la raíz del repositorio.
2. Añade algo como esto:

```text
# Todo el repositorio requiere aprobación del propietario
* @opoalerta

# La web solo puede cambiar con tu aprobación
apps/web/ @opoalerta

# Los scrapers y datos son especialmente sensibles
scrapers/ @opoalerta
data/ @opoalerta
```

3. Guarda el archivo en `main`.
4. En la regla de branch protection, activa **Require review from CODEOWNERS**.

> Asegúrate de que `@opoalerta` sea tu nombre de usuario real de GitHub. Si no, cámbialo por el tuyo.

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
    branches: [main]

jobs:
  scrapers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: cd scrapers && pip install -e ".[dev]" && ruff check . && pytest

  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: cd apps/web && npm install -g pnpm && pnpm install && pnpm lint && pnpm build
```

Si no tienes `ruff`, `pytest`, `pnpm lint` o `pnpm build`, añádelos.

### 5.2 Proteger los checks

En la regla de branch protection del Paso 2, marca los checks que correspondan a estos jobs. Si los nombres de los jobs son `scrapers` y `web`, los checks se llamarán `CI / scrapers` y `CI / web`.

---

## Paso 6: Configurar Vercel de forma segura

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

### 6.1 Revertir un deploy rápidamente

Si algo malo llega a producción:

1. En Vercel, ve a la pestaña **Deployments**.
2. Busca el último deploy correcto.
3. Haz clic en los tres puntos y selecciona **Promote to Production**.

Así la web vuelve a la versión anterior en segundos, sin depender de GitHub.

---

## Paso 7: Establecer un proceso de revisión de PRs

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

## Paso 8: Proteger datos e inputs de usuarios (cuando añadas interacción)

Ahora la web es principalmente lectura. Cuando añadas alertas, filtros guardados o suscripciones:

1. **Valida todo lo que entra**. Nunca confíes en lo que envía el navegador.
2. **Sanitiza** textos, emails y cualquier dato que se guarde.
3. **Usa prepared statements** en PostgreSQL (ya lo haces con `neon`).
4. **No ejecutes código** a partir de datos de usuario.
5. **Limita la frecuencia** de peticiones (*rate limiting*) para evitar abuso.
6. **No expongas** `DATABASE_URL`, claves de API ni logs con información sensible.
7. Guarda datos personales solo si es necesario y cumple con el RGPD.

---

## Paso 9: Monitorear y mantener el proyecto

1. Activa las notificaciones de GitHub para:
   - Nuevos PRs e issues.
   - Nuevos deploys en Vercel (si lo permite tu plan).
2. Revisa periódicamente:
   - Los **Dependabot alerts** si los activas (GitHub avisa de dependencias vulnerables).
   - Los **secretos** del repo para que no hayan quedado expuestos.
   - Los **deploys** de Vercel.
3. Mantén actualizados `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` y `SECURITY.md`.
4. Si un contribuidor rompe las reglas repetidamente, bloquéalo o revócale el acceso.

---

## Checklist rápido

| Acción | Hecho |
|--------|-------|
| 2FA activado en tu cuenta de GitHub | [ ] |
| Branch protection activado en `main` | [ ] |
| Requiere PR y aprobación antes de mergear | [ ] |
| Checks de CI obligatorios antes de mergear | [ ] |
| Colaboradores revisados y con permisos mínimos | [ ] |
| Archivo `.github/CODEOWNERS` creado | [ ] |
| Variables de entorno en Vercel protegidas | [ ] |
| Deploys solo desde `main` | [ ] |
| Proceso de revisión de PRs definido | [ ] |
| Plan de rollback conocido | [ ] |

---

## Conclusión

Con estas medidas, el riesgo de que alguien publique tonterías en la web oficial se reduce prácticamente a cero:

- **La web solo cambia cuando tú aceptas un PR bien revisado.**
- **Los checks automáticos detectan errores antes de que lleguen a producción.**
- **Vercel te permite volver atrás en segundos si algo sale mal.**

Si quieres, el siguiente paso concreto es configurar la **branch protection** de `main` y crear el archivo `CODEOWNERS`.
