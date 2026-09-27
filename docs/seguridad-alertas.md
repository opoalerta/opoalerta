# Activacion de las protecciones de alertas

Este bloque no cambia los tokens ni migra las suscripciones existentes. No corrige
todavia su deduplicacion, reactivacion o caducidad. No es una certificacion de
seguridad del servicio.

## Orden de activacion

1. Revisar y aplicar `data/schema/007_cuotas_alertas.sql` en la base de datos de la
   app. Es aditivo e idempotente; el rol de la web necesita acceso a la tabla y a
   la funcion. No se ha aplicado automaticamente. Probar primero en una base aislada.
2. Crear `ALERT_RATE_LIMIT_SECRET` aleatorio de al menos 32 caracteres, solo del
   lado servidor. Por ejemplo, generar 32 bytes con `openssl rand -hex 32`.
   No usar el prefijo `NEXT_PUBLIC_`, ni guardarlo en git o logs.
3. Crear otro secreto independiente `TELEGRAM_WEBHOOK_SECRET`, aleatorio, de
   32-256 caracteres de `A-Z`, `a-z`, `0-9`, `_`, `-`. Guardar el mismo valor en
   el entorno de la web y en GitHub Actions Secrets, junto al token del bot.
4. Ejecutar una sola vez el workflow **Configurar webhook de Telegram** con
   estos cambios. Registra `secret_token` y comprueba `ok: true`, sin imprimir
   respuestas del proveedor. El webhook anterior acepta la nueva cabecera si no
   tenia secreto configurado; si lo tenia, debe coincidir. Coordinar una rotacion
   en una ventana de mantenimiento para evitar rechazos transitorios.
5. Desplegar la web con la migracion y ambos secretos preparados. Si faltan, las
   altas y/o el webhook devuelven 503: nunca se desactiva la proteccion.
6. Con cuentas de prueba propias, verificar confirmacion, `/start` y `/stop`, y
   comprobar 401 sin la cabecera correcta. No usar contactos de otras personas.

No se ha ejecutado el workflow ni realizado un despliegue desde esta tarea.
Un rollback de la web no requiere borrar la tabla; conservar el secreto registrado
en Telegram. No retirar el control del webhook para resolver un fallo de configuracion.

## Cuotas y privacidad

- Por canal: 100 altas/hora y 500/dia, incluyendo intentos de reenvio.
- Por cliente y canal: 10/hora. Solo en Vercel se confia en `x-forwarded-for`,
  sobrescrito por su entrada de red. Fuera de Vercel se usa una cuota compartida:
  no confiar en cabeceras de IP arbitrarias al cambiar de alojamiento.
- Por correo normalizado: 1 intento cada 10 minutos y 3/dia. Cambiar filtros no
  evita la cuota. Un error posterior al reservar cuota tambien consume el intento.
- Ventanas desde la primera admision, no ventanas deslizantes. Se permite una
  rafaga alrededor del cambio de ventana. Las respuestas 429 incluyen `Retry-After`.
- Contadores atomicos en Postgres; una peticion denegada no crea claves ni gasta
  las otras cuotas. Un fallo de base de datos produce 503, no un envio sin limite.
- Las claves de destinatario/cliente son HMAC-SHA256, nunca correo/IP en claro.
  Son datos seudonimizados, no anonimos. Caducan en un maximo de 24 horas y se
  purgan en la siguiente comprobacion. Sin trafico pueden permanecer caducadas;
  para una retencion estricta, programar `DELETE FROM cuotas_alertas WHERE
  caduca_en <= now()` diariamente en la infraestructura. Copias de seguridad y
  logs de la plataforma tienen sus propios plazos y requieren revision humana.
- Rotar el secreto reinicia efectivamente las cuotas por cliente/destinatario.
  Las cuotas globales siguen vigentes. Las IP compartidas pueden alcanzar el limite
  conjuntamente; los ataques distribuidos aun pueden agotar la cuota global.
  Esta medida limita envios y almacenamiento, no sustituye proteccion volumetrica
  en la entrada del servicio ni evita todo coste de invocacion/base de datos.

Los nuevos logs de notificaciones solo incluyen canal, recuentos y errores
genericos. Los logs historicos no se borran automaticamente. Revisar su acceso y
retencion, y actualizar la informacion de privacidad antes de publicar.

## Pruebas

Web: `cd apps/web && pnpm test && pnpm lint && pnpm build`.
Scrapers: `cd scrapers && pytest -q && ruff check . && ruff format --check .`.
Los tests no deben contactar con Telegram, Resend ni la base de datos real.

Referencias tecnicas: [Telegram setWebhook](https://core.telegram.org/bots/api#setwebhook)
y [cabeceras de Vercel](https://vercel.com/docs/headers/request-headers).
