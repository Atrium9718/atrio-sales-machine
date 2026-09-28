import { describe, it, expect } from 'vitest';
import { summarizeCalls, startOfBogotaDay, isMissedCall, pendingCallbacks } from './callStats';

describe('indicadores de llamadas del día', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 8, 27, h + 5, 10));
  it('cuenta contestadas, perdidas, buzón y en curso, con promedios', () => {
    const s = summarizeCalls([
      { direction: 'INBOUND', status: 'COMPLETED', disposition: 'ANSWERED', startedAt: at(9), answeredAt: at(9), waitSeconds: 10, talkSeconds: 120 },
      { direction: 'INBOUND', status: 'COMPLETED', disposition: 'ANSWERED', startedAt: at(9), answeredAt: at(9), waitSeconds: 30, talkSeconds: 60 },
      { direction: 'INBOUND', status: 'COMPLETED', disposition: 'MISSED', startedAt: at(10) },
      { direction: 'INBOUND', status: 'COMPLETED', disposition: 'VOICEMAIL_LEFT', startedAt: at(12) },
      { direction: 'OUTBOUND', status: 'COMPLETED', disposition: 'ANSWERED', startedAt: at(10), answeredAt: at(10), talkSeconds: 300 },
      { direction: 'INBOUND', status: 'CONNECTED', startedAt: at(14), answeredAt: at(14) },
      { direction: 'INTERNAL', status: 'COMPLETED', disposition: 'ANSWERED', startedAt: at(11), answeredAt: at(11), talkSeconds: 20 },
    ]);
    expect(s).toMatchObject({ total: 7, inbound: 5, outbound: 1, internal: 1, missed: 1, voicemail: 1, inProgress: 1 });
    expect(s.answerRate).toBe(50); // 2 de 4 entrantes terminadas
    expect(s.avgWaitSeconds).toBe(20);
    expect(s.avgTalkSeconds).toBe(125);
    expect(s.byHour.find((h) => h.hour === 10)).toEqual({ hour: 10, inbound: 1, outbound: 1, missed: 1 });
  });

  it('entrante que terminó sin contestar es perdida; saliente no', () => {
    expect(isMissedCall({ direction: 'INBOUND', status: 'NO_ANSWER', disposition: null, answeredAt: null })).toBe(true);
    expect(isMissedCall({ direction: 'OUTBOUND', status: 'NO_ANSWER', disposition: null, answeredAt: null })).toBe(false);
    expect(summarizeCalls([]).answerRate).toBeNull();
  });

  it('el día empieza a medianoche de Bogotá', () => {
    expect(startOfBogotaDay(new Date('2026-09-27T03:00:00Z')).toISOString()).toBe('2026-09-26T05:00:00.000Z');
    expect(startOfBogotaDay(new Date('2026-09-27T15:00:00Z')).toISOString()).toBe('2026-09-27T05:00:00.000Z');
  });

  it('por devolver: una por número y sale cuando se le devuelve', () => {
    const t = (m: number) => new Date(Date.UTC(2026, 8, 27, 15, m));
    const calls = [
      { id: 'a', direction: 'INBOUND', status: 'COMPLETED', disposition: 'MISSED', startedAt: t(0), fromNumber: '+57300', toNumber: '+57606' },
      { id: 'b', direction: 'INBOUND', status: 'COMPLETED', disposition: 'MISSED', startedAt: t(5), fromNumber: '+57300', toNumber: '+57606' },
      { id: 'c', direction: 'INBOUND', status: 'COMPLETED', disposition: 'MISSED', startedAt: t(10), fromNumber: '+57311', toNumber: '+57606' },
      { id: 'd', direction: 'OUTBOUND', status: 'COMPLETED', disposition: 'ANSWERED', answeredAt: t(20), startedAt: t(20), fromNumber: '+57606', toNumber: '+57311' },
    ] as any[];
    expect(pendingCallbacks(calls).map((c) => c.id)).toEqual(['b']);
  });
});
