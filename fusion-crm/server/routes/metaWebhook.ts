import { Router } from 'express';
import type { ChannelKind } from '../../packages/core/src/omnichannel';
import { metaVerifyToken, requireMetaSignature } from '../security/metaSignature';
import { omnichannel } from '../omnichannel/runtime';
import type { InboundMessage } from '../omnichannel/service';

export const metaWebhookRouter = Router();

export interface DeliveryUpdate {
  externalId: string;
  status: 'delivered' | 'read' | 'failed';
  error?: string;
}

const MEDIA_LABEL: Record<string, string> = {
  image: 'una imagen',
  audio: 'un audio',
  voice: 'una nota de voz',
  video: 'un video',
  document: 'un documento',
  sticker: 'un sticker',
  location: 'una ubicación',
  contacts: 'un contacto',
};

/** Traduce el cuerpo del webhook de Meta a mensajes entrantes y actualizaciones de entrega. */
export function parseMetaWebhook(body: any): { messages: InboundMessage[]; statuses: DeliveryUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: DeliveryUpdate[] = [];

  for (const entry of body?.entry ?? []) {
    // WhatsApp Cloud API
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const names = new Map<string, string>((value.contacts ?? []).map((c: any) => [String(c.wa_id), String(c.profile?.name || '')]));
      for (const m of value.messages ?? []) {
        let text = '';
        if (m.type === 'text') text = m.text?.body ?? '';
        else if (m.type === 'button') text = m.button?.text ?? '';
        else if (m.type === 'interactive') text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '';
        else {
          const caption = m[m.type]?.caption ? `: ${m[m.type].caption}` : '';
          text = `[El cliente envió ${MEDIA_LABEL[m.type] || 'un archivo'}${caption}]`;
        }
        if (!m.from || !text) continue;
        messages.push({ channel: 'whatsapp', externalUserId: String(m.from), contactName: names.get(String(m.from)) || null, text, externalId: m.id ?? null });
      }
      for (const s of value.statuses ?? []) {
        if (!s?.id || !['delivered', 'read', 'failed'].includes(s.status)) continue;
        statuses.push({ externalId: String(s.id), status: s.status, error: s.errors?.[0]?.title || s.errors?.[0]?.message });
      }
    }

    // Messenger / Instagram
    const channel: ChannelKind = body?.object === 'instagram' ? 'instagram' : 'messenger';
    for (const ev of entry?.messaging ?? []) {
      if (ev?.message?.is_echo) continue; // copia de nuestros propios envíos
      const text = ev?.message?.text ?? (ev?.message?.attachments?.length ? '[El cliente envió un archivo adjunto]' : ev?.postback?.title ?? '');
      if (!ev?.sender?.id || !text) continue;
      messages.push({ channel, externalUserId: String(ev.sender.id), contactName: null, text, externalId: ev?.message?.mid ?? null });
    }
  }
  return { messages, statuses };
}

// Verificación de la suscripción (Meta hace un GET al configurar el webhook)
metaWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = metaVerifyToken();

  if (mode && token) {
    if (mode === 'subscribe' && expected && token === expected) {
      console.log('[meta-webhook] Suscripción verificada');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Eventos entrantes: se responde 200 de inmediato (Meta reintenta si tarda) y se procesan después
metaWebhookRouter.post('/', requireMetaSignature, (req, res) => {
  const body = req.body;
  if (!['whatsapp_business_account', 'page', 'instagram'].includes(body?.object)) return res.sendStatus(404);
  res.status(200).send('EVENT_RECEIVED');

  const { messages, statuses } = parseMetaWebhook(body);
  const svc = omnichannel();
  void (async () => {
    for (const m of messages) {
      try {
        await svc.handleInbound(m);
      } catch (err) {
        console.error(`[meta-webhook] Error procesando mensaje de ${m.channel}:`, err);
      }
    }
    for (const s of statuses) {
      try {
        await svc.updateDeliveryStatus(s.externalId, s.status, s.error);
      } catch (err) {
        console.error('[meta-webhook] Error actualizando estado de entrega:', err);
      }
    }
  })();
});
