import { trunkDialString } from '../trunk';
import { ActiveCall } from '../state/registry';
import { prisma } from './persist';
import { telemetry } from '../telemetry';
import { NoAnswerReason, RingTracker } from './ringGroups';

export type RingStrategy = 'BROWSER_ONLY' | 'BROWSER_THEN_MOBILE' | 'BROWSER_AND_MOBILE' | 'MOBILE_ONLY';

export interface RingExtensionRow {
  id: string;
  userId: string | null;
  extension: string;
  ringStrategy: RingStrategy;
  mobileNumber: string | null;
  ringTimeoutSeconds: number;
  voicemailEnabled: boolean;
  dndUntil: Date | null;
  forwardToExtension: string | null;
  recordingPolicy: 'ALWAYS' | 'NEVER' | 'INBOUND_ONLY' | 'OUTBOUND_ONLY';
}

export interface RingStore {
  findExtension(organizationId: string, extension: string): Promise<RingExtensionRow | null>;
  agentStatus(userId: string): Promise<string | null>;
}

export const prismaRingStore: RingStore = {
  async findExtension(organizationId, extension) {
    const ext = await prisma.voiceExtension.findFirst({ where: { organizationId, extension, status: 'ACTIVE', deletedAt: null } });
    return ext as RingExtensionRow | null;
  },
  async agentStatus(userId) {
    const row = await prisma.voiceAgentStatus.findUnique({ where: { userId } });
    return row?.status ?? null;
  },
};

export interface RingAri {
  createChannel(params: { endpoint: string; app: string; appArgs?: string; callerId?: string; callerName?: string }): Promise<{ id: string }>;
  dialChannel(channelId: string, callerChannelId?: string, timeout?: number): Promise<void>;
}

export interface RingTarget {
  endpoint: string;
  label: string;
}

/** Endpoints a timbrar para una extensión según su estrategia (sin el orden: eso lo decide quien llama). */
export function extensionEndpoints(ext: Pick<RingExtensionRow, 'extension' | 'mobileNumber'>, which: 'browser' | 'mobile' | 'both'): RingTarget[] {
  const out: RingTarget[] = [];
  if (which !== 'mobile') out.push({ endpoint: `PJSIP/${ext.extension}`, label: `navegador ${ext.extension}` });
  if (which !== 'browser' && ext.mobileNumber) out.push({ endpoint: trunkDialString(ext.mobileNumber), label: `celular ${ext.mobileNumber}` });
  return out;
}

export interface ExtensionRingHandlers {
  onAnswered: (legChannelId: string, ext: RingExtensionRow) => void | Promise<void>;
  /** Nadie contestó, "no molestar" o la extensión no existe (ext = null). */
  onNoAnswer: (ext: RingExtensionRow | null) => void | Promise<void>;
  /** Justo antes de timbrar (para avisar al navegador del asesor). */
  onRinging?: (ext: RingExtensionRow) => void | Promise<void>;
}

export class VoiceRingService {
  constructor(
    private readonly ari: RingAri,
    private readonly tracker: RingTracker,
    private readonly store: RingStore = prismaRingStore
  ) {}

  /**
   * Timbra varios destinos a la vez. La primera pierna que contesta llega en onAnswered con su canal;
   * si nadie contesta (tiempo, rechazo o teléfono desconectado) se llama onNoAnswer una sola vez.
   */
  public async ringEndpoints(
    call: ActiveCall,
    targets: RingTarget[],
    timeoutSeconds: number,
    onAnswered: (legChannelId: string, target: RingTarget) => void | Promise<void>,
    onNoAnswer: (reason: NoAnswerReason) => void | Promise<void>,
    callerId: { number?: string; name?: string } = {}
  ): Promise<void> {
    const targetByLeg = new Map<string, RingTarget>();
    const group = this.tracker.start({
      callId: call.callId,
      timeoutSeconds,
      onAnswered: (leg) => onAnswered(leg, targetByLeg.get(leg) ?? targets[0]),
      onNoAnswer,
    });
    for (const target of targets) {
      try {
        const leg = await this.ari.createChannel({
          endpoint: target.endpoint,
          app: 'fusion-voz',
          appArgs: `ring_leg,${call.callId}`,
          callerId: callerId.number ?? call.fromNumber,
          callerName: callerId.name ?? call.context?.customerName ?? undefined,
        });
        targetByLeg.set(leg.id, target);
        this.tracker.addLeg(group, leg.id);
        await this.ari.dialChannel(leg.id, call.channelId, timeoutSeconds);
        telemetry.log('INFO', `Timbrando ${target.label} para la llamada ${call.callId}`);
      } catch (err: any) {
        telemetry.log('WARN', `No se pudo timbrar ${target.label}: ${err.message}`);
      }
    }
    this.tracker.ready(group);
  }

  /**
   * Timbra una extensión según su estrategia (navegador, celular o ambos), respetando
   * "no molestar", desvíos y el estado del asesor. onNoAnswer recibe la extensión (si existe)
   * para que quien llama decida si pasa al buzón.
   */
  public async ringExtension(call: ActiveCall, extensionNumber: string, handlers: ExtensionRingHandlers, hops = 0): Promise<void> {
    const { onAnswered, onNoAnswer } = handlers;
    const ext = await this.store.findExtension(call.organizationId, extensionNumber);
    if (!ext) {
      telemetry.log('WARN', `Extensión ${extensionNumber} no existe o no está activa.`);
      await onNoAnswer(null);
      return;
    }

    const forward = ext.forwardToExtension && ext.forwardToExtension !== ext.extension ? ext.forwardToExtension : null;
    const inDnd = !!ext.dndUntil && ext.dndUntil > new Date();
    if (forward && hops < 3) {
      telemetry.log('INFO', `Extensión ${extensionNumber} desviada a ${forward}`);
      return this.ringExtension(call, forward, handlers, hops + 1);
    }
    if (inDnd) {
      telemetry.log('INFO', `Extensión ${extensionNumber} en "no molestar"`);
      await onNoAnswer(ext);
      return;
    }

    call.handledByUserId = ext.userId ?? undefined;
    call.extensionId = ext.id;
    call.targetExtensionNumber = ext.extension;

    // Si el asesor está desconectado no se pierde tiempo timbrando el navegador
    const status = ext.userId ? await this.store.agentStatus(ext.userId).catch(() => null) : null;
    const browserOff = status === 'OFFLINE';
    const strategy: RingStrategy = ext.ringStrategy;

    let first: RingTarget[];
    let then: RingTarget[] = [];
    if (strategy === 'MOBILE_ONLY') first = extensionEndpoints(ext, 'mobile');
    else if (strategy === 'BROWSER_AND_MOBILE') first = extensionEndpoints(ext, browserOff ? 'mobile' : 'both');
    else if (strategy === 'BROWSER_THEN_MOBILE') {
      first = extensionEndpoints(ext, browserOff ? 'mobile' : 'browser');
      then = browserOff ? [] : extensionEndpoints(ext, 'mobile');
    } else first = browserOff ? [] : extensionEndpoints(ext, 'browser');

    if (first.length === 0) {
      await onNoAnswer(ext);
      return;
    }

    await handlers.onRinging?.(ext);
    const timeout = ext.ringTimeoutSeconds || 25;
    await this.ringEndpoints(
      call,
      first,
      timeout,
      (leg) => onAnswered(leg, ext),
      async () => {
        if (then.length === 0) return onNoAnswer(ext);
        telemetry.log('INFO', `El navegador de ${ext.extension} no contestó; timbrando el celular`);
        await this.ringEndpoints(call, then, timeout, (leg) => onAnswered(leg, ext), () => onNoAnswer(ext));
      }
    );
  }
}
