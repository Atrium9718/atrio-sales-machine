/**
 * Timbrado por eventos.
 *
 * Para timbrar a alguien se crea un canal (POST /channels/create) y se marca (POST /channels/{id}/dial).
 * Ninguna de las dos respuestas dice si contestó: cuando la persona contesta, el canal entra a la
 * aplicación y llega un StasisStart; si rechaza o su teléfono no está conectado, llega un
 * ChannelDestroyed. Un grupo reúne las piernas que timbran a la vez (el navegador y el celular del
 * asesor, o todos los asesores de una cola): la primera que contesta se queda con la llamada, las
 * demás se cuelgan; si ninguna contesta a tiempo, se avisa una sola vez.
 */

export type NoAnswerReason = 'timeout' | 'rejected' | 'failed';

export interface RingGroupOptions {
  callId: string;
  timeoutSeconds: number;
  onAnswered: (legChannelId: string) => void | Promise<void>;
  onNoAnswer: (reason: NoAnswerReason) => void | Promise<void>;
}

export interface RingGroup {
  id: string;
  callId: string;
  legs: Set<string>;
  settled: boolean;
  ready: boolean;
  timer?: NodeJS.Timeout;
  options: RingGroupOptions;
}

export class RingTracker {
  private groups = new Map<string, RingGroup>();
  private groupByLeg = new Map<string, string>();
  private seq = 0;

  constructor(private readonly hangup: (channelId: string) => Promise<void>) {}

  public start(options: RingGroupOptions): RingGroup {
    const group: RingGroup = { id: `rg-${++this.seq}`, callId: options.callId, legs: new Set(), settled: false, ready: false, options };
    this.groups.set(group.id, group);
    group.timer = setTimeout(() => {
      if (group.settled) return;
      this.settle(group);
      this.hangupLegs(group);
      void options.onNoAnswer('timeout');
    }, Math.max(1, options.timeoutSeconds) * 1000);
    return group;
  }

  public addLeg(group: RingGroup, channelId: string): void {
    if (group.settled) {
      void this.hangup(channelId).catch(() => {});
      return;
    }
    group.legs.add(channelId);
    this.groupByLeg.set(channelId, group.id);
  }

  /** Ya se crearon todas las piernas: si ninguna se pudo crear, no hay a quién timbrar. */
  public ready(group: RingGroup): void {
    group.ready = true;
    if (!group.settled && group.legs.size === 0) {
      this.settle(group);
      void group.options.onNoAnswer('failed');
    }
  }

  /** StasisStart de una pierna: contestó. Devuelve true si la pierna era de un grupo. */
  public answered(channelId: string): boolean {
    const group = this.groupOf(channelId);
    if (!group) return false;
    this.groupByLeg.delete(channelId);
    group.legs.delete(channelId);
    if (group.settled) {
      // Contestó justo después de vencer el tiempo: la llamada ya siguió su camino
      void this.hangup(channelId).catch(() => {});
      return true;
    }
    this.settle(group);
    this.hangupLegs(group);
    void group.options.onAnswered(channelId);
    return true;
  }

  /** ChannelDestroyed de una pierna (rechazó, ocupado o no conectado). */
  public legGone(channelId: string): boolean {
    const group = this.groupOf(channelId);
    if (!group) return false;
    this.groupByLeg.delete(channelId);
    group.legs.delete(channelId);
    if (!group.settled && group.ready && group.legs.size === 0) {
      this.settle(group);
      void group.options.onNoAnswer('rejected');
    }
    return true;
  }

  /** Quien llamaba colgó: se cuelgan las piernas y no se avisa nada. */
  public cancel(callId: string): void {
    for (const group of this.groups.values()) {
      if (group.callId !== callId) continue;
      this.settle(group);
      this.hangupLegs(group);
    }
  }

  public isRinging(callId: string): boolean {
    for (const group of this.groups.values()) if (group.callId === callId && !group.settled) return true;
    return false;
  }

  private groupOf(channelId: string): RingGroup | undefined {
    const id = this.groupByLeg.get(channelId);
    return id ? this.groups.get(id) : undefined;
  }

  private settle(group: RingGroup) {
    group.settled = true;
    if (group.timer) clearTimeout(group.timer);
    this.groups.delete(group.id);
  }

  private hangupLegs(group: RingGroup) {
    for (const leg of group.legs) {
      this.groupByLeg.delete(leg);
      void this.hangup(leg).catch(() => {});
    }
    group.legs.clear();
  }
}
