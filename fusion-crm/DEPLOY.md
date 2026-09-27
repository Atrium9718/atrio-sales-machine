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

## 8. WhatsApp / Instagram / Messenger (cuando se activen)

En `.env` define `META_APP_SECRET` (panel de Meta → Configuración → Básica → *Clave secreta de
la app*) y un `META_WEBHOOK_VERIFY_TOKEN` inventado. En el panel de Meta, el webhook es
`https://app.tudominio.com/api/webhooks/meta` con ese mismo token. El servidor rechaza todo
evento que no venga firmado por Meta.

## Problemas frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| El navegador dice "certificado no válido" | El dominio aún no apunta al VPS o el puerto 80 está cerrado |
| `secrets/firebase-service-account.json` es una carpeta | Se arrancó sin el archivo; bórrala (`rm -r`) y copia el JSON |
| No deja iniciar sesión con Google | Falta el dominio en *Dominios autorizados* de Firebase, o el correo no es de un empleado activo |
| La app se reinicia sola | `docker compose -f docker-compose.minimal.yml logs app` muestra el error |
