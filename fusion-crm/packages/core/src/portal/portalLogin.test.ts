import { describe, it, expect } from 'vitest';
import { checkLoginCode, createRateLimiter, findClientsByDocument, loginEmails, loginPhones, maskEmail, maskPhone, type LoginChallenge } from './portalLogin';

const clients = [
  { id: 'c1', name: 'Acme SAS', nit: '900.123.456-7', phone1: '606 885 1234', email: 'Compras@Acme.co; gerencia@acme.co', contacts: [{ name: 'Ana', mobile: '310 555 1234' }] },
  { id: 'c2', name: 'Pedro Pérez', doc: '1053777888', phone: '3001112233' },
];

const challenge = (over: Partial<LoginChallenge> = {}): LoginChallenge => ({
  id: 'x', document: '900123456', clientName: 'Acme', clientNit: '900123456-7', codeHash: 'ok', channel: 'whatsapp',
  destination: '', attempts: 0, expiresAt: new Date(Date.now() + 60_000).toISOString(), usedAt: null, createdAt: '', ...over,
});

describe('ingreso al portal con documento', () => {
  it('encuentra al cliente por NIT (con o sin dígito de verificación) o cédula', () => {
    expect(findClientsByDocument(clients, '900123456-7').map((c) => c.id)).toEqual(['c1']);
    expect(findClientsByDocument(clients, '900123456').map((c) => c.id)).toEqual(['c1']);
    expect(findClientsByDocument(clients, '1.053.777.888').map((c) => c.id)).toEqual(['c2']);
    expect(findClientsByDocument(clients, '123')).toEqual([]);
  });

  it('solo usa celulares para WhatsApp y separa varios correos', () => {
    expect(loginPhones([clients[0]])).toEqual(['+573105551234']);
    expect(loginEmails([clients[0]])).toEqual(['compras@acme.co', 'gerencia@acme.co']);
    expect(maskPhone('+573105551234')).toBe('celular terminado en 1234');
    expect(maskEmail('compras@acme.co')).toBe('co•••••@acme.co');
  });

  it('valida el código: correcto, incorrecto, vencido, usado y demasiados intentos', () => {
    expect(checkLoginCode(challenge(), 'ok')).toEqual({ ok: true });
    expect(checkLoginCode(challenge(), 'mal')).toMatchObject({ ok: false, error: expect.stringContaining('4 intentos') });
    expect(checkLoginCode(challenge({ attempts: 4 }), 'mal')).toMatchObject({ ok: false, locked: true });
    expect(checkLoginCode(challenge({ attempts: 5 }), 'ok')).toMatchObject({ ok: false, locked: true });
    expect(checkLoginCode(challenge({ expiresAt: new Date(Date.now() - 1).toISOString() }), 'ok')).toMatchObject({ ok: false, locked: true });
    expect(checkLoginCode(challenge({ usedAt: new Date().toISOString() }), 'ok')).toMatchObject({ ok: false, locked: true });
    expect(checkLoginCode(null, 'ok')).toMatchObject({ ok: false });
  });

  it('limita los envíos por ventana de tiempo', () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow('a', 0), allow('a', 10), allow('a', 20), allow('b', 20), allow('a', 1500)]).toEqual([true, true, false, true, true]);
  });
});
