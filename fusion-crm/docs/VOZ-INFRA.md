# FUSION CRM — INFRAESTRUCTURA DE VOZ (ASTERISK 22 LTS, ARI Y WEBRTC)

Documentación técnica de arquitectura, señalización, medios y despliegue del subsistema de telefonía (Etapa 17.2).

---

## 1. Diagrama de Flujo: Señalización y Medios

El sistema opera con dos rutas de tráfico estrictamente diferenciadas: el tráfico WebRTC (clientes web / agentes) y el tráfico SIP de la troncal telefónica (operador E.164).

```
                      ┌─────────────────────────────────────────────────────────┐
                      │              TRAEFIK v3 (Reverse Proxy TLS)             │
                      │               Termina TLS (Let's Encrypt)               │
                      └────────────────────────────┬────────────────────────────┘
                                                   │
  (Señalización WebRTC WSS)                        │ HTTP / WS (Plano interno)
  wss://pbx.fusioncg.com/ws                        ▼ ws://asterisk:8088/ws
┌──────────────────────┐                ┌──────────────────────────────────────┐
│  Navegador Web       │◄──────────────►│     ASTERISK 22.6 LTS (HOST MODE)   │
│  (Agente / Asesor)   │   RTP Audio    │                                      │
│  DTLS-SRTP / Opus    │◄──────────────►│  - PJSIP transport-wss (8088)       │
└──────────────────────┘  10000-10200   │  - PJSIP transport-udp (5060)       │
                                        │  - chan_websocket (Agente IA)       │
                                        │  - Sorcery dinámico (astdb)          │
┌──────────────────────┐                │  - res_ari (HTTP interno 8088)       │
│  Operador Telefónico │   SIP 5060 UDP │                                      │
│  (Claro / ETB / Twilio)◄─────────────►│                                      │
│  G.711 alaw / ulaw   │◄──────────────►│                                      │
└──────────────────────┘   RTP Media    └───────────────────▲──────────────────┘
                          10000-10200                       │
                                                            │ REST ARI / Stasis
                                                            ▼ (fusion-voz)
                                                ┌──────────────────────────────┐
                                                │    FUSION CRM BACKEND        │
                                                │    (apps/web / server)       │
                                                │                              │
                                                │  - Provisioning dinámico     │
                                                │  - Enrutamiento y Dialplan   │
                                                │  - Baúl de secretos (Secret) │
                                                │  - Horarios y Ley 51         │
                                                └──────────────────────────────┘
```

---

## 2. Puertos Obligatorios y Validación

| Puerto / Rango | Protocolo | Función | Exposición |
|---|---|---|---|
| **5060** | UDP / TCP | Señalización SIP con el operador de telefonía | **Restringido**: Solo IPs del operador autorizadas en UFW |
| **8088** | TCP | REST ARI y WebSockets internos | **Privado**: Solo red interna Docker / Traefik. NUNCA a internet |
| **10000 - 10200** | UDP | Rango de puertos para audio RTP (voz) | **Público**: Abierto en UFW para flujo bidireccional de voz |
| **443** | TCP | HTTPS y WSS (`wss://pbx.fusioncg.com/ws`) | **Público**: Gestionado por Traefik v3 |

### Comandos de Validación en el Host:

```bash
# 1. Comprobar que Asterisk está corriendo y responde
docker exec -it fusion-asterisk asterisk -rx "core show uptime"

# 2. Comprobar que los transportes PJSIP están escuchando
docker exec -it fusion-asterisk asterisk -rx "pjsip show transports"

# 3. Comprobar que el endpoint de la troncal está activo
docker exec -it fusion-asterisk asterisk -rx "pjsip show endpoints"

# 4. Verificar puertos UDP abiertos en el sistema operativo
ss -ulnp | grep -E '5060|10000'
```

---

## 3. Justificación de Módulos de Asterisk 22.6

Para garantizar el mínimo consumo de memoria y la menor superficie de ataque posible, se compila menuselect de forma quirúrgica:

### Módulos Habilitados y su Justificación:
- **`res_ari` y sub-módulos (`res_ari_*`, `res_stasis`)**: El CRM controla Asterisk como un periférico programable. Toda la lógica de negocio, colas y eventos reside en TypeScript.
- **`res_pjsip` y `res_pjsip_transport_websocket`**: Pila SIP moderna y soporte nativo para WebSockets WebRTC sin necesidad de pasarelas WebRTC externas (como sipml5 o webrtc2sip).
- **`res_http_websocket`**: Transporte de datos para clientes navegadores y el conector del agente de IA.
- **`res_srtp` y `res_crypto`**: Encriptación obligatoria DTLS-SRTP requerida por las especificaciones de seguridad de navegadores (Chrome, Safari, Firefox).
- **`codec_opus` y `res_format_attr_opus`**: Códec de audio de alta definición y baja latencia nativo para navegadores web.
- **`chan_websocket`**: **Característica clave de Asterisk 22.6+**. Permite enviar y recibir el flujo de audio PCM crudo directamente contra el agente de inteligencia artificial (Sub-Etapa 17.7).
- **`res_speech`, `func_talkdetect`, `app_mixmonitor`**: Detección de silencios, interrupciones de voz y grabación de llamadas.
- **`CORE-SOUNDS-ES-WAV`**: Locuciones del sistema en español neutro.

### Módulos Descartados Expresamente:
- **`chan_sip.so`**: Protocolo obsoleto, inseguro y sin soporte WebRTC moderno.
- **`app_voicemail.so`**: El CRM almacena y transcribe buzones en MinIO/S3 y base de datos con el modelo `VoiceVoicemail`.
- **`app_queue.so`**: Las colas y agentes se distribuyen dinámicamente desde el CRM mediante `VoiceQueue` y `VoiceQueueMember`.
- **`res_phoneprov.so`**: Aprovisionamiento telefónico legado no aplicable.
- **`cdr_csv.so`, `cdr_custom.so`, `cel_custom.so`**: La auditoría y tarificación se persisten de forma transaccional en `VoiceCall` dentro de PostgreSQL.

---

## 4. Modalidad de Red: Host vs. Red Bridge

En `docker-compose.yml` se implementa la **Opción A (network_mode: host)** por diseño:

### Opción A (Predeterminada): `network_mode: host`
- **Ventajas**: Elimina problemas de NAT traversal con RTP. Asterisk ve la interfaz de red física y la IP pública real del VPS, evitando que el audio se corte o viaje en una sola vía.
- **Configuración en `pjsip.conf`**:
  ```ini
  [transport-udp]
  type = transport
  protocol = udp
  bind = 0.0.0.0:5060
  external_media_address = ${PUBLIC_IP}
  external_signaling_address = ${PUBLIC_IP}
  local_net = ${DOCKER_SUBNET}
  ```

### Opción B (Alternativa): Red Bridge con puertos expuestos
Si el entorno requiere aislar la red de Asterisk en una interfaz virtual de Docker:
1. En `docker-compose.yml`:
   ```yaml
   asterisk:
     # network_mode: host  <-- comentar
     networks:
       - fusion-internal
     ports:
       - "5060:5060/udp"
       - "5060:5060/tcp"
       - "10000-10200:10000-10200/udp"
   ```
2. En `pjsip.conf`, es indispensable definir `local_net = 172.18.0.0/16` (la subred de Docker) y `external_media_address = ${PUBLIC_IP}` para que Asterisk reescriba los encabezados SDP hacia la IP pública externa del VPS.

---

## 5. Puesta en Marcha

### En Desarrollo Local:
```bash
# Las variables opcionales se toman con defaults seguros
docker compose up -d postgres redis asterisk
```

### En Producción VPS:
```bash
# Ejecutar script idempotente de aprovisionamiento
sudo bash infra/scripts/bootstrap-vps.sh

# Levantar la flota completa
docker compose up -d --build
```
