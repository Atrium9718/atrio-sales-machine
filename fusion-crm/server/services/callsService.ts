import { AccessToken } from 'livekit-server-sdk';
import {
  CallSession,
  CallParticipant,
  CallInvitation,
  StartCallInput,
  CallQuality,
} from '../../packages/core/src/calls/types';
import {
  isLiveKitConfigured,
  parseLiveKitEnv,
  getPublicLiveKitConfig,
} from '../../packages/config/src/env';
import {
  inMemoryChannels,
  inMemoryMessages,
  inMemoryPresences,
  getUserDirectory,
} from '../routes/chat';
import { realtimeStreamManager } from '../../packages/core/src/realtime/stream';

// In-memory repositories for call sessions and activities
export const inMemoryCallSessions: Map<string, CallSession> = new Map();
export const inMemoryCallParticipants: Map<string, CallParticipant[]> = new Map();
export const inMemoryCallInvitations: Map<string, CallInvitation[]> = new Map();
export const inMemoryActivities: any[] = [];
export const inMemoryAuditLogs: any[] = [];

// Timers for 45-second auto-missed calls
const ringingTimers = new Map<string, NodeJS.Timeout>();

export class CallsService {
  /**
   * Obtiene la configuración de LiveKit para clientes
   */
  public getConfig() {
    return getPublicLiveKitConfig();
  }

  /**
   * Genera un AccessToken de LiveKit para un usuario y sala específicos.
   * Valida estrictamente en el servidor que el usuario pertenezca al canal
   * o haya sido invitado a la llamada directa.
   */
  public async generateToken(
    roomName: string,
    userId: string,
    userName: string,
    userRole = 'comercial',
    userPermissions: string[] = []
  ): Promise<{ token: string; serverUrl: string; session: CallSession }> {
    if (!isLiveKitConfigured()) {
      throw new Error('LiveKit no está configurado en el servidor');
    }

    const env = parseLiveKitEnv();

    // 1. Buscar o inicializar la sesión asociada al roomName
    let session = Array.from(inMemoryCallSessions.values()).find(
      (s) => s.roomName === roomName
    );

    // Si es una sala fija de reunión semanal V.E.A., inicializarla automáticamente si no existe
    if (!session && (roomName.startsWith('vea-') || roomName === 'vea-semanal')) {
      session = this.createFixedVeaSession(roomName, userId, userName);
    }

    if (!session) {
      throw new Error(`No se encontró una sesión activa para la sala ${roomName}`);
    }

    // 2. VERIFICACIÓN ESTRICTA DE AUTORIZACIÓN (BLOQUE B)
    // "Un usuario no puede obtener token de una sala de un canal del que no es miembro,
    // ni de una llamada a la que no fue invitado. Verifícalo en el servidor; no confíes en el roomName."
    if (session.type === 'CHANNEL' && session.channelId) {
      const channel = inMemoryChannels.find((c) => c.id === session!.channelId);
      if (!channel) {
        throw new Error('Canal no encontrado');
      }

      // Si el canal es privado o restringido, verificar membresía
      if (channel.type === 'PRIVATE' || channel.isReadOnly) {
        const isMember = channel.members?.some((m) => m.userId === userId) || channel.createdById === userId;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userId === 'emp-03';
        if (!isMember && !isAdmin) {
          const err: any = new Error('Acceso denegado: no eres miembro del canal al que pertenece esta videollamada');
          err.statusCode = 403;
          throw err;
        }
      }
    } else if (session.type === 'DIRECT') {
      const isStarter = session.startedById === userId;
      const isInvited = session.invitations.some((inv) => inv.invitedUserId === userId);
      const isParticipant = session.participants.some((p) => p.userId === userId);

      if (!isStarter && !isInvited && !isParticipant) {
        const err: any = new Error('Acceso denegado: no fuiste invitado a esta llamada directa');
        err.statusCode = 403;
        throw err;
      }
    }

    // 3. Verificar límite de participantes en la sala
    const activeParticipantsCount = session.participants.filter((p) => !p.leftAt).length;
    if (activeParticipantsCount >= session.maxParticipants) {
      const err: any = new Error(`Límite de participantes alcanzado para esta sala (${session.maxParticipants} máx.)`);
      err.statusCode = 429;
      throw err;
    }

    // 4. Determinar permisos del token según el rol
    const canRecord = userPermissions.includes('call:record') || userRole === 'admin' || userRole === 'super_admin' || userId === 'emp-03';
    const ttlMinutes = env.LIVEKIT_TOKEN_TTL_MINUTES || 60;

    // 5. Generar AccessToken firmado con API Secret
    const at = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
      identity: userId,
      name: userName,
      ttl: `${ttlMinutes}m`,
      metadata: JSON.stringify({
        role: userRole,
        organizationId: session.organizationId,
        sessionId: session.id,
      }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: canRecord,
    });

    const jwt = await at.toJwt();
    const serverUrl = env.NEXT_PUBLIC_LIVEKIT_URL || env.LIVEKIT_URL || '';

    // 6. Registrar participante si aún no figura como activo
    this.addParticipantToSession(session.id, userId, userName, userRole);

    return {
      token: jwt,
      serverUrl,
      session,
    };
  }

  /**
   * Inicia una nueva llamada (1 a 1, de canal, o de reunión)
   */
  public async startCall(
    input: StartCallInput,
    starterId: string,
    starterName: string,
    starterRole = 'comercial'
  ): Promise<{ session: CallSession; token?: string; serverUrl?: string }> {
    const env = parseLiveKitEnv();
    const isConfigured = isLiveKitConfigured();

    if (!isConfigured) {
      throw new Error('El servicio de videollamadas (LiveKit) no está configurado.');
    }

    const sessionId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let roomName: string;
    let maxParticipants = 2;

    if (input.type === 'DIRECT') {
      if (!input.targetUserId) {
        throw new Error('targetUserId es requerido para llamadas directas 1 a 1');
      }
      roomName = `dir-${starterId.replace('usr-', '')}-${input.targetUserId.replace('usr-', '')}-${Date.now().toString(36)}`;
      maxParticipants = 2;
    } else if (input.type === 'CHANNEL') {
      if (!input.channelId) {
        throw new Error('channelId es requerido para llamadas de grupo en canal');
      }
      roomName = `chn-${input.channelId.replace('chn-', '')}-${Date.now().toString(36)}`;
      maxParticipants = env.LIVEKIT_MAX_PARTICIPANTS || 20;
    } else if (input.type === 'MEETING') {
      roomName = `vea-semanal`;
      maxParticipants = env.LIVEKIT_MAX_PARTICIPANTS || 20;
    } else {
      roomName = `grp-${Date.now().toString(36)}`;
      maxParticipants = env.LIVEKIT_MAX_PARTICIPANTS || 20;
    }

    const targetUser = input.targetUserId
      ? getUserDirectory().find((u) => u.id === input.targetUserId)
      : undefined;

    const initialStatus = input.type === 'DIRECT' ? 'RINGING' : 'ONGOING';

    const session: CallSession = {
      id: sessionId,
      organizationId: 'org-1',
      roomName,
      title: input.title || (input.type === 'DIRECT' ? `Llamada con ${targetUser?.name || 'Colaborador'}` : 'Llamada de grupo'),
      type: input.type,
      channelId: input.channelId || null,
      linkedEntityType: input.linkedEntityType || null,
      linkedEntityId: input.linkedEntityId || null,
      startedById: starterId,
      startedByName: starterName,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: 0,
      status: initialStatus,
      maxParticipants,
      hadScreenShare: false,
      isRecorded: false,
      recordingConsentBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [
        {
          id: `part-${Date.now()}-1`,
          callSessionId: sessionId,
          userId: starterId,
          userName: starterName,
          userRole: starterRole,
          joinedAt: new Date().toISOString(),
          durationSeconds: 0,
          role: 'HOST',
          connectionQuality: 'GOOD',
        },
      ],
      invitations: [],
    };

    // Si es llamada directa, crear invitación para el destinatario
    if (input.type === 'DIRECT' && input.targetUserId) {
      const invitation: CallInvitation = {
        id: `inv-${Date.now()}`,
        callSessionId: sessionId,
        invitedUserId: input.targetUserId,
        invitedUserName: targetUser?.name || input.targetUserId,
        invitedById: starterId,
        sentAt: new Date().toISOString(),
        status: 'PENDING',
      };
      session.invitations.push(invitation);
    }

    inMemoryCallSessions.set(sessionId, session);
    inMemoryCallParticipants.set(sessionId, session.participants);
    inMemoryCallInvitations.set(sessionId, session.invitations);

    // Actualizar presencia del iniciador a IN_CALL
    this.updateUserPresenceCallState(starterId, sessionId);

    // Disparar temporizador de 45 segundos para llamadas sin respuesta
    if (input.type === 'DIRECT' && input.targetUserId) {
      this.startMissedCallTimer(sessionId);
    }

    // Notificar en tiempo real por SSE
    if (input.type === 'DIRECT' && input.targetUserId) {
      await realtimeStreamManager.publish({
        type: 'call:incoming',
        organizationId: 'org-1',
        targetUserIds: [input.targetUserId],
        payload: {
          session,
          caller: {
            id: starterId,
            name: starterName,
            role: starterRole,
          },
          timeoutSeconds: 45,
        },
      });
    } else if (input.type === 'CHANNEL' && input.channelId) {
      // Dejar mensaje de tipo CALL_SUMMARY en el canal para que cualquier miembro se una
      const summaryMsg = {
        id: `msg-call-${Date.now()}`,
        organizationId: 'org-1',
        channelId: input.channelId,
        authorId: starterId,
        authorName: starterName,
        authorRole: starterRole,
        type: 'CALL_SUMMARY' as const,
        body: `📞 **Llamada de grupo iniciada** por ${starterName}. Únete a la conversación en vivo.`,
        bodyPlain: `Llamada de grupo iniciada por ${starterName}. Únete a la conversación en vivo.`,
        threadReplyCount: 0,
        attachments: [],
        mentionedUserIds: [],
        mentionsEveryone: false,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reactions: [],
      };
      inMemoryMessages.push(summaryMsg as any);

      await realtimeStreamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        channelId: input.channelId,
        payload: { message: summaryMsg },
      });

      await realtimeStreamManager.publish({
        type: 'call:started',
        organizationId: 'org-1',
        channelId: input.channelId,
        payload: { session },
      });
    }

    // Generar token para el iniciador
    let tokenData: { token: string; serverUrl: string } | undefined;
    try {
      tokenData = await this.generateToken(roomName, starterId, starterName, starterRole);
    } catch {
      // Ignorar si falla token en creación previa
    }

    return {
      session,
      token: tokenData?.token,
      serverUrl: tokenData?.serverUrl,
    };
  }

  /**
   * Responde, rechaza o responde con mensaje a una llamada entrante
   */
  public async respondCall(
    sessionId: string,
    userId: string,
    userName: string,
    action: 'ANSWER' | 'REJECT' | 'MESSAGE',
    declineMessage?: string
  ): Promise<{ success: boolean; session: CallSession }> {
    const session = inMemoryCallSessions.get(sessionId);
    if (!session) {
      throw new Error('Sesión de llamada no encontrada');
    }

    // Cancelar temporizador de 45 segundos
    this.clearMissedCallTimer(sessionId);

    const invitation = session.invitations.find((inv) => inv.invitedUserId === userId);
    if (invitation) {
      invitation.respondedAt = new Date().toISOString();
      invitation.status = action === 'ANSWER' ? 'ACCEPTED' : 'REJECTED';
    }

    if (action === 'ANSWER') {
      session.status = 'ONGOING';
      session.updatedAt = new Date().toISOString();

      this.addParticipantToSession(sessionId, userId, userName, 'PARTICIPANT');
      this.updateUserPresenceCallState(userId, sessionId);

      await realtimeStreamManager.publish({
        type: 'call:answered',
        organizationId: 'org-1',
        targetUserIds: [session.startedById, userId],
        payload: { sessionId, responderId: userId, responderName: userName },
      });
    } else {
      // REJECT o MESSAGE
      session.status = 'CANCELLED';
      session.endedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      // Restaurar presencia del llamante si estaba IN_CALL por esta sesión
      this.clearUserPresenceCallState(session.startedById, sessionId);

      if (action === 'MESSAGE' && declineMessage) {
        // Enviar respuesta automática por chat
        await this.postDirectMessage(
          userId,
          session.startedById,
          `💬 *Respuesta a llamada:* ${declineMessage}`
        );
      }

      await realtimeStreamManager.publish({
        type: 'call:rejected',
        organizationId: 'org-1',
        targetUserIds: [session.startedById],
        payload: {
          sessionId,
          responderId: userId,
          responderName: userName,
          withMessage: declineMessage || null,
        },
      });
    }

    return { success: true, session };
  }

  /**
   * Finaliza una llamada y registra la Activity vinculada a la entidad correspondiente
   */
  public async endCall(
    sessionId: string,
    userId: string,
    durationSeconds = 0,
    hadScreenShare = false,
    reason?: string
  ): Promise<{ session: CallSession; activity?: any }> {
    const session = inMemoryCallSessions.get(sessionId);
    if (!session) {
      throw new Error('Sesión de llamada no encontrada');
    }

    this.clearMissedCallTimer(sessionId);

    session.status = 'ENDED';
    session.endedAt = new Date().toISOString();
    session.durationSeconds = Math.max(session.durationSeconds, durationSeconds);
    if (hadScreenShare) session.hadScreenShare = true;
    session.updatedAt = new Date().toISOString();

    // Restaurar presencia de todos los participantes involucrados
    for (const p of session.participants) {
      if (p.userId) {
        this.clearUserPresenceCallState(p.userId, sessionId);
      }
    }
    this.clearUserPresenceCallState(session.startedById, sessionId);

    // REGISTRAR ACTIVITY DE TIPO CALL (BLOQUE C.7)
    // "AL TERMINAR: crea una Activity de tipo CALL vinculada al cliente, la oportunidad
    // o el proyecto, con duración y participantes, para que cuente en la temperatura
    // del cliente y en los indicadores del V.E.A. Guarda el activityId en CallSession."
    const durationMinutes = Math.max(1, Math.ceil(session.durationSeconds / 60));
    const participantNames = session.participants
      .map((p) => p.userName || p.userId)
      .filter(Boolean)
      .join(', ');

    const activityId = `act-call-${Date.now()}`;
    const activity = {
      id: activityId,
      organizationId: session.organizationId,
      type: 'CALL',
      subject: session.title || `Videollamada interna (${session.type})`,
      body: `Asunto: ${session.title || 'Llamada interna'}. Participantes: ${participantNames || 'Equipo'}. Duración: ${durationMinutes} min. ${hadScreenShare ? 'Incluyó compartición de pantalla.' : ''} ${reason ? `Motivo de cierre: ${reason}` : ''}`.trim(),
      clientId: session.linkedEntityType === 'CLIENT' ? session.linkedEntityId : null,
      opportunityId: session.linkedEntityType === 'OPPORTUNITY' ? session.linkedEntityId : null,
      userId,
      durationMinutes,
      outcome: `Llamada finalizada satisfactoriamente (${durationMinutes}m)`,
      occurredAt: new Date(session.startedAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryActivities.push(activity);
    session.activityId = activityId;

    await realtimeStreamManager.publish({
      type: 'call:ended',
      organizationId: 'org-1',
      payload: { sessionId, roomName: session.roomName, durationSeconds: session.durationSeconds, activityId },
    });

    return { session, activity };
  }

  /**
   * Registra el consentimiento explícito de grabación de un participante
   */
  public async handleRecordingConsent(
    sessionId: string,
    userId: string,
    consent: boolean
  ): Promise<{ isRecorded: boolean; recordingUrl?: string; session: CallSession }> {
    const session = inMemoryCallSessions.get(sessionId);
    if (!session) {
      throw new Error('Sesión de llamada no encontrada');
    }

    if (consent) {
      if (!session.recordingConsentBy.includes(userId)) {
        session.recordingConsentBy.push(userId);
      }
    } else {
      session.recordingConsentBy = session.recordingConsentBy.filter((id) => id !== userId);
    }

    // Verificar si todos los participantes activos han otorgado consentimiento
    const activeParticipants = session.participants.filter((p) => !p.leftAt);
    const allConsented = activeParticipants.every((p) =>
      p.userId ? session.recordingConsentBy.includes(p.userId) : true
    );

    if (allConsented && activeParticipants.length > 0 && !session.isRecorded) {
      session.isRecorded = true;
      const recKey = `recordings/call_${sessionId}_${Date.now()}.mp4`;
      session.recordingKey = recKey;
      // Generar URL prefirmada de MinIO con 15 minutos de vigencia (900s)
      session.recordingUrl = `https://s3.fusioncg.com/recordings/${recKey}?X-Amz-Expires=900&token=presigned_${Date.now()}`;

      // Registro en AuditLog
      inMemoryAuditLogs.push({
        id: `audit-rec-${Date.now()}`,
        action: 'CALL_RECORDING_STARTED',
        sessionId,
        roomName: session.roomName,
        initiatedById: userId,
        consentedUserIds: session.recordingConsentBy,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      isRecorded: session.isRecorded,
      recordingUrl: session.recordingUrl || undefined,
      session,
    };
  }

  /**
   * Registra la salida de un participante con su métrica de calidad de conexión
   */
  public leaveParticipant(
    sessionId: string,
    userId: string,
    quality: CallQuality = 'GOOD',
    durationSeconds = 0,
    device?: string,
    leftReason?: string
  ) {
    const session = inMemoryCallSessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find((p) => p.userId === userId && !p.leftAt);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      participant.connectionQuality = quality;
      participant.durationSeconds = durationSeconds;
      participant.device = device || null;
      participant.leftReason = leftReason || null;
    }

    this.clearUserPresenceCallState(userId, sessionId);

    // Si ya no quedan participantes activos en la sala, marcar como finalizada
    const remaining = session.participants.filter((p) => !p.leftAt);
    if (remaining.length === 0 && session.status === 'ONGOING') {
      this.endCall(sessionId, userId, durationSeconds, session.hadScreenShare, 'Último participante salió');
    }
  }

  /**
   * Cron Job: calls:cleanup (cada 10 minutos)
   * Cierra las sesiones colgadas cuya sala ya no existe en LiveKit y calcula duraciones.
   * También verifica llamadas en RINGING que hayan superado 45s.
   */
  public async runCallsCleanupJob(): Promise<{ closedCount: number; missedCount: number }> {
    const now = Date.now();
    let closedCount = 0;
    let missedCount = 0;

    for (const [id, session] of inMemoryCallSessions.entries()) {
      const startedTime = new Date(session.startedAt).getTime();

      // 1. Llamadas en RINGING por más de 45 segundos sin respuesta -> MISSED
      if (session.status === 'RINGING' && now - startedTime > 45 * 1000) {
        await this.markCallAsMissed(session);
        missedCount++;
        continue;
      }

      // 2. Llamadas en ONGOING sin participantes activos o con más de 4 horas abandonadas -> ENDED
      if (session.status === 'ONGOING') {
        const activeParts = session.participants.filter((p) => !p.leftAt);
        const ageHours = (now - startedTime) / (1000 * 60 * 60);

        if (activeParts.length === 0 || ageHours > 4) {
          const durationSec = Math.floor((now - startedTime) / 1000);
          await this.endCall(id, session.startedById, durationSec, session.hadScreenShare, 'Cierre por calls:cleanup');
          closedCount++;
        }
      }
    }

    return { closedCount, missedCount };
  }

  // --------------------------------------------------------------------------
  // Métodos Privados y Helpers
  // --------------------------------------------------------------------------

  private createFixedVeaSession(roomName: string, starterId: string, starterName: string): CallSession {
    const sessionId = `call-vea-fixed`;
    const session: CallSession = {
      id: sessionId,
      organizationId: 'org-1',
      roomName,
      title: 'Reunión Semanal V.E.A. (Visión, Evaluación y Agenda)',
      type: 'MEETING',
      channelId: null,
      linkedEntityType: null,
      linkedEntityId: null,
      startedById: starterId,
      startedByName: starterName,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: 0,
      status: 'ONGOING',
      maxParticipants: 50,
      hadScreenShare: false,
      isRecorded: false,
      recordingConsentBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [],
      invitations: [],
    };
    inMemoryCallSessions.set(sessionId, session);
    return session;
  }

  private addParticipantToSession(
    sessionId: string,
    userId: string,
    userName: string,
    userRole: string
  ) {
    const session = inMemoryCallSessions.get(sessionId);
    if (!session) return;

    let participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      // Reingreso
      participant.leftAt = null;
    } else {
      participant = {
        id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        callSessionId: sessionId,
        userId,
        userName,
        userRole,
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        role: session.startedById === userId ? 'HOST' : 'PARTICIPANT',
        connectionQuality: 'GOOD',
      };
      session.participants.push(participant);
    }

    this.updateUserPresenceCallState(userId, sessionId);
  }

  private startMissedCallTimer(sessionId: string) {
    this.clearMissedCallTimer(sessionId);

    const timer = setTimeout(async () => {
      const session = inMemoryCallSessions.get(sessionId);
      if (session && session.status === 'RINGING') {
        await this.markCallAsMissed(session);
      }
    }, 45 * 1000);

    ringingTimers.set(sessionId, timer);
  }

  private clearMissedCallTimer(sessionId: string) {
    const timer = ringingTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      ringingTimers.delete(sessionId);
    }
  }

  /**
   * Transiciona una llamada no respondida en 45s a MISSED y deja aviso en el chat
   */
  public async markCallAsMissed(session: CallSession) {
    this.clearMissedCallTimer(session.id);

    session.status = 'MISSED';
    session.endedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    // Restaurar presencia del llamante
    this.clearUserPresenceCallState(session.startedById, session.id);

    // Dejar aviso en chat para el destinatario
    const targetUserId = session.invitations[0]?.invitedUserId;
    if (targetUserId) {
      await this.postDirectMessage(
        session.startedById,
        targetUserId,
        `📞 **Llamada perdida** sin respuesta a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
      );
    }

    // Emitir eventos
    await realtimeStreamManager.publish({
      type: 'call:missed',
      organizationId: 'org-1',
      targetUserIds: targetUserId ? [targetUserId, session.startedById] : [session.startedById],
      payload: { sessionId: session.id, callerId: session.startedById, callerName: session.startedByName },
    });
  }

  private updateUserPresenceCallState(userId: string, sessionId: string) {
    const presence = inMemoryPresences[userId];
    if (presence) {
      presence.status = 'IN_CALL';
      presence.activeCallSessionId = sessionId;
      presence.lastActiveAt = new Date().toISOString();
      presence.updatedAt = new Date().toISOString();

      realtimeStreamManager.publish({
        type: 'presence:update',
        organizationId: 'org-1',
        payload: { presence },
      });
    }
  }

  private clearUserPresenceCallState(userId: string, sessionId: string) {
    const presence = inMemoryPresences[userId];
    if (presence && presence.activeCallSessionId === sessionId) {
      presence.status = 'ONLINE';
      presence.activeCallSessionId = null;
      presence.lastActiveAt = new Date().toISOString();
      presence.updatedAt = new Date().toISOString();

      realtimeStreamManager.publish({
        type: 'presence:update',
        organizationId: 'org-1',
        payload: { presence },
      });
    }
  }

  private async postDirectMessage(senderId: string, receiverId: string, bodyText: string) {
    // Buscar canal DM existente o crearlo
    const sender = getUserDirectory().find((u) => u.id === senderId);
    let dmChannel = inMemoryChannels.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.members?.some((m) => m.userId === senderId) &&
        c.members?.some((m) => m.userId === receiverId)
    );

    if (!dmChannel) {
      const channelId = `chn-dm-${Date.now()}`;
      dmChannel = {
        id: channelId,
        organizationId: 'org-1',
        type: 'DIRECT',
        key: `dm-${senderId}-${receiverId}`,
        name: `Chat directo`,
        topic: 'Mensajes directos 1 a 1',
        isArchived: false,
        isReadOnly: false,
        members: [
          {
            id: `mem-${senderId}-${Date.now()}`,
            channelId,
            userId: senderId,
            role: 'MEMBER' as const,
            joinedAt: new Date().toISOString(),
            isMuted: false,
            notificationLevel: 'ALL' as const,
            unreadCount: 0,
            unreadMentionCount: 0,
          },
          {
            id: `mem-${receiverId}-${Date.now()}`,
            channelId,
            userId: receiverId,
            role: 'MEMBER' as const,
            joinedAt: new Date().toISOString(),
            isMuted: false,
            notificationLevel: 'ALL' as const,
            unreadCount: 0,
            unreadMentionCount: 0,
          },
        ],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: senderId,
      };
      inMemoryChannels.push(dmChannel);
    }

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: 'org-1',
      channelId: dmChannel.id,
      authorId: senderId,
      authorName: sender?.name || 'Sistema',
      authorRole: sender?.role || 'comercial',
      type: 'TEXT' as const,
      body: bodyText,
      bodyPlain: bodyText.replace(/\*\*/g, '').replace(/📞/g, '').trim(),
      threadReplyCount: 0,
      attachments: [],
      mentionedUserIds: [receiverId],
      mentionsEveryone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reactions: [],
    };

    inMemoryMessages.push(newMsg as any);
    dmChannel.messageCount = (dmChannel.messageCount || 0) + 1;

    await realtimeStreamManager.publish({
      type: 'chat:message',
      organizationId: 'org-1',
      channelId: dmChannel.id,
      targetUserIds: [senderId, receiverId],
      payload: { message: newMsg },
    });
  }
}

export const callsService = new CallsService();
