import { describe, it, expect } from 'vitest';
import {
  clientPhones,
  matchClientByPhone,
  matchClientByNit,
  extractOrderNumbers,
  extractNits,
  handoffTrigger,
  withinCustomerWindow,
  isWithinBusinessHours,
  canAutoSend,
  appendMessage,
  MAX_STORED_MESSAGES,
  DEFAULT_OMNICHANNEL_CONFIG,
} from './index';

const clients = [
  { id: 'c1', name: 'Pintuco S.A.S', nit: '900.123.456-1', phone: '310 445 9921', contacts: [{ name: 'Claudia', mobile: '+57 300 111 2233' }] },
  { id: 'c2', name: 'Papelería Dos', nit: '800555444', phone: '6041234567' },
  { id: 'c3', name: 'Duplicado', nit: '111', whatsapp: '3001112233' },
];

describe('identificación del cliente', () => {
  it('reúne teléfonos propios y de contactos, normalizados', () => {
    expect(clientPhones(clients[0]).sort()).toEqual(['+573001112233', '+573104459921']);
  });

  it('reconoce el número de WhatsApp (formato 57…) solo si pertenece a un único cliente', () => {
    expect(matchClientByPhone(clients, '573104459921')?.id).toBe('c1');
    // 3001112233 está en dos clientes: no se adivina
    expect(matchClientByPhone(clients, '573001112233')).toBeNull();
    expect(matchClientByPhone(clients, '573999999999')).toBeNull();
  });

  it('reconoce NIT escrito de cualquier forma', () => {
    expect(extractNits('mi nit es 900.123.456-1')).toContain('900123456');
    expect(matchClientByNit(clients, 'NIT 900123456')?.id).toBe('c1');
    expect(matchClientByNit(clients, 'no tengo nit')).toBeNull();
  });

  it('extrae números de pedido', () => {
    expect(extractOrderNumbers('cómo va la OT-1234?')).toEqual(['1234']);
    expect(extractOrderNumbers('mi pedido #77 y la cotización 88')).toEqual(expect.arrayContaining(['77', '88']));
  });
});

describe('reglas de atención', () => {
  it('pasa a humano ante pedido explícito, queja o pago', () => {
    expect(handoffTrigger('quiero hablar con un asesor')?.intent).toBe('humano');
    expect(handoffTrigger('esto es pésimo, quiero un reembolso')?.intent).toBe('queja');
    expect(handoffTrigger('ya hice la transferencia del anticipo')?.intent).toBe('pago');
    expect(handoffTrigger('hola, cómo va mi pedido?')).toBeNull();
  });

  it('detecta clientes molestos o pedidos con problemas aunque no digan "queja"', () => {
    for (const t of [
      'Estoy muy molesto, el pedido llegó dañado y nadie me responde',
      'las cajas llegaron rotas',
      'me llegó incompleto el pedido',
      'estoy decepcionada con el trabajo',
      'quiero cancelar mi pedido',
      'no me contestan hace dos días',
      'eso quedó mal hecho, necesito la garantía',
    ]) {
      expect(handoffTrigger(t)?.intent, t).toBe('queja');
    }
    // Sin falsos positivos en consultas normales
    for (const t of ['¿cuándo llega mi pedido?', 'necesito 500 cajas', 'el diseño me llegó al correo, gracias', 'buenas tardes']) {
      expect(handoffTrigger(t), t).toBeNull();
    }
  });

  it('respeta la ventana de 24 h de WhatsApp', () => {
    const now = Date.parse('2026-09-27T12:00:00Z');
    expect(withinCustomerWindow({ channel: 'whatsapp', lastInboundAt: '2026-09-27T01:00:00Z' }, now)).toBe(true);
    expect(withinCustomerWindow({ channel: 'whatsapp', lastInboundAt: '2026-09-25T12:00:00Z' }, now)).toBe(false);
    expect(withinCustomerWindow({ channel: 'webchat', lastInboundAt: null }, now)).toBe(true);
  });

  it('calcula el horario de atención en hora de Colombia', () => {
    const hours = DEFAULT_OMNICHANNEL_CONFIG.businessHours;
    expect(isWithinBusinessHours(hours, new Date('2026-09-28T14:00:00Z'))).toBe(true); // lunes 9:00 Bogotá
    expect(isWithinBusinessHours(hours, new Date('2026-09-28T02:00:00Z'))).toBe(false); // domingo 21:00 Bogotá
    expect(isWithinBusinessHours(hours, new Date('2026-09-27T15:00:00Z'))).toBe(false); // domingo
  });

  it('solo envía solo en modo automático y para las intenciones permitidas', () => {
    expect(canAutoSend({ ...DEFAULT_OMNICHANNEL_CONFIG, aiMode: 'suggest' }, 'estado_pedido')).toBe(false);
    expect(canAutoSend({ ...DEFAULT_OMNICHANNEL_CONFIG, aiMode: 'auto' }, 'cotizacion')).toBe(true);
    expect(canAutoSend({ ...DEFAULT_OMNICHANNEL_CONFIG, aiMode: 'auto', autoIntents: ['estado_pedido'] }, 'cotizacion')).toBe(false);
  });

  it('limita el historial guardado', () => {
    let msgs: any[] = [];
    for (let i = 0; i < MAX_STORED_MESSAGES + 5; i++) msgs = appendMessage(msgs, { id: String(i) } as any);
    expect(msgs).toHaveLength(MAX_STORED_MESSAGES);
    expect(msgs[0].id).toBe('5');
  });
});

import { classifyIntent } from './index';
describe('recepcionista (intención)', () => {
  it('reconoce estado de pedido, cotización y saludo', () => {
    expect(classifyIntent('Buenas, ¿cómo va mi pedido?')).toBe('estado_pedido');
    expect(classifyIntent('ya está listo lo de la OT-1203?')).toBe('estado_pedido');
    expect(classifyIntent('cuánto cuestan 1000 volantes a color')).toBe('cotizacion');
    expect(classifyIntent('necesito imprimir unas cajas')).toBe('cotizacion');
    expect(classifyIntent('Hola buenos días')).toBe('saludo');
    expect(classifyIntent('ustedes dónde quedan?')).toBe('otro');
  });
});
