import { SystemUser, RoleDefinition } from './users.types';

export const DEFAULT_SUPER_USER_EMAIL = 'andresepulveda718@gmail.com';

export const INITIAL_DEFAULT_ROLES: RoleDefinition[] = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Administrador',
    description: 'Acceso irrestricto y permanente a todos los módulos: credenciales de pasarelas de pago (Wompi, Bold), transportadoras Skydropx, gestión de usuarios, roles y seguridad.',
    level: 10,
    color: 'teal',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
    isSystem: true,
    permissions: [
      'catalog:view', 'catalog:create', 'catalog:edit', 'catalog:delete',
      'pricing:view', 'pricing:edit', 'pricing:calculator',
      'imposition:view', 'imposition:generate', 'imposition:download', 'imposition:config',
      'orders:view', 'orders:edit_status', 'orders:cancel', 'orders:export',
      'b2b:view', 'b2b:approve_credit', 'b2b:manage_limits',
      'cms:view', 'cms:edit_draft', 'cms:publish', 'cms:manage_versions', 'cms:delete',
      'media:view', 'media:upload_ai', 'seo:manage',
      'marketing:view', 'marketing:create_campaigns', 'marketing:manage_banners',
      'shipping:view', 'shipping:generate_guides', 'shipping:config',
      'gateways:view', 'gateways:config',
      'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_roles',
      'audit:view_logs', 'security:manage_policies'
    ]
  },
  {
    key: 'ADMIN',
    name: 'Administrador General',
    description: 'Control operativo global: administración del catálogo W2P, matriz de precios, aprobación de pedidos, cuentas B2B corporativas y reportes comerciales.',
    level: 8,
    color: 'purple',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-800',
    isSystem: true,
    permissions: [
      'catalog:view', 'catalog:create', 'catalog:edit',
      'pricing:view', 'pricing:edit', 'pricing:calculator',
      'imposition:view', 'imposition:generate', 'imposition:download',
      'orders:view', 'orders:edit_status', 'orders:export',
      'b2b:view', 'b2b:approve_credit', 'b2b:manage_limits',
      'cms:view', 'cms:edit_draft', 'cms:publish', 'cms:manage_versions',
      'media:view', 'media:upload_ai', 'seo:manage',
      'marketing:view', 'marketing:create_campaigns', 'marketing:manage_banners',
      'shipping:view', 'shipping:generate_guides',
      'gateways:view',
      'users:view', 'users:create', 'users:edit',
      'audit:view_logs'
    ]
  },
  {
    key: 'CONTENT_DESIGNER',
    name: 'Diseñador de Contenido / Marketing',
    description: 'Gestión editorial y visual del W2P: diseño de bloques en modo Borrador, redacción de copys comerciales con Gemini IA, creación de banners, biblioteca multimedia y optimización SEO.',
    level: 6,
    color: 'pink',
    badgeBg: 'bg-pink-50 border-pink-200',
    badgeText: 'text-pink-800',
    isSystem: true,
    permissions: [
      'cms:view', 'cms:edit_draft', 'cms:publish', 'cms:manage_versions',
      'media:view', 'media:upload_ai',
      'seo:manage',
      'marketing:view', 'marketing:create_campaigns', 'marketing:manage_banners',
      'catalog:view'
    ]
  },
  {
    key: 'CATALOG_PRICING_MANAGER',
    name: 'Gestor de Catálogo y Precios Litográficos',
    description: 'Control de la oferta litográfica: configuración de sustratos, gramajes, tintas, barnices, troqueles, algoritmos de cálculo de pliegos, horas prensa y listas de precios.',
    level: 6,
    color: 'amber',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    isSystem: true,
    permissions: [
      'catalog:view', 'catalog:create', 'catalog:edit', 'catalog:delete',
      'pricing:view', 'pricing:edit', 'pricing:calculator',
      'imposition:view', 'imposition:generate',
      'orders:view',
      'cms:view'
    ]
  },
  {
    key: 'PRINTER_OPERATOR',
    name: 'Impresor / Operador de Taller',
    description: 'Responsable técnico de máquinas litográficas y digitales: monitoreo de cola de impresión, cambio de estados en taller, visualización de pliegos CTP y hojas de ruta de producción.',
    level: 6,
    color: 'orange',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-800',
    isSystem: true,
    permissions: [
      'catalog:view',
      'imposition:view', 'imposition:generate', 'imposition:download', 'imposition:config',
      'orders:view', 'orders:edit_status',
      'shipping:view'
    ]
  },
  {
    key: 'PREPRESS_DESIGNER',
    name: 'Diseñador & Preprensa',
    description: 'Control de calidad técnico de artes gráficas: revisión de sangrados (3mm), perfiles CMYK/Pantone, resolución (300 DPI), armado de pliegos litográficos e imposición CTP.',
    level: 5,
    color: 'blue',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
    isSystem: true,
    permissions: [
      'catalog:view', 'catalog:create', 'catalog:edit',
      'imposition:view', 'imposition:generate', 'imposition:download',
      'orders:view', 'orders:edit_status',
      'marketing:manage_banners'
    ]
  },
  {
    key: 'LOGISTICS_DISPATCH',
    name: 'Logística & Despachos',
    description: 'Gestión de envíos y paquetería: cotización de fletes, generación de guías con transportadoras vía Skydropx, impresión de etiquetas térmicas y despacho de pedidos.',
    level: 5,
    color: 'emerald',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    isSystem: true,
    permissions: [
      'orders:view', 'orders:edit_status',
      'shipping:view', 'shipping:generate_guides'
    ]
  },
  {
    key: 'SALES_AGENT',
    name: 'Asesor Comercial & Cotizador',
    description: 'Atención a clientes y empresas: cálculo de cotizaciones técnicas personalizadas en motor litográfico, gestión de órdenes y seguimiento comercial.',
    level: 4,
    color: 'amber',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    isSystem: true,
    permissions: [
      'catalog:view',
      'pricing:view', 'pricing:calculator',
      'orders:view', 'orders:edit_status',
      'b2b:view'
    ]
  },
  {
    key: 'ACCOUNTING',
    name: 'Contabilidad & Facturación',
    description: 'Gestión financiera: conciliación de pagos electrónicos Wompi/Bold, validación de transferencias, cartera de crédito B2B y emisión de comprobantes fiscales.',
    level: 4,
    color: 'indigo',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    isSystem: true,
    permissions: [
      'orders:view', 'orders:export',
      'gateways:view',
      'b2b:view',
      'audit:view_logs'
    ]
  },
  {
    key: 'CUSTOMER_B2B',
    name: 'Cliente B2B / Corporativo',
    description: 'Acceso a la plataforma de compras corporativas con precios especiales por volumen, cupo de crédito aprobado y gestión de pedidos por lotes.',
    level: 2,
    color: 'cyan',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-800',
    isSystem: true,
    permissions: [
      'catalog:view',
      'pricing:view'
    ]
  },
  {
    key: 'CUSTOMER',
    name: 'Cliente Estándar',
    description: 'Usuario final de la tienda en línea: personalización de plantillas en el editor W2P, carga de archivos PDF propios, compras y seguimiento de órdenes.',
    level: 1,
    color: 'slate',
    badgeBg: 'bg-slate-50 border-slate-200',
    badgeText: 'text-slate-800',
    isSystem: true,
    permissions: [
      'catalog:view'
    ]
  }
];

export const INITIAL_DEFAULT_USERS: SystemUser[] = [
  {
    id: 'usr-001',
    email: 'andresepulveda718@gmail.com',
    name: 'Andrés Sepúlveda',
    phone: '+57 311 458 9231',
    role: 'SUPER_ADMIN',
    department: 'Dirección General & Tecnología',
    status: 'active',
    twoFactorEnabled: true,
    avatarColor: '#0d9488',
    lastLogin: '2026-08-23T16:45:00.000Z',
    lastIp: '181.134.92.14 (Manizales, Colombia)',
    createdAt: '2026-01-10T10:00:00.000Z',
    notes: 'Super Usuario Principal y Propietario del Sistema - Acceso Irrestricto Permanente'
  },
  {
    id: 'usr-002',
    email: 'gerencia@fusiongrafica.com.co',
    name: 'Carlos Alberto Gómez',
    phone: '+57 310 892 4110',
    role: 'ADMIN',
    department: 'Gerencia Operativa',
    status: 'active',
    twoFactorEnabled: true,
    avatarColor: '#7c3aed',
    lastLogin: '2026-08-23T14:20:00.000Z',
    lastIp: '181.134.92.14 (Manizales, Colombia)',
    createdAt: '2026-01-15T11:30:00.000Z',
    notes: 'Gerente de Planta & Administración General'
  },
  {
    id: 'usr-003',
    email: 'impresion@fusiongrafica.com.co',
    name: 'Mauricio Henao',
    phone: '+57 314 772 1980',
    role: 'PRINTER_OPERATOR',
    department: 'Taller de Impresión Offset & CTP',
    status: 'active',
    twoFactorEnabled: false,
    avatarColor: '#ea580c',
    lastLogin: '2026-08-23T15:10:00.000Z',
    lastIp: '190.24.112.55 (Manizales, Colombia)',
    createdAt: '2026-02-01T08:00:00.000Z',
    notes: 'Impresor Principal - Manejo de Heidelberg Speedmaster y Prensas Digitales'
  },
  {
    id: 'usr-004',
    email: 'diseno@fusiongrafica.com.co',
    name: 'Valentina Rendón',
    phone: '+57 312 605 3422',
    role: 'CONTENT_DESIGNER',
    department: 'Diseño Web, Contenidos & Marketing',
    status: 'active',
    twoFactorEnabled: true,
    avatarColor: '#db2777',
    lastLogin: '2026-08-23T13:45:00.000Z',
    lastIp: '190.24.112.55 (Manizales, Colombia)',
    createdAt: '2026-02-10T09:15:00.000Z',
    notes: 'Diseñadora de Contenido & Marketing - Diseña bloques, banners y copys con IA'
  },
  {
    id: 'usr-010',
    email: 'catalogo@fusiongrafica.com.co',
    name: 'Mauricio Gómez',
    phone: '+57 318 490 2211',
    role: 'CATALOG_PRICING_MANAGER',
    department: 'Gestión Litográfica & Precios',
    status: 'active',
    twoFactorEnabled: true,
    avatarColor: '#d97706',
    lastLogin: '2026-08-23T14:10:00.000Z',
    lastIp: '181.134.92.14 (Manizales, Colombia)',
    createdAt: '2026-02-15T10:00:00.000Z',
    notes: 'Gestor de Catálogo y Precios - Reglas de costeo de papel, tintas y tirajes'
  },
  {
    id: 'usr-005',
    email: 'despachos@fusiongrafica.com.co',
    name: 'Jhon Jairo Morales',
    phone: '+57 313 540 8891',
    role: 'LOGISTICS_DISPATCH',
    department: 'Logística & Envíos Skydropx',
    status: 'active',
    twoFactorEnabled: false,
    avatarColor: '#059669',
    lastLogin: '2026-08-23T11:00:00.000Z',
    lastIp: '190.24.112.55 (Manizales, Colombia)',
    createdAt: '2026-03-01T10:00:00.000Z',
    notes: 'Generación de guías con Coordinadora, Servientrega e Inter Rapidísimo vía Skydropx'
  },
  {
    id: 'usr-006',
    email: 'ventas@fusiongrafica.com.co',
    name: 'Daniela Quintero',
    phone: '+57 320 681 4452',
    role: 'SALES_AGENT',
    department: 'Ventas Corporativas & B2B',
    status: 'active',
    twoFactorEnabled: false,
    avatarColor: '#d97706',
    lastLogin: '2026-08-22T17:30:00.000Z',
    lastIp: '181.134.92.14 (Manizales, Colombia)',
    createdAt: '2026-03-15T14:00:00.000Z',
    notes: 'Gestión de cotizaciones personalizadas y cuentas B2B con precios por volumen'
  },
  {
    id: 'usr-007',
    email: 'contabilidad@fusiongrafica.com.co',
    name: 'Lucía Bedoya',
    phone: '+57 311 902 3341',
    role: 'ACCOUNTING',
    department: 'Contabilidad & Facturación DIAN',
    status: 'active',
    twoFactorEnabled: true,
    avatarColor: '#4f46e5',
    lastLogin: '2026-08-21T16:00:00.000Z',
    lastIp: '181.134.92.14 (Manizales, Colombia)',
    createdAt: '2026-04-01T08:30:00.000Z',
    notes: 'Revisión de pagos en Wompi / Bold y emisión de facturación electrónica DIAN'
  },
  {
    id: 'usr-008',
    email: 'compras@editorialcolombia.com',
    name: 'Editorial Andina S.A.S.',
    phone: '+57 300 221 8890',
    role: 'CUSTOMER_B2B',
    department: 'Cuenta Corporativa B2B (NIT: 900.842.110-1)',
    status: 'active',
    twoFactorEnabled: false,
    avatarColor: '#0891b2',
    lastLogin: '2026-08-20T10:15:00.000Z',
    lastIp: '190.157.88.22 (Bogotá, Colombia)',
    createdAt: '2026-04-10T11:00:00.000Z',
    notes: 'Cliente corporativo con cupo de crédito de $15.000.000 COP y facturación a 30 días'
  },
  {
    id: 'usr-009',
    email: 'maria.restrepo@gmail.com',
    name: 'María Fernanda Restrepo',
    phone: '+57 315 440 9988',
    role: 'CUSTOMER',
    department: 'Cliente Tienda Online',
    status: 'active',
    twoFactorEnabled: false,
    avatarColor: '#64748b',
    lastLogin: '2026-08-22T19:40:00.000Z',
    lastIp: '186.84.190.12 (Medellín, Colombia)',
    createdAt: '2026-05-02T16:20:00.000Z',
    notes: 'Cliente particular frecuente de tarjetas de presentación y adhesivos troquelados'
  }
];
