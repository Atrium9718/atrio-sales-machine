#!/usr/bin/env bash
# Asistente de primera configuración en el VPS (se puede volver a ejecutar sin perder nada):
#   ./scripts/configurar.sh
# - Crea firebase-applet-config.json a partir del bloque "firebaseConfig" que muestra Firebase.
# - Guarda la llave de la cuenta de servicio en secrets/.
# - Crea o completa .env: dominio, correo, IA y contraseñas internas generadas al azar.
# Nunca cambia una contraseña que ya exista (cambiar DB_PASSWORD rompería la base de datos).
set -uo pipefail
cd "$(dirname "$0")/.."

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok() { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

# ── 1. Llave de la cuenta de servicio ─────────────────────────────
bold "1. Llave de Firebase (cuenta de servicio)"
mkdir -p secrets
if [ -d secrets/firebase-service-account.json ]; then rm -r secrets/firebase-service-account.json; fi
if [ -f firebase-key.json ]; then
  mv firebase-key.json secrets/firebase-service-account.json
fi
if [ -f secrets/firebase-service-account.json ] && grep -q '"private_key"' secrets/firebase-service-account.json; then
  chmod 600 secrets/firebase-service-account.json
  ok "Llave guardada en secrets/firebase-service-account.json"
else
  warn "Falta la llave. Súbela desde tu computador con scp como firebase-key.json y vuelve a ejecutar este asistente."
fi

# ── 2. Configuración web de Firebase ──────────────────────────────
bold "2. Configuración web de Firebase"
if [ -f firebase-applet-config.json ] && grep -q '"apiKey": *"[^"]' firebase-applet-config.json; then
  ok "Ya estaba configurada (para cambiarla, borra firebase-applet-config.json y ejecuta de nuevo)"
else
  echo "  En Firebase → ⚙️ Configuración del proyecto → General → Tus apps → Config,"
  echo "  copia el bloque completo (desde 'const firebaseConfig = {' hasta '};'),"
  echo "  pégalo aquí y presiona Enter:"
  block=""
  while IFS= read -r line; do
    block+="$line"$'\n'
    [[ "$line" == *"}"* ]] && break
  done
  get() { printf '%s' "$block" | grep -oE "$1[\"']?[[:space:]]*:[[:space:]]*[\"'][^\"']*[\"']" | head -1 | sed -E "s/.*:[[:space:]]*[\"']([^\"']*)[\"']/\1/"; }
  apiKey=$(get apiKey); authDomain=$(get authDomain); projectId=$(get projectId)
  storageBucket=$(get storageBucket); senderId=$(get messagingSenderId); appId=$(get appId); measurementId=$(get measurementId)
  if [ -z "$apiKey" ] || [ -z "$projectId" ] || [ -z "$appId" ]; then
    warn "No se reconoció el bloque (faltan apiKey, projectId o appId). Ejecuta el asistente de nuevo y pega el bloque completo."
  else
    cat > firebase-applet-config.json <<JSON
{
  "projectId": "$projectId",
  "appId": "$appId",
  "apiKey": "$apiKey",
  "authDomain": "$authDomain",
  "firestoreDatabaseId": "",
  "storageBucket": "$storageBucket",
  "messagingSenderId": "$senderId",
  "measurementId": "$measurementId",
  "oAuthClientId": "",
  "recaptchaSiteKey": ""
}
JSON
    ok "Configuración web guardada (proyecto $projectId)"
  fi
fi

# ── 3. Variables (.env) ───────────────────────────────────────────
bold "3. Variables del sistema (.env)"
[ -f .env ] || { cp .env.example .env; ok "Se creó .env a partir de .env.example"; }
chmod 600 .env

current() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }
set_var() {
  if grep -qE "^$1=" .env; then
    local esc; esc=$(printf '%s' "$2" | sed -e 's/[\/&|]/\\&/g')
    sed -i -E "s|^$1=.*|$1=$esc|" .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}
empty_or_placeholder() { local v; v=$(current "$1"); [ -z "$v" ] || [[ "$v" == MY_* ]]; }
ask() { # ask VAR "pregunta" [opcional]
  local v; v=$(current "$1")
  if [ -n "$v" ] && [[ "$v" != MY_* ]]; then ok "$1 ya tiene valor ($([ "${3:-}" = secret ] && echo 'oculto' || echo "$v"))"; return; fi
  read -r -p "  $2: " v
  [ -n "$v" ] && set_var "$1" "$v" && ok "$1 guardado"
}

ask DOMAIN "Dirección del sistema, sin https (ej. app.fusiongrafica.com.co)"
ask ACME_EMAIL "Correo para el certificado de seguridad (ej. sistemas@tuempresa.com)"
ask GEMINI_API_KEY "Llave de Google Gemini para la IA (Enter para dejarla para después)" secret

domain=$(current DOMAIN)
[ -n "$domain" ] && set_var APP_URL "https://$domain"
set_var DATA_BACKEND postgres
set_var GOOGLE_APPLICATION_CREDENTIALS ./secrets/firebase-service-account.json

gen() { openssl rand -hex "$1"; }
for spec in DB_PASSWORD:24 SECRET_ENCRYPTION_KEY:32 META_WEBHOOK_VERIFY_TOKEN:16 WEBCHAT_PUBLIC_KEY:12; do
  name=${spec%%:*}; bytes=${spec##*:}
  if empty_or_placeholder "$name"; then set_var "$name" "$(gen "$bytes")"; ok "$name generada"; else ok "$name ya existía (no se cambia)"; fi
done

# ── 4. Revisión final ─────────────────────────────────────────────
bold "4. Revisión"
./scripts/check-deploy.sh
