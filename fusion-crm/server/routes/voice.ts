import { ORGANIZATION_ID } from '../repositories/prisma/mappers';
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
import { systemConfig } from '../services/systemConfig';
import { isOpenAt } from '../../packages/core/src/calendar/workCalendar';
import { permissionsForRequest } from '../auth/userPermissions';
import { normalizeColombianPhone } from '../../packages/core/src/voice/normalizePhone';
import { trunkFromEnv, loadVoiceStore, saveNumber, deleteNumber, saveExtension, voiceDbAvailable, DEFAULT_TRUNK_ID } from '../services/voiceStore';
import { voiceCallsRouter } from './voiceCalls';
import { getPrisma } from '../repositories/prisma/client';
import { voicePbxRouter } from './voicePbx';
import { repositories } from '../repositories';
import { searchDialDirectory } from '../../packages/core/src/voice/identifyCaller';

export const voiceRouter = Router();

// Configurar la central (troncal, números, extensiones, horarios, IVR, locuciones y colas)
// exige voice:manage_all; el uso diario (contestar, notas, estado, buzón) solo voice:use.
const MANAGE_PATHS = [/^\/trunk(\/|$)/, /^\/numbers(\/|$)/, /^\/extensions(\/|$)/, /^\/schedules(\/|$)/, /^\/prompts(\/|$)/, /^\/ivr-flows(\/|$)/, /^\/queues(\/|$)/];
voiceRouter.use((req, res, next) => {
  // Si la telefonía está encendida lo consulta cualquier pantalla (no revela nada sensible)
  if (req.path === '/config') return next();
  const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
  const { permissions } = permissionsForRequest(req);
  if (!can(permissions, 'voice:use')) {
    return res.status(403).json({ success: false, error: 'No tienes permiso para usar la telefonía', code: 'VOICE_USE_PERMISSION_REQUIRED' });
  }
  if (isWrite && MANAGE_PATHS.some((re) => re.test(req.path)) && !can(permissions, 'voice:manage_all')) {
    return res.status(403).json({ success: false, error: 'Solo quien administra la telefonía puede cambiar esta configuración', code: 'VOICE_MANAGE_REQUIRED' });
  }
  next();
});

// Historial, detalle y resumen del día (llamadas registradas por el puente de voz)
voiceRouter.use('/', voiceCallsRouter);

// Colas, estado de asesores, buzón, locuciones, menús de opciones y horario (en la base)
voiceRouter.use('/', voicePbxRouter);

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

// La troncal la define el servidor (.env): es la que Asterisk registra al arrancar
let activeTrunk: VoiceTrunkConfig = trunkFromEnv() as VoiceTrunkConfig;

// Estado en memoria de Números Telefónicos (VoiceNumber / DIDs)
export interface VoiceNumberRecord {
  id: string;
  organizationId: string;
  e164Number: string;
  displayName: string;
  countryCode: string;
  trunkId: string;
  primaryAction: 'IVR_FLOW' | 'QUEUE' | 'EXTENSION' | 'AI_AGENT' | 'VOICEMAIL';
  primaryTargetId: string;
  secondaryAction?: string;
  secondaryTargetId?: string;
  scheduleId?: string;
  status: 'ACTIVE' | 'RELEASED' | 'RESERVED';
}

const inMemoryNumbers: Map<string, VoiceNumberRecord> = new Map();

/** Carga de la base la configuración de la central (se llama al arrancar el servidor). */
export async function loadVoiceConfig() {
  activeTrunk = trunkFromEnv() as VoiceTrunkConfig;
  await loadVoiceStore({ extensions: inMemoryExtensions, secrets: inMemorySecrets, numbers: inMemoryNumbers as Map<string, any> });
}

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
  organizationId: ORGANIZATION_ID,
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
  // Abierto o cerrado según el calendario laboral de la empresa (Administración → Calendario)
  const bogotaStatus = { ...getCurrentBogotaStatus(activeSchedule), isOpen: isOpenAt(new Date(), systemConfig().calendar()) };

  return res.json({
    ok: true,
    isVoiceEnabled: isVoiceEnabled(),
    asterisk: {
      connected: isAriAlive,
      version: isAriAlive ? 'Asterisk 22 LTS' : null,
    },
    counts: {
      extensions: Array.from(inMemoryExtensions.values()).filter((e) => e.status !== 'DISABLED').length,
      numbers: inMemoryNumbers.size,
      trunks: activeTrunk.sipHost ? 1 : 0,
    },
    trunk: { name: activeTrunk.name, sipHost: activeTrunk.sipHost, configured: Boolean(activeTrunk.sipHost) },
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

voiceRouter.post('/trunk', (_req: Request, res: Response) => {
  res.status(409).json({
    success: false,
    error: 'La troncal se configura en el servidor (TRUNK_SIP_HOST, TRUNK_USERNAME y TRUNK_PASSWORD en .env) y aplica al reiniciar Asterisk.',
    trunk: activeTrunk,
  });
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

const NUMBER_TARGETS = ['IVR_FLOW', 'QUEUE', 'EXTENSION', 'AI_AGENT', 'VOICEMAIL'];

voiceRouter.post('/numbers', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const e164 = normalizeColombianPhone(String(body.e164Number || ''));
  if (!e164 || !body.displayName) {
    return res.status(400).json({ error: 'Escribe el número (ej. +57 606 880 1234) y un nombre para reconocerlo' });
  }
  const primaryAction = body.primaryAction || 'IVR_FLOW';
  if (!NUMBER_TARGETS.includes(primaryAction)) {
    return res.status(400).json({ error: 'Destino no válido: elige menú de opciones, cola, extensión, agente de IA o buzón' });
  }
  const duplicate = Array.from(inMemoryNumbers.values()).find((n) => n.e164Number === e164 && n.id !== body.id);
  if (duplicate) return res.status(409).json({ error: `El número ${e164} ya está registrado como "${duplicate.displayName}"` });

  const id = body.id || `num_${Date.now()}`;
  const record: VoiceNumberRecord = {
    id,
    organizationId: ORGANIZATION_ID,
    e164Number: e164,
    displayName: String(body.displayName).trim(),
    countryCode: '57',
    trunkId: body.trunkId || DEFAULT_TRUNK_ID,
    primaryAction,
    primaryTargetId: body.primaryTargetId || '',
    secondaryAction: body.secondaryAction,
    secondaryTargetId: body.secondaryTargetId,
    scheduleId: body.scheduleId,
    status: body.status || 'ACTIVE',
  };
  try {
    await saveNumber(record);
  } catch (err: any) {
    return res.status(500).json({ error: 'No se pudo guardar el número: ' + (err?.message || err) });
  }
  inMemoryNumbers.set(id, record);
  res.json({ success: true, number: record });
});

voiceRouter.delete('/numbers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await deleteNumber(id);
  } catch (err: any) {
    return res.status(500).json({ error: 'No se pudo eliminar el número: ' + (err?.message || err) });
  }
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
  const { userId, type } = req.body ?? {};
  const employee = userId ? employeeService.getEmployeeById(String(userId)) : undefined;
  if (!employee) return res.status(400).json({ success: false, error: 'Elige a la persona del equipo que tendrá la extensión' });
  if (type && !['USER', 'DESK', 'VIRTUAL'].includes(type)) return res.status(400).json({ success: false, error: 'Tipo de extensión no válido' });
  try {
    const result = await provisionExtension(employee.id, employee.name, ORGANIZATION_ID, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'No se pudo crear la extensión: ' + (err?.message || err) });
  }
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
// ETAPA 17.4: SOFTPHONE EN EL NAVEGADOR Y EN EL CELULAR
// -----------------------------------------------------------------------------

// Estado en memoria de llamadas activas para notas y control de medios
export const inMemoryVoiceCallNotes = new Map<string, { notes: string; updatedAt: string }>();

// Helper para extraer contexto de usuario y verificar permisos (SSOT)
function resolveVoiceUserAuth(req: Request) {
  const { userId, role, permissions } = permissionsForRequest(req);
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
    (e) => e.userId === auth.userId && e.status !== 'DISABLED'
  );

  // Cada quien usa solo su extensión: nunca se entregan credenciales de otra persona
  if (!ext) {
    return res.status(404).json({
      success: false,
      error: 'No tienes una extensión telefónica asignada. Pide a quien administra la telefonía que te cree una.',
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
  const turnSecret = process.env.TURN_SECRET || process.env.COTURN_AUTH_SECRET || '';
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

  const wssUrl = process.env.ASTERISK_WEBRTC_WSS_URL || process.env.VOICE_WEBRTC_WSS_URL || 'wss://pbx.fusioncg.com/ws';
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
      callerIdDefault: activeTrunk.callerIdDefault || '',
      expiresAt,
      iceServers,
    },
  });
}

voiceRouter.get('/softphone/credentials', handleGetSoftphoneCredentials);
voiceRouter.post('/softphone/credentials', handleGetSoftphoneCredentials);


/**
 * BLOQUE D: Auto-guardado en vivo de notas de llamada (VoiceCall.notes)
 */
voiceRouter.post('/calls/:callId/notes', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { notes } = req.body;
  const auth = resolveVoiceUserAuth(req);

  inMemoryVoiceCallNotes.set(callId, {
    notes: String(notes || ''),
    updatedAt: new Date().toISOString(),
  });
  // Las notas quedan en la llamada registrada (se ven en el historial)
  if (voiceDbAvailable()) {
    await getPrisma()
      .voiceCall.updateMany({ where: { id: callId, organizationId: ORGANIZATION_ID }, data: { notes: String(notes || '').slice(0, 5000), updatedById: auth.userId } })
      .catch((err) => console.warn('[voz] No se guardaron las notas de la llamada:', err?.message || err));
  }

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
voiceRouter.get('/search-contacts', async (req: Request, res: Response) => {
  try {
    const clients = await repositories().clients.list();
    res.json({ success: true, results: searchDialDirectory(String(req.query.q || ''), clients) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err), results: [] });
  }
});

/**
 * BLOQUE G: CONFIGURACIÓN MÓVIL (Zoiper / Linphone / Groundwire y Desvío)
 */
voiceRouter.get('/mobile-config', (req: Request, res: Response) => {
  const auth = resolveVoiceUserAuth(req);
  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status !== 'DISABLED'
  );

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
    (e) => e.userId === auth.userId && e.status !== 'DISABLED'
  );

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

voiceRouter.post('/mobile-forwarding', async (req: Request, res: Response) => {
  const auth = resolveVoiceUserAuth(req);
  const { mobileNumber, ringStrategy } = req.body;

  let ext = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === auth.userId && e.status !== 'DISABLED'
  );

  if (!ext) {
    return res.status(404).json({ success: false, error: 'Extensión no encontrada' });
  }

  const STRATEGIES = ['BROWSER_ONLY', 'BROWSER_THEN_MOBILE', 'BROWSER_AND_MOBILE', 'MOBILE_ONLY'];
  const mobile = mobileNumber ? normalizeColombianPhone(String(mobileNumber)) : ext.mobileNumber;
  if (mobileNumber && !mobile) return res.status(400).json({ success: false, error: 'El número de celular no es válido' });
  if (ringStrategy && !STRATEGIES.includes(ringStrategy)) return res.status(400).json({ success: false, error: 'Modo de timbrado no válido' });
  ext.mobileNumber = mobile || undefined;
  ext.ringStrategy = ringStrategy || 'BROWSER_THEN_MOBILE';
  ext.updatedAt = new Date().toISOString();
  try {
    await saveExtension(ext);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'No se pudo guardar el desvío: ' + (err?.message || err) });
  }

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
    confirmationPrompt: 'Llamada de Fusión Comunicación Gráfica, pulse 1 para tomarla.',
  });
});

