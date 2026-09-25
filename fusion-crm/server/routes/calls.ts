import { Router, Request, Response } from 'express';
import { callsService, inMemoryCallSessions } from '../services/callsService';
import { employeeService } from '../services/employeeService';
import {
  StartCallSchema,
  CallTokenSchema,
  RespondCallSchema,
  EndCallSchema,
  LeaveParticipantSchema,
} from '../../packages/core/src/calls/types';
import { isLiveKitConfigured } from '../../packages/config/src/env';

export const callsRouter = Router();

function getCallsAuth(req: Request) {
  const activeUser = employeeService.getActiveUser();
  const userId = (req.headers['x-user-id'] as string) || activeUser.id || 'emp-03';
  const userName = (req.headers['x-user-name'] as string) || activeUser.name || 'Cristian Andrés Sepúlveda';
  const userRole = (req.headers['x-user-role'] as string) || activeUser.roleKey || 'super_admin';
  return { userId, userName, userRole };
}

/**
 * GET /api/calls/config
 * Retorna la configuración pública de LiveKit (servidor, si está habilitado o no).
 * Si no está configurado, enabled = false para que la interfaz apague los botones.
 */
callsRouter.get('/config', (_req: Request, res: Response) => {
  const config = callsService.getConfig();
  return res.json(config);
});

/**
 * POST /api/calls/start
 * Inicia una nueva llamada (1 a 1, de grupo o de reunión)
 */
callsRouter.post('/start', async (req: Request, res: Response) => {
  if (!isLiveKitConfigured()) {
    return res.status(503).json({
      error: 'El servicio de videollamadas no está configurado en el servidor.',
      enabled: false,
    });
  }

  const parseResult = StartCallSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos de llamada inválidos', details: parseResult.error.format() });
  }

  const { userId, userName, userRole } = getCallsAuth(req);

  try {
    const result = await callsService.startCall(parseResult.data, userId, userName, userRole);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Error al iniciar la llamada' });
  }
});

/**
 * POST /api/calls/token
 * Obtiene un AccessToken de LiveKit para un room específico.
 * VERIFICA EN EL SERVIDOR que el usuario pertenezca al canal o esté invitado (BLOQUE B).
 */
callsRouter.post('/token', async (req: Request, res: Response) => {
  if (!isLiveKitConfigured()) {
    return res.status(503).json({
      error: 'El servicio de videollamadas no está configurado en el servidor.',
      enabled: false,
    });
  }

  const parseResult = CallTokenSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'roomName es requerido', details: parseResult.error.format() });
  }

  const { userId, userName, userRole } = getCallsAuth(req);
  const userPermissions = ((req.headers['x-user-permissions'] as string) || '').split(',').map((p) => p.trim());

  try {
    const tokenData = await callsService.generateToken(
      parseResult.data.roomName,
      userId,
      userName,
      userRole,
      userPermissions
    );
    return res.json(tokenData);
  } catch (err: any) {
    const statusCode = err?.statusCode || 400;
    return res.status(statusCode).json({ error: err?.message || 'Error al generar token' });
  }
});

/**
 * POST /api/calls/respond
 * Contesta, rechaza o responde con mensaje a una llamada entrante
 */
callsRouter.post('/respond', async (req: Request, res: Response) => {
  const parseResult = RespondCallSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos de respuesta inválidos', details: parseResult.error.format() });
  }

  const { userId, userName } = getCallsAuth(req);

  try {
    const result = await callsService.respondCall(
      parseResult.data.sessionId,
      userId,
      userName,
      parseResult.data.action,
      parseResult.data.declineMessage
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Error al procesar respuesta de llamada' });
  }
});

/**
 * POST /api/calls/end
 * Finaliza la sesión de llamada y crea la Activity correspondiente
 */
callsRouter.post('/end', async (req: Request, res: Response) => {
  const parseResult = EndCallSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos para finalizar llamada' });
  }

  const { userId } = getCallsAuth(req);

  try {
    const result = await callsService.endCall(
      parseResult.data.sessionId,
      userId,
      parseResult.data.durationSeconds,
      parseResult.data.hadScreenShare,
      parseResult.data.reason
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Error al finalizar llamada' });
  }
});

/**
 * POST /api/calls/record/consent
 * Registra consentimiento explícito de grabación de un participante
 */
callsRouter.post('/record/consent', async (req: Request, res: Response) => {
  const { sessionId, consent } = req.body;
  const { userId } = getCallsAuth(req);

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId es requerido' });
  }

  try {
    const result = await callsService.handleRecordingConsent(sessionId, userId, Boolean(consent));
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Error al registrar consentimiento de grabación' });
  }
});

/**
 * POST /api/calls/participant/leave
 * Registra la salida de un participante con su reporte de calidad de conexión
 */
callsRouter.post('/participant/leave', (req: Request, res: Response) => {
  const parseResult = LeaveParticipantSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos de participante inválidos' });
  }

  const { userId } = getCallsAuth(req);

  callsService.leaveParticipant(
    parseResult.data.sessionId,
    userId,
    parseResult.data.connectionQuality as any,
    parseResult.data.durationSeconds,
    parseResult.data.device,
    parseResult.data.leftReason
  );

  return res.json({ success: true });
});

/**
 * GET /api/calls/room/:roomName
 * Obtiene los datos de una sala por su nombre
 */
callsRouter.get('/room/:roomName', (req: Request, res: Response) => {
  const { roomName } = req.params;
  const session = Array.from(inMemoryCallSessions.values()).find((s) => s.roomName === roomName);
  if (!session) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  return res.json({ session });
});

/**
 * GET /api/calls/active
 * Obtiene la llamada activa para el usuario autenticado (llamada entrante o en curso)
 */
callsRouter.get('/active', (req: Request, res: Response) => {
  const { userId } = getCallsAuth(req);

  // Buscar llamada en RINGING donde el usuario sea el invitado
  const incoming = Array.from(inMemoryCallSessions.values()).find(
    (s) =>
      s.status === 'RINGING' &&
      s.invitations.some((inv) => inv.invitedUserId === userId && inv.status === 'PENDING')
  );

  if (incoming) {
    return res.json({ activeCall: incoming, isIncoming: true });
  }

  // Buscar llamada ONGOING donde el usuario sea participante activo
  const ongoing = Array.from(inMemoryCallSessions.values()).find(
    (s) =>
      s.status === 'ONGOING' &&
      s.participants.some((p) => p.userId === userId && !p.leftAt)
  );

  return res.json({ activeCall: ongoing || null, isIncoming: false });
});

/**
 * POST /api/calls/cleanup
 * Endpoint para invocar el job de limpieza (calls:cleanup)
 */
callsRouter.post('/cleanup', async (_req: Request, res: Response) => {
  const result = await callsService.runCallsCleanupJob();
  return res.json({ success: true, ...result });
});
