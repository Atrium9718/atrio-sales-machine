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
const COMPLAINT =
  /\b(queja|reclamo|demanda|pesimo|terrible|inaceptable|estafa|devolucion|reembolso|denuncia|abogado|super ?intendencia|garantia|molest[oa]s?|enojad[oa]s?|furios[oa]s?|indignad[oa]s?|disgustad[oa]s?|decepcionad[oa]s?|danad[oa]s?|defectuos[oa]s?|mal hech[oa]s?|nadie (me )?(responde|contesta)|no (me )?(responden|contestan)|cancelar (el |mi )?pedido)\b|lleg[oa]r?o?n? (mal|roto|rota|incomplet)/;
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
  /** Avisos automáticos al cliente cuando su pedido cambia de etapa. */
  notifications: NotificationSettings;
  /** Tope mensual de gasto en IA y mensajería (pesos). Avisa al 80% y al 100%. */
  budget: { monthlyCop: number | null; pauseAiAtLimit: boolean };
  /** Usa las correcciones del equipo como ejemplos para la IA. */
  learnFromCorrections: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  /** Etapas que generan aviso (claves de CLIENT_PROGRESS_STEPS). */
  stages: string[];
  /** Plantilla aprobada en Meta por etapa (para escribir fuera de la ventana de 24 h). */
  templates: Record<string, string>;
  templateLanguage: string;
  /** Franja en la que se envían avisos (hora de Colombia); fuera de ella esperan. */
  sendFrom: string;
  sendUntil: string;
}

export const DEFAULT_OMNICHANNEL_CONFIG: OmnichannelConfig = {
  aiMode: 'suggest',
  autoIntents: [],
  businessName: 'Fusión Comunicación Gráfica',
  businessHours: { days: [1, 2, 3, 4, 5, 6], start: '08:00', end: '18:00' },
  knowledge: '',
  forbidden: 'No prometer fechas de entrega que no estén en el sistema. No dar descuentos. No confirmar precios finales: solo precotizaciones que revisa un asesor.',
  escalationEmployeeIds: [],
  notifications: {
    enabled: false,
    stages: ['EN_PRODUCCION', 'FINALIZADO', 'ENTREGADO'],
    // Una sola plantilla para todas las etapas (ver DEPLOY.md → 8.7); se puede cambiar por etapa
    templates: {
      POR_REVISAR: 'actualizacion_pedido',
      PRODUCCION_PROGRAMADA: 'actualizacion_pedido',
      EN_PRODUCCION: 'actualizacion_pedido',
      ACABADOS: 'actualizacion_pedido',
      FINALIZADO: 'actualizacion_pedido',
      ENTREGADO: 'actualizacion_pedido',
    },
    templateLanguage: 'es',
    sendFrom: '07:30',
    sendUntil: '19:30',
  },
  budget: { monthlyCop: null, pauseAiAtLimit: false },
  learnFromCorrections: true,
};

/** ¿Está dentro del horario de atención humana? (zona horaria de Bogotá, UTC-5 sin horario de verano). */
export function isWithinBusinessHours(hours: OmnichannelConfig['businessHours'], now = new Date(), isClosedDay?: (ymd: string) => boolean): boolean {
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  // Festivos y cierres del calendario laboral
  if (isClosedDay?.(bogota.toISOString().slice(0, 10))) return false;
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


const bogotaMinutes = (now: Date) => {
  const b = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return b.getUTCHours() * 60 + b.getUTCMinutes();
};
const hhmm = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Próximo momento permitido para enviar un aviso (ahora mismo si está dentro de la franja). */
export function nextSendTime(settings: Pick<NotificationSettings, 'sendFrom' | 'sendUntil'>, now = new Date()): Date {
  const mins = bogotaMinutes(now);
  const from = hhmm(settings.sendFrom);
  const until = hhmm(settings.sendUntil);
  if (mins >= from && mins < until) return now;
  const wait = mins < from ? from - mins : 24 * 60 - mins + from;
  const next = new Date(now.getTime() + wait * 60 * 1000);
  next.setUTCSeconds(0, 0);
  return next;
}

const OPT_OUT = /^(stop|basta|baja|cancelar suscripcion|no (me )?(envien|manden|escriban) (mas )?(mensajes|avisos|notificaciones)|no quiero (recibir )?(mas )?(mensajes|avisos|notificaciones))\b/;
const OPT_IN = /^(reactivar|quiero recibir (los )?(avisos|mensajes|notificaciones)|alta)\b/;

/** El cliente pide dejar de recibir (o volver a recibir) avisos automáticos. */
export function optOutIntent(text: string): 'out' | 'in' | null {
  const t = norm(text).trim().replace(/[.!¡]+$/g, '');
  if (OPT_OUT.test(t)) return 'out';
  if (OPT_IN.test(t)) return 'in';
  return null;
}

/** Texto del aviso de cambio de etapa (el mismo contenido que las plantillas de WhatsApp). */
export function stageNoticeText(p: { name: string; orderNumber: string; stepLabel: string; stepDescription: string; link: string | null; businessName: string }): string {
  const hello = p.name ? `Hola ${p.name}` : 'Hola';
  const link = p.link ? ` Puedes ver el avance aquí: ${p.link}` : '';
  return `${hello} 👋 Tu pedido ${p.orderNumber} de ${p.businessName} avanzó a: *${p.stepLabel}*. ${p.stepDescription}${link}`;
}
