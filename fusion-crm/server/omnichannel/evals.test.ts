import { describe, it, expect } from 'vitest';
import { EVAL_CASES, checkExpectations, runEvals } from './evals';
import type { LlmClient } from './llm';
import { DEFAULT_OMNICHANNEL_CONFIG } from '../../packages/core/src/omnichannel';

/** Modelo "bueno": consulta pedidos cuando corresponde y responde con lo que devuelven las herramientas. */
const goodLlm: LlmClient = {
  complete: async () => '',
  async runWithTools(input) {
    const toolCalls = [];
    if (/pedido|etapa/i.test(input.message)) {
      const result: any = await input.executeTool('consultar_mis_pedidos', {});
      toolCalls.push({ name: 'consultar_mis_pedidos', args: {}, result });
      if (result.pedidos) return { text: `Tu pedido ${result.pedidos[0].numero} está en ${result.pedidos[0].etapa}.`, toolCalls };
      return { text: 'Para ayudarte necesito tu NIT y el número del pedido.', toolCalls };
    }
    return { text: '¡Hola! Cuéntame qué producto necesitas, la cantidad y el tamaño, y un asesor te envía la cotización.', toolCalls };
  },
};

/** Modelo "malo": inventa precios y filtra datos. */
const badLlm: LlmClient = {
  complete: async () => '',
  runWithTools: async () => ({ text: 'Claro: 1000 volantes cuestan $250.000. Otro cliente, Confecciones La Estrella, tiene el OT-9202 listo.', toolCalls: [] }),
};

describe('evaluación de agentes', () => {
  it('un modelo que se porta bien pasa todos los casos', async () => {
    const run = await runEvals(goodLlm, DEFAULT_OMNICHANNEL_CONFIG);
    const failed = run.results.filter((r) => !r.passed).map((r) => `${r.id}: ${r.failures.join('; ')}`);
    expect(failed).toEqual([]);
    expect(run.passed).toBe(EVAL_CASES.length);
  });

  it('un modelo que inventa precios o filtra datos falla con motivos claros', async () => {
    const run = await runEvals(badLlm, DEFAULT_OMNICHANNEL_CONFIG);
    const byId = Object.fromEntries(run.results.map((r) => [r.id, r]));
    expect(byId['no-da-precios'].passed).toBe(false);
    expect(byId['inyeccion'].failures.join(' ')).toContain('prohibido');
    expect(byId['estado-numero-registrado'].failures).toContain('No consultó consultar_mis_pedidos');
    // La queja se escala por regla fija, sin depender del modelo
    expect(byId['queja-escala'].passed).toBe(true);
  });

  it('checkExpectations', () => {
    const c = { ...EVAL_CASES[0] };
    expect(checkExpectations(c, { reply: 'OT-9101 en producción', handoff: false, verified: true, tools: ['consultar_mis_pedidos'] })).toEqual([]);
    expect(checkExpectations(c, { reply: '', handoff: false, verified: false, tools: [] })).toContain('No respondió');
  });
});
