import { Router, type Request } from 'express';
import crypto from 'crypto';
import { repositories } from '../repositories';
import { documentRepository } from '../repositories/documentStore';
import { getSettings } from '../services/settingsStore';
import { createLoginCodeSender, type LoginCodeSender } from '../services/loginCodeSender';
import {
  LOGIN_CODE_TTL_MS,
  LOGIN_SESSION_TTL_MS,
  checkLoginCode,
  createRateLimiter,
  findClientsByDocument,
  loginEmails,
  loginPhones,
  maskEmail,
  maskPhone,
  normalizeDocument,
  type LoginChallenge,
} from '../../packages/core/src/portal/portalLogin';
import { createPortalLinkRecord, endLoginSession } from './clientPortal';

/**
 * /api/portal/acceso (público): el cliente entra a su portal con cédula o NIT y un código de un
 * solo uso enviado a su WhatsApp o correo registrados. Al validar, recibe un enlace del portal
 * que vence en 12 horas.
 */
export const portalLoginRouter = Router();

const challengesRepo = () => documentRepository<LoginChallenge>('portal_login_codes');

let codeSender: LoginCodeSender = createLoginCodeSender();
/** Solo para pruebas. */
export function __setLoginCodeSender(sender: LoginCodeSender) {
  codeSender = sender;
}

const byIp = createRateLimiter(10, 60 * 60 * 1000);
const byDocument = createRateLimiter(5, 60 * 60 * 1000);
const verifyByIp = createRateLimiter(30, 60 * 60 * 1000);

const clientIp = (req: Request) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
const hashCode = (challengeId: string, code: string) => crypto.createHash('sha256').update(`${challengeId}:${code}`).digest('hex');

type Channel = 'whatsapp' | 'email';

portalLoginRouter.post('/start', async (req, res) => {
  try {
    const document = normalizeDocument(req.body?.document);
    if (document.length < 5) return res.status(400).json({ success: false, error: 'Escribe tu cédula o NIT (solo números).' });
    if (!byIp(clientIp(req)) || !byDocument(document)) {
      return res.status(429).json({ success: false, error: 'Pediste muchos códigos. Espera un rato e intenta de nuevo.' });
    }

    const clients = findClientsByDocument(await repositories().clients.list(), document);
    if (clients.length === 0) {
      return res.status(404).json({ success: false, error: 'No encontramos ese documento. Si ya eres cliente, escríbenos para actualizar tus datos.' });
    }

    const phone = codeSender.whatsappReady() ? loginPhones(clients)[0] : undefined;
    const email = codeSender.emailReady() ? loginEmails(clients)[0] : undefined;
    const options: { channel: Channel; to: string; masked: string }[] = [
      ...(phone ? [{ channel: 'whatsapp' as const, to: phone, masked: `WhatsApp al ${maskPhone(phone)}` }] : []),
      ...(email ? [{ channel: 'email' as const, to: email, masked: `correo ${maskEmail(email)}` }] : []),
    ];
    if (options.length === 0) {
      return res.status(409).json({ success: false, error: 'No tenemos un celular o correo registrado para enviarte el código. Comunícate con tu asesor.' });
    }
    const chosen = options.find((o) => o.channel === req.body?.channel) ?? options[0];

    const id = `plc-${crypto.randomBytes(12).toString('hex')}`;
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const companyName = String(getSettings()['organization.business.name'] || 'la empresa');
    const sent = chosen.channel === 'whatsapp' ? await codeSender.sendWhatsApp(chosen.to, code) : await codeSender.sendEmail(chosen.to, code, companyName);
    if (!sent.ok) {
      console.error(`[portal] No se pudo enviar el código por ${chosen.channel}:`, sent.error);
      return res.status(502).json({
        success: false,
        error: options.length > 1 ? 'No pudimos enviar el código. Prueba por el otro medio.' : 'No pudimos enviar el código. Comunícate con tu asesor.',
        alternatives: options.filter((o) => o.channel !== chosen.channel).map(({ channel, masked }) => ({ channel, masked })),
      });
    }

    const now = Date.now();
    const primary = clients[0];
    await challengesRepo().upsert({
      id,
      document,
      clientName: String(primary.name || primary.tradeName || ''),
      clientNit: String(primary.nit || primary.doc || document),
      codeHash: hashCode(id, code),
      channel: chosen.channel,
      destination: chosen.masked,
      attempts: 0,
      expiresAt: new Date(now + LOGIN_CODE_TTL_MS).toISOString(),
      usedAt: null,
      createdAt: new Date(now).toISOString(),
    });

    res.json({
      success: true,
      challengeId: id,
      sentTo: chosen.masked,
      alternatives: options.filter((o) => o.channel !== chosen.channel).map(({ channel, masked }) => ({ channel, masked })),
    });
  } catch (err: any) {
    console.error('[portal] Error iniciando el ingreso:', err);
    res.status(500).json({ success: false, error: 'No se pudo iniciar el ingreso. Intenta de nuevo.' });
  }
});

portalLoginRouter.post('/verify', async (req, res) => {
  try {
    if (!verifyByIp(clientIp(req))) return res.status(429).json({ success: false, error: 'Demasiados intentos. Espera un rato.' });
    const challengeId = String(req.body?.challengeId || '');
    const code = String(req.body?.code || '').replace(/\D/g, '');
    const challenge = /^plc-[0-9a-f]{24}$/.test(challengeId) ? await challengesRepo().get(challengeId) : null;
    const result = checkLoginCode(challenge, hashCode(challengeId, code));
    if ('error' in result) {
      if (challenge && !challenge.usedAt) await challengesRepo().patch(challenge.id, { attempts: challenge.attempts + 1 });
      return res.status(400).json({ success: false, error: result.error, restart: !!result.locked });
    }

    await challengesRepo().patch(challenge!.id, { usedAt: new Date().toISOString() });
    const { path } = await createPortalLinkRecord({
      clientName: challenge!.clientName,
      clientNit: challenge!.clientNit,
      createdById: 'portal-login',
      createdByName: 'Ingreso con documento',
      origin: 'LOGIN',
      expiresAt: new Date(Date.now() + LOGIN_SESSION_TTL_MS).toISOString(),
    });
    res.json({ success: true, path });
  } catch (err: any) {
    console.error('[portal] Error validando el código:', err);
    res.status(500).json({ success: false, error: 'No se pudo validar el código. Intenta de nuevo.' });
  }
});

portalLoginRouter.post('/logout', async (req, res) => {
  try {
    await endLoginSession(String(req.body?.token || ''));
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

/** Nombre y logo de la empresa para la pantalla de ingreso. */
portalLoginRouter.get('/identity', (_req, res) => {
  const values = getSettings();
  res.json({ name: values['organization.business.name'] || '', logoUrl: values['organization.branding.logoUrl'] || '' });
});
