import http from 'node:http';
import Redis from 'ioredis';
import { AriClient } from './ari/client';
import { AriEventDispatcher } from './ari/events';
import { InboundCallHandler } from './handlers/inbound';
import { OutboundCallHandler } from './handlers/outbound';
import { InternalCallHandler } from './handlers/internal';
import { VoiceRingService } from './services/ring';
import { VoiceBridgeService } from './services/bridge';
import { VoiceRecordService } from './services/record';
import { callRegistry } from './state/registry';
import { prisma, persistence } from './services/persist';
import { broadcaster } from './services/broadcast';
import { telemetry } from './telemetry';

const PORT = parseInt(process.env.PORT || '3001', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const ASTERISK_ARI_URL = process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088';
const ASTERISK_ARI_WS_URL =
  process.env.ASTERISK_ARI_WS_URL || 'ws://127.0.0.1:8088/ari/events?app=fusion-voz&subscribeAll=false';
const ASTERISK_ARI_USERNAME = process.env.ASTERISK_ARI_USERNAME || 'fusion';
const ASTERISK_ARI_PASSWORD = process.env.ASTERISK_ARI_PASSWORD || 'fusion_secret_ari_2026';
const ASTERISK_APP_NAME = 'fusion-voz';

const LOCK_KEY = 'fusion:voice:master-lock';
const LOCK_TTL_SECONDS = 10;
const INSTANCE_ID = `voice-${process.pid}-${Date.now()}`;

let isMaster = false;
let lockRenewalInterval: NodeJS.Timeout | null = null;
let orphanCallsInterval: NodeJS.Timeout | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;
let consecutiveTrunkFailures = 0;

// Inicialización de componentes ARI
const ariClient = new AriClient({
  baseUrl: ASTERISK_ARI_URL,
  wsUrl: ASTERISK_ARI_WS_URL,
  username: ASTERISK_ARI_USERNAME,
  password: ASTERISK_ARI_PASSWORD,
  appName: ASTERISK_APP_NAME,
});

const ringService = new VoiceRingService(ariClient);
const bridgeService = new VoiceBridgeService(ariClient);
const recordService = new VoiceRecordService(ariClient);

const inboundHandler = new InboundCallHandler(ariClient, ringService, bridgeService, recordService);
const outboundHandler = new OutboundCallHandler(ariClient, bridgeService, recordService);
const internalHandler = new InternalCallHandler(ariClient, ringService, bridgeService);

const dispatcher = new AriEventDispatcher(
  ariClient,
  inboundHandler,
  outboundHandler,
  internalHandler,
  recordService,
  bridgeService
);

ariClient.onEvent(async (event) => {
  await dispatcher.dispatch(event);
});

// -----------------------------------------------------------------------------
// BLOQUE A — CANDADO EN REDIS (FAILOVER ACTIVO-PASIVO)
// -----------------------------------------------------------------------------

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy: (t) => Math.min(t * 500, 5000),
});

async function tryAcquireMasterLock(): Promise<boolean> {
  try {
    const result = await redisClient.set(LOCK_KEY, INSTANCE_ID, 'EX', LOCK_TTL_SECONDS, 'NX');
    if (result === 'OK') {
      if (!isMaster) {
        telemetry.log('INFO', `Instancia ${INSTANCE_ID} adquirió el candado de master. Iniciando servicios de voz.`);
        isMaster = true;
        await startMasterOperations();
      }
      return true;
    }

    // Si ya somos el master, renovamos el TTL
    const currentMaster = await redisClient.get(LOCK_KEY);
    if (currentMaster === INSTANCE_ID) {
      await redisClient.expire(LOCK_KEY, LOCK_TTL_SECONDS);
      return true;
    }

    if (isMaster) {
      telemetry.log('WARN', `Candado de master perdido. Pasando a modo pasivo.`);
      isMaster = false;
      await stopMasterOperations();
    }
    return false;
  } catch (err: any) {
    telemetry.log('WARN', `Error consultando candado Redis: ${err.message}`);
    // Si Redis no responde en desarrollo local, asumir master único
    if (!isMaster && process.env.NODE_ENV !== 'production') {
      isMaster = true;
      await startMasterOperations();
    }
    return false;
  }
}

async function startMasterOperations(): Promise<void> {
  // 1. Conectar WebSocket ARI
  await ariClient.connect();

  // 2. Reconciliación inmediata de canales y puentes vivos
  await reconcileAsteriskState();

  // 3. Iniciar trabajo periódico de limpieza de llamadas huérfanas (cada 2 min)
  orphanCallsInterval = setInterval(cleanOrphanCalls, 120000);

  // 4. Iniciar chequeo de salud de troncal (cada 1 min)
  healthCheckInterval = setInterval(checkTrunkHealth, 60000);
}

async function stopMasterOperations(): Promise<void> {
  if (orphanCallsInterval) clearInterval(orphanCallsInterval);
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  await ariClient.disconnect();
}

// -----------------------------------------------------------------------------
// RECONCILIACIÓN TRAS RECONEXIÓN (Bloque B)
// -----------------------------------------------------------------------------

async function reconcileAsteriskState(): Promise<void> {
  try {
    telemetry.log('INFO', 'Iniciando reconciliación de estado con Asterisk (GET /channels, GET /bridges)...');
    const [liveChannels, liveBridges] = await Promise.all([
      ariClient.getChannels().catch(() => []),
      ariClient.getBridges().catch(() => []),
    ]);

    const liveChannelIds = new Set(liveChannels.map((c) => c.id));
    const activeCalls = callRegistry.getAllActiveCalls();

    let cleanedCount = 0;
    for (const call of activeCalls) {
      // Si el canal principal ya no existe en Asterisk, limpiar la llamada fantasma
      if (!liveChannelIds.has(call.channelId)) {
        telemetry.log('WARN', `Reconciliación: llamada ${call.callId} tenía canal ${call.channelId} ausente en Asterisk. Limpiando.`);
        persistence.persistCallCompletion(call, 'FAILED', 'DISCONNECTED_DURING_RECONNECT', 'SYSTEM');
        callRegistry.removeCall(call.callId);
        cleanedCount++;
      }
    }

    telemetry.log('INFO', `Reconciliación completada: ${liveChannels.length} canales, ${liveBridges.length} puentes en Asterisk. ${cleanedCount} llamadas huérfanas cerradas.`);
  } catch (err: any) {
    telemetry.log('ERROR', `Error durante la reconciliación con Asterisk: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// TRABAJO PERIÓDICO: LIMPIEZA DE LLAMADAS HUÉRFANAS (voice:orphan-calls)
// -----------------------------------------------------------------------------

async function cleanOrphanCalls(): Promise<void> {
  if (!isMaster || !ariClient.getConnected()) return;

  try {
    const liveChannels = await ariClient.getChannels();
    const liveChannelIds = new Set(liveChannels.map((c) => c.id));

    // Buscar en BD llamadas abiertas
    const openDbCalls = await prisma.voiceCall.findMany({
      where: {
        status: { in: ['RINGING', 'IN_IVR', 'IN_QUEUE', 'IN_AI', 'CONNECTED', 'ON_HOLD', 'TRANSFERRING'] },
      },
    });

    for (const dbCall of openDbCalls) {
      if (!liveChannelIds.has(dbCall.channelId)) {
        telemetry.log('WARN', `Trabajo voice:orphan-calls: canal ${dbCall.channelId} no existe en Asterisk. Cerrando VoiceCall ${dbCall.id}`);
        await prisma.voiceCall.update({
          where: { id: dbCall.id },
          data: {
            status: 'COMPLETED',
            disposition: 'FAILED',
            hangupCause: 'ORPHAN_CHANNEL_CLEANED',
            endedAt: new Date(),
            notes: 'Llamada cerrada automáticamente por el trabajo de saneamiento de llamadas huérfanas.',
          },
        });

        await broadcaster.publishToOrg(dbCall.organizationId, {
          event: 'voice.orphan_call_cleaned',
          organizationId: dbCall.organizationId,
          callId: dbCall.id,
          payload: { reason: 'ORPHAN_CLEANED' },
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (e: any) {
    telemetry.log('WARN', `Error en trabajo orphan-calls: ${e.message}`);
  }
}

// -----------------------------------------------------------------------------
// TRABAJO PERIÓDICO: SALUD DE LA TRONCAL Y EXTENSIONES (voice:health)
// -----------------------------------------------------------------------------

async function checkTrunkHealth(): Promise<void> {
  if (!isMaster || !ariClient.getConnected()) return;

  try {
    const endpoints = await ariClient.getEndpoints();
    const trunkEndpoint = endpoints.find((ep) => ep.resource === 'troncal-operador' || ep.resource.includes('troncal'));

    const isAvailable = trunkEndpoint && trunkEndpoint.state !== 'offline';

    const trunks = await prisma.voiceTrunk.findMany({
      where: { deletedAt: null },
    });

    for (const trunk of trunks) {
      if (!isAvailable) {
        consecutiveTrunkFailures++;
        if (consecutiveTrunkFailures >= 2 && trunk.status !== 'UNREGISTERED') {
          // Histéresis: alertar sólo tras 2 fallos consecutivos
          await prisma.voiceTrunk.update({
            where: { id: trunk.id },
            data: { status: 'UNREGISTERED' },
          });

          await broadcaster.publishToOrg(trunk.organizationId, {
            event: 'voice.trunk_status_changed',
            organizationId: trunk.organizationId,
            trunkId: trunk.id,
            trunkStatus: 'UNREGISTERED',
            payload: { alert: 'voz.troncal_caida', consecutiveFailures: consecutiveTrunkFailures },
            timestamp: new Date().toISOString(),
          });
          telemetry.log('ERROR', `ALERTA CRÍTICA: Troncal SIP caída para la organización ${trunk.organizationId}`);
        }
      } else {
        if (consecutiveTrunkFailures > 0 && trunk.status !== 'REGISTERED') {
          await prisma.voiceTrunk.update({
            where: { id: trunk.id },
            data: { status: 'REGISTERED' },
          });

          await broadcaster.publishToOrg(trunk.organizationId, {
            event: 'voice.trunk_status_changed',
            organizationId: trunk.organizationId,
            trunkId: trunk.id,
            trunkStatus: 'REGISTERED',
            payload: { alert: 'voz.troncal_restablecida' },
            timestamp: new Date().toISOString(),
          });
          telemetry.log('INFO', `Troncal SIP restablecida para la organización ${trunk.organizationId}`);
        }
        consecutiveTrunkFailures = 0;
      }
    }
  } catch (e: any) {
    telemetry.log('WARN', `Error en comprobación de salud de troncal: ${e.message}`);
  }
}

// -----------------------------------------------------------------------------
// ENDPOINT HTTP /health Y MÉTRICAS (Bloque I)
// -----------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    let pgOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      pgOk = true;
    } catch (e) {
      pgOk = false;
    }

    const redisStatus = broadcaster.getStatus();
    const ariOk = ariClient.getConnected();
    const activeCalls = callRegistry.getActiveCallsCount();
    const oldestCallAge = callRegistry.getOldestCallAgeSeconds();
    const metrics = telemetry.getMetrics(activeCalls);

    const isHealthy = pgOk && ariOk;
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isHealthy ? 'HEALTHY' : 'DEGRADED',
        isMaster,
        instanceId: INSTANCE_ID,
        services: {
          ari: { connected: ariOk, url: ASTERISK_ARI_URL },
          postgres: { connected: pgOk },
          redis: { connected: redisStatus.connected },
        },
        calls: {
          activeCount: activeCalls,
          oldestCallAgeSeconds: oldestCallAge,
        },
        metrics,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Endpoint para iniciar llamadas salientes (Click-to-Call desde apps/web)
  if (req.url === '/api/voice/dial' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await outboundHandler.initiateOutboundCall(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// -----------------------------------------------------------------------------
// ARRANQUE Y APAGADO ORDENADO (SIGTERM / SIGINT)
// -----------------------------------------------------------------------------

async function bootstrap(): Promise<void> {
  server.listen(PORT, '0.0.0.0', () => {
    telemetry.log('INFO', `Servicio de voz escuchando en el puerto ${PORT} (instancia ${INSTANCE_ID})`);
  });

  // Intentar adquirir candado de inmediato y luego cada 3 segundos
  await tryAcquireMasterLock();
  lockRenewalInterval = setInterval(tryAcquireMasterLock, 3000);
}

async function gracefulShutdown(signal: string): Promise<void> {
  telemetry.log('INFO', `Señal ${signal} recibida. Iniciando apagado ordenado del servicio de voz...`);

  if (lockRenewalInterval) clearInterval(lockRenewalInterval);
  if (orphanCallsInterval) clearInterval(orphanCallsInterval);
  if (healthCheckInterval) clearInterval(healthCheckInterval);

  // 1. Dejar de aceptar llamadas nuevas
  server.close();

  // 2. Esperar que terminen las llamadas en curso (hasta 30 segundos)
  const activeCalls = callRegistry.getAllActiveCalls();
  telemetry.log('INFO', `Esperando finalización de ${activeCalls.length} llamadas activas...`);

  if (activeCalls.length > 0) {
    const drainTimeout = setTimeout(async () => {
      telemetry.log('WARN', 'Timeout de gracia agotado. Colgando llamadas restantes con causa limpia...');
      for (const call of activeCalls) {
        try {
          await ariClient.hangupChannel(call.channelId, 'normal');
        } catch (e) {}
      }
    }, 30000);

    while (callRegistry.getActiveCallsCount() > 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
    clearTimeout(drainTimeout);
  }

  // 3. Desconectar WebSocket ARI y liberar candado de Redis
  await ariClient.disconnect();
  try {
    if (isMaster) {
      await redisClient.del(LOCK_KEY);
    }
    await redisClient.quit();
    await prisma.$disconnect();
  } catch (e) {}

  telemetry.log('INFO', 'Servicio de voz apagado completamente y ordenado.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap().catch((err) => {
  telemetry.log('ERROR', `Error fatal en arranque de apps/voice: ${err.message}`);
  process.exit(1);
});
