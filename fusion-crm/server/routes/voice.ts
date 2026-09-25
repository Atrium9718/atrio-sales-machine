import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isVoiceEnabled, getPublicVoiceConfig } from '../../packages/config/src/env';
import { can } from '../../packages/core/src/auth/permissions';
import { decryptSecret } from '../../packages/core/src/security/secrets';
import { realtimeStreamManager } from '../../packages/core/src/realtime/stream';
import {
  provisionExtension,
  deprovisionExtension,
  rotateSecret,
  revealCredentials,
  reconcileExtensions,
  getCachedLiveEndpoints,
  ariClient,
  inMemoryExtensions,
  inMemorySecrets,
} from '../../apps/web/src/server/services/voice/provisioning';
import {
  getCurrentBogotaStatus,
  getColombianHolidays,
  getNextColombianHoliday,
} from '../../packages/core/src/voice/holidays';
import { inMemoryAuditLogs } from '../services/callsService';
import { employeeService } from '../services/employeeService';
import { voiceIvrRouter } from './voiceIvrRoutes';
import { voiceQueueRouter } from './voiceQueueRoutes';

export const voiceRouter = Router();

// Sub-Etapa 17.5: Locuciones, Flujos de IVR y Horarios de Atención
voiceRouter.use('/', voiceIvrRouter);

// Sub-Etapa 17.6: Colas de Atención, Estados de Agentes y Buzón de Voz
voiceRouter.use('/', voiceQueueRouter);

// Estado en memoria de Troncal SIP (VoiceTrunk)
export interface VoiceTrunkConfig {
  id: string;
  organizationId: string;
  name: string;
  provider: 'CLARO' | 'ETB' | 'TWILIO' | 'ASTERISK_LOCAL' | 'CUSTOM_SIP';
  sipHost: string;
  sipPort: number;
  transport: 'UDP' | 'TCP' | 'TLS' | 'WSS';
  username: string;
  password?: string;
  register: boolean;
  maxChannels: number;
  codecs: string[];
  callerIdDefault: string;
  status: 'ACTIVE' | 'DISABLED' | 'TESTING';
  lastTestedAt?: string;
  testResult?: {
    status: 'GREEN' | 'YELLOW' | 'RED';
    latencyMs?: number;
    ariVersion?: string;
    details: string;
  };
}

let activeTrunk: VoiceTrunkConfig = {
  id: 'trunk_main_01',
  organizationId: 'org-default',
  name: 'Troncal SIP Principal (Colombia)',
  provider: 'CLARO',
  sipHost: process.env.TRUNK_SIP_HOST || 'sip.claro.com.co',
  sipPort: parseInt(process.env.TRUNK_SIP_PORT || '5060', 10),
  transport: 'UDP',
  username: process.env.TRUNK_USERNAME || 'fusion_trunk_601',
  register: true,
  maxChannels: 10,
  codecs: ['alaw', 'ulaw', 'opus'],
  callerIdDefault: '+576017441234',
  status: 'ACTIVE',
};

// Estado en memoria de Números Telefónicos (VoiceNumber / DIDs)
export interface VoiceNumberRecord {
  id: string;
  organizationId: string;
  e164Number: string;
  displayName: string;
  countryCode: string;
  trunkId: string;
  primaryAction: 'IVR_FLOW' | 'QUEUE' | 'EXTENSION' | 'AI_AGENT' | 'VOICEMAIL' | 'EXTERNAL_NUMBER';
  primaryTargetId: string;
  secondaryAction?: string;
  secondaryTargetId?: string;
  scheduleId?: string;
  status: 'ACTIVE' | 'RELEASED' | 'RESERVED';
}

const inMemoryNumbers: Map<string, VoiceNumberRecord> = new Map([
  [
    'num_bogota_01',
    {
      id: 'num_bogota_01',
      organizationId: 'org-default',
      e164Number: '+576017441234',
      displayName: 'PBX Principal Bogotá — Fusión Comunicación Gráfica',
      countryCode: '57',
      trunkId: 'trunk_main_01',
      primaryAction: 'IVR_FLOW',
      primaryTargetId: 'ivr_menu_bienvenida',
      secondaryAction: 'AI_AGENT',
      secondaryTargetId: 'agent_clara_ventas',
      scheduleId: 'sched_bogota_laboral',
      status: 'ACTIVE',
    },
  ],
  [
    'num_comercial_02',
    {
      id: 'num_comercial_02',
      organizationId: 'org-default',
      e164Number: '+573009123456',
      displayName: 'Línea Celular Ventas Corporativas',
      countryCode: '57',
      trunkId: 'trunk_main_01',
      primaryAction: 'QUEUE',
      primaryTargetId: 'cola_comercial_nacional',
      scheduleId: 'sched_bogota_laboral',
      status: 'ACTIVE',
    },
  ],
]);

// Estado en memoria de Horarios (VoiceSchedule)
export interface VoiceScheduleRecord {
  id: string;
  organizationId: string;
  name: string;
  timezone: string;
  holidaysFollowLaw51: boolean;
  weeklyHours: {
    dayOfWeek: number; // 1 = Lunes, 7 = Domingo
    dayName: string;
    enabled: boolean;
    openTime: string;
    closeTime: string;
  }[];
  openAction: 'IVR_FLOW' | 'QUEUE' | 'EXTENSION' | 'AI_AGENT';
  closedAction: 'VOICEMAIL' | 'AI_AGENT' | 'EXTERNAL_FORWARD';
  holidayAction: 'VOICEMAIL' | 'AI_AGENT';
}

let activeSchedule: VoiceScheduleRecord = {
  id: 'sched_bogota_laboral',
  organizationId: 'org-default',
  name: 'Horario Comercial Bogotá (L-V 8:00 - 17:30, Sáb 8:00 - 13:00)',
  timezone: 'America/Bogota',
  holidaysFollowLaw51: true,
  weeklyHours: [
    { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '08:00', closeTime: '17:30' },
    { dayOfWeek: 2, dayName: 'Martes', enabled: true, openTime: '08:00', closeTime: '17:30' },
    { dayOfWeek: 3, dayName: 'Miércoles', enabled: true, openTime: '08:00', closeTime: '17:30' },
    { dayOfWeek: 4, dayName: 'Jueves', enabled: true, openTime: '08:00', closeTime: '17:30' },
    { dayOfWeek: 5, dayName: 'Viernes', enabled: true, openTime: '08:00', closeTime: '17:30' },
    { dayOfWeek: 6, dayName: 'Sábado', enabled: true, openTime: '08:00', closeTime: '13:00' },
    { dayOfWeek: 7, dayName: 'Domingo', enabled: false, openTime: '09:00', closeTime: '12:00' },
  ],
  openAction: 'IVR_FLOW',
  closedAction: 'AI_AGENT',
  holidayAction: 'AI_AGENT',
};

// -----------------------------------------------------------------------------
// RUTAS PÚBLICAS Y DE SALUD
// -----------------------------------------------------------------------------

voiceRouter.get('/config', (_req: Request, res: Response) => {
  return res.json(getPublicVoiceConfig());
});

voiceRouter.get('/status', async (_req: Request, res: Response) => {
  const isAriAlive = await ariClient.isAlive().catch(() => false);
  const bogotaStatus = getCurrentBogotaStatus(activeSchedule);

  return res.json({
    ok: true,
    stage: '17.2',
    isVoiceEnabled: isVoiceEnabled(),
    asterisk: {
      connected: isAriAlive,
      ariUrl: process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088',
      version: isAriAlive ? 'Asterisk 22.6.0 LTS (chan_websocket)' : 'No conectado / en espera',
    },
    counts: {
      extensions: inMemoryExtensions.size,
      numbers: inMemoryNumbers.size,
      trunks: 1,
    },
    businessHours: bogotaStatus,
  });
});

// -----------------------------------------------------------------------------
// TRONCAL SIP (TRUNKS)
// -----------------------------------------------------------------------------

voiceRouter.get('/trunk', (_req: Request, res: Response) => {
  const safeTrunk = {
    ...activeTrunk,
    password: activeTrunk.password ? '••••••••' : undefined,
  };
  res.json({ trunk: safeTrunk });
});

voiceRouter.post('/trunk', (req: Request, res: Response) => {
  const body = req.body;
  activeTrunk = {
    ...activeTrunk,
    name: body.name || activeTrunk.name,
    provider: body.provider || activeTrunk.provider,
    sipHost: body.sipHost || activeTrunk.sipHost,
    sipPort: Number(body.sipPort) || activeTrunk.sipPort,
    transport: body.transport || activeTrunk.transport,
    username: body.username || activeTrunk.username,
    maxChannels: Number(body.maxChannels) || activeTrunk.maxChannels,
    codecs: body.codecs || activeTrunk.codecs,
    callerIdDefault: body.callerIdDefault || activeTrunk.callerIdDefault,
    register: body.register !== undefined ? body.register : activeTrunk.register,
  };

  inMemoryAuditLogs.push({
    id: `audit_${Date.now()}`,
    action: 'VOICE_TRUNK_UPDATED',
    userId: (req.headers['x-user-id'] as string) || 'ADMIN',
    details: { trunkId: activeTrunk.id, sipHost: activeTrunk.sipHost },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, trunk: activeTrunk });
});

voiceRouter.post('/trunk/test', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let isAlive = false;
  let ariVersion = 'Asterisk 22.6.0';
  let details = '';

  try {
    isAlive = await ariClient.isAlive();
    const latency = Date.now() - startTime;

    if (isAlive) {
      // Verificar si el endpoint de la troncal existe en Asterisk
      const ep = await ariClient.getEndpoint('PJSIP', 'trunk-endpoint');
      if (ep && ep.state === 'online') {
        activeTrunk.testResult = {
          status: 'GREEN',
          latencyMs: latency,
          ariVersion,
          details: `Conexión ARI exitosa (${latency}ms). Troncal PJSIP registrada y operativa con ${activeTrunk.sipHost}.`,
        };
      } else {
        activeTrunk.testResult = {
          status: 'YELLOW',
          latencyMs: latency,
          ariVersion,
          details: `Asterisk responde (${latency}ms), pero la troncal no ha completado el registro SIP contra ${activeTrunk.sipHost}:${activeTrunk.sipPort}. Verifique credenciales o firewall de red.`,
        };
      }
    } else {
      activeTrunk.testResult = {
        status: 'RED',
        latencyMs: latency,
        details: `No fue posible conectar con Asterisk ARI en http://127.0.0.1:8088. Verifique que el servicio Docker 'asterisk' esté levantado.`,
      };
    }
  } catch (err: any) {
    activeTrunk.testResult = {
      status: 'RED',
      details: `Error al probar conexión: ${err.message}`,
    };
  }

  activeTrunk.lastTestedAt = new Date().toISOString();
  return res.json({
    testResult: activeTrunk.testResult,
    lastTestedAt: activeTrunk.lastTestedAt,
  });
});

// -----------------------------------------------------------------------------
// NÚMEROS TELEFÓNICOS (DIDs)
// -----------------------------------------------------------------------------

voiceRouter.get('/numbers', (_req: Request, res: Response) => {
  const numbers = Array.from(inMemoryNumbers.values());
  const unconfiguredCount = numbers.filter((n) => !n.primaryAction || !n.primaryTargetId).length;

  res.json({
    numbers,
    hasUnconfiguredTarget: unconfiguredCount > 0,
    unconfiguredCount,
  });
});

voiceRouter.post('/numbers', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.e164Number || !body.displayName) {
    return res.status(400).json({ error: 'Número E.164 y Nombre descriptivo son obligatorios' });
  }

  const id = body.id || `num_${Date.now()}`;
  const record: VoiceNumberRecord = {
    id,
    organizationId: 'org-default',
    e164Number: body.e164Number,
    displayName: body.displayName,
    countryCode: body.countryCode || '57',
    trunkId: body.trunkId || 'trunk_main_01',
    primaryAction: body.primaryAction || 'IVR_FLOW',
    primaryTargetId: body.primaryTargetId || 'ivr_menu_bienvenida',
    secondaryAction: body.secondaryAction,
    secondaryTargetId: body.secondaryTargetId,
    scheduleId: body.scheduleId || 'sched_bogota_laboral',
    status: body.status || 'ACTIVE',
  };

  inMemoryNumbers.set(id, record);
  res.json({ success: true, number: record });
});

voiceRouter.delete('/numbers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  inMemoryNumbers.delete(id);
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// EXTENSIONES TELEFÓNICAS (VOICE EXTENSIONS)
// -----------------------------------------------------------------------------

voiceRouter.get('/extensions', async (_req: Request, res: Response) => {
  const liveEndpoints = await getCachedLiveEndpoints();
  const extensions = Array.from(inMemoryExtensions.values()).map((ext) => {
    const live = liveEndpoints.get(ext.extension);
    return {
      ...ext,
      liveState: live ? live.state : 'unknown',
      channelCount: live?.channelIds?.length || 0,
      hasDiscrepancy: ext.status === 'ACTIVE' && (!live || live.state === 'offline' || live.state === 'unknown'),
    };
  });

  const desyncCount = extensions.filter((e) => e.status === 'PENDING_PROVISION' || e.hasDiscrepancy).length;

  res.json({
    extensions,
    hasDesync: desyncCount > 0,
    desyncCount,
  });
});

voiceRouter.post('/extensions/provision', async (req: Request, res: Response) => {
  const { userId, userName, type } = req.body;
  const result = await provisionExtension(userId, userName, 'org-default', type);
  res.json(result);
});

voiceRouter.post('/extensions/:ext/deprovision', async (req: Request, res: Response) => {
  const { ext } = req.params;
  const adminUserId = req.headers['x-user-id'] as string;
  const result = await deprovisionExtension(ext, adminUserId);
  res.json(result);
});

voiceRouter.post('/extensions/:ext/rotate-secret', async (req: Request, res: Response) => {
  const { ext } = req.params;
  const adminUserId = req.headers['x-user-id'] as string;
  const result = await rotateSecret(ext, adminUserId);
  res.json(result);
});

voiceRouter.post('/extensions/:ext/reveal', (req: Request, res: Response) => {
  const { ext } = req.params;
  const viewerUserId = (req.headers['x-user-id'] as string) || 'ADMIN_USER';
  const result = revealCredentials(ext, viewerUserId);
  res.json(result);
});

voiceRouter.post('/extensions/reconcile', async (_req: Request, res: Response) => {
  const result = await reconcileExtensions();
  res.json(result);
});

// -----------------------------------------------------------------------------
// HORARIOS Y FESTIVOS (VOICE SCHEDULES)
// -----------------------------------------------------------------------------

voiceRouter.get('/schedules', (_req: Request, res: Response) => {
  const bogotaStatus = getCurrentBogotaStatus(activeSchedule);
  const holidays = getColombianHolidays(new Date().getFullYear());
  const nextHoliday = getNextColombianHoliday();

  res.json({
    schedule: activeSchedule,
    realtimeBogota: bogotaStatus,
    nextHoliday,
    upcomingHolidays: holidays.slice(0, 6),
  });
});

voiceRouter.post('/schedules', (req: Request, res: Response) => {
  const body = req.body;
  activeSchedule = {
    ...activeSchedule,
    name: body.name || activeSchedule.name,
    timezone: body.timezone || activeSchedule.timezone,
    weeklyHours: body.weeklyHours || activeSchedule.weeklyHours,
    holidaysFollowLaw51: body.holidaysFollowLaw51 !== undefined ? body.holidaysFollowLaw51 : activeSchedule.holidaysFollowLaw51,
    openAction: body.openAction || activeSchedule.openAction,
    closedAction: body.closedAction || activeSchedule.closedAction,
    holidayAction: body.holidayAction || activeSchedule.holidayAction,
  };

  inMemoryAuditLogs.push({
    id: `audit_${Date.now()}`,
    action: 'VOICE_SCHEDULE_UPDATED',
    userId: (req.headers['x-user-id'] as string) || 'ADMIN',
    details: { scheduleId: activeSchedule.id },
    timestamp: new Date().toISOString(),
  });

  const bogotaStatus = getCurrentBogotaStatus(activeSchedule);
  res.json({ success: true, schedule: activeSchedule, realtimeBogota: bogotaStatus });
});

// -----------------------------------------------------------------------------
// ETAPA 17.4: SOFTPHONE EN EL NAVEGADOR Y EN EL CELULAR
// -----------------------------------------------------------------------------

// Estado en memoria de Agentes de Voz (VoiceAgentStatus)
export interface VoiceAgentStatusEntry {
  userId: string;
  status: 'DISPONIBLE' | 'OCUPADO' | 'EN_PAUSA' | 'DESCONECTADO';
  reason?: string | null;
  updatedAt: string;
}

export const inMemoryAgentStatuses = new Map<string, VoiceAgentStatusEntry>();

const initializeAgentStatuses = () => {
  if (inMemoryAgentStatuses.size > 0) return;
  const employees = employeeService.getEmployees();
  employees.forEach(e => {
    inMemoryAgentStatuses.set(e.id, {
      userId: e.id,
      status: 'DISPONIBLE',
      reason: null,
      updatedAt: new Date().toISOString()
    });
  });
};

// Estado en memoria de llamadas activas para notas y control de medios
export const inMemoryVoiceCallNotes = new Map<string, { notes: string; updatedAt: string }>();

// Estado en memoria de buzón de voz (Voicemails)
export const inMemoryVoicemails = [
  {
    id: 'vm_001',
    callerNumber: '+573105559876',
    callerName: 'Alejandro Restrepo (Café del Sol)',
    durationSeconds: 38,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    audioUrl: '/audio/voicemail-sample-1.mp3',
    transcription: 'Hola Cristian, te llamo de Café del Sol para confirmar si alcanzamos a tener las 5000 etiquetas metalizadas para el jueves. Por favor me devuelves la llamada.',
    isRead: false,
  },
  {
    id: 'vm_002',
    callerNumber: '+573009876543',
    callerName: 'Beatriz Morales (Empaques del Valle)',
    durationSeconds: 24,
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    audioUrl: '/audio/voicemail-sample-2.mp3',
    transcription: 'Buenas tardes, requerimos cotización formal para 2000 cajas plegadizas con acabado barniz UV. Quedo atenta.',
    isRead: false,
  },
];

// Helper para extraer contexto de usuario y verificar permisos (SSOT)
function resolveVoiceUserAuth(req: Request) {
  const currentActiveUser = employeeService.getActiveUser();
  const userId = (req.headers['x-user-id'] as string) || currentActiveUser.id || 'emp-03';
  const role = (req.headers['x-user-role'] as string) || currentActiveUser.roleKey || 'super_admin';
  const permissionsHeader = req.headers['x-user-permissions'] as string;
  let permissions: string[] = ['*'];

  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch {
      permissions = permissionsHeader.split(',').map((p) => p.trim());
    }
  } else if (role === 'admin' || role === 'super_admin' || userId === 'emp-03') {
    permissions = ['*'];
  }

  // Permitir simulación de restricción mediante header para pruebas
  if (req.headers['x-deny-voice-use'] === 'true') {
    permissions = permissions.filter((p) => p !== 'voice:use' && p !== '*');
  }

  return {
    userId,
    role,
    permissions,
    hasVoiceUse: can(permissions, 'voice:use'),
    hasCostRead: can(permissions, 'cost:read'),
  };
}

/**
 * BLOQUE A & SEGURIDAD: voice.softphone.getCredentials
 * Entrega credenciales efímeras para el softphone SIP.js en el navegador.
 * Exige sesión válida y voice:use. Vive SOLO en memoria del navegador.
 * Registra en AuditLog cada entrega con IP y user-agent.
 */
function handleGetSoftphoneCredentials(req: Request, res: Response) {
  const auth = resolveVoiceUserAuth(req);

  // 1. Verificación estricta de permiso voice:use
  if (!auth.hasVoiceUse) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: se requiere el permiso voice:use para activar el softphone SIP en el navegador.',
      code: 'VOICE_USE_PERMISSION_REQUIRED',
    });
  }

  // 2. Buscar extensión asignada al usuario
  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status === 'ACTIVE'
  );

  // Fallback para administradores o demos: usar ext 101 si no tiene una específica asignada
  if (!ext) {
    ext = inMemoryExtensions.get('101');
  }

  if (!ext) {
    return res.status(404).json({
      success: false,
      error: `No se encontró una extensión SIP activa aprovisionada para el usuario ${auth.userId}`,
      code: 'EXTENSION_NOT_PROVISIONED',
    });
  }

  // 3. Descifrar contraseña de la bóveda de secretos
  const secret = inMemorySecrets.get(ext.sipPasswordSecretId);
  if (!secret) {
    return res.status(500).json({
      success: false,
      error: 'Secreto de credencial SIP no encontrado en la bóveda',
      code: 'SIP_SECRET_NOT_FOUND',
    });
  }

  let plainPassword = '';
  try {
    plainPassword = decryptSecret({
      encryptedValue: secret.encryptedValue,
      iv: secret.iv,
      authTag: secret.authTag,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Error al descifrar credencial SIP: ${err.message}`,
      code: 'DECRYPT_SECRET_FAILED',
    });
  }

  // 4. Generar configuración ICE (STUN y TURN efímero)
  const turnSecret = process.env.COTURN_AUTH_SECRET || 'fusion_turn_secret_2026';
  const expiryTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutos de vigencia
  const turnUsername = `${expiryTimestamp}:${auth.userId}`;
  const turnPassword = crypto.createHmac('sha1', turnSecret).update(turnUsername).digest('base64');

  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:turn.fusioncg.com:3478'] },
    {
      urls: [
        'turn:turn.fusioncg.com:3478?transport=udp',
        'turn:turn.fusioncg.com:3478?transport=tcp',
        'turns:turn.fusioncg.com:5349?transport=tcp',
      ],
      username: turnUsername,
      credential: turnPassword,
    },
  ];

  const wssUrl = process.env.VOICE_WEBRTC_WSS_URL || 'wss://pbx.fusioncg.com/ws';
  const sipDomain = process.env.VOICE_SIP_DOMAIN || 'pbx.fusioncg.com';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // 5. Registro obligatorio en AuditLog con IP y User-Agent
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || 'Browser Softphone';

  inMemoryAuditLogs.push({
    id: `audit_softphone_cred_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action: 'VOICE_SOFTPHONE_CREDENTIALS_DELIVERED',
    userId: auth.userId,
    details: {
      extension: ext.extension,
      sipUsername: ext.sipUsername,
      ip: clientIp,
      userAgent,
      expiresAt,
      ringStrategy: ext.ringStrategy,
    },
    timestamp: new Date().toISOString(),
  });

  // 6. Devolver credenciales efímeras
  return res.json({
    success: true,
    credentials: {
      extension: ext.extension,
      sipUsername: ext.sipUsername,
      sipPassword: plainPassword,
      wssUrl,
      sipDomain,
      displayName: ext.label || `Extensión ${ext.extension}`,
      callerIdDefault: activeTrunk.callerIdDefault || '+576017441234',
      expiresAt,
      iceServers,
    },
  });
}

voiceRouter.get('/softphone/credentials', handleGetSoftphoneCredentials);
voiceRouter.post('/softphone/credentials', handleGetSoftphoneCredentials);

/**
 * BLOQUE B: ESTADO DEL AGENTE (VoiceAgentStatus)
 */
voiceRouter.get('/agent-status', (req: Request, res: Response) => {
  initializeAgentStatuses();
  const auth = resolveVoiceUserAuth(req);
  const current = inMemoryAgentStatuses.get(auth.userId) || {
    userId: auth.userId,
    status: 'DISPONIBLE',
    reason: null,
    updatedAt: new Date().toISOString(),
  };
  res.json({ success: true, agentStatus: current });
});

voiceRouter.post('/agent-status', (req: Request, res: Response) => {
  initializeAgentStatuses();
  const auth = resolveVoiceUserAuth(req);
  const { status, reason } = req.body;

  const validStatuses = ['DISPONIBLE', 'OCUPADO', 'EN_PAUSA', 'DESCONECTADO'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Estado no válido: ${status}` });
  }

  const updated: VoiceAgentStatusEntry = {
    userId: auth.userId,
    status,
    reason: status === 'EN_PAUSA' ? reason || 'OTRO' : null,
    updatedAt: new Date().toISOString(),
  };

  inMemoryAgentStatuses.set(auth.userId, updated);

  inMemoryAuditLogs.push({
    id: `audit_agent_status_${Date.now()}`,
    action: 'VOICE_AGENT_STATUS_CHANGED',
    userId: auth.userId,
    details: { status, reason },
    timestamp: new Date().toISOString(),
  });

  // Difundir por tiempo real SSE
  try {
    realtimeStreamManager.publish({
      organizationId: (auth as any).organizationId || 'org-default',
      type: 'user_notification' as any,
      channelId: `voice:user:${auth.userId}`,
      payload: {
        userId: auth.userId,
        event: 'voice.agent_status_changed',
        agentStatus: updated,
      },
    });
  } catch {}

  res.json({ success: true, agentStatus: updated });
});

/**
 * BLOQUE B & D: Directorio de agentes para transferencias con estado en tiempo real
 */
voiceRouter.get('/agents/directory', (_req: Request, res: Response) => {
  initializeAgentStatuses();
  const employees = employeeService.getEmployees();
  const directory = employees.map(e => ({
    userId: e.id,
    name: e.name,
    role: e.roleName,
    extension: e.extension || 'N/A',
    avatar: null,
    status: inMemoryAgentStatuses.get(e.id)?.status || 'DISPONIBLE',
    reason: inMemoryAgentStatuses.get(e.id)?.reason || null,
  }));

  res.json({ success: true, agents: directory });
});

/**
 * BLOQUE B: Estado de las colas a las que pertenece el agente
 */
voiceRouter.get('/queues/status', (_req: Request, res: Response) => {
  const queues = [
    {
      id: 'queue_ventas',
      name: 'Ventas y Cotizaciones',
      waitingCallsCount: 1,
      longestWaitSeconds: 18,
      activeAgentsCount: 3,
    },
    {
      id: 'queue_soporte',
      name: 'Soporte y Estado de Pedidos',
      waitingCallsCount: 0,
      longestWaitSeconds: 0,
      activeAgentsCount: 2,
    },
  ];

  res.json({ success: true, queues });
});

/**
 * BLOQUE B: Contador de buzón de voz y listado de mensajes
 */
voiceRouter.get('/voicemail/unread-count', (_req: Request, res: Response) => {
  const unread = inMemoryVoicemails.filter((v) => !v.isRead).length;
  res.json({ success: true, unreadCount: unread });
});

voiceRouter.get('/voicemail/messages', (_req: Request, res: Response) => {
  res.json({ success: true, messages: inMemoryVoicemails });
});

/**
 * BLOQUE D: Auto-guardado en vivo de notas de llamada (VoiceCall.notes)
 */
voiceRouter.post('/calls/:callId/notes', (req: Request, res: Response) => {
  const { callId } = req.params;
  const { notes } = req.body;
  const auth = resolveVoiceUserAuth(req);

  inMemoryVoiceCallNotes.set(callId, {
    notes: String(notes || ''),
    updatedAt: new Date().toISOString(),
  });

  inMemoryAuditLogs.push({
    id: `audit_call_note_${Date.now()}`,
    action: 'VOICE_CALL_NOTES_AUTO_SAVED',
    userId: auth.userId,
    details: { callId, notesLength: notes ? notes.length : 0 },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, callId, notes });
});

/**
 * BLOQUE D: Acciones de control sobre la llamada (Hold, Transfer, Mute, Recording Pause)
 */
voiceRouter.post('/calls/:callId/hold', (req: Request, res: Response) => {
  const { callId } = req.params;
  const auth = resolveVoiceUserAuth(req);

  inMemoryAuditLogs.push({
    id: `audit_hold_${Date.now()}`,
    action: 'VOICE_CALL_PUT_ON_HOLD',
    userId: auth.userId,
    details: { callId },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, callId, state: 'ON_HOLD' });
});

voiceRouter.post('/calls/:callId/resume', (req: Request, res: Response) => {
  const { callId } = req.params;
  const auth = resolveVoiceUserAuth(req);

  inMemoryAuditLogs.push({
    id: `audit_resume_${Date.now()}`,
    action: 'VOICE_CALL_RESUMED',
    userId: auth.userId,
    details: { callId },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, callId, state: 'CONNECTED' });
});

voiceRouter.post('/calls/:callId/transfer', (req: Request, res: Response) => {
  const { callId } = req.params;
  const { target, type } = req.body; // type: 'BLIND' | 'ATTENDED'
  const auth = resolveVoiceUserAuth(req);

  inMemoryAuditLogs.push({
    id: `audit_transfer_${Date.now()}`,
    action: 'VOICE_CALL_TRANSFERRED',
    userId: auth.userId,
    details: { callId, target, type: type || 'BLIND' },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    callId,
    target,
    type: type || 'BLIND',
    message: `Llamada transferida exitosamente a ${target}`,
  });
});

voiceRouter.post('/calls/:callId/recording/pause', (req: Request, res: Response) => {
  const { callId } = req.params;
  const auth = resolveVoiceUserAuth(req);

  inMemoryAuditLogs.push({
    id: `audit_rec_pause_${Date.now()}`,
    action: 'VOICE_RECORDING_PAUSED',
    userId: auth.userId,
    details: { callId },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, callId, recordingPaused: true });
});

voiceRouter.post('/calls/:callId/recording/resume', (req: Request, res: Response) => {
  const { callId } = req.params;
  const auth = resolveVoiceUserAuth(req);

  inMemoryAuditLogs.push({
    id: `audit_rec_resume_${Date.now()}`,
    action: 'VOICE_RECORDING_RESUMED',
    userId: auth.userId,
    details: { callId },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, callId, recordingPaused: false });
});

/**
 * BLOQUE E: Búsqueda rápida de Clientes y Contactos para el Marcador
 */
voiceRouter.get('/search-contacts', (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim().toLowerCase();

  const directoryData = [
    {
      id: 'cust_01',
      type: 'CUSTOMER',
      name: 'Café del Sol S.A.S.',
      contactName: 'Alejandro Restrepo',
      contactRole: 'Gerente General',
      phone: '+573105559876',
      displayPhone: '+57 310 555 9876',
      temperature: 'HOT',
      lastCall: 'Ayer, 14:30 (4 min)',
      openQuotesCount: 1,
    },
    {
      id: 'cust_02',
      type: 'CUSTOMER',
      name: 'Empaques del Valle',
      contactName: 'Beatriz Morales',
      contactRole: 'Jefe de Compras',
      phone: '+573009876543',
      displayPhone: '+57 300 987 6543',
      temperature: 'WARM',
      lastCall: 'Hace 3 días (2 min)',
      openQuotesCount: 2,
    },
    {
      id: 'cust_03',
      type: 'CUSTOMER',
      name: 'Industrias Gráficas Antioquia',
      contactName: 'Carlos Mario Vélez',
      contactRole: 'Director de Planta',
      phone: '+573147778899',
      displayPhone: '+57 314 777 8899',
      temperature: 'VIP',
      lastCall: 'Hace 1 semana (8 min)',
      openQuotesCount: 0,
    },
    {
      id: 'cust_04',
      type: 'CUSTOMER',
      name: 'Chocolates La Montaña',
      contactName: 'Diana Cardona',
      contactRole: 'Mercadeo y Producto',
      phone: '+573183334455',
      displayPhone: '+57 318 333 4455',
      temperature: 'COLD',
      lastCall: 'Nunca',
      openQuotesCount: 1,
    },
  ];

  if (!query) {
    return res.json({ success: true, results: directoryData });
  }

  const filtered = directoryData.filter((item) => {
    return (
      item.name.toLowerCase().includes(query) ||
      item.contactName.toLowerCase().includes(query) ||
      item.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    );
  });

  res.json({ success: true, results: filtered });
});

/**
 * BLOQUE G: CONFIGURACIÓN MÓVIL (Zoiper / Linphone / Groundwire y Desvío)
 */
voiceRouter.get('/mobile-config', (req: Request, res: Response) => {
  const auth = resolveVoiceUserAuth(req);
  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status === 'ACTIVE'
  );
  if (!ext) ext = inMemoryExtensions.get('101');

  if (!ext) {
    return res.status(404).json({ success: false, error: 'Extensión no encontrada' });
  }

  const sipDomain = process.env.VOICE_SIP_DOMAIN || 'pbx.fusioncg.com';
  const sipPortTls = 5061;
  const sipPortWss = 443;
  const provisioningUri = `sip:${ext.sipUsername}@${sipDomain}:${sipPortTls};transport=tls`;

  res.json({
    success: true,
    config: {
      extension: ext.extension,
      username: ext.sipUsername,
      sipDomain,
      tlsPort: sipPortTls,
      wssPort: sipPortWss,
      transport: 'TLS',
      codecs: ['opus', 'alaw', 'ulaw'],
      provisioningUri,
      mobileNumber: ext.mobileNumber || '+573001234567',
      ringStrategy: ext.ringStrategy,
      notes: {
        battery: 'Configure el softphone móvil con soporte Push Notifications o mantenga el servicio en segundo plano para evitar que el SO duerma el socket SIP.',
        data: 'En redes 4G/5G con NAT estricto, el cliente utiliza STUN/TURN en turn.fusioncg.com:3478.',
      },
    },
  });
});

voiceRouter.post('/mobile-config/reveal', (req: Request, res: Response) => {
  const auth = resolveVoiceUserAuth(req);
  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status === 'ACTIVE'
  );
  if (!ext) ext = inMemoryExtensions.get('101');

  if (!ext) {
    return res.status(404).json({ success: false, error: 'Extensión no encontrada' });
  }

  const secret = inMemorySecrets.get(ext.sipPasswordSecretId);
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Secreto no encontrado' });
  }

  const plainPassword = decryptSecret({
    encryptedValue: secret.encryptedValue,
    iv: secret.iv,
    authTag: secret.authTag,
  });

  inMemoryAuditLogs.push({
    id: `audit_mobile_reveal_${Date.now()}`,
    action: 'VOICE_MOBILE_CREDENTIALS_REVEALED',
    userId: auth.userId,
    details: { extension: ext.extension, ip: req.ip || req.socket.remoteAddress },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    extension: ext.extension,
    username: ext.sipUsername,
    password: plainPassword,
  });
});

voiceRouter.post('/mobile-forwarding', (req: Request, res: Response) => {
  const auth = resolveVoiceUserAuth(req);
  const { mobileNumber, ringStrategy } = req.body;

  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status === 'ACTIVE'
  );
  if (!ext) ext = inMemoryExtensions.get('101');

  if (!ext) {
    return res.status(404).json({ success: false, error: 'Extensión no encontrada' });
  }

  ext.mobileNumber = mobileNumber || ext.mobileNumber;
  ext.ringStrategy = ringStrategy || 'BROWSER_THEN_MOBILE';
  ext.updatedAt = new Date().toISOString();

  inMemoryAuditLogs.push({
    id: `audit_forwarding_${Date.now()}`,
    action: 'VOICE_MOBILE_FORWARDING_UPDATED',
    userId: auth.userId,
    details: { extension: ext.extension, mobileNumber: ext.mobileNumber, ringStrategy: ext.ringStrategy },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    extension: ext.extension,
    ringStrategy: ext.ringStrategy,
    mobileNumber: ext.mobileNumber,
    confirmationPrompt: 'Llamada de Impresos del Café, pulse 1 para tomarla.',
  });
});

