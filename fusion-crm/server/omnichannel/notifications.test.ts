import { describe, it, expect, vi } from 'vitest';
import { createMemoryRepository } from '../repositories/documentStore';
import { createOmnichannelService } from './service';
import { createStageNotifier, type StageNotice } from './notifications';
import type { ChannelSender } from './senders';
import { DEFAULT_OMNICHANNEL_CONFIG, nextSendTime, optOutIntent, type Conversation, type OmnichannelConfig } from '../../packages/core/src/omnichannel';

const clients = [
  { id: 'c1', name: 'Pintuco S.A.S', nit: '900.123.456-1', phone: '6044441234', contacts: [{ name: 'Claudia Pérez', mobile: '310 445 9921' }] },
  { id: 'c2', name: 'Sin Celular Ltda', nit: '800555444', phone: '6041112233' },
];
const quotes = [
  { id: 'q1', clientName: 'Pintuco S.A.S', clientNit: '900123456-1', clientData: { contactName: 'Claudia Pérez' } },
  { id: 'q2', clientName: 'Sin Celular Ltda', clientNit: '800555444' },
];
const projects = [
  { id: 'p1', number: 'OT-1203', quoteId: 'q1', stageId: '3' },
  { id: 'p2', number: 'OT-1300', quoteId: 'q2', stageId: '3' },
];

// Lunes 28 de septiembre de 2026, 10:00 a. m. en Bogotá
const DAY = new Date('2026-09-28T15:00:00Z');
const NIGHT = new Date('2026-09-29T03:00:00Z'); // 10:00 p. m. del lunes en Bogotá

function setup(opts: { now?: Date; config?: Partial<OmnichannelConfig>; senderFails?: string | null } = {}) {
  let now = opts.now ?? DAY;
  const clock = { set: (d: Date) => (now = d) };
  const config: OmnichannelConfig = {
    ...DEFAULT_OMNICHANNEL_CONFIG,
    ...opts.config,
    notifications: { ...DEFAULT_OMNICHANNEL_CONFIG.notifications, enabled: true, ...(opts.config?.notifications ?? {}) },
  };
  const sent: { kind: 'text' | 'template'; to: string; payload: any }[] = [];
  let failure = opts.senderFails ?? null;
  const sender: ChannelSender = {
    isConfigured: () => true,
    async sendText(_c, to, text) {
      if (failure) return { ok: false, error: failure };
      sent.push({ kind: 'text', to, payload: text });
      return { ok: true, externalId: `wamid.t${sent.length}` };
    },
    async sendTemplate(_c, to, template) {
      if (failure) return { ok: false, error: failure };
      sent.push({ kind: 'template', to, payload: template });
      return { ok: true, externalId: `wamid.p${sent.length}` };
    },
  };
  const conversations = createMemoryRepository<Conversation>();
  const service = createOmnichannelService({
    conversations,
    loadConfig: async () => config,
    sender,
    agentDeps: () => null,
    publish: () => undefined,
    now: () => now,
  });
  const notices = createMemoryRepository<StageNotice>();
  const createPortalLink = vi.fn(async () => '/portal/tok123');
  const notifier = createStageNotifier({
    notices,
    loadConfig: async () => config,
    listClients: async () => clients,
    listProjects: async () => projects,
    listQuotes: async () => quotes,
    service,
    sender,
    createPortalLink,
    appUrl: 'https://app.fusion.test',
    now: () => now,
  });
  return { notifier, service, sent, notices, clock, createPortalLink, setFailure: (f: string | null) => (failure = f) };
}

describe('avisos de cambio de etapa', () => {
  it('sin conversación reciente usa la plantilla aprobada con nombre, pedido, etapa y enlace', async () => {
    const { notifier, sent, service } = setup();
    const n = await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' });
    expect(n).toMatchObject({ status: 'sent', mode: 'template', phone: '573104459921', stageKey: 'EN_PRODUCCION' });
    expect(sent).toEqual([
      {
        kind: 'template',
        to: '573104459921',
        payload: { name: 'actualizacion_pedido', language: 'es', bodyParams: ['Claudia', 'OT-1203', 'En producción', 'https://app.fusion.test/portal/tok123'] },
      },
    ]);
    // Queda en la bandeja, con el cliente reconocido
    const conv = await service.get('whatsapp_573104459921');
    expect(conv).toMatchObject({ verified: true, clientName: 'Pintuco S.A.S', portalPath: '/portal/tok123' });
    expect(conv!.messages.at(-1)).toMatchObject({ author: 'system', aiAgent: 'seguimiento', status: 'sent' });
  });

  it('si el cliente escribió en las últimas 24 h, envía texto libre', async () => {
    const { notifier, sent, service } = setup();
    await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'hola' });
    const n = await notifier.onStageChanged({ projectId: 'p1', fromStage: '4', toStage: '5' });
    expect(n?.mode).toBe('text');
    expect(sent.at(-1)!.payload).toContain('Tu pedido OT-1203');
    expect(sent.at(-1)!.payload).toContain('Listo para entrega');
  });

  it('solo avisa las etapas configuradas, una vez por etapa y no en retrocesos', async () => {
    const { notifier, sent } = setup();
    expect(await notifier.onStageChanged({ projectId: 'p1', fromStage: '1', toStage: '2' })).toBeNull(); // "Programado" no está activo
    await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' });
    await notifier.onStageChanged({ projectId: 'p1', fromStage: '3', toStage: '2' }); // corrección hacia atrás
    await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' }); // vuelve a producción
    expect(sent).toHaveLength(1);
  });

  it('de noche deja el aviso en cola y lo envía al abrir la franja', async () => {
    const { notifier, sent, clock } = setup({ now: NIGHT });
    const n = await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' });
    expect(n).toMatchObject({ status: 'scheduled' });
    expect(new Date(n!.dueAt).toISOString()).toBe('2026-09-29T12:30:00.000Z'); // 7:30 a. m. Bogotá
    expect(await notifier.processDue()).toBe(0);
    clock.set(new Date('2026-09-29T12:31:00Z'));
    expect(await notifier.processDue()).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it('reintenta los fallos y, tras 3 intentos, lo marca como fallido', async () => {
    const { notifier, clock, notices, setFailure, sent } = setup({ senderFails: 'Sin conexión con Meta' });
    let n = (await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' }))!;
    expect(n).toMatchObject({ status: 'scheduled', attempts: 1, reason: 'Sin conexión con Meta' });
    clock.set(new Date(DAY.getTime() + 16 * 60000));
    await notifier.processDue();
    n = (await notices.get(n.id))!;
    expect(n).toMatchObject({ status: 'scheduled', attempts: 2 });
    clock.set(new Date(DAY.getTime() + 2 * 60 * 60000));
    await notifier.processDue();
    expect((await notices.get(n.id))!).toMatchObject({ status: 'failed', attempts: 3 });
    // Reintento manual cuando se arregla la conexión
    setFailure(null);
    expect(await notifier.retry(n.id)).toMatchObject({ status: 'sent' });
    expect(sent).toHaveLength(1);
  });

  it('no envía si el cliente no tiene celular o pidió no recibir avisos', async () => {
    const { notifier, service, sent } = setup();
    expect(await notifier.onStageChanged({ projectId: 'p2', fromStage: '2', toStage: '3' })).toMatchObject({ status: 'skipped', reason: 'El cliente no tiene celular registrado' });

    let conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'No quiero recibir más mensajes' });
    expect(conv.optedOut).toBe(true);
    expect(sent.at(-1)!.payload).toContain('no te enviaremos más avisos');
    const n = await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' });
    expect(n).toMatchObject({ status: 'skipped', reason: 'El cliente pidió no recibir avisos' });

    conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'REACTIVAR' });
    expect(conv.optedOut).toBe(false);
  });

  it('desactivados no generan nada', async () => {
    const { notifier, sent } = setup({ config: { notifications: { ...DEFAULT_OMNICHANNEL_CONFIG.notifications, enabled: false } } });
    expect(await notifier.onStageChanged({ projectId: 'p1', fromStage: '2', toStage: '3' })).toBeNull();
    expect(sent).toHaveLength(0);
  });
});

describe('reglas de avisos', () => {
  it('franja de envío en hora de Colombia', () => {
    const s = { sendFrom: '07:30', sendUntil: '19:30' };
    expect(nextSendTime(s, DAY)).toEqual(DAY);
    expect(nextSendTime(s, new Date('2026-09-28T11:00:00Z')).toISOString()).toBe('2026-09-28T12:30:00.000Z'); // 6:00 → 7:30
  });

  it('reconoce la baja y el alta', () => {
    expect(optOutIntent('STOP')).toBe('out');
    expect(optOutIntent('no me envíen más mensajes!')).toBe('out');
    expect(optOutIntent('Reactivar')).toBe('in');
    expect(optOutIntent('no quiero cajas rojas, mejor azules')).toBeNull();
  });
});
