# atrio-sales-machine

Este repositorio contiene la tienda **Fusión W2P** (`tienda-fusion/`): React + NestJS + PostgreSQL (Neon). Se publica en **Hostinger Business como "Node.js web app"**. La guía completa está en `tienda-fusion/DESPLIEGUE_HOSTINGER.md`.

## Operar Hostinger (agente de despliegue)

Las sesiones de Claude Code tienen acceso a la API de Hostinger mediante el MCP oficial `@hostinger/mcp` (`.mcp.json`, servidor `hostinger`, solo herramientas de *hosting*). El token se lee de la variable de entorno `HOSTINGER_API_TOKEN`, configurada en el entorno de la sesión. Nunca se escribe en archivos ni se pide en el chat.

El servidor expone tres herramientas: `search` (busca una operación por palabra clave), `execute` (ejecuta una operación) y `multi-execute` (hasta 20 operaciones en orden). Las operaciones que se mencionan abajo (`hosting_…`) se localizan con `search` y se ejecutan con `execute`.

### Desplegar la tienda

1. Validar antes de subir, en `tienda-fusion/`: `npm ci && npx tsc --noEmit && npm run build`.
2. Empaquetar con `tienda-fusion/scripts/hostinger-archive.sh`. Usa `git archive`, así que solo sube lo que está commiteado (sin `node_modules`, `dist` ni `.env`). Límite: 50 MB.
3. Desplegar con la herramienta `hosting_deploy-js-application`. La autodetección de Hostinger elige mal la versión de Node y el archivo de arranque. Si la build usa otros valores, relanzarla con `hosting_nodejs_start-build` (y guardarlos con `hosting_nodejs_update-build-settings`):
   - `node_version`: **22** (obligatorio: `firebase-admin` exige Node 22)
   - `app_type`: `nest`
   - `build_script`: `build`
   - `output_directory`: `dist`
   - `entry_file`: `server.cjs` (es relativo a `output_directory`)
   - Usuario de hosting: `u442727583`.
   - **Sitio en línea:** `tienda-fusioncg-com-289706.hostingersite.com`, la dirección temporal que usan los clientes. Hostinger renombró ese sitio por su cuenta.
   - Existe un segundo sitio llamado `tienda.fusioncg.com`, que aún no es accesible: el DNS de fusioncg.com está en Cloudflare, en una cuenta a la que el usuario no tiene acceso. Hasta resolver el DNS, **desplegar siempre en el sitio en línea** y confirmar con `/api/health` que el `uptime` se reinició.
   - Hostinger a veces tarda en responder (HTTP 503 "no healthy upstream"). En ese caso, reintentar la consulta. No se debe reenviar la escritura.
4. Revisar los logs de build (`hosting_show-js-deployment-logs`).
5. Comprobar `https://<dominio>/api/health` → `{"status":"ok"}`.

Las variables de entorno de la app (`DATABASE_URL`, llaves de Wompi y Bold, `ADMIN_EMAILS`, etc.) se gestionan con `hosting_nodejs_list-environment-variables` y `hosting_nodejs_replace-environment-variables`. **`replace` sustituye la lista completa:** primero hay que leer la lista actual y enviarla entera con los cambios. Nunca se muestran los valores secretos en el chat.

### Reglas de seguridad

- **Pedir confirmación explícita al usuario** antes de cualquier acción destructiva o irreversible: borrar sitios, bases de datos, subdominios, cron jobs o archivos; cambiar el dominio de un sitio; o reemplazar variables de entorno de producción.
- No tocar facturación ni comprar dominios: este agente solo carga las herramientas de hosting.
- No desplegar a producción código que no compile o cuyas pruebas fallen.
- Si un despliegue falla, leer los logs y corregir. No reintentar a ciegas.

## Desarrollo

- `tienda-fusion/`: `npm run dev` (puerto 3000; necesita `DATABASE_URL`).
- Migraciones: después de cambiar `src/db/schema.ts`, ejecutar `npm run db:generate`. El servidor aplica las migraciones al arrancar.
- Los precios siempre se calculan en el servidor (`CheckoutService.quoteCart`). Nunca confiar en precios enviados por el navegador.
