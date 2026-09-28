import { describe, it, expect } from 'vitest';
import { createMemoryRepository } from '../repositories/documentStore';
import { createOmnichannelService } from './service';
import { createCorrectionsStore, examplesBlock, isMeaningfulEdit, type Correction } from './learning';
import { createBudgetWatcher, budgetLevel } from './budget';
import type { LlmClient, RunWithToolsInput } from './llm';
import type { AgentDeps } from './agents';
import { DEFAULT_OMNICHANNEL_CONFIG, type Conversation, type OmnichannelConfig } from '../../packages/core/src/omnichannel';

const NOW = new Date('2026-09-28T15:00:00Z');
const actor = { id: 'emp-1', name: 'Laura' };

function setup(config: Partial<OmnichannelConfig> = {}) {
  const store = createCorrectionsStore(createMemoryRepository<Correction>(), () => NOW);
  const systems: string[] = [];
  const llm: LlmClient = {
    complete: async () => '',
    async runWithTools(input: RunWithToolsInput) {
      systems.push(input.system);
      return { text: 'Sí, hacemos tarjetas. ¿Cuántas necesitas?', toolCalls: [] };
    },
  };
  const agentDeps: AgentDeps = {
    llm,
    listClients: async () => [],
    listProjects: async () => [],
    listQuotes: async () => [],
    createPortalLink: async () => '/portal/x',
    createPreQuote: async () => ({ number: 'PRE-1' }),
    appUrl: 'https://app.test',
    now: () => NOW,
    examples: (agent) => store.examplesFor(agent),
  };
  const service = createOmnichannelService({
    conversations: createMemoryRepository<Conversation>(),
    loadConfig: async () => ({ ...DEFAULT_OMNICHANNEL_CONFIG, aiMode: 'suggest', ...config }),
    sender: { isConfigured: () => true, sendText: async () => ({ ok: true, externalId: 'w1' }), sendTemplate: async () => ({ ok: true, externalId: 't' }) },
    agentDeps: () => agentDeps,
    publish: () => undefined,
    now: () => NOW,
    recordCorrection: (c) => store.record(c),
  });
  const flush = () => new Promise((r) => setTimeout(r, 10));
  return { service, store, systems, flush };
}

const suggestionOf = (conv: Conversation) => conv.messages.find((m) => m.status === 'suggested')!;

describe('aprendizaje de las correcciones del equipo', () => {
  it('guarda la corrección cuando una persona edita la sugerencia y la usa como ejemplo después', async () => {
    const { service, store, systems, flush } = setup();
    let conv = await service.handleInbound({ channel: 'webchat', externalUserId: 's1', text: '¿Hacen tarjetas de presentación?' });
    const sug = suggestionOf(conv);
    conv = await service.approveSuggestion(conv.id, sug.id, actor, 'Sí, desde 100 unidades en propalcote 300 g. ¿Cuántas necesitas y con qué acabado?');
    await flush();

    const [c] = await store.list();
    expect(c).toMatchObject({
      kind: 'editada',
      question: '¿Hacen tarjetas de presentación?',
      aiText: 'Sí, hacemos tarjetas. ¿Cuántas necesitas?',
      finalText: 'Sí, desde 100 unidades en propalcote 300 g. ¿Cuántas necesitas y con qué acabado?',
      by: 'Laura',
      active: true,
    });

    await service.handleInbound({ channel: 'webchat', externalUserId: 's2', text: 'Cotízame tarjetas' });
    expect(systems.at(-1)).toContain('ASÍ RESPONDE NUESTRO EQUIPO');
    expect(systems.at(-1)).toContain('desde 100 unidades en propalcote 300 g');
  });

  it('descartar o reemplazar también cuenta; los retoques mínimos no', async () => {
    const { service, store, flush } = setup();
    let conv = await service.handleInbound({ channel: 'webchat', externalUserId: 's1', text: 'hola, ¿tienen stickers?' });
    await service.discardSuggestion(conv.id, suggestionOf(conv).id, actor);
    conv = await service.handleInbound({ channel: 'webchat', externalUserId: 's1', text: '¿y hacen entregas en Bello?' });
    await service.sendAgentMessage(conv.id, 'Sí, entregamos en todo el Valle de Aburrá sin costo desde $300.000.', actor);
    conv = await service.handleInbound({ channel: 'webchat', externalUserId: 's3', text: 'buenas' });
    await service.approveSuggestion(conv.id, suggestionOf(conv).id, actor, 'sí, hacemos tarjetas. ¿cuántas necesitas');
    await flush();

    const list = await store.list();
    expect(list.map((c) => c.kind).sort()).toEqual(['descartada', 'reemplazada']);
    expect(list.find((c) => c.kind === 'reemplazada')).toMatchObject({ question: '¿y hacen entregas en Bello?', finalText: expect.stringContaining('Valle de Aburrá') });
    // Las descartadas sin respuesta no son ejemplos
    const agent = list.find((c) => c.kind === 'reemplazada')!.agent as 'servicio' | 'comercial';
    expect((await store.examplesFor(agent)).map((c) => c.kind)).toEqual(['reemplazada']);
  });

  it('un administrador puede excluir una corrección; desactivado el aprendizaje no se usan', async () => {
    const { service, store, systems, flush } = setup({ learnFromCorrections: false });
    const conv = await service.handleInbound({ channel: 'webchat', externalUserId: 's1', text: '¿Precio de volantes?' });
    await service.approveSuggestion(conv.id, suggestionOf(conv).id, actor, 'Te paso con un asesor para darte el precio exacto.');
    await flush();
    const [c] = await store.list();
    await store.setActive(c.id, false);
    expect(await store.examplesFor('servicio')).toEqual([]);
    await service.handleInbound({ channel: 'webchat', externalUserId: 's2', text: 'hola' });
    expect(systems.at(-1)).not.toContain('ASÍ RESPONDE NUESTRO EQUIPO');
  });

  it('utilidades', () => {
    expect(isMeaningfulEdit('Hola, ¿cómo estás?', 'hola, ¿cómo estás')).toBe(false);
    expect(isMeaningfulEdit('Sí', 'No')).toBe(true);
    expect(examplesBlock([])).toBe('');
    expect(examplesBlock([{ question: 'a', finalText: null }])).toBe('');
  });
});

describe('tope mensual de gasto', () => {
  it('niveles', () => {
    expect(budgetLevel(100, null)).toEqual({ level: 'none', percent: null });
    expect(budgetLevel(79, 100).level).toBe('ok');
    expect(budgetLevel(80, 100).level).toBe('warning');
    expect(budgetLevel(120, 100)).toEqual({ level: 'exceeded', percent: 1.2 });
  });

  it('avisa una vez por nivel y mes, y pausa la IA solo si así se configuró', async () => {
    let spent = 50_000;
    let pause = true;
    const published: string[] = [];
    const watcher = createBudgetWatcher(
      {
        loadConfig: async () => ({ ...DEFAULT_OMNICHANNEL_CONFIG, budget: { monthlyCop: 100_000, pauseAiAtLimit: pause } }),
        monthCostCop: async () => spent,
        alerts: createMemoryRepository() as any,
        publish: (s) => published.push(`${s.month}:${s.level}`),
        now: () => NOW,
      },
      0
    );
    expect((await watcher.check()).level).toBe('ok');
    spent = 85_000;
    await watcher.check();
    await watcher.check();
    expect(published).toEqual(['2026-09:warning']);
    expect(watcher.isAiPaused()).toBe(false);
    spent = 101_000;
    await watcher.check();
    expect(published).toEqual(['2026-09:warning', '2026-09:exceeded']);
    expect(watcher.isAiPaused()).toBe(true);
    pause = false;
    await watcher.check();
    expect(watcher.isAiPaused()).toBe(false);
    expect(published).toHaveLength(2);
  });
});
