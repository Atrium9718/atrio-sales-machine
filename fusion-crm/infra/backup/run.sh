#!/bin/sh
# Programador sencillo: un respaldo al arrancar y luego uno diario a BACKUP_HOUR (hora local, TZ).
set -u
HOUR="${BACKUP_HOUR:-02}"

until pg_isready -q; do echo "[respaldo] esperando a Postgres..."; sleep 5; done
/usr/local/bin/backup.sh || echo "[respaldo] ERROR en el respaldo inicial"

while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) ${HOUR}:00:00" +%s 2>/dev/null || date -D '%Y-%m-%d %H:%M:%S' -d "$(date +%Y-%m-%d) ${HOUR}:00:00" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  echo "[respaldo] próximo respaldo: $(date -d "@$next" 2>/dev/null || date -r "$next")"
  sleep $((next - now))
  /usr/local/bin/backup.sh || echo "[respaldo] ERROR en el respaldo programado"
done
