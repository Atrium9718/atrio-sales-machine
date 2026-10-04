# Fusión Comunicación Gráfica - Plataforma Web-to-Print (W2P) v2.0

> **Plataforma E-Commerce B2B/B2C, CMS Integral, Editor Gráfico Vectorial Canvas y Sistema de Gestión Litográfica para Imprenta Comercial, Gran Formato y Empaques.**
> **Ubicación:** Manizales, Caldas, Colombia.

---

## 📋 Resumen Ejecutivo y Arquitectura

Esta solución de software implementa de extremo a extremo las especificaciones técnicas del Documento de Especificación de Requisitos de Software (**SRS 2.0**) de **Fusión Comunicación Gráfica**. Diseñado específicamente para el mercado gráfico colombiano y las particularidades de la industria litográfica / offset y digital.

### Stack Tecnológico Principal

- **Frontend:** React 19 / SPA sobre Vite (Arquitectura Next.js App Router compatible), Tailwind CSS v4, Lucide Icons, Motion, Canvas-Confetti.
- **Backend:** NestJS (TypeScript) con arquitectura modular, controladores REST, servicios y middleware de alto rendimiento en Express.
- **Base de Datos & ORM:** PostgreSQL con **Drizzle ORM**, esquemas fuertemente tipados, migraciones estructuradas y seeders relacionales.
- **Editor Gráfico Canvas:** **Fabric.js 5.3** con guías de sangrado (+2mm), líneas de corte y márgenes de seguridad (-3mm), exportación vectorial y generación de PDF/TIFF listos para CTP (Computer-to-Plate) a 300 DPI.
- **Motor de Precios Litográficos:** Algoritmo dinámico por pliegos, fórmulas de papel, tintas (4x0, 4x4), acabados (Plastificado Mate/Brillante, Reserva UV, Foil Metalizado) y escalas de descuento por volumen.
- **Inteligencia Artificial:** Asistente creativo Gemini AI integrado para redacción comercial automática, generación de banners, copys publicitarios e imágenes en alta resolución.
- **Integraciones:**
  - **Pasarelas de Pago:** Wompi (Bancolombia, QR, Nequi, PSE, Tarjetas), Bold, Mercado Pago y Stripe con verificación criptográfica de firmas webhooks.
  - **Facturación Electrónica:** Módulo de emisión directa Siigo y Alegra (DIAN Colombia).
  - **Logística & Envíos:** Matriz de despacho local urbana (Manizales, Villamaría, Chinchiná) con tarifa plana vs. envíos nacionales cotizados según peso volumétrico (gramaje papel x cantidad x formato).
  - **Almacenamiento Cloud:** Google Drive API & Cloudflare R2 / AWS S3 para artes finales en alta resolución.

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos Previos
- **Node.js** v20.x o superior.
- **npm** v10+.
- **PostgreSQL** v15+ (o Docker para levantarlo en un comando).

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo de ejemplo y edita tus credenciales:
```bash
cp .env.example .env
```
Configura la cadena de conexión a tu base de datos PostgreSQL:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/fusion_w2p_db"
SQL_HOST="localhost"
SQL_PORT=5432
SQL_USER="usuario"
SQL_PASSWORD="password"
SQL_DB_NAME="fusion_w2p_db"
```

### 4. Inicializar y Poblar la Base de Datos
Aplica las migraciones de Drizzle y ejecuta el semillero inicial (categorías, productos, atributos y plantillas):
```bash
# Sincronizar esquemas relacionales
npx drizzle-kit push --config src/db/drizzle.config.ts

# Ejecutar el seeder con datos completos de imprenta
npx tsx src/db/seed.ts
```

### 5. Iniciar Servidor de Desarrollo (NestJS + Vite)
```bash
npm run dev
```
La aplicación estará disponible de inmediato en:
👉 **http://localhost:3000**

---

## 🐳 Despliegue con Docker (1 Solo Paso)

Para ejecutar toda la plataforma (PostgreSQL + Backend NestJS + Frontend React) con Docker Compose:

```bash
docker compose up -d --build
```
- La base de datos PostgreSQL se configurará automáticamente con volúmenes persistentes.
- La aplicación se compilará en modo producción y se expondrá en el puerto `3000`.

Para detener los servicios:
```bash
docker compose down
```

---

## 📦 Estructura del Proyecto

```text
├── assets/                    # Identidad de marca, logos y recursos estáticos
├── drizzle/                   # Migraciones SQL generadas por Drizzle ORM
├── public/                    # Archivos públicos accesibles desde la raíz web
├── src/
│   ├── admin/                 # Panel de Control ("El Gestor Completo")
│   │   ├── banners/           # Gestor de Banners Hero, barras superiores y popups
│   │   ├── catalog/           # Constructor de Productos, Matriz de Atributos y Parámetros
│   │   ├── dashboard/         # Métricas en vivo, KPIs de ventas y estado de producción
│   │   ├── finance/           # Conciliación de pagos, Wompi/Bold y facturación Siigo
│   │   ├── imposition/        # Simulador de Pliegos CTP, Aprovechamiento y Work Orders
│   │   ├── marketing/         # Campañas omnicanal, audiencias, email marketing y cupones
│   │   ├── media/             # Biblioteca multimedia central con IA Studio WebP/AVIF
│   │   ├── orders/            # Kanban de Taller Litográfico, tickets de trabajo y Preflight
│   │   ├── seo/               # Configuración SEO, OpenGraph y Schema.org por página
│   │   ├── settings/          # CMS de bloques en vivo, B2B corporativo y reglas de precios
│   │   ├── templates/         # Diseñador y administrador de plantillas editables
│   │   └── Layout.tsx         # Barra de navegación administrativa y selector RBAC
│   ├── backend/               # Servidor NestJS (Controladores, Servicios y Módulos)
│   │   ├── admin-general/     # Endpoints de gestión de pedidos, banners, CMS y páginas
│   │   ├── admin-marketing/   # Automatizaciones, canales de marketing y audiencias
│   │   ├── ai/                # Integración Gemini AI para generación de imágenes y textos
│   │   ├── auth/              # Control de autenticación, JWT y guardias RBAC
│   │   ├── catalog/           # Catálogo público y endpoints administrativos de productos
│   │   ├── checkout/          # Carrito de compras, validación de inventario y pedidos
│   │   ├── invoicing/         # Módulos de facturación electrónica Siigo / Alegra
│   │   ├── media/             # Carga y almacenamiento en Cloudflare R2 / Google Drive
│   │   ├── pricing/           # Motor de cálculo matemático litográfico
│   │   ├── seo/               # Generador de metadatos dinámicos y sitemaps
│   │   ├── shipping/          # Calculador de fletes urbanos vs. nacionales por peso
│   │   └── users/             # Gestión de roles y permisos granulares (RBAC)
│   ├── contexts/              # Contextos React (AuthContext, CartContext, CmsContext)
│   ├── db/                    # Esquema relacional Drizzle, conexión Pool y Seeder
│   │   ├── schema.ts          # Definición completa de tablas PostgreSQL
│   │   ├── drizzle.config.ts  # Configuración de dialecto PostgreSQL y credenciales
│   │   └── seed.ts            # Semillero con 7 productos reales y reglas de imprenta
│   ├── lib/                   # Motores utilitarios (PDF Preflight, Envíos, B2B, Notificaciones)
│   ├── storefront/            # Tienda E-commerce B2B/B2C para el cliente final
│   │   ├── blocks/            # Bloques modulares del CMS (Hero, FAQs, Categorías, CTA, etc.)
│   │   ├── components/        # Simulador 3D de acabados, tarjetas de producto, cintillos
│   │   ├── editor/            # Editor Canvas W2P en Fabric.js, Preflight y Generador IA
│   │   ├── B2BPortalPage.tsx  # Portal corporativo B2B con tarifas de distribuidor
│   │   ├── CartPage.tsx       # Carrito con desglose de IVA y acabados seleccionados
│   │   ├── CheckoutPage.tsx   # Pasarelas Wompi / Bold con validación en tiempo real
│   │   ├── HomePage.tsx       # Página principal con renderizado dinámico de CMS
│   │   ├── OrderTrackingPage.tsx # Rastro de órdenes con estados de taller en vivo
│   │   └── ProductPage.tsx    # Cotizador interactivo con cálculo instantáneo
│   ├── App.tsx                # Enrutador principal de la aplicación
│   ├── main.tsx               # Punto de entrada de React
│   └── index.css              # Reglas globales de Tailwind CSS
├── server.ts                  # Servidor híbrido Express + NestJS + Vite middleware
├── package.json               # Dependencias del ecosistema Node.js
└── tsconfig.json              # Configuración de compilación TypeScript
```

---

## 🎨 Características Clave del Sistema

### 1. Editor Online Web-to-Print (W2P)
- **Superficie de Trabajo con Guías Técnicas:**
  - Línea de Sangrado exterior (+2 mm).
  - Línea de Corte exacto.
  - Margen interior de seguridad (-3 mm).
- **Herramientas de Diseño:** Inserción de textos, tipografías, figuras vectoriales, códigos QR dinámicos, carga de imágenes de alta resolución e IA Image Generator con Gemini.
- **Preflight & Control de Calidad Pre-prensa:** Verificación de resolución a 300 DPI, advertencias de corte sobre texto, espacio de color y exportación a PDF de alta fidelidad con **jsPDF**.

### 2. Motor de Cotización Litográfica Dinámica
Fórmula matemática transparente:
$$\text{Precio Total} = \left[ (\text{Precio Base} + \sum \text{Modificadores de Atributos}) \times \text{Cantidad} \right] \times (1 - \text{Descuento Escala}) + \text{Diseño}$$
- Impuesto: IVA del 19% discriminado legalmente para Colombia.
- Tiempos de entrega variables en función de la complejidad de los acabados (ej. Reserva UV o Foil añade días hábiles automáticamente).

### 3. Panel de Administración ("El Gestor")
- **Control de Acceso Basado en Roles (RBAC):**
  - `SUPER_ADMIN`: Control absoluto.
  - `CONTENT_DESIGNER`: Gestión de plantillas, marketing y banners.
  - `CATALOG_PRICING_MANAGER`: Matriz de precios y parámetros.
  - `PRINTER_OPERATOR`: Vista de taller, CTP, hojas de ruta y archivos de corte.
  - `LOGISTICS_DISPATCH`: Guías de despacho y transportadoras.
- **Taller & Tablero Kanban:** Estados en tiempo real (`Revisión de Arte`, `Pre-prensa / CTP`, `Impresión Offset/Digital`, `Acabados & Troquel`, `Listo para Despacho`).
- **Simulador de Imposición de Pliegos:** Cálculo de rendimiento de tarjetas y volantes sobre pliego comercial 70x100 cm y 50x70 cm con optimización de sobrantes.

---

## 🛠️ Comandos de Mantenimiento

| Comando | Acción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Compila el cliente Vite y empaqueta el servidor con esbuild |
| `npm run start` | Arranca la aplicación compilada en producción |
| `npm run lint` | Ejecuta validación estática de tipos TypeScript |
| `npx tsx src/db/seed.ts` | Repuebla la base de datos con el catálogo completo |

---

## 📄 Licencia y Derechos
© 2026 **Fusión Comunicación Gráfica**. Todos los derechos reservados. Desarrollado como software integral de producción litográfica Web-to-Print.
