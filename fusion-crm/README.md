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

### Docker / VPS

`firebase-applet-config.json` debe existir en el directorio antes de construir la imagen (el frontend lo importa en tiempo de compilación).

```bash
docker compose up -d --build
```

El `Dockerfile` construye con Bun y ejecuta sobre `node:22-bookworm-slim`, con healthcheck en `/api/health`.
