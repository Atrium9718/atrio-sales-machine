/**
 * Reproducciones sobre un canal (locuciones, menús, avisos de la cola).
 *
 * ARI responde al POST /channels/{id}/play apenas empieza a sonar; el final llega después como
 * evento PlaybackFinished. Aquí cada reproducción tiene un id propio y una promesa `done` que se
 * cumple cuando termina, cuando se detiene (alguien marcó una opción) o cuando el canal se cae.
 */

export type PlaybackEnd = 'finished' | 'stopped' | 'error';

export interface MediaAri {
  play(channelId: string, media: string[], playbackId?: string): Promise<{ id: string }>;
  stopPlayback(playbackId: string): Promise<void>;
}

interface Pending {
  channelId: string;
  resolve: (end: PlaybackEnd) => void;
  timer: NodeJS.Timeout;
  stopped: boolean;
}

export class MediaController {
  private pending = new Map<string, Pending>();
  private seq = 0;

  /** maxMs: si Asterisk nunca avisa el final, se da por terminada (evita llamadas colgadas). */
  constructor(private readonly ari: MediaAri, private readonly maxMs = 180_000) {}

  public start(channelId: string, media: string[]): { id: string; done: Promise<PlaybackEnd> } {
    const id = `pb-${channelId}-${++this.seq}`;
    const done = new Promise<PlaybackEnd>((resolve) => {
      const timer = setTimeout(() => this.settle(id, 'finished'), this.maxMs);
      this.pending.set(id, { channelId, resolve, timer, stopped: false });
    });
    this.ari.play(channelId, media, id).catch(() => this.settle(id, 'error'));
    return { id, done };
  }

  /** Reproduce y espera a que termine. */
  public play(channelId: string, media: string[]): Promise<PlaybackEnd> {
    return this.start(channelId, media).done;
  }

  public async stop(playbackId: string): Promise<void> {
    const p = this.pending.get(playbackId);
    if (!p) return;
    p.stopped = true;
    try {
      await this.ari.stopPlayback(playbackId);
    } catch {
      // Ya había terminado
    }
    this.settle(playbackId, 'stopped');
  }

  /** Detiene todo lo que suena en el canal (p. ej. al pasar la llamada a un asesor). */
  public async stopChannel(channelId: string): Promise<void> {
    const ids = [...this.pending.entries()].filter(([, p]) => p.channelId === channelId).map(([id]) => id);
    await Promise.all(ids.map((id) => this.stop(id)));
  }

  /** Evento PlaybackFinished de ARI. Devuelve true si la reproducción era nuestra. */
  public finished(playbackId: string): boolean {
    const p = this.pending.get(playbackId);
    if (!p) return false;
    this.settle(playbackId, p.stopped ? 'stopped' : 'finished');
    return true;
  }

  /** El canal se colgó: lo pendiente termina ya. */
  public channelGone(channelId: string): void {
    for (const [id, p] of this.pending) if (p.channelId === channelId) this.settle(id, 'stopped');
  }

  public isPlaying(channelId: string): boolean {
    for (const p of this.pending.values()) if (p.channelId === channelId) return true;
    return false;
  }

  private settle(id: string, end: PlaybackEnd) {
    const p = this.pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(id);
    p.resolve(end);
  }
}
