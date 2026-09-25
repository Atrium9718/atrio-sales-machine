/**
 * Catálogo Tipado de Permisos — Fusion ERP / CRM (Etapa 3 & Etapa 15.1)
 */

export const COLLABORATION_PERMISSIONS = [
  'home:read',
  'home:customize',
  'home:manage_role_layouts',
  'announcement:read',
  'announcement:create',
  'announcement:publish',
  'announcement:manage',
  'chat:read',
  'chat:send',
  'chat:manage_channels',
  'chat:export',
  'call:start',
  'call:join',
  'call:record',
  'performance:read_own',
  'performance:read_team',
  'performance:read_all',
  'goal:read',
  'goal:manage',
] as const;

export type CollaborationPermission = (typeof COLLABORATION_PERMISSIONS)[number];

export const VOICE_PERMISSIONS = [
  'voice:use',
  'voice:call_external',
  'voice:transfer',
  'voice:read_own',
  'voice:read_team',
  'voice:read_all',
  'voice:listen_recording',
  'voice:download_recording',
  'voice:delete_recording',
  'voice:read_transcript',
  'voice:supervise',
  'voice:barge',
  'voice:manage_extensions',
  'voice:manage_queues',
  'voice:manage_ivr',
  'voice:manage_prompts',
  'voice:manage_trunk',
  'voice:manage_ai',
  'voice:manage_campaigns',
  'voice:run_campaign',
  'voice:manage_dnc',
  'voice:reports',
] as const;

export type VoicePermission = (typeof VOICE_PERMISSIONS)[number];

// ============================================================================
// PERMISOS DE TARIFARIO DE PRODUCCIÓN (Etapa 18.1)
// ============================================================================
export const TARIFF_PERMISSIONS = [
  'tariff:read',
  'tariff:write',
  'tariff:publish',
  'quote:assist',
  'quote:assist_cost',
] as const;

export type TariffPermission = (typeof TARIFF_PERMISSIONS)[number];

export const ALL_PERMISSIONS = [
  ...COLLABORATION_PERMISSIONS,
  ...VOICE_PERMISSIONS,
  ...TARIFF_PERMISSIONS,
  // Permisos de etapas previas
  'client:read',
  'client:write',
  'client:delete',
  'opportunity:read',
  'opportunity:write',
  'quote:read',
  'quote:write',
  'production:read',
  'production:write',
  'inventory:read',
  'inventory:write',
  'cost:read',
  'admin:access',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number] | (string & {});

export interface PermissionDefinition {
  key: string;
  description: string;
  category: 'home' | 'announcement' | 'chat' | 'call' | 'voice' | 'performance' | 'goal' | 'tariff' | 'quote' | 'general';
  requiresExplicitGrant?: boolean;
}

export const PERMISSION_CATALOG: Record<CollaborationPermission, PermissionDefinition> = {
  'home:read': {
    key: 'home:read',
    description: 'Ver la pantalla principal de inicio y sus widgets asignados',
    category: 'home',
  },
  'home:customize': {
    key: 'home:customize',
    description: 'Personalizar el diseño, widgets y disposición del home personal',
    category: 'home',
  },
  'home:manage_role_layouts': {
    key: 'home:manage_role_layouts',
    description: 'Configurar y publicar las plantillas de dashboard por rol predeterminadas',
    category: 'home',
  },
  'announcement:read': {
    key: 'announcement:read',
    description: 'Consultar anuncios dirigidos y registrar constancia de lectura o acuse',
    category: 'announcement',
  },
  'announcement:create': {
    key: 'announcement:create',
    description: 'Redactar borradores y programar nuevos anuncios organizacionales',
    category: 'announcement',
  },
  'announcement:publish': {
    key: 'announcement:publish',
    description: 'Publicar anuncios oficiales para roles, áreas o toda la empresa',
    category: 'announcement',
  },
  'announcement:manage': {
    key: 'announcement:manage',
    description: 'Administrar, fijar, archivar y eliminar cualquier anuncio o comentario',
    category: 'announcement',
  },
  'chat:read': {
    key: 'chat:read',
    description: 'Acceder a canales públicos y privados donde es miembro y leer mensajes',
    category: 'chat',
  },
  'chat:send': {
    key: 'chat:send',
    description: 'Enviar mensajes, adjuntar archivos y reaccionar en canales autorizados',
    category: 'chat',
  },
  'chat:manage_channels': {
    key: 'chat:manage_channels',
    description: 'Crear, editar, archivar y configurar miembros en canales de chat',
    category: 'chat',
  },
  'chat:export': {
    key: 'chat:export',
    description: 'Exportar historial y registros de mensajería (concesión explícita requerida)',
    category: 'chat',
    requiresExplicitGrant: true,
  },
  'call:start': {
    key: 'call:start',
    description: 'Iniciar nuevas salas de videoconferencia y llamadas instantáneas',
    category: 'call',
  },
  'call:join': {
    key: 'call:join',
    description: 'Unirse a llamadas, reuniones y salas activas con invitación',
    category: 'call',
  },
  'call:record': {
    key: 'call:record',
    description: 'Iniciar grabación de audio/video en llamadas (concesión explícita requerida)',
    category: 'call',
    requiresExplicitGrant: true,
  },
  'performance:read_own': {
    key: 'performance:read_own',
    description: 'Consultar métricas de cumplimiento personal de tareas y rendimiento propio',
    category: 'performance',
  },
  'performance:read_team': {
    key: 'performance:read_team',
    description: 'Consultar métricas de capacidad, cumplimiento y horas del equipo o área',
    category: 'performance',
  },
  'performance:read_all': {
    key: 'performance:read_all',
    description: 'Consultar reportes y analítica de desempeño global de la organización',
    category: 'performance',
  },
  'goal:read': {
    key: 'goal:read',
    description: 'Ver metas asignadas, métricas clave y progreso acumulado',
    category: 'goal',
  },
  'goal:manage': {
    key: 'goal:manage',
    description: 'Definir, ajustar objetivos y registrar progreso de metas organizacionales',
    category: 'goal',
  },
};

export const VOICE_PERMISSION_CATALOG: Record<VoicePermission, PermissionDefinition> = {
  'voice:use': {
    key: 'voice:use',
    description: 'Acceso básico al módulo de voz, softphone y ver el panel telefónico',
    category: 'voice',
  },
  'voice:call_external': {
    key: 'voice:call_external',
    description: 'Realizar llamadas telefónicas externas fuera de la organización',
    category: 'voice',
  },
  'voice:transfer': {
    key: 'voice:transfer',
    description: 'Transferir llamadas a extensiones, colas o números externos',
    category: 'voice',
  },
  'voice:read_own': {
    key: 'voice:read_own',
    description: 'Ver y consultar el historial de sus propias llamadas',
    category: 'voice',
  },
  'voice:read_team': {
    key: 'voice:read_team',
    description: 'Ver llamadas del equipo o colas asignadas',
    category: 'voice',
  },
  'voice:read_all': {
    key: 'voice:read_all',
    description: 'Ver todas las llamadas de toda la organización',
    category: 'voice',
  },
  'voice:listen_recording': {
    key: 'voice:listen_recording',
    description: 'Escuchar grabaciones de llamadas autorizadas (auditado)',
    category: 'voice',
    requiresExplicitGrant: true,
  },
  'voice:download_recording': {
    key: 'voice:download_recording',
    description: 'Descargar archivos de audio de grabaciones (auditado)',
    category: 'voice',
    requiresExplicitGrant: true,
  },
  'voice:delete_recording': {
    key: 'voice:delete_recording',
    description: 'Eliminar grabaciones de llamadas de forma anticipada',
    category: 'voice',
    requiresExplicitGrant: true,
  },
  'voice:read_transcript': {
    key: 'voice:read_transcript',
    description: 'Leer transcripciones automáticas y resúmenes de llamadas',
    category: 'voice',
  },
  'voice:supervise': {
    key: 'voice:supervise',
    description: 'Monitoreo y escucha silenciosa en vivo de llamadas activas (auditado)',
    category: 'voice',
    requiresExplicitGrant: true,
  },
  'voice:barge': {
    key: 'voice:barge',
    description: 'Irrupción o susurro en llamadas activas para asistir al agente (auditado)',
    category: 'voice',
    requiresExplicitGrant: true,
  },
  'voice:manage_extensions': {
    key: 'voice:manage_extensions',
    description: 'Crear, editar y asignar extensiones telefónicas y SIP',
    category: 'voice',
  },
  'voice:manage_queues': {
    key: 'voice:manage_queues',
    description: 'Configurar colas de atención, miembros y desbordes',
    category: 'voice',
  },
  'voice:manage_ivr': {
    key: 'voice:manage_ivr',
    description: 'Diseñar y publicar flujos de IVR interactivos',
    category: 'voice',
  },
  'voice:manage_prompts': {
    key: 'voice:manage_prompts',
    description: 'Subir, grabar y gestionar locuciones del sistema',
    category: 'voice',
  },
  'voice:manage_trunk': {
    key: 'voice:manage_trunk',
    description: 'Configurar troncales SIP y números DID',
    category: 'voice',
  },
  'voice:manage_ai': {
    key: 'voice:manage_ai',
    description: 'Configurar el agente de voz de Inteligencia Artificial',
    category: 'voice',
  },
  'voice:manage_campaigns': {
    key: 'voice:manage_campaigns',
    description: 'Crear y configurar campañas de llamadas salientes',
    category: 'voice',
  },
  'voice:run_campaign': {
    key: 'voice:run_campaign',
    description: 'Iniciar, pausar y ejecutar campañas de marcación',
    category: 'voice',
  },
  'voice:manage_dnc': {
    key: 'voice:manage_dnc',
    description: 'Administrar la lista de No Llamar (Do Not Call / Robinson)',
    category: 'voice',
  },
  'voice:reports': {
    key: 'voice:reports',
    description: 'Acceder a reportes, métricas y analítica de telefonía',
    category: 'voice',
  },
};

export const SEED_ROLE_VOICE_PERMISSIONS: Record<string, VoicePermission[]> = {
  admin: [...VOICE_PERMISSIONS],
  gerencia: [...VOICE_PERMISSIONS],
  comercial: [
    'voice:use',
    'voice:call_external',
    'voice:transfer',
    'voice:read_own',
    'voice:listen_recording',
    'voice:read_transcript',
  ],
  produccion: [
    'voice:use',
    'voice:transfer',
    'voice:read_own',
  ],
  recepcion: [
    'voice:use',
    'voice:call_external',
    'voice:transfer',
    'voice:read_own',
    'voice:read_team',
    'voice:supervise',
  ],
  planta: [],
  lectura: [],
};

export const TARIFF_PERMISSION_CATALOG: Record<TariffPermission, PermissionDefinition> = {
  'tariff:read': {
    key: 'tariff:read',
    description: 'Ver el tarifario de producción y sus precios de insumos',
    category: 'tariff',
  },
  'tariff:write': {
    key: 'tariff:write',
    description: 'Editar y calibrar una versión del tarifario en borrador',
    category: 'tariff',
  },
  'tariff:publish': {
    key: 'tariff:publish',
    description: 'Publicar o archivar versiones del tarifario (exclusivo gerencia)',
    category: 'tariff',
    requiresExplicitGrant: true,
  },
  'quote:assist': {
    key: 'quote:assist',
    description: 'Usar la Ayuda para cotizar (calculadora guiada de producción)',
    category: 'quote',
  },
  'quote:assist_cost': {
    key: 'quote:assist_cost',
    description: 'Ver el desglose de costo interno y margen dentro de la ayuda (quien no lo tenga solo ve precio de venta)',
    category: 'quote',
    requiresExplicitGrant: true,
  },
};

export const SEED_ROLE_TARIFF_PERMISSIONS: Record<string, TariffPermission[]> = {
  admin: [...TARIFF_PERMISSIONS],
  super_admin: [...TARIFF_PERMISSIONS],
  gerencia: [...TARIFF_PERMISSIONS],
  gerente_general: [...TARIFF_PERMISSIONS],
  director_comercial: ['tariff:read', 'quote:assist'],
  comercial: ['tariff:read', 'quote:assist'],
  jefe_produccion: ['tariff:read'],
  produccion: ['tariff:read'],
  lider_procesos: ['tariff:read'],
  director_proyectos: ['tariff:read', 'quote:assist'],
  director_financiero: [...TARIFF_PERMISSIONS],
  planta: [],
  operario_planta: [],
  lectura: [],
};

/**
 * Roles del sistema y asignación de permisos según especificación:
 * Incluye Colaboración, Telefonía/Voz (Etapa 17.1) y Tarifario de Producción (Etapa 18.1).
 */
export const SEED_ROLE_COLLABORATION_PERMISSIONS: Record<string, (CollaborationPermission | VoicePermission | TariffPermission)[]> = {
  admin: [...COLLABORATION_PERMISSIONS, ...VOICE_PERMISSIONS, ...TARIFF_PERMISSIONS],
  super_admin: [...COLLABORATION_PERMISSIONS, ...VOICE_PERMISSIONS, ...TARIFF_PERMISSIONS],
  gerencia: [
    ...COLLABORATION_PERMISSIONS.filter((p) => p !== 'chat:export'),
    ...SEED_ROLE_VOICE_PERMISSIONS.gerencia,
    ...SEED_ROLE_TARIFF_PERMISSIONS.gerencia,
  ],
  gerente_general: [
    ...COLLABORATION_PERMISSIONS.filter((p) => p !== 'chat:export'),
    ...SEED_ROLE_VOICE_PERMISSIONS.gerencia,
    ...SEED_ROLE_TARIFF_PERMISSIONS.gerente_general,
  ],
  comercial: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.comercial,
    ...SEED_ROLE_TARIFF_PERMISSIONS.comercial,
  ],
  director_comercial: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.comercial,
    ...SEED_ROLE_TARIFF_PERMISSIONS.director_comercial,
  ],
  director_proyectos: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.gerencia,
    ...SEED_ROLE_TARIFF_PERMISSIONS.director_proyectos,
  ],
  produccion: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.produccion,
    ...SEED_ROLE_TARIFF_PERMISSIONS.produccion,
  ],
  jefe_produccion: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.produccion,
    ...SEED_ROLE_TARIFF_PERMISSIONS.jefe_produccion,
  ],
  director_financiero: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.gerencia,
    ...SEED_ROLE_TARIFF_PERMISSIONS.director_financiero,
  ],
  auxiliar_admin: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    'performance:read_own',
    'goal:read',
  ],
  lider_procesos: [
    'home:read',
    'home:customize',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:start',
    'call:join',
    'performance:read_own',
    'performance:read_team',
    'goal:read',
    ...SEED_ROLE_VOICE_PERMISSIONS.produccion,
    ...SEED_ROLE_TARIFF_PERMISSIONS.lider_procesos,
  ],
  diseno_preprensa: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    'performance:read_own',
  ],
  post_prensa: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    'performance:read_own',
  ],
  recepcion: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    ...SEED_ROLE_VOICE_PERMISSIONS.recepcion,
  ],
  planta: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    'performance:read_own',
  ],
  operario_planta: [
    'home:read',
    'announcement:read',
    'chat:read',
    'chat:send',
    'call:join',
    'performance:read_own',
  ],
  lectura: [
    'home:read',
    'announcement:read',
    'chat:read',
  ],
};

export type UserLike = {
  id?: string;
  email?: string;
  permissions?: string[];
  role?: string | { key: string; permissions?: string[] };
  roleKey?: string;
  customPermissions?: string[];
} | string[];

/**
 * Evalúa si un usuario o conjunto de permisos contiene el permiso requerido.
 */
export function can(
  userOrPermissions: UserLike | undefined | null,
  required: Permission | Permission[]
): boolean {
  if (!userOrPermissions) return false;

  let grantedPermissions: string[] = [];

  if (Array.isArray(userOrPermissions)) {
    grantedPermissions = userOrPermissions;
  } else if (typeof userOrPermissions === 'object') {
    const userObj = userOrPermissions as any;
    const roleKey = (
      userObj.roleKey ||
      (typeof userObj.role === 'string' ? userObj.role : userObj.role?.key) ||
      ''
    ).toLowerCase();

    // Super admin o usuario permanente siempre tiene permisos absolutos
    if (roleKey === 'admin' || roleKey === 'super_admin') return true;
    if (userObj.id === 'emp-03' || (typeof userObj.email === 'string' && userObj.email.toLowerCase().includes('andresepulveda718'))) {
      return true;
    }

    if (Array.isArray(userObj.permissions)) {
      grantedPermissions = userObj.permissions;
    } else if (typeof userObj.role === 'string') {
      const rolePerms = SEED_ROLE_COLLABORATION_PERMISSIONS[userObj.role.toLowerCase()];
      if (rolePerms) grantedPermissions = rolePerms;
      if (userObj.role.toLowerCase() === 'admin' || userObj.role.toLowerCase() === 'super_admin') return true;
    } else if (userObj.role && typeof userObj.role === 'object') {
      const roleObj = userObj.role;
      if (roleObj.key?.toLowerCase() === 'admin' || roleObj.key?.toLowerCase() === 'super_admin') return true;
      if (Array.isArray(roleObj.permissions)) {
        grantedPermissions = roleObj.permissions;
      } else if (roleObj.key) {
        const rolePerms = SEED_ROLE_COLLABORATION_PERMISSIONS[roleObj.key.toLowerCase()];
        if (rolePerms) grantedPermissions = rolePerms;
      }
    }
  }

  // Super-admin wildcard check
  if (grantedPermissions.includes('*') || grantedPermissions.includes('admin:all')) {
    return true;
  }

  const permissionsToCheck = Array.isArray(required) ? required : [required];
  return permissionsToCheck.every((perm) => grantedPermissions.includes(perm));
}

/**
 * Valida un permiso y lanza un error en caso de no poseerlo.
 */
export function requirePermission(
  userOrPermissions: UserLike | undefined | null,
  required: Permission | Permission[]
): void {
  if (!can(userOrPermissions, required)) {
    const requiredStr = Array.isArray(required) ? required.join(', ') : required;
    const error = new Error(`Permiso denegado. Se requiere: ${requiredStr}`);
    (error as any).code = 'FORBIDDEN';
    (error as any).status = 403;
    throw error;
  }
}

/**
 * REGLA DE SEGURIDAD (Etapa 18.1):
 * La autorización se evalúa en el servidor.
 * Un usuario sin 'quote:assist_cost' no debe recibir jamás el desglose en
 * la respuesta del API, ni recortado en el cliente.
 * 
 * Si el usuario NO tiene 'quote:assist_cost', elimina completamente los campos
 * de costo interno, costo de materia prima, mano de obra, márgenes y breakdown.
 */
export function sanitizeQuoteAssistResult<T extends Record<string, any>>(
  result: T,
  userOrPermissions: UserLike | undefined | null
): T {
  if (can(userOrPermissions, 'quote:assist_cost')) {
    return result;
  }

  // Quitar recursivamente o shallow los campos de costo/margen internos
  const sanitized = { ...result };
  delete (sanitized as any).breakdown;
  delete (sanitized as any).internalCost;
  delete (sanitized as any).rawMaterialCost;
  delete (sanitized as any).laborCost;
  delete (sanitized as any).otherCosts;
  delete (sanitized as any).outsourcedCost;
  delete (sanitized as any).marginPercent;
  delete (sanitized as any).marginAmount;
  delete (sanitized as any).targetMarginPercent;
  delete (sanitized as any).costDetails;
  delete (sanitized as any).costBreakdown;

  const anyObj = sanitized as any;
  if (Array.isArray(anyObj.items)) {
    anyObj.items = anyObj.items.map((item: any) => {
      if (typeof item !== 'object' || item === null) return item;
      const {
        breakdown,
        internalCost,
        rawMaterialCost,
        laborCost,
        otherCosts,
        outsourcedCost,
        marginPercent,
        marginAmount,
        targetMarginPercent,
        costDetails,
        costBreakdown,
        ...safeItem
      } = item;
      return safeItem;
    });
  }

  return sanitized;
}

export type FusionModuleKey =
  | 'equipo'
  | 'comercial'
  | 'voz'
  | 'produccion'
  | 'costos'
  | 'comunicaciones'
  | 'configuracion'
  | 'auditoria'
  | 'ia'
  | 'sistema';

export interface FusionModuleDef {
  key: FusionModuleKey;
  name: string;
  description: string;
  category: string;
  icon?: string;
  isSensitive?: boolean;
}

export const FUSION_MODULES_CATALOG: FusionModuleDef[] = [
  {
    key: 'equipo',
    name: 'Equipo y Colaboración',
    description: 'Home, Anuncios corporativos, Chat interno, Rendimiento y Metas.',
    category: 'Colaboración',
  },
  {
    key: 'comercial',
    name: 'Comercial y CRM',
    description: 'Clientes, Oportunidades, Cotizador de Impresión y Avisos, Precotizaciones IA, Agenda comercial.',
    category: 'Ventas',
  },
  {
    key: 'produccion',
    name: 'Producción de Taller e Inventario',
    description: 'Tablero Kanban de taller, Catálogo de productos, Ritual V.E.A., Inventario y Capacidad.',
    category: 'Operaciones',
  },
  {
    key: 'costos',
    name: 'Rentabilidad y Costos Reales',
    description: 'Costos reales de insumos, márgenes de utilidad y horas extra / supernumerarios. (Sensible)',
    category: 'Finanzas',
    isSensitive: true,
  },
  {
    key: 'voz',
    name: 'Voz y Telefonía',
    description: 'Panel de llamadas, Historial, Colas, Buzón, IVR, Locuciones y Agente de Voz IA.',
    category: 'Comunicaciones',
  },
  {
    key: 'comunicaciones',
    name: 'Comunicaciones Omnicanal',
    description: 'Bandeja unificada Inbox, Estado de canales Meta/WhatsApp y Simulador.',
    category: 'Comunicaciones',
  },
  {
    key: 'configuracion',
    name: 'Configuración General',
    description: 'Identidad de empresa, Parámetros, Maestros, Numeración y Calendario laboral.',
    category: 'Administración',
  },
  {
    key: 'auditoria',
    name: 'Auditoría, Usuarios y Seguridad',
    description: 'Gestión de Empleados, Editor de Roles y Permisos, Políticas y Registro de actividad.',
    category: 'Administración',
    isSensitive: true,
  },
  {
    key: 'ia',
    name: 'IA y Sistemática',
    description: 'Arquitectura de agentes, Laboratorio de pruebas, Diccionario semántico y Fuentes.',
    category: 'Tecnología',
  },
  {
    key: 'sistema',
    name: 'Sistema y Operaciones Técnicas',
    description: 'Bóveda de secretos, Integraciones, Respaldos y Mantenimiento de infraestructura.',
    category: 'Tecnología',
    isSensitive: true,
  },
];

/**
 * Determina si un usuario o rol tiene permitido ver un módulo del sistema.
 */
export function canAccessModule(
  user: any,
  moduleKey: FusionModuleKey
): boolean {
  if (!user) return false;

  const roleKey = (
    typeof user === 'string'
      ? user
      : (user.roleKey || (typeof user.role === 'string' ? user.role : user.role?.key) || 'planta')
  ).toLowerCase();

  // Super admin siempre tiene acceso a todo
  if (roleKey === 'admin' || roleKey === 'super_admin') return true;
  if (user.id === 'emp-03' || (typeof user.email === 'string' && user.email.toLowerCase().includes('andresepulveda718'))) {
    return true;
  }
  if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('admin:all'))) {
    return true;
  }

  // Verificación de excepciones directas en el usuario
  if (user.customDeniedModules && Array.isArray(user.customDeniedModules) && user.customDeniedModules.includes(moduleKey)) {
    return false;
  }
  if (user.customAllowedModules && Array.isArray(user.customAllowedModules) && user.customAllowedModules.includes(moduleKey)) {
    return true;
  }

  // Reglas por defecto según el rol/cargo
  switch (roleKey) {
    case 'gerente_general':
    case 'gerencia':
      return moduleKey !== 'sistema'; // Casi todo excepto infraestructura técnica cruda
    case 'director_comercial':
    case 'comercial':
      return ['equipo', 'comercial', 'voz', 'comunicaciones', 'ia'].includes(moduleKey);
    case 'director_proyectos':
      return ['equipo', 'comercial', 'produccion', 'comunicaciones'].includes(moduleKey);
    case 'jefe_produccion':
    case 'produccion':
      return ['equipo', 'produccion', 'costos', 'voz', 'comunicaciones'].includes(moduleKey);
    case 'director_financiero':
      return ['equipo', 'comercial', 'produccion', 'costos', 'configuracion', 'auditoria'].includes(moduleKey);
    case 'auxiliar_admin':
      return ['equipo', 'comercial', 'produccion', 'configuracion'].includes(moduleKey);
    case 'lider_procesos':
      return ['equipo', 'produccion', 'configuracion', 'ia'].includes(moduleKey);
    case 'diseno_preprensa':
      return ['equipo', 'produccion'].includes(moduleKey);
    case 'post_prensa':
      return ['equipo', 'produccion'].includes(moduleKey);
    case 'operario_planta':
    case 'planta':
      return ['equipo', 'produccion'].includes(moduleKey); // Solo su tablero, anuncios, chat y producción/kiosko
    case 'recepcion':
      return ['equipo', 'comercial', 'voz', 'comunicaciones'].includes(moduleKey);
    case 'lectura':
      return ['equipo'].includes(moduleKey);
    default:
      return ['equipo'].includes(moduleKey);
  }
}

