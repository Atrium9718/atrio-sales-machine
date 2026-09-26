import { Router, Request, Response } from 'express';
import { can } from '../../packages/core/src/auth/permissions';
import {
  QueueAgentCandidate,
  QueueStrategyType,
  calculateServiceLevel,
  calculateEstimatedWaitTime,
  shouldAutoBreakAgent,
  canBounceToAnotherQueue,
} from '../../packages/core/src/voice/queueStrategies';
import { inMemoryAuditLogs } from '../services/callsService';
import { employeeService } from '../services/employeeService';

export const voiceQueueRouter = Router();

// Helper para autenticación y permisos
function resolveAuth(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || 'user_cristian_comercial';
  const role = (req.headers['x-user-role'] as string) || 'admin';
  const permissionsHeader = req.headers['x-user-permissions'] as string;
  let permissions: string[] = ['*'];

  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch {
      permissions = permissionsHeader.split(',').map((p) => p.trim());
    }
  } else if (role === 'admin' || role === 'super_admin' || userId === 'emp-03' || userId === 'user_cristian_comercial') {
    permissions = ['*'];
  }

  return {
    userId,
    role,
    permissions,
    hasVoiceUse: can(permissions, 'voice:use'),
    hasManageQueues: can(permissions, 'voice:manage_queues') || permissions.includes('*'),
    hasSupervise: can(permissions, 'voice:supervise') || permissions.includes('*'),
    hasDeleteRecording: can(permissions, 'voice:delete_recording') || permissions.includes('*'),
  };
}

// ----------------------------------------------------------------------------
// MODELOS EN MEMORIA (DECISIÓN 3: Colas en CRM / PostgreSQL, NO app_queue)
// ----------------------------------------------------------------------------

export interface QueueMemberData {
  id: string;
  userId: string;
  name: string;
  extension: string;
  penalty: number;
  skills: string[];
  isActive: boolean;
}

export interface VoiceQueueData {
  id: string;
  organizationId: string;
  name: string;
  extension: string;
  strategy: QueueStrategyType;
  ringSeconds: number;
  wrapUpSeconds: number;
  maxWaitSeconds: number;
  maxCallers: number;
  announcePositionEverySeconds: number;
  announceHoldTime: boolean;
  musicOnHold: string;
  greetingPromptId?: string;
  periodicPromptId?: string;
  overflowTarget: 'VOICEMAIL' | 'ANOTHER_QUEUE' | 'EXTERNAL_NUMBER' | 'AI_AGENT' | 'HANGUP_WITH_MESSAGE';
  overflowTargetId?: string;
  overflowAssigneeName?: string;
  exitKey: string;
  isActive: boolean;
  members: QueueMemberData[];
  createdAt: string;
  updatedAt: string;
}

export interface LiveWaitingCaller {
  callId: string;
  channelId: string;
  queueId: string;
  fromNumber: string;
  callerName: string | null;
  enteredAt: string;
  waitSeconds: number;
  position: number;
  estimatedWaitMinutes: number;
  isVirtualCallback: boolean;
}

export interface AgentRealtimeStatus {
  userId: string;
  name: string;
  extension: string;
  role: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
  since: string;
  timeInStateSeconds: number;
  reason?: string;
  currentCallId?: string;
  currentCallerNumber?: string;
  callsHandledToday: number;
  wrapUpSecondsRemaining?: number;
  consecutiveMissedCalls: number;
}

export interface VoicemailItem {
  id: string;
  organizationId: string;
  callId: string;
  queueId?: string;
  queueName?: string;
  extension?: string;
  fromNumber: string;
  callerName?: string;
  durationSeconds: number;
  transcriptText: string;
  status: 'NEW' | 'HEARD' | 'RETURNED' | 'ARCHIVED';
  createdAt: string;
  heardAt?: string;
  heardById?: string;
  returnedCallId?: string;
  returnedAt?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  reassignmentNotes?: string[];
  dueDate: string; // 4 horas hábiles
}

// Semillas iniciales del CRM
let inMemoryQueues: VoiceQueueData[] = [
  {
    id: 'queue_ventas_01',
    organizationId: 'org_default',
    name: 'Ventas y Comercial',
    extension: '801',
    strategy: 'ROUND_ROBIN',
    ringSeconds: 20,
    wrapUpSeconds: 10,
    maxWaitSeconds: 180,
    maxCallers: 15,
    announcePositionEverySeconds: 45,
    announceHoldTime: true,
    musicOnHold: 'jazz_suave',
    greetingPromptId: 'prompt_saludo_ventas',
    periodicPromptId: 'prompt_whatsapp_promo',
    overflowTarget: 'VOICEMAIL',
    overflowTargetId: 'queue_ventas_01',
    overflowAssigneeName: 'Ana María Gómez (Líder Ventas)',
    exitKey: '9',
    isActive: true,
    members: [
      { id: 'm1', userId: 'usr_cristian', name: 'Cristian Silva', extension: '101', penalty: 0, skills: ['ventas', 'cotizaciones', 'vip'], isActive: true },
      { id: 'm2', userId: 'usr_ana', name: 'Ana Gómez', extension: '102', penalty: 0, skills: ['ventas', 'grandes_cuentas'], isActive: true },
      { id: 'm3', userId: 'usr_felipe', name: 'Felipe Correa', extension: '103', penalty: 1, skills: ['ventas_junior'], isActive: true },
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'queue_servicio_02',
    organizationId: 'org_default',
    name: 'Servicio al Cliente y Despachos',
    extension: '802',
    strategy: 'FEWEST_CALLS',
    ringSeconds: 20,
    wrapUpSeconds: 15,
    maxWaitSeconds: 240,
    maxCallers: 20,
    announcePositionEverySeconds: 30,
    announceHoldTime: true,
    musicOnHold: 'ambient_relax',
    greetingPromptId: 'prompt_saludo_servicio',
    overflowTarget: 'EXTERNAL_NUMBER',
    overflowTargetId: '3009876543',
    overflowAssigneeName: 'Celular Jefe de Despachos',
    exitKey: '9',
    isActive: true,
    members: [
      { id: 'm4', userId: 'usr_marcela', name: 'Marcela Ríos', extension: '104', penalty: 0, skills: ['despachos', 'facturacion'], isActive: true },
      { id: 'm5', userId: 'usr_camilo', name: 'Camilo Torres', extension: '105', penalty: 0, skills: ['reclamos', 'logistica'], isActive: true },
    ],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'queue_preprensa_03',
    organizationId: 'org_default',
    name: 'Soporte Técnico y Preprensa',
    extension: '803',
    strategy: 'SKILL_BASED',
    ringSeconds: 25,
    wrapUpSeconds: 20,
    maxWaitSeconds: 300,
    maxCallers: 10,
    announcePositionEverySeconds: 60,
    announceHoldTime: false,
    musicOnHold: 'default',
    overflowTarget: 'AI_AGENT',
    overflowTargetId: 'agent_gemini_tecnico',
    overflowAssigneeName: 'Asistente de Voz IA Preprensa',
    exitKey: '9',
    isActive: true,
    members: [
      { id: 'm6', userId: 'usr_diego', name: 'Diego Rendón', extension: '106', penalty: 0, skills: ['cmyk', 'troqueles', 'preprensa'], isActive: true },
    ],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryLiveCallers: LiveWaitingCaller[] = [];

let inMemoryAgentStatuses: AgentRealtimeStatus[] = [];

let inMemoryVoicemails: VoicemailItem[] = [];

// Métricas de desempeño de colas (inician en 0 al no haber llamadas)
const queueStatsMap = new Map<string, { answeredToday: number; abandonedToday: number; targetSlaSeconds: number; slaPercentage: number }>();
queueStatsMap.set('queue_ventas_01', { answeredToday: 0, abandonedToday: 0, targetSlaSeconds: 20, slaPercentage: 100 });
queueStatsMap.set('queue_servicio_02', { answeredToday: 0, abandonedToday: 0, targetSlaSeconds: 20, slaPercentage: 100 });
queueStatsMap.set('queue_preprensa_03', { answeredToday: 0, abandonedToday: 0, targetSlaSeconds: 25, slaPercentage: 100 });

// ----------------------------------------------------------------------------
// ENDPOINTS DE COLAS (BLOQUE A Y B)
// ----------------------------------------------------------------------------

/**
 * GET /api/voice/queues
 * Lista todas las colas de atención con estadísticas en tiempo real y semáforos de espera.
 */
voiceQueueRouter.get('/queues', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasVoiceUse) {
    return res.status(403).json({ error: 'Permiso voice:use requerido' });
  }

  const now = Date.now();

  const response = inMemoryQueues.map((q) => {
    const waiting = inMemoryLiveCallers.filter((c) => c.queueId === q.id);
    const memberIds = q.members.map((m) => m.userId);
    const memberAgents = inMemoryAgentStatuses.filter((a) => memberIds.includes(a.userId));

    const connectedAgents = memberAgents.filter((a) => a.status !== 'OFFLINE');
    const availableAgents = memberAgents.filter((a) => a.status === 'AVAILABLE');
    const onCallAgents = memberAgents.filter((a) => a.status === 'ON_CALL');

    let longestWaitSeconds = 0;
    if (waiting.length > 0) {
      longestWaitSeconds = Math.max(
        ...waiting.map((w) => Math.round((now - new Date(w.enteredAt).getTime()) / 1000))
      );
    }

    // Semáforo de espera: verde (<60s), amarillo (60-180s), rojo (>180s)
    let waitTrafficLight: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (longestWaitSeconds > 180) waitTrafficLight = 'RED';
    else if (longestWaitSeconds >= 60) waitTrafficLight = 'YELLOW';

    const stats = queueStatsMap.get(q.id) || {
      answeredToday: 10,
      abandonedToday: 1,
      targetSlaSeconds: 20,
      slaPercentage: 90.0,
    };

    return {
      ...q,
      waitingCallsCount: waiting.length,
      longestWaitSeconds,
      waitTrafficLight,
      agentsConnectedCount: connectedAgents.length,
      agentsAvailableCount: availableAgents.length,
      agentsOnCallCount: onCallAgents.length,
      answeredToday: stats.answeredToday,
      abandonedToday: stats.abandonedToday,
      targetSlaSeconds: stats.targetSlaSeconds,
      serviceLevelPercentage: stats.slaPercentage,
      previewSummary: generateQueuePreviewText(q),
    };
  });

  res.json({ success: true, queues: response });
});

/**
 * GET /api/voice/queues/:id/live
 * Devuelve el estado en vivo de una cola específica: lista de llamadas esperando y agentes asignados.
 */
voiceQueueRouter.get('/queues/:id/live', (req: Request, res: Response) => {
  const { id } = req.params;
  const queue = inMemoryQueues.find((q) => q.id === id);
  if (!queue) {
    return res.status(404).json({ error: 'Cola no encontrada' });
  }

  const now = Date.now();
  const waitingCalls = inMemoryLiveCallers
    .filter((c) => c.queueId === id)
    .map((w) => ({
      ...w,
      waitSeconds: Math.round((now - new Date(w.enteredAt).getTime()) / 1000),
    }));

  const memberIds = queue.members.map((m) => m.userId);
  const queueAgents = inMemoryAgentStatuses
    .filter((a) => memberIds.includes(a.userId))
    .map((a) => {
      const memberConfig = queue.members.find((m) => m.userId === a.userId);
      return {
        ...a,
        penalty: memberConfig?.penalty || 0,
        skills: memberConfig?.skills || [],
        timeInStateSeconds: Math.round((now - new Date(a.since).getTime()) / 1000),
      };
    });

  res.json({
    success: true,
    queueId: id,
    queueName: queue.name,
    waitingCalls,
    agents: queueAgents,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/voice/queues
 * Crear o actualizar configuración de una cola (exige voice:manage_queues).
 */
voiceQueueRouter.post('/queues', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasManageQueues) {
    return res.status(403).json({ error: 'Permiso voice:manage_queues requerido para configurar colas' });
  }

  const data = req.body as Partial<VoiceQueueData>;
  if (!data.name || !data.strategy) {
    return res.status(400).json({ error: 'Nombre y estrategia de cola son obligatorios' });
  }

  const queueId = data.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const existingIdx = inMemoryQueues.findIndex((q) => q.id === queueId);

  const newQueue: VoiceQueueData = {
    id: queueId,
    organizationId: data.organizationId || 'org_default',
    name: data.name,
    extension: data.extension || '899',
    strategy: data.strategy || 'RINGALL',
    ringSeconds: data.ringSeconds ?? 20,
    wrapUpSeconds: data.wrapUpSeconds ?? 10,
    maxWaitSeconds: data.maxWaitSeconds ?? 180,
    maxCallers: data.maxCallers ?? 20,
    announcePositionEverySeconds: data.announcePositionEverySeconds ?? 45,
    announceHoldTime: data.announceHoldTime ?? true,
    musicOnHold: data.musicOnHold || 'default',
    greetingPromptId: data.greetingPromptId,
    periodicPromptId: data.periodicPromptId,
    overflowTarget: data.overflowTarget || 'VOICEMAIL',
    overflowTargetId: data.overflowTargetId,
    overflowAssigneeName: data.overflowAssigneeName,
    exitKey: data.exitKey || '9',
    isActive: data.isActive ?? true,
    members: data.members || [],
    createdAt: existingIdx >= 0 ? inMemoryQueues[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    inMemoryQueues[existingIdx] = newQueue;
  } else {
    inMemoryQueues.push(newQueue);
  }

  inMemoryAuditLogs.push({
    id: `audit_q_${Date.now()}`,
    action: existingIdx >= 0 ? 'VOICE_QUEUE_UPDATED' : 'VOICE_QUEUE_CREATED',
    userId: auth.userId,
    details: { queueId, name: newQueue.name, strategy: newQueue.strategy },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    queue: newQueue,
    previewText: generateQueuePreviewText(newQueue),
  });
});

/**
 * POST /api/voice/queues/:id/take-call
 * Un supervisor toma directamente una llamada en espera.
 */
voiceQueueRouter.post('/queues/:id/take-call', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasSupervise && !auth.hasVoiceUse) {
    return res.status(403).json({ error: 'Permiso de supervisión o uso de voz requerido' });
  }

  const { id } = req.params;
  const { callId } = req.body;

  const callerIdx = inMemoryLiveCallers.findIndex((c) => c.queueId === id && c.callId === callId);
  if (callerIdx === -1) {
    return res.status(404).json({ error: 'Llamada no encontrada en la cola de espera' });
  }

  const takenCall = inMemoryLiveCallers.splice(callerIdx, 1)[0];

  inMemoryAuditLogs.push({
    id: `audit_take_${Date.now()}`,
    action: 'VOICE_SUPERVISOR_CALL_TAKEOVER',
    userId: auth.userId,
    details: { queueId: id, callId, callerNumber: takenCall.fromNumber },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Llamada ${takenCall.fromNumber} tomada con éxito por el supervisor`,
    callId: takenCall.callId,
  });
});

/**
 * POST /api/voice/queues/simulate-call
 * Simula la entrada de una llamada a una cola para pruebas interactivas en vivo.
 */
voiceQueueRouter.post('/queues/simulate-call', (req: Request, res: Response) => {
  const { queueId, fromNumber, callerName } = req.body;
  const queue = inMemoryQueues.find((q) => q.id === queueId);
  if (!queue) return res.status(404).json({ error: 'Cola no encontrada' });

  const waitingInQueue = inMemoryLiveCallers.filter((c) => c.queueId === queueId);
  const position = waitingInQueue.length + 1;

  const simCall: LiveWaitingCaller = {
    callId: `call_sim_${Date.now()}`,
    channelId: `PJSIP/sim-${Math.random().toString(36).slice(2, 6)}`,
    queueId,
    fromNumber: fromNumber || '+57 311 987 6543',
    callerName: callerName || 'Cliente Simulado de Prueba',
    enteredAt: new Date().toISOString(),
    waitSeconds: 0,
    position,
    estimatedWaitMinutes: position * 2,
    isVirtualCallback: false,
  };

  inMemoryLiveCallers.push(simCall);

  res.json({ success: true, simulatedCall: simCall });
});

// ----------------------------------------------------------------------------
// ENDPOINTS DE AGENTES Y ESTADOS (BLOQUE B)
// ----------------------------------------------------------------------------

/**
 * GET /api/voice/agents
 * Lista todos los agentes telefónicos con su estado en vivo, llamada actual y tiempo en estado.
 */
voiceQueueRouter.get('/agents', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasVoiceUse) {
    return res.status(403).json({ error: 'Permiso voice:use requerido' });
  }

  const employees = employeeService.getEmployees();
  if (inMemoryAgentStatuses.length === 0 && employees.length > 0) {
    inMemoryAgentStatuses = employees.map((emp) => ({
      userId: emp.id,
      name: emp.name,
      extension: emp.extension || '100',
      role: emp.jobTitle || emp.roleName || 'Colaborador',
      status: 'OFFLINE',
      since: new Date().toISOString(),
      timeInStateSeconds: 0,
      callsHandledToday: 0,
      consecutiveMissedCalls: 0,
    }));
  }

  const now = Date.now();
  const agents = inMemoryAgentStatuses.map((a) => ({
    ...a,
    timeInStateSeconds: Math.round((now - new Date(a.since).getTime()) / 1000),
  }));

  res.json({ success: true, agents });
});

/**
 * POST /api/voice/agents/status
 * Cambia el estado de un agente (con auditoría estricta si lo cambia un supervisor).
 */
voiceQueueRouter.post('/agents/status', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  const { targetUserId, status, reason } = req.body;

  if (!targetUserId || !status) {
    return res.status(400).json({ error: 'targetUserId y status son requeridos' });
  }

  // Si no es él mismo, requiere voice:supervise
  if (targetUserId !== auth.userId && !auth.hasSupervise) {
    return res.status(403).json({ error: 'Permiso voice:supervise requerido para cambiar estado a otros agentes' });
  }

  const agent = inMemoryAgentStatuses.find((a) => a.userId === targetUserId);
  if (!agent) {
    return res.status(404).json({ error: 'Agente no encontrado' });
  }

  const prevStatus = agent.status;
  agent.status = status;
  agent.reason = reason || undefined;
  agent.since = new Date().toISOString();
  agent.consecutiveMissedCalls = 0; // reset al cambiar manualmente
  if (status === 'WRAP_UP') {
    agent.wrapUpSecondsRemaining = 10;
  } else {
    agent.wrapUpSecondsRemaining = undefined;
  }

  // Registrar auditoría
  inMemoryAuditLogs.push({
    id: `audit_agent_status_${Date.now()}`,
    action: targetUserId === auth.userId ? 'VOICE_AGENT_SELF_STATUS_CHANGED' : 'VOICE_SUPERVISOR_CHANGED_AGENT_STATUS',
    userId: auth.userId,
    details: {
      targetUserId,
      targetName: agent.name,
      fromStatus: prevStatus,
      toStatus: status,
      reason: reason || 'Cambio manual',
    },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, agent });
});

/**
 * POST /api/voice/agents/end-wrapup
 * Terminar respiro de post-llamada anticipadamente con botón de UI.
 */
voiceQueueRouter.post('/agents/end-wrapup', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  const targetUserId = req.body.userId || auth.userId;

  const agent = inMemoryAgentStatuses.find((a) => a.userId === targetUserId);
  if (agent && agent.status === 'WRAP_UP') {
    agent.status = 'AVAILABLE';
    agent.wrapUpSecondsRemaining = undefined;
    agent.since = new Date().toISOString();
  }

  res.json({ success: true, agent });
});

// ----------------------------------------------------------------------------
// ENDPOINTS DE BUZÓN DE VOZ (BLOQUE C)
// ----------------------------------------------------------------------------

/**
 * GET /api/voice/voicemails
 * Lista de mensajes de voz con filtros por estado, cola, cliente y búsqueda en transcripción.
 */
voiceQueueRouter.get('/voicemails', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasVoiceUse) {
    return res.status(403).json({ error: 'Permiso voice:use requerido' });
  }

  const { status, queueId, search } = req.query;
  let items = [...inMemoryVoicemails];

  if (status && status !== 'ALL') {
    items = items.filter((v) => v.status === status);
  }
  if (queueId && queueId !== 'ALL') {
    items = items.filter((v) => v.queueId === queueId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    items = items.filter(
      (v) =>
        v.fromNumber.toLowerCase().includes(q) ||
        (v.callerName && v.callerName.toLowerCase().includes(q)) ||
        v.transcriptText.toLowerCase().includes(q)
    );
  }

  // Orden descendente por fecha
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unheardCount = inMemoryVoicemails.filter((v) => v.status === 'NEW').length;

  res.json({
    success: true,
    voicemails: items,
    unheardCount,
    totalCount: items.length,
  });
});

/**
 * POST /api/voice/voicemails/:id/mark-heard
 * Marca un mensaje de buzón como oído.
 */
voiceQueueRouter.post('/voicemails/:id/mark-heard', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  const { id } = req.params;

  const vm = inMemoryVoicemails.find((v) => v.id === id);
  if (!vm) return res.status(404).json({ error: 'Buzón no encontrado' });

  if (vm.status === 'NEW') {
    vm.status = 'HEARD';
    vm.heardAt = new Date().toISOString();
    vm.heardById = auth.userId;
  }

  res.json({ success: true, voicemail: vm });
});

/**
 * POST /api/voice/voicemails/:id/return-call
 * Devuelve la llamada al cliente desde el buzón:
 * Marca al número, vincula la nueva llamada a returnedCallId y marca como RETURNED.
 */
voiceQueueRouter.post('/voicemails/:id/return-call', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  const { id } = req.params;

  const vm = inMemoryVoicemails.find((v) => v.id === id);
  if (!vm) return res.status(404).json({ error: 'Buzón no encontrado' });

  const newCallId = `call_ret_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  vm.status = 'RETURNED';
  vm.returnedCallId = newCallId;
  vm.returnedAt = new Date().toISOString();

  inMemoryAuditLogs.push({
    id: `audit_vm_ret_${Date.now()}`,
    action: 'VOICE_VOICEMAIL_RETURNED_CALL',
    userId: auth.userId,
    details: {
      voicemailId: id,
      newCallId,
      customerNumber: vm.fromNumber,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Llamada de devolución iniciada hacia ${vm.fromNumber}`,
    newCallId,
    returnedCallId: newCallId,
    voicemail: vm,
  });
});

/**
 * POST /api/voice/voicemails/:id/reassign
 * Reasigna el buzón a otro asesor con nota explicativa.
 */
voiceQueueRouter.post('/voicemails/:id/reassign', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  const { id } = req.params;
  const { targetUserId, targetUserName, note } = req.body;

  const vm = inMemoryVoicemails.find((v) => v.id === id);
  if (!vm) return res.status(404).json({ error: 'Buzón no encontrado' });

  vm.assignedUserId = targetUserId;
  vm.assignedUserName = targetUserName;
  if (note) {
    vm.reassignmentNotes = vm.reassignmentNotes || [];
    vm.reassignmentNotes.push(`${new Date().toLocaleDateString('es-CO')}: ${note} (por ${auth.userId})`);
  }

  inMemoryAuditLogs.push({
    id: `audit_vm_reassign_${Date.now()}`,
    action: 'VOICE_VOICEMAIL_REASSIGNED',
    userId: auth.userId,
    details: { voicemailId: id, targetUserId, note },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, voicemail: vm });
});

/**
 * POST /api/voice/voicemails/:id/archive
 * Archiva el mensaje (no se borra físicamente).
 */
voiceQueueRouter.post('/voicemails/:id/archive', (req: Request, res: Response) => {
  const { id } = req.params;
  const vm = inMemoryVoicemails.find((v) => v.id === id);
  if (!vm) return res.status(404).json({ error: 'Buzón no encontrado' });

  vm.status = 'ARCHIVED';
  res.json({ success: true, voicemail: vm });
});

/**
 * DELETE /api/voice/voicemails/:id
 * Borrado físico de mensaje (estrictamente auditado y restringido a voice:delete_recording).
 */
voiceQueueRouter.delete('/voicemails/:id', (req: Request, res: Response) => {
  const auth = resolveAuth(req);
  if (!auth.hasDeleteRecording) {
    return res.status(403).json({
      error: 'Se requiere permiso voice:delete_recording para eliminar grabaciones de buzón.',
    });
  }

  const { id } = req.params;
  const idx = inMemoryVoicemails.findIndex((v) => v.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Buzón no encontrado' });

  const deleted = inMemoryVoicemails.splice(idx, 1)[0];

  inMemoryAuditLogs.push({
    id: `audit_vm_del_${Date.now()}`,
    action: 'VOICE_VOICEMAIL_DELETED_PERMANENTLY',
    userId: auth.userId,
    details: {
      voicemailId: id,
      fromNumber: deleted.fromNumber,
      callerName: deleted.callerName,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Mensaje de buzón eliminado y auditado correctamente' });
});

// Helper de vista previa en lenguaje natural
function generateQueuePreviewText(queue: VoiceQueueData): string {
  const minutes = Math.round(queue.maxWaitSeconds / 60);
  const targetLabel =
    queue.overflowTarget === 'VOICEMAIL'
      ? `al buzón de voz de ${queue.name}`
      : queue.overflowTarget === 'EXTERNAL_NUMBER'
      ? `al número celular ${queue.overflowTargetId || queue.overflowAssigneeName || 'externo'}`
      : queue.overflowTarget === 'ANOTHER_QUEUE'
      ? `a otra cola (${queue.overflowTargetId || 'secundaria'})`
      : queue.overflowTarget === 'AI_AGENT'
      ? 'al Agente de Inteligencia Artificial Conversacional'
      : 'y se cuelga con tarea de devolución';

  const assignee = queue.overflowAssigneeName ? ` y se crea una tarea para ${queue.overflowAssigneeName}` : ' y se crea una tarea de devolución en el CRM';

  return `Si nadie contesta en ${minutes} minuto${minutes > 1 ? 's' : ''} o hay más de ${queue.maxCallers} personas en espera, la llamada va ${targetLabel}${assignee}.`;
}
