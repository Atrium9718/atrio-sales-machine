/**
 * FUSION CRM — MOTOR DE EJECUCIÓN E INTÉRPRETE DE IVR (Sub-Etapa 17.5)
 *
 * REGLA DE ORO DEL IVR:
 * EL CERO SIEMPRE LLEVA A UNA PERSONA.
 * En todos los menús, en todos los niveles, esté donde esté.
 * Si el validador encuentra un menú sin salida por 0, no deja publicar.
 */

import { ColombianHoliday, getColombianHolidays, isColombianHoliday } from './holidays';

export type IvrNodeType =
  | 'INICIO'
  | 'HORARIO'
  | 'LOCUCION'
  | 'MENU'
  | 'CAPTURA'
  | 'CONSULTA_CRM'
  | 'DECISION'
  | 'IR_A_COLA'
  | 'IR_A_EXTENSION'
  | 'IR_A_AGENTE_IA'
  | 'BUZON'
  | 'TRANSFERIR_EXTERNO'
  | 'DEVOLVER_LLAMADA'
  | 'NO_LLAMAR'
  | 'COLGAR';

export interface IvrNodeOutput {
  id: string;
  label: string; // ej: '1', '2', '0', 'abierto', 'cerrado', 'encontrado', 'no_encontrado'
  targetNodeId: string | null;
}

export interface IvrNodeData {
  label: string;
  type: IvrNodeType;
  description?: string;
  // Propiedades según tipo
  promptId?: string; // Para LOCUCION, MENU, CAPTURA, etc.
  promptName?: string;
  promptText?: string;
  asteriskFilename?: string;
  isInterruptible?: boolean; // false para avisos legales obligatorios
  isLegalConsent?: boolean; // Marca aviso de grabación legal

  // MENU
  timeoutSeconds?: number;
  maxRetries?: number;
  invalidPromptId?: string;
  timeoutPromptId?: string;
  exhaustedAction?: 'HUMAN_QUEUE' | 'HANGUP' | 'VOICEMAIL';
  exhaustedTargetId?: string;

  // CAPTURA
  captureVariable?: string; // ej: 'orderNumber', 'docNumber', 'quoteCode'
  captureType?: 'NUMERIC' | 'ALPHANUMERIC' | 'PHONE';
  minLength?: number;
  maxLength?: number;
  readBackConfirmation?: boolean;

  // CONSULTA_CRM
  crmQueryType?: 'ORDER_STATUS' | 'DELIVERY_DATE' | 'BALANCE_INVOICE' | 'QUOTE_CONFIRMATION';
  queryInputVariable?: string;
  timeoutMs?: number; // Máximo 2000ms

  // DECISION
  conditionField?: string; // ej: 'customer.temperature', 'variables.orderFound'
  conditionOperator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN';
  conditionValue?: string;

  // ENRUTAMIENTOS
  queueId?: string;
  queueName?: string;
  extension?: string;
  agentId?: string;
  externalNumber?: string;
  scheduleId?: string;

  outputs: IvrNodeOutput[];
}

export interface IvrNode {
  id: string;
  type: IvrNodeType;
  position: { x: number; y: number };
  data: IvrNodeData;
}

export interface IvrEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  label?: string;
}

export interface IvrFlowDefinition {
  id: string;
  organizationId: string;
  name: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  initialNodeId: string;
  scheduleId?: string;
  nodes: IvrNode[];
  edges: IvrEdge[];
  publishedAt?: string;
  publishedById?: string;
}

export interface IvrExecutionContext {
  callId: string;
  organizationId: string;
  fromNumber: string; // Caller ID E.164
  toNumber: string;
  callerCustomer?: {
    id: string;
    name: string;
    nit?: string;
    temperature?: 'COLD' | 'WARM' | 'HOT' | 'VIP';
    overdueBalance?: number;
    lastInvoiceNumber?: string;
    orders?: Array<{ code: string; status: string; committedDate: string }>;
    quotes?: Array<{ code: string; status: string; amount: number }>;
  };
  variables: Record<string, any>;
  currentNodeId: string;
  currentRetries: Record<string, number>;
  dtmfBuffer: string;
  accumulatedWaitSeconds: number;
  stepHistory: Array<{
    nodeId: string;
    nodeType: IvrNodeType;
    nodeLabel: string;
    enteredAt: string;
    actionTaken: string;
  }>;
  legalNoticePlayed: boolean;
  activeMenuDepth: number;
  currentVirtualTimeBogota?: Date; // Para simulación
}

export interface IvrStepResult {
  action:
    | 'PLAY_PROMPT'
    | 'WAIT_DTMF'
    | 'READ_DATA'
    | 'CRM_LOOKUP'
    | 'ROUTE_QUEUE'
    | 'ROUTE_EXTENSION'
    | 'ROUTE_AI'
    | 'RECORD_VOICEMAIL'
    | 'TRANSFER_EXTERNAL'
    | 'SCHEDULE_CALLBACK'
    | 'ADD_DO_NOT_CALL'
    | 'HANGUP'
    | 'JUMP';
  nodeId: string;
  nodeType: IvrNodeType;
  prompt?: {
    id?: string;
    filename: string;
    text?: string;
    interruptible: boolean;
  };
  readData?: {
    type: 'number' | 'digits' | 'date' | 'characters';
    value: string;
  };
  crmLookup?: {
    queryType: string;
    input: string;
    allowed: boolean;
    reason?: string;
  };
  target?: {
    queueId?: string;
    extension?: string;
    externalNumber?: string;
  };
  nextContext: IvrExecutionContext;
  humanReadableLog: string;
  ended: boolean;
}

/**
 * REGLA DE ORO DEL IVR:
 * Validador exhaustivo y bloqueante de flujos antes de su publicación.
 */
export interface IvrValidationIssue {
  type: 'ERROR' | 'WARNING';
  code: string;
  nodeId?: string;
  message: string;
}

export interface IvrValidationResult {
  isValid: boolean;
  errors: IvrValidationIssue[];
  warnings: IvrValidationIssue[];
  summary: string;
}

export type IvrValidationReport = IvrValidationResult;

export function validateIvrFlow(
  flow: IvrFlowDefinition,
  availablePrompts: Array<{ id: string; asteriskFilename: string; verified: boolean }> = [],
  availableQueues: Array<{ id: string; name: string; isActive: boolean }> = [],
  availableExtensions: Array<{ extension: string; status: string }> = []
): IvrValidationResult {
  const errors: IvrValidationIssue[] = [];
  const warnings: IvrValidationIssue[] = [];

  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const nodeMap = new Map<string, IvrNode>(nodes.map((n) => [n.id, n]));

  // 1. Nodo de inicio
  const startNodes = nodes.filter((n) => n.type === 'INICIO');
  if (startNodes.length === 0) {
    errors.push({
      type: 'ERROR',
      code: 'MISSING_START_NODE',
      message: 'El flujo debe tener exactamente un nodo de INICIO.',
    });
  } else if (startNodes.length > 1) {
    errors.push({
      type: 'ERROR',
      code: 'MULTIPLE_START_NODES',
      message: 'El flujo no puede tener más de un nodo de INICIO.',
    });
  }

  // 2. REGLA DE ORO: En todos los menús, en todos los niveles, el 0 DEBE llevar a una persona
  for (const node of nodes) {
    if (node.type === 'MENU') {
      const outputs = node.data?.outputs || [];
      const zeroOutput = outputs.find((o) => o.label === '0' || o.id === '0');
      if (!zeroOutput || !zeroOutput.targetNodeId) {
        errors.push({
          type: 'ERROR',
          code: 'GOLDEN_RULE_ZERO_MISSING',
          nodeId: node.id,
          message: `REGLA DE ORO VIOLADA en el menú "${node.data.label}": El cero (0) DEBE tener una salida asignada que lleve a una persona (cola o extensión).`,
        });
      }
    }
  }

  // 3. Salidas huérfanas o sin target
  for (const node of nodes) {
    if (['COLGAR', 'IR_A_COLA', 'IR_A_EXTENSION', 'IR_A_AGENTE_IA', 'BUZON', 'TRANSFERIR_EXTERNO', 'DEVOLVER_LLAMADA', 'NO_LLAMAR'].includes(node.type)) {
      // Nodos terminales o de entrega
      continue;
    }

    const outputs = node.data?.outputs || [];
    if (outputs.length === 0) {
      errors.push({
        type: 'ERROR',
        code: 'NODE_WITHOUT_OUTPUTS',
        nodeId: node.id,
        message: `El nodo "${node.data.label}" (${node.type}) no tiene salidas configuradas.`,
      });
    } else {
      for (const out of outputs) {
        if (!out.targetNodeId) {
          errors.push({
            type: 'ERROR',
            code: 'UNCONNECTED_OUTPUT',
            nodeId: node.id,
            message: `La salida "${out.label}" del nodo "${node.data.label}" no está conectada a ningún destino.`,
          });
        } else if (!nodeMap.has(out.targetNodeId)) {
          errors.push({
            type: 'ERROR',
            code: 'TARGET_NODE_NOT_FOUND',
            nodeId: node.id,
            message: `El destino de la salida "${out.label}" en el nodo "${node.data.label}" no existe en el flujo.`,
          });
        }
      }
    }
  }

  // 4. Verificación de locuciones en servidor Asterisk
  const promptMap = new Map(availablePrompts.map((p) => [p.id, p]));
  for (const node of nodes) {
    if (node.data?.promptId) {
      const prompt = promptMap.get(node.data.promptId);
      if (!prompt) {
        errors.push({
          type: 'ERROR',
          code: 'PROMPT_NOT_FOUND',
          nodeId: node.id,
          message: `El nodo "${node.data.label}" hace referencia a una locución que no existe en el catálogo.`,
        });
      } else if (!prompt.verified) {
        errors.push({
          type: 'ERROR',
          code: 'PROMPT_UNVERIFIED_IN_ASTERISK',
          nodeId: node.id,
          message: `La locución del nodo "${node.data.label}" aún no ha sido verificada en el servidor Asterisk (/var/lib/asterisk/sounds/fusion).`,
        });
      }
    }
  }

  // 5. Verificación de colas y extensiones activas
  const queueMap = new Map(availableQueues.map((q) => [q.id, q]));
  const extMap = new Map(availableExtensions.map((e) => [e.extension, e]));

  for (const node of nodes) {
    if (node.type === 'IR_A_COLA' && node.data?.queueId) {
      const q = queueMap.get(node.data.queueId);
      if (!q || !q.isActive) {
        errors.push({
          type: 'ERROR',
          code: 'QUEUE_NOT_ACTIVE',
          nodeId: node.id,
          message: `El nodo "${node.data.label}" transfiere a una cola inexistente o desactivada (${node.data.queueId}).`,
        });
      }
    }

    if (node.type === 'IR_A_EXTENSION' && node.data?.extension) {
      const ext = extMap.get(node.data.extension);
      if (!ext || ext.status !== 'ACTIVE') {
        errors.push({
          type: 'ERROR',
          code: 'EXTENSION_NOT_ACTIVE',
          nodeId: node.id,
          message: `El nodo "${node.data.label}" transfiere a la extensión interna ${node.data.extension} que no está activa.`,
        });
      }
    }
  }

  // 6. Detección de ciclos infinitos sin salida
  // Verificamos si existe algún camino cíclico cerrado que no tenga salida hacia un nodo terminal
  const terminalTypes = new Set([
    'COLGAR',
    'IR_A_COLA',
    'IR_A_EXTENSION',
    'IR_A_AGENTE_IA',
    'BUZON',
    'TRANSFERIR_EXTERNO',
    'DEVOLVER_LLAMADA',
    'NO_LLAMAR',
  ]);

  const canReachTerminal = new Map<string, boolean>();
  for (const node of nodes) {
    if (terminalTypes.has(node.type)) {
      canReachTerminal.set(node.id, true);
    }
  }

  // Propagación inversa para verificar alcance terminal
  let changed = true;
  let iterations = 0;
  while (changed && iterations < nodes.length + 2) {
    changed = false;
    iterations++;
    for (const node of nodes) {
      if (canReachTerminal.get(node.id)) continue;
      const outputs = node.data?.outputs || [];
      const hasTerminalPath = outputs.some((o) => o.targetNodeId && canReachTerminal.get(o.targetNodeId));
      if (hasTerminalPath) {
        canReachTerminal.set(node.id, true);
        changed = true;
      }
    }
  }

  for (const node of nodes) {
    if (!canReachTerminal.get(node.id)) {
      errors.push({
        type: 'ERROR',
        code: 'INFINITE_CYCLE_NO_EXIT',
        nodeId: node.id,
        message: `El nodo "${node.data.label}" forma parte de un ciclo cerrado sin salida a un nodo terminal o de atención.`,
      });
    }
  }

  // 7. Profundidad máxima de menús <= 3
  // Advertencia honesta: "un cliente que tiene que oír cuatro menús cuelga"
  function calculateMaxMenuDepth(nodeId: string, visited = new Set<string>()): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    const currentWeight = node.type === 'MENU' ? 1 : 0;
    const outputs = node.data?.outputs || [];
    let childMax = 0;

    for (const out of outputs) {
      if (out.targetNodeId) {
        const d = calculateMaxMenuDepth(out.targetNodeId, new Set(visited));
        if (d > childMax) childMax = d;
      }
    }

    return currentWeight + childMax;
  }

  if (startNodes[0]) {
    const depth = calculateMaxMenuDepth(startNodes[0].id);
    if (depth > 3) {
      errors.push({
        type: 'ERROR',
        code: 'MENU_DEPTH_EXCEEDED',
        message: `Profundidad de menús alcanzada (${depth} niveles). Un cliente que tiene que oír cuatro menús cuelga. Máximo permitido: 3.`,
      });
    }
  }

  // 8. Aviso legal de grabación obligatorio en caminos a conversación grabada
  // Comprobamos si el aviso legal está presente antes de llegar a colas o extensiones
  const hasLegalNotice = nodes.some(
    (n) => n.data?.isLegalConsent || n.data?.promptName === 'legal_grabacion' || n.data?.promptId === 'prompt_legal_grabacion'
  );
  if (!hasLegalNotice) {
    errors.push({
      type: 'ERROR',
      code: 'MISSING_LEGAL_RECORDING_NOTICE',
      message: 'El flujo no contiene el aviso legal obligatorio de grabación de llamadas (Ley 1581 / Habeas Data). Debe reproducirse antes de conectar con un asesor o cola.',
    });
  }

  const isValid = errors.length === 0;
  const summary = isValid
    ? 'El flujo es completamente válido y cumple con la Regla de Oro del IVR y normativas legales.'
    : `Se encontraron ${errors.length} error(es) bloqueante(s) y ${warnings.length} advertencia(s).`;

  return { isValid, errors, warnings, summary };
}

/**
 * Generador de Diff en lenguaje humano comprensible para usuarios no programadores
 */
export function generateFlowDiff(
  prevFlow: IvrFlowDefinition | null,
  newFlow: IvrFlowDefinition
): string[] {
  if (!prevFlow) {
    return [`Creación inicial del flujo "${newFlow.name}" con ${newFlow.nodes.length} nodos.`];
  }

  const diffs: string[] = [];
  const prevMap = new Map(prevFlow.nodes.map((n) => [n.id, n]));
  const newMap = new Map(newFlow.nodes.map((n) => [n.id, n]));

  // Nodos agregados
  for (const node of newFlow.nodes) {
    if (!prevMap.has(node.id)) {
      diffs.push(`Se agregó el nodo "${node.data.label}" de tipo ${node.type}.`);
    }
  }

  // Nodos eliminados
  for (const prevNode of prevFlow.nodes) {
    if (!newMap.has(prevNode.id)) {
      diffs.push(`Se eliminó el nodo "${prevNode.data.label}" (${prevNode.type}).`);
    }
  }

  // Cambios en salidas de nodos existentes
  for (const node of newFlow.nodes) {
    const prev = prevMap.get(node.id);
    if (!prev) continue;

    const prevOutputs = prev.data.outputs || [];
    const newOutputs = node.data.outputs || [];

    for (const no of newOutputs) {
      const po = prevOutputs.find((p) => p.label === no.label);
      if (!po) {
        const targetNode = newMap.get(no.targetNodeId || '');
        diffs.push(
          `En "${node.data.label}", se agregó la opción "${no.label}" apuntando a "${targetNode?.data.label || 'sin asignar'}".`
        );
      } else if (po.targetNodeId !== no.targetNodeId) {
        const oldTarget = prevMap.get(po.targetNodeId || '');
        const newTarget = newMap.get(no.targetNodeId || '');
        diffs.push(
          `En "${node.data.label}", la opción "${no.label}" ahora va a "${newTarget?.data.label || 'desconectado'}" (antes iba a "${oldTarget?.data.label || 'desconectado'}").`
        );
      }
    }
  }

  if (diffs.length === 0) {
    diffs.push('No hay cambios estructurales; sólo ajustes cosméticos o de metadatos.');
  }

  return diffs;
}

/**
 * Consulta autorizada al CRM desde el IVR con límite estricto de 2000 ms
 */
export async function executeCrmLookup(
  queryType: 'ORDER_STATUS' | 'DELIVERY_DATE' | 'BALANCE_INVOICE' | 'QUOTE_CONFIRMATION',
  inputValue: string,
  context: IvrExecutionContext
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  readBackText: string;
  error?: string;
}> {
  const caller = context.callerCustomer;

  // REGLA DE SEGURIDAD 3: Saldo pendiente y última factura SOLO si el número que llama está vinculado al cliente
  if (queryType === 'BALANCE_INVOICE') {
    if (!caller || !caller.id) {
      return {
        success: false,
        readBackText: 'Por seguridad, el saldo solo se informa llamando desde el número registrado.',
        error: 'CALLER_NOT_LINKED_TO_CUSTOMER',
      };
    }
    const balance = caller.overdueBalance || 0;
    const inv = caller.lastInvoiceNumber || 'Sin facturas pendientes';
    return {
      success: true,
      data: { overdueBalance: balance, lastInvoiceNumber: inv },
      readBackText:
        balance > 0
          ? `Su saldo pendiente es de ${balance} pesos, correspondiente a la factura ${inv}.`
          : 'Su cuenta se encuentra al día. No presenta saldos vencidos.',
    };
  }

  // 1. Estado de un pedido
  if (queryType === 'ORDER_STATUS') {
    const cleanInput = inputValue.trim().toUpperCase();
    const order = caller?.orders?.find(
      (o) => o.code.toUpperCase() === cleanInput || o.code.endsWith(cleanInput)
    );
    if (order) {
      return {
        success: true,
        data: order,
        readBackText: `Su pedido ${order.code} se encuentra en estado ${order.status}.`,
      };
    }
    return {
      success: false,
      readBackText: `No encontramos ningún pedido con el número ${cleanInput}.`,
      error: 'ORDER_NOT_FOUND',
    };
  }

  // 2. Fecha de entrega
  if (queryType === 'DELIVERY_DATE') {
    const cleanInput = inputValue.trim().toUpperCase();
    const order = caller?.orders?.find(
      (o) => o.code.toUpperCase() === cleanInput || o.code.endsWith(cleanInput)
    );
    if (order && order.committedDate) {
      return {
        success: true,
        data: { committedDate: order.committedDate },
        readBackText: `La fecha de entrega comprometida para su pedido ${order.code} es el ${order.committedDate}.`,
      };
    }
    return {
      success: false,
      readBackText: 'No tenemos una fecha de entrega registrada para esa orden.',
      error: 'DELIVERY_DATE_NOT_FOUND',
    };
  }

  // 4. Confirmar cotización recibida
  if (queryType === 'QUOTE_CONFIRMATION') {
    const cleanInput = inputValue.trim().toUpperCase();
    const quote = caller?.quotes?.find(
      (q) => q.code.toUpperCase() === cleanInput || q.code.endsWith(cleanInput)
    );
    if (quote) {
      return {
        success: true,
        data: quote,
        readBackText: `Confirmamos que su cotización ${quote.code} está registrada por un valor de ${quote.amount} pesos.`,
      };
    }
    return {
      success: false,
      readBackText: `La cotización ${cleanInput} no fue encontrada en nuestro sistema.`,
      error: 'QUOTE_NOT_FOUND',
    };
  }

  return {
    success: false,
    readBackText: 'Consulta no soportada.',
    error: 'UNSUPPORTED_QUERY',
  };
}

/**
 * INTÉRPRETE DEL FLUJO (Puro y Testeable sin Asterisk)
 * runFlowStep avanza exactamente un paso en el grafo
 */
export function runFlowStep(
  flow: IvrFlowDefinition,
  context: IvrExecutionContext,
  inputEvent?: {
    type: 'START' | 'DTMF' | 'TIMEOUT' | 'PLAYBACK_FINISHED' | 'CRM_RESULT';
    dtmf?: string;
    crmSuccess?: boolean;
    crmData?: Record<string, any>;
  }
): IvrStepResult {
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));
  const currentNode = nodeMap.get(context.currentNodeId) || flow.nodes[0];

  if (!currentNode) {
    return {
      action: 'HANGUP',
      nodeId: 'none',
      nodeType: 'COLGAR',
      nextContext: context,
      humanReadableLog: 'No se encontró el nodo actual; colgando llamada por seguridad.',
      ended: true,
    };
  }

  const nextContext: IvrExecutionContext = {
    ...context,
    variables: { ...context.variables },
    currentRetries: { ...context.currentRetries },
    stepHistory: [...context.stepHistory],
  };

  // Registrar paso
  nextContext.stepHistory.push({
    nodeId: currentNode.id,
    nodeType: currentNode.type,
    nodeLabel: currentNode.data.label,
    enteredAt: new Date().toISOString(),
    actionTaken: inputEvent ? `${inputEvent.type} (${inputEvent.dtmf || ''})` : 'ENTER',
  });

  // 1. INICIO
  if (currentNode.type === 'INICIO') {
    const nextOutput = currentNode.data.outputs[0];
    const targetNodeId = nextOutput?.targetNodeId;
    if (targetNodeId && nodeMap.has(targetNodeId)) {
      nextContext.currentNodeId = targetNodeId;
      return {
        action: 'JUMP',
        nodeId: currentNode.id,
        nodeType: 'INICIO',
        nextContext,
        humanReadableLog: `Inicio de llamada para ${context.fromNumber}. Saltando a ${nodeMap.get(targetNodeId)?.data.label}.`,
        ended: false,
      };
    }
  }

  // 2. HORARIO
  if (currentNode.type === 'HORARIO') {
    const now = context.currentVirtualTimeBogota || new Date();
    // Evaluar estado en zona horaria America/Bogota
    const bogotaDateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const [datePart, timePart] = bogotaDateStr.split(', ');
    const [mm, dd, yyyy] = datePart.split('/');
    const [hh, min] = timePart.split(':');
    const currentMins = parseInt(hh, 10) * 60 + parseInt(min, 10);
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const holidays = getColombianHolidays(parseInt(yyyy, 10));
    const isHoliday = holidays.some((h) => h.date === isoDate);

    let branch = 'abierto';
    if (isHoliday) {
      branch = 'festivo';
    } else {
      const dayOfWeek = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10))).getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        branch = 'cerrado';
      } else if (currentMins < 450 || currentMins >= 1050) {
        // Fuera de 7:30 AM a 5:30 PM
        branch = 'cerrado';
      } else {
        branch = 'abierto';
      }
    }

    const output =
      currentNode.data.outputs.find((o) => o.label.toLowerCase() === branch) ||
      currentNode.data.outputs[0];

    const targetNode = nodeMap.get(output?.targetNodeId || '');
    if (targetNode) {
      nextContext.currentNodeId = targetNode.id;
      return {
        action: 'JUMP',
        nodeId: currentNode.id,
        nodeType: 'HORARIO',
        nextContext,
        humanReadableLog: `Horario evaluado: resultado "${branch}". Redirigiendo a "${targetNode.data.label}".`,
        ended: false,
      };
    }
  }

  // 3. LOCUCION
  if (currentNode.type === 'LOCUCION') {
    if (currentNode.data.isLegalConsent || currentNode.data.promptName === 'legal_grabacion') {
      nextContext.legalNoticePlayed = true;
    }

    if (inputEvent?.type === 'PLAYBACK_FINISHED' || (currentNode.data.isInterruptible && inputEvent?.type === 'DTMF')) {
      const nextOutput = currentNode.data.outputs[0];
      const targetNode = nodeMap.get(nextOutput?.targetNodeId || '');
      if (targetNode) {
        nextContext.currentNodeId = targetNode.id;
        return {
          action: 'JUMP',
          nodeId: currentNode.id,
          nodeType: 'LOCUCION',
          nextContext,
          humanReadableLog: `Locución "${currentNode.data.label}" completada o interrumpida. Avanzando a "${targetNode.data.label}".`,
          ended: false,
        };
      }
    }

    return {
      action: 'PLAY_PROMPT',
      nodeId: currentNode.id,
      nodeType: 'LOCUCION',
      prompt: {
        id: currentNode.data.promptId,
        filename: currentNode.data.asteriskFilename || 'fusion/saludo_general',
        text: currentNode.data.promptText,
        interruptible: Boolean(currentNode.data.isInterruptible),
      },
      nextContext,
      humanReadableLog: `Reproduciendo locución "${currentNode.data.label}" (${currentNode.data.isInterruptible ? 'interrumpible' : 'no interrumpible'}).`,
      ended: false,
    };
  }

  // 4. MENU
  if (currentNode.type === 'MENU') {
    nextContext.activeMenuDepth = (context.activeMenuDepth || 0) + 1;

    // Si viene DTMF
    if (inputEvent?.type === 'DTMF' && inputEvent.dtmf) {
      const pressed = inputEvent.dtmf;
      const match = currentNode.data.outputs.find((o) => o.label === pressed || o.id === pressed);

      if (match && match.targetNodeId && nodeMap.has(match.targetNodeId)) {
        const targetNode = nodeMap.get(match.targetNodeId)!;
        nextContext.currentNodeId = targetNode.id;
        nextContext.currentRetries[currentNode.id] = 0;
        return {
          action: 'JUMP',
          nodeId: currentNode.id,
          nodeType: 'MENU',
          nextContext,
          humanReadableLog: `Usuario presionó "${pressed}". Enrutando a "${targetNode.data.label}".`,
          ended: false,
        };
      }

      // Tecla inválida
      const currentRetries = (nextContext.currentRetries[currentNode.id] || 0) + 1;
      nextContext.currentRetries[currentNode.id] = currentRetries;
      const maxRetries = currentNode.data.maxRetries || 3;

      if (currentRetries >= maxRetries) {
        // Agotó reintentos -> acción configurada (por defecto humano o salida de error)
        const zeroOutput = currentNode.data.outputs.find((o) => o.label === '0');
        const fallbackTargetId = zeroOutput?.targetNodeId || currentNode.data.exhaustedTargetId;
        const fallbackNode = nodeMap.get(fallbackTargetId || '');

        if (fallbackNode) {
          nextContext.currentNodeId = fallbackNode.id;
          return {
            action: 'JUMP',
            nodeId: currentNode.id,
            nodeType: 'MENU',
            nextContext,
            humanReadableLog: `Agotó reintentos de menú (${maxRetries}). Derivando a salida por defecto "${fallbackNode.data.label}".`,
            ended: false,
          };
        }
      }

      return {
        action: 'PLAY_PROMPT',
        nodeId: currentNode.id,
        nodeType: 'MENU',
        prompt: {
          id: currentNode.data.invalidPromptId || 'prompt_error_opcion_invalida',
          filename: 'fusion/error_opcion_invalida',
          text: 'Opción inválida. Intente de nuevo.',
          interruptible: true,
        },
        nextContext,
        humanReadableLog: `Opción inválida "${pressed}". Reintentando menú (${currentRetries}/${maxRetries}).`,
        ended: false,
      };
    }

    // Esperar DTMF
    return {
      action: 'WAIT_DTMF',
      nodeId: currentNode.id,
      nodeType: 'MENU',
      prompt: {
        id: currentNode.data.promptId,
        filename: currentNode.data.asteriskFilename || 'fusion/saludo_general',
        text: currentNode.data.promptText,
        interruptible: true,
      },
      nextContext,
      humanReadableLog: `Menú "${currentNode.data.label}" esperando dígitos (0-9, *, #).`,
      ended: false,
    };
  }

  // 5. CAPTURA
  if (currentNode.type === 'CAPTURA') {
    const varName = currentNode.data.captureVariable || 'capturedData';
    if (inputEvent?.type === 'DTMF' && inputEvent.dtmf) {
      let buffer = (nextContext.dtmfBuffer || '') + inputEvent.dtmf;
      if (inputEvent.dtmf === '#' || (currentNode.data.maxLength && buffer.length >= currentNode.data.maxLength)) {
        const cleanVal = buffer.replace('#', '');
        nextContext.variables[varName] = cleanVal;
        nextContext.dtmfBuffer = '';

        const nextOutput = currentNode.data.outputs[0];
        const targetNode = nodeMap.get(nextOutput?.targetNodeId || '');
        if (targetNode) {
          nextContext.currentNodeId = targetNode.id;
          return {
            action: 'JUMP',
            nodeId: currentNode.id,
            nodeType: 'CAPTURA',
            nextContext,
            humanReadableLog: `Captura completada: variable ${varName} = "${cleanVal}". Avanzando a "${targetNode.data.label}".`,
            ended: false,
          };
        }
      } else {
        nextContext.dtmfBuffer = buffer;
      }
    }

    return {
      action: 'WAIT_DTMF',
      nodeId: currentNode.id,
      nodeType: 'CAPTURA',
      prompt: {
        id: currentNode.data.promptId,
        filename: currentNode.data.asteriskFilename || 'fusion/cola_espera',
        text: currentNode.data.promptText,
        interruptible: true,
      },
      nextContext,
      humanReadableLog: `Esperando captura de datos para ${varName}.`,
      ended: false,
    };
  }

  // 6. CONSULTA_CRM
  if (currentNode.type === 'CONSULTA_CRM') {
    const queryType = currentNode.data.crmQueryType || 'ORDER_STATUS';
    const inputVar = currentNode.data.queryInputVariable || 'orderNumber';
    const inputValue = nextContext.variables[inputVar] || context.fromNumber;

    if (inputEvent?.type === 'CRM_RESULT') {
      const branch = inputEvent.crmSuccess ? 'encontrado' : 'no_encontrado';
      const output =
        currentNode.data.outputs.find((o) => o.label.toLowerCase() === branch) ||
        currentNode.data.outputs[0];
      const targetNode = nodeMap.get(output?.targetNodeId || '');

      if (targetNode) {
        nextContext.currentNodeId = targetNode.id;
        return {
          action: 'JUMP',
          nodeId: currentNode.id,
          nodeType: 'CONSULTA_CRM',
          nextContext,
          humanReadableLog: `Resultado CRM: ${branch}. Avanzando a "${targetNode.data.label}".`,
          ended: false,
        };
      }
    }

    return {
      action: 'CRM_LOOKUP',
      nodeId: currentNode.id,
      nodeType: 'CONSULTA_CRM',
      crmLookup: {
        queryType,
        input: inputValue,
        allowed: queryType !== 'BALANCE_INVOICE' || Boolean(context.callerCustomer?.id),
      },
      nextContext,
      humanReadableLog: `Ejecutando consulta CRM de tipo "${queryType}" con valor "${inputValue}".`,
      ended: false,
    };
  }

  // 7. DECISION
  if (currentNode.type === 'DECISION') {
    const field = currentNode.data.conditionField || 'customer.temperature';
    let val = '';
    if (field === 'customer.temperature') {
      val = context.callerCustomer?.temperature || 'COLD';
    } else {
      val = String(context.variables[field] || '');
    }

    const targetVal = currentNode.data.conditionValue || 'VIP';
    const isMatch = val.toUpperCase() === targetVal.toUpperCase();
    const branch = isMatch ? 'si' : 'no';

    const output =
      currentNode.data.outputs.find((o) => o.label.toLowerCase() === branch) ||
      currentNode.data.outputs[0];
    const targetNode = nodeMap.get(output?.targetNodeId || '');

    if (targetNode) {
      nextContext.currentNodeId = targetNode.id;
      return {
        action: 'JUMP',
        nodeId: currentNode.id,
        nodeType: 'DECISION',
        nextContext,
        humanReadableLog: `Decisión "${field} == ${targetVal}": resultado ${branch}. Avanzando a "${targetNode.data.label}".`,
        ended: false,
      };
    }
  }

  // 8. IR_A_COLA
  if (currentNode.type === 'IR_A_COLA') {
    return {
      action: 'ROUTE_QUEUE',
      nodeId: currentNode.id,
      nodeType: 'IR_A_COLA',
      target: { queueId: currentNode.data.queueId },
      nextContext,
      humanReadableLog: `Transfiriendo llamada a la cola de atención "${currentNode.data.queueName || currentNode.data.queueId}".`,
      ended: true,
    };
  }

  // 9. IR_A_EXTENSION
  if (currentNode.type === 'IR_A_EXTENSION') {
    return {
      action: 'ROUTE_EXTENSION',
      nodeId: currentNode.id,
      nodeType: 'IR_A_EXTENSION',
      target: { extension: currentNode.data.extension },
      nextContext,
      humanReadableLog: `Timbrando directamente a la extensión interna "${currentNode.data.extension}".`,
      ended: true,
    };
  }

  // 10. IR_A_AGENTE_IA
  if (currentNode.type === 'IR_A_AGENTE_IA') {
    return {
      action: 'ROUTE_AI',
      nodeId: currentNode.id,
      nodeType: 'IR_A_AGENTE_IA',
      nextContext,
      humanReadableLog: 'Entregando la llamada a la sesión del Agente de Voz con IA (Sub-Etapa 17.7).',
      ended: true,
    };
  }

  // 11. BUZON
  if (currentNode.type === 'BUZON') {
    return {
      action: 'RECORD_VOICEMAIL',
      nodeId: currentNode.id,
      nodeType: 'BUZON',
      prompt: {
        id: currentNode.data.promptId || 'prompt_buzon_invitacion',
        filename: 'fusion/buzon_invitacion',
        text: 'Por favor deje su mensaje después del tono.',
        interruptible: false,
      },
      nextContext,
      humanReadableLog: 'Iniciando grabación de mensaje en el buzón de voz.',
      ended: true,
    };
  }

  // 12. TRANSFERIR_EXTERNO
  if (currentNode.type === 'TRANSFERIR_EXTERNO') {
    return {
      action: 'TRANSFER_EXTERNAL',
      nodeId: currentNode.id,
      nodeType: 'TRANSFERIR_EXTERNO',
      target: { externalNumber: currentNode.data.externalNumber },
      nextContext,
      humanReadableLog: `Transfiriendo a número externo "${currentNode.data.externalNumber}".`,
      ended: true,
    };
  }

  // 13. DEVOLVER_LLAMADA
  if (currentNode.type === 'DEVOLVER_LLAMADA') {
    return {
      action: 'SCHEDULE_CALLBACK',
      nodeId: currentNode.id,
      nodeType: 'DEVOLVER_LLAMADA',
      nextContext,
      humanReadableLog: `Agendada devolución automática de llamada para ${context.fromNumber}.`,
      ended: true,
    };
  }

  // 14. NO_LLAMAR
  if (currentNode.type === 'NO_LLAMAR') {
    return {
      action: 'ADD_DO_NOT_CALL',
      nodeId: currentNode.id,
      nodeType: 'NO_LLAMAR',
      nextContext,
      humanReadableLog: `Número ${context.fromNumber} registrado en lista de exclusión No Llamar (DNC).`,
      ended: true,
    };
  }

  // 15. COLGAR
  return {
    action: 'HANGUP',
    nodeId: currentNode.id,
    nodeType: 'COLGAR',
    prompt: currentNode.data.promptId
      ? {
          id: currentNode.data.promptId,
          filename: currentNode.data.asteriskFilename || 'fusion/despedida',
          text: currentNode.data.promptText || 'Gracias por su llamada. Hasta luego.',
          interruptible: false,
        }
      : undefined,
    nextContext,
    humanReadableLog: `Llamada finalizada por el nodo de COLGAR ("${currentNode.data.label}").`,
    ended: true,
  };
}
