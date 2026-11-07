#!/usr/bin/env bash
# Ingesta del BOPA desde una máquina con IP residencial (issue #140): el
# cortafuegos del Principado no deja conectar a los runners de GitHub.
#
# Repasa los últimos 7 días cada vez, así que un día que la máquina esté
# apagada lo recupera la pasada siguiente; el upsert evita duplicados.
#
# Necesita DATABASE_URL en ~/.config/opoalerta/env, ENTRECOMILLADA: la URL de
# Neon lleva `&channel_binding=require` y sin comillas el `&` rompe el source.
#   DATABASE_URL="postgresql://…"
#
# Cron (lunes a viernes a las 10:00, cuando el BOPA ya está publicado):
#   0 10 * * 1-5 ~/oss/opoalerta/scrapers/local/bopa.sh >> ~/.local/state/opoalerta-bopa.log 2>&1
set -euo pipefail

ENV_FILE="${OPOALERTA_ENV:-$HOME/.config/opoalerta/env}"
[ -f "$ENV_FILE" ] || { echo "Falta $ENV_FILE con DATABASE_URL" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

cd "$(dirname "$0")/.."
PY=".venv/bin/python"; [ -x "$PY" ] || PY=python3
echo "== $(date -Iseconds)"
"$PY" -m bopa --desde "$(date -d '7 days ago' +%F)" "$@"
