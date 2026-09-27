/**
 * Telefonía fase 2 sin Asterisk: timbrado por eventos, colas, menú de opciones y buzón.
 * ARI se reemplaza por objetos que anotan lo que se pidió; los eventos (contestó, colgó,
 * terminó la locución, marcó una tecla) se inyectan como los mandaría Asterisk.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RingTracker } from '../src/services/ringGroups';
import { MediaController } from '../src/services/media';
import { VoiceRingService, RingExtensionRow, RingStore } from '../src/services/ring';
import { VoiceQueueService, QueueConfig, QueueMemberRow, QueueStore, positionMedia, promptMedia } from '../src/services/queue';
import { VoiceVoicemailService, VoicemailStore } from '../src/services/voicemail';
import { VoiceIvrService, IvrStore, businessStatusFor } from '../src/services/ivr';
import { ActiveCall, callRegistry } from '../src/state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/src/voice/callMachine';

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const until = async (cond: () => boolean, ms = 1500) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('No ocurrió a tiempo');
    await tick(3);
  }
};

function newCall(id = 'call_1', state: 'RINGING' | 'IN_IVR' = 'RINGING'): ActiveCall {
  let machine = createCallSnapshot(id);
  machine = transitionCall(machine, 'RINGING').snapshot;
  if (state === 'IN_IVR') machine = transitionCall(machine, 'IN_IVR').snapshot;
  const call: ActiveCall = {
    callId: id,
    organizationId: 'org-1',
    correlationId: 'c',
    channelId: `ch-${id}`,
    linkedChannelIds: [],
    direction: 'INBOUND',
    fromNumber: '+573001112233',
    toNumber: '6068801234',
    machine,
    legalConsentAnnounced: false,
    startedAt: new Date(),
  };
  callRegistry.registerCall(call);
  return call;
}

/** ARI de mentiras: anota llamadas y crea canales con ids predecibles. */
function fakeAri(media?: () => MediaController, opts: { autoFinishPlayback?: boolean } = {}) {
  const log: string[] = [];
  let seq = 0;
  const ari = {
    log,
    async createChannel(p: { endpoint: string }) {
      const id = `leg-${++seq}`;
      log.push(`create ${p.endpoint} → ${id}`);
      return { id };
    },
    async dialChannel(id: string) {
      log.push(`dial ${id}`);
    },
    async hangupChannel(id: string) {
      log.push(`hangup ${id}`);
    },
    async answerChannel(id: string) {
      log.push(`answer ${id}`);
    },
    async ringChannel(id: string) {
      log.push(`ring ${id}`);
    },
    async stopRinging() {},
    async startMusicOnHold(id: string) {
      log.push(`moh ${id}`);
    },
    async stopMusicOnHold(id: string) {
      log.push(`moh-off ${id}`);
    },
    async play(channelId: string, m: string[], playbackId: string) {
      log.push(`play ${channelId} ${m.join('+')}`);
      if (opts.autoFinishPlayback !== false && media) setTimeout(() => media().finished(playbackId), 2);
      return { id: playbackId };
    },
    async stopPlayback(id: string) {
      log.push(`stop-play ${id}`);
    },
    async recordChannel(channelId: string, p: { name: string }) {
      log.push(`record ${channelId} ${p.name}`);
      return {};
    },
    async createBridge() {
      return { id: 'br-1' };
    },
    async addChannelToBridge(b: string, c: string) {
      log.push(`bridge ${b} ${c}`);
    },
  };
  return ari;
}

beforeEach(() => callRegistry.clear());

describe('Timbrado por eventos (RingTracker)', () => {
  it('la primera pierna que contesta se queda la llamada y las demás se cuelgan', async () => {
    const hung: string[] = [];
    const t = new RingTracker(async (id) => void hung.push(id));
    const got: string[] = [];
    const g = t.start({ callId: 'c1', timeoutSeconds: 30, onAnswered: (leg) => void got.push(leg), onNoAnswer: () => void got.push('no') });
    t.addLeg(g, 'a');
    t.addLeg(g, 'b');
    t.ready(g);
    assert.equal(t.answered('b'), true);
    assert.deepEqual(got, ['b']);
    assert.deepEqual(hung, ['a']);
    // Eventos tardíos de la pierna colgada no disparan nada
    assert.equal(t.legGone('a'), false);
    assert.deepEqual(got, ['b']);
  });

  it('si todas rechazan avisa una sola vez; si vence el tiempo cuelga y avisa', async () => {
    const t = new RingTracker(async () => {});
    const reasons: string[] = [];
    const g = t.start({ callId: 'c1', timeoutSeconds: 30, onAnswered: () => {}, onNoAnswer: (r) => void reasons.push(r) });
    t.addLeg(g, 'a');
    t.addLeg(g, 'b');
    t.ready(g);
    t.legGone('a');
    assert.deepEqual(reasons, []);
    t.legGone('b');
    assert.deepEqual(reasons, ['rejected']);

    const hung: string[] = [];
    const t2 = new RingTracker(async (id) => void hung.push(id));
    const later: string[] = [];
    const g2 = t2.start({ callId: 'c2', timeoutSeconds: 0.02, onAnswered: () => {}, onNoAnswer: (r) => void later.push(r) });
    t2.addLeg(g2, 'x');
    t2.ready(g2);
    await until(() => later.length === 1);
    assert.deepEqual(later, ['timeout']);
    assert.deepEqual(hung, ['x']);
  });

  it('sin piernas no hay a quién timbrar; si quien llama cuelga no se avisa nada', () => {
    const t = new RingTracker(async () => {});
    const reasons: string[] = [];
    const g = t.start({ callId: 'c1', timeoutSeconds: 30, onAnswered: () => {}, onNoAnswer: (r) => void reasons.push(r) });
    t.ready(g);
    assert.deepEqual(reasons, ['failed']);
    const g2 = t.start({ callId: 'c2', timeoutSeconds: 30, onAnswered: () => void reasons.push('ans'), onNoAnswer: (r) => void reasons.push(r) });
    t.addLeg(g2, 'z');
    t.ready(g2);
    t.cancel('c2');
    assert.equal(t.answered('z'), false);
    assert.deepEqual(reasons, ['failed']);
  });
});

describe('Reproducciones (MediaController)', () => {
  it('termina con el evento, al detenerla o si el canal se cae', async () => {
    const ari = { play: async () => ({ id: '' }), stopPlayback: async () => {} };
    const m = new MediaController(ari);
    const a = m.start('ch', ['sound:hola']);
    assert.equal(m.isPlaying('ch'), true);
    m.finished(a.id);
    assert.equal(await a.done, 'finished');
    const b = m.start('ch', ['sound:menu']);
    await m.stop(b.id);
    assert.equal(await b.done, 'stopped');
    const c = m.start('ch', ['sound:x']);
    m.channelGone('ch');
    assert.equal(await c.done, 'stopped');
    const bad = new MediaController({ play: async () => Promise.reject(new Error('no existe')), stopPlayback: async () => {} });
    assert.equal(await bad.play('ch', ['sound:y']), 'error');
  });
});

const ext = (over: Partial<RingExtensionRow> = {}): RingExtensionRow => ({
  id: 'ext-101',
  userId: 'emp-07',
  extension: '101',
  ringStrategy: 'BROWSER_ONLY',
  mobileNumber: null,
  ringTimeoutSeconds: 20,
  voicemailEnabled: true,
  dndUntil: null,
  forwardToExtension: null,
  recordingPolicy: 'ALWAYS',
  ...over,
});

describe('Timbrar una extensión', () => {
  const setup = (rows: RingExtensionRow[], status: string | null = null) => {
    const ari = fakeAri();
    const tracker = new RingTracker(async (id) => void ari.log.push(`hangup ${id}`));
    const store: RingStore = { findExtension: async (_o, e) => rows.find((r) => r.extension === e) ?? null, agentStatus: async () => status };
    return { ari, tracker, ring: new VoiceRingService(ari, tracker, store) };
  };

  it('navegador y luego celular: si el navegador no contesta timbra el celular y conecta al que contesta', async () => {
    const { ari, tracker, ring } = setup([ext({ ringStrategy: 'BROWSER_THEN_MOBILE', mobileNumber: '+573105559876' })]);
    const call = newCall();
    const events: string[] = [];
    await ring.ringExtension(call, '101', { onAnswered: (leg) => void events.push(`answered ${leg}`), onNoAnswer: () => void events.push('no') });
    assert.ok(ari.log.includes('create PJSIP/101 → leg-1'));
    tracker.legGone('leg-1'); // rechazó en el navegador
    await until(() => ari.log.some((l) => l.includes('trunk-endpoint')));
    assert.ok(ari.log.includes('create PJSIP/3105559876@trunk-endpoint → leg-2'));
    tracker.answered('leg-2');
    await until(() => events.length === 1);
    assert.deepEqual(events, ['answered leg-2']);
    assert.equal(call.handledByUserId, 'emp-07');
  });

  it('asesor desconectado con solo navegador, "no molestar" o extensión inexistente: no timbra', async () => {
    const cases: Array<[RingExtensionRow[], string | null, string]> = [
      [[ext()], 'OFFLINE', '101'],
      [[ext({ dndUntil: new Date(Date.now() + 60_000) })], null, '101'],
      [[], null, '999'],
    ];
    for (const [rows, status, number] of cases) {
      const { ari, ring } = setup(rows, status);
      const got: Array<RingExtensionRow | null> = [];
      await ring.ringExtension(newCall(`c-${number}-${status}`), number, { onAnswered: () => {}, onNoAnswer: (e) => void got.push(e) });
      assert.equal(got.length, 1);
      assert.equal(ari.log.filter((l) => l.startsWith('create')).length, 0);
    }
  });

  it('respeta el desvío a otra extensión', async () => {
    const { ari, ring } = setup([ext({ forwardToExtension: '102' }), ext({ id: 'ext-102', extension: '102', userId: 'emp-05' })]);
    const call = newCall();
    await ring.ringExtension(call, '101', { onAnswered: () => {}, onNoAnswer: () => {} });
    assert.ok(ari.log.includes('create PJSIP/102 → leg-1'));
    assert.equal(call.handledByUserId, 'emp-05');
  });
});

const queueConfig = (over: Partial<QueueConfig> = {}): QueueConfig => ({
  id: 'q-ventas',
  organizationId: 'org-1',
  name: 'Ventas',
  strategy: 'ROUND_ROBIN',
  ringSeconds: 20,
  wrapUpSeconds: 10,
  maxWaitSeconds: 180,
  maxCallers: 10,
  announcePositionEverySeconds: 45,
  announceHoldTime: false,
  musicOnHold: 'default',
  greetingMedia: null,
  periodicMedia: null,
  overflowTarget: 'VOICEMAIL',
  overflowTargetId: null,
  isActive: true,
  ...over,
});
const member = (userId: string, extension: string, over: Partial<QueueMemberRow> = {}): QueueMemberRow => ({
  userId,
  name: `Asesor ${extension}`,
  extension,
  extensionId: `ext-${extension}`,
  mobileNumber: null,
  ringStrategy: 'BROWSER_ONLY',
  recordingPolicy: 'ALWAYS',
  penalty: 0,
  skills: [],
  status: null,
  ...over,
});

function queueSetup(queue: QueueConfig, members: QueueMemberRow[]) {
  let media!: MediaController;
  const ari = fakeAri(() => media);
  media = new MediaController(ari);
  const tracker = new RingTracker(async (id) => void ari.log.push(`hangup ${id}`));
  const ring = new VoiceRingService(ari, tracker, { findExtension: async () => null, agentStatus: async () => null });
  const connected: Array<{ callId: string; leg: string; userId?: string | null }> = [];
  const voicemails: Array<{ callId: string; queueId?: string | null }> = [];
  const statuses: string[] = [];
  const store: QueueStore = {
    getQueue: async (id) => (id === queue.id ? queue : null),
    getMembers: async () => members,
    setAgentStatus: async (_o, userId, status) => void statuses.push(`${userId}:${status}`),
    endWrapUp: async (userId) => void statuses.push(`${userId}:AVAILABLE`),
  };
  const svc = new VoiceQueueService({
    ari,
    ring,
    tracker,
    media,
    store,
    retryMs: 20,
    connector: { connect: async (call, leg, o) => (connected.push({ callId: call.callId, leg, userId: o?.userId }), true) },
    voicemail: { start: async (call, o) => void voicemails.push({ callId: call.callId, queueId: o?.queueId }) },
  });
  return { ari, tracker, svc, connected, voicemails, statuses, media };
}

describe('Colas de atención', () => {
  it('contesta, pone música, timbra por turnos y conecta con el asesor que contesta', async () => {
    const { ari, tracker, svc, connected } = queueSetup(queueConfig(), [member('ana', '101'), member('beto', '102')]);
    const call = newCall();
    await svc.enqueueCall(call, 'q-ventas');
    assert.equal(call.machine.state, 'IN_QUEUE');
    assert.ok(ari.log.includes(`answer ${call.channelId}`));
    assert.ok(ari.log.includes(`moh ${call.channelId}`));
    await until(() => ari.log.some((l) => l.startsWith('dial')));
    assert.ok(ari.log.includes('create PJSIP/101 → leg-1'));

    tracker.legGone('leg-1'); // Ana rechaza → pasa a Beto
    await until(() => ari.log.includes('create PJSIP/102 → leg-2'));
    tracker.answered('leg-2');
    await until(() => connected.length === 1);
    assert.deepEqual(connected[0], { callId: call.callId, leg: 'leg-2', userId: 'beto' });
    assert.equal(svc.isWaiting(call.callId), false);
    svc.stop();
  });

  it('asesor que no contesta dos veces seguidas queda en pausa', async () => {
    const { tracker, svc, statuses } = queueSetup(queueConfig({ strategy: 'RINGALL' }), [member('ana', '101')]);
    const call = newCall();
    await svc.enqueueCall(call, 'q-ventas');
    await until(() => (tracker as any).groupByLeg.size === 1);
    tracker.legGone('leg-1');
    await until(() => (tracker as any).groupByLeg.has('leg-2'));
    tracker.legGone('leg-2');
    await until(() => statuses.includes('ana:BREAK'));
    svc.stop();
  });

  it('marcando 9 sale al buzón de la cola; sin miembros o al vencer la espera, desborda', async () => {
    const a = queueSetup(queueConfig(), [member('ana', '101', { status: 'BREAK' })]);
    const c1 = newCall('call_a');
    await a.svc.enqueueCall(c1, 'q-ventas');
    await a.svc.handleDigit(c1.channelId, '9');
    assert.deepEqual(a.voicemails, [{ callId: 'call_a', queueId: 'q-ventas' }]);
    a.svc.stop();

    const b = queueSetup(queueConfig(), []);
    await b.svc.enqueueCall(newCall('call_b'), 'q-ventas');
    assert.deepEqual(b.voicemails, [{ callId: 'call_b', queueId: 'q-ventas' }]);

    const c = queueSetup(queueConfig({ maxWaitSeconds: 0.03 }), [member('ana', '101', { status: 'OFFLINE' })]);
    await c.svc.enqueueCall(newCall('call_c'), 'q-ventas');
    await until(() => c.voicemails.length === 1);
    assert.equal(c.voicemails[0].callId, 'call_c');
    c.svc.stop();
  });

  it('si quien espera cuelga, sale de la cola y se deja de timbrar', async () => {
    const { ari, tracker, svc } = queueSetup(queueConfig(), [member('ana', '101')]);
    const call = newCall();
    await svc.enqueueCall(call, 'q-ventas');
    await until(() => (tracker as any).groupByLeg.size === 1);
    assert.equal(svc.callerLeft(call.callId), true);
    assert.ok(ari.log.includes('hangup leg-1'));
    assert.equal(svc.isWaiting(call.callId), false);
    svc.stop();
  });

  it('frases de posición y nombres de locuciones', () => {
    assert.deepEqual(positionMedia(1), ['sound:queue-youarenext']);
    assert.deepEqual(positionMedia(3), ['sound:queue-thereare', 'number:2', 'sound:queue-callswaiting']);
    assert.equal(promptMedia('bienvenida_ventas.wav'), 'sound:fusion/bienvenida_ventas');
    assert.equal(promptMedia(null), null);
  });
});

describe('Buzón de voz', () => {
  const setup = () => {
    let media!: MediaController;
    const ari = fakeAri(() => media);
    media = new MediaController(ari);
    const saved: any[] = [];
    const store: VoicemailStore = { save: async (vm) => (saved.push(vm), 'vm-1') };
    return { ari, saved, vm: new VoiceVoicemailService(ari, media, store) };
  };

  it('invita, graba con pitido y guarda el mensaje al terminar', async () => {
    const { ari, saved, vm } = setup();
    const call = newCall();
    await vm.start(call, { extensionId: 'ext-101', assigneeUserId: 'emp-07' });
    assert.equal(call.machine.state, 'VOICEMAIL');
    assert.ok(ari.log.includes(`play ${call.channelId} sound:vm-intro`));
    assert.ok(ari.log.includes(`record ${call.channelId} vm_call_1`));
    assert.equal(vm.isRecording(call.callId), true);
    assert.equal(await vm.finished('vm_call_1', 12), true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].storageKey, 'recording/vm_call_1.wav');
    assert.equal(saved[0].assigneeUserId, 'emp-07');
    assert.ok(ari.log.includes(`play ${call.channelId} sound:vm-msgsaved+sound:vm-goodbye`));
    assert.ok(ari.log.includes(`hangup ${call.channelId}`));
    assert.equal(call.finished, true);
  });

  it('si cuelga antes de hablar no se guarda nada; si cuelga después, sí', async () => {
    const a = setup();
    const c1 = newCall('call_x');
    await a.vm.start(c1);
    a.vm.callerHungUp(c1);
    await a.vm.finished('vm_call_x', 1);
    assert.equal(a.saved.length, 0);
    assert.equal(c1.finished, true);

    const b = setup();
    const c2 = newCall('call_y');
    await b.vm.start(c2);
    b.vm.callerHungUp(c2);
    await b.vm.finished('vm_call_y', 8);
    assert.equal(b.saved.length, 1);
    assert.equal(c2.voicemail?.saved, true);
    // Ya colgó: no se le reproduce la despedida
    assert.ok(!b.ari.log.some((l) => l.includes('vm-goodbye')));
  });

  it('una grabación que no es de buzón sigue su camino', async () => {
    assert.equal(await setup().vm.finished('rec_call_9', 30), false);
  });
});

describe('Menú de opciones (IVR)', () => {
  const flow = {
    id: 'flow-1',
    organizationId: 'org-1',
    name: 'Principal',
    version: 1,
    status: 'PUBLISHED' as const,
    initialNodeId: 'inicio',
    nodes: [
      { id: 'inicio', type: 'INICIO', position: { x: 0, y: 0 }, data: { label: 'Inicio', type: 'INICIO', outputs: [{ id: 'o', label: 'siguiente', targetNodeId: 'horario' }] } },
      {
        id: 'horario',
        type: 'HORARIO',
        position: { x: 0, y: 0 },
        data: {
          label: 'Horario',
          type: 'HORARIO',
          outputs: [
            { id: 'a', label: 'abierto', targetNodeId: 'menu' },
            { id: 'c', label: 'cerrado', targetNodeId: 'buzon' },
            { id: 'f', label: 'festivo', targetNodeId: 'buzon' },
          ],
        },
      },
      {
        id: 'menu',
        type: 'MENU',
        position: { x: 0, y: 0 },
        data: {
          label: 'Menú',
          type: 'MENU',
          promptId: 'p-menu',
          timeoutSeconds: 0.02,
          maxRetries: 3,
          outputs: [
            { id: '1', label: '1', targetNodeId: 'cola' },
            { id: '0', label: '0', targetNodeId: 'ext' },
          ],
        },
      },
      { id: 'cola', type: 'IR_A_COLA', position: { x: 0, y: 0 }, data: { label: 'Ventas', type: 'IR_A_COLA', queueId: 'q-ventas', outputs: [] } },
      { id: 'ext', type: 'IR_A_EXTENSION', position: { x: 0, y: 0 }, data: { label: 'Recepción', type: 'IR_A_EXTENSION', extension: '101', outputs: [] } },
      { id: 'buzon', type: 'BUZON', position: { x: 0, y: 0 }, data: { label: 'Buzón', type: 'BUZON', outputs: [] } },
    ],
    edges: [],
  } as any;

  const setup = (status: 'abierto' | 'cerrado' | 'festivo' = 'abierto') => {
    let media!: MediaController;
    const ari = fakeAri(() => media);
    media = new MediaController(ari);
    const routed: string[] = [];
    const store: IvrStore = {
      loadFlow: async (id) => (id === 'flow-1' ? flow : null),
      prompts: async () => new Map([['p-menu', 'sound:fusion/menu_principal']]),
      businessStatus: async () => status,
      addDoNotCall: async () => {},
    };
    const ivr = new VoiceIvrService(
      ari,
      media,
      {
        toQueue: async (_c, q) => void routed.push(`cola ${q}`),
        toExtension: async (_c, e) => void routed.push(`extensión ${e}`),
        toVoicemail: async () => void routed.push('buzón'),
        toExternal: async (_c, n) => void routed.push(`externo ${n}`),
      },
      store
    );
    return { ari, ivr, routed };
  };

  it('marca 1 → cola de ventas (con la locución propia del menú)', async () => {
    const { ari, ivr, routed } = setup();
    const call = newCall();
    assert.equal(await ivr.start(call, 'flow-1'), true);
    assert.equal(call.machine.state, 'IN_IVR');
    await until(() => ari.log.includes(`play ${call.channelId} sound:fusion/menu_principal`));
    ivr.handleDigit(call.channelId, '1');
    await until(() => routed.length === 1);
    assert.deepEqual(routed, ['cola q-ventas']);
    assert.equal(ivr.inMenu(call.channelId), false);
  });

  it('opción inválida avisa y repite; sin respuesta tres veces pasa a una persona (0)', async () => {
    const { ari, ivr, routed } = setup();
    const call = newCall();
    await ivr.start(call, 'flow-1');
    await until(() => ari.log.some((l) => l.includes('menu_principal')));
    ivr.handleDigit(call.channelId, '7');
    await until(() => ari.log.some((l) => l.includes('option-is-invalid')));
    await until(() => routed.length === 1, 3000);
    assert.deepEqual(routed, ['extensión 101']);
  });

  it('fuera de horario va al buzón; un flujo sin publicar no arranca', async () => {
    const closed = setup('cerrado');
    await closed.ivr.start(newCall(), 'flow-1');
    await until(() => closed.routed.length === 1);
    assert.deepEqual(closed.routed, ['buzón']);
    assert.equal(await setup().ivr.start(newCall('call_z'), 'no-existe'), false);
  });

  it('si cuelga en el menú, el menú se detiene', async () => {
    const { ivr, routed } = setup();
    const call = newCall();
    await ivr.start(call, 'flow-1');
    assert.equal(ivr.abort(call.channelId), true);
    await tick(80);
    assert.deepEqual(routed, []);
  });
});

describe('Horario de atención con el calendario de la empresa', () => {
  const cal = { days: [{ open: false }, { open: true, from: '08:00', to: '18:00' }, { open: true, from: '08:00', to: '18:00' }, { open: true, from: '08:00', to: '18:00' }, { open: true, from: '08:00', to: '18:00' }, { open: true, from: '08:00', to: '18:00' }, { open: false }], exceptions: [] };
  it('abierto, cerrado y festivo (hora de Bogotá)', () => {
    assert.equal(businessStatusFor(new Date('2026-09-28T15:00:00Z'), cal), 'abierto'); // lunes 10:00
    assert.equal(businessStatusFor(new Date('2026-09-28T02:00:00Z'), cal), 'cerrado'); // domingo 21:00
    assert.equal(businessStatusFor(new Date('2026-12-25T15:00:00Z'), cal), 'festivo'); // Navidad
    assert.equal(businessStatusFor(new Date('2026-12-25T15:00:00Z'), { ...cal, exceptions: [{ date: '2026-12-25', label: 'Temporada', type: 'OPEN' }] }), 'abierto');
  });
});
