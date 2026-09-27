import { describe, it, expect, afterEach } from 'vitest';
import { createMetaSender } from './senders';

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

function fakeFetch(status: number, body: any) {
  const calls: { url: string; init: any }[] = [];
  const fn = async (url: string, init: any) => {
    calls.push({ url, init });
    return { ok: status < 300, status, json: async () => body };
  };
  return Object.assign(fn, { calls });
}

describe('envío a Meta', () => {
  it('WhatsApp: usa el número configurado y devuelve el id del mensaje', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
    const f = fakeFetch(200, { messages: [{ id: 'wamid.ABC' }] });
    const r = await createMetaSender(f as any).sendText('whatsapp', '573104459921', 'Hola');
    expect(r).toEqual({ ok: true, externalId: 'wamid.ABC' });
    expect(f.calls[0].url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
    expect(f.calls[0].init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(f.calls[0].init.body)).toMatchObject({ messaging_product: 'whatsapp', to: '573104459921', type: 'text', text: { body: 'Hola' } });
  });

  it('explica el error de la ventana de 24 h', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1';
    process.env.WHATSAPP_ACCESS_TOKEN = 't';
    const f = fakeFetch(400, { error: { code: 131047, message: 'Re-engagement message' } });
    const r = await createMetaSender(f as any).sendText('whatsapp', '57300', 'x');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('plantilla aprobada');
  });

  it('Messenger/Instagram: Send API de la página', async () => {
    process.env.MESSENGER_PAGE_ACCESS_TOKEN = 'page';
    const f = fakeFetch(200, { message_id: 'm_1' });
    const r = await createMetaSender(f as any).sendText('instagram', 'ig-1', 'Hola');
    expect(r).toEqual({ ok: true, externalId: 'm_1' });
    expect(f.calls[0].url).toBe('https://graph.facebook.com/v21.0/me/messages');
    expect(JSON.parse(f.calls[0].init.body)).toMatchObject({ recipient: { id: 'ig-1' }, message: { text: 'Hola' } });
  });

  it('sin configuración no intenta enviar y lo dice', async () => {
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const f = fakeFetch(200, {});
    const r = await createMetaSender(f as any).sendText('whatsapp', '57300', 'x');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('no está configurado');
    expect(f.calls).toHaveLength(0);
  });

  it('plantilla de WhatsApp con variables', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1';
    process.env.WHATSAPP_ACCESS_TOKEN = 't';
    const f = fakeFetch(200, { messages: [{ id: 'wamid.T' }] });
    await createMetaSender(f as any).sendTemplate('whatsapp', '57300', { name: 'pedido_en_produccion', language: 'es_CO', bodyParams: ['Claudia', 'OT-1203'] });
    expect(JSON.parse(f.calls[0].init.body).template).toEqual({
      name: 'pedido_en_produccion',
      language: { code: 'es_CO' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Claudia' }, { type: 'text', text: 'OT-1203' }] }],
    });
  });
});
