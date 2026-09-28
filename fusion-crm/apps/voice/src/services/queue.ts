/**
 * Colas de atención (ACD) sin app_queue: las colas, sus miembros y el estado de cada asesor
 * viven en Postgres (lo edita el CRM) y el puente reparte las llamadas.
 *
 * - Quien llama se contesta, oye la bienvenida y música de espera, y cada cierto tiempo su posición.
 * - Se timbra a los asesores disponibles según la estrategia (todos a la vez, por turnos, el que
 *   lleva más tiempo libre…). La llamada se une al asesor solo cuando contesta (evento StasisStart).
 * - Asesor que no contesta dos veces seguidas pasa a "pausa" (no responde).
 * - Tras colgar, el asesor queda unos segundos en "respiro" antes de recibir otra.
 * - Si nadie atiende en el tiempo máximo, o la cola está llena, se desborda: buzón, otra cola
 *   (máximo 2 saltos), un número externo o colgar dejando la tarea de devolver la llamada.
 * - Marcando 9 quien espera sale al buzón.
 */

import { ActiveCall, callRegistry } from '../state/registry';
import { finishCall, moveCall } from '../state/lifecycle';
import { prisma, persistence } from './persist';
import { broadcaster } from './broadcast';
import { telemetry } from '../telemetry';
import { trunkDialString } from '../trunk';
import { answerCaller } from './connect';
import type { CallConnector } from './connect';
import type { MediaController } from './media';
import type { RingTarget, VoiceRingService } from './ring';
import type { RingTracker } from './ringGroups';
import type { VoiceVoicemailService } from './voicemail';
import { selectQueueAgent, shouldAutoBreakAgent, QueueAgentCandidate, QueueStrategyType, MAX_QUEUE_BOUNCES } from '@fusion/core/src/voice/queueStrategies';

export const QUEUE_EXIT_KEY = '9';

export type QueueOverflowTarget = 'VOICEMAIL' | 'ANOTHER_QUEUE' | 'EXTERNAL_NUMBER' | 'AI_AGENT' | 'HANGUP_WITH_MESSAGE';

export interface QueueConfig {
  id: string;
  organizationId: string;
  name: string;
  strategy: QueueStrategyType;
  ringSeconds: number;
  wrapUpSeconds: number;
  maxWaitSeconds: number;
  maxCallers: number;
  announcePositionEverySeconds: number;
  announceHoldTime: boolean;
  musicOnHold: string;
  greetingMedia: string | null;
  periodicMedia: string | null;
  overflowTarget: QueueOverflowTarget;
  overflowTargetId: string | null;
  isActive: boolean;
}

export interface QueueMemberRow {
  userId: string;
  name: string;
  extension: string;
  extensionId: string;
  mobileNumber: string | null;
  ringStrategy: string;
  recordingPolicy: 'ALWAYS' | 'NEVER' | 'INBOUND_ONLY' | 'OUTBOUND_ONLY';
  penalty: number;
  skills: string[];
  /** Estado que puso el asesor en el CRM (null = nunca lo ha cambiado). */
  status: string | null;
}

export interface QueueStore {
  getQueue(queueId: string, organizationId: string): Promise<QueueConfig | null>;
  getMembers(queueId: string): Promise<QueueMemberRow[]>;
  setAgentStatus(organizationId: string, userId: string, status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK', reason?: string | null, currentCallId?: string | null): Promise<void>;
  /** Vuelve a "disponible" solo si sigue en respiro (no pisa una pausa que el asesor puso). */
  endWrapUp(userId: string): Promise<void>;
}

/** Nombre del archivo de una locución en Asterisk → media de ARI. */
export const promptMedia = (asteriskFilename: string | null | undefined) =>
  asteriskFilename ? `sound:fusion/${asteriskFilename.replace(/^fusion\//, '').replace(/\.(wav|gsm|ulaw|alaw|sln\d*)$/i, '')}` : null;

async function promptById(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const p = await prisma.voicePrompt.findFirst({ where: { id, isActive: true, deletedAt: null } }).catch(() => null);
  return promptMedia(p?.asteriskFilename);
}

export const prismaQueueStore: QueueStore = {
  async getQueue(queueId, organizationId) {
    const q = await prisma.voiceQueue.findFirst({ where: { id: queueId, organizationId, deletedAt: null } });
    if (!q) return null;
    return {
      id: q.id,
      organizationId: q.organizationId,
      name: q.name,
      strategy: q.strategy as QueueStrategyType,
      ringSeconds: q.ringSeconds,
      wrapUpSeconds: q.wrapUpSeconds,
      maxWaitSeconds: q.maxWaitSeconds,
      maxCallers: q.maxCallers,
      announcePositionEverySeconds: q.announcePositionEverySeconds,
      announceHoldTime: q.announceHoldTime,
      musicOnHold: q.musicOnHold,
      greetingMedia: await promptById(q.greetingPromptId),
      periodicMedia: await promptById(q.periodicPromptId),
      overflowTarget: q.overflowTarget as QueueOverflowTarget,
      overflowTargetId: q.overflowTargetId,
      isActive: q.isActive,
    };
  },
  async getMembers(queueId) {
    const members = await prisma.voiceQueueMember.findMany({ where: { queueId, isActive: true, deletedAt: null } });
    if (!members.length) return [];
    const userIds = members.map((m) => m.userId);
    const [exts, statuses] = await Promise.all([
      prisma.voiceExtension.findMany({ where: { userId: { in: userIds }, status: 'ACTIVE', deletedAt: null } }),
      prisma.voiceAgentStatus.findMany({ where: { userId: { in: userIds } } }),
    ]);
    const extByUser = new Map(exts.map((e) => [e.userId, e]));
    const statusByUser = new Map(statuses.map((s) => [s.userId, s.status as string]));
    return members.flatMap((m) => {
      const ext = extByUser.get(m.userId);
      if (!ext) return [];
      return [
        {
          userId: m.userId,
          name: ext.label,
          extension: ext.extension,
          extensionId: ext.id,
          mobileNumber: ext.mobileNumber,
          ringStrategy: ext.ringStrategy,
          recordingPolicy: ext.recordingPolicy as QueueMemberRow['recordingPolicy'],
          penalty: m.penalty,
          skills: m.skills,
          status: statusByUser.get(m.userId) ?? null,
        },
      ];
    });
  },
  async setAgentStatus(organizationId, userId, status, reason = null, currentCallId = null) {
    await prisma.voiceAgentStatus.upsert({
      where: { userId },
      create: { organizationId, userId, status, reason, currentCallId, since: new Date() },
      update: { status, reason, currentCallId, since: new Date() },
    });
  },
  async endWrapUp(userId) {
    await prisma.voiceAgentStatus.updateMany({
      where: { userId, status: 'WRAP_UP' },
      data: { status: 'AVAILABLE', reason: null, currentCallId: null, since: new Date() },
    });
  },
};

interface Waiting {
  call: ActiveCall;
  queue: QueueConfig;
  enteredAt: Date;
  ringing: boolean;
  overflowTimer?: NodeJS.Timeout;
  announceTimer?: NodeJS.Timeout;
  mohOn: boolean;
}

interface AgentState {
  ringingFor?: string;
  onCall?: string;
  wrapUntil?: number;
  wrapTimer?: NodeJS.Timeout;
  wrapUpSeconds?: number;
  misses: number;
  lastCallEndedAt: Date | null;
  callsToday: number;
  availableSince: Date | null;
}

export interface QueueAri {
  answerChannel(channelId: string): Promise<void>;
  startMusicOnHold(channelId: string, mohClass?: string): Promise<void>;
  stopMusicOnHold(channelId: string): Promise<void>;
  hangupChannel(channelId: string, reason?: string): Promise<void>;
}

export interface QueueDeps {
  ari: QueueAri;
  ring: Pick<VoiceRingService, 'ringEndpoints'>;
  tracker: Pick<RingTracker, 'cancel'>;
  connector: Pick<CallConnector, 'connect'>;
  voicemail: Pick<VoiceVoicemailService, 'start'>;
  media: MediaController;
  store?: QueueStore;
  /** Cada cuánto se reintenta repartir (asesores que se liberan o se conectan). */
  retryMs?: number;
}

/** Endpoints de un asesor para una llamada de cola (navegador y, si así lo configuró, celular). */
export function memberTargets(m: QueueMemberRow): RingTarget[] {
  const browser = { endpoint: `PJSIP/${m.extension}`, label: `${m.name} (${m.extension})` };
  const mobile = m.mobileNumber ? { endpoint: trunkDialString(m.mobileNumber), label: `${m.name} (celular)` } : null;
  if (m.ringStrategy === 'MOBILE_ONLY') return mobile ? [mobile] : [];
  if (m.ringStrategy === 'BROWSER_AND_MOBILE' && mobile) return [browser, mobile];
  return [browser];
}

/** Frase de posición: "usted es el siguiente" o "hay N llamadas antes que usted". */
export function positionMedia(position: number): string[] {
  return position <= 1 ? ['sound:queue-youarenext'] : ['sound:queue-thereare', `number:${position - 1}`, 'sound:queue-callswaiting'];
}

export class VoiceQueueService {
  private waiting = new Map<string, Waiting[]>();
  private agents = new Map<string, AgentState>();
  private lastAssigned = new Map<string, string>();
  private dispatching = new Set<string>();
  private retryTimer?: NodeJS.Timeout;
  private readonly store: QueueStore;

  constructor(private readonly deps: QueueDeps) {
    this.store = deps.store ?? prismaQueueStore;
  }

  // --- Entrada a la cola -----------------------------------------------------

  public async enqueueCall(call: ActiveCall, queueId: string): Promise<void> {
    const queue = await this.store.getQueue(queueId, call.organizationId).catch(() => null);
    if (!queue || !queue.isActive) {
      telemetry.log('WARN', `Cola ${queueId} no existe o está inactiva; la llamada ${call.callId} pasa al buzón`);
      await this.deps.voicemail.start(call, { queueId: queue?.id ?? null });
      return;
    }
    const list = this.list(queue.id);
    const members = await this.store.getMembers(queue.id).catch(() => [] as QueueMemberRow[]);
    if (list.length >= queue.maxCallers) return this.overflow(call, queue, 'QUEUE_FULL');
    if (members.length === 0) return this.overflow(call, queue, 'NO_MEMBERS');

    call.queueId = queue.id;
    moveCall(call, 'IN_QUEUE', { extra: { queueId: queue.id, queueName: queue.name } });
    persistence.updateCall(call.callId, { queueId: queue.id });
    try {
      await answerCaller(this.deps.ari, call);
    } catch (err: any) {
      telemetry.log('WARN', `No se pudo contestar la llamada ${call.callId} para la cola: ${err.message}`);
    }

    const item: Waiting = { call, queue, enteredAt: new Date(), ringing: false, mohOn: false };
    list.push(item);
    item.overflowTimer = setTimeout(() => void this.overflow(call, queue, 'MAX_WAIT'), queue.maxWaitSeconds * 1000);
    item.overflowTimer.unref?.();
    const every = Math.max(15, queue.announcePositionEverySeconds || 45) * 1000;
    item.announceTimer = setInterval(() => void this.announce(item), every);
    item.announceTimer.unref?.();
    telemetry.log('INFO', `Llamada ${call.callId} en la cola ${queue.name} (posición ${list.length})`);
    void this.publish(queue);

    void this.dispatch(queue.id);
    this.ensureRetry();

    if (queue.greetingMedia) await this.deps.media.play(call.channelId, [queue.greetingMedia]);
    if (this.isWaiting(call.callId)) await this.startMoh(item);
  }

  // --- Reparto -----------------------------------------------------------------

  public async dispatch(queueId: string): Promise<void> {
    if (this.dispatching.has(queueId)) return;
    this.dispatching.add(queueId);
    try {
      const pending = this.list(queueId).filter((i) => !i.ringing);
      if (!pending.length) return;
      const members = await this.store.getMembers(queueId).catch(() => [] as QueueMemberRow[]);
      for (const item of pending) {
        if (!this.isWaiting(item.call.callId)) continue;
        const free = members.filter((m) => this.isAvailable(m) && memberTargets(m).length > 0);
        if (!free.length) break;
        const byUser = new Map(free.map((m) => [m.userId, m]));
        const selected = selectQueueAgent(
          item.queue.strategy,
          free.map((m) => this.candidate(m)),
          { lastAssignedUserId: this.lastAssigned.get(queueId) }
        );
        if (!selected.length) break;
        const chosen = (item.queue.strategy === 'RINGALL' ? selected : selected.slice(0, 1))
          .map((c) => byUser.get(c.userId))
          .filter((m): m is QueueMemberRow => !!m);
        await this.ringAgents(item, chosen);
      }
    } finally {
      this.dispatching.delete(queueId);
    }
  }

  private async ringAgents(item: Waiting, agents: QueueMemberRow[]): Promise<void> {
    const { call, queue } = item;
    const targets: RingTarget[] = [];
    const agentByEndpoint = new Map<string, QueueMemberRow>();
    for (const a of agents) {
      for (const t of memberTargets(a)) {
        targets.push(t);
        agentByEndpoint.set(t.endpoint, a);
      }
    }
    if (!targets.length) return;
    for (const a of agents) this.state(a.userId).ringingFor = call.callId;
    item.ringing = true;
    this.lastAssigned.set(queue.id, agents[agents.length - 1].userId);
    persistence.logEvent(call.callId, call.organizationId, 'AGENT_RINGING', { queueId: queue.id, userIds: agents.map((a) => a.userId) });

    const release = () => {
      for (const a of agents) {
        const s = this.state(a.userId);
        if (s.ringingFor === call.callId) s.ringingFor = undefined;
      }
    };

    await this.deps.ring.ringEndpoints(
      call,
      targets,
      queue.ringSeconds,
      async (leg, target) => {
        release();
        item.ringing = false;
        const agent = agentByEndpoint.get(target.endpoint) ?? agents[0];
        if (!this.isWaiting(call.callId)) {
          await this.deps.ari.hangupChannel(leg, 'normal').catch(() => {});
          return;
        }
        this.leave(item);
        const s = this.state(agent.userId);
        s.misses = 0;
        s.onCall = call.callId;
        s.wrapUpSeconds = queue.wrapUpSeconds;
        const ok = await this.deps.connector.connect(call, leg, {
          userId: agent.userId,
          extensionId: agent.extensionId,
          recordingPolicy: agent.recordingPolicy,
          reason: `QUEUE_${queue.id}`,
        });
        if (ok) {
          persistence.logEvent(call.callId, call.organizationId, 'AGENT_ANSWERED', { queueId: queue.id }, agent.userId);
          await this.store.setAgentStatus(call.organizationId, agent.userId, 'ON_CALL', null, call.callId).catch(() => {});
        } else {
          s.onCall = undefined;
        }
        void this.publish(queue);
      },
      async (reason) => {
        release();
        item.ringing = false;
        for (const a of agents) {
          const s = this.state(a.userId);
          s.misses++;
          persistence.logEvent(call.callId, call.organizationId, 'AGENT_NO_ANSWER', { queueId: queue.id, reason, misses: s.misses }, a.userId);
          if (shouldAutoBreakAgent(s.misses)) {
            s.misses = 0;
            telemetry.log('WARN', `${a.name} no contestó dos llamadas seguidas: queda en pausa`);
            await this.store.setAgentStatus(call.organizationId, a.userId, 'BREAK', 'No contestó dos llamadas seguidas').catch(() => {});
            await broadcaster
              .publishToUser(a.userId, { event: 'voice.agent_auto_paused', userId: a.userId, reason: 'No contestó dos llamadas seguidas', timestamp: new Date().toISOString() } as any)
              .catch(() => {});
          }
        }
        if (this.isWaiting(call.callId)) void this.dispatch(queue.id);
      },
      { number: call.fromNumber, name: `Cola ${queue.name}` }
    );
  }

  // --- Mientras espera ----------------------------------------------------------

  private async startMoh(item: Waiting) {
    try {
      await this.deps.ari.startMusicOnHold(item.call.channelId, item.queue.musicOnHold || 'default');
      item.mohOn = true;
    } catch (err: any) {
      telemetry.log('WARN', `Sin música de espera en ${item.call.callId}: ${err.message}`);
    }
  }

  private async announce(item: Waiting) {
    if (!this.isWaiting(item.call.callId) || this.deps.media.isPlaying(item.call.channelId)) return;
    const position = this.list(item.queue.id).indexOf(item) + 1;
    if (position <= 0) return;
    const media = positionMedia(position);
    if (item.queue.periodicMedia) media.push(item.queue.periodicMedia);
    if (item.mohOn) {
      await this.deps.ari.stopMusicOnHold(item.call.channelId).catch(() => {});
      item.mohOn = false;
    }
    persistence.logEvent(item.call.callId, item.call.organizationId, 'QUEUE_ANNOUNCE', { position });
    await this.deps.media.play(item.call.channelId, media);
    if (this.isWaiting(item.call.callId)) await this.startMoh(item);
  }

  /** DTMF de quien espera. Devuelve true si la llamada estaba en una cola. */
  public async handleDigit(channelId: string, digit: string): Promise<boolean> {
    const item = this.findByChannel(channelId);
    if (!item) return false;
    if (digit === QUEUE_EXIT_KEY) {
      telemetry.log('INFO', `Llamada ${item.call.callId} sale de la cola ${item.queue.name} al buzón`);
      this.leave(item);
      this.deps.tracker.cancel(item.call.callId);
      await this.deps.media.stopChannel(channelId);
      await this.deps.ari.stopMusicOnHold(channelId).catch(() => {});
      await this.deps.voicemail.start(item.call, { queueId: item.queue.id });
      void this.publish(item.queue);
    }
    return true;
  }

  // --- Desborde ------------------------------------------------------------------

  public async overflow(call: ActiveCall, queue: QueueConfig, reason: string): Promise<void> {
    const item = this.find(call.callId);
    if (item) this.leave(item);
    this.deps.tracker.cancel(call.callId);
    if (!callRegistry.getCallById(call.callId)) return;
    await this.deps.media.stopChannel(call.channelId);
    await this.deps.ari.stopMusicOnHold(call.channelId).catch(() => {});
    telemetry.log('INFO', `Desborde de ${call.callId} en ${queue.name} (${reason}) → ${queue.overflowTarget}`);
    persistence.logEvent(call.callId, call.organizationId, 'QUEUE_ANNOUNCE', { overflow: reason, target: queue.overflowTarget });
    void this.publish(queue);

    switch (queue.overflowTarget) {
      case 'ANOTHER_QUEUE': {
        call.queueHops = (call.queueHops ?? 0) + 1;
        if (!queue.overflowTargetId || queue.overflowTargetId === queue.id || call.queueHops > MAX_QUEUE_BOUNCES) {
          await this.deps.voicemail.start(call, { queueId: queue.id });
          return;
        }
        await this.enqueueCall(call, queue.overflowTargetId);
        return;
      }
      case 'EXTERNAL_NUMBER': {
        if (!queue.overflowTargetId) {
          await this.deps.voicemail.start(call, { queueId: queue.id });
          return;
        }
        await answerCaller(this.deps.ari, call).catch(() => {});
        await this.deps.ring.ringEndpoints(
          call,
          [{ endpoint: trunkDialString(queue.overflowTargetId), label: `externo ${queue.overflowTargetId}` }],
          30,
          async (leg) => {
            await this.deps.connector.connect(call, leg, { reason: 'QUEUE_OVERFLOW_EXTERNAL' });
          },
          () => this.deps.voicemail.start(call, { queueId: queue.id })
        );
        return;
      }
      case 'HANGUP_WITH_MESSAGE': {
        await this.deps.media.play(call.channelId, ['sound:vm-goodbye']);
        await this.deps.ari.hangupChannel(call.channelId, 'normal').catch(() => {});
        // Llamada perdida: queda la tarea de devolverla
        finishCall(call, 'MISSED', 'QUEUE_OVERFLOW', 'SYSTEM');
        return;
      }
      case 'AI_AGENT':
      case 'VOICEMAIL':
      default:
        // El agente de voz con IA llega en la fase 3; mientras tanto, buzón
        await this.deps.voicemail.start(call, { queueId: queue.id });
    }
  }

  // --- Fin de llamadas -----------------------------------------------------------

  /** Quien esperaba colgó. Devuelve true si estaba en una cola. */
  public callerLeft(callId: string): boolean {
    const item = this.find(callId);
    if (!item) return false;
    this.leave(item);
    this.deps.tracker.cancel(callId);
    for (const s of this.agents.values()) if (s.ringingFor === callId) s.ringingFor = undefined;
    void this.publish(item.queue);
    return true;
  }

  /** Terminó una conversación de cola: el asesor queda en respiro y luego disponible. */
  public async callEnded(call: ActiveCall): Promise<void> {
    const userId = call.handledByUserId;
    if (!userId) return;
    const s = this.agents.get(userId);
    if (!s || s.onCall !== call.callId) return;
    s.onCall = undefined;
    s.lastCallEndedAt = new Date();
    s.callsToday++;
    const wrap = Math.max(0, s.wrapUpSeconds ?? 10);
    s.wrapUntil = Date.now() + wrap * 1000;
    await this.store.setAgentStatus(call.organizationId, userId, 'WRAP_UP').catch(() => {});
    if (s.wrapTimer) clearTimeout(s.wrapTimer);
    s.wrapTimer = setTimeout(() => void this.endWrapUp(userId), wrap * 1000);
    s.wrapTimer.unref?.();
  }

  public async endWrapUp(userId: string): Promise<void> {
    const s = this.agents.get(userId);
    if (s) {
      s.wrapUntil = undefined;
      if (s.wrapTimer) clearTimeout(s.wrapTimer);
      s.availableSince = new Date();
    }
    await this.store.endWrapUp(userId).catch(() => {});
    for (const queueId of this.waiting.keys()) void this.dispatch(queueId);
  }

  // --- Consultas -------------------------------------------------------------------

  public waitingCalls(queueId: string): Array<{ callId: string; fromNumber: string; enteredAt: Date; ringing: boolean }> {
    return this.list(queueId).map((i) => ({ callId: i.call.callId, fromNumber: i.call.fromNumber, enteredAt: i.enteredAt, ringing: i.ringing }));
  }

  public isWaiting(callId: string): boolean {
    return !!this.find(callId);
  }

  public stop(): void {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = undefined;
    for (const list of this.waiting.values()) for (const i of list) this.clearTimers(i);
    for (const s of this.agents.values()) if (s.wrapTimer) clearTimeout(s.wrapTimer);
  }

  // --- Internos --------------------------------------------------------------------

  private isAvailable(m: QueueMemberRow): boolean {
    if (m.status === 'OFFLINE' || m.status === 'BREAK') return false;
    const s = this.agents.get(m.userId);
    if (s?.ringingFor || s?.onCall) return false;
    if (s?.wrapUntil && s.wrapUntil > Date.now()) return false;
    // Ocupado en otra llamada (directa, saliente o interna)
    return !callRegistry
      .getAllActiveCalls()
      .some((c) => c.handledByUserId === m.userId && !c.finished && c.machine.state !== 'IN_QUEUE');
  }

  private candidate(m: QueueMemberRow): QueueAgentCandidate {
    const s = this.state(m.userId);
    return {
      userId: m.userId,
      name: m.name,
      extension: m.extension,
      penalty: m.penalty,
      skills: m.skills,
      status: 'AVAILABLE',
      lastCallCompletedAt: s.lastCallEndedAt,
      callsHandledToday: s.callsToday,
      availableSince: s.availableSince ?? s.lastCallEndedAt,
      consecutiveMissedCalls: s.misses,
    };
  }

  private state(userId: string): AgentState {
    let s = this.agents.get(userId);
    if (!s) {
      s = { misses: 0, lastCallEndedAt: null, callsToday: 0, availableSince: null };
      this.agents.set(userId, s);
    }
    return s;
  }

  private list(queueId: string): Waiting[] {
    let l = this.waiting.get(queueId);
    if (!l) {
      l = [];
      this.waiting.set(queueId, l);
    }
    return l;
  }

  private find(callId: string): Waiting | undefined {
    for (const l of this.waiting.values()) for (const i of l) if (i.call.callId === callId) return i;
    return undefined;
  }

  private findByChannel(channelId: string): Waiting | undefined {
    for (const l of this.waiting.values()) for (const i of l) if (i.call.channelId === channelId) return i;
    return undefined;
  }

  private leave(item: Waiting) {
    this.clearTimers(item);
    const l = this.list(item.queue.id);
    const idx = l.indexOf(item);
    if (idx >= 0) l.splice(idx, 1);
    if (![...this.waiting.values()].some((x) => x.length) && this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private clearTimers(item: Waiting) {
    if (item.overflowTimer) clearTimeout(item.overflowTimer);
    if (item.announceTimer) clearInterval(item.announceTimer);
  }

  private ensureRetry() {
    if (this.retryTimer) return;
    this.retryTimer = setInterval(() => {
      for (const [queueId, l] of this.waiting) if (l.length) void this.dispatch(queueId);
    }, this.deps.retryMs ?? 3000);
    this.retryTimer.unref?.();
  }

  private async publish(queue: QueueConfig) {
    const l = this.list(queue.id);
    const now = Date.now();
    await broadcaster
      .publishToQueue(queue.id, {
        event: 'voice.queue_updated',
        queueId: queue.id,
        organizationId: queue.organizationId,
        waitingCallsCount: l.length,
        longestWaitSeconds: l.length ? Math.round(Math.max(...l.map((i) => now - i.enteredAt.getTime())) / 1000) : 0,
        activeAgentsCount: [...this.agents.values()].filter((s) => s.onCall).length,
        timestamp: new Date().toISOString(),
      })
      .catch(() => {});
  }
}
