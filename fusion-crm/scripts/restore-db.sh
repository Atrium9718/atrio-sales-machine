#!/usr/bin/env bash
# Restaura un respaldo de Postgres hecho por el servicio "backup" (fusion-backup).
#   ./scripts/restore-db.sh                               -> lista los respaldos disponibles
#   ./scripts/restore-db.sh fusion-fusion_crm-XXXX.dump   -> restaura ese archivo
#   ./scripts/restore-db.sh --files fusion-uploads-XXXX.tar.gz -> restaura los adjuntos
# ATENCIÓN: reemplaza el contenido actual de la base de datos. Detiene la app mientras restaura.
set -euo pipefail
BACKUP="${BACKUP_CONTAINER:-fusion-backup}"
APP="${APP_CONTAINER:-fusion-app}"

if [ $# -eq 0 ]; then
  echo "Respaldos disponibles:"
  docker exec "$BACKUP" sh -c 'ls -lh /backups/fusion-*.dump /backups/fusion-uploads-*.tar.gz 2>/dev/null || echo "(ninguno)"'
  exit 0
fi

if [ "$1" = "--files" ]; then
  FILE="$(basename "${2:?Indica el archivo fusion-uploads-….tar.gz}")"
  docker exec "$BACKUP" test -f "/backups/$FILE" || { echo "No existe /backups/$FILE"; exit 1; }
  read -r -p "Esto agrega/reemplaza los adjuntos con los de $FILE. Escribe RESTAURAR para continuar: " ok
  [ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
  docker exec "$BACKUP" cat "/backups/$FILE" | docker exec -i "$APP" tar -xzf - -C /app/uploads
  echo "Adjuntos restaurados."
  exit 0
fi

FILE="$(basename "$1")"
docker exec "$BACKUP" test -f "/backups/$FILE" || { echo "No existe /backups/$FILE"; exit 1; }
read -r -p "Esto reemplaza la base de datos actual con $FILE. Escribe RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

app_running=$(docker ps -q -f "name=^${APP}$")
[ -n "$app_running" ] && docker stop "$APP" >/dev/null
docker exec "$BACKUP" sh -c "pg_restore --clean --if-exists --no-owner --dbname=\"\$PGDATABASE\" /backups/$FILE"
[ -n "$app_running" ] && docker start "$APP" >/dev/null
echo "Restauración terminada."
