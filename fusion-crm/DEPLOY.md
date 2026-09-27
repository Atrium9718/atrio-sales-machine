# Despliegue en un VPS (paso a paso)

Esta guía pone Fusion CRM en marcha en un VPS con Ubuntu (Contabo, Hostinger u otro) usando
`docker-compose.minimal.yml`, que incluye:

| Servicio   | Para qué sirve                                                      |
|------------|---------------------------------------------------------------------|
| `traefik`  | Recibe las visitas y saca el certificado HTTPS automáticamente      |
| `app`      | El sistema (web + API)                                              |
| `postgres` | Base de datos                                                       |
| `backup`   | Copia de seguridad diaria de la base de datos                       |

La telefonía (Asterisk), las videollamadas (LiveKit/Coturn) y MinIO no se incluyen; se agregan
después con `docker-compose.yml` completo.

**Tamaño recomendado:** 4 núcleos, 8 GB de RAM, 80 GB de disco o más (p. ej. Contabo Cloud VPS
Plus 4 o Hostinger KVM 2). Sistema: **Ubuntu 24.04 LTS** (o 26.04 LTS).

---

## 1. Apuntar el dominio

En el panel donde compraste el dominio, crea un registro **A**:

| Tipo | Nombre | Valor           |
|------|--------|-----------------|
| A    | `app`  | IP pública del VPS |

Así el sistema quedará en `https://app.tudominio.com`. El cambio puede tardar de minutos a unas horas.

## 2. Preparar el VPS

Entra al VPS (terminal del panel del proveedor o `ssh root@IP`) y ejecuta:

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Cortafuegos: solo SSH y web
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

# Código
git clone https://github.com/Atrium9718/atrio-sales-machine.git
cd atrio-sales-machine/fusion-crm
```

> **Opcional — que Claude trabaje directamente en el VPS:** instala Claude Code
> (`curl -fsSL https://claude.ai/install.sh | bash`), entra a esta carpeta y ejecuta
> `claude remote-control`. La sesión aparece en la app de Claude Code y desde ahí se pueden
> hacer los pasos siguientes sin compartir contraseñas.

## 3. Configuración de Firebase

1. **Configuración web** — En la consola de Firebase → ⚙️ Configuración del proyecto → General →
   "Tus apps" → app web, copia los valores en el archivo:
   ```bash
   cp firebase-applet-config.example.json firebase-applet-config.json
   nano firebase-applet-config.json
   ```
2. **Cuenta de servicio** — Configuración del proyecto → Cuentas de servicio → *Generar nueva
   clave privada*. Sube el JSON al VPS como `secrets/firebase-service-account.json`:
   ```bash
   mkdir -p secrets && nano secrets/firebase-service-account.json   # pegar el contenido
   chmod 600 secrets/firebase-service-account.json
   ```
   En Google Cloud → IAM, dale a esa cuenta los roles **Service Account Token Creator** y
   **Storage Object Admin** (adjuntos del portal de clientes).
3. **Login con Google** — Firebase → Authentication → Método de acceso: habilita **Google**.
   En *Configuración → Dominios autorizados* agrega tu dominio (`app.tudominio.com`).
4. **Reglas** — Después de arrancar el servidor (paso 5), pega `firestore.rules` en
   Firestore → Reglas y publica.

## 4. Variables (`.env`)

```bash
cp .env.example .env
nano .env
```

Mínimo obligatorio:

```ini
DOMAIN=app.tudominio.com
ACME_EMAIL=sistemas@tudominio.com
DB_PASSWORD=          # genera una con: openssl rand -base64 24
GEMINI_API_KEY=       # para las funciones de IA
```

Revisa que todo esté bien:

```bash
./scripts/check-deploy.sh
```

El script avisa qué falta (archivos, variables, si el dominio ya apunta al VPS, puertos ocupados).

## 5. Arrancar

```bash
docker compose -f docker-compose.minimal.yml up -d --build
```

La primera vez tarda varios minutos (construye la app). Luego:

```bash
docker compose -f docker-compose.minimal.yml ps          # todo debe decir "running"/"healthy"
docker compose -f docker-compose.minimal.yml logs -f app # ver la app (Ctrl+C para salir)
```

Abre `https://app.tudominio.com`. El certificado HTTPS se emite solo en el primer acceso
(si falla, revisa que el dominio apunte al VPS y que los puertos 80/443 estén abiertos).

Las tablas de la base de datos se crean solas al arrancar la app.

## 6. Respaldos

El servicio `backup` hace un respaldo **al arrancar** y luego **todos los días a las 2:00 a. m.**
(hora de Colombia), y guarda los últimos **14 días**. Se ajusta en `.env` con `BACKUP_HOUR` y
`BACKUP_KEEP_DAYS`.

```bash
./scripts/restore-db.sh                      # lista los respaldos
docker compose -f docker-compose.minimal.yml logs backup   # ver cuándo se hizo el último
```

También se ve en la aplicación: **Administración → Respaldos** muestra el último respaldo, si la
copia externa funcionó y permite descargar cada archivo (solo administradores). Avisa en rojo si
el último respaldo falló o tiene más de un día.

**Copia fuera del VPS (muy recomendado).** Si el VPS se pierde, los respaldos locales se pierden
con él. El servicio puede subir cada respaldo a Google Drive, Backblaze B2, Contabo Object
Storage, etc. con [rclone](https://rclone.org):

```bash
mkdir -p secrets/rclone
docker run --rm -it -v "$PWD/secrets/rclone:/config/rclone" rclone/rclone config
# crea un "remote" (p. ej. llamado gdrive, tipo "drive"); para Google Drive en un servidor
# sin navegador, responde "n" a "Use auto config?" y sigue las instrucciones de rclone.
```

Luego en `.env`:

```ini
BACKUP_RCLONE_REMOTE=gdrive:fusion-respaldos
```

y reinicia el servicio: `docker compose -f docker-compose.minimal.yml up -d backup`.

**Restaurar** (reemplaza la base de datos actual; pide confirmación):

```bash
./scripts/restore-db.sh fusion-fusion_crm-AAAAMMDD-HHMMSS.dump
```

> Mientras `DATA_BACKEND=firestore`, clientes, cotizaciones y proyectos viven en Firestore
> (Google los respalda). Al pasar a `DATA_BACKEND=postgres` (ver README, "migración a
> Postgres"), estos respaldos cubren esos datos.

## 7. Actualizar a una nueva versión

```bash
cd atrio-sales-machine/fusion-crm
git pull
docker compose -f docker-compose.minimal.yml up -d --build
```

Las migraciones de la base de datos se aplican solas al arrancar.

## 8. Canales: WhatsApp, Instagram, Messenger y chat web

La **Bandeja de entrada** (menú Comunicaciones) reúne todos los canales. La IA atiende y el equipo
solo ve lo que necesita a una persona. Antes de conectar clientes reales, prueba en la pestaña
**Simulador** (usa tus datos y la IA real, pero no envía nada).

### 8.1 Requisitos comunes
- `GEMINI_API_KEY` en `.env` (sin ella nadie responde automáticamente: todo pasa a personas).
- `APP_URL` la pone `docker-compose.minimal.yml` (`https://DOMAIN`); con ella la IA arma los
  enlaces del portal de avance.
- En **Bandeja → Configuración de la IA**: escribe lo que la IA debe saber (horarios, tiempos de
  entrega, pagos, envíos, formatos de archivo) y lo que nunca debe prometer.

### 8.2 Aplicación de Meta (una sola para los tres canales)
1. En [developers.facebook.com](https://developers.facebook.com) crea una app tipo **Empresa**
   ligada a tu portafolio comercial (Business Manager, idealmente verificado).
2. **Configuración → Básica**: copia la **Clave secreta de la app** en `META_APP_SECRET`.
3. Inventa un texto largo para `META_WEBHOOK_VERIFY_TOKEN` (p. ej. `openssl rand -hex 16`).
4. Reinicia la app: `docker compose -f docker-compose.minimal.yml up -d app`.

### 8.3 WhatsApp (Cloud API)
1. En la app agrega el producto **WhatsApp** y registra tu número (no puede estar a la vez en la
   app de WhatsApp Business del celular).
2. Copia el **Identificador del número de teléfono** en `WHATSAPP_PHONE_NUMBER_ID`.
3. Crea un token **permanente**: portafolio comercial → Usuarios del sistema → Agregar (rol
   administrador) → Generar token con permisos `whatsapp_business_messaging` y
   `whatsapp_business_management`. Cópialo en `WHATSAPP_ACCESS_TOKEN`.
4. **WhatsApp → Configuración → Webhook**: URL `https://app.tudominio.com/api/webhooks/meta`,
   token = `META_WEBHOOK_VERIFY_TOKEN`. Suscribe el campo **messages**.
5. Escríbele al número desde tu celular: la conversación debe aparecer en la Bandeja.

> WhatsApp solo permite responder con texto libre hasta **24 horas** después del último mensaje del
> cliente. Para escribirle primero (p. ej. avisos de cambio de etapa) se necesitan **plantillas
> aprobadas** por Meta; eso llega en la siguiente fase.

### 8.4 Messenger e Instagram
1. En la app agrega **Messenger** (y **Instagram** si la cuenta de Instagram profesional está
   conectada a tu página de Facebook).
2. Genera el **token de acceso de la página** y cópialo en `MESSENGER_PAGE_ACCESS_TOKEN`.
3. Configura el webhook con la misma URL y token del paso 8.3 y suscribe `messages` en la página
   (y en Instagram).
4. Para producción, Meta pide **revisión de la app** para los permisos `pages_messaging` e
   `instagram_manage_messages` (mientras tanto solo funciona con los administradores de la app).

### 8.5 Chat web en tu página
1. En `.env`: `WEBCHAT_PUBLIC_KEY` (cualquier texto) y en `WEBCHAT_ALLOWED_ORIGINS` el dominio
   exacto de tu sitio (p. ej. `https://www.tudominio.com`). Reinicia la app.
2. Pega esto antes de `</body>` en tu sitio web:
   ```html
   <script src="https://app.tudominio.com/widget/widget.js"
           data-key="TU_WEBCHAT_PUBLIC_KEY"
           data-api="https://app.tudominio.com" defer></script>
   ```

### 8.7 Avisos automáticos de cambio de etapa (plantilla de WhatsApp)
Cuando un pedido avanza en el tablero de producción, el cliente recibe un WhatsApp con la etapa y
el enlace para ver el avance. Se activan en **Bandeja → Configuración de la IA → Avisos
automáticos** (tú eliges las etapas; por defecto *En producción*, *Listo para entrega* y
*Entregado*). El historial queda en **Bandeja → Avisos**.

Si el cliente escribió en las últimas 24 h el aviso sale como mensaje normal; si no, WhatsApp exige
una **plantilla aprobada**. Crea una sola en *WhatsApp Manager → Plantillas de mensajes*:

| Campo | Valor |
|-------|-------|
| Nombre | `actualizacion_pedido` |
| Categoría | **Utilidad** (Utility) |
| Idioma | Español (`es`) |

**Cuerpo** (4 variables, en este orden):

```
Hola {{1}}, tu pedido {{2}} avanzó a la etapa: {{3}}. Puedes ver el avance aquí: {{4}} . Si tienes alguna pregunta, responde a este mensaje.
```

Ejemplos que pide Meta al enviarla: `Claudia`, `OT-1203`, `En producción`,
`https://app.tudominio.com/portal/abc123`.

- El sistema llena las variables: {{1}} nombre del contacto, {{2}} número del pedido, {{3}} etapa,
  {{4}} enlace del portal de avance.
- Si prefieres un texto distinto por etapa, crea más plantillas (mismas 4 variables, mismo orden)
  y pon su nombre en la etapa correspondiente.
- Solo se envían entre las horas configuradas (por defecto 7:30 a. m. a 7:30 p. m.); lo de la
  noche sale a primera hora. Cada pedido avisa una sola vez por etapa y los fallos se reintentan
  (3 intentos, y botón **Reintentar** en la pestaña Avisos).
- Si el cliente responde **STOP** o "no quiero recibir mensajes", deja de recibir avisos (con
  **REACTIVAR** vuelven). Son mensajes sobre un pedido que el cliente contrató; aun así, revisa
  que tu política de tratamiento de datos (habeas data) mencione los avisos por WhatsApp.
- El cliente debe tener un **celular** registrado (en su ficha o en la de uno de sus contactos).

### 8.6 Arranque recomendado
1. **Semana 1 — modo Sugerencia:** la IA escribe cada respuesta y alguien la aprueba o corrige
   con un clic. Así ves cómo responde con clientes reales.
2. **Cuando confíes — modo Automático por temas:** primero *Estado de pedidos*, luego *Saludos* y
   *Cotizaciones*. Los temas no marcados siguen como sugerencia.
3. Revisa a diario la pestaña **Necesitan persona** y el indicador **Resueltas por la IA**.

La IA pasa el caso a una persona (y le avisa al cliente) cuando el cliente lo pide, hay una queja
o un tema de pagos, no está segura, falla, o un mensaje no se pudo entregar. Solo comparte
información de pedidos con clientes verificados: por su número de WhatsApp registrado, o con NIT +
número de pedido.

## Problemas frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| El navegador dice "certificado no válido" | El dominio aún no apunta al VPS o el puerto 80 está cerrado |
| `secrets/firebase-service-account.json` es una carpeta | Se arrancó sin el archivo; bórrala (`rm -r`) y copia el JSON |
| No deja iniciar sesión con Google | Falta el dominio en *Dominios autorizados* de Firebase, o el correo no es de un empleado activo |
| La app se reinicia sola | `docker compose -f docker-compose.minimal.yml logs app` muestra el error |
