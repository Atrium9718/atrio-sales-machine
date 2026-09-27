/**
 * Menú de opciones (IVR) en vivo.
 *
 * El flujo publicado en el CRM (VoiceIvrFlow) se interpreta paso a paso con runFlowStep, el mismo
 * motor del simulador del editor. Este servicio pone el audio y los tiempos:
 * - Locuciones con POST /channels/{id}/play; su final llega como PlaybackFinished.
 * - Las teclas llegan como ChannelDtmfReceived; en un menú cortan la locución (si es interrumpible).
 * - Si nadie marca en el tiempo del menú, el motor recibe TIMEOUT y repite o toma la salida.
 * - Al llegar a un destino (cola, extensión, buzón, número externo) la llamada sale del menú.
 */

import {
  IvrExecutionContext,
  IvrFlowDefinition,
  IvrNode,
  IvrStepResult,
  executeCrmLookup,
  runFlowStep,
} from '@fusion/core/src/voice/ivrEngine';
import { bogotaYmd, holidaysOf, isOpenAt, sanitizeWorkCalendar } from '@fusion/core/src/calendar/workCalendar';
import { ActiveCall, callRegistry } from '../state/registry';
import { finishCall, moveCall } from '../state/lifecycle';
import { prisma, persistence } from './persist';
import { telemetry } from '../telemetry';
import { answerCaller } from './connect';
import { promptMedia } from './queue';
import type { MediaController } from './media';

export type BusinessStatus = 'abierto' | 'cerrado' | 'festivo';

export interface IvrStore {
  /** Versión publicada del flujo (null si no existe o no está publicado). */
  loadFlow(flowId: string, organizationId: string): Promise<IvrFlowDefinition | null>;
  /** Locuciones de la organización: id → media de ARI. */
  prompts(organizationId: string): Promise<Map<string, string>>;
  businessStatus(now: Date): Promise<BusinessStatus>;
  addDoNotCall(organizationId: string, phone: string, customerId: string | null): Promise<void>;
}

export interface IvrRoutes {
  toQueue(call: ActiveCall, queueId: string): Promise<void>;
  toExtension(call: ActiveCall, extension: string): Promise<void>;
  toVoicemail(call: ActiveCall, greeting?: string[]): Promise<void>;
  toExternal(call: ActiveCall, number: string): Promise<void>;
}

export interface IvrAri {
  answerChannel(channelId: string): Promise<void>;
  hangupChannel(channelId: string, reason?: string): Promise<void>;
}

/** Estado de atención según el calendario laboral de la empresa (Administración → Calendario). */
export function businessStatusFor(now: Date, calendarValue: unknown): BusinessStatus {
  const cal = sanitizeWorkCalendar(calendarValue ?? {});
  if (isOpenAt(now, cal)) return 'abierto';
  const ymd = bogotaYmd(now);
  const openByException = cal.exceptions.some((e) => e.date === ymd && e.type === 'OPEN');
  const holiday = holidaysOf(Number(ymd.slice(0, 4))).some((h) => h.date === ymd);
  return holiday && !openByException ? 'festivo' : 'cerrado';
}

export const prismaIvrStore: IvrStore = {
  async loadFlow(flowId, organizationId) {
    const row = await prisma.voiceIvrFlow.findFirst({ where: { id: flowId, organizationId, status: 'PUBLISHED', deletedAt: null } });
    if (!row) return null;
    const def = row.definition as unknown as IvrFlowDefinition;
    return def?.nodes?.length ? { ...def, id: row.id, organizationId: row.organizationId } : null;
  },
  async prompts(organizationId) {
    const rows = await prisma.voicePrompt.findMany({ where: { organizationId, isActive: true, deletedAt: null } });
    return new Map(rows.flatMap((p) => (promptMedia(p.asteriskFilename) ? [[p.id, promptMedia(p.asteriskFilename)!] as [string, string]] : [])));
  },
  async businessStatus(now) {
    const doc = await prisma.storedDocument
      .findUnique({ where: { collection_id: { collection: 'system_config', id: 'work_calendar' } } })
      .catch(() => null);
    return businessStatusFor(now, (doc?.data as any)?.value);
  },
  async addDoNotCall(organizationId, phone, customerId) {
    await prisma.voiceDoNotCall.upsert({
      where: { phone },
      create: { organizationId, phone, customerId, reason: 'CUSTOMER_REQUEST', requestedVia: 'tecla del menú telefónico' },
      update: { deletedAt: null, requestedAt: new Date(), requestedVia: 'tecla del menú telefónico' },
    });
  },
};

/** Locuciones por defecto del motor cuando el nodo no tiene una propia: sonidos de Asterisk en español. */
const BUILTIN: Record<string, string | null> = {
  'fusion/saludo_general': null,
  'fusion/cola_espera': null,
  'fusion/error_opcion_invalida': 'sound:option-is-invalid',
  'fusion/buzon_invitacion': 'sound:vm-intro',
  'fusion/despedida': 'sound:vm-goodbye',
};

const MAX_STEPS = 300;

class Session {
  digits: string[] = [];
  waiter?: (digit: string | null) => void;
  playback?: { id: string; interruptible: boolean };
  aborted = false;
  constructor(readonly call: ActiveCall, readonly flow: IvrFlowDefinition, readonly prompts: Map<string, string>) {}
}

export class VoiceIvrService {
  private sessions = new Map<string, Session>();

  constructor(
    private readonly ari: IvrAri,
    private readonly media: MediaController,
    private readonly routes: IvrRoutes,
    private readonly store: IvrStore = prismaIvrStore,
    private readonly defaultTimeoutSeconds = 6
  ) {}

  /** Pone la llamada en el menú. Devuelve false si el flujo no existe o no está publicado. */
  public async start(call: ActiveCall, flowId: string): Promise<boolean> {
    const flow = await this.store.loadFlow(flowId, call.organizationId).catch(() => null);
    if (!flow) {
      telemetry.log('WARN', `Menú ${flowId} no existe o no está publicado (llamada ${call.callId})`);
      return false;
    }
    const [prompts, businessStatus] = await Promise.all([
      this.store.prompts(call.organizationId).catch(() => new Map<string, string>()),
      this.store.businessStatus(new Date()).catch(() => 'abierto' as BusinessStatus),
    ]);
    call.ivrFlowId = flow.id;
    moveCall(call, 'IN_IVR', { extra: { ivrFlowId: flow.id } });
    persistence.updateCall(call.callId, { ivrFlowId: flow.id });
    await answerCaller(this.ari, call);

    const session = new Session(call, flow, prompts);
    this.sessions.set(call.channelId, session);
    const ctx: IvrExecutionContext = {
      callId: call.callId,
      organizationId: call.organizationId,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      callerCustomer: call.context?.customerId
        ? { id: call.context.customerId, name: call.context.customerName ?? '', temperature: (call.context as any).temperature }
        : undefined,
      variables: {},
      currentNodeId: flow.initialNodeId || flow.nodes[0].id,
      currentRetries: {},
      dtmfBuffer: '',
      accumulatedWaitSeconds: 0,
      stepHistory: [],
      legalNoticePlayed: false,
      activeMenuDepth: 0,
      businessStatus,
    };
    void this.run(session, ctx);
    return true;
  }

  /** DTMF de un canal. Devuelve true si la llamada estaba en un menú. */
  public handleDigit(channelId: string, digit: string): boolean {
    const s = this.sessions.get(channelId);
    if (!s) return false;
    if (s.playback && !s.playback.interruptible) return true; // aviso obligatorio: no se corta
    if (s.waiter) {
      const w = s.waiter;
      s.waiter = undefined;
      w(digit);
      return true;
    }
    s.digits.push(digit);
    if (s.playback?.interruptible) void this.media.stop(s.playback.id);
    return true;
  }

  /** Quien llamaba colgó en el menú. */
  public abort(channelId: string): boolean {
    const s = this.sessions.get(channelId);
    if (!s) return false;
    s.aborted = true;
    this.sessions.delete(channelId);
    s.waiter?.(null);
    return true;
  }

  public inMenu(channelId: string): boolean {
    return this.sessions.has(channelId);
  }

  private async run(s: Session, initial: IvrExecutionContext): Promise<void> {
    let ctx = initial;
    let event: Parameters<typeof runFlowStep>[2];
    let lastWait: string | null = null;
    const nodes = new Map(s.flow.nodes.map((n) => [n.id, n]));
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        if (s.aborted || !callRegistry.getCallById(s.call.callId)) return;
        const r = runFlowStep(s.flow, ctx, event);
        ctx = r.nextContext;
        const lastEvent = event;
        event = undefined;
        if (lastEvent?.type === 'DTMF' && r.nodeType === 'MENU') {
          persistence.logEvent(s.call.callId, s.call.organizationId, 'IVR_OPTION', { node: r.nodeId, digit: lastEvent.dtmf, log: r.humanReadableLog });
        }

        switch (r.action) {
          case 'JUMP':
            lastWait = null;
            continue;

          case 'PLAY_PROMPT': {
            const digit = await this.play(s, this.mediaFor(s, r, nodes), r.prompt?.interruptible ?? true);
            event = digit ? { type: 'DTMF', dtmf: digit } : { type: 'PLAYBACK_FINISHED' };
            lastWait = null;
            continue;
          }

          case 'WAIT_DTMF': {
            const node = nodes.get(r.nodeId);
            // En una captura cada tecla es un paso: el guion se oye una sola vez
            const replay = !(r.nodeType === 'CAPTURA' && lastWait === r.nodeId && lastEvent?.type === 'DTMF');
            lastWait = r.nodeId;
            if (replay) {
              const digit = await this.play(s, this.mediaFor(s, r, nodes), true);
              if (digit) {
                event = { type: 'DTMF', dtmf: digit };
                continue;
              }
            }
            const seconds = Number(node?.data.timeoutSeconds) || this.defaultTimeoutSeconds;
            const digit = await this.waitDigit(s, seconds * 1000);
            if (s.aborted) return;
            event = digit ? { type: 'DTMF', dtmf: digit } : { type: 'TIMEOUT' };
            continue;
          }

          case 'CRM_LOOKUP': {
            const q = r.crmLookup!;
            const result = q.allowed
              ? await Promise.race([
                  executeCrmLookup(q.queryType as any, q.input, ctx),
                  new Promise<{ success: boolean }>((resolve) => setTimeout(() => resolve({ success: false }), 2000)),
                ]).catch(() => ({ success: false }))
              : { success: false };
            event = { type: 'CRM_RESULT', crmSuccess: result.success, crmData: (result as any).data };
            continue;
          }

          case 'ROUTE_QUEUE':
            this.leave(s);
            if (r.target?.queueId) await this.routes.toQueue(s.call, r.target.queueId);
            else await this.routes.toVoicemail(s.call);
            return;

          case 'ROUTE_EXTENSION':
            this.leave(s);
            if (r.target?.extension) await this.routes.toExtension(s.call, r.target.extension);
            else await this.routes.toVoicemail(s.call);
            return;

          case 'TRANSFER_EXTERNAL':
            this.leave(s);
            if (r.target?.externalNumber) await this.routes.toExternal(s.call, r.target.externalNumber);
            else await this.routes.toVoicemail(s.call);
            return;

          case 'ROUTE_AI': // El agente de voz con IA llega en la fase 3: mientras tanto, buzón
          case 'RECORD_VOICEMAIL': {
            this.leave(s);
            const node = nodes.get(r.nodeId);
            const own = node?.data.promptId ? s.prompts.get(node.data.promptId) : undefined;
            await this.routes.toVoicemail(s.call, own ? [own] : undefined);
            return;
          }

          case 'SCHEDULE_CALLBACK':
            // Queda como llamada por devolver (con su tarea)
            await this.goodbye(s, [], 'MISSED');
            return;

          case 'ADD_DO_NOT_CALL':
            await this.store.addDoNotCall(s.call.organizationId, s.call.fromNumber, s.call.context?.customerId ?? null).catch((err) =>
              telemetry.log('WARN', `No se pudo registrar ${s.call.fromNumber} en "no llamar": ${err.message}`)
            );
            await this.goodbye(s, [], 'CANCELLED');
            return;

          case 'HANGUP':
          default:
            await this.goodbye(s, this.mediaFor(s, r, nodes), 'MISSED');
            return;
        }
      }
      telemetry.log('ERROR', `El menú ${s.flow.id} dio demasiados pasos en la llamada ${s.call.callId} (¿un ciclo?)`);
      await this.goodbye(s, [], 'FAILED');
    } catch (err: any) {
      telemetry.log('ERROR', `Error en el menú de la llamada ${s.call.callId}: ${err.message}`);
      this.leave(s);
      await this.routes.toVoicemail(s.call).catch(() => {});
    }
  }

  private mediaFor(s: Session, r: IvrStepResult, nodes: Map<string, IvrNode>): string[] {
    const p = r.prompt;
    if (!p) return [];
    if (p.id && s.prompts.has(p.id)) return [s.prompts.get(p.id)!];
    const node = nodes.get(r.nodeId);
    if (node?.data.asteriskFilename && p.filename === node.data.asteriskFilename) {
      const m = promptMedia(p.filename);
      return m ? [m] : [];
    }
    if (p.filename in BUILTIN) return BUILTIN[p.filename] ? [BUILTIN[p.filename]!] : [];
    const m = promptMedia(p.filename);
    return m ? [m] : [];
  }

  /** Reproduce; si es interrumpible y marcan, devuelve la tecla. */
  private async play(s: Session, media: string[], interruptible: boolean): Promise<string | null> {
    if (interruptible && s.digits.length) return s.digits.shift()!;
    if (!media.length || s.aborted) return null;
    const pb = this.media.start(s.call.channelId, media);
    s.playback = { id: pb.id, interruptible };
    await pb.done;
    s.playback = undefined;
    if (interruptible && s.digits.length) return s.digits.shift()!;
    if (!interruptible) s.digits = [];
    return null;
  }

  private waitDigit(s: Session, ms: number): Promise<string | null> {
    if (s.digits.length) return Promise.resolve(s.digits.shift()!);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        s.waiter = undefined;
        resolve(null);
      }, ms);
      s.waiter = (d) => {
        clearTimeout(timer);
        resolve(d);
      };
    });
  }

  private leave(s: Session) {
    this.sessions.delete(s.call.channelId);
  }

  private async goodbye(s: Session, media: string[], disposition: 'MISSED' | 'CANCELLED' | 'FAILED') {
    this.leave(s);
    if (media.length) await this.media.play(s.call.channelId, media);
    await this.ari.hangupChannel(s.call.channelId, 'normal').catch(() => {});
    finishCall(s.call, disposition, 'IVR_END', 'SYSTEM');
  }
}
