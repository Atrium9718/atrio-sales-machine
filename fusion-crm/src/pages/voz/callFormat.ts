/** Textos y formatos de llamadas para las pantallas de voz. */

export interface CallListItem {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  status: string;
  disposition: string | null;
  missed: boolean;
  fromNumber: string;
  toNumber: string;
  customerId: string | null;
  customerName: string | null;
  handledByUserId: string | null;
  handledByName: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  waitSeconds: number;
  talkSeconds: number;
  totalSeconds: number;
  hangupBy?: string;
  hangupCause?: string | null;
  recordingId?: string | null;
  notes?: string | null;
}

/** 0:45, 12:03, 1:02:10 */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** +573001234567 → 300 123 4567 · +576068801234 → (606) 880 1234 */
export function formatPhone(e164: string | null | undefined): string {
  const raw = String(e164 || '');
  const d = raw.replace(/\D/g, '');
  const national = d.startsWith('57') && d.length === 12 ? d.slice(2) : d;
  if (national.length === 10 && national.startsWith('3')) return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  if (national.length === 10 && national.startsWith('60')) return `(${national.slice(0, 3)}) ${national.slice(3, 6)} ${national.slice(6)}`;
  return raw || 'Desconocido';
}

/** El otro lado de la llamada: quien llamó (entrante) o a quién se llamó (saliente). */
export const counterpart = (c: Pick<CallListItem, 'direction' | 'fromNumber' | 'toNumber'>) => (c.direction === 'OUTBOUND' ? c.toNumber : c.fromNumber);

export const DIRECTION_LABEL: Record<string, string> = { INBOUND: 'Entrante', OUTBOUND: 'Saliente', INTERNAL: 'Interna' };

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

/** Resultado de la llamada en palabras, con su tono. */
export function callOutcome(c: Pick<CallListItem, 'status' | 'disposition' | 'missed' | 'answeredAt'>): { label: string; tone: Tone } {
  if (c.missed) return { label: 'Perdida', tone: 'bad' };
  switch (c.disposition) {
    case 'ANSWERED':
      return { label: 'Contestada', tone: 'ok' };
    case 'VOICEMAIL_LEFT':
      return { label: 'Dejó mensaje', tone: 'warn' };
    case 'HANDLED_BY_AI':
      return { label: 'Atendida por IA', tone: 'info' };
    case 'FAILED':
      return { label: 'Falló', tone: 'bad' };
    case 'CANCELLED':
      return { label: 'Cancelada', tone: 'muted' };
  }
  const live: Record<string, string> = { RINGING: 'Timbrando', IN_IVR: 'En el menú', IN_QUEUE: 'En espera', IN_AI: 'Con la IA', CONNECTED: 'En curso', ON_HOLD: 'En espera (pausa)', TRANSFERRING: 'Transfiriendo', VOICEMAIL: 'Dejando mensaje' };
  if (live[c.status]) return { label: live[c.status], tone: 'info' };
  if (c.status === 'BUSY') return { label: 'Ocupado', tone: 'warn' };
  if (c.status === 'NO_ANSWER' || c.status === 'REJECTED') return { label: 'Sin respuesta', tone: 'warn' };
  if (c.status === 'FAILED') return { label: 'Falló', tone: 'bad' };
  return c.answeredAt ? { label: 'Contestada', tone: 'ok' } : { label: 'Terminada', tone: 'muted' };
}

export const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  bad: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  muted: 'bg-muted text-muted-foreground',
};

export const EVENT_LABEL: Record<string, string> = {
  CREATED: 'Llamada registrada',
  RINGING: 'Timbrando',
  ANSWERED: 'Contestada',
  IVR_ENTERED: 'Entró al menú de opciones',
  IVR_OPTION: 'Eligió una opción',
  QUEUE_ENTERED: 'Entró a la cola',
  QUEUE_ANNOUNCE: 'Anuncio de posición',
  AGENT_RINGING: 'Timbrando al asesor',
  AGENT_ANSWERED: 'El asesor contestó',
  AGENT_NO_ANSWER: 'El asesor no contestó',
  BRIDGED: 'Conectados',
  HOLD: 'En espera',
  UNHOLD: 'Retomada',
  TRANSFER_BLIND: 'Transferida',
  TRANSFER_ATTENDED: 'Transferida (consultada)',
  AI_STARTED: 'Atiende el agente de IA',
  RECORDING_STARTED: 'Empezó la grabación',
  RECORDING_STOPPED: 'Terminó la grabación',
  VOICEMAIL_STARTED: 'Dejando mensaje',
  HANGUP: 'Colgó',
  COMPLETED: 'Terminó',
  FAILED: 'Falló',
};

export const HANGUP_BY_LABEL: Record<string, string> = { CALLER: 'el cliente', AGENT: 'el asesor', SYSTEM: 'el sistema' };

export const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : '—';

/** Lee la respuesta de la API de voz; si falta la base de datos, lo dice en claro. */
export async function voiceApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}
