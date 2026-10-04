# Guía Completa de Instalación, Configuración y Despliegue
## Fusión Comunicación Gráfica - Sistema Web-to-Print (W2P) v2.0

Esta guía técnica explica paso a paso cómo desempaquetar, configurar y desplegar la plataforma completa en entornos de desarrollo local y servidores de producción.

---

## 📑 Tabla de Contenidos
1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Descompresión del Archivo .ZIP](#2-descompresión-del-archivo-zip)
3. [Instalación de Dependencias](#3-instalación-de-dependencias)
4. [Configuración de Base de Datos PostgreSQL](#4-configuración-de-base-de-datos-postgresql)
5. [Variables de Entorno (.env)](#5-variables-de-entorno-env)
6. [Migraciones y Datos Iniciales (Seeder)](#6-migraciones-y-datos-iniciales-seeder)
7. [Ejecución en Desarrollo](#7-ejecución-en-desarrollo)
8. [Compilación y Puesta en Producción](#8-compilación-y-puesta-en-producción)
9. [Despliegue con Docker Compose (Recomendado)](#9-despliegue-con-docker-compose-recomendado)
10. [Configuración de Nginx como Reverse Proxy](#10-configuración-de-nginx-como-reverse-proxy)
11. [Solución de Problemas Comunes](#11-solución-de-problemas-comunes)

---

## 1. Requisitos del Sistema

- **Sistema Operativo:** Linux (Ubuntu 22.04 LTS / Debian 12 recomendado), macOS o Windows 11 con WSL2.
- **Node.js:** Versión 20.x o 22.x LTS (descargar desde [nodejs.org](https://nodejs.org/)).
- **Gestor de Paquetes:** `npm` (versión 10 o superior incluida con Node.js).
- **Base de Datos:** PostgreSQL versión 15 o 16.
- **Memoria RAM mínima:** 2 GB (4 GB recomendados para procesos de generación de PDF en alta resolución).

---

## 2. Descompresión del Archivo .ZIP

Descomprime el archivo `.zip` en la carpeta donde residirá el proyecto:

```bash
# En Linux / macOS:
unzip fusion-grafica-w2p-v2.0.zip -d fusion-w2p
cd fusion-w2p

# En Windows:
# Clic derecho -> "Extraer todo..." en la carpeta deseada y abrir en PowerShell o VS Code.
```

---

## 3. Instalación de Dependencias

Ejecuta el siguiente comando en la raíz del proyecto para descargar todas las librerías necesarias:

```bash
npm install
```

> **Nota:** La instalación incluye todas las librerías del cliente (React 19, Fabric.js 5.3, Tailwind v4, Lucide Icons, jsPDF) y del backend (NestJS, Drizzle ORM, Express, pg).

---

## 4. Configuración de Base de Datos PostgreSQL

Puedes utilizar una base de datos PostgreSQL local instalada en tu sistema o un servicio en la nube (como Supabase, Neon, AWS RDS, DigitalOcean Managed Database, etc.).

### Crear base de datos localmente:
```sql
-- Conéctate a postgres en tu terminal:
psql -U postgres

-- Ejecuta los siguientes comandos:
CREATE DATABASE fusion_w2p_db;
CREATE USER fusion_user WITH ENCRYPTED PASSWORD 'TuPasswordSeguro123';
GRANT ALL PRIVILEGES ON DATABASE fusion_w2p_db TO fusion_user;
\q
```

---

## 5. Variables de Entorno (.env)

Copia el archivo `.env.example` para generar tu archivo `.env` de producción o desarrollo:

```bash
cp .env.example .env
```

Edita el archivo `.env` con los valores correspondientes:

```env
# Conexión PostgreSQL
DATABASE_URL="postgresql://fusion_user:TuPasswordSeguro123@localhost:5432/fusion_w2p_db"
SQL_HOST="localhost"
SQL_PORT=5432
SQL_USER="fusion_user"
SQL_PASSWORD="TuPasswordSeguro123"
SQL_DB_NAME="fusion_w2p_db"

# Clave secreta para JWT de autenticación
JWT_SECRET="fusion_w2p_jwt_secret_manizales_2026"

# Inteligencia Artificial (Opcional - Gemini Studio)
GEMINI_API_KEY="AIzaSy..."

# Pasarelas de Pago Colombia (Wompi Sandbox / Producción)
WOMPI_PUBLIC_KEY="pub_test_..."
WOMPI_PRIVATE_KEY="prv_test_..."
WOMPI_INTEGRITY_SECRET="test_integrity_..."
WOMPI_EVENTS_SECRET="test_events_..."

# Pasarela Bold Colombia
BOLD_API_KEY=""
BOLD_SECRET_KEY=""
BOLD_INTEGRITY_KEY=""
```

---

## 6. Migraciones y Datos Iniciales (Seeder)

Aplica el esquema relacional en PostgreSQL y carga el catálogo predeterminado de imprenta (Papelería comercial, volantes, pendones, empaques, reglas de volumen y plantillas):

```bash
# 1. Empujar el esquema Drizzle a PostgreSQL:
npx drizzle-kit push --config src/db/drizzle.config.ts

# 2. Ejecutar el seeder con los productos litográficos:
npx tsx src/db/seed.ts
```

Verás una salida de confirmación:
`✅ Seed finished successfully! 7 Products, 6 Categories, 5 Attributes, 20+ Values, 3 Banners and 7 Design Templates created.`

---

## 7. Ejecución en Desarrollo

Para iniciar el entorno de desarrollo integrado con recarga rápida:

```bash
npm run dev
```

El servidor unificado (NestJS en backend + Vite en frontend) arrancará en:
👉 **http://localhost:3000**

---

## 8. Compilación y Puesta en Producción

Para compilar la aplicación para producción:

```bash
# 1. Compilar el cliente estático y empaquetar el servidor con esbuild
npm run build

# 2. Iniciar el servicio en modo producción
npm run start
```

### Mantener el proceso en segundo plano con PM2:
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la aplicación
pm2 start dist/server.cjs --name "fusion-w2p"

# Configurar reinicio automático ante reinicios del sistema
pm2 startup
pm2 save
```

---

## 9. Despliegue con Docker Compose (Recomendado)

Si cuentas con Docker y Docker Compose instalados, puedes desplegar la solución completa sin instalar Node.js ni PostgreSQL en el host:

```bash
# Construir las imágenes y levantar contenedores en segundo plano
docker compose up -d --build
```

Esto levantará:
- **`fusion-postgres`**: Servidor PostgreSQL 16 con volumen persistente `postgres_data`.
- **`fusion-w2p-app`**: Contenedor con la aplicación compilada en Node 20 Alpine en el puerto `3000`.

Para revisar logs en vivo:
```bash
docker compose logs -f w2p-app
```

---

## 10. Configuración de Nginx como Reverse Proxy

Para vincular un dominio personalizado (ej. `imprentafusion.com`) y habilitar SSL (HTTPS):

```nginx
server {
    server_name imprentafusion.com www.imprentafusion.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Luego instala el certificado gratuito de Let's Encrypt:
```bash
sudo certbot --nginx -d imprentafusion.com -d www.imprentafusion.com
```

---

## 11. Solución de Problemas Comunes

### Error: `ECONNREFUSED 127.0.0.1:5432`
- Verifica que el servicio de PostgreSQL esté activo:
  - En Linux: `sudo systemctl status postgresql`
  - En Docker: `docker ps`
- Revisa que las credenciales en el archivo `.env` coincidan con tu base de datos.

### Límite de tamaño de subida de archivos (PDFs / Diseños)
- El servidor Express ya está configurado con un límite de `50mb`:
  `expressApp.use(express.json({ limit: '50mb' }));`
- Si utilizas Nginx, asegúrate de haber configurado `client_max_body_size 50M;`.

---
© 2026 **Fusión Comunicación Gráfica** - Manizales, Caldas, Colombia.
