import { PermissionModule } from './users.types';

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    moduleId: 'catalog',
    moduleName: 'Catálogo & Parámetros Litográficos',
    description: 'Gestión de productos, papeles, acabados, barnices y troqueles.',
    permissions: [
      { key: 'catalog:view', label: 'Ver Catálogo', description: 'Consultar productos y fichas técnicas' },
      { key: 'catalog:create', label: 'Crear Productos', description: 'Crear nuevos items litográficos y variantes' },
      { key: 'catalog:edit', label: 'Editar Productos', description: 'Modificar especificaciones y parámetros de costos' },
      { key: 'catalog:delete', label: 'Eliminar Productos', description: 'Eliminar items o archivarlos permanentemente' },
    ]
  },
  {
    moduleId: 'pricing',
    moduleName: 'Motor de Precios & Costos Litográficos',
    description: 'Algoritmos de tiraje, merma, costos de planchas CTP, tintas y mano de obra.',
    permissions: [
      { key: 'pricing:view', label: 'Ver Reglas de Precios', description: 'Consultar fórmulas y márgenes de ganancia' },
      { key: 'pricing:edit', label: 'Modificar Fórmulas', description: 'Actualizar costos por millar, hora prensa y mermas' },
      { key: 'pricing:calculator', label: 'Cotizador Avanzado', description: 'Calcular cotizaciones personalizadas de pliegos' },
    ]
  },
  {
    moduleId: 'imposition',
    moduleName: 'Imposición CTP & Preprensa',
    description: 'Generación de pliegos, marcas de corte, registros y exportación PDF/JDF.',
    permissions: [
      { key: 'imposition:view', label: 'Ver Pliegos', description: 'Visualizar imposición de páginas y distribución' },
      { key: 'imposition:generate', label: 'Generar Imposición', description: 'Calcular y renderizar pliegos CTP' },
      { key: 'imposition:download', label: 'Descargar PDFs Pliegos', description: 'Descargar archivos de alta resolución para CTP' },
      { key: 'imposition:config', label: 'Configurar Prensas CTP', description: 'Ajustar formatos de pinza, mordaza y márgenes' },
    ]
  },
  {
    moduleId: 'orders',
    moduleName: 'Gestión de Pedidos & Producción',
    description: 'Seguimiento de órdenes de trabajo (OT), estados en taller y entregas.',
    permissions: [
      { key: 'orders:view', label: 'Ver Pedidos', description: 'Consultar listado y detalles de órdenes' },
      { key: 'orders:edit_status', label: 'Actualizar Estado', description: 'Avanzar orden a Preprensa, Impresión, Acabados o Despachado' },
      { key: 'orders:cancel', label: 'Anular / Cancelar Pedido', description: 'Cancelar órdenes y autorizar devoluciones' },
      { key: 'orders:export', label: 'Exportar Reportes', description: 'Descargar reportes de producción en Excel/CSV' },
    ]
  },
  {
    moduleId: 'shipping',
    moduleName: 'Logística & Transportadoras (Skydropx)',
    description: 'Cotizaciones en vivo, generación de guías y recolecciones con transportadoras.',
    permissions: [
      { key: 'shipping:view', label: 'Ver Guías & Rastreo', description: 'Consultar estado de despachos nacionales' },
      { key: 'shipping:generate_guides', label: 'Generar Guías & Etiquetas', description: 'Emitir guías oficiales con Coordinadora, Servientrega, etc.' },
      { key: 'shipping:config', label: 'Configurar Skydropx', description: 'Modificar claves de API, origen y transportadoras activas' },
    ]
  },
  {
    moduleId: 'b2b',
    moduleName: 'Cuentas Corporativas B2B',
    description: 'Gestión de empresas, cupos de crédito a 30/60 días y precios mayoristas.',
    permissions: [
      { key: 'b2b:view', label: 'Ver Cuentas B2B', description: 'Consultar empresas registradas y su historial' },
      { key: 'b2b:approve_credit', label: 'Aprobar Cupo Crédito', description: 'Autorizar líneas de crédito directo' },
      { key: 'b2b:manage_limits', label: 'Ajustar Límites & Plazos', description: 'Modificar cupo en COP y días de vencimiento' },
    ]
  },
  {
    moduleId: 'gateways',
    moduleName: 'Pasarelas de Pago & Facturación',
    description: 'Configuración de Wompi, Bold, transferencias Bancolombia/Nequi y facturas.',
    permissions: [
      { key: 'gateways:view', label: 'Ver Pasarelas & Pagos', description: 'Consultar transacciones y estados de pago' },
      { key: 'gateways:config', label: 'Configurar Llaves de Pago', description: 'Modificar llaves públicas, privadas y webhooks' },
    ]
  },
  {
    moduleId: 'cms_governance',
    moduleName: 'CMS, Gobierno & Control de Publicación',
    description: 'Flujo de trabajo de borradores, aprobación, snapshots de versiones y publicación en vivo.',
    permissions: [
      { key: 'cms:view', label: 'Ver Páginas & Secciones', description: 'Consultar el constructor visual y páginas CMS' },
      { key: 'cms:edit_draft', label: 'Editar en Modo Borrador', description: 'Diseñar bloques, copys y secciones en borrador sin alterar el sitio en vivo' },
      { key: 'cms:publish', label: 'Publicar a Producción', description: 'Autorizar y desplegar cambios de borrador en el storefront en vivo' },
      { key: 'cms:manage_versions', label: 'Historial & Restauración (Snapshots)', description: 'Crear copias de seguridad de versiones y revertir cambios (Rollback)' },
      { key: 'cms:delete', label: 'Eliminar Páginas', description: 'Dar de baja páginas personalizadas del sistema' },
    ]
  },
  {
    moduleId: 'media_seo',
    moduleName: 'Biblioteca de Medios & Suite SEO',
    description: 'Optimización WebP/AVIF, generación con IA de renders y metadatos SEO por página.',
    permissions: [
      { key: 'media:view', label: 'Ver Galería de Medios', description: 'Consultar imágenes y recursos' },
      { key: 'media:upload_ai', label: 'Subir Medios & Generar con IA', description: 'Cargar recursos, optimizar y crear mockups 300 DPI' },
      { key: 'seo:manage', label: 'Gestionar Metadatos SEO', description: 'Configurar meta etiquetas, Open Graph y auditoría' },
    ]
  },
  {
    moduleId: 'marketing',
    moduleName: 'Marketing & Banners',
    description: 'Campañas omnicanal por correo, WhatsApp, banners y promociones.',
    permissions: [
      { key: 'marketing:view', label: 'Ver Campañas', description: 'Consultar métricas y campañas publicitarias' },
      { key: 'marketing:create_campaigns', label: 'Crear Campañas', description: 'Diseñar y enviar boletines o promociones' },
      { key: 'marketing:manage_banners', label: 'Gestionar Banners', description: 'Subir y activar banners promocionales' },
    ]
  },
  {
    moduleId: 'users_security',
    moduleName: 'Usuarios, Roles & Seguridad del Sistema',
    description: 'Control de acceso basado en roles (RBAC), auditoría y directivas de seguridad.',
    permissions: [
      { key: 'users:view', label: 'Ver Usuarios', description: 'Consultar directorio de colaboradores y clientes' },
      { key: 'users:create', label: 'Crear / Invitar Usuarios', description: 'Dar de alta nuevos usuarios en el sistema' },
      { key: 'users:edit', label: 'Editar Usuarios', description: 'Modificar roles, departamentos y estados' },
      { key: 'users:delete', label: 'Eliminar / Bloquear Usuarios', description: 'Dar de baja o suspender usuarios' },
      { key: 'users:manage_roles', label: 'Gestionar Roles & Permisos', description: 'Editar matriz de permisos de cada rol' },
      { key: 'audit:view_logs', label: 'Ver Logs de Auditoría', description: 'Inspeccionar registros de seguridad y accesos' },
      { key: 'security:manage_policies', label: 'Políticas de Seguridad', description: 'Configurar directivas de contraseñas y 2FA' },
    ]
  }
];
