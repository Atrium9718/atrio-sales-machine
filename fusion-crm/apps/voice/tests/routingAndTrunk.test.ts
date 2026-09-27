import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trunkDialNumber, trunkDialString } from '../src/trunk';
import { AriEventDispatcher } from '../src/ari/events';

describe('Marcación por la troncal del operador', () => {
  it('formatea el número como lo pide el operador', () => {
    assert.equal(trunkDialNumber('+573001234567', 'NATIONAL'), '3001234567');
    assert.equal(trunkDialNumber('+576068801234', 'INTERNATIONAL'), '576068801234');
    assert.equal(trunkDialNumber('+573001234567', 'E164'), '+573001234567');
  });

  it('usa el endpoint definido en pjsip.conf', () => {
    assert.equal(trunkDialString('+573001234567'), 'PJSIP/3001234567@trunk-endpoint');
  });
});

describe('Enrutamiento de StasisStart', () => {
  const channel = (over: any = {}) => ({
    id: 'ch-1',
    name: 'PJSIP/101-0000002a',
    state: 'Ring',
    caller: { name: 'Asesor', number: '101' },
    connected: { name: '', number: '' },
    accountcode: '',
    dialplan: { context: 'fusion-interno', exten: '3001234567', priority: 1 },
    creationtime: new Date().toISOString(),
    language: 'es',
    ...over,
  });

  const make = () => {
    const seen: string[] = [];
    const dispatcher = new AriEventDispatcher(
      {} as any,
      { handleStasisStart: async () => void seen.push('inbound') } as any,
      {
        handleAgentDialedExternal: async (_c: any, dest: string) => void seen.push(`external:${dest}`),
        handleAgentAnsweredOutbound: async () => void seen.push('agent-answered'),
        handleCustomerAnsweredOutbound: async () => void seen.push('customer-answered'),
      } as any,
      { handleInternalCall: async (_id: string, from: string, to: string) => void seen.push(`internal:${from}->${to}`) } as any,
      {} as any,
      {} as any
    );
    return { seen, dispatcher };
  };

  it('lo que marca una extensión: número externo sale por la troncal, no entra como llamada entrante', async () => {
    const { seen, dispatcher } = make();
    await dispatcher.dispatch({ type: 'StasisStart', args: ['internal', '3001234567'], channel: channel() } as any);
    assert.deepEqual(seen, ['external:3001234567']);
  });

  it('una extensión de 3 o 4 dígitos es llamada interna', async () => {
    const { seen, dispatcher } = make();
    await dispatcher.dispatch({ type: 'StasisStart', args: ['internal', '102'], channel: channel({ dialplan: { context: 'fusion-interno', exten: '102', priority: 1 } }) } as any);
    assert.deepEqual(seen, ['internal:101->102']);
  });

  it('lo que llega de la troncal es entrante', async () => {
    const { seen, dispatcher } = make();
    await dispatcher.dispatch({ type: 'StasisStart', args: ['inbound', '6068801234'], channel: channel({ name: 'PJSIP/trunk-endpoint-00000001', caller: { name: '', number: '3009998877' }, dialplan: { context: 'fusion-entrante', exten: '6068801234', priority: 1 } }) } as any);
    assert.deepEqual(seen, ['inbound']);
  });
});
