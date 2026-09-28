import type { ChannelKind } from '../../packages/core/src/omnichannel';

/**
 * Envío de mensajes a los canales de Meta (Graph API).
 *
 * Variables:
 * - WhatsApp Cloud API: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 * - Messenger / Instagram: MESSENGER_PAGE_ACCESS_TOKEN (token de la página conectada a Instagram)
 * - META_GRAPH_VERSION (por defecto v21.0)
 *
 * El chat web y el simulador no necesitan envío: el cliente lee la conversación guardada.
 */
export interface SendResult {
  ok: boolean;
  externalId?: string | null;
  error?: string;
}

export interface TemplateMessage {
  /** Nombre de la plantilla aprobada en Meta. */
  name: string;
  language: string;
  /** Valores de las variables {{1}}, {{2}}… del cuerpo, en orden. */
  bodyParams: string[];
}

export interface ChannelSender {
  sendText(channel: ChannelKind, to: string, text: string): Promise<SendResult>;
  sendTemplate(channel: ChannelKind, to: string, template: TemplateMessage): Promise<SendResult>;
  isConfigured(channel: ChannelKind): boolean;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
}>;

const graphBase = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`;

function explain(status: number, body: any): string {
  const err = body?.error;
  if (!err) return `HTTP ${status}`;
  // 131047: fuera de la ventana de 24 h (hay que usar plantilla)
  if (err.code === 131047 || err.error_data?.details?.includes?.('24 hours')) {
    return 'Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp exige una plantilla aprobada';
  }
  if (err.code === 190) return 'Token de Meta vencido o inválido';
  return `${err.message || 'Error de Meta'}${err.code ? ` (código ${err.code})` : ''}`;
}

export function createMetaSender(fetchImpl: FetchLike = fetch as any): ChannelSender {
  const post = async (url: string, token: string, payload: unknown): Promise<SendResult> => {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: explain(res.status, body) };
      return { ok: true, externalId: body?.messages?.[0]?.id ?? body?.message_id ?? null };
    } catch (err: any) {
      return { ok: false, error: `Sin conexión con Meta: ${err?.message || err}` };
    }
  };

  const wa = () => ({ id: process.env.WHATSAPP_PHONE_NUMBER_ID || '', token: process.env.WHATSAPP_ACCESS_TOKEN || '' });
  const pageToken = () => process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';

  const sender: ChannelSender = {
    isConfigured(channel) {
      if (channel === 'whatsapp') return !!(wa().id && wa().token);
      if (channel === 'messenger' || channel === 'instagram') return !!pageToken();
      return true;
    },

    async sendText(channel, to, text) {
      if (channel === 'webchat' || channel === 'simulator') return { ok: true, externalId: null };
      if (!sender.isConfigured(channel)) return { ok: false, error: `El canal ${channel} no está configurado (ver DEPLOY.md → Canales)` };
      if (channel === 'whatsapp') {
        return post(`${graphBase()}/${wa().id}/messages`, wa().token, {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: true, body: text.slice(0, 4096) },
        });
      }
      // Messenger e Instagram usan la Send API de la página
      return post(`${graphBase()}/me/messages`, pageToken(), {
        recipient: { id: to },
        messaging_type: 'RESPONSE',
        message: { text: text.slice(0, 2000) },
      });
    },

    async sendTemplate(channel, to, template) {
      if (channel !== 'whatsapp') return sender.sendText(channel, to, template.bodyParams.join(' '));
      if (!sender.isConfigured('whatsapp')) return { ok: false, error: 'WhatsApp no está configurado' };
      return post(`${graphBase()}/${wa().id}/messages`, wa().token, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: template.bodyParams.length
            ? [{ type: 'body', parameters: template.bodyParams.map((text) => ({ type: 'text', text })) }]
            : [],
        },
      });
    },
  };
  return sender;
}
