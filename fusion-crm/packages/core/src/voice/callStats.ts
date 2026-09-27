/**
 * Indicadores del día a partir de las llamadas registradas por el puente de voz.
 * Una llamada entrante cuenta como perdida si terminó sin que nadie contestara.
 */

export interface CallRow {
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  status: string;
  disposition?: string | null;
  startedAt: Date | string;
  answeredAt?: Date | string | null;
  waitSeconds?: number | null;
  talkSeconds?: number | null;
  handledByUserId?: string | null;
}

export interface CallSummary {
  total: number;
  inbound: number;
  outbound: number;
  internal: number;
  answered: number;
  missed: number;
  voicemail: number;
  inProgress: number;
  answerRate: number | null;
  avgWaitSeconds: number | null;
  avgTalkSeconds: number | null;
  totalTalkSeconds: number;
  byHour: { hour: number; inbound: number; outbound: number; missed: number }[];
}

const ENDED = new Set(['COMPLETED', 'ABANDONED', 'FAILED', 'REJECTED', 'NO_ANSWER', 'BUSY']);
const MISSED = new Set(['MISSED', 'ABANDONED_IN_QUEUE']);

export const isMissedCall = (c: Pick<CallRow, 'direction' | 'status' | 'disposition' | 'answeredAt'>) =>
  c.direction === 'INBOUND' &&
  (MISSED.has(String(c.disposition)) || (!c.disposition && ENDED.has(c.status) && !c.answeredAt && c.status !== 'COMPLETED') || c.status === 'ABANDONED' || c.status === 'NO_ANSWER');

export const isAnsweredCall = (c: Pick<CallRow, 'disposition' | 'answeredAt'>) => c.disposition === 'ANSWERED' || (!c.disposition && Boolean(c.answeredAt));

/** Hora local de Bogotá (UTC−5, sin horario de verano). */
export const bogotaHour = (d: Date | string) => (new Date(d).getUTCHours() + 24 - 5) % 24;

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function summarizeCalls(calls: CallRow[]): CallSummary {
  const byHour = new Map<number, { hour: number; inbound: number; outbound: number; missed: number }>();
  let inbound = 0, outbound = 0, internal = 0, answered = 0, missed = 0, voicemail = 0, inProgress = 0, totalTalk = 0;
  const waits: number[] = [];
  const talks: number[] = [];
  for (const c of calls) {
    if (c.direction === 'INBOUND') inbound++;
    else if (c.direction === 'OUTBOUND') outbound++;
    else internal++;
    if (!ENDED.has(c.status)) inProgress++;
    const wasMissed = isMissedCall(c);
    if (wasMissed) missed++;
    if (c.disposition === 'VOICEMAIL_LEFT') voicemail++;
    if (isAnsweredCall(c)) {
      answered++;
      if (c.direction === 'INBOUND' && c.waitSeconds != null) waits.push(Number(c.waitSeconds));
      if (c.talkSeconds) {
        talks.push(Number(c.talkSeconds));
        totalTalk += Number(c.talkSeconds);
      }
    }
    if (c.direction !== 'INTERNAL') {
      const h = bogotaHour(c.startedAt);
      const slot = byHour.get(h) ?? { hour: h, inbound: 0, outbound: 0, missed: 0 };
      if (c.direction === 'INBOUND') slot.inbound++;
      else slot.outbound++;
      if (wasMissed) slot.missed++;
      byHour.set(h, slot);
    }
  }
  const inboundEnded = calls.filter((c) => c.direction === 'INBOUND' && ENDED.has(c.status));
  const inboundAnswered = inboundEnded.filter((c) => isAnsweredCall(c)).length;
  return {
    total: calls.length,
    inbound,
    outbound,
    internal,
    answered,
    missed,
    voicemail,
    inProgress,
    answerRate: inboundEnded.length ? Math.round((inboundAnswered / inboundEnded.length) * 100) : null,
    avgWaitSeconds: avg(waits),
    avgTalkSeconds: avg(talks),
    totalTalkSeconds: totalTalk,
    byHour: [...byHour.values()].sort((a, b) => a.hour - b.hour),
  };
}

/** Inicio del día de hoy en Bogotá, en UTC. */
export function startOfBogotaDay(now = new Date()): Date {
  const local = new Date(now.getTime() - 5 * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 5));
}

/**
 * Llamadas perdidas que siguen sin devolver: se quitan cuando después hubo una llamada
 * contestada con ese mismo número (se le devolvió o volvió a llamar y lo atendieron).
 * Una sola por número (la más reciente).
 */
export function pendingCallbacks<T extends CallRow & { fromNumber: string; toNumber: string }>(calls: T[]): T[] {
  const other = (c: T) => (c.direction === 'OUTBOUND' ? c.toNumber : c.fromNumber);
  const lastAnswered = new Map<string, number>();
  for (const c of calls) {
    if (c.direction === 'INTERNAL' || !isAnsweredCall(c)) continue;
    const t = new Date(c.startedAt).getTime();
    const key = other(c);
    if (t > (lastAnswered.get(key) ?? -Infinity)) lastAnswered.set(key, t);
  }
  const seen = new Set<string>();
  return calls
    .filter((c) => isMissedCall(c))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .filter((c) => {
      const key = other(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return !(lastAnswered.get(key)! > new Date(c.startedAt).getTime());
    });
}
