#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# FUSION CRM — SCRIPT DE BOOTSTRAP PARA VPS UBUNTU / DEBIAN
# Configuración idempotente de sistema, Docker, UFW y puertos WebRTC / LiveKit / TURN
# ==============================================================================

echo "=== Iniciando aprovisionamiento del VPS Fusion CRM ==="

# 1. Actualización de paquetes base
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    jq

# 2. Instalación de Docker y Docker Compose Plugin (si no están instalados)
if ! command -v docker &>/dev/null; then
    echo "--- Instalando Docker Engine ---"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
else
    echo "--- Docker ya está instalado ---"
fi

# 3. Configuración idempotente de Firewall (UFW)
echo "--- Configurando reglas de UFW (Idempotente) ---"
ufw status | grep -qw "active" || ufw --force enable

# Reglas estándar Web y SSH
ufw allow 22/tcp comment "SSH Acceso Remoto" || true
ufw allow 80/tcp comment "HTTP Traefik ACME challenge" || true
ufw allow 443/tcp comment "HTTPS Traefik SSL" || true

# Reglas LiveKit SFU (Etapa 15.6)
ufw allow 7880/tcp comment "LiveKit HTTP/WS Signaling" || true
ufw allow 7881/tcp comment "LiveKit RTC TCP Fallback" || true
ufw allow 50000:50100/udp comment "LiveKit WebRTC Media UDP Range" || true

# Reglas Coturn STUN/TURN (Etapa 15.6)
ufw allow 3478/tcp comment "Coturn STUN/TURN TCP" || true
ufw allow 3478/udp comment "Coturn STUN/TURN UDP" || true
ufw allow 5349/tcp comment "Coturn TURNS TLS TCP" || true
ufw allow 5349/udp comment "Coturn TURNS TLS UDP" || true
ufw allow 49152:49252/udp comment "Coturn Relay UDP Port Range" || true

# Reglas de Telefonía Asterisk 22 (Etapa 17.2)
# Rango RTP UDP para audio en host mode
ufw allow 10000:10200/udp comment "Asterisk RTP Media UDP Range" || true

# SEGURIDAD CRÍTICA SIP: El puerto 5060 NUNCA se abre al mundo entero.
# Solo se autoriza desde la IP específica del operador SIP (Claro/ETB/Twilio).
if [ -n "${TRUNK_OPERATOR_IP:-}" ]; then
  echo "--- Habilitando puerto SIP 5060 exclusivamente para operador ${TRUNK_OPERATOR_IP} ---"
  ufw allow from "${TRUNK_OPERATOR_IP}" to any port 5060 proto udp comment "SIP Operador Trunk UDP" || true
  ufw allow from "${TRUNK_OPERATOR_IP}" to any port 5060 proto tcp comment "SIP Operador Trunk TCP" || true
else
  echo "--- AVISO: TRUNK_OPERATOR_IP no definida. Puerto 5060 permanece protegido contra ataques de fuerza bruta ---"
fi

# El puerto 8088 (ARI y WS interno) NUNCA se abre en UFW:
# Solo Traefik y la red interna de Docker tienen acceso a él.

# 4. Configuración idempotente de Fail2ban para Asterisk
echo "--- Configurando Fail2ban para Asterisk (Idempotente) ---"
apt-get install -y --no-install-recommends fail2ban

# Filtro de Asterisk para fail2ban
cat << 'EOF' > /etc/fail2ban/filter.d/asterisk.conf
[INCLUDES]
before = common.conf

[Definition]
_daemon = asterisk
failregex = ^(%(__prefix_line)s|\[\]\s*)*(?:NOTICE|SECURITY)%(__line_prefix)s .*: (?:Registration from|Call from) '.*' (?:failed for|rejected because) '<HOST>(:\d+)?'
            ^(%(__prefix_line)s|\[\]\s*)*(?:NOTICE|SECURITY)%(__line_prefix)s .*: <HOST> failed to authenticate
            ^(%(__prefix_line)s|\[\]\s*)*(?:NOTICE|SECURITY)%(__line_prefix)s .*: <HOST> tried to authenticate with nonexistent user
            ^(%(__prefix_line)s|\[\]\s*)*(?:NOTICE|SECURITY)%(__line_prefix)s .*: Failed to authenticate device .*@<HOST>
ignoreregex =
EOF

# Jail local para Asterisk
cat << 'EOF' > /etc/fail2ban/jail.d/asterisk.local
[asterisk]
enabled  = true
filter   = asterisk
action   = iptables-allports[name=ASTERISK, protocol=all]
logpath  = /var/log/asterisk/security
maxretry = 4
findtime = 600
bantime  = 86400
EOF

systemctl restart fail2ban || true

echo "--- Estado actual del Firewall UFW: ---"
ufw status verbose

echo "=== Configuración de VPS completada exitosamente ==="

