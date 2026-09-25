/**
 * FUSION CRM — SUITE DE PRUEBAS DEL MOTOR DE IVR (Sub-Etapa 17.5)
 *
 * 25 Casos de prueba exhaustivos del intérprete, validador de flujo,
 * Regla de Oro del IVR, consultas al CRM y protección de seguridad.
 */

import { describe, it, expect } from 'vitest';
import {
  IvrFlowDefinition,
  IvrExecutionContext,
  validateIvrFlow,
  runFlowStep,
  executeCrmLookup,
  generateFlowDiff,
} from './ivrEngine';

// Flujo de prueba base estándar con aviso legal y regla de oro
function createMockFlow(): IvrFlowDefinition {
  return {
    id: 'flow_test_standard',
    organizationId: 'org_test',
    name: 'Flujo Estándar de Prueba',
    version: 1,
    status: 'DRAFT',
    initialNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'INICIO',
        position: { x: 0, y: 0 },
        data: {
          label: 'Inicio',
          type: 'INICIO',
          outputs: [{ id: 'out_start', label: 'siguiente', targetNodeId: 'node_legal' }],
        },
      },
      {
        id: 'node_legal',
        type: 'LOCUCION',
        position: { x: 100, y: 0 },
        data: {
          label: 'Aviso Legal de Grabación',
          type: 'LOCUCION',
          isLegalConsent: true,
          promptId: 'prompt_legal_grabacion',
          promptName: 'legal_grabacion',
          asteriskFilename: 'fusion/legal_grabacion',
          isInterruptible: false,
          outputs: [{ id: 'out_legal', label: 'siguiente', targetNodeId: 'node_schedule' }],
        },
      },
      {
        id: 'node_schedule',
        type: 'HORARIO',
        position: { x: 200, y: 0 },
        data: {
          label: 'Evaluación Horario',
          type: 'HORARIO',
          outputs: [
            { id: 'out_open', label: 'abierto', targetNodeId: 'node_menu_main' },
            { id: 'out_closed', label: 'cerrado', targetNodeId: 'node_voicemail' },
            { id: 'out_holiday', label: 'festivo', targetNodeId: 'node_holiday_prompt' },
          ],
        },
      },
      {
        id: 'node_holiday_prompt',
        type: 'LOCUCION',
        position: { x: 300, y: -100 },
        data: {
          label: 'Aviso Festivo',
          type: 'LOCUCION',
          promptId: 'prompt_festivo',
          promptName: 'festivo',
          asteriskFilename: 'fusion/festivo',
          isInterruptible: true,
          outputs: [{ id: 'out_h_end', label: 'siguiente', targetNodeId: 'node_hangup' }],
        },
      },
      {
        id: 'node_menu_main',
        type: 'MENU',
        position: { x: 300, y: 0 },
        data: {
          label: 'Menú Principal',
          type: 'MENU',
          promptId: 'prompt_saludo',
          promptName: 'saludo_general',
          asteriskFilename: 'fusion/saludo_general',
          maxRetries: 3,
          outputs: [
            { id: '1', label: '1', targetNodeId: 'node_queue_ventas' },
            { id: '2', label: '2', targetNodeId: 'node_crm_status' },
            { id: '3', label: '3', targetNodeId: 'node_callback' },
            { id: '9', label: '9', targetNodeId: 'node_dnc' },
            // REGLA DE ORO: El 0 siempre va a una persona (Recepción/Humano)
            { id: '0', label: '0', targetNodeId: 'node_ext_humano' },
          ],
        },
      },
      {
        id: 'node_queue_ventas',
        type: 'IR_A_COLA',
        position: { x: 500, y: -50 },
        data: {
          label: 'Cola Ventas',
          type: 'IR_A_COLA',
          queueId: 'queue_ventas_01',
          queueName: 'Ventas Comercial',
          outputs: [],
        },
      },
      {
        id: 'node_ext_humano',
        type: 'IR_A_EXTENSION',
        position: { x: 500, y: 50 },
        data: {
          label: 'Extensión Recepción',
          type: 'IR_A_EXTENSION',
          extension: '101',
          outputs: [],
        },
      },
      {
        id: 'node_crm_status',
        type: 'CONSULTA_CRM',
        position: { x: 500, y: 150 },
        data: {
          label: 'Consultar Estado Pedido',
          type: 'CONSULTA_CRM',
          crmQueryType: 'ORDER_STATUS',
          queryInputVariable: 'orderCode',
          outputs: [
            { id: 'out_found', label: 'encontrado', targetNodeId: 'node_hangup' },
            { id: 'out_not_found', label: 'no_encontrado', targetNodeId: 'node_ext_humano' },
          ],
        },
      },
      {
        id: 'node_callback',
        type: 'DEVOLVER_LLAMADA',
        position: { x: 500, y: 250 },
        data: {
          label: 'Agendar Devolución',
          type: 'DEVOLVER_LLAMADA',
          outputs: [],
        },
      },
      {
        id: 'node_dnc',
        type: 'NO_LLAMAR',
        position: { x: 500, y: 350 },
        data: {
          label: 'Lista No Llamar',
          type: 'NO_LLAMAR',
          outputs: [],
        },
      },
      {
        id: 'node_voicemail',
        type: 'BUZON',
        position: { x: 300, y: 100 },
        data: {
          label: 'Buzón Fuera de Horario',
          type: 'BUZON',
          promptId: 'prompt_buzon',
          outputs: [],
        },
      },
      {
        id: 'node_hangup',
        type: 'COLGAR',
        position: { x: 600, y: 0 },
        data: {
          label: 'Fin de Llamada',
          type: 'COLGAR',
          promptId: 'prompt_despedida',
          outputs: [],
        },
      },
    ],
    edges: [],
  };
}

function createBaseContext(): IvrExecutionContext {
  return {
    callId: 'call_test_123',
    organizationId: 'org_test',
    fromNumber: '+573105559876',
    toNumber: '+576017441234',
    callerCustomer: {
      id: 'cust_01',
      name: 'Empresa Cafetera SAS',
      nit: '900123456-7',
      temperature: 'HOT',
      overdueBalance: 450000,
      lastInvoiceNumber: 'FAC-2026-098',
      orders: [
        { code: 'PED-1001', status: 'EN_PRODUCCION', committedDate: '2026-09-25' },
      ],
      quotes: [{ code: 'COT-500', status: 'APROBADA', amount: 1250000 }],
    },
    variables: {},
    currentNodeId: 'node_start',
    currentRetries: {},
    dtmfBuffer: '',
    accumulatedWaitSeconds: 0,
    stepHistory: [],
    legalNoticePlayed: false,
    activeMenuDepth: 0,
  };
}

const mockPrompts = [
  { id: 'prompt_legal_grabacion', asteriskFilename: 'fusion/legal_grabacion', verified: true },
  { id: 'prompt_festivo', asteriskFilename: 'fusion/festivo', verified: true },
  { id: 'prompt_saludo', asteriskFilename: 'fusion/saludo_general', verified: true },
  { id: 'prompt_buzon', asteriskFilename: 'fusion/buzon_invitacion', verified: true },
  { id: 'prompt_despedida', asteriskFilename: 'fusion/despedida', verified: true },
];

const mockQueues = [{ id: 'queue_ventas_01', name: 'Ventas Comercial', isActive: true }];
const mockExtensions = [{ extension: '101', status: 'ACTIVE' }];

export async function runAllIvrEngineTests() {
  const results: { testNumber: number; title: string; passed: boolean; error?: string }[] = [];

  function assert(testNumber: number, title: string, condition: boolean, errorMsg?: string) {
    if (condition) {
      results.push({ testNumber, title, passed: true });
    } else {
      results.push({ testNumber, title, passed: false, error: errorMsg || 'Assertion failed' });
    }
  }

  const flow = createMockFlow();

  // Caso 1: Entrada en nodo INICIO salta al siguiente
  const ctx1 = createBaseContext();
  const step1 = runFlowStep(flow, ctx1);
  assert(1, 'INICIO node jumps to first action', step1.action === 'JUMP' && step1.nextContext.currentNodeId === 'node_legal');

  // Caso 2: Aviso legal de grabación se reproduce y marca legalNoticePlayed
  const step2 = runFlowStep(flow, step1.nextContext);
  assert(2, 'Aviso legal plays non-interruptible prompt and sets legalNoticePlayed',
    step2.action === 'PLAY_PROMPT' && step2.prompt?.interruptible === false && step2.nextContext.legalNoticePlayed === true);

  // Caso 3: Reproducción legal terminada avanza a HORARIO
  const step3 = runFlowStep(flow, step2.nextContext, { type: 'PLAYBACK_FINISHED' });
  assert(3, 'Playback finished on legal notice jumps to HORARIO', step3.action === 'JUMP' && step3.nextContext.currentNodeId === 'node_schedule');

  // Caso 4: Horario en día y hora hábil (Miércoles 10:00 AM Bogotá) va a ABIERTO
  const ctxOpen = { ...step3.nextContext, currentVirtualTimeBogota: new Date('2026-09-16T15:00:00Z') }; // 10:00 AM UTC-5
  const stepOpen = runFlowStep(flow, ctxOpen);
  assert(4, 'Horario in business hours routes to open branch (menu)',
    stepOpen.action === 'JUMP' && stepOpen.nextContext.currentNodeId === 'node_menu_main');

  // Caso 5: Horario fuera de hora (Miércoles 11:00 PM Bogotá) va a CERRADO (buzón)
  const ctxClosed = { ...step3.nextContext, currentVirtualTimeBogota: new Date('2026-09-17T04:00:00Z') }; // 11:00 PM UTC-5
  const stepClosed = runFlowStep(flow, ctxClosed);
  assert(5, 'Horario off-hours routes to closed branch (voicemail)',
    stepClosed.action === 'JUMP' && stepClosed.nextContext.currentNodeId === 'node_voicemail');

  // Caso 6: Horario en festivo colombiano (20 Julio Independencia) va a FESTIVO
  const ctxHoliday = { ...step3.nextContext, currentVirtualTimeBogota: new Date('2026-07-20T15:00:00Z') };
  const stepHoliday = runFlowStep(flow, ctxHoliday);
  assert(6, 'Horario on Colombian holiday routes to festivo branch',
    stepHoliday.action === 'JUMP' && stepHoliday.nextContext.currentNodeId === 'node_holiday_prompt');

  // Caso 7: Menú principal sin entrada espera DTMF
  const ctxMenu = { ...stepOpen.nextContext, currentNodeId: 'node_menu_main' };
  const stepMenu = runFlowStep(flow, ctxMenu);
  assert(7, 'Menu without input returns WAIT_DTMF', stepMenu.action === 'WAIT_DTMF');

  // Caso 8: Menú pulsa 1 -> entrega a Cola de Ventas
  const stepPress1 = runFlowStep(flow, ctxMenu, { type: 'DTMF', dtmf: '1' });
  assert(8, 'Menu press 1 jumps to sales queue',
    stepPress1.action === 'JUMP' && stepPress1.nextContext.currentNodeId === 'node_queue_ventas');

  // Caso 9: Nodo Cola de Ventas termina llamada en ROUTE_QUEUE
  const stepQueue = runFlowStep(flow, stepPress1.nextContext);
  assert(9, 'IR_A_COLA returns ROUTE_QUEUE with queue ID',
    stepQueue.action === 'ROUTE_QUEUE' && stepQueue.target?.queueId === 'queue_ventas_01' && stepQueue.ended);

  // Caso 10: REGLA DE ORO: Menú pulsa 0 -> entrega a Humano / Extensión 101
  const stepPress0 = runFlowStep(flow, ctxMenu, { type: 'DTMF', dtmf: '0' });
  assert(10, 'GOLDEN RULE: Pressing 0 routes to human extension',
    stepPress0.action === 'JUMP' && stepPress0.nextContext.currentNodeId === 'node_ext_humano');

  // Caso 11: Nodo Extensión termina llamada en ROUTE_EXTENSION
  const stepExt = runFlowStep(flow, stepPress0.nextContext);
  assert(11, 'IR_A_EXTENSION returns ROUTE_EXTENSION with target',
    stepExt.action === 'ROUTE_EXTENSION' && stepExt.target?.extension === '101' && stepExt.ended);

  // Caso 12: Menú pulsa tecla inválida (ej. 7) primer intento -> error prompt
  const stepInvalid1 = runFlowStep(flow, ctxMenu, { type: 'DTMF', dtmf: '7' });
  assert(12, 'Menu invalid digit triggers retry error prompt',
    stepInvalid1.action === 'PLAY_PROMPT' && stepInvalid1.nextContext.currentRetries['node_menu_main'] === 1);

  // Caso 13: Menú pulsa tecla inválida 3 veces -> agota reintentos y deriva a humano (0)
  const ctxRetry2 = { ...stepInvalid1.nextContext, currentRetries: { node_menu_main: 2 } };
  const stepInvalidExhaust = runFlowStep(flow, ctxRetry2, { type: 'DTMF', dtmf: '7' });
  assert(13, 'Exhausting retries routes to fallback/human node',
    stepInvalidExhaust.action === 'JUMP' && stepInvalidExhaust.nextContext.currentNodeId === 'node_ext_humano');

  // Caso 14: Menú pulsa 3 -> Agendar devolución de llamada
  const stepPress3 = runFlowStep(flow, ctxMenu, { type: 'DTMF', dtmf: '3' });
  const stepCb = runFlowStep(flow, stepPress3.nextContext);
  assert(14, 'Devolver llamada schedules callback',
    stepCb.action === 'SCHEDULE_CALLBACK' && stepCb.ended);

  // Caso 15: Menú pulsa 9 -> No Llamar (DNC)
  const stepPress9 = runFlowStep(flow, ctxMenu, { type: 'DTMF', dtmf: '9' });
  const stepDnc = runFlowStep(flow, stepPress9.nextContext);
  assert(15, 'No llamar registers in DNC list',
    stepDnc.action === 'ADD_DO_NOT_CALL' && stepDnc.ended);

  // Caso 16: Buzón de voz inicia grabación de audio
  const ctxVm = { ...ctxMenu, currentNodeId: 'node_voicemail' };
  const stepVm = runFlowStep(flow, ctxVm);
  assert(16, 'BUZON returns RECORD_VOICEMAIL', stepVm.action === 'RECORD_VOICEMAIL' && stepVm.ended);

  // Caso 17: Consulta CRM Estado Pedido con pedido existente -> éxito
  const lookupCtx = createBaseContext();
  const res1 = await executeCrmLookup('ORDER_STATUS', 'PED-1001', lookupCtx);
  assert(17, 'CRM lookup order status found', res1.success && res1.data?.status === 'EN_PRODUCCION');

  // Caso 18: Consulta CRM Estado Pedido con código inexistente -> no encontrado
  const res2 = await executeCrmLookup('ORDER_STATUS', 'PED-9999', lookupCtx);
  assert(18, 'CRM lookup order not found returns graceful error', !res2.success && res2.error === 'ORDER_NOT_FOUND');

  // Caso 19: Consulta CRM Fecha de Entrega comprometida
  const res3 = await executeCrmLookup('DELIVERY_DATE', 'PED-1001', lookupCtx);
  assert(19, 'CRM lookup delivery date found', res3.success && res3.data?.committedDate === '2026-09-25');

  // Caso 20: Consulta CRM Saldo y Última Factura (PERMITIDA si número vinculado al cliente)
  const res4 = await executeCrmLookup('BALANCE_INVOICE', '', lookupCtx);
  assert(20, 'CRM balance lookup allowed when caller phone matches customer',
    res4.success && res4.data?.overdueBalance === 450000 && res4.data?.lastInvoiceNumber === 'FAC-2026-098');

  // Caso 21: Consulta CRM Saldo BLOQUEADA si número no coincide con ningún cliente registrado
  const unlinkedCtx = { ...lookupCtx, callerCustomer: undefined };
  const res5 = await executeCrmLookup('BALANCE_INVOICE', '', unlinkedCtx);
  assert(21, 'SECURITY RULE: Balance lookup rejected if caller phone unlinked',
    !res5.success && res5.error === 'CALLER_NOT_LINKED_TO_CUSTOMER');

  // Caso 22: Validador bloquea flujo si menú no tiene salida por 0 (REGLA DE ORO)
  const invalidFlow = JSON.parse(JSON.stringify(flow)) as IvrFlowDefinition;
  const menuNode = invalidFlow.nodes.find((n) => n.type === 'MENU')!;
  menuNode.data.outputs = menuNode.data.outputs.filter((o) => o.label !== '0');
  const valResult1 = validateIvrFlow(invalidFlow, mockPrompts, mockQueues, mockExtensions);
  assert(22, 'Validator rejects flow when 0 is missing in any menu',
    !valResult1.isValid && valResult1.errors.some((e) => e.code === 'GOLDEN_RULE_ZERO_MISSING'));

  // Caso 23: Validador bloquea flujo si una locución no está verificada en Asterisk
  const unverifiedPrompts = mockPrompts.map((p) =>
    p.id === 'prompt_saludo' ? { ...p, verified: false } : p
  );
  const valResult2 = validateIvrFlow(flow, unverifiedPrompts, mockQueues, mockExtensions);
  assert(23, 'Validator blocks unverified prompts in Asterisk',
    !valResult2.isValid && valResult2.errors.some((e) => e.code === 'PROMPT_UNVERIFIED_IN_ASTERISK'));

  // Caso 24: Validador bloquea flujos con profundidad de menús > 3
  const deepFlow = JSON.parse(JSON.stringify(flow)) as IvrFlowDefinition;
  deepFlow.nodes.push(
    {
      id: 'node_menu_2',
      type: 'MENU',
      position: { x: 400, y: 0 },
      data: { label: 'Submenú 2', type: 'MENU', outputs: [{ id: '0', label: '0', targetNodeId: 'node_ext_humano' }, { id: '1', label: '1', targetNodeId: 'node_menu_3' }] },
    },
    {
      id: 'node_menu_3',
      type: 'MENU',
      position: { x: 500, y: 0 },
      data: { label: 'Submenú 3', type: 'MENU', outputs: [{ id: '0', label: '0', targetNodeId: 'node_ext_humano' }, { id: '1', label: '1', targetNodeId: 'node_menu_4' }] },
    },
    {
      id: 'node_menu_4',
      type: 'MENU',
      position: { x: 600, y: 0 },
      data: { label: 'Submenú 4', type: 'MENU', outputs: [{ id: '0', label: '0', targetNodeId: 'node_ext_humano' }] },
    }
  );
  const startNode = deepFlow.nodes.find((n) => n.type === 'INICIO')!;
  startNode.data.outputs = [{ id: 'out', label: 'siguiente', targetNodeId: 'node_menu_main' }];
  const menuMain = deepFlow.nodes.find((n) => n.id === 'node_menu_main')!;
  menuMain.data.outputs.push({ id: '5', label: '5', targetNodeId: 'node_menu_2' });

  const valResult3 = validateIvrFlow(deepFlow, mockPrompts, mockQueues, mockExtensions);
  assert(24, 'Validator flags menu depth > 3',
    valResult3.errors.some((e) => e.code === 'MENU_DEPTH_EXCEEDED'));

  // Caso 25: Generador de Diff en lenguaje natural claro
  const modifiedFlow = JSON.parse(JSON.stringify(flow)) as IvrFlowDefinition;
  const menuToChange = modifiedFlow.nodes.find((n) => n.id === 'node_menu_main')!;
  const opt1 = menuToChange.data.outputs.find((o) => o.label === '1')!;
  opt1.targetNodeId = 'node_ext_humano';
  const diffs = generateFlowDiff(flow, modifiedFlow);
  assert(25, 'Natural language diff generator outputs clear comparison',
    diffs.length > 0 && diffs.some((d) => d.includes('ahora va a')));

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
}

describe('Motor de IVR y Reglas de Oro (Etapa 17.5)', () => {
  it('ejecuta los 25 casos de prueba unitaria y de validación', async () => {
    const summary = await runAllIvrEngineTests();
    if (summary.failed > 0) {
      const failures = summary.results.filter((r) => !r.passed);
      console.error('Fallos detectados:', failures);
    }
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(25);
  });
});
