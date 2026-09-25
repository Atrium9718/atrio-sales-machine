#!/usr/bin/env bash
set -e

# ==============================================================================
# FUSION CRM — ASTERISK 22 ENTRYPOINT SCRIPT (ETAPA 17.2)
# Sustituye variables de entorno en plantillas hacia /etc/asterisk y valida permisos
# ==============================================================================

echo "=== Iniciando Asterisk 22 LTS (Fusion CRM) ==="

# 1. Valores por defecto para variables de entorno
export ASTERISK_RTP_START="${ASTERISK_RTP_START:-10000}"
export ASTERISK_RTP_END="${ASTERISK_RTP_END:-10200}"
export PUBLIC_IP="${PUBLIC_IP:-127.0.0.1}"
export DOCKER_SUBNET="${DOCKER_SUBNET:-172.18.0.0/16}"
export ASTERISK_ARI_USERNAME="${ASTERISK_ARI_USERNAME:-fusion}"

# Si se suministró ASTERISK_ARI_PASSWORD en texto claro pero no ASTERISK_ARI_PASSWORD_CRYPT,
# generar el hash crypt de forma segura con openssl passwd -6 (SHA-512 crypt)
if [ -z "${ASTERISK_ARI_PASSWORD_CRYPT:-}" ]; then
  if [ -n "${ASTERISK_ARI_PASSWORD:-}" ]; then
    echo "--- Generando hash crypt para ARI desde ASTERISK_ARI_PASSWORD ---"
    export ASTERISK_ARI_PASSWORD_CRYPT=$(openssl passwd -6 "${ASTERISK_ARI_PASSWORD}")
  else
    echo "--- Generando contraseña aleatoria crypt para ARI ---"
    RANDOM_PW=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
    export ASTERISK_ARI_PASSWORD_CRYPT=$(openssl passwd -6 "${RANDOM_PW}")
  fi
fi

# 2. Procesar plantillas de configuración con envsubst
TEMPLATE_DIR="/etc/asterisk.templates"
TARGET_DIR="/etc/asterisk"

mkdir -p "${TARGET_DIR}"
mkdir -p /var/lib/asterisk/sounds/fusion
mkdir -p /var/spool/asterisk/recording
mkdir -p /var/log/asterisk

if [ -d "${TEMPLATE_DIR}" ]; then
  echo "--- Sustituyendo variables de entorno en archivos de configuración ---"
  for tpl in "${TEMPLATE_DIR}"/*; do
    if [ -f "$tpl" ]; then
      filename=$(basename "$tpl")
      # Sustituir variables preservando sintaxis propia de Asterisk como ${EXTEN} o ${CALLERID}
      # envsubst solo reemplaza variables explícitamente definidas en la lista de entorno
      envsubst '${ASTERISK_RTP_START} ${ASTERISK_RTP_END} ${PUBLIC_IP} ${DOCKER_SUBNET} ${ASTERISK_ARI_USERNAME} ${ASTERISK_ARI_PASSWORD_CRYPT} ${COTURN_TURN_ADDR} ${TRUNK_SIP_HOST} ${TRUNK_SIP_PORT} ${TRUNK_USERNAME} ${TRUNK_PASSWORD} ${TRUNK_MAX_CHANNELS}' \
        < "$tpl" > "${TARGET_DIR}/${filename}"
    fi
  done
fi

# 3. Asegurar permisos para usuario asterisk
chown -R asterisk:asterisk /etc/asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk
chmod -R 750 /etc/asterisk

echo "=== Plantillas procesadas. Lanzando proceso Asterisk ==="
exec "$@"
