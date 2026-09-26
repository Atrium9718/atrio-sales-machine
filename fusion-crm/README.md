# Plataforma Omnicanal CRM

Plataforma CRM avanzada para la gestión omnicanal de interacciones con clientes.

## Arquitectura

Esta plataforma está construida utilizando una arquitectura full-stack basada en Node.js, Express, React, Vite, y Prisma ORM.

### Tecnologías Principales:

*   **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, y React Router para navegación SPAs.
*   **Backend**: Express.js y Node.js.
*   **Base de Datos**: PostgreSQL, con Prisma como ORM para esquematización y tipado fuerte (TypeScript).
*   **Integraciones IA**: Google Gemini 1.5 (Pro/Flash) utilizando `@google/genai` para triage automático, análisis de intención, resúmenes y extracción de cotizaciones estructuradas.
*   **Integraciones Omnicanal**: Soporta WhatsApp Business API, Facebook Messenger, Instagram Direct, y un widget de WebChat en tiempo real, procesado a través de webhooks seguros.
*   **Monitoreo y Telemetría**: Sentry (Captura de errores y excepciones), OpenTelemetry (Trazabilidad distribuida) y Pino (Logging estructurado).
*   **Pruebas End-to-End**: Playwright y Testcontainers.

## Funcionalidades Principales

1.  **Bandeja de Entrada Unificada (Inbox)**: Interfaz unificada donde los agentes pueden gestionar simultáneamente conversaciones de distintos canales. Soporta asignaciones, etiquetado y colisiones (evitando que dos agentes respondan al tiempo).
2.  **Motor de Reglas y Enrutamiento**: Distribuye cargas mediante estrategias de Round Robin y adherencia al cliente (`STICKY_LAST_AGENT`).
3.  **SLA y Tiempos de Respuesta**: Evaluador inteligente de niveles de servicio de atención, descontando de manera nativa festividades locales y horarios no operativos (`BusinessHours`).
4.  **Cotizador Asistido por IA**: Los agentes pueden redactar de manera natural las solicitudes de los clientes y Gemini se encarga de convertir la prosa en un formato estructurado (JSON) que mapea el catálogo local y estima costos en línea.
5.  **Control Financiero (CAC y ROI)**: Panel interactivo (`/costos-omnicanal`) donde se proyectan y supervisan en línea las varianzas operativas y comparaciones del costo humano vs el costo de procesamiento por bots IA.
6.  **Gobierno de Datos y Habeas Data**: Perfilamiento de la base de datos que restringe operaciones comerciales basado en los atributos de consentimiento ("Marketing" y "Transaccional").

## Estructura del Repositorio

*   `/apps/web/`: Aplicación frontend en React.
*   `/packages/core/`: Lógica de dominio compartido, servicios (SLA, Routing), eventos, e interacciones nativas con IA.
*   `/packages/db/`: Esquemas de base de datos (`prisma/schema/*.prisma`) y migraciones.
*   `/server.ts`: Punto de entrada unificado y ruteador HTTP de APIs webhooks y WebSockets.
*   `/docs/`: Manuales de usuario, operaciones e incidentes.

## Construcción y Despliegue

Las dependencias entre paquetes usan el protocolo `workspace:*`, que **npm no soporta**: el gestor de paquetes es [Bun](https://bun.sh) (`bun.lock`).

```bash
# 1. Configuración de Firebase (no se versiona)
cp firebase-applet-config.example.json firebase-applet-config.json   # y completar
cp .env.example .env                                                 # y completar

# 2. Instalar dependencias (postinstall ejecuta `prisma generate`)
bun install

# 3. Verificaciones
bun run lint        # tsc --noEmit
npx vitest run      # pruebas unitarias

# 4. Construir (cliente Vite + servidor esbuild en dist/) y levantar
bun run build
bun run start       # node dist/server.cjs en el puerto 3000
```

### Integración continua

`.github/workflows/fusion-crm-ci.yml` se ejecuta en cada pull request y en cada push a `main` que toque `fusion-crm/`: instala con Bun, verifica tipos (`tsc`), corre las pruebas (`vitest`), compila y construye la imagen Docker. Conviene exigirlo en GitHub (*Settings → Branches → Branch protection → Require status checks*) para que nada entre a `main` con errores.

### Autenticación

- Los colaboradores ingresan con **Google**. El correo de la cuenta debe coincidir con el de un empleado **activo** (Administración → Usuarios).
- El servidor cambia el login por una cookie de sesión `httpOnly` (5 días) y toma de ahí la identidad de cada petición. Los headers `x-user-*` que envíe el navegador se ignoran.
- Toda la API exige sesión salvo `/api/health`, `/api/webhooks/meta` y `/api/widget`. `/api/ops` e `/api/interventoria` son solo para administradores, igual que las escrituras en `/api/admin` y `/api/settings`.
- Un administrador puede simular a otro colaborador desde el selector de usuario; la simulación se guarda en el servidor.
- El navegador no accede a Firestore. El servidor se autentica con un token propio (claim `fusion_server`) y `firestore.rules` solo permite ese acceso.

Puesta en marcha:

1. En Google Cloud, crear una cuenta de servicio del proyecto Firebase con el rol **Service Account Token Creator** (además de acceso a Firestore) y descargar su clave JSON en `secrets/firebase-service-account.json`.
2. Definir `GOOGLE_APPLICATION_CREDENTIALS` con esa ruta (ya viene en `docker-compose.yml`).
3. En Firebase Authentication, habilitar el proveedor **Google** y agregar el dominio de la app (p. ej. `app.fusioncg.com`) a los dominios autorizados.
4. Desplegar las reglas: `firebase deploy --only firestore:rules`, o pegar `firestore.rules` en la consola de Firebase.

### Datos de negocio en el navegador

Cotizaciones, proyectos (OT), inventario y órdenes por demanda se guardan **en el servidor** (Firestore). Las cotizaciones usan `/api/quotes`; el resto, `/api/data/:colección`. En el navegador solo hay una caché en memoria (`src/lib/serverCollection.ts`) que se carga al iniciar sesión y se pierde al recargar.

Si un navegador tenía datos de la versión anterior en `localStorage` (`fusion_quotes`, `fusion_projects`, `fusion_inventory`, `fusion_print_orders`, `fusion_deleted_project_ids`), en su primer inicio de sesión sube los que falten en el servidor y borra esas claves. `localStorage` queda solo para preferencias de interfaz (filtros, dispositivos de audio, paneles colapsados).

### Portal del cliente

- El equipo genera un **enlace privado por cliente** en *Comercial y CRM → Portal de clientes* y se lo envía (hay botón para copiar y para WhatsApp). El cliente no necesita cuenta.
- En `/portal/<token>` el cliente ve sus pedidos con **barra de progreso** y las etapas de producción (revisión, programado, en producción, acabados, listo, entregado), sin costos ni notas internas. También puede **enviar nuevas solicitudes** con hasta 3 archivos (PDF, AI, EPS, PNG, JPG, WEBP o TIFF; 10 MB cada uno) y ver las respuestas.
- Qué pedidos ve: los de cotizaciones con el mismo NIT del enlace o, si no hay NIT, los que coinciden exactamente con el nombre del cliente.
- Seguridad: el token (192 bits) solo se guarda como hash SHA-256; los enlaces se pueden revocar; el formulario admite 10 solicitudes por hora por enlace.
- Las solicitudes llegan a la misma página interna, donde se descargan sus adjuntos, se les cambia el estado (nueva, en revisión, cotizada, cerrada) y se responde al cliente.
- Cuando entra una solicitud, el equipo conectado recibe un **aviso emergente** en tiempo real y el menú muestra el número de solicitudes nuevas.
- Los adjuntos se guardan en Firebase Storage (`client-requests/…`): la cuenta de servicio necesita el rol **Storage Object Admin** sobre el bucket de `storageBucket`. El tipo de cada archivo se valida por su contenido, no por la extensión.

### Base de datos: migración a Postgres (fase 1)

Clientes, cotizaciones (con sus ítems) y proyectos de producción pueden vivir en **Postgres**. Los elige la variable `DATA_BACKEND` (`firestore` por defecto, o `postgres`). Todo lo demás sigue en Firestore por ahora: empleados, chat, anuncios, portal y solicitudes, corridas del cotizador, configuración, etc.

- **Esquema:** `packages/db/prisma/schema`. Migraciones en `schema/migrations`; se aplican con `bun run db:migrate`. El contenedor las aplica solo al arrancar con `DATA_BACKEND=postgres`.
- **Qué se guarda dónde:** los datos clave van en columnas relacionales (cliente, NIT, responsable, número, estado, fechas, totales, ítems, etapa y costos), listas para reportes. El documento completo que usa la app se conserva en `appData`.
- **Qué queda para la fase 2:** tareas, tiempos y aprobaciones de los proyectos siguen dentro de `appData`. Pasarán a sus propias tablas junto con la migración de empleados.

**Paso a paso (en un momento sin actividad):**

1. En `.env`: `DB_PASSWORD=<contraseña segura>` y `DATABASE_URL=postgresql://postgres:<contraseña>@localhost:5432/fusion_crm?schema=public`. Levantar la base: `docker compose up -d postgres`.
2. Crear las tablas: `bun run db:migrate`.
3. Simular: `bun run db:migrate-data -- --dry-run` (cuenta lo que hay en Firestore).
4. Copiar: `bun run db:migrate-data`. Es idempotente y al final compara origen y destino. Si hay errores o diferencias, los lista y termina con código 1.
5. Activar: `DATA_BACKEND=postgres` en `.env` y `docker compose up -d --build app`.
6. Si hubo cambios en Firestore entre el paso 4 y el 5, repetir el paso 4 justo antes de activar.

**Volver atrás:** `DATA_BACKEND=firestore` y reiniciar la app. Lo que se haya creado o editado mientras se usaba Postgres no está en Firestore.

### Docker / VPS

`firebase-applet-config.json` debe existir en el directorio antes de construir la imagen (el frontend lo importa en tiempo de compilación).

```bash
docker compose up -d --build
```

El `Dockerfile` construye con Bun y ejecuta sobre `node:22-bookworm-slim`, con healthcheck en `/api/health`.
