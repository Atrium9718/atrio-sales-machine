import { Router } from 'express';
import {
  WIDGET_CATALOG,
  getAllWidgets,
} from '../../packages/core/src/home/widget-catalog';
import { resolveLayout } from '../../packages/core/src/home/resolve-layout';
import {
  can,
  SEED_ROLE_COLLABORATION_PERMISSIONS,
  CollaborationPermission,
} from '../../packages/core/src/auth/permissions';
import { computeTaskCompliance } from '../../packages/core/src/performance/task-compliance';
import { computeCapacity } from '../../packages/core/src/performance/capacity';
import { inMemoryAnnouncements, inMemoryShoutouts } from './announcements';
import { inMemoryChannels, inMemoryMessages, inMemoryPresences, getUserDirectory } from './chat';
import { employeeService } from '../services/employeeService';

export const homeRouter = Router();

// Estado en memoria de plantillas por rol y layouts de usuario (con respaldo en Prisma cuando esté disponible)
export const memoryRoleLayouts: Record<string, any[]> = {
  super_admin: [
    { key: 'mi_dia', size: 'MEDIUM', order: 0 },
    { key: 'pipeline_resumen', size: 'MEDIUM', order: 1 },
    { key: 'meta_ventas', size: 'MEDIUM', order: 2 },
    { key: 'proyectos_en_riesgo', size: 'MEDIUM', order: 3 },
    { key: 'capacidad_planta', size: 'MEDIUM', order: 4 },
    { key: 'margen_real_mes', size: 'MEDIUM', order: 5 },
    { key: 'salud_integraciones', size: 'MEDIUM', order: 6 },
    { key: 'atajos', size: 'MEDIUM', order: 7 },
  ],
  admin: [
    { key: 'mi_dia', size: 'MEDIUM', order: 0 },
    { key: 'pipeline_resumen', size: 'MEDIUM', order: 1 },
    { key: 'meta_ventas', size: 'MEDIUM', order: 2 },
    { key: 'proyectos_en_riesgo', size: 'MEDIUM', order: 3 },
    { key: 'capacidad_planta', size: 'MEDIUM', order: 4 },
    { key: 'margen_real_mes', size: 'MEDIUM', order: 5 },
    { key: 'salud_integraciones', size: 'MEDIUM', order: 6 },
    { key: 'atajos', size: 'MEDIUM', order: 7 },
  ],
  comercial: [
    { key: 'mi_dia', size: 'MEDIUM', order: 0 },
    { key: 'meta_ventas', size: 'MEDIUM', order: 1 },
    { key: 'pipeline_resumen', size: 'LARGE', order: 2 },
    { key: 'cotizaciones_sin_seguimiento', size: 'MEDIUM', order: 3 },
    { key: 'clientes_calientes', size: 'MEDIUM', order: 4 },
    { key: 'mi_agenda', size: 'SMALL', order: 5 },
    { key: 'atajos', size: 'SMALL', order: 6 },
  ],
  produccion: [
    { key: 'mi_dia', size: 'MEDIUM', order: 0 },
    { key: 'proyectos_en_mi_etapa', size: 'MEDIUM', order: 1 },
    { key: 'proyectos_en_riesgo', size: 'MEDIUM', order: 2 },
    { key: 'capacidad_planta', size: 'LARGE', order: 3 },
    { key: 'calidad_pendiente', size: 'SMALL', order: 4 },
    { key: 'entregas_hoy', size: 'SMALL', order: 5 },
  ],
  planta: [
    { key: 'mi_dia', size: 'MEDIUM', order: 0 },
    { key: 'proyectos_en_mi_etapa', size: 'MEDIUM', order: 1 },
    { key: 'entregas_hoy', size: 'SMALL', order: 2 },
    { key: 'mis_tareas_resumen', size: 'SMALL', order: 3 },
  ],
  gerencia: [
    { key: 'meta_ventas', size: 'MEDIUM', order: 0 },
    { key: 'margen_real_mes', size: 'MEDIUM', order: 1 },
    { key: 'pipeline_resumen', size: 'LARGE', order: 2 },
    { key: 'rentabilidad_clientes', size: 'MEDIUM', order: 3 },
    { key: 'proyectos_en_riesgo', size: 'MEDIUM', order: 4 },
    { key: 'capacidad_planta', size: 'LARGE', order: 5 },
  ],
};

const memoryUserLayouts: Record<string, any[]> = {};
const memoryAuditLogs: any[] = [];

export interface MyDayTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'SIN_EMPEZAR' | 'INICIADA' | 'TERMINADA';
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  category: 'PROYECTO' | 'CRM' | 'EXTERNO' | 'PERSONAL' | 'LLAMADA' | 'GENERAL';
  projectName?: string;
  isCrmLinked: boolean;
  crmTaskId?: string;
  estimatedMinutes?: number;
  timeSlot?: string;
  order: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const memoryMyDayTasks: Record<string, MyDayTask[]> = {};

export function resetTransientHomeTasks(): void {
  for (const k in memoryMyDayTasks) {
    delete memoryMyDayTasks[k];
  }
}

function getOrCreateUserTasks(userId: string): MyDayTask[] {
  if (!memoryMyDayTasks[userId]) {
    // Copiar plantilla inicial para el nuevo usuario
    memoryMyDayTasks[userId] = (memoryMyDayTasks['default'] || []).map((t, idx) => ({
      ...t,
      id: `task-${userId}-${idx + 1}-${Date.now()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
  return memoryMyDayTasks[userId];
}

// Helper para extraer permisos del usuario
function getUserPermissions(req: any): string[] {
  const customPermsHeader = req.headers['x-user-permissions'];
  if (customPermsHeader) {
    try {
      return JSON.parse(customPermsHeader as string);
    } catch {
      // Ignorar error de parsing
    }
  }

  const role = (req.headers['x-user-role'] as string) || req.query.role || 'admin';
  const roleStr = String(role).toLowerCase();

  // Si el rol es admin o super_admin, tiene todos los permisos
  if (roleStr === 'admin' || roleStr === 'super_admin') {
    return ['*'];
  }

  // Permisos base de etapas previas según rol
  const basePerms: string[] = ['home:read', 'home:customize'];
  if (['comercial', 'supervisor', 'gerencia'].includes(roleStr)) {
    basePerms.push('opportunity:read', 'opportunity:write', 'quote:read', 'client:read');
  }
  if (['produccion', 'planta', 'supervisor', 'gerencia'].includes(roleStr)) {
    basePerms.push('production:read', 'production:write', 'inventory:read');
  }
  if (['gerencia'].includes(roleStr)) {
    basePerms.push('cost:read');
  }

  // Sumar permisos de colaboración declarados
  const collabPerms = SEED_ROLE_COLLABORATION_PERMISSIONS[roleStr] || [];
  return Array.from(new Set([...basePerms, ...collabPerms]));
}

// 1. OBTENER DISPOSICIÓN RESUELTA DEL HOME
homeRouter.get('/layout', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'current-user';
    const role = ((req.headers['x-user-role'] as string) || (req.query.role as string) || 'comercial').toLowerCase();
    const device = ((req.query.device as string) || 'DESKTOP').toUpperCase() as 'DESKTOP' | 'MOBILE' | 'KIOSK';

    const userPermissions = getUserPermissions(req);

    // Layout guardado del usuario (si existe)
    const userWidgets = memoryUserLayouts[userId] || null;
    const userLayout = userWidgets
      ? { scope: 'USER' as const, userId, widgets: userWidgets }
      : null;

    // Layout del rol del usuario
    const roleWidgets = memoryRoleLayouts[role] || (role === 'super_admin' ? memoryRoleLayouts.admin : null) || memoryRoleLayouts.admin || memoryRoleLayouts.comercial;
    const roleLayout = {
      scope: 'ROLE' as const,
      roleId: role,
      widgets: roleWidgets,
    };

    const allCatalog = getAllWidgets();

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [roleLayout],
      catalog: allCatalog,
      permissions: userPermissions,
      device,
      currentStage: '15.4',
    });

    // Enviar también catálogo permitido para el modal de "Agregar Widget"
    const allowedCatalog = allCatalog
      .filter((w) => userPermissions.includes('*') || w.requiredPermissions.every((p) => can(userPermissions, p)))
      .map((w) => ({
        key: w.key,
        title: w.title,
        description: w.description,
        category: w.category,
        defaultSize: w.defaultSize,
        availableFrom: w.availableFrom,
        isAvailable: w.availableFrom <= '15.4',
      }));

    return res.json({
      success: true,
      widgets: resolved,
      availableWidgets: allowedCatalog,
      isCustomized: !!userLayout,
      role,
      device,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. GUARDAR O RESTABLECER DISPOSICIÓN DEL USUARIO
homeRouter.put('/layout', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'current-user';
    const { widgets, resetToRole } = req.body;

    if (resetToRole) {
      delete memoryUserLayouts[userId];
      return res.json({ success: true, message: 'Disposición restablecida a la plantilla del rol' });
    }

    if (!Array.isArray(widgets)) {
      return res.status(400).json({ error: 'Formato de widgets inválido' });
    }

    memoryUserLayouts[userId] = widgets;
    return res.json({ success: true, message: 'Disposición guardada exitosamente' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. CONSULTA DE DATOS ESPECÍFICOS DE CADA WIDGET (con autorización estricta en servidor)
homeRouter.get('/widget-data/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const dateRange = (req.query.dateRange as string) || 'THIS_MONTH';
    const userPermissions = getUserPermissions(req);

    const widgetDef = WIDGET_CATALOG[key];
    if (!widgetDef) {
      return res.status(404).json({ error: 'Widget no encontrado en el catálogo' });
    }

    // SEGURIDAD ESTRICTA: El servidor nunca entrega datos de widgets no permitidos
    const hasPermission = widgetDef.requiredPermissions.every((perm) =>
      can(userPermissions, perm)
    );
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Acceso denegado: permisos insuficientes para este widget',
        requiredPermissions: widgetDef.requiredPermissions,
      });
    }

    // Marca temporal del corte precalculado o tiempo real
    const timestampCutoff =
      widgetDef.dataSource === 'LIVE_LIGHT'
        ? 'en tiempo real'
        : 'al corte de las 06:00 (métrica calculada)';

    const role = ((req.headers['x-user-role'] as string) || (req.query.role as string) || 'comercial').toLowerCase();

    // Generar datos específicos según widget
    const data = getWidgetPayload(key, dateRange, timestampCutoff, role, userPermissions);

    return res.json({
      success: true,
      key,
      timestamp: timestampCutoff,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. ACCIONES RÁPIDAS (Cierre de tarea en 1 clic desde mi_dia)
homeRouter.post('/actions/complete-task', async (req, res) => {
  const { taskId } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const tasks = getOrCreateUserTasks(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = 'TERMINADA';
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
  }
  return res.json({
    success: true,
    message: `Tarea #${taskId} completada exitosamente`,
    completedAt: new Date().toISOString(),
  });
});

// 4.1 TABLERO DE ORDEN DE MI DÍA (Casillas: Sin empezar, Iniciada, Terminada)
homeRouter.get('/my-day-board', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'default';
    const tasks = getOrCreateUserTasks(userId);

    const sinEmpezar = tasks.filter((t) => t.status === 'SIN_EMPEZAR').sort((a, b) => a.order - b.order);
    const iniciada = tasks.filter((t) => t.status === 'INICIADA').sort((a, b) => a.order - b.order);
    const terminada = tasks.filter((t) => t.status === 'TERMINADA').sort((a, b) => a.order - b.order);

    const total = tasks.length;
    const completedCount = terminada.length;
    const percentCompleted = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const highPriorityCount = tasks.filter((t) => t.priority === 'ALTA' && t.status !== 'TERMINADA').length;

    return res.json({
      success: true,
      tasks,
      columns: {
        sinEmpezar,
        iniciada,
        terminada,
      },
      summary: {
        total,
        sinEmpezarCount: sinEmpezar.length,
        iniciadaCount: iniciada.length,
        terminadaCount: terminada.length,
        percentCompleted,
        highPriorityCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

homeRouter.post('/my-day-board', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const {
      title,
      description,
      priority = 'MEDIA',
      status = 'SIN_EMPEZAR',
      category = 'GENERAL',
      projectName,
      isCrmLinked = false,
      crmTaskId,
      timeSlot,
      estimatedMinutes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título de la tarea es obligatorio' });
    }

    const tasks = getOrCreateUserTasks(userId);
    const sameStatusTasks = tasks.filter((t) => t.status === status);

    const newTask: MyDayTask = {
      id: `day-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      priority: priority as 'ALTA' | 'MEDIA' | 'BAJA',
      status: status as 'SIN_EMPEZAR' | 'INICIADA' | 'TERMINADA',
      category: category as any,
      projectName: projectName?.trim() || (isCrmLinked ? 'Proyecto CRM' : undefined),
      isCrmLinked: Boolean(isCrmLinked),
      crmTaskId: crmTaskId || undefined,
      timeSlot: timeSlot?.trim() || undefined,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      order: sameStatusTasks.length,
      completedAt: status === 'TERMINADA' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);

    return res.status(201).json({
      success: true,
      task: newTask,
      message: 'Tarea agregada al tablero de mi día',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

homeRouter.patch('/my-day-board/:id', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const { id } = req.params;
    const tasks = getOrCreateUserTasks(userId);
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = tasks[taskIndex];
    const previousStatus = task.status;
    const updates = req.body;

    if (updates.title !== undefined) task.title = String(updates.title).trim();
    if (updates.description !== undefined) task.description = updates.description ? String(updates.description).trim() : undefined;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.category !== undefined) task.category = updates.category;
    if (updates.projectName !== undefined) task.projectName = updates.projectName ? String(updates.projectName).trim() : undefined;
    if (updates.isCrmLinked !== undefined) task.isCrmLinked = Boolean(updates.isCrmLinked);
    if (updates.timeSlot !== undefined) task.timeSlot = updates.timeSlot ? String(updates.timeSlot).trim() : undefined;
    if (updates.estimatedMinutes !== undefined) task.estimatedMinutes = updates.estimatedMinutes ? Number(updates.estimatedMinutes) : undefined;
    if (updates.order !== undefined) task.order = Number(updates.order);

    if (updates.status !== undefined && updates.status !== previousStatus) {
      task.status = updates.status;
      if (updates.status === 'TERMINADA') {
        task.completedAt = new Date().toISOString();
      } else if (previousStatus === 'TERMINADA') {
        task.completedAt = null;
      }
    }

    task.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      task,
      message: 'Tarea actualizada',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

homeRouter.delete('/my-day-board/:id', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const { id } = req.params;
    const tasks = getOrCreateUserTasks(userId);
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    tasks.splice(taskIndex, 1);
    return res.json({ success: true, message: 'Tarea eliminada de mi día' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

homeRouter.post('/my-day-board/clear-completed', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const tasks = getOrCreateUserTasks(userId);
    const remaining = tasks.filter((t) => t.status !== 'TERMINADA');
    memoryMyDayTasks[userId] = remaining;

    return res.json({
      success: true,
      message: 'Tareas terminadas archivadas/removidas del día',
      remainingCount: remaining.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

homeRouter.post('/my-day-board/import-crm', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const tasks = getOrCreateUserTasks(userId);

    // Tareas sugeridas del CRM
    const crmSuggestions = [
      {
        title: 'Llamar a Gerencia de Diseños Urbanos (Cotización #1204)',
        description: 'Seguimiento prioritario de propuesta comercial enviada hace 48h.',
        priority: 'ALTA' as const,
        category: 'CRM' as const,
        projectName: 'Cotizaciones Activas',
        isCrmLinked: true,
        timeSlot: '11:30 AM',
        estimatedMinutes: 20,
      },
      {
        title: 'Verificar especificaciones técnicas aviso acrílico termoformado',
        description: 'Revisión en taller con equipo de Router CNC antes de corte final.',
        priority: 'MEDIA' as const,
        category: 'PROYECTO' as const,
        projectName: 'Producción Letreros Corp',
        isCrmLinked: true,
        timeSlot: '02:15 PM',
        estimatedMinutes: 30,
      },
    ];

    let importedCount = 0;
    crmSuggestions.forEach((sugg) => {
      const exists = tasks.some((t) => t.title.toLowerCase() === sugg.title.toLowerCase());
      if (!exists) {
        tasks.push({
          id: `crm-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          title: sugg.title,
          description: sugg.description,
          priority: sugg.priority,
          status: 'SIN_EMPEZAR',
          category: sugg.category,
          projectName: sugg.projectName,
          isCrmLinked: true,
          timeSlot: sugg.timeSlot,
          estimatedMinutes: sugg.estimatedMinutes,
          order: tasks.filter((t) => t.status === 'SIN_EMPEZAR').length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      }
    });

    return res.json({
      success: true,
      importedCount,
      message: `${importedCount} tareas importadas del CRM a "Sin empezar"`,
      tasks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. ADMINISTRACIÓN DE PLANTILLAS POR ROL (Ruta /admin/home)
homeRouter.get('/admin/role-layouts', async (req, res) => {
  const userPermissions = getUserPermissions(req);
  if (!can(userPermissions, 'home:manage_role_layouts')) {
    return res.status(403).json({ error: 'Requiere permiso home:manage_role_layouts' });
  }

  return res.json({
    success: true,
    layouts: memoryRoleLayouts,
    userCountsByRole: {
      admin: 2,
      comercial: 8,
      produccion: 14,
      planta: 22,
      gerencia: 3,
      supervisor: 4,
    },
  });
});

homeRouter.put('/admin/role-layouts/:roleId', async (req, res) => {
  const userPermissions = getUserPermissions(req);
  if (!can(userPermissions, 'home:manage_role_layouts')) {
    return res.status(403).json({ error: 'Requiere permiso home:manage_role_layouts' });
  }

  const { roleId } = req.params;
  const { widgets, forceToAll } = req.body;

  if (!Array.isArray(widgets)) {
    return res.status(400).json({ error: 'Lista de widgets inválida' });
  }

  memoryRoleLayouts[roleId] = widgets;

  if (forceToAll) {
    // Borrar personalizaciones de usuarios y registrar en AuditLog
    const deletedCount = Object.keys(memoryUserLayouts).length;
    for (const key of Object.keys(memoryUserLayouts)) {
      delete memoryUserLayouts[key];
    }
    memoryAuditLogs.push({
      action: 'HOME_ROLE_LAYOUT_FORCED',
      roleId,
      timestamp: new Date().toISOString(),
      details: `Disposición de rol ${roleId} forzada a todos los usuarios. Personalizaciones restablecidas: ${deletedCount}`,
    });
  }

  return res.json({
    success: true,
    message: `Plantilla para el rol ${roleId} actualizada exitosamente.`,
    forcedToAll: !!forceToAll,
  });
});

// ============================================================================
// GENERADOR DE DATOS DE WIDGETS
// ============================================================================
function getWidgetPayload(
  key: string,
  dateRange: string,
  timestamp: string,
  role = 'comercial',
  userPermissions: string[] = []
): any {
  switch (key) {
    case 'cumplimiento_tareas': {
      const windowDays = dateRange === '30D' ? 30 : dateRange === '14D' ? 14 : 7;
      const windowStart = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
      const result = computeTaskCompliance({
        tasks: [],
        windowStart,
        windowEnd: new Date(),
        now: new Date(),
        config: { greenThreshold: 85, amberThreshold: 70, graceHours: 4, excludeAutomationTasks: false },
      });
      return {
        ...result,
        totalTasks: 0,
        windowDays,
      };
    }

    case 'mi_capacidad': {
      const isProduction = ['produccion', 'planta'].includes(role);
      if (isProduction) {
        const capacity = computeCapacity({
          availableHours: 40,
          loggedHours: 0,
          downtimeHours: 0,
          setupHours: 0,
          standardSetupHours: 0,
          standardHoursEarned: 0,
          presentDays: 0,
          downtimeReasons: [],
          unregisteredDaysDetails: [],
        });
        return {
          isProductionRole: true,
          ...capacity,
          roleTitle: 'Planta / Operaciones',
        };
      } else {
        return {
          isProductionRole: false,
          roleTitle: 'Ventas y Relación Comercial',
          goalTitle: 'Meta Comercial Mensual',
          targetValue: 0,
          actualValue: 0,
          attainmentPercent: 0,
          pacePercent: 0,
          paceStatus: 'ON_TRACK',
          quotesSent: 0,
          visitsCompleted: 0,
          explanation: [
            'Sin actividad comercial o metas registradas en el período actual.',
          ],
        };
      }
    }

    case 'cumplimiento_equipo': {
      if (!can(userPermissions, 'performance:read_team') && !can(userPermissions, 'admin:access')) {
        return {
          unauthorized: true,
          message: 'No cuenta con permiso performance:read_team para ver el rendimiento del equipo.',
        };
      }

      return {
        teamCompliancePercent: 100,
        teamLevel: 'GREEN',
        totalMembers: 0,
        distribution: { green: 0, amber: 0, red: 0 },
        members: [],
        explanation: [
          'Sin tareas pendientes en el equipo para el período seleccionado.',
        ],
      };
    }
    case 'mi_dia': {
      const allTasks = memoryMyDayTasks['default'] || [];
      const sinEmpezar = allTasks.filter((t) => t.status === 'SIN_EMPEZAR');
      const iniciadas = allTasks.filter((t) => t.status === 'INICIADA');
      const terminadas = allTasks.filter((t) => t.status === 'TERMINADA');

      const pendingTasks = [...iniciadas, ...sinEmpezar].map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        category: t.category,
        projectName: t.projectName,
        dueTime: t.timeSlot || 'Hoy',
        isOverdue: false,
      }));

      return {
        pendingTasks,
        columnsSummary: {
          sinEmpezarCount: sinEmpezar.length,
          iniciadaCount: iniciadas.length,
          terminadaCount: terminadas.length,
          total: allTasks.length,
          percentCompleted: allTasks.length > 0 ? Math.round((terminadas.length / allTasks.length) * 100) : 0,
        },
        nextMeeting: null,
      };
    }

    case 'mis_tareas_resumen':
      return {
        totalPending: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        dueThisWeekCount: 0,
        byPriority: { ALTA: 0, MEDIA: 0, BAJA: 0 },
      };

    case 'mi_agenda':
      return {
        meetings: [],
      };

    case 'mis_anclados':
      return {
        items: [],
      };

    case 'mis_notificaciones':
      return {
        notifications: [],
      };

    case 'atajos':
      return {
        shortcuts: [
          { id: 'sh-1', label: 'Nueva Cotización', route: '/dashboard/cotizador', icon: 'FileText' },
          { id: 'sh-2', label: 'Nuevo Cliente', route: '/dashboard/clientes', icon: 'Users' },
          { id: 'sh-3', label: 'Tablero Producción', route: '/dashboard/produccion', icon: 'Play' },
          { id: 'sh-4', label: 'Bandeja de Entrada', route: '/dashboard/inbox', icon: 'MessageCircle' },
        ],
      };

    case 'meta_ventas':
      return {
        monthlyTarget: 0,
        currentActual: 0,
        expectedPace: 0,
        actualPercent: 0,
        expectedPercent: 0,
        paceStatus: 'ON_TRACK',
        daysRemaining: 0,
      };

    case 'pipeline_resumen':
      return {
        totalPipelineValue: 0,
        weightedValue: 0,
        totalDealsCount: 0,
        stages: [
          { stage: 'Prospección', count: 0, value: 0 },
          { stage: 'Cotizado', count: 0, value: 0 },
          { stage: 'Negociación', count: 0, value: 0 },
          { stage: 'Cierre', count: 0, value: 0 },
        ],
      };

    case 'cotizaciones_sin_seguimiento':
      return {
        items: [],
      };

    case 'oportunidades_estancadas':
      return {
        count: 0,
        items: [],
      };

    case 'clientes_calientes':
      return {
        clients: [],
      };

    case 'actividad_semana':
      return {
        calls: 0,
        emails: 0,
        whatsapps: 0,
        visits: 0,
        trendVsLastWeek: '0%',
      };

    case 'conversion_embudo':
      return {
        leadToQuote: '0%',
        quoteToNegotiation: '0%',
        negotiationToClosed: '0%',
        overallConversion: '0%',
      };

    case 'proyectos_en_mi_etapa':
      return {
        count: 0,
        projects: [],
      };

    case 'proyectos_en_riesgo':
      return {
        count: 0,
        projects: [],
      };

    case 'capacidad_planta':
      return {
        bottleneck: 'Sin sobrecarga de capacidad',
        bottleneckUtilization: 0,
        machines: [
          { name: 'Cama Plana UV Arizona', utilization: 0, isBottleneck: false },
          { name: 'Plotter Roland TrueVIS', utilization: 0, isBottleneck: false },
          { name: 'Mesa de Corte CNC Zünd', utilization: 0, isBottleneck: false },
          { name: 'Láser Fibra Óptica', utilization: 0, isBottleneck: false },
        ],
      };

    case 'calidad_pendiente':
      return {
        pendingCount: 0,
        items: [],
      };

    case 'desperdicio_semana':
      return {
        actualWastePercent: 0,
        expectedWastePercent: 0,
        variance: '0%',
        primaryCause: 'Sin desperdicios registrados en el período',
      };

    case 'entregas_hoy':
      return {
        scheduledToday: 0,
        delivered: 0,
        pending: 0,
        nextDelivery: 'Sin entregas programadas hoy',
      };

    case 'margen_real_mes':
      return {
        quotedMargin: 0,
        actualMargin: 0,
        deviation: 0,
        varianceReason: 'Sin operaciones de producción en el período',
      };

    case 'proyectos_sin_costos':
      return {
        count: 0,
        projects: [],
      };

    case 'rentabilidad_clientes':
      return {
        topProfitable: [],
        leastProfitable: [],
      };

    case 'alertas_criticas':
      return {
        alerts: [],
      };

    case 'calidad_datos':
      return {
        openIssuesCount: 0,
        byType: {
          NIT_INVALIDO: 0,
          CLIENTE_DUPLICADO: 0,
          DIRECCION_INCOMPLETA: 0,
        },
      };

    case 'salud_integraciones':
      return {
        integrations: [
          { name: 'WhatsApp Cloud API', status: 'ONLINE', latency: '120ms', lastPulse: 'Hace 10s' },
          { name: 'Google Drive Archivos', status: 'ONLINE', latency: '240ms', lastPulse: 'Hace 1m' },
          { name: 'Odoo ERP Sync', status: 'ONLINE', latency: '410ms', lastPulse: 'Hace 45s' },
        ],
      };

    case 'tablero_anuncios': {
      const published = inMemoryAnnouncements
        .filter((a) => a.status === 'PUBLISHED')
        .sort((x, y) => {
          if (x.isPinned && !y.isPinned) return -1;
          if (!x.isPinned && y.isPinned) return 1;
          return new Date(y.publishedAt || 0).getTime() - new Date(x.publishedAt || 0).getTime();
        })
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: a.title,
          summary: a.summary || a.title,
          type: a.type,
          priority: a.priority,
          isPinned: a.isPinned,
          authorName: a.authorName,
          publishedAt: a.publishedAt,
          requiresAcknowledgement: a.requiresAcknowledgement,
          commentsCount: a.comments.length,
          reactionsCount: a.reactions.length,
        }));

      return {
        totalPublished: inMemoryAnnouncements.filter((a) => a.status === 'PUBLISHED').length,
        announcements: published,
      };
    }

    case 'anuncios_sin_confirmar': {
      // Anuncios obligatorios pendientes de acuse
      const activeUser = employeeService.getActiveUser();
      const currentUserId = activeUser.id || 'emp-03';
      const pending = inMemoryAnnouncements.filter((a) => {
        if (a.status !== 'PUBLISHED' || !a.requiresAcknowledgement) return false;
        const receipt = a.receipts.find((r) => r.userId === currentUserId);
        return !receipt || !receipt.acknowledgedAt;
      });

      return {
        pendingCount: pending.length,
        hasPending: pending.length > 0,
        items: pending.map((p) => ({
          id: p.id,
          title: p.title,
          priority: p.priority,
          type: p.type,
          publishedAt: p.publishedAt,
          authorName: p.authorName,
        })),
      };
    }

    case 'reconocimientos': {
      const shoutouts = inMemoryShoutouts.slice(0, 4).map((s) => ({
        id: s.id,
        fromUserName: s.fromUserName,
        toUserNames: s.toUserNames,
        message: s.message,
        valueKey: s.valueKey,
        createdAt: s.createdAt,
        reactionsCount: s.reactions.length,
      }));

      return {
        totalShoutouts: inMemoryShoutouts.length,
        shoutouts,
      };
    }

    case 'mis_menciones': {
      // Mensajes donde el usuario fue mencionado o @canal / @aquí
      const currentUserId = employeeService.getActiveUser().id || 'emp-03';
      const mentionMsgs = inMemoryMessages.filter(
        (m) => (m.mentionedUserIds && m.mentionedUserIds.includes(currentUserId)) || m.mentionsEveryone
      );

      const items = mentionMsgs.slice(-5).reverse().map((m) => {
        const channel = inMemoryChannels.find((c) => c.id === m.channelId);
        return {
          messageId: m.id,
          channelId: m.channelId,
          channelName: channel?.name || 'Canal',
          channelType: channel?.type,
          authorName: m.authorName,
          bodySnippet: m.bodyPlain.length > 70 ? `${m.bodyPlain.substring(0, 70)}...` : m.bodyPlain,
          createdAt: m.createdAt,
        };
      });

      return {
        unreadCount: items.length,
        items,
      };
    }

    case 'equipo_presencia': {
      const presences = Object.values(inMemoryPresences);
      const directory = getUserDirectory();
      const team = directory.map((u) => {
        const p = inMemoryPresences[u.id];
        return {
          userId: u.id,
          name: u.name,
          role: u.role,
          area: u.area,
          status: p?.status || 'OFFLINE',
          customStatusEmoji: p?.customStatusEmoji || null,
          customStatusText: p?.customStatusText || null,
          isWorkingHours: p?.isWorkingHours ?? true,
        };
      });

      const onlineCount = team.filter((t) => t.status === 'ONLINE').length;
      const awayCount = team.filter((t) => t.status === 'AWAY').length;
      const busyCount = team.filter((t) => t.status === 'BUSY' || t.status === 'IN_CALL').length;
      const offlineCount = team.filter((t) => t.status === 'OFFLINE').length;

      return {
        team,
        summary: {
          onlineCount,
          awayCount,
          busyCount,
          offlineCount,
          total: team.length,
        },
      };
    }

    default:
      return {};
  }
}
