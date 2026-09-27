import { describe, it, expect } from 'vitest';
import { formatDuration, formatPhone, callOutcome, counterpart } from './callFormat';

describe('formatos de llamadas', () => {
  it('duración legible', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(723)).toBe('12:03');
    expect(formatDuration(3730)).toBe('1:02:10');
    expect(formatDuration(null)).toBe('0:00');
  });

  it('teléfonos colombianos', () => {
    expect(formatPhone('+573001234567')).toBe('300 123 4567');
    expect(formatPhone('+576068801234')).toBe('(606) 880 1234');
    expect(formatPhone('101')).toBe('101');
    expect(formatPhone('')).toBe('Desconocido');
  });

  it('resultado en palabras', () => {
    expect(callOutcome({ status: 'COMPLETED', disposition: 'MISSED', missed: true, answeredAt: null })).toEqual({ label: 'Perdida', tone: 'bad' });
    expect(callOutcome({ status: 'COMPLETED', disposition: 'ANSWERED', missed: false, answeredAt: 'x' }).label).toBe('Contestada');
    expect(callOutcome({ status: 'CONNECTED', disposition: null, missed: false, answeredAt: 'x' }).label).toBe('En curso');
    expect(callOutcome({ status: 'BUSY', disposition: null, missed: false, answeredAt: null }).label).toBe('Ocupado');
  });

  it('el otro lado de la llamada', () => {
    expect(counterpart({ direction: 'INBOUND', fromNumber: '+573001', toNumber: '+57606' })).toBe('+573001');
    expect(counterpart({ direction: 'OUTBOUND', fromNumber: '+57606', toNumber: '+573001' })).toBe('+573001');
  });
});
