#!/usr/bin/env bash
# Revisa que todo esté listo antes de arrancar el despliegue mínimo en el VPS.
#   ./scripts/check-deploy.sh
# No cambia nada; solo reporta qué falta.
set -uo pipefail
cd "$(dirname "$0")/.."

ok=0
pass() { echo "  ✔ $1"; }
fail() { echo "  ✘ $1"; ok=1; }
warn() { echo "  ! $1"; }

echo "Revisando el despliegue de Fusion CRM…"

command -v docker >/dev/null && pass "Docker instalado ($(docker --version | cut -d, -f1))" || fail "Docker no está instalado (curl -fsSL https://get.docker.com | sh)"
docker compose version >/dev/null 2>&1 && pass "Docker Compose disponible" || fail "Falta el plugin docker compose"

if [ -f .env ]; then
  pass "Archivo .env encontrado"
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
else
  fail "Falta .env (cp .env.example .env y complétalo)"
fi

for v in DOMAIN ACME_EMAIL DB_PASSWORD; do
  [ -n "${!v:-}" ] && pass "$v definido" || fail "$v vacío en .env"
done
if [ -n "${DB_PASSWORD:-}" ] && [ "${#DB_PASSWORD}" -lt 16 ]; then
  warn "DB_PASSWORD tiene menos de 16 caracteres; usa una más larga (openssl rand -base64 24)"
fi
[ -n "${GEMINI_API_KEY:-}" ] && [ "${GEMINI_API_KEY}" != "MY_GEMINI_API_KEY" ] && pass "GEMINI_API_KEY definido" || warn "GEMINI_API_KEY vacío: las funciones de IA no funcionarán"

if [ -f firebase-applet-config.json ]; then
  grep -q '"apiKey": *"[^"]' firebase-applet-config.json && pass "firebase-applet-config.json completo" || fail "firebase-applet-config.json sin apiKey"
else
  fail "Falta firebase-applet-config.json (cópialo de firebase-applet-config.example.json y complétalo con los datos de la consola de Firebase)"
fi

if [ -d secrets/firebase-service-account.json ]; then
  fail "secrets/firebase-service-account.json es una carpeta (Docker la creó porque faltaba el archivo). Bórrala y copia el JSON de la cuenta de servicio"
elif [ -f secrets/firebase-service-account.json ]; then
  grep -q '"private_key"' secrets/firebase-service-account.json && pass "Cuenta de servicio de Firebase presente" || fail "secrets/firebase-service-account.json no parece una cuenta de servicio"
  [ "$(stat -c %a secrets/firebase-service-account.json)" = "600" ] || warn "Protege la llave: chmod 600 secrets/firebase-service-account.json"
else
  fail "Falta secrets/firebase-service-account.json (Firebase → Configuración → Cuentas de servicio → Generar nueva clave privada)"
fi

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  [ -f secrets/rclone/rclone.conf ] && pass "Copia externa de respaldos configurada ($BACKUP_RCLONE_REMOTE)" || fail "BACKUP_RCLONE_REMOTE definido pero falta secrets/rclone/rclone.conf"
else
  warn "Sin copia externa de respaldos: se guardan solo en este VPS (ver DEPLOY.md, paso 6)"
fi

if [ -n "${DOMAIN:-}" ]; then
  domain_ip=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')
  my_ip=$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)
  if [ -z "$domain_ip" ]; then
    fail "$DOMAIN no resuelve todavía: crea el registro A apuntando a ${my_ip:-la IP del VPS}"
  elif [ -n "$my_ip" ] && [ "$domain_ip" != "$my_ip" ]; then
    fail "$DOMAIN apunta a $domain_ip pero este VPS es $my_ip (el certificado HTTPS fallará)"
  else
    pass "$DOMAIN apunta a este servidor ($domain_ip)"
  fi
fi

for port in 80 443; do
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$port\$"; then
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q fusion-traefik && pass "Puerto $port en uso por fusion-traefik" || fail "El puerto $port ya lo usa otro programa (¿Apache/Nginx?). Deténlo antes de arrancar"
  else
    pass "Puerto $port libre"
  fi
done

echo
if [ $ok -eq 0 ]; then
  echo "Todo listo. Arranca con:"
  echo "  docker compose -f docker-compose.minimal.yml up -d --build"
else
  echo "Corrige los puntos marcados con ✘ y vuelve a ejecutar este script."
fi
exit $ok
