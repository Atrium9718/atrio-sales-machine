import nodemailer from 'nodemailer';

/**
 * Envío del código de ingreso al portal del cliente.
 *
 * - WhatsApp: WhatsApp exige una plantilla de categoría **Autenticación** aprobada en Meta
 *   (PORTAL_CODE_TEMPLATE, por defecto `codigo_acceso`), con el botón "Copiar código".
 *   Usa las mismas credenciales de la Bandeja (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN).
 * - Correo: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 */

export interface CodeSendResult {
  ok: boolean;
  error?: string;
}

export interface LoginCodeSender {
  whatsappReady(): boolean;
  emailReady(): boolean;
  sendWhatsApp(to: string, code: string): Promise<CodeSendResult>;
  sendEmail(to: string, code: string, companyName: string): Promise<CodeSendResult>;
}

export function createLoginCodeSender(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): LoginCodeSender {
  const whatsappReady = () => !!(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
  const emailReady = () => !!(env.SMTP_HOST && env.SMTP_FROM);

  return {
    whatsappReady,
    emailReady,

    async sendWhatsApp(to, code) {
      if (!whatsappReady()) return { ok: false, error: 'WhatsApp no está configurado' };
      try {
        const res = await fetchImpl(`https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v21.0'}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'template',
            template: {
              name: env.PORTAL_CODE_TEMPLATE || 'codigo_acceso',
              language: { code: env.PORTAL_CODE_LANGUAGE || 'es' },
              components: [
                { type: 'body', parameters: [{ type: 'text', text: code }] },
                // Plantillas de autenticación: el botón "Copiar código" también lleva el código
                { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
              ],
            },
          }),
        });
        if (res.ok) return { ok: true };
        const body: any = await res.json().catch(() => ({}));
        return { ok: false, error: body?.error?.message || `HTTP ${res.status}` };
      } catch (err: any) {
        return { ok: false, error: err?.message || String(err) };
      }
    },

    async sendEmail(to, code, companyName) {
      if (!emailReady()) return { ok: false, error: 'El correo no está configurado' };
      try {
        const port = Number(env.SMTP_PORT) || 587;
        const transport = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port,
          secure: port === 465,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
        });
        await transport.sendMail({
          from: env.SMTP_FROM,
          to,
          subject: `${code} es tu código para ver tus pedidos`,
          text: `Tu código para entrar al portal de ${companyName} es: ${code}\n\nVence en 10 minutos. Si no lo pediste, ignora este correo.`,
          html: `<p>Tu código para entrar al portal de <strong>${escapeHtml(companyName)}</strong> es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Vence en 10 minutos. Si no lo pediste, ignora este correo.</p>`,
        });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || String(err) };
      }
    },
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
