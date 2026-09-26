/**
 * Rutas y Puente de Canal de Tiempo Real Unificado por Server-Sent Events (SSE) (Fase 3)
 * Conecta DomainEventBus con clientes conectados y multiplexa Chat, Presencia y Telefonía.
 */

import { Router, Request, Response } from 'express';
import { realtimeStreamManager } from '../../packages/core/src/realtime/stream';
import { employeeService } from '../services/employeeService';
import { eventBus, DomainEvent, DomainEventType } from '../events/DomainEventBus';

export const realtimeRouter = Router();

export interface SSEClient {
  id: string;
  userId: string;
  userRole?: string;
  organizationId: string;
  req: Request;
  res: Response;
  connectedAt: Date;
  lastPingAt: Date;
}

/**
 * Pool en memoria de conexiones SSE activas
 */
export const sseClientPool = new Set<SSEClient>();

// Intervalo de Heartbeat (Ping) cada 25 segundos para evitar timeouts en proxies/firewalls
const HEARTBEAT_INTERVAL_MS = 25000;
let heartbeatTimer: NodeJS.Timeout | null = null;

function ensureHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (sseClientPool.size === 0) return;
    const now = new Date();
    const pingPayload = JSON.stringify({ ping: true, timestamp: now.toISOString() });

    for (const client of sseClientPool) {
      try {
        // 1. Comentario SSE :keep-alive para mantener vivo el socket TCP
        client.res.write(`:keep-alive ${now.toISOString()}\n\n`);
        // 2. Evento ping estructurado
        client.res.write(`event: ping\ndata: ${pingPayload}\n\n`);
        client.lastPingAt = now;
      } catch (error) {
        console.warn(`[SSE Heartbeat] Error escribiendo a cliente ${client.id}, removiendo conexión.`);
        sseClientPool.delete(client);
        try {
          client.res.end();
        } catch {}
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Sanitiza y difunde un evento de dominio empaquetado a todos los clientes SSE conectados.
 * Protocolo SSE canónico:
 * event: domain_event
 * data: {"type":"...","payload":{...},"timestamp":"..."}
 */
export function broadcastDomainEvent(event: DomainEvent): void {
  if (sseClientPool.size === 0) return;

  try {
    const sseData = JSON.stringify({
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    const sseMessage = `event: domain_event\ndata: ${sseData}\n\n`;

    for (const client of sseClientPool) {
      try {
        client.res.write(sseMessage);
      } catch (err) {
        console.warn(`[SSE Bridge] Fallo al enviar domain_event a ${client.id}, retirando del pool.`, err);
        sseClientPool.delete(client);
        try {
          client.res.end();
        } catch {}
      }
    }
  } catch (err) {
    console.error('[SSE Bridge] Error formateando evento de dominio para SSE:', err);
  }
}

/**
 * Suscribe el canal SSE a DomainEventBus.subscribeAll()
 */
let isBridgeInitialized = false;
export function initDomainEventBridge(): void {
  if (isBridgeInitialized) return;
  isBridgeInitialized = true;

  eventBus.subscribeAll((event: DomainEvent) => {
    broadcastDomainEvent(event);
  });

  console.log('[SSE Bridge 🌉] Enlace DomainEventBus -> Clientes SSE activado y enlazado.');
}

// Inicialización inmediata al cargar el módulo
initDomainEventBridge();

/**
 * Manejador central del ciclo de vida de conexiones SSE
 */
export async function handleSSEConnection(req: Request, res: Response): Promise<void> {
  const activeUser = employeeService.getActiveUser();
  const defaultUserId = activeUser.id || 'emp-03';
  const defaultRole = activeUser.roleKey || 'super_admin';

  const userId = (req.headers['x-user-id'] as string) || defaultUserId;
  const organizationId = (req.query.organizationId as string) || 'org-1';
  const userRole = (req.headers['x-user-role'] as string) || defaultRole;

  // 1. Configurar cabeceras HTTP adecuadas para Server-Sent Events
  if (!res.headersSent) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Crítico para Nginx y Cloudflare
    });
    res.flushHeaders?.();
  }

  // 2. Registrar cliente en el pool en memoria
  const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const client: SSEClient = {
    id: clientId,
    userId,
    userRole,
    organizationId,
    req,
    res,
    connectedAt: new Date(),
    lastPingAt: new Date(),
  };

  sseClientPool.add(client);
  ensureHeartbeat();

  console.log(`[SSE Pool 📡] Cliente conectado [${clientId}] (Usuario: ${userId}, Rol: ${userRole}). Total activos: ${sseClientPool.size}`);

  // 3. Emitir handshake / bienvenida
  const welcomeData = JSON.stringify({
    type: 'SSE_CONNECTED',
    payload: {
      clientId,
      userId,
      organizationId,
      userRole,
      serverTime: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
  res.write(`event: domain_event\ndata: ${welcomeData}\n\n`);

  // 4. Multiplexar con realtimeStreamManager para no romper eventos de chat ni VoIP
  try {
    await realtimeStreamManager.handleConnection(req, res, userId, organizationId, userRole);
  } catch (err) {
    console.warn('[SSE] Sincronización con streamManager:', err);
  }

  // 5. Manejo del ciclo de vida y prevención estricta de memory leaks
  req.on('close', () => {
    sseClientPool.delete(client);
    console.log(`[SSE Pool 📡] Cliente desconectado limpiamente [${clientId}] (Usuario: ${userId}). Total activos: ${sseClientPool.size}`);
    try {
      res.end();
    } catch {}
  });

  req.on('error', (err) => {
    console.warn(`[SSE Pool 📡] Error en conexión [${clientId}]:`, err);
    sseClientPool.delete(client);
    try {
      res.end();
    } catch {}
  });
}

/**
 * GET /api/realtime/stream
 * Canal unificado SSE por usuario.
 */
realtimeRouter.get('/stream', handleSSEConnection);

/**
 * GET /api/realtime
 * Alias directo para conexión SSE
 */
realtimeRouter.get('/', handleSSEConnection);

/**
 * MIGRACIÓN DE ETAPA 6:
 * GET /api/stream/commercial-deviations
 */
realtimeRouter.get('/commercial-deviations', handleSSEConnection);

/**
 * POST /api/realtime/typing
 * Emite un indicador de escritura para un canal específico (con expiración de 5s)
 */
realtimeRouter.post('/typing', (req: Request, res: Response) => {
  const activeUser = employeeService.getActiveUser();
  const defaultUserId = activeUser.id || 'emp-03';
  const defaultName = activeUser.name || 'Cristian Andrés Sepúlveda';

  const { channelId, isTyping } = req.body;
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || defaultUserId;
  const userName = (req.headers['x-user-name'] as string) || req.body.userName || defaultName;

  if (!channelId) {
    return res.status(400).json({ error: 'channelId es requerido' });
  }

  realtimeStreamManager.setTyping(channelId, userId, userName, !!isTyping);
  return res.json({ success: true });
});

/**
 * GET /api/realtime/status
 * Métricas de conexiones en vivo para monitoreo y depuración
 */
realtimeRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    activeSSEPoolConnections: sseClientPool.size,
    activeStreamManagerConnections: realtimeStreamManager.getConnectionsCount(),
    activeUserIds: Array.from(new Set(Array.from(sseClientPool).map((c) => c.userId))),
    serverTime: new Date().toISOString(),
  });
});

/**
 * POST /api/realtime/test-event
 * Endpoint de prueba y validación para emitir un evento de dominio
 */
realtimeRouter.post('/test-event', (req: Request, res: Response) => {
  const { type, payload } = req.body;
  const allowedTypes: DomainEventType[] = [
    'EMPLOYEE_CREATED',
    'EMPLOYEE_UPDATED',
    'EMPLOYEE_DEACTIVATED',
    'PROJECT_STAGE_CHANGED',
    'QUOTE_APPROVED',
  ];

  if (!type || !allowedTypes.includes(type)) {
    return res.status(400).json({
      error: `Tipo de evento inválido. Permitidos: ${allowedTypes.join(', ')}`,
    });
  }

  const published = eventBus.publish(type, payload);
  return res.json({ success: true, published });
});

/**
 * Cierre limpio de todas las conexiones SSE al reiniciar o apagar el servidor
 */
export function closeAllSSEClients(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  for (const client of sseClientPool) {
    try {
      client.res.write(`event: shutdown\ndata: {"message":"Servidor reiniciando"}\n\n`);
      client.res.end();
    } catch {}
  }
  sseClientPool.clear();
}

