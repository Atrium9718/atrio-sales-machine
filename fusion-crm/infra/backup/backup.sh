#!/bin/sh
# Hace un respaldo de la base de datos ahora mismo.
# Variables: PGHOST PGUSER PGPASSWORD PGDATABASE, BACKUP_DIR (/backups),
# BACKUP_KEEP_DAYS (14), RCLONE_REMOTE (opcional, p. ej. "gdrive:fusion-respaldos").
# Deja el resultado en $BACKUP_DIR/last-status.json (lo muestra la pantalla Respaldos).
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/fusion-${PGDATABASE}-${STAMP}.dump"
STATUS="$BACKUP_DIR/last-status.json"

mkdir -p "$BACKUP_DIR"

write_status() { # ok file error remote remoteOk
  printf '{"ok":%s,"at":"%s","file":"%s","error":"%s","remote":"%s","remoteOk":%s}\n' \
    "$1" "$(date -Iseconds)" "$2" "$(printf '%s' "$3" | tr '"\\\n' "'/ ")" "$4" "$5" > "$STATUS.tmp"
  mv "$STATUS.tmp" "$STATUS"
}
trap 'write_status false "$(basename "$FILE")" "El respaldo falló; revise: docker compose logs backup" "${RCLONE_REMOTE:-}" false' EXIT

echo "[respaldo] $(date -Iseconds) creando $FILE"
# Formato comprimido de pg_dump: se restaura con pg_restore (ver scripts/restore-db.sh)
pg_dump --format=custom --no-owner --file="$FILE.part"
mv "$FILE.part" "$FILE"
# Comprobación rápida de que el archivo se puede leer
pg_restore --list "$FILE" > /dev/null
echo "[respaldo] listo ($(du -h "$FILE" | cut -f1))"

# Archivos subidos (adjuntos del portal), si hay
UPLOADS_SRC="${UPLOADS_SRC:-/uploads}"
FILES_ARCHIVE=""
if [ -d "$UPLOADS_SRC" ] && [ -n "$(ls -A "$UPLOADS_SRC" 2>/dev/null)" ]; then
  FILES_ARCHIVE="$BACKUP_DIR/fusion-uploads-${STAMP}.tar.gz"
  tar -czf "$FILES_ARCHIVE.part" -C "$UPLOADS_SRC" .
  mv "$FILES_ARCHIVE.part" "$FILES_ARCHIVE"
  echo "[respaldo] archivos subidos: $(du -h "$FILES_ARCHIVE" | cut -f1)"
fi

# Borra los respaldos locales más viejos que KEEP_DAYS días
find "$BACKUP_DIR" \( -name 'fusion-*.dump' -o -name 'fusion-uploads-*.tar.gz' \) -type f -mtime "+$KEEP_DAYS" -print -delete | sed 's/^/[respaldo] borrado /'

REMOTE_OK=false
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[respaldo] copiando a $RCLONE_REMOTE"
  if rclone copy "$FILE" "$RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}" \
    && { [ -z "$FILES_ARCHIVE" ] || rclone copy "$FILES_ARCHIVE" "$RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}"; }; then
    REMOTE_OK=true
    # Misma retención en el remoto
    rclone delete "$RCLONE_REMOTE" --min-age "${KEEP_DAYS}d" --include 'fusion-*' --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}" || true
    echo "[respaldo] copia externa lista"
  else
    echo "[respaldo] ERROR copiando a $RCLONE_REMOTE (el respaldo local sí quedó)"
  fi
fi

trap - EXIT
if [ -n "${RCLONE_REMOTE:-}" ] && [ "$REMOTE_OK" = false ]; then
  write_status true "$(basename "$FILE")" "No se pudo copiar a $RCLONE_REMOTE" "$RCLONE_REMOTE" false
else
  write_status true "$(basename "$FILE")" "" "${RCLONE_REMOTE:-}" "$REMOTE_OK"
fi
