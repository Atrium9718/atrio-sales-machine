/**
 * Buzón de voz del CRM (sin app_voicemail de Asterisk).
 *
 * 1. Contesta si hace falta y reproduce la invitación (locución propia o "vm-intro").
 * 2. Graba el canal con POST /channels/{id}/record (pitido, 2 min máx., corta con # o 5 s de silencio).
 * 3. Al llegar RecordingFinished guarda el mensaje (VoiceVoicemail) y crea la tarea de devolverlo.
 *    El archivo queda en /var/spool/asterisk/recording/<nombre>.wav, que el CRM lee para escucharlo.
 * 4. Si quien llama cuelga durante la grabación, Asterisk termina la grabación igual: el mensaje
 *    se guarda y la llamada se cierra aquí (no en el colgado), así el resultado es uno solo.
 */

import { ActiveCall, callRegistry } from '../state/registry';
import { finishCall, moveCall } from '../state/lifecycle';
import { prisma, persistence } from './persist';
import { broadcaster } from './broadcast';
import { telemetry } from '../telemetry';
import { answerCaller } from './connect';
import type { MediaController } from './media';

/** Mensajes de menos de este tiempo son silencio o un colgado: no se guardan. */
export const MIN_VOICEMAIL_SECONDS = 2;

export const voicemailStorageKey = (recordingName: string) => `recording/${recordingName}.wav`;

export interface VoicemailAri {
  answerChannel(channelId: string): Promise<void>;
  recordChannel(
    channelId: string,
    params: { name: string; format?: string; maxDurationSeconds?: number; maxSilenceSeconds?: number; terminateOn?: string; beep?: boolean }
  ): Promise<unknown>;
  hangupChannel(channelId: string, reason?: string): Promise<void>;
}

export interface SavedVoicemail {
  organizationId: string;
  callId: string;
  extensionId: string | null;
  queueId: string | null;
  assigneeUserId: string | null;
  customerId: string | null;
  fromNumber: string;
  callerName: string | null;
  storageKey: string;
  durationSeconds: number;
}

export interface VoicemailStore {
  save(vm: SavedVoicemail): Promise<string>;
}

export const prismaVoicemailStore: VoicemailStore = {
  async save(vm) {
    const row = await prisma.voiceVoicemail.upsert({
      where: { callId: vm.callId },
      create: {
        organizationId: vm.organizationId,
        callId: vm.callId,
        extensionId: vm.extensionId,
        queueId: vm.queueId,
        storageKey: vm.storageKey,
        durationSeconds: vm.durationSeconds,
        status: 'NEW',
      },
      update: { storageKey: vm.storageKey, durationSeconds: vm.durationSeconds, deletedAt: null },
    });
    const who = vm.callerName ? `${vm.callerName} (${vm.fromNumber})` : vm.fromNumber;
    await prisma.task
      .create({
        data: {
          organizationId: vm.organizationId,
          code: `TASK-VM-${Date.now()}`,
          clientId: vm.customerId,
          assigneeId: vm.assigneeUserId,
          title: `Devolver mensaje de voz de ${who}`,
          description: `Dejó un mensaje de ${Math.round(vm.durationSeconds)} s. Escúchalo en Voz → Buzón y devuelve la llamada.`,
          priority: 'HIGH' as any,
          status: 'PENDING' as any,
          dueAt: new Date(Date.now() + 4 * 3600_000),
        } as any,
      })
      .catch((err: any) => telemetry.log('WARN', `No se pudo crear la tarea del buzón: ${err.message}`));
    return row.id;
  },
};

interface Pending {
  call: ActiveCall;
  safety: NodeJS.Timeout;
}

export interface VoicemailOptions {
  extensionId?: string | null;
  queueId?: string | null;
  assigneeUserId?: string | null;
  /** Locución de invitación (media de ARI, p. ej. sound:fusion/buzon_ventas). */
  greeting?: string[];
}

export class VoiceVoicemailService {
  private pending = new Map<string, Pending>();

  constructor(
    private readonly ari: VoicemailAri,
    private readonly media: MediaController,
    private readonly store: VoicemailStore = prismaVoicemailStore,
    private readonly maxSeconds = 120
  ) {}

  public async start(call: ActiveCall, opts: VoicemailOptions = {}): Promise<void> {
    const recordingName = `vm_${call.callId}`;
    call.voicemail = { recordingName, extensionId: opts.extensionId ?? null, queueId: opts.queueId ?? null, assigneeUserId: opts.assigneeUserId ?? call.handledByUserId ?? null };
    moveCall(call, 'VOICEMAIL', { extra: { extensionId: opts.extensionId, queueId: opts.queueId } });
    try {
      await answerCaller(this.ari, call);
      const end = await this.media.play(call.channelId, opts.greeting?.length ? opts.greeting : ['sound:vm-intro']);
      if (!callRegistry.getCallById(call.callId) || end === 'stopped') return;
      await this.ari.recordChannel(call.channelId, {
        name: recordingName,
        format: 'wav',
        maxDurationSeconds: this.maxSeconds,
        maxSilenceSeconds: 5,
        terminateOn: '#',
        beep: true,
      });
      // Si Asterisk nunca avisa el final de la grabación, la llamada no queda abierta para siempre
      const safety = setTimeout(() => void this.finished(recordingName, 0), (this.maxSeconds + 30) * 1000);
      this.pending.set(recordingName, { call, safety });
      telemetry.log('INFO', `Grabando buzón ${recordingName} para ${call.fromNumber}`);
    } catch (err: any) {
      telemetry.log('WARN', `No se pudo grabar el buzón de ${call.callId}: ${err.message}`);
      await this.ari.hangupChannel(call.channelId, 'normal').catch(() => {});
      finishCall(call, 'MISSED', 'VOICEMAIL_FAILED', 'SYSTEM');
    }
  }

  /** ¿Hay una grabación de buzón en curso para esta llamada? */
  public isRecording(callId: string): boolean {
    for (const p of this.pending.values()) if (p.call.callId === callId) return true;
    return false;
  }

  /** Quien llamaba colgó mientras grababa: el cierre lo hace finished(). */
  public callerHungUp(call: ActiveCall): void {
    if (call.voicemail) call.voicemail.callerGone = true;
    callRegistry.removeCall(call.callId);
  }

  /** RecordingFinished (o RecordingFailed con 0 s). Devuelve true si la grabación era de un buzón. */
  public async finished(recordingName: string, durationSeconds: number): Promise<boolean> {
    const p = this.pending.get(recordingName);
    if (!p) return false;
    clearTimeout(p.safety);
    this.pending.delete(recordingName);
    const { call } = p;
    const vm = call.voicemail ?? {};
    const seconds = Math.round(Number(durationSeconds) || 0);
    const saved = seconds >= MIN_VOICEMAIL_SECONDS;

    if (saved) {
      try {
        const id = await this.store.save({
          organizationId: call.organizationId,
          callId: call.callId,
          extensionId: vm.extensionId ?? null,
          queueId: vm.queueId ?? null,
          assigneeUserId: vm.assigneeUserId ?? null,
          customerId: call.context?.customerId ?? null,
          fromNumber: call.fromNumber,
          callerName: call.context?.customerName ?? null,
          storageKey: voicemailStorageKey(recordingName),
          durationSeconds: seconds,
        });
        vm.saved = true;
        await broadcaster.publishToOrg(call.organizationId, {
          event: 'voice.voicemail_received',
          organizationId: call.organizationId,
          callId: call.callId,
          payload: { voicemailId: id, fromNumber: call.fromNumber, durationSeconds: seconds, assigneeUserId: vm.assigneeUserId ?? null },
          timestamp: new Date().toISOString(),
        } as any);
        telemetry.log('INFO', `Mensaje de voz guardado (${seconds} s) de ${call.fromNumber}`);
      } catch (err: any) {
        telemetry.log('ERROR', `No se pudo guardar el mensaje de voz de ${call.callId}: ${err.message}`);
      }
    }
    persistence.updateCall(call.callId, { queueId: vm.queueId ?? call.queueId ?? null, extensionId: vm.extensionId ?? call.extensionId ?? null });

    if (vm.callerGone) {
      finishCall(call, vm.saved ? 'VOICEMAIL_LEFT' : 'MISSED', 'CALLER_HANGUP', 'CALLER');
      return true;
    }
    // Marcó # o se acabó el tiempo: despedida y colgar
    await this.media.play(call.channelId, vm.saved ? ['sound:vm-msgsaved', 'sound:vm-goodbye'] : ['sound:vm-goodbye']);
    await this.ari.hangupChannel(call.channelId, 'normal').catch(() => {});
    finishCall(call, vm.saved ? 'VOICEMAIL_LEFT' : 'MISSED', 'NORMAL_CLEARING', 'SYSTEM');
    return true;
  }
}
