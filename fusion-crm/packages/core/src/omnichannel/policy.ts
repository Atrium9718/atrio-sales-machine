import type { Conversation, ConversationMessage } from './types';

/** Máximo de mensajes guardados por conversación (los más antiguos se descartan). */
export const MAX_STORED_MESSAGES = 300;

/** WhatsApp solo permite texto libre hasta 24 h después del último mensaje del cliente. */
export const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function withinCustomerWindow(conv: Pick<Conversation, 'channel' | 'lastInboundAt'>, now = Date.now()): boolean {
  if (conv.channel !== 'whatsapp' && conv.channel !== 'messenger' && conv.channel !== 'instagram') return true;
  if (!conv.lastInboundAt) return false;
  return now - new Date(conv.lastInboundAt).getTime() < WHATSAPP_WINDOW_MS;
}

export function appendMessage(messages: ConversationMessage[], msg: ConversationMessage): ConversationMessage[] {
  const next = [...messages, msg];
  return next.length > MAX_STORED_MESSAGES ? next.slice(next.length - MAX_STORED_MESSAGES) : next;
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const HUMAN_REQUEST = /\b(asesor|humano|persona|alguien real|hablar con (alguien|una persona|un asesor)|agente real|operador)\b/;
const COMPLAINT = /\b(queja|reclamo|demanda|pesimo|terrible|inaceptable|estafa|devolucion|reembolso|denuncia|abogado|super ?intendencia)\b/;
const PAYMENT = /\b(pague|pago|pagar|consignacion|consigne|transferencia|factura|abono|anticipo|comprobante)\b/;

/**
 * Motivos para pasar la conversación a una persona sin preguntarle a la IA.
 * La IA puede escalar además por su cuenta (herramienta escalar_a_humano).
 */
export function handoffTrigger(text: string): { reason: string; intent: 'humano' | 'queja' | 'pago' } | null {
  const t = norm(text);
  if (HUMAN_REQUEST.test(t)) return { reason: 'El cliente pidió hablar con una persona', intent: 'humano' };
  if (COMPLAINT.test(t)) return { reason: 'Posible queja o reclamo', intent: 'queja' };
  if (PAYMENT.test(t)) return { reason: 'Tema de pagos o facturación', intent: 'pago' };
  return null;
}

/** Texto que recibe el cliente cuando su caso pasa a una persona. */
export function handoffMessage(withinHours: boolean): string {
  return withinHours
    ? 'Te comunico con una persona de nuestro equipo; en un momento te responde por este mismo chat.'
    : 'Un asesor de nuestro equipo te responderá por este chat en nuestro próximo horario de atención. Ya dejé tu caso registrado.';
}

/** Configuración del módulo (editable desde la app). */
export interface OmnichannelConfig {
  /** off: la IA no responde · suggest: propone y una persona aprueba · auto: responde sola. */
  aiMode: 'off' | 'suggest' | 'auto';
  /** En modo auto, intenciones que la IA atiende sola (el resto queda como sugerencia). Vacío = todas. */
  autoIntents: string[];
  businessName: string;
  /** Horario de atención humana (hora de Colombia). days: 0=domingo … 6=sábado. */
  businessHours: { days: number[]; start: string; end: string };
  /** Conocimiento del negocio para la IA: horarios, tiempos de entrega, políticas, preguntas frecuentes. */
  knowledge: string;
  /** Lo que la IA nunca debe decir o prometer. */
  forbidden: string;
  /** Personas que reciben los casos escalados (ids de empleado). */
  escalationEmployeeIds: string[];
}

export const DEFAULT_OMNICHANNEL_CONFIG: OmnichannelConfig = {
  aiMode: 'suggest',
  autoIntents: [],
  businessName: 'Fusión Comunicación Gráfica',
  businessHours: { days: [1, 2, 3, 4, 5, 6], start: '08:00', end: '18:00' },
  knowledge: '',
  forbidden: 'No prometer fechas de entrega que no estén en el sistema. No dar descuentos. No confirmar precios finales: solo precotizaciones que revisa un asesor.',
  escalationEmployeeIds: [],
};

/** ¿Está dentro del horario de atención humana? (zona horaria de Bogotá, UTC-5 sin horario de verano). */
export function isWithinBusinessHours(hours: OmnichannelConfig['businessHours'], now = new Date()): boolean {
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const day = bogota.getUTCDay();
  if (!hours.days.includes(day)) return false;
  const minutes = bogota.getUTCHours() * 60 + bogota.getUTCMinutes();
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  return minutes >= toMin(hours.start) && minutes < toMin(hours.end);
}

/** ¿La IA puede enviar esta respuesta sin aprobación humana? */
export function canAutoSend(config: OmnichannelConfig, intent: string | null): boolean {
  if (config.aiMode !== 'auto') return false;
  if (!config.autoIntents.length) return true;
  return !!intent && config.autoIntents.includes(intent);
}

/**
 * Recepcionista: intención del mensaje con reglas simples (sin costo de IA).
 * Devuelve 'otro' cuando no está claro; ahí decide el modelo.
 */
export function classifyIntent(text: string): 'estado_pedido' | 'cotizacion' | 'saludo' | 'otro' {
  const t = norm(text).trim();
  const order = /\b(pedido|orden|ot\b|ot-?\d|como va|estado|avance|ya esta listo|esta listo|entrega|cuando (llega|esta|me entregan)|despacho|seguimiento)\b/;
  const quote = /\b(cotiz\w*|precio|cuanto (cuesta|vale|sale|cobran)|valor de|necesito (imprimir|hacer|mandar a hacer)|quisiera (imprimir|hacer|cotizar)|me pueden hacer|tarjetas|volantes|pendones|cajas|etiquetas|afiches|plegables|stickers|catalogos)\b/;
  if (order.test(t)) return 'estado_pedido';
  if (quote.test(t)) return 'cotizacion';
  if (/^(hola|buen(os|as)( dias| tardes| noches)?|saludos|hey|que tal)\b/.test(t) && t.length < 40) return 'saludo';
  return 'otro';
}
