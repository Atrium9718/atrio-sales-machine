import { describe, it, expect, vi } from 'vitest';
import { createMemoryRepository } from '../repositories/documentStore';
import { createOmnichannelService, conversationId } from './service';
import type { AgentDeps } from './agents';
import type { LlmClient, RunWithToolsInput } from './llm';
import type { ChannelSender } from './senders';
import { DEFAULT_OMNICHANNEL_CONFIG, type Conversation, type OmnichannelConfig } from '../../packages/core/src/omnichannel';

// ── Datos de prueba ─────────────────────────────────────────────
const clients = [
  { id: 'c-pintuco', name: 'Pintuco S.A.S', nit: '900.123.456-1', phone: '3104459921' },
  { id: 'c-otra', name: 'Otra Empresa', nit: '800555444', phone: '3207778899' },
];
const quotes = [
  { id: 'q1', number: 'COT-100', clientName: 'Pintuco S.A.S', clientNit: '900123456-1' },
  { id: 'q2', number: 'COT-200', clientName: 'Otra Empresa', clientNit: '800555444' },
];
const projects = [
  { id: 'p1', number: 'OT-1203', name: 'Cajas kraft', quoteId: 'q1', stageId: '3', dueDate: '2026-10-02' },
  { id: 'p2', number: 'OT-1300', name: 'Volantes secretos', quoteId: 'q2', stageId: '5' },
];

/** Modelo simulado: ejecuta las herramientas que diga el guion y responde con lo que devolvieron. */
function scriptedLlm(script: (input: RunWithToolsInput) => { tools?: [string, Record<string, unknown>][]; reply: (results: any[]) => string }): LlmClient & { calls: RunWithToolsInput[] } {
  const calls: RunWithToolsInput[] = [];
  return {
    calls,
    async complete() {
      return '';
    },
    async runWithTools(input) {
      calls.push(input);
      const plan = script(input);
      const toolCalls = [];
      const results = [];
      for (const [name, args] of plan.tools ?? []) {
        const result = await input.executeTool(name, args);
        results.push(result);
        toolCalls.push({ name, args, result });
      }
      return { text: plan.reply(results), toolCalls };
    },
  };
}

function fakeSender(fail = false): ChannelSender & { sent: { channel: string; to: string; text: string }[] } {
  const sent: { channel: string; to: string; text: string }[] = [];
  return {
    sent,
    isConfigured: () => true,
    async sendText(channel, to, text) {
      if (fail) return { ok: false, error: 'Token de Meta vencido o inválido' };
      sent.push({ channel, to, text });
      return { ok: true, externalId: `wamid.${sent.length}` };
    },
    async sendTemplate() {
      return { ok: true, externalId: 'tpl' };
    },
  };
}

function setup(opts: { llm?: LlmClient | null; config?: Partial<OmnichannelConfig>; senderFails?: boolean } = {}) {
  const repo = createMemoryRepository<Conversation>();
  const sender = fakeSender(opts.senderFails);
  const published: string[] = [];
  const createPortalLink = vi.fn(async () => '/portal/token-de-prueba-123');
  const createPreQuote = vi.fn(async () => ({ number: 'PRE-2026-7777' }));
  const agentDeps: AgentDeps | null = opts.llm === null
    ? null
    : {
        llm: opts.llm!,
        listClients: async () => clients,
        listProjects: async () => projects,
        listQuotes: async () => quotes,
        createPortalLink,
        createPreQuote,
        appUrl: 'https://app.fusion.test',
        now: () => new Date('2026-09-28T15:00:00Z'), // lunes 10:00 Bogotá
      };
  const service = createOmnichannelService({
    conversations: repo,
    loadConfig: async () => ({ ...DEFAULT_OMNICHANNEL_CONFIG, ...opts.config }),
    sender,
    agentDeps: () => agentDeps,
    publish: (conv) => published.push(conv.id),
    now: () => new Date('2026-09-28T15:00:00Z'),
  });
  return { service, repo, sender, published, createPortalLink, createPreQuote };
}

const orderStatusLlm = () =>
  scriptedLlm((input) => ({
    tools: [['consultar_mis_pedidos', {}]],
    reply: ([r]) =>
      r.error ? 'Para ayudarte necesito tu NIT y el número de tu pedido.' : `Tu pedido ${r.pedidos[0].numero} está en ${r.pedidos[0].etapa}. Míralo aquí: ${r.enlace_avance}`,
  }));

describe('omnicanal: atención con IA', () => {
  it('WhatsApp de número registrado: verifica, responde solo con SUS pedidos y envía en modo automático', async () => {
    const llm = orderStatusLlm();
    const { service, sender, createPortalLink } = setup({ llm, config: { aiMode: 'auto' } });

    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', contactName: 'Claudia', text: '¿Cómo va mi pedido?', externalId: 'in-1' });

    expect(conv).toMatchObject({ verified: true, verifiedBy: 'phone', clientName: 'Pintuco S.A.S', lastIntent: 'estado_pedido', needsHuman: false });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toMatchObject({ channel: 'whatsapp', to: '573104459921' });
    expect(sender.sent[0].text).toContain('OT-1203');
    expect(sender.sent[0].text).toContain('https://app.fusion.test/portal/token-de-prueba-123');
    // Nunca aparecen pedidos de otro cliente
    const toolResult = JSON.stringify(llm.calls[0]);
    expect(sender.sent[0].text).not.toContain('OT-1300');
    expect(createPortalLink).toHaveBeenCalledWith({ name: 'Pintuco S.A.S', nit: '900.123.456-1' });
    expect(toolResult).toContain('verificada');
    const [out] = conv.messages.filter((m) => m.direction === 'out');
    expect(out).toMatchObject({ author: 'ai', aiAgent: 'servicio', status: 'sent', externalId: 'wamid.1' });
  });

  it('cliente no verificado no recibe datos hasta dar NIT + número de pedido', async () => {
    const llm = orderStatusLlm();
    const { service } = setup({ llm, config: { aiMode: 'auto' } });

    let conv = await service.handleInbound({ channel: 'webchat', externalUserId: 'sesion-1', text: 'cómo va mi pedido?' });
    expect(conv.verified).toBe(false);
    expect(conv.messages.at(-1)?.text).toContain('NIT');

    // Solo el NIT no basta
    conv = await service.handleInbound({ channel: 'webchat', externalUserId: 'sesion-1', text: 'mi nit es 900123456' });
    expect(conv.verified).toBe(false);

    // NIT de otro cliente con la OT de Pintuco: no coincide
    conv = await service.handleInbound({ channel: 'webchat', externalUserId: 'sesion-1', text: 'nit 800555444 pedido OT-1203' });
    expect(conv.verified).toBe(false);

    conv = await service.handleInbound({ channel: 'webchat', externalUserId: 'sesion-1', text: 'NIT 900.123.456-1, la OT-1203' });
    expect(conv).toMatchObject({ verified: true, verifiedBy: 'order', clientName: 'Pintuco S.A.S' });
    expect(conv.messages.at(-1)?.text).toContain('OT-1203');
  });

  it('modo sugerencia: la respuesta espera aprobación y se envía (corregida) al aprobarla', async () => {
    const { service, sender } = setup({ llm: orderStatusLlm(), config: { aiMode: 'suggest' } });
    let conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'estado de mi pedido' });
    expect(sender.sent).toHaveLength(0);
    expect(conv.awaitingApproval).toBe(true);
    const suggestion = conv.messages.find((m) => m.status === 'suggested')!;

    conv = await service.approveSuggestion(conv.id, suggestion.id, { id: 'emp-1', name: 'Laura' }, 'Hola Claudia, tu OT-1203 va en producción.');
    expect(sender.sent[0].text).toBe('Hola Claudia, tu OT-1203 va en producción.');
    expect(conv.awaitingApproval).toBe(false);
    expect(conv.messages.find((m) => m.id === suggestion.id)).toMatchObject({ status: 'sent', agentName: 'Laura' });

    await expect(service.approveSuggestion(conv.id, suggestion.id, { id: 'emp-1', name: 'Laura' })).rejects.toThrow('ya no está pendiente');
  });

  it('en modo automático, las intenciones no autorizadas quedan como sugerencia', async () => {
    const llm = scriptedLlm(() => ({ reply: () => '¿Qué cantidad necesitas?' }));
    const { service, sender } = setup({ llm, config: { aiMode: 'auto', autoIntents: ['estado_pedido'] } });
    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000000', text: 'cuánto cuestan 500 volantes' });
    expect(conv.lastIntent).toBe('cotizacion');
    expect(sender.sent).toHaveLength(0);
    expect(conv.awaitingApproval).toBe(true);
  });

  it('pasa a una persona si el cliente lo pide, avisa al cliente y la IA deja de responder', async () => {
    const llm = orderStatusLlm();
    const { service, sender } = setup({ llm, config: { aiMode: 'auto' } });
    let conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'quiero hablar con un asesor por favor' });
    expect(conv).toMatchObject({ mode: 'human', needsHuman: true, handoffReason: 'El cliente pidió hablar con una persona' });
    expect(sender.sent[0].text).toContain('persona de nuestro equipo');
    expect(llm.calls).toHaveLength(0);

    conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: '¿sigues ahí?' });
    expect(llm.calls).toHaveLength(0);
    expect(sender.sent).toHaveLength(1);
    expect(conv.needsHuman).toBe(true);

    // La persona responde y luego devuelve la conversación a la IA
    conv = await service.sendAgentMessage(conv.id, 'Hola, soy Laura. ¿En qué te ayudo?', { id: 'emp-1', name: 'Laura' });
    expect(conv).toMatchObject({ needsHuman: false, assigneeName: 'Laura', mode: 'human' });
    conv = await service.returnToAi(conv.id);
    expect(conv.mode).toBe('auto');
  });

  it('la IA puede escalar por su cuenta con la herramienta', async () => {
    const llm = scriptedLlm(() => ({ tools: [['escalar_a_humano', { motivo: 'Pide un producto que no manejamos' }]], reply: () => 'Te comunico con una persona.' }));
    const { service } = setup({ llm, config: { aiMode: 'auto' } });
    const conv = await service.handleInbound({ channel: 'messenger', externalUserId: 'psid-1', text: 'hacen letreros de neón?' });
    expect(conv).toMatchObject({ mode: 'human', needsHuman: true, handoffReason: 'Pide un producto que no manejamos' });
  });

  it('cotización: registra la precotización para el asesor', async () => {
    const llm = scriptedLlm(() => ({
      tools: [['registrar_solicitud_cotizacion', { resumen: '1000 volantes media carta a color', empresa_o_nombre: 'Tienda La 14' }]],
      reply: ([r]) => `Listo, registré tu solicitud ${r.numero}. Un asesor te enviará la cotización.`,
    }));
    const { service, createPreQuote } = setup({ llm, config: { aiMode: 'auto' } });
    const conv = await service.handleInbound({ channel: 'instagram', externalUserId: 'ig-1', contactName: 'tienda14', text: 'necesito imprimir 1000 volantes a color' });
    expect(createPreQuote).toHaveBeenCalledTimes(1);
    expect((createPreQuote.mock.calls as any[])[0][0].customer).toMatchObject({ name: 'Tienda La 14' });
    expect(conv.messages.at(-1)?.text).toContain('PRE-2026-7777');
    expect(conv.lastIntent).toBe('cotizacion');
  });

  it('si la IA falla, el caso queda para una persona con un mensaje amable', async () => {
    const llm: LlmClient = { complete: async () => '', runWithTools: async () => { throw new Error('quota exceeded'); } };
    const { service, sender } = setup({ llm, config: { aiMode: 'auto' } });
    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000001', text: 'hola, dónde quedan?' });
    expect(conv.needsHuman).toBe(true);
    expect(conv.handoffReason).toContain('quota exceeded');
    expect(sender.sent[0].text).toContain('persona de nuestro equipo');
  });

  it('si el canal rechaza el envío, queda marcado para revisión', async () => {
    const { service } = setup({ llm: orderStatusLlm(), config: { aiMode: 'auto' }, senderFails: true });
    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'cómo va mi pedido' });
    expect(conv.needsHuman).toBe(true);
    expect(conv.handoffReason).toContain('Token de Meta');
    expect(conv.messages.at(-1)).toMatchObject({ status: 'failed' });
  });

  it('sin IA configurada o apagada, todo queda para personas', async () => {
    const { service } = setup({ llm: null, config: { aiMode: 'auto' } });
    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000002', text: 'hola' });
    expect(conv).toMatchObject({ needsHuman: true, handoffReason: 'La IA no está configurada (GEMINI_API_KEY)' });
  });

  it('no procesa dos veces el mismo mensaje (reintentos de Meta) y respeta el orden de mensajes seguidos', async () => {
    const llm = scriptedLlm((input) => ({ reply: () => `eco: ${input.message}` }));
    const { service } = setup({ llm, config: { aiMode: 'auto' } });
    await Promise.all([
      service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000003', text: 'uno', externalId: 'm1' }),
      service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000003', text: 'uno', externalId: 'm1' }),
      service.handleInbound({ channel: 'whatsapp', externalUserId: '573000000003', text: 'dos', externalId: 'm2' }),
    ]);
    const conv = await service.get(conversationId('whatsapp', '573000000003'));
    expect(conv!.messages.map((m) => m.text)).toEqual(['uno', 'eco: uno', 'dos', 'eco: dos']);
  });

  it('actualiza entregado/leído y marca los fallos de entrega', async () => {
    const { service } = setup({ llm: orderStatusLlm(), config: { aiMode: 'auto' } });
    const conv = await service.handleInbound({ channel: 'whatsapp', externalUserId: '573104459921', text: 'estado de mi pedido' });
    await service.updateDeliveryStatus('wamid.1', 'read');
    let after = await service.get(conv.id);
    expect(after!.messages.at(-1)?.status).toBe('read');
    await service.updateDeliveryStatus('wamid.1', 'delivered'); // no retrocede
    after = await service.get(conv.id);
    expect(after!.messages.at(-1)?.status).toBe('read');
  });
});
