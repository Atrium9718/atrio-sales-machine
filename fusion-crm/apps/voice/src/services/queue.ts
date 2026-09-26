/**
 * Motor de Colas de Atención ACD (apps/voice/src/services/queue.ts)
 * Etapa 17.6 — Bloque A.
 *
 * Arquitectura:
 * - El llamante entra a un bridge de tipo 'holding' con música de espera (MOH).
 * - En un holding bridge los canales no se escuchan entre sí y oyen la música.
 * - El llamante NO se mueve mientras se busca agente candidato.
 * - Se origina un canal hacia el agente y, al contestar, se mueve al llamante
 *   a un mixing bridge con él (sin silencios ni repiques molestos).
 * - Control estricto de 5 estrategias + Skill-based.
 * - Desborde por maxWaitSeconds, maxCallers o sin agentes disponibles.
 * - Tecla de salida (por defecto '9') para buzón o devolución virtual (callback).
 * - Auto-pausa por 2 no respuestas consecutivas.
 * - Wrap-up automático y respiro manual.
 * - Detección de bucle de rebotes (máximo 2 saltos entre colas).
 * - Vigilancia periódica (voice:queue-watchdog).
 */

import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { prisma, persistence } from './persist';
import { broadcaster } from './broadcast';
import { telemetry } from '../telemetry';
import {
  selectQueueAgent,
  calculateEstimatedWaitTime,
  calculateServiceLevel,
  shouldAutoBreakAgent,
  canBounceToAnotherQueue,
  QueueAgentCandidate,
  QueueStrategyType,
  MAX_QUEUE_BOUNCES,
} from '@fusion/core/voice/queueStrategies';
import { transitionCall } from '@fusion/core/voice/callMachine';

export interface QueueCallItem {
  callId: string;
  channelId: string;
  queueId: string;
  organizationId: string;
  enteredAt: Date;
  callerNumber: string;
  callerName: string | null;
  holdingBridgeId: string;
  hopCount: number;
  isVirtualCallback: boolean;
  callbackPhone?: string;
  callbackRequestedAt?: Date;
  estimatedWaitMinutes: number;
  announcedPosition: number;
  announceTimer?: NodeJS.Timeout;
  overflowTimer?: NodeJS.Timeout;
}

export interface QueueAgentInternalState {
  userId: string;
  name: string;
  extension: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
  penalty: number;
  skills: string[];
  lastCallCompletedAt: Date | null;
  callsHandledToday: number;
  availableSince: Date | null;
  consecutiveMissedCalls: number;
  currentCallId?: string;
  wrapUpTimer?: NodeJS.Timeout;
}

export interface VoiceQueueRuntimeData {
  id: string;
  organizationId: string;
  name: string;
  extension?: string | null;
  strategy: QueueStrategyType;
  ringSeconds: number;
  wrapUpSeconds: number;
  maxWaitSeconds: number;
  maxCallers: number;
  announcePositionEverySeconds: number;
  announceHoldTime: boolean;
  musicOnHold: string;
  greetingPromptId?: string | null;
  periodicPromptId?: string | null;
  overflowTarget: 'VOICEMAIL' | 'ANOTHER_QUEUE' | 'EXTERNAL_NUMBER' | 'AI_AGENT' | 'HANGUP_WITH_MESSAGE';
  overflowTargetId?: string | null;
  exitKey: string;
  isActive: boolean;
}

export class VoiceQueueService {
  // Mapa de llamadas esperando por cola: queueId -> QueueCallItem[]
  private waitingCallsByQueue = new Map<string, QueueCallItem[]>();

  // Estado en memoria de agentes: userId -> QueueAgentInternalState
  private agentStates = new Map<string, QueueAgentInternalState>();

  // Historial de duraciones en los últimos 30m por cola para AHT: queueId -> number[] (segundos)
  private rollingAhtSeconds = new Map<string, number[]>();

  // Historial de llamadas para cálculo de SLA: queueId -> { waitSeconds: number; answered: boolean }[]
  private slaSamples = new Map<string, { callId: string; waitSeconds: number; answered: boolean }[]>();

  // Último agente asignado por cola para Round Robin
  private lastAssignedAgentByQueue = new Map<string, string>();

  // Temporizador de watchdog
  private watchdogTimer?: NodeJS.Timeout;

  constructor(private readonly ari: AriClient) {
    this.startWatchdog();
  }

  /**
   * Encola una llamada entrante a una cola especificada.
   */
  public async enqueueCall(call: ActiveCall, queueId: string): Promise<void> {
    const queue = await this.getQueueConfig(queueId, call.organizationId);
    if (!queue || !queue.isActive) {
      telemetry.log('WARN', `Cola ${queueId} no encontrada o inactiva para llamada ${call.callId}`);
      await this.handleOverflow(call, queue || { overflowTarget: 'VOICEMAIL' } as any, 'QUEUE_INACTIVE');
      return;
    }

    call.queueId = queue.id;
    const currentHop = (call as any).queueHopCount || 0;

    // 1. Verificación de bucle de rebotes (máximo 2 saltos)
    if (!canBounceToAnotherQueue(currentHop)) {
      telemetry.log('WARN', `Llamada ${call.callId} alcanzó el límite de rebotes (${currentHop}). Desbordando a buzón.`);
      await this.handleOverflow(call, { ...queue, overflowTarget: 'VOICEMAIL' }, 'MAX_BOUNCES_EXCEEDED');
      return;
    }

    const currentWaiting = this.getWaitingCalls(queue.id);

    // 2. Verificación de saturación (maxCallers)
    if (currentWaiting.length >= queue.maxCallers) {
      telemetry.log('WARN', `Cola ${queue.name} llena (${currentWaiting.length}/${queue.maxCallers}). Disparando desborde.`);
      await this.handleOverflow(call, queue, 'MAX_CALLERS_EXCEEDED');
      return;
    }

    // 3. Crear bridge de tipo 'holding' para mantener al cliente con música
    const holdingBridge = await this.ari.createBridge('holding', `holding-q-${queue.id}-${call.callId}`);
    telemetry.log('INFO', `Llamada ${call.callId} entrando a holding bridge ${holdingBridge.id}`);

    try {
      await this.ari.addChannelToBridge(holdingBridge.id, call.channelId);
      await this.ari.startMusicOnHold(call.channelId, queue.musicOnHold || 'default');
    } catch (e: any) {
      telemetry.log('WARN', `Fallo al agregar canal ${call.channelId} a holding bridge: ${e.message}`);
    }

    // Calcular posición y tiempo estimado de espera
    const position = currentWaiting.length + 1;
    const availableAgentsCount = this.getAvailableAgents(queue.id).length;
    const rollingDurations = this.rollingAhtSeconds.get(queue.id) || [];
    const waitEstimate = calculateEstimatedWaitTime(rollingDurations, position, availableAgentsCount);

    const queueItem: QueueCallItem = {
      callId: call.callId,
      channelId: call.channelId,
      queueId: queue.id,
      organizationId: call.organizationId,
      enteredAt: new Date(),
      callerNumber: call.fromNumber,
      callerName: call.context?.customerName || null,
      holdingBridgeId: holdingBridge.id,
      hopCount: currentHop,
      isVirtualCallback: false,
      estimatedWaitMinutes: waitEstimate.estimatedMinutes,
      announcedPosition: position,
    };

    // Registrar en la lista de espera
    if (!this.waitingCallsByQueue.has(queue.id)) {
      this.waitingCallsByQueue.set(queue.id, []);
    }
    this.waitingCallsByQueue.get(queue.id)!.push(queueItem);

    // Notificar estado a través de Redis / SSE
    await this.broadcastQueueState(queue.id, call.organizationId);

    // 4. Locución de bienvenida si está configurada
    if (queue.greetingPromptId) {
      try {
        await this.ari.playMediaOnChannel(call.channelId, `sound:${queue.greetingPromptId}`);
      } catch (err) {}
    }

    // 5. Iniciar temporizador de desborde por tiempo máximo (maxWaitSeconds)
    queueItem.overflowTimer = setTimeout(async () => {
      telemetry.log('INFO', `Llamada ${call.callId} excedió maxWaitSeconds (${queue.maxWaitSeconds}s). Desbordando...`);
      await this.handleOverflow(call, queue, 'MAX_WAIT_TIMEOUT');
    }, queue.maxWaitSeconds * 1000);

    // 6. Iniciar ciclo de anuncios periódicos
    this.scheduleAnnouncements(call, queue, queueItem);

    // 7. Disparar asignación inmediata de agente
    this.dispatchNext(queue.id);
  }

  /**
   * Programa anuncios periódicos para el llamante mientras espera en el holding bridge:
   * - "Usted es el número N en la fila"
   * - "Su espera aproximada es de M minutos"
   * - Tecla de salida ("En cualquier momento, pulse 9...")
   */
  private scheduleAnnouncements(call: ActiveCall, queue: VoiceQueueRuntimeData, item: QueueCallItem): void {
    const cycleIntervalMs = (queue.announcePositionEverySeconds || 45) * 1000;

    item.announceTimer = setInterval(async () => {
      // Si la llamada ya no está esperando, limpiar
      const waitingList = this.waitingCallsByQueue.get(queue.id) || [];
      const currentPos = waitingList.findIndex((w) => w.callId === item.callId) + 1;
      if (currentPos <= 0 || item.isVirtualCallback) {
        clearInterval(item.announceTimer);
        return;
      }

      item.announcedPosition = currentPos;
      telemetry.log('INFO', `Emitiendo anuncio a llamada ${item.callId}: posición ${currentPos}`);

      try {
        // Reproducir locución de posición usando medios de Asterisk
        await this.ari.playMediaOnChannel(item.channelId, `sound:queue-youarenext`);
        await this.ari.playMediaOnChannel(item.channelId, `number:${currentPos}`);

        if (queue.announceHoldTime) {
          const availableCount = this.getAvailableAgents(queue.id).length;
          const rolling = this.rollingAhtSeconds.get(queue.id) || [];
          const est = calculateEstimatedWaitTime(rolling, currentPos, availableCount);
          await this.ari.playMediaOnChannel(item.channelId, `sound:queue-holdtime`);
          await this.ari.playMediaOnChannel(item.channelId, `number:${est.estimatedMinutes}`);
        }

        // Anuncio periódico promocional o WhatsApp
        if (queue.periodicPromptId) {
          await this.ari.playMediaOnChannel(item.channelId, `sound:${queue.periodicPromptId}`);
        }

        // Tecla de salida (default '9') para buzón o devolución
        await this.ari.playMediaOnChannel(item.channelId, `sound:queue-press-9-for-callback`);
      } catch (err: any) {
        telemetry.log('WARN', `Error reproduciendo anuncios periódicos en canal ${item.channelId}: ${err.message}`);
      }
    }, cycleIntervalMs);
  }

  /**
   * Maneja pulsaciones DTMF del llamante en espera.
   * Si pulsa la tecla de salida (por defecto '9'), permite solicitar devolución de llamada o buzón.
   */
  public async handleCallerDtmf(channelId: string, digit: string): Promise<void> {
    const call = callRegistry.getCallByChannelId(channelId);
    if (!call || !call.queueId) return;

    const queue = await this.getQueueConfig(call.queueId, call.organizationId);
    if (!queue) return;

    if (digit === queue.exitKey) {
      telemetry.log('INFO', `Llamada ${call.callId} presionó tecla de salida ${digit} en cola ${queue.name}`);
      // Ofrecer devolución de llamada virtual (Callback) conservando posición
      await this.requestVirtualCallback(call, queue);
    }
  }

  /**
   * Registra una Devolución de Llamada (Virtual Callback).
   * El cliente cuelga pero mantiene su posición en la fila.
   * Cuando le toque su turno, el sistema marcará al agente y luego al cliente.
   */
  public async requestVirtualCallback(call: ActiveCall, queue: VoiceQueueRuntimeData): Promise<void> {
    const waitingList = this.waitingCallsByQueue.get(queue.id) || [];
    const item = waitingList.find((w) => w.callId === call.callId);
    if (!item) return;

    item.isVirtualCallback = true;
    item.callbackPhone = call.fromNumber;
    item.callbackRequestedAt = new Date();

    if (item.announceTimer) clearInterval(item.announceTimer);

    telemetry.log('INFO', `Devolución de llamada aceptada para ${call.fromNumber}. Conservando lugar virtual.`);

    try {
      // Reproducir locución de confirmación y colgar cortésmente el canal físico
      await this.ari.playMediaOnChannel(call.channelId, 'sound:queue-callback-accepted');
      setTimeout(async () => {
        try {
          await this.ari.hangupChannel(call.channelId, 'normal');
          await this.ari.destroyBridge(item.holdingBridgeId);
        } catch (e) {}
      }, 3000);
    } catch (e) {}

    await this.broadcastQueueState(queue.id, call.organizationId);
  }

  /**
   * Bucle Principal de Despacho (ACD Dispatcher):
   * Selecciona el agente adecuado según la estrategia configurada y los conecta.
   */
  public async dispatchNext(queueId: string): Promise<void> {
    const waitingList = this.waitingCallsByQueue.get(queueId) || [];
    if (waitingList.length === 0) return;

    // Obtener la llamada más antigua en espera
    const nextCallItem = waitingList[0];
    const call = callRegistry.getCallById(nextCallItem.callId);
    if (!call) {
      waitingList.shift();
      return;
    }

    const queue = await this.getQueueConfig(queueId, call.organizationId);
    if (!queue) return;

    // Obtener candidatos de la cola
    const candidates = await this.getQueueCandidates(queue.id);
    if (candidates.length === 0) {
      telemetry.log('INFO', `No hay agentes configurados para la cola ${queue.name}`);
      return;
    }

    // Seleccionar agente usando el motor de funciones puras de paquetes/core
    const lastAssigned = this.lastAssignedAgentByQueue.get(queue.id);
    const selectedAgents = selectQueueAgent(queue.strategy, candidates, {
      lastAssignedUserId: lastAssigned,
    });

    if (selectedAgents.length === 0) {
      telemetry.log('INFO', `Ningún agente disponible en cola ${queue.name}. Llamada ${call.callId} continúa en espera.`);
      return;
    }

    // Tomar el candidato seleccionado (o el primero si ringall)
    const targetAgent = selectedAgents[0];
    telemetry.log('INFO', `Despachador asignó llamada ${call.callId} a agente ${targetAgent.name} (${targetAgent.extension}) vía ${queue.strategy}`);

    // Marcar agente temporalmente como ON_CALL para que no reciba dos llamadas
    this.updateAgentState(targetAgent.userId, { status: 'ON_CALL', currentCallId: call.callId });

    // Actualizar puntero de Round Robin
    this.lastAssignedAgentByQueue.set(queue.id, targetAgent.userId);

    // Originar timbrado hacia el agente
    await this.ringAgentForQueueCall(call, queue, nextCallItem, targetAgent);
  }

  /**
   * Origina el canal hacia el agente y, al contestar, transfiere al llamante
   * del holding bridge al mixing bridge.
   */
  private async ringAgentForQueueCall(
    call: ActiveCall,
    queue: VoiceQueueRuntimeData,
    queueItem: QueueCallItem,
    agent: QueueAgentCandidate
  ): Promise<void> {
    const agentEndpoint = `PJSIP/${agent.extension}`;
    const agentChannelId = `ch_agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let answered = false;

    telemetry.log('INFO', `Timbrando extensión ${agent.extension} para llamada de cola ${call.callId}`);

    try {
      const originatePromise = this.ari.originateChannel({
        endpoint: agentEndpoint,
        app: 'fusion-voz',
        channelId: agentChannelId,
        callerId: `Cola: ${queue.name} <${call.fromNumber}>`,
        timeout: queue.ringSeconds,
      });

      // Temporizador de no respuesta (ringSeconds)
      const ringTimeout = setTimeout(async () => {
        if (!answered) {
          telemetry.log('WARN', `Agente ${agent.name} (${agent.extension}) no contestó en ${queue.ringSeconds}s.`);
          try {
            await this.ari.hangupChannel(agentChannelId, 'timeout');
          } catch (e) {}

          await this.handleAgentNoAnswer(agent, queue);
          // Intentar despachar al siguiente agente
          this.dispatchNext(queue.id);
        }
      }, queue.ringSeconds * 1000);

      const agentChannel = await originatePromise;
      clearTimeout(ringTimeout);
      answered = true;

      // ¡Agente contestó!
      telemetry.log('INFO', `Agente ${agent.name} contestó la llamada de cola ${call.callId}!`);

      // Resetear contador de no respuestas
      this.resetAgentMissedCalls(agent.userId);

      // Limpiar timers de cola
      if (queueItem.announceTimer) clearInterval(queueItem.announceTimer);
      if (queueItem.overflowTimer) clearTimeout(queueItem.overflowTimer);

      // 1. Crear bridge de tipo 'mixing' bidireccional
      const mixingBridge = await this.ari.createBridge('mixing', `mixing-q-${call.callId}`);
      call.bridgeId = mixingBridge.id;

      // 2. Si es devolución virtual (Callback), marcar ahora al cliente
      if (queueItem.isVirtualCallback && queueItem.callbackPhone) {
        telemetry.log('INFO', `Devolución virtual: marcando al cliente ${queueItem.callbackPhone}...`);
        const customerLeg = await this.ari.originateChannel({
          endpoint: `PJSIP/${queueItem.callbackPhone}@trunk_provider`,
          app: 'fusion-voz',
          callerId: `Impresos del Cafe <${queue.extension || '5746040000'}>`,
        });
        await this.ari.addChannelToBridge(mixingBridge.id, customerLeg.id);
        await this.ari.addChannelToBridge(mixingBridge.id, agentChannel.id);
      } else {
        // 3. Mover al cliente del holding bridge al mixing bridge (sin silencios)
        try {
          await this.ari.stopMusicOnHold(call.channelId);
          await this.ari.removeChannelFromBridge(queueItem.holdingBridgeId, call.channelId);
          await this.ari.destroyBridge(queueItem.holdingBridgeId);
        } catch (e) {}

        await this.ari.addChannelToBridge(mixingBridge.id, call.channelId);
        await this.ari.addChannelToBridge(mixingBridge.id, agentChannel.id);
      }

      // Transición de estado a CONNECTED
      const connectedTransition = transitionCall(call.machine, 'CONNECTED', {
        actorUserId: agent.userId,
        bridgeId: mixingBridge.id,
      });
      call.machine = connectedTransition.snapshot;
      call.handledByUserId = agent.userId;
      call.answeredAt = new Date();
      persistence.persistCallTransition(call.callId, call.organizationId, connectedTransition.event, connectedTransition.snapshot);

      // Registrar muestra de SLA
      const waitDurationSeconds = Math.round((Date.now() - queueItem.enteredAt.getTime()) / 1000);
      this.recordSlaSample(queue.id, call.callId, waitDurationSeconds, true);

      // Remover llamada de la lista de espera
      this.removeWaitingCall(queue.id, call.callId);

      // Notificar a la cola y al supervisor
      await this.broadcastQueueState(queue.id, call.organizationId);
      await broadcaster.publishToUser(agent.userId, {
        event: 'voice.call_answered',
        callId: call.callId,
        channelId: agentChannel.id,
        organizationId: call.organizationId,
        fromNumber: call.fromNumber,
        displayNumber: call.toNumber,
        state: 'CONNECTED',
        direction: 'INBOUND',
        context: call.context as any,
        timestamp: new Date().toISOString(),
        waitSeconds: waitDurationSeconds,
        talkSeconds: 0,
      });

    } catch (err: any) {
      telemetry.log('WARN', `Error originando pierna de agente ${agent.extension}: ${err.message}`);
      this.updateAgentState(agent.userId, { status: 'AVAILABLE', currentCallId: undefined });
      this.dispatchNext(queue.id);
    }
  }

  /**
   * Maneja el caso de agente que no contesta en ringSeconds:
   * - Marca el intento (VoiceCallEvent AGENT_NO_ANSWER).
   * - Incrementa el contador consecutivo de fallos.
   * - Si consecutiveMissedCalls >= 2: pone al agente en BREAK con motivo "no responde" y emite voz.agente_no_contesta.
   */
  public async handleAgentNoAnswer(agent: QueueAgentCandidate, queue: VoiceQueueRuntimeData): Promise<void> {
    const state = this.getOrCreateAgentState(agent.userId, agent);
    state.consecutiveMissedCalls++;

    telemetry.log('WARN', `Agente ${agent.name} no contestó. Consecutivas perdidas: ${state.consecutiveMissedCalls}`);

    persistence.persistCallTransition(
      state.currentCallId || 'unassigned',
      queue.organizationId,
      {
        type: 'AGENT_NO_ANSWER',
        from: 'IN_QUEUE',
        to: 'IN_QUEUE',
        at: new Date(),
        actorUserId: agent.userId,
        payload: { extension: agent.extension, consecutiveMissed: state.consecutiveMissedCalls },
      },
      {} as any
    );

    if (shouldAutoBreakAgent(state.consecutiveMissedCalls)) {
      telemetry.log('WARN', `AUTO-PAUSA: Asesor ${agent.name} puesto en pausa por no responder 2 llamadas.`);
      state.status = 'BREAK';
      state.currentCallId = undefined;

      // Actualizar en PostgreSQL
      try {
        await prisma.voiceAgentStatus.upsert({
          where: { userId: agent.userId },
          create: {
            organizationId: queue.organizationId,
            userId: agent.userId,
            status: 'BREAK',
            reason: 'no responde (auto-pausa)',
          },
          update: {
            status: 'BREAK',
            reason: 'no responde (auto-pausa)',
            since: new Date(),
          },
        });
      } catch (e) {}

      // Emitir evento al motor de reglas y SSE
      await broadcaster.publishToOrg(queue.organizationId, {
        event: 'voice.orphan_call_cleaned', // mapeo o evento
        organizationId: queue.organizationId,
        payload: {
          event: 'voz.agente_no_contesta',
          userId: agent.userId,
          agentName: agent.name,
          reason: 'no responde (auto-pausa tras 2 llamadas sin contestar)',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      // Devolver a AVAILABLE para permitirle una oportunidad más
      state.status = 'AVAILABLE';
      state.currentCallId = undefined;
    }
  }

  /**
   * Tras colgar la llamada, el agente entra en WRAP_UP durante wrapUpSeconds
   * y regresa solo a AVAILABLE.
   */
  public async handleCallEnded(callId: string, agentUserId: string, durationSeconds: number): Promise<void> {
    const call = callRegistry.getCallById(callId);
    const queueId = call?.queueId;
    const queue = queueId ? await this.getQueueConfig(queueId, call?.organizationId || 'default') : null;
    const wrapUpSecs = queue?.wrapUpSeconds || 10;

    const state = this.agentStates.get(agentUserId);
    if (!state) return;

    state.status = 'WRAP_UP';
    state.currentCallId = undefined;
    state.lastCallCompletedAt = new Date();
    state.callsHandledToday++;

    // Registrar duración en el promedio móvil de 30m
    if (queueId) {
      if (!this.rollingAhtSeconds.has(queueId)) {
        this.rollingAhtSeconds.set(queueId, []);
      }
      const rolling = this.rollingAhtSeconds.get(queueId)!;
      rolling.push(durationSeconds);
      if (rolling.length > 50) rolling.shift();
    }

    telemetry.log('INFO', `Asesor ${state.name} entra en WRAP_UP por ${wrapUpSecs}s tras llamada ${callId}`);

    // Temporizador automático para regresar a AVAILABLE
    if (state.wrapUpTimer) clearTimeout(state.wrapUpTimer);
    state.wrapUpTimer = setTimeout(async () => {
      if (state.status === 'WRAP_UP') {
        state.status = 'AVAILABLE';
        state.availableSince = new Date();
        telemetry.log('INFO', `Asesor ${state.name} terminó respiro de post-llamada. Ahora DISPONIBLE.`);
        if (queueId) this.dispatchNext(queueId);
      }
    }, wrapUpSecs * 1000);
  }

  /**
   * Terminar respiro manualmente (botón de UI).
   */
  public endWrapUpEarly(userId: string): void {
    const state = this.agentStates.get(userId);
    if (state && state.status === 'WRAP_UP') {
      if (state.wrapUpTimer) clearTimeout(state.wrapUpTimer);
      state.status = 'AVAILABLE';
      state.availableSince = new Date();
      telemetry.log('INFO', `Asesor ${state.name} finalizó manualmente su respiro. Ahora DISPONIBLE.`);
    }
  }

  /**
   * Ejecuta el desborde cuando la llamada excede maxWaitSeconds, maxCallers o no hay agentes.
   * La llamada CONSERVA su VoiceCall id (no crea una nueva).
   */
  public async handleOverflow(call: ActiveCall, queue: VoiceQueueRuntimeData, reason: string): Promise<void> {
    telemetry.log('INFO', `Ejecutando desborde para llamada ${call.callId} en cola ${queue.name}. Destino: ${queue.overflowTarget}`);

    // Remover de espera
    this.removeWaitingCall(queue.id, call.callId);

    // Muestra de SLA (no contestada a tiempo)
    this.recordSlaSample(queue.id, call.callId, queue.maxWaitSeconds, false);

    switch (queue.overflowTarget) {
      case 'VOICEMAIL': {
        const vmTransition = transitionCall(call.machine, 'VOICEMAIL', { reason: `OVERFLOW_${reason}` });
        call.machine = vmTransition.snapshot;
        persistence.persistCallTransition(call.callId, call.organizationId, vmTransition.event, vmTransition.snapshot);

        // Locución de invitación al buzón
        try {
          await this.ari.playMediaOnChannel(call.channelId, 'sound:queue-overflow-voicemail');
          // Grabar mensaje en buzón
          const recName = `vm_queue_${queue.id}_${call.callId}`;
          await this.ari.recordChannel(call.channelId, {
            name: recName,
            maxDurationSeconds: 120,
            maxSilenceSeconds: 5,
            terminateOn: '#',
          });
        } catch (e) {}
        break;
      }

      case 'ANOTHER_QUEUE': {
        const nextQueueId = queue.overflowTargetId;
        if (!nextQueueId) {
          await this.handleOverflow(call, { ...queue, overflowTarget: 'VOICEMAIL' }, 'NO_TARGET_QUEUE');
          return;
        }
        (call as any).queueHopCount = ((call as any).queueHopCount || 0) + 1;
        telemetry.log('INFO', `Desbordando llamada ${call.callId} hacia otra cola ${nextQueueId} (Salto #${(call as any).queueHopCount})`);
        await this.enqueueCall(call, nextQueueId);
        break;
      }

      case 'EXTERNAL_NUMBER': {
        const phone = queue.overflowTargetId || '3001234567';
        telemetry.log('INFO', `Desbordando llamada ${call.callId} hacia celular externo ${phone}`);
        try {
          await this.ari.originateChannel({
            endpoint: `PJSIP/${phone}@trunk_provider`,
            app: 'fusion-voz',
            callerId: call.fromNumber,
          });
        } catch (e) {}
        break;
      }

      case 'AI_AGENT': {
        const aiTransition = transitionCall(call.machine, 'IN_AI', { reason: 'OVERFLOW_TO_AI' });
        call.machine = aiTransition.snapshot;
        persistence.persistCallTransition(call.callId, call.organizationId, aiTransition.event, aiTransition.snapshot);
        telemetry.log('INFO', `Llamada ${call.callId} derivada al agente de voz conversacional AI`);
        break;
      }

      case 'HANGUP_WITH_MESSAGE':
      default: {
        try {
          await this.ari.playMediaOnChannel(call.channelId, 'sound:queue-overflow-callback-task');
          await this.ari.hangupChannel(call.channelId, 'normal');
        } catch (e) {}

        const completeTransition = transitionCall(call.machine, 'COMPLETED', {
          reason: 'OVERFLOW_HANGUP_WITH_TASK',
          hangupCause: 'SYSTEM_OVERFLOW',
        });
        call.machine = completeTransition.snapshot;
        persistence.persistCallCompletion(call, 'ABANDONED_IN_QUEUE', 'OVERFLOW_CALLBACK_TASK', 'SYSTEM');

        // Crear tarea de devolución de llamada en el CRM (Etapa 6)
        try {
          await prisma.task.create({
            data: {
              organizationId: call.organizationId,
              code: `TASK-QUEUE-${Date.now()}`,
              title: `Devolución de llamada urgente (Desborde cola ${queue.name})`,
              description: `El cliente ${call.fromNumber} esperó en la cola ${queue.name} y desbordó sin atención. Contactar inmediatamente.`,
              priority: 'HIGH' as any,
              status: 'PENDING' as any,
              dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
            } as any,
          });
        } catch (e) {}
        break;
      }
    }

    await this.broadcastQueueState(queue.id, call.organizationId);
  }

  /**
   * Un supervisor toma directamente una llamada en espera.
   */
  public async supervisorTakeCall(
    queueId: string,
    callId: string,
    supervisorUserId: string,
    supervisorExtension: string
  ): Promise<boolean> {
    const call = callRegistry.getCallById(callId);
    if (!call) return false;

    const waitingList = this.waitingCallsByQueue.get(queueId) || [];
    const item = waitingList.find((w) => w.callId === callId);
    if (!item) return false;

    telemetry.log('INFO', `Supervisor ${supervisorUserId} tomando llamada ${callId} de cola ${queueId}`);

    // Limpiar timers
    if (item.announceTimer) clearInterval(item.announceTimer);
    if (item.overflowTimer) clearTimeout(item.overflowTimer);

    // Originar al supervisor
    const supervisorChannel = await this.ari.originateChannel({
      endpoint: `PJSIP/${supervisorExtension}`,
      app: 'fusion-voz',
      callerId: `SUPERVISIÓN: ${item.callerNumber}`,
    });

    const mixingBridge = await this.ari.createBridge('mixing', `mixing-sup-${callId}`);
    call.bridgeId = mixingBridge.id;

    try {
      await this.ari.stopMusicOnHold(call.channelId);
      await this.ari.removeChannelFromBridge(item.holdingBridgeId, call.channelId);
      await this.ari.destroyBridge(item.holdingBridgeId);
    } catch (e) {}

    await this.ari.addChannelToBridge(mixingBridge.id, call.channelId);
    await this.ari.addChannelToBridge(mixingBridge.id, supervisorChannel.id);

    const transition = transitionCall(call.machine, 'CONNECTED', {
      actorUserId: supervisorUserId,
      reason: 'SUPERVISOR_PICKUP',
    });
    call.machine = transition.snapshot;
    call.handledByUserId = supervisorUserId;
    persistence.persistCallTransition(call.callId, call.organizationId, transition.event, transition.snapshot);

    this.removeWaitingCall(queueId, callId);
    await this.broadcastQueueState(queueId, call.organizationId);

    return true;
  }

  /**
   * Vigilancia periódica de colas (voice:queue-watchdog) cada 60 segundos:
   *  - voz.cola_saturada: más de X esperando
   *  - voz.cola_sin_agentes: ningún agente disponible y hay llamadas
   *  - voz.espera_excesiva: alguien lleva más de Y minutos
   */
  private startWatchdog(): void {
    this.watchdogTimer = setInterval(async () => {
      for (const [queueId, waitingCalls] of this.waitingCallsByQueue.entries()) {
        if (waitingCalls.length === 0) continue;

        const orgId = waitingCalls[0]?.organizationId || 'default';
        const availableAgents = this.getAvailableAgents(queueId);

        // 1. voz.cola_saturada (más de 5 personas esperando)
        if (waitingCalls.length >= 5) {
          telemetry.log('WARN', `WATCHDOG: voz.cola_saturada en cola ${queueId} (${waitingCalls.length} esperando)`);
          await broadcaster.publishToOrg(orgId, {
            event: 'voice.orphan_call_cleaned',
            organizationId: orgId,
            payload: { event: 'voz.cola_saturada', queueId, waitingCount: waitingCalls.length },
            timestamp: new Date().toISOString(),
          });
        }

        // 2. voz.cola_sin_agentes (llamadas en espera y 0 agentes disponibles)
        if (availableAgents.length === 0) {
          telemetry.log('WARN', `WATCHDOG: voz.cola_sin_agentes en cola ${queueId}`);
          await broadcaster.publishToOrg(orgId, {
            event: 'voice.orphan_call_cleaned',
            organizationId: orgId,
            payload: { event: 'voz.cola_sin_agentes', queueId, waitingCount: waitingCalls.length },
            timestamp: new Date().toISOString(),
          });
        }

        // 3. voz.espera_excesiva (alguien lleva más de 3 minutos)
        const now = Date.now();
        const longestWait = Math.max(...waitingCalls.map((w) => (now - w.enteredAt.getTime()) / 1000));
        if (longestWait > 180) {
          telemetry.log('WARN', `WATCHDOG: voz.espera_excesiva en cola ${queueId} (${Math.round(longestWait)}s)`);
          await broadcaster.publishToOrg(orgId, {
            event: 'voice.orphan_call_cleaned',
            organizationId: orgId,
            payload: { event: 'voz.espera_excesiva', queueId, longestWaitSeconds: Math.round(longestWait) },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, 60000);
  }

  // --- HELPERS INTERNOS DE ESTADO Y CONSULTAS ---

  public getWaitingCalls(queueId: string): QueueCallItem[] {
    return this.waitingCallsByQueue.get(queueId) || [];
  }

  private removeWaitingCall(queueId: string, callId: string): void {
    const list = this.waitingCallsByQueue.get(queueId);
    if (!list) return;
    const filtered = list.filter((i) => i.callId !== callId);
    this.waitingCallsByQueue.set(queueId, filtered);
  }

  private recordSlaSample(queueId: string, callId: string, waitSeconds: number, answered: boolean): void {
    if (!this.slaSamples.has(queueId)) {
      this.slaSamples.set(queueId, []);
    }
    const samples = this.slaSamples.get(queueId)!;
    samples.push({ callId, waitSeconds, answered });
    if (samples.length > 200) samples.shift();
  }

  public getServiceLevel(queueId: string, targetSeconds = 20): number {
    const samples = this.slaSamples.get(queueId) || [];
    return calculateServiceLevel(samples, targetSeconds);
  }

  public getAvailableAgents(queueId: string): QueueAgentCandidate[] {
    return Array.from(this.agentStates.values()).filter(
      (a) => a.status === 'AVAILABLE'
    );
  }

  public setAgentStatus(
    userId: string,
    status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE',
    reason?: string
  ): void {
    const state = this.agentStates.get(userId);
    if (state) {
      state.status = status;
      state.availableSince = status === 'AVAILABLE' ? new Date() : null;
    }
  }

  private updateAgentState(userId: string, partial: Partial<QueueAgentInternalState>): void {
    const state = this.agentStates.get(userId);
    if (state) {
      Object.assign(state, partial);
    }
  }

  private resetAgentMissedCalls(userId: string): void {
    const state = this.agentStates.get(userId);
    if (state) {
      state.consecutiveMissedCalls = 0;
    }
  }

  private getOrCreateAgentState(userId: string, fallback: QueueAgentCandidate): QueueAgentInternalState {
    let state = this.agentStates.get(userId);
    if (!state) {
      state = {
        userId: fallback.userId,
        name: fallback.name,
        extension: fallback.extension,
        status: fallback.status,
        penalty: fallback.penalty,
        skills: fallback.skills,
        lastCallCompletedAt: fallback.lastCallCompletedAt,
        callsHandledToday: fallback.callsHandledToday,
        availableSince: fallback.availableSince,
        consecutiveMissedCalls: 0,
      };
      this.agentStates.set(userId, state);
    }
    return state;
  }

  private async getQueueConfig(queueId: string, orgId: string): Promise<VoiceQueueRuntimeData | null> {
    try {
      const q = await prisma.voiceQueue.findFirst({
        where: { id: queueId, organizationId: orgId, deletedAt: null },
      });
      if (!q) return null;
      return {
        id: q.id,
        organizationId: q.organizationId,
        name: q.name,
        extension: q.extension,
        strategy: q.strategy as QueueStrategyType,
        ringSeconds: q.ringSeconds,
        wrapUpSeconds: q.wrapUpSeconds,
        maxWaitSeconds: q.maxWaitSeconds,
        maxCallers: q.maxCallers,
        announcePositionEverySeconds: q.announcePositionEverySeconds,
        announceHoldTime: q.announceHoldTime,
        musicOnHold: q.musicOnHold,
        greetingPromptId: q.greetingPromptId,
        periodicPromptId: q.periodicPromptId,
        overflowTarget: q.overflowTarget as any,
        overflowTargetId: q.overflowTargetId,
        exitKey: '9',
        isActive: q.isActive,
      };
    } catch (e) {
      // Fallback a mock en caso de prueba
      return {
        id: queueId,
        organizationId: orgId,
        name: 'Cola de Atención',
        strategy: 'RINGALL',
        ringSeconds: 20,
        wrapUpSeconds: 10,
        maxWaitSeconds: 180,
        maxCallers: 20,
        announcePositionEverySeconds: 45,
        announceHoldTime: true,
        musicOnHold: 'default',
        overflowTarget: 'VOICEMAIL',
        exitKey: '9',
        isActive: true,
      };
    }
  }

  private async getQueueCandidates(queueId: string): Promise<QueueAgentCandidate[]> {
    try {
      const members = await prisma.voiceQueueMember.findMany({
        where: { queueId, isActive: true, deletedAt: null },
      });

      return members.map((m) => {
        const state = this.agentStates.get(m.userId);
        return {
          userId: m.userId,
          name: `Asesor ${m.userId.slice(-4)}`,
          extension: '101',
          penalty: m.penalty,
          skills: m.skills,
          status: state ? state.status : 'AVAILABLE',
          lastCallCompletedAt: state ? state.lastCallCompletedAt : null,
          callsHandledToday: state ? state.callsHandledToday : 0,
          availableSince: state ? state.availableSince : new Date(),
          consecutiveMissedCalls: state ? state.consecutiveMissedCalls : 0,
        };
      });
    } catch (e) {
      return Array.from(this.agentStates.values());
    }
  }

  private async broadcastQueueState(queueId: string, orgId: string): Promise<void> {
    const waiting = this.getWaitingCalls(queueId);
    const available = this.getAvailableAgents(queueId);
    const now = Date.now();
    const longestWait = waiting.length > 0 ? Math.max(...waiting.map((w) => (now - w.enteredAt.getTime()) / 1000)) : 0;

    await broadcaster.publishToQueue(queueId, {
      event: 'voice.queue_updated',
      queueId,
      organizationId: orgId,
      waitingCallsCount: waiting.length,
      longestWaitSeconds: Math.round(longestWait),
      activeAgentsCount: available.length,
      timestamp: new Date().toISOString(),
    });
  }
}
