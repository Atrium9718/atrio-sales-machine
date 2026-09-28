import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { repositories } from '../repositories';
import { documentRepository } from '../repositories/documentStore';
import { fileStorage, readStoredFile } from '../services/fileStorage';
import { systemConfig } from '../services/systemConfig';
import { getSettings } from '../services/settingsStore';
import { eventBus } from '../events/DomainEventBus';
import { SettingsCatalog } from '../../packages/contracts/src/settings';
import { recalculateQuoteTotals } from '../../packages/core/src/pricing/quoteReview';
import { sanitizeFileName } from '../../packages/core/src/portal/attachments';
import {
  buildKioskItems,
  kioskCatalog,
  matchKioskClient,
  normalizeKioskConfig,
  type KioskConfig,
} from '../../packages/core/src/kiosk/kiosk';
import { mergeClients } from './clients';
import { generateToken, parseIncomingAttachments } from './clientPortal';

/**
 * Kiosco de pedidos.
 *
 * - /api/kiosk-public/:token (público): la pantalla del kiosco, identificada por el enlace de
 *   su equipo, lee el catálogo y envía pedidos. Cada pedido queda como pre-cotización.
 * - /api/kiosk (requiere sesión; cambios solo administradores): configuración, equipos y pedidos.
 */
export const kioskPublicRouter = Router();
export const kioskRouter = Router();

const SETTINGS = 'kiosk_settings';
const DEVICES = 'kiosk_devices';
const CONFIG_ID = 'config';

export interface KioskDevice {
  id: string;
  name: string;
  /** El enlace del equipo; se guarda para poder volver a abrirlo desde la configuración. */
  token: string;
  createdAt: string;
  createdByName: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
  orderCount: number;
}

const settingsRepo = () => documentRepository<KioskConfig & { id: string }>(SETTINGS);
const devicesRepo = () => documentRepository<KioskDevice>(DEVICES);

export async function loadKioskConfig(): Promise<KioskConfig> {
  return normalizeKioskConfig(await settingsRepo().get(CONFIG_ID));
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

async function findDevice(token: string): Promise<KioskDevice | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const device = (await devicesRepo().list()).find((d) => d.token === token);
  return device && !device.revokedAt ? device : null;
}

function companyIdentity() {
  const defaults = Object.fromEntries(Object.values(SettingsCatalog).map((def: any) => [def.key, def.defaultValue]));
  const values: Record<string, any> = { ...defaults, ...getSettings() };
  return {
    name: values['organization.business.name'] || '',
    logoUrl: values['organization.branding.logoUrl'] || '',
    primaryColor: values['organization.branding.primaryColor'] || '#000000',
  };
}

const NOT_FOUND = { success: false, error: 'Este kiosco no está activo. Pide a la empresa un enlace nuevo.' };

// ── Pantalla pública ─────────────────────────────────────────────

kioskPublicRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const device = await findDevice(req.params.token);
    if (!device) return res.status(404).json(NOT_FOUND);
    const config = await loadKioskConfig();
    devicesRepo().patch(device.id, { lastSeenAt: new Date().toISOString() }).catch(() => {});
    res.setHeader('Cache-Control', 'no-store');
    if (!config.enabled) return res.json({ success: true, enabled: false, company: companyIdentity() });
    const products = await documentRepository('catalog_products').list();
    const { updatedAt: _u, updatedByName: _n, productIds: _p, ...publicConfig } = config;
    res.json({ success: true, enabled: true, company: companyIdentity(), config: publicConfig, products: kioskCatalog(config, products) });
  } catch (err: any) {
    console.error('[kiosco] Error cargando el kiosco:', err);
    res.status(500).json({ success: false, error: 'No se pudo cargar el kiosco' });
  }
});

export const KioskOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().max(80).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    quantity: z.coerce.number().int().positive().max(10_000_000),
    notes: z.string().max(500).optional().nullable(),
  })).min(1, 'Agrega al menos un producto.').max(20, 'Máximo 20 productos por pedido.'),
  customer: z.object({
    name: z.string().trim().min(3, 'Escribe tu nombre.').max(120),
    phone: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 7, 'Escribe un celular válido.'),
    email: z.string().trim().max(120).email('Revisa el correo.').optional().or(z.literal('')),
    company: z.string().trim().max(160).optional().or(z.literal('')),
    nit: z.string().trim().max(30).optional().or(z.literal('')),
  }),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  consent: z.literal(true, { error: 'Debes aceptar el tratamiento de datos.' }),
});

/** Límite por equipo para que nadie use el kiosco para llenar la base. */
const ORDER_LIMIT = 30;
const ORDER_WINDOW_MS = 60 * 60 * 1000;
const recentOrders = new Map<string, number[]>();

export function allowKioskOrder(deviceId: string, now = Date.now()): boolean {
  const recent = (recentOrders.get(deviceId) || []).filter((t) => now - t < ORDER_WINDOW_MS);
  const allowed = recent.length < ORDER_LIMIT;
  if (allowed) recent.push(now);
  recentOrders.set(deviceId, recent);
  return allowed;
}

kioskPublicRouter.post('/:token/orders', async (req: Request, res: Response) => {
  try {
    const device = await findDevice(req.params.token);
    if (!device) return res.status(404).json(NOT_FOUND);
    const config = await loadKioskConfig();
    if (!config.enabled) return res.status(409).json({ success: false, error: 'El kiosco está en pausa. Pide ayuda en el mostrador.' });

    const parsed = KioskOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
    const order = parsed.data;
    if (config.requireEmail && !order.customer.email) return res.status(400).json({ success: false, error: 'Escribe tu correo.' });

    const incoming = config.allowFiles ? parseIncomingAttachments(req.body?.attachments) : { ok: true as const, files: [] };
    if ('error' in incoming) return res.status(400).json({ success: false, error: incoming.error });

    const products = await documentRepository('catalog_products').list();
    const built = buildKioskItems(order.items, config, products);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    if (!allowKioskOrder(device.id)) {
      return res.status(429).json({ success: false, error: 'Se recibieron muchos pedidos seguidos. Pide ayuda en el mostrador.' });
    }

    const now = new Date().toISOString();
    const c = order.customer;
    const clients = await repositories().clients.list();
    let client = matchKioskClient(clients, { phone: c.phone, nit: c.nit || '' });
    if (!client) {
      // Cliente nuevo: se registra para que el asesor lo encuentre al llamar o cotizar
      [client] = await mergeClients([{
        name: c.company || c.name,
        contactName: c.company ? c.name : undefined,
        phone: c.phone,
        email: c.email || undefined,
        nit: c.nit || undefined,
        source: 'Kiosco',
      }]);
    }

    const quoteId = `quote-kiosk-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const attachments = [];
    for (const [i, file] of incoming.files.entries()) {
      const storagePath = `kiosk-orders/${quoteId}/${i + 1}-${sanitizeFileName(file.name)}`;
      await fileStorage().save(storagePath, file.bytes, file.mime);
      attachments.push({ name: file.name, contentType: file.mime, size: file.bytes.length, storagePath });
    }

    const totals = recalculateQuoteTotals(built.items);
    const number = await systemConfig().issueQuoteNumber();
    const clientName = c.company || c.name;
    const summary = built.items.map((it: any) => `${it.quantity} × ${it.description}`).join('; ');
    const quote = {
      id: quoteId,
      number,
      status: 'Borrador',
      isPreQuote: true,
      source: 'KIOSK',
      kioskDeviceId: device.id,
      kioskDeviceName: device.name,
      clientId: client?.id,
      clientName,
      clientNit: c.nit || client?.nit || '',
      clientEmail: c.email || client?.email || '',
      clientPhone: c.phone,
      clientAddress: client?.address || '',
      clientData: { name: clientName, tradeName: c.company || '', nit: c.nit || '', email: c.email || '', phone: c.phone, address: client?.address || '', contactName: c.name },
      date: now,
      advisorName: '',
      advisorRole: '',
      advisorPhone: '',
      advisorEmail: '',
      items: totals.items,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      deliveryTime: '',
      desiredDate: order.desiredDate || null,
      paymentTerms: '50% anticipo, 50% contra entrega',
      validityDays: '30 días calendario',
      commercialTerms: 'Pedido hecho por el cliente en el kiosco. Pendiente de revisión, precios y confirmación del asesor.',
      notes: '',
      internalNotes: `[Kiosco: ${device.name}] Contacto: ${c.name} · ${c.phone}${c.email ? ` · ${c.email}` : ''}${order.desiredDate ? ` · Lo necesita para ${order.desiredDate}` : ''}`,
      aiSummary: summary.slice(0, 300),
      attachments,
      dataConsentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await repositories().quotes.upsert(quote as any);
    devicesRepo().patch(device.id, { lastSeenAt: now, orderCount: (device.orderCount || 0) + 1 }).catch(() => {});

    eventBus.publish('KIOSK_ORDER_CREATED', {
      quoteId,
      number,
      clientName,
      deviceName: device.name,
      preview: summary.slice(0, 140),
      createdAt: now,
    });

    res.status(201).json({ success: true, number, total: config.showPrices ? totals.total : null });
  } catch (err: any) {
    console.error('[kiosco] Error creando pedido:', err);
    res.status(500).json({ success: false, error: 'No se pudo enviar el pedido. Intenta de nuevo.' });
  }
});

// ── Configuración (equipo) ───────────────────────────────────────

kioskRouter.get('/config', async (_req, res) => {
  try {
    res.json({ success: true, config: await loadKioskConfig() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.put('/config', async (req, res) => {
  try {
    const config = normalizeKioskConfig({ ...req.body, updatedAt: new Date().toISOString(), updatedByName: String(req.headers['x-user-name'] || '') });
    await settingsRepo().upsert({ id: CONFIG_ID, ...config });
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/devices', async (_req, res) => {
  try {
    const devices = (await devicesRepo().list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.post('/devices', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (name.length < 2) return res.status(400).json({ success: false, error: 'Ponle un nombre al equipo (ej. "Mostrador principal").' });
  try {
    const device: KioskDevice = {
      id: `kio-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      token: generateToken(),
      createdAt: new Date().toISOString(),
      createdByName: String(req.headers['x-user-name'] || ''),
      revokedAt: null,
      lastSeenAt: null,
      orderCount: 0,
    };
    await devicesRepo().upsert(device);
    res.status(201).json({ success: true, device });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.delete('/devices/:id', async (req, res) => {
  try {
    await devicesRepo().patch(req.params.id, { revokedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Pedidos recibidos por el kiosco (las pre-cotizaciones con origen KIOSK), más recientes primero. */
kioskRouter.get('/orders', async (_req, res) => {
  try {
    const orders = (await repositories().quotes.list())
      .filter((q: any) => q.source === 'KIOSK')
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 100)
      .map((q: any) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        clientName: q.clientName,
        clientPhone: q.clientPhone,
        deviceName: q.kioskDeviceName || '',
        summary: q.aiSummary || '',
        total: q.total || 0,
        attachments: (Array.isArray(q.attachments) ? q.attachments : []).map((a: any) => ({ name: a.name, size: a.size })),
        createdAt: q.createdAt,
      }));
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Archivo que el cliente adjuntó en el kiosco (diseño o referencia). */
kioskRouter.get('/orders/:id/attachments/:index', async (req, res) => {
  try {
    const quote = (await repositories().quotes.get(req.params.id)) as any;
    const attachment = quote?.source === 'KIOSK' ? quote.attachments?.[Number(req.params.index)] : undefined;
    if (!attachment) return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
    const buffer = await readStoredFile(attachment.storagePath);
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(attachment.name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (err: any) {
    console.error('[kiosco] Error descargando adjunto:', err);
    res.status(404).json({ success: false, error: 'Archivo no encontrado' });
  }
});
