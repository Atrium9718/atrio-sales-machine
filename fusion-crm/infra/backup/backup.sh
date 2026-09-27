#!/bin/sh
# Hace un respaldo de la base de datos ahora mismo.
# Variables: PGHOST PGUSER PGPASSWORD PGDATABASE, BACKUP_DIR (/backups),
# BACKUP_KEEP_DAYS (14), RCLONE_REMOTE (opcional, p. ej. "gdrive:fusion-respaldos").
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/fusion-${PGDATABASE}-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"
echo "[respaldo] $(date -Iseconds) creando $FILE"
# Formato comprimido de pg_dump: se restaura con pg_restore (ver scripts/restore-db.sh)
pg_dump --format=custom --no-owner --file="$FILE.part"
mv "$FILE.part" "$FILE"
# Comprobación rápida de que el archivo se puede leer
pg_restore --list "$FILE" > /dev/null
echo "[respaldo] listo ($(du -h "$FILE" | cut -f1))"

# Borra los respaldos locales más viejos que KEEP_DAYS días
find "$BACKUP_DIR" -name 'fusion-*.dump' -type f -mtime "+$KEEP_DAYS" -print -delete | sed 's/^/[respaldo] borrado /'

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[respaldo] copiando a $RCLONE_REMOTE"
  rclone copy "$FILE" "$RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}"
  # Misma retención en el remoto
  rclone delete "$RCLONE_REMOTE" --min-age "${KEEP_DAYS}d" --include 'fusion-*.dump' --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}" || true
  echo "[respaldo] copia externa lista"
fi
