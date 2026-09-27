import {
  classifyIntent,
  handoffTrigger,
  handoffMessage,
  isWithinBusinessHours,
  matchClientByPhone,
  extractNits,
  extractOrderNumbers,
  normalizeNit,
  orderDigits,
  type AgentKey,
  type ClientRecord,
  type Conversation,
  type Intent,
  type OmnichannelConfig,
} from '../../packages/core/src/omnichannel';
import { projectBelongsToClient, toClientProjectView } from '../../packages/core/src/portal/clientProgress';
import { closedByCalendar } from '../services/workCalendarCheck';
import { examplesBlock } from './learning';
import type { ChatTurn, LlmClient, ToolCallRecord, ToolDeclaration } from './llm';

/** Datos y acciones del sistema que los agentes pueden usar. */
export interface AgentDeps {
  llm: LlmClient;
  listClients(): Promise<ClientRecord[]>;
  listProjects(): Promise<any[]>;
  listQuotes(): Promise<any[]>;
  /** Crea (una vez) un enlace del portal de avance para el cliente y devuelve la ruta /portal/… */
  createPortalLink(client: { name: string; nit: string }): Promise<string>;
  createPreQuote(input: { conversation: { sender: string; content: string }[]; customer: any; channel: string }): Promise<{ number: string }>;
  appUrl: string;
  now(): Date;
  /** Correcciones del equipo para usar como ejemplos (aprendizaje). */
  examples?(agent: 'servicio' | 'comercial'): Promise<{ question: string; finalText: string | null }[]>;
}

export type IdentityPatch = Pick<Conversation, 'clientId' | 'clientName' | 'clientNit' | 'verified' | 'verifiedBy'>;

export interface AgentOutcome {
  intent: Intent;
  agent: AgentKey;
  reply: string;
  handoff: { reason: string } | null;
  identity: IdentityPatch | null;
  portalPath: string | null;
  preQuoteNumber: string | null;
  toolCalls: ToolCallRecord[];
}

// ── Verificación del cliente ─────────────────────────────────────

/**
 * - WhatsApp: el número lo verifica Meta; si está registrado en un solo cliente, queda verificado.
 * - Cualquier canal: NIT + número de pedido que coincidan entre sí (dos datos, para que no baste
 *   con adivinar un consecutivo).
 */
export function resolveIdentity(
  conv: Pick<Conversation, 'channel' | 'externalUserId' | 'verified'>,
  text: string,
  clients: ClientRecord[],
  projects: any[],
  quotes: any[]
): IdentityPatch | null {
  if (conv.verified) return null;

  if (conv.channel === 'whatsapp') {
    const c = matchClientByPhone(clients, conv.externalUserId);
    if (c) {
      return { clientId: c.id, clientName: String(c.name || c.company || ''), clientNit: String(c.nit || ''), verified: true, verifiedBy: 'phone' };
    }
  }

  const nits = extractNits(text);
  const orders = extractOrderNumbers(text);
  if (!nits.length || !orders.length) return null;

  const quotesById = new Map(quotes.map((q) => [String(q.id), q]));
  for (const p of projects) {
    const quote = p?.quoteId ? quotesById.get(String(p.quoteId)) : undefined;
    const numbers = [p?.number, p?.otNumber, quote?.number].map(orderDigits).filter(Boolean);
    if (!numbers.some((n) => orders.includes(n))) continue;
    const nit = normalizeNit(quote?.clientNit ?? p?.clientNit);
    if (!nit || !nits.includes(nit)) continue;
    const client = clients.find((c) => normalizeNit(c.nit) === nit);
    return {
      clientId: client?.id ?? null,
      clientName: String(client?.name ?? quote?.clientName ?? p?.client ?? ''),
      clientNit: String(client?.nit ?? quote?.clientNit ?? p?.clientNit ?? ''),
      verified: true,
      verifiedBy: 'order',
    };
  }
  return null;
}

/** Pedidos del cliente verificado, en la vista segura del portal (sin costos ni notas internas). */
export function customerOrders(identity: { clientName: string | null; clientNit: string | null }, projects: any[], quotes: any[]) {
  const quotesById = new Map(quotes.map((q) => [String(q.id), q]));
  const who = { nit: identity.clientNit || '', name: identity.clientName || '' };
  return projects
    .filter((p) => projectBelongsToClient(p, p?.quoteId ? quotesById.get(String(p.quoteId)) : undefined, who))
    .map((p) => toClientProjectView(p))
    .sort((a, b) => Number(a.isDelivered) - Number(b.isDelivered) || String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .slice(0, 10);
}

// ── Herramientas ────────────────────────────────────────────────

const TOOL_ESCALAR: ToolDeclaration = {
  name: 'escalar_a_humano',
  description:
    'Pasa la conversación a una persona del equipo. Úsala si el cliente está molesto, si pide algo que no puedes resolver con tus herramientas, si hay dudas de pagos o facturas, o si no estás seguro de la respuesta.',
  parameters: { type: 'OBJECT', properties: { motivo: { type: 'STRING', description: 'Motivo breve para la persona que atenderá' } }, required: ['motivo'] },
};

const TOOL_PEDIDOS: ToolDeclaration = {
  name: 'consultar_mis_pedidos',
  description:
    'Devuelve los pedidos (órdenes de trabajo) del cliente con quien hablas: etapa actual, porcentaje de avance, fecha de entrega prevista y el enlace para ver el avance. Solo funciona si el cliente está verificado.',
  parameters: { type: 'OBJECT', properties: {} },
};

const TOOL_VERIFICAR: ToolDeclaration = {
  name: 'verificar_cliente',
  description:
    'Verifica la identidad del cliente con su NIT o cédula y el número de uno de sus pedidos (OT o cotización). Pide ambos datos antes de llamarla.',
  parameters: {
    type: 'OBJECT',
    properties: {
      nit: { type: 'STRING', description: 'NIT o cédula tal como la escribió el cliente' },
      numero_pedido: { type: 'STRING', description: 'Número de OT, pedido o cotización' },
    },
    required: ['nit', 'numero_pedido'],
  },
};

const TOOL_SOLICITUD: ToolDeclaration = {
  name: 'registrar_solicitud_cotizacion',
  description:
    'Registra la solicitud de cotización para que un asesor la revise y le envíe precios. Llámala cuando ya tengas al menos: qué producto necesita, cantidad y medidas o formato. Incluye todo lo que el cliente haya dicho.',
  parameters: {
    type: 'OBJECT',
    properties: {
      resumen: { type: 'STRING', description: 'Resumen de lo que necesita el cliente' },
      empresa_o_nombre: { type: 'STRING', description: 'Empresa o nombre del cliente, si lo dijo' },
      correo: { type: 'STRING', description: 'Correo, si lo dio' },
    },
    required: ['resumen'],
  },
};

const AGENT_TOOLS: Record<'servicio' | 'comercial', ToolDeclaration[]> = {
  servicio: [TOOL_PEDIDOS, TOOL_VERIFICAR, TOOL_ESCALAR],
  comercial: [TOOL_SOLICITUD, TOOL_PEDIDOS, TOOL_VERIFICAR, TOOL_ESCALAR],
};

function systemPrompt(agent: 'servicio' | 'comercial', conv: Conversation, config: OmnichannelConfig, withinHours: boolean): string {
  const who = conv.verified
    ? `Hablas con ${conv.clientName || 'un cliente'} (identidad verificada).`
    : 'El cliente NO está verificado: no compartas información de pedidos hasta verificarlo con la herramienta verificar_cliente (NIT + número de pedido).';
  const role =
    agent === 'servicio'
      ? 'Eres el agente de servicio al cliente. Resuelves consultas sobre el estado de pedidos y preguntas generales.'
      : 'Eres el agente comercial. Ayudas a cotizar: preguntas qué producto necesita, cantidad, medidas o formato, material, impresión (a color o no), acabados, fecha deseada y si tiene archivos de diseño. Cuando tengas lo necesario, registra la solicitud; un asesor enviará los precios.';
  return `${role}
Trabajas para ${config.businessName}, empresa de impresión y comunicación gráfica en Colombia.
${who}
Canal: ${conv.channel}. Responde en español de Colombia, cordial y breve (estilo chat: 1 a 4 frases, sin markdown ni tablas).
${withinHours ? 'Estamos en horario de atención.' : 'Estamos fuera del horario de atención: si hace falta una persona, di que responderá en el próximo horario.'}

REGLAS:
- Usa SOLO la información de las herramientas y del conocimiento del negocio. Si no la tienes, dilo y ofrece pasar con una persona. Nunca inventes estados, fechas ni precios.
- Nunca des información de otros clientes.
- No des precios: las cotizaciones las revisa y envía un asesor.
- ${config.forbidden}
- Si el cliente está molesto, reclama, habla de pagos o pide una persona, usa escalar_a_humano.

CONOCIMIENTO DEL NEGOCIO:
${config.knowledge || '(sin información adicional configurada)'}`;
}

function historyFor(conv: Conversation): ChatTurn[] {
  // Últimos mensajes relevantes, sin el entrante (se envía aparte) ni sugerencias descartadas
  const relevant = conv.messages.filter((m) => m.status !== 'discarded' && m.status !== 'failed').slice(-20, -1);
  const turns: ChatTurn[] = [];
  for (const m of relevant) {
    const role: ChatTurn['role'] = m.author === 'customer' ? 'user' : 'model';
    if (turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].text += `\n${m.text}`;
    else turns.push({ role, text: m.text });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

const FALLBACK_REPLY = 'Gracias por escribirnos. Una persona de nuestro equipo te responderá por este chat en breve.';

/**
 * Un turno de atención: el recepcionista clasifica y verifica, y el agente especialista responde
 * usando sus herramientas. Nunca lanza: ante cualquier error, deja el caso a una persona.
 */
export async function runAgentTurn(conv: Conversation, text: string, config: OmnichannelConfig, deps: AgentDeps): Promise<AgentOutcome> {
  const withinHours = isWithinBusinessHours(config.businessHours, deps.now(), closedByCalendar);
  const outcome: AgentOutcome = {
    intent: 'otro',
    agent: 'recepcionista',
    reply: '',
    handoff: null,
    identity: null,
    portalPath: conv.portalPath,
    preQuoteNumber: null,
    toolCalls: [],
  };

  // 1. Reglas fijas: pedido de persona, queja o pago → directo a humano
  const trigger = handoffTrigger(text);
  if (trigger) {
    return { ...outcome, intent: trigger.intent, handoff: { reason: trigger.reason }, reply: handoffMessage(withinHours) };
  }

  try {
    const [clients, projects, quotes] = await Promise.all([deps.listClients(), deps.listProjects(), deps.listQuotes()]);

    // 2. Verificación automática (número de WhatsApp registrado, o NIT + pedido en el mensaje)
    const identity = resolveIdentity(conv, text, clients, projects, quotes);
    let current: Conversation = identity ? { ...conv, ...identity } : conv;
    if (identity) outcome.identity = identity;

    // 3. Recepcionista: intención
    let intent: Intent = classifyIntent(text);
    if (intent === 'otro' && conv.lastIntent === 'cotizacion') intent = 'cotizacion'; // sigue la conversación comercial
    outcome.intent = intent;
    const agent: 'servicio' | 'comercial' = intent === 'cotizacion' ? 'comercial' : 'servicio';
    outcome.agent = agent;

    // 4. Agente especialista con herramientas
    const executeTool = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      switch (name) {
        case 'escalar_a_humano':
          outcome.handoff = { reason: String(args.motivo || 'La IA pidió apoyo') };
          return { ok: true, instruccion: 'Dile al cliente que una persona continuará la conversación por este chat.' };

        case 'verificar_cliente': {
          const found = resolveIdentity({ ...current, verified: false }, `${args.nit ?? ''} pedido ${args.numero_pedido ?? ''}`, clients, projects, quotes);
          if (!found) return { verificado: false, instruccion: 'Los datos no coinciden. Pide revisar el NIT y el número de pedido; si no los tiene, ofrece pasar con una persona.' };
          current = { ...current, ...found };
          outcome.identity = found;
          return { verificado: true, cliente: found.clientName };
        }

        case 'consultar_mis_pedidos': {
          if (!current.verified) {
            return { error: 'cliente_no_verificado', instruccion: 'Pide el NIT o cédula y el número de uno de sus pedidos para verificarlo.' };
          }
          const orders = customerOrders(current, projects, quotes);
          if (!outcome.portalPath && orders.length) {
            outcome.portalPath = await deps.createPortalLink({ name: current.clientName || '', nit: current.clientNit || '' });
          }
          return {
            pedidos: orders.map((o) => ({
              numero: o.number,
              nombre: o.name,
              etapa: o.currentStep.label,
              detalle_etapa: o.currentStep.description,
              avance: `${o.percent}%`,
              entrega_prevista: o.dueDate,
              entregado: o.isDelivered,
            })),
            enlace_avance: outcome.portalPath ? `${deps.appUrl}${outcome.portalPath}` : null,
          };
        }

        case 'registrar_solicitud_cotizacion': {
          const transcript = [...current.messages, { author: 'customer', text }]
            .filter((m: any) => m.status !== 'discarded')
            .map((m: any) => ({ sender: m.author === 'customer' ? 'user' : 'agent', content: m.text }));
          const customer = current.verified
            ? { id: current.clientId, name: current.clientName, nit: current.clientNit }
            : { name: String(args.empresa_o_nombre || current.contactName || ''), email: String(args.correo || ''), phone: current.channel === 'whatsapp' ? current.externalUserId : '' };
          const pre = await deps.createPreQuote({
            conversation: [...transcript, { sender: 'agent', content: `Resumen: ${String(args.resumen || '')}` }],
            customer,
            channel: current.channel,
          });
          outcome.preQuoteNumber = pre.number;
          return { registrada: true, numero: pre.number, instruccion: 'Confirma que un asesor revisará la solicitud y le enviará la cotización por este chat.' };
        }

        default:
          return { error: `Herramienta desconocida: ${name}` };
      }
    };

    const examples = config.learnFromCorrections && deps.examples ? await deps.examples(agent).catch(() => []) : [];
    const result = await deps.llm.runWithTools({
      system: systemPrompt(agent, current, config, withinHours) + examplesBlock(examples),
      history: historyFor(current),
      message: text,
      tools: AGENT_TOOLS[agent],
      executeTool,
    });
    outcome.toolCalls = result.toolCalls;
    outcome.reply = result.text || (outcome.handoff ? handoffMessage(withinHours) : '');

    if (!outcome.reply) {
      outcome.handoff = outcome.handoff ?? { reason: 'La IA no generó respuesta' };
      outcome.reply = FALLBACK_REPLY;
    }
    return outcome;
  } catch (err: any) {
    console.error('[omnicanal] Error de la IA; el caso pasa a una persona:', err?.message || err);
    return { ...outcome, handoff: { reason: `La IA falló: ${String(err?.message || err).slice(0, 120)}` }, reply: FALLBACK_REPLY };
  }
}
