import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { fileStorage, readStoredFile } from '../services/fileStorage';
import { eventBus } from '../events/DomainEventBus';
import { repositories } from '../repositories';
import { documentRepository } from '../repositories/documentStore';
import {
  toClientProjectView,
  projectBelongsToClient,
  normalizeNit,
  normalizeClientName,
  type ClientProjectView,
} from '../../packages/core/src/portal/clientProgress';
import {
  MAX_CLIENT_ATTACHMENTS,
  MAX_CLIENT_ATTACHMENT_BYTES,
  sanitizeFileName,
  validateClientAttachment,
} from '../../packages/core/src/portal/attachments';

/**
 * Portal del cliente.
 *
 * - /api/portal/:token (público): el cliente, con su enlace privado, ve el avance de sus
 *   proyectos y envía nuevas solicitudes. El token solo se guarda como hash SHA-256.
 * - /api/client-portal (requiere sesión): el equipo crea/revoca enlaces y atiende solicitudes.
 */
export const portalPublicRouter = Router();
export const clientPortalRouter = Router();

const LINKS = 'client_portal_links';
const REQUESTS = 'client_requests';

export const REQUEST_STATUSES = ['NEW', 'IN_REVIEW', 'QUOTED', 'CLOSED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface PortalLink {
  id: string;
  clientName: string;
  clientNit: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
  revokedAt: string | null;
  lastAccessAt: string | null;
}

export interface ClientRequestAttachment {
  name: string;
  contentType: string;
  size: number;
  /** Ruta interna en Firebase Storage (no se expone al cliente). */
  storagePath: string;
}

export interface ClientRequest {
  id: string;
  linkId: string;
  clientName: string;
  clientNit: string;
  description: string;
  quantity: number | null;
  desiredDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  attachments?: ClientRequestAttachment[];
  status: RequestStatus;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Enlaces y solicitudes: en la base configurada (Postgres o Firestore, mismas colecciones). */
const linksRepo = () => documentRepository<PortalLink>(LINKS);
const requestsRepo = () => documentRepository<ClientRequest>(REQUESTS);

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/** Crea un enlace del portal y devuelve la ruta con el token en claro (única vez que se conoce). */
export async function createPortalLinkRecord(
  data: { clientName: string; clientNit: string; createdById: string; createdByName: string }
): Promise<{ link: PortalLink; path: string }> {
  const token = generateToken();
  const link: PortalLink = {
    id: hashToken(token),
    clientName: data.clientName,
    clientNit: data.clientNit,
    createdAt: new Date().toISOString(),
    createdById: data.createdById,
    createdByName: data.createdByName,
    revokedAt: null,
    lastAccessAt: null,
  };
  await linksRepo().upsert(link);
  return { link, path: `/portal/${token}` };
}

/** Enlace del portal creado por el asistente IA (sin petición HTTP de por medio). */
export async function createPortalLinkForAssistant(client: { name: string; nit: string }): Promise<string> {
  const { path } = await createPortalLinkRecord({ clientName: client.name, clientNit: client.nit, createdById: 'ai-assistant', createdByName: 'Asistente IA' });
  return path;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// ── Vista del cliente ───────────────────────────────────────────

/** Proyectos del cliente ordenados: en curso primero (más recientes), entregados al final. */
export function buildClientProjects(link: Pick<PortalLink, 'clientName' | 'clientNit'>, projects: any[], quotes: any[]): ClientProjectView[] {
  const quotesById = new Map(quotes.map((q) => [String(q.id), q]));
  const identity = { nit: link.clientNit, name: link.clientName };
  return projects
    .filter((p) => projectBelongsToClient(p, p?.quoteId ? quotesById.get(String(p.quoteId)) : undefined, identity))
    .map(toClientProjectView)
    .sort((a, b) => {
      if (a.isDelivered !== b.isDelivered) return a.isDelivered ? 1 : -1;
      return String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? ''));
    });
}

export function toClientRequestView(r: ClientRequest) {
  return {
    id: r.id,
    description: r.description,
    quantity: r.quantity,
    desiredDate: r.desiredDate,
    attachments: (r.attachments || []).map((a) => ({ name: a.name, size: a.size, contentType: a.contentType })),
    status: r.status,
    response: r.response,
    createdAt: r.createdAt,
  };
}

// ── Adjuntos (disco del servidor o Firebase Storage: ver services/fileStorage) ──

export interface IncomingAttachment {
  name: string;
  bytes: Buffer;
  mime: string;
}

/** Decodifica y valida los adjuntos del cuerpo de la solicitud. */
export function parseIncomingAttachments(raw: unknown): { ok: true; files: IncomingAttachment[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, files: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'Adjuntos inválidos' };
  if (raw.length > MAX_CLIENT_ATTACHMENTS) {
    return { ok: false, error: `Puedes adjuntar máximo ${MAX_CLIENT_ATTACHMENTS} archivos.` };
  }
  const files: IncomingAttachment[] = [];
  for (const item of raw) {
    const name = typeof item?.name === 'string' ? item.name.slice(0, 200) : '';
    const data = typeof item?.dataBase64 === 'string' ? item.dataBase64 : '';
    if (!name || !data) return { ok: false, error: 'Adjuntos inválidos' };
    // Evita decodificar cadenas muy grandes antes de medir (base64 ≈ 4/3 del tamaño real)
    if (data.length > Math.ceil((MAX_CLIENT_ATTACHMENT_BYTES * 4) / 3) + 8) {
      return { ok: false, error: `"${name}" supera el máximo de ${MAX_CLIENT_ATTACHMENT_BYTES / (1024 * 1024)} MB.` };
    }
    const bytes = Buffer.from(data, 'base64');
    const check = validateClientAttachment(name, bytes);
    if ('error' in check) return { ok: false, error: check.error };
    files.push({ name, bytes, mime: check.mime });
  }
  return { ok: true, files };
}

async function streamAttachment(res: Response, attachment: ClientRequestAttachment | undefined) {
  if (!attachment) return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
  try {
    const buffer = await readStoredFile(attachment.storagePath);
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(attachment.name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (err) {
    console.error('[portal] Error descargando adjunto:', err);
    res.status(404).json({ success: false, error: 'Archivo no encontrado' });
  }
}

async function findActiveLink(token: string): Promise<PortalLink | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const link = await linksRepo().get(hashToken(token));
  return link && !link.revokedAt ? link : null;
}

const NOT_FOUND = { success: false, error: 'Enlace no válido o revocado. Solicita uno nuevo a tu asesor.' };

portalPublicRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const link = await findActiveLink(req.params.token);
    if (!link) return res.status(404).json(NOT_FOUND);

    const [projectDocs, quoteDocs, requestsSnap] = await Promise.all([
      repositories().projects.list(),
      repositories().quotes.list(),
      requestsRepo().list(),
    ]);

    linksRepo().patch(link.id, { lastAccessAt: new Date().toISOString() }).catch(() => {});

    const projects = buildClientProjects(link, projectDocs, quoteDocs);
    const requests = requestsSnap
      .filter((r) => r.linkId === link.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toClientRequestView);

    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, client: { name: link.clientName }, projects, requests });
  } catch (err: any) {
    console.error('[portal] Error cargando portal:', err);
    res.status(500).json({ success: false, error: 'No se pudo cargar la información' });
  }
});

export const NewRequestSchema = z.object({
  description: z.string().trim().min(5, 'Describe tu solicitud (mínimo 5 caracteres)').max(2000),
  quantity: z.coerce.number().int().positive().max(10_000_000).optional().nullable(),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
});

/** Límite simple por enlace para evitar abuso del formulario público. */
const REQUEST_LIMIT = 10;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const recentRequests = new Map<string, number[]>();

export function allowRequest(linkId: string, now = Date.now()): boolean {
  const recent = (recentRequests.get(linkId) || []).filter((t) => now - t < REQUEST_WINDOW_MS);
  if (recent.length >= REQUEST_LIMIT) {
    recentRequests.set(linkId, recent);
    return false;
  }
  recent.push(now);
  recentRequests.set(linkId, recent);
  return true;
}

portalPublicRouter.post('/:token/requests', async (req: Request, res: Response) => {
  try {
    const link = await findActiveLink(req.params.token);
    if (!link) return res.status(404).json(NOT_FOUND);

    const parsed = NewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
    }
    const incoming = parseIncomingAttachments(req.body?.attachments);
    if ('error' in incoming) return res.status(400).json({ success: false, error: incoming.error });
    if (!allowRequest(link.id)) {
      return res.status(429).json({ success: false, error: 'Has enviado muchas solicitudes. Intenta de nuevo más tarde.' });
    }

    const now = new Date().toISOString();
    const data = parsed.data;
    const requestId = `sol-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const attachments: ClientRequestAttachment[] = [];
    for (const [i, file] of incoming.files.entries()) {
      const storagePath = `client-requests/${requestId}/${i + 1}-${sanitizeFileName(file.name)}`;
      await fileStorage().save(storagePath, file.bytes, file.mime);
      attachments.push({ name: file.name, contentType: file.mime, size: file.bytes.length, storagePath });
    }

    const request: ClientRequest = {
      id: requestId,
      linkId: link.id,
      clientName: link.clientName,
      clientNit: link.clientNit,
      description: data.description,
      quantity: data.quantity ?? null,
      desiredDate: data.desiredDate || null,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      attachments,
      status: 'NEW',
      response: null,
      createdAt: now,
      updatedAt: now,
    };
    await requestsRepo().upsert(request);

    // Aviso en tiempo real al equipo (SSE)
    eventBus.publish('CLIENT_REQUEST_CREATED', {
      requestId: request.id,
      clientName: request.clientName,
      preview: request.description.slice(0, 140),
      attachmentCount: attachments.length,
      createdAt: request.createdAt,
    });

    res.status(201).json({ success: true, request: toClientRequestView(request) });
  } catch (err: any) {
    console.error('[portal] Error creando solicitud:', err);
    res.status(500).json({ success: false, error: 'No se pudo enviar la solicitud' });
  }
});

async function getRequest(id: string): Promise<ClientRequest | null> {
  if (!/^sol-[A-Za-z0-9-]{1,60}$/.test(id)) return null;
  return requestsRepo().get(id);
}

portalPublicRouter.get('/:token/requests/:id/attachments/:index', async (req: Request, res: Response) => {
  const link = await findActiveLink(req.params.token);
  if (!link) return res.status(404).json(NOT_FOUND);
  const request = await getRequest(req.params.id);
  if (!request || request.linkId !== link.id) return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
  await streamAttachment(res, request.attachments?.[Number(req.params.index)]);
});

// ── Gestión interna (requiere sesión) ───────────────────────────

/** Clientes conocidos (a partir de las cotizaciones) para sugerirlos al crear un enlace. */
clientPortalRouter.get('/clients', async (_req, res) => {
  try {
    const byKey = new Map<string, { name: string; nit: string }>();
    for (const q of await repositories().quotes.list()) {
      const name = String(q.clientName || q.client || '').trim();
      if (!name) continue;
      const nit = String(q.clientNit || '').trim();
      const key = normalizeNit(nit) || normalizeClientName(name);
      if (!byKey.has(key)) byKey.set(key, { name, nit });
    }
    res.json({ success: true, clients: Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

clientPortalRouter.get('/links', async (_req, res) => {
  try {
    const links = (await linksRepo().list())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ success: true, links });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const NewLinkSchema = z.object({
  clientName: z.string().trim().min(2, 'El nombre del cliente es obligatorio').max(200),
  clientNit: z.string().trim().max(30).optional().default(''),
});

clientPortalRouter.post('/links', async (req, res) => {
  const parsed = NewLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }
  try {
    const { link, path } = await createPortalLinkRecord({
      clientName: parsed.data.clientName,
      clientNit: parsed.data.clientNit,
      createdById: String(req.headers['x-user-id'] || ''),
      createdByName: String(req.headers['x-user-name'] || ''),
    });
    // El token en claro solo se devuelve aquí; después no se puede recuperar.
    res.status(201).json({ success: true, link, path });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

clientPortalRouter.delete('/links/:id', async (req, res) => {
  try {
    await linksRepo().patch(req.params.id, { revokedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Número de solicitudes nuevas (contador del menú). */
clientPortalRouter.get('/requests/summary', async (_req, res) => {
  try {
    const newCount = (await requestsRepo().list()).filter((r) => r.status === 'NEW').length;
    res.json({ success: true, newCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

clientPortalRouter.get('/requests/:id/attachments/:index', async (req, res) => {
  const request = await getRequest(req.params.id);
  await streamAttachment(res, request?.attachments?.[Number(req.params.index)]);
});

clientPortalRouter.get('/requests', async (_req, res) => {
  try {
    const requests = (await requestsRepo().list())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const UpdateRequestSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  response: z.string().trim().max(2000).optional().nullable(),
});

clientPortalRouter.patch('/requests/:id', async (req, res) => {
  const parsed = UpdateRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Estado inválido' });
  try {
    const update: Partial<ClientRequest> = { status: parsed.data.status, updatedAt: new Date().toISOString() };
    if (parsed.data.response !== undefined) update.response = parsed.data.response || null;
    if (!(await requestsRepo().patch(req.params.id, update))) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
