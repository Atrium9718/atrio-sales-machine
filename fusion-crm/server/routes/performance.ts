import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { can, SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../packages/core/src/auth/permissions';
import { computeTaskCompliance } from '../../packages/core/src/performance/task-compliance';
import { computeCapacity } from '../../packages/core/src/performance/capacity';
import { calculateGoalPace } from '../../packages/core/src/performance/goal-pace';
import { COLLABORATION_SCHEDULED_JOBS } from '../../packages/jobs/src/jobs/collaborationJobs';
import { employeeService } from '../services/employeeService';

const prisma = new PrismaClient();
export const performanceRouter = Router();
export const goalsRouter = Router();

// Helper de permisos
function extractUserPermissions(req: any): { userId: string; role: string; permissions: string[] } {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'current-user';
  const role = ((req.headers['x-user-role'] as string) || (req.query.role as string) || 'comercial').toLowerCase();

  const customPermsHeader = req.headers['x-user-permissions'];
  if (customPermsHeader) {
    try {
      return { userId, role, permissions: JSON.parse(customPermsHeader as string) };
    } catch {}
  }

  if (role === 'admin' || role === 'super_admin') {
    return { userId, role, permissions: ['*'] };
  }

  const basePerms = ['home:read', 'home:customize', 'performance:read_own'];
  if (['comercial', 'supervisor', 'gerencia'].includes(role)) {
    basePerms.push('opportunity:read', 'goal:read');
  }
  if (['supervisor', 'gerencia'].includes(role)) {
    basePerms.push('performance:read_team', 'goal:create', 'goal:update');
  }

  const collabPerms = SEED_ROLE_COLLABORATION_PERMISSIONS[role] || [];
  return {
    userId,
    role,
    permissions: Array.from(new Set([...basePerms, ...collabPerms])),
  };
}

// ============================================================================
// METAS (GOALS) CRUD Y CÁLCULO DE RITMO
// ============================================================================

// Memoria de metas vinculadas a la SSOT de colaboradores (inicia vacía en estado limpio)
export let memoryGoals: any[] = [];

// GET /api/goals: Listar metas con ritmo de avance calculado
goalsRouter.get('/', async (req, res) => {
  try {
    const { permissions } = extractUserPermissions(req);
    const scopeFilter = req.query.scope as string;
    const periodFilter = req.query.period as string;

    const now = new Date();
    const enriched = memoryGoals.map((goal) => {
      const pace = calculateGoalPace({
        targetValue: goal.targetValue,
        actualValue: goal.actualValue,
        periodStart: new Date(goal.periodStart),
        periodEnd: new Date(goal.periodEnd),
        asOfDate: now,
        direction: goal.direction,
      });

      return {
        ...goal,
        pace,
      };
    });

    let filtered = enriched;
    if (scopeFilter && scopeFilter !== 'ALL') {
      filtered = filtered.filter((g) => g.scope === scopeFilter);
    }
    if (periodFilter && periodFilter !== 'ALL') {
      filtered = filtered.filter((g) => g.period === periodFilter);
    }

    return res.json({ success: true, goals: filtered });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/goals: Crear nueva meta
goalsRouter.post('/', async (req, res) => {
  try {
    const { permissions } = extractUserPermissions(req);
    if (!can(permissions, 'goal:create') && !can(permissions, 'admin:access')) {
      return res.status(403).json({ success: false, error: 'No tiene permiso para crear metas (goal:create requerido).' });
    }

    const {
      title,
      scope,
      metricKey,
      targetValue,
      period,
      periodStart,
      periodEnd,
      direction = 'HIGHER_IS_BETTER',
      ownerUserId,
      ownerName,
      areaKey,
      machineId,
    } = req.body;

    if (!title || !targetValue || !periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios para la meta.' });
    }

    const newGoal = {
      id: `goal-${Date.now()}`,
      organizationId: 'org-demo',
      title,
      scope: scope || 'ORGANIZATION',
      metricKey: metricKey || 'custom.metric',
      targetValue: Number(targetValue),
      actualValue: 0,
      period: period || 'MONTH',
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      direction,
      ownerUserId,
      ownerName: ownerName || 'Sin asignar',
      areaKey,
      machineId,
      isActive: true,
      createdAt: new Date(),
    };

    memoryGoals.unshift(newGoal);

    return res.status(201).json({ success: true, goal: newGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/goals/:id: Actualizar meta o registrar progreso manual
goalsRouter.put('/:id', async (req, res) => {
  try {
    const { permissions } = extractUserPermissions(req);
    if (!can(permissions, 'goal:update') && !can(permissions, 'admin:access')) {
      return res.status(403).json({ success: false, error: 'No tiene permiso para editar metas (goal:update requerido).' });
    }

    const { id } = req.params;
    const index = memoryGoals.findIndex((g) => g.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Meta no encontrada.' });
    }

    const updated = {
      ...memoryGoals[index],
      ...req.body,
      targetValue: req.body.targetValue !== undefined ? Number(req.body.targetValue) : memoryGoals[index].targetValue,
      actualValue: req.body.actualValue !== undefined ? Number(req.body.actualValue) : memoryGoals[index].actualValue,
      updatedAt: new Date(),
    };

    memoryGoals[index] = updated;

    return res.json({ success: true, goal: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/goals/trigger-rollup: Ejecutar job horario de metas a petición
goalsRouter.post('/trigger-rollup', async (req, res) => {
  try {
    await COLLABORATION_SCHEDULED_JOBS['goals:rollup'].handler();
    return res.json({ success: true, message: 'Rollup de metas completado con éxito.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// RENDIMIENTO INDIVIDUAL Y DE EQUIPO (PERFORMANCE)
// ============================================================================

// GET /api/performance/me: Rendimiento personal
performanceRouter.get('/me', async (req, res) => {
  try {
    const { userId, role, permissions } = extractUserPermissions(req);
    if (!can(permissions, 'performance:read_own') && !can(permissions, 'admin:access')) {
      return res.status(403).json({ success: false, error: 'No tiene permiso para ver su rendimiento.' });
    }

    const now = new Date();
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const windowEnd = now;

    // Cálculo de tareas (inicia en 0 al no haber iniciado operaciones)
    const mockTasks: any[] = [];

    const taskCompliance = computeTaskCompliance({
      tasks: mockTasks,
      windowStart,
      windowEnd,
      now,
      config: {
        greenThreshold: 85,
        amberThreshold: 70,
        graceHours: 4,
        excludeAutomationTasks: false,
      },
    });

    // Capacidad según rol (inicia limpio en 0 horas registradas)
    const isProductionRole = ['produccion', 'planta'].includes(role);
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

    // Metas del usuario
    const myGoals = memoryGoals.filter(
      (g) => g.ownerUserId === userId || g.scope === 'ORGANIZATION'
    );

    return res.json({
      success: true,
      role,
      isProductionRole,
      taskCompliance,
      capacity,
      goals: myGoals,
      dailyTrend: [],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/performance/team: Rendimiento consolidado de equipo (PROTEGIDO)
performanceRouter.get('/team', async (req, res) => {
  try {
    const { permissions, role } = extractUserPermissions(req);

    // Verificación estricta de privacidad en el servidor
    if (!can(permissions, 'performance:read_team') && !can(permissions, 'admin:access')) {
      return res.status(403).json({
        success: false,
        error: 'Privacidad protegida: no tiene permiso para ver el rendimiento de otros colaboradores o del equipo (performance:read_team requerido).',
      });
    }

    const employees = employeeService.getEmployees();
    const teamMembers = employees.map((emp) => {
      return {
        id: emp.id,
        name: emp.name,
        role: emp.jobTitle || emp.roleName,
        area: emp.area || 'Operaciones',
        compliancePercent: 0,
        level: 'GREEN',
        utilizationPercent: 0,
        capacityLevel: 'HEALTHY',
        unregisteredHours: 0,
        tasksDue: 0,
        tasksOnTime: 0,
        explanation: 'Sin registros operativos ni tareas en el período inicial.',
      };
    });

    const total = teamMembers.length || 0;

    return res.json({
      success: true,
      summary: {
        totalMembers: total,
        avgCompliance: 0,
        avgUtilization: 0,
        distribution: {
          green: 0,
          amber: 0,
          red: 0,
        },
        overloadedCount: 0,
        unregisteredTotalHours: 0,
      },
      members: teamMembers,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
