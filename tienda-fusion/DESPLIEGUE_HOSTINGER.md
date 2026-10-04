# Despliegue en Hostinger (Hosting web Business)

Arquitectura de producción:

```
Navegador ──► Hostinger Business (Node.js 22: React + NestJS en un solo proceso)
                    │
                    ├──► Neon (PostgreSQL gestionado, SSL)
                    ├──► Firebase Auth (inicio de sesión con Google)
                    └──► Wompi / Bold (pagos, con webhooks firmados)
```

Hostinger no ofrece PostgreSQL en hosting web, por eso la base de datos va en **Neon** (plan gratuito suficiente para empezar).

---

## 1. Crear la base de datos en Neon

1. Entra a <https://neon.tech> → **New project** → región **AWS us-east** (la más cercana a Colombia con buena latencia).
2. Nombre de base de datos: `fusion`.
3. En **Connection details** copia la *connection string* (incluye `?sslmode=require`). Esa es tu `DATABASE_URL`.

Las tablas se crean solas: al arrancar, el servidor aplica las migraciones de `drizzle/` (`AUTO_MIGRATE=true`).

## 2. Crear tu proyecto Firebase (inicio de sesión)

El archivo `firebase-applet-config.json` apunta a un proyecto que creó Google AI Studio. Crea uno propio:

1. <https://console.firebase.google.com> → **Agregar proyecto**.
2. **Authentication → Método de inicio de sesión → Google → Habilitar**.
3. **Authentication → Configuración → Dominios autorizados** → agrega `tudominio.com` y `www.tudominio.com`.
4. **Configuración del proyecto → Tus apps → Web (`</>`)** → copia los valores en `firebase-applet-config.json`
   (`projectId`, `appId`, `apiKey`, `authDomain`, `storageBucket`, `messagingSenderId`).

> Estos valores son públicos por diseño (van al navegador); no son secretos.

## 3. Crear la aplicación Node.js en Hostinger

hPanel → **Sitios web → Agregar sitio web → Aplicación web Node.js**.

Puedes desplegar de dos formas:

- **Desde GitHub:** conecta el repositorio `atrio-sales-machine` y la rama, e indica `tienda-fusion` como directorio raíz de la aplicación. Si el asistente de Hostinger no permite elegir una subcarpeta, usa la opción .zip o mueve la tienda a un repositorio propio.
- **Subiendo un .zip:** comprime el **contenido** de la carpeta `tienda-fusion/` (sin `node_modules` ni `dist`) y súbelo.

Configuración de compilación:

| Campo | Valor |
|---|---|
| Versión de Node.js | **22.x** |
| Comando de instalación | `npm ci` |
| Comando de compilación | `npm run build` |
| Archivo de entrada / inicio | `dist/server.cjs` (o comando `npm start`) |

El servidor lee el puerto de `PORT`, que asigna Hostinger, y se pone en modo producción solo.

## 4. Variables de entorno

En la configuración de la app Node.js → **Variables de entorno**, agrega como mínimo:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La connection string de Neon |
| `APP_URL` | `https://tudominio.com` |
| `ADMIN_EMAILS` | `andresepulveda718@gmail.com` (puedes poner varios separados por coma) |
| `GEMINI_API_KEY` | Tu llave de Google AI Studio (opcional) |
| `WOMPI_MODE` | `sandbox` mientras pruebas, `production` al salir en vivo |
| `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Del panel de comercios de Wompi |
| `BOLD_MODE`, `BOLD_API_KEY`, `BOLD_SECRET_KEY`, `BOLD_INTEGRITY_KEY` | Del panel de Bold |

La lista completa está en `.env.example`. Después de cambiar variables, **reinicia** la aplicación.

## 5. Cargar el catálogo de ejemplo (una sola vez)

Desde tu computador, con Node.js 20+ instalado:

```bash
cd tienda-fusion
npm ci
cp .env.example .env      # y pega tu DATABASE_URL de Neon
npm run db:migrate        # crea las tablas (opcional: el servidor también lo hace al arrancar)
npm run db:seed           # 7 productos, 6 categorías, banners y plantillas
```

El seeder se niega a correr si ya hay productos (para no borrar tu catálogo real). Para recargar a la fuerza: `npm run db:seed -- --force`.

## 6. Webhooks de pago (obligatorio para confirmar pagos)

Los pagos **solo** se marcan como pagados si la pasarela lo confirma con firma válida y el monto coincide con el pedido.

- **Wompi** → Panel de comercios → *Desarrolladores* → URL de eventos:
  `https://tudominio.com/api/checkout/webhook/wompi`
- **Bold** → Panel → *Integraciones / Webhooks*:
  `https://tudominio.com/api/checkout/webhook/bold`

Si una pasarela aprueba un monto distinto al del pedido, este queda en estado `AMOUNT_MISMATCH` para revisión manual.

Los pedidos con **crédito B2B** quedan en `CREDIT_PENDING_REVIEW`; un administrador debe aprobarlos antes de pasar a producción.

## 7. Dominio y SSL

hPanel → **Dominios** → apunta el dominio a la app Node.js y activa el **SSL gratuito**. No hace falta Nginx: Hostinger hace de proxy.

## 8. Verificación

- `https://tudominio.com/api/health` → `{"status":"ok"}`
- Inicia sesión con Google usando un correo de `ADMIN_EMAILS` y entra a `/admin`.
- Haz un pedido de prueba con Wompi en modo sandbox y revisa que pase a **PAGADO / EN PRODUCCIÓN**.

---

## Limitaciones conocidas (próxima fase)

- **Configuración guardada en archivos** (`gateways.config.json`, `shipping.config.json`, `users-management.config.json`): se pierde al redesplegar. Mientras tanto, pon las llaves de pago en variables de entorno, que son la fuente por defecto.
- **Biblioteca de medios en memoria:** lo que subas ahí se pierde al reiniciar.
- **Precios calculados en el navegador:** el backend acepta el total que envía el carrito. Hay que revisar los totales de los pedidos antes de producir hasta que se recalculen en el servidor.
- **Datos bancarios de ejemplo:** cambia la cuenta de transferencia en *Admin → Configuración → Pasarelas* antes de abrir la tienda.
