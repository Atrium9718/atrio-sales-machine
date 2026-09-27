import { describe, it, expect } from 'vitest';
import { describeIntegrations, testIntegration } from './integrations';

const env = {
  DATA_BACKEND: 'postgres',
  DATABASE_URL: 'postgresql://postgres:supersecreta@postgres:5432/fusion_crm?schema=public',
  GEMINI_API_KEY: 'AIzaSyEXAMPLEKEY1234',
  WHATSAPP_PHONE_NUMBER_ID: '1234567',
  WHATSAPP_ACCESS_TOKEN: 'EAAGsecrettoken9876',
};

const deps = (fetchImpl: any) => ({ env, fetch: fetchImpl, pingDatabase: async () => 'Postgres responde', pingFirebase: async () => 'ok', now: () => 0 });

describe('integraciones', () => {
  it('nunca expone credenciales completas', () => {
    const list = describeIntegrations(env);
    const json = JSON.stringify(list);
    expect(json).not.toContain('supersecreta');
    expect(json).not.toContain('EAAGsecrettoken9876');
    expect(json).not.toContain('AIzaSyEXAMPLEKEY1234');
    expect(json).toContain('…9876');
    expect(list.find((i) => i.id === 'whatsapp')?.configured).toBe(true);
    expect(list.find((i) => i.id === 'messenger')?.configured).toBe(false);
  });

  it('prueba WhatsApp con la API de Meta y explica un token vencido', async () => {
    const ok = await testIntegration('whatsapp', deps(async (url: string, init: any) => {
      expect(url).toContain('/1234567?fields=');
      expect(init.headers.Authorization).toBe('Bearer EAAGsecrettoken9876');
      return { ok: true, status: 200, json: async () => ({ verified_name: 'Fusión', display_phone_number: '+57 300 000 0000', quality_rating: 'GREEN' }) };
    }));
    expect(ok).toMatchObject({ ok: true, message: 'Conectado: Fusión +57 300 000 0000 · calidad GREEN' });
    const expired = await testIntegration('whatsapp', deps(async () => ({ ok: false, status: 401, json: async () => ({ error: { code: 190, message: 'Session expired' } }) })));
    expect(expired.ok).toBe(false);
    expect(expired.message).toContain('venció');
  });

  it('errores de red y conexiones sin prueba', async () => {
    const r = await testIntegration('gemini', deps(async () => { throw new Error('getaddrinfo ENOTFOUND'); }));
    expect(r).toMatchObject({ ok: false, message: 'getaddrinfo ENOTFOUND' });
    expect((await testIntegration('webchat', deps(async () => null))).ok).toBe(false);
    expect((await testIntegration('database', deps(async () => null))).message).toBe('Postgres responde');
  });
});
