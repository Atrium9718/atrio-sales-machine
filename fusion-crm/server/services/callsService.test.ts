import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { callsService, inMemoryCallSessions, inMemoryActivities } from './callsService';
import { inMemoryChannels } from '../routes/chat';

describe('CallsService (Etapa 15.6 - LiveKit y Llamadas)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    inMemoryCallSessions.clear();
    inMemoryActivities.length = 0;
    process.env = {
      ...originalEnv,
      LIVEKIT_URL: 'http://livekit:7880',
      NEXT_PUBLIC_LIVEKIT_URL: 'https://meet.fusioncg.com',
      LIVEKIT_API_KEY: 'test-key',
      LIVEKIT_API_SECRET: 'test-secret-must-be-very-long-and-secure-1234567890',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retorna la configuración pública correcta cuando LiveKit está activo', () => {
    const config = callsService.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.serverUrl).toBe('https://meet.fusioncg.com');
  });

  it('inicia una llamada directa 1 a 1 y crea la sesión en RINGING', async () => {
    const result = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
        title: 'Llamada de coordinación de producción',
        linkedEntityType: 'PRODUCTION_PROJECT',
        linkedEntityId: 'prj-801',
      },
      'usr-admin',
      'Administrador General',
      'admin'
    );

    expect(result.session).toBeDefined();
    expect(result.session.status).toBe('RINGING');
    expect(result.session.maxParticipants).toBe(2);
    expect(result.session.invitations.length).toBe(1);
    expect(result.session.invitations[0].invitedUserId).toBe('usr-laura');
    expect(result.session.invitations[0].status).toBe('PENDING');
  });

  it('rechaza la generación de token si el usuario no fue invitado a la llamada directa (Bloque B - Seguridad)', async () => {
    // 1. Crear sesión entre usr-admin y usr-laura
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
      },
      'usr-admin',
      'Administrador'
    );

    // 2. Un tercer usuario (usr-carlos) intenta colarse solicitando token
    await expect(
      callsService.generateToken(session.roomName, 'usr-carlos', 'Carlos Mendoza', 'comercial')
    ).rejects.toThrow(/Acceso denegado/);
  });

  it('permite generar token al creador o al invitado de la llamada directa', async () => {
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
      },
      'usr-admin',
      'Administrador'
    );

    const tokenLaura = await callsService.generateToken(
      session.roomName,
      'usr-laura',
      'Laura Restrepo',
      'produccion'
    );
    expect(tokenLaura.token).toBeDefined();
    expect(typeof tokenLaura.token).toBe('string');
    expect(tokenLaura.serverUrl).toBe('https://meet.fusioncg.com');
  });

  it('responde a una llamada directa y cambia el estado a ONGOING', async () => {
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
      },
      'usr-admin',
      'Administrador'
    );

    const res = await callsService.respondCall(
      session.id,
      'usr-laura',
      'Laura Restrepo',
      'ANSWER'
    );

    expect(res.success).toBe(true);
    expect(res.session.status).toBe('ONGOING');
    expect(res.session.invitations[0].status).toBe('ACCEPTED');
  });

  it('finaliza la llamada y crea una Activity de tipo CALL vinculada al cliente/proyecto', async () => {
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
        title: 'Revisión de planos UV',
        linkedEntityType: 'CLIENT',
        linkedEntityId: 'cli-101',
      },
      'usr-admin',
      'Administrador'
    );

    await callsService.respondCall(session.id, 'usr-laura', 'Laura Restrepo', 'ANSWER');

    // Finalizar con 185 segundos (4 minutos redondeados hacia arriba)
    const endRes = await callsService.endCall(session.id, 'usr-admin', 185, true);

    expect(endRes.session.status).toBe('ENDED');
    expect(endRes.session.durationSeconds).toBe(185);
    expect(endRes.session.activityId).toBeDefined();

    expect(endRes.activity).toBeDefined();
    expect(endRes.activity.type).toBe('CALL');
    expect(endRes.activity.clientId).toBe('cli-101');
    expect(endRes.activity.durationMinutes).toBe(4); // ceil(185 / 60)
    expect(endRes.activity.body).toContain('Revisión de planos UV');
  });

  it('gestiona consentimiento de grabación y no graba hasta que todos los participantes acepten', async () => {
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
      },
      'usr-admin',
      'Administrador'
    );

    await callsService.respondCall(session.id, 'usr-laura', 'Laura Restrepo', 'ANSWER');

    // Participante 1 da consentimiento
    const consent1 = await callsService.handleRecordingConsent(session.id, 'usr-admin', true);
    expect(consent1.isRecorded).toBe(false);

    // Participante 2 da consentimiento
    const consent2 = await callsService.handleRecordingConsent(session.id, 'usr-laura', true);
    expect(consent2.isRecorded).toBe(true);
    expect(consent2.recordingUrl).toContain('https://s3.fusioncg.com/recordings/');
    expect(consent2.recordingUrl).toContain('X-Amz-Expires=900'); // 15 min TTL
  });

  it('ejecuta cleanup de llamadas en RINGING mayores a 45s convirtiéndolas en MISSED', async () => {
    const { session } = await callsService.startCall(
      {
        type: 'DIRECT',
        targetUserId: 'usr-laura',
      },
      'usr-admin',
      'Administrador'
    );

    expect(session.status).toBe('RINGING');

    // Simular que inició hace 50 segundos
    session.startedAt = new Date(Date.now() - 50 * 1000).toISOString();

    const cleanupRes = await callsService.runCallsCleanupJob();
    expect(cleanupRes.missedCount).toBe(1);
    expect(session.status).toBe('MISSED');
  });
});
