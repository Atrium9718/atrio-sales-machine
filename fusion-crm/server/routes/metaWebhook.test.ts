import { describe, it, expect } from 'vitest';
import { parseMetaWebhook } from './metaWebhook';
import { rateLimited } from './widget';

describe('webhook de Meta', () => {
  it('WhatsApp: texto, multimedia con leyenda, nombre del contacto y estados de entrega', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            contacts: [{ wa_id: '573104459921', profile: { name: 'Claudia' } }],
            messages: [
              { from: '573104459921', id: 'wamid.1', type: 'text', text: { body: 'hola' } },
              { from: '573104459921', id: 'wamid.2', type: 'image', image: { caption: 'así lo quiero' } },
              { from: '573104459921', id: 'wamid.3', type: 'audio', audio: {} },
            ],
            statuses: [
              { id: 'wamid.out1', status: 'read' },
              { id: 'wamid.out2', status: 'failed', errors: [{ title: 'Re-engagement message' }] },
              { id: 'wamid.out3', status: 'sent' },
            ],
          },
        }],
      }],
    };
    const { messages, statuses } = parseMetaWebhook(body);
    expect(messages).toEqual([
      { channel: 'whatsapp', externalUserId: '573104459921', contactName: 'Claudia', text: 'hola', externalId: 'wamid.1' },
      { channel: 'whatsapp', externalUserId: '573104459921', contactName: 'Claudia', text: '[El cliente envió una imagen: así lo quiero]', externalId: 'wamid.2' },
      { channel: 'whatsapp', externalUserId: '573104459921', contactName: 'Claudia', text: '[El cliente envió un audio]', externalId: 'wamid.3' },
    ]);
    expect(statuses).toEqual([
      { externalId: 'wamid.out1', status: 'read', error: undefined },
      { externalId: 'wamid.out2', status: 'failed', error: 'Re-engagement message' },
    ]);
  });

  it('Messenger e Instagram: ignora los ecos de nuestros propios mensajes', () => {
    const ig = parseMetaWebhook({
      object: 'instagram',
      entry: [{ messaging: [
        { sender: { id: 'ig-1' }, message: { mid: 'm1', text: 'precio de stickers?' } },
        { sender: { id: 'page' }, message: { mid: 'm2', text: 'respuesta', is_echo: true } },
      ] }],
    });
    expect(ig.messages).toEqual([{ channel: 'instagram', externalUserId: 'ig-1', contactName: null, text: 'precio de stickers?', externalId: 'm1' }]);
    const fb = parseMetaWebhook({ object: 'page', entry: [{ messaging: [{ sender: { id: 'psid-9' }, message: { mid: 'x', text: 'hola' } }] }] });
    expect(fb.messages[0].channel).toBe('messenger');
  });
});

describe('límites del chat web', () => {
  it('corta después del máximo dentro de la ventana y se recupera', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimited('prueba', 3, 1000, t0 + i)).toBe(false);
    expect(rateLimited('prueba', 3, 1000, t0 + 10)).toBe(true);
    expect(rateLimited('prueba', 3, 1000, t0 + 2000)).toBe(false);
  });
});
