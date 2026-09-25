import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { loadFirebaseConfig } from '../auth/firebaseConfig';
import {
  toClientProjectView,
  projectBelongsToClient,
  normalizeNit,
  normalizeClientName,
  type ClientProjectView,
} from '../../packages/core/src/portal/clientProgress';

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
  status: RequestStatus;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

function getDb(): Firestore | null {
  if (!getApps().length) return null;
  return getFirestore(getApps()[0], loadFirebaseConfig().firestoreDatabaseId as string | undefined);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url');
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
    status: r.status,
    response: r.response,
    createdAt: r.createdAt,
  };
}

async function findActiveLink(db: Firestore, token: string): Promise<PortalLink | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const snap = await getDoc(doc(db, LINKS, hashToken(token)));
  if (!snap.exists()) return null;
  const link = { ...(snap.data() as PortalLink), id: snap.id };
  return link.revokedAt ? null : link;
}

const NOT_FOUND = { success: false, error: 'Enlace no válido o revocado. Solicita uno nuevo a tu asesor.' };

portalPublicRouter.get('/:token', async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.status(503).json({ success: false, error: 'Servicio no disponible' });
  try {
    const link = await findActiveLink(db, req.params.token);
    if (!link) return res.status(404).json(NOT_FOUND);

    const [projectsSnap, quotesSnap, requestsSnap] = await Promise.all([
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'quotes')),
      getDocs(query(collection(db, REQUESTS), where('linkId', '==', link.id))),
    ]);

    updateDoc(doc(db, LINKS, link.id), { lastAccessAt: new Date().toISOString() }).catch(() => {});

    const projects = buildClientProjects(
      link,
      projectsSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
      quotesSnap.docs.map((d) => ({ ...d.data(), id: d.id }))
    );
    const requests = requestsSnap.docs
      .map((d) => ({ ...(d.data() as ClientRequest), id: d.id }))
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
  const db = getDb();
  if (!db) return res.status(503).json({ success: false, error: 'Servicio no disponible' });
  try {
    const link = await findActiveLink(db, req.params.token);
    if (!link) return res.status(404).json(NOT_FOUND);

    const parsed = NewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
    }
    if (!allowRequest(link.id)) {
      return res.status(429).json({ success: false, error: 'Has enviado muchas solicitudes. Intenta de nuevo más tarde.' });
    }

    const now = new Date().toISOString();
    const data = parsed.data;
    const request: ClientRequest = {
      id: `sol-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      linkId: link.id,
      clientName: link.clientName,
      clientNit: link.clientNit,
      description: data.description,
      quantity: data.quantity ?? null,
      desiredDate: data.desiredDate || null,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      status: 'NEW',
      response: null,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, REQUESTS, request.id), request);
    res.status(201).json({ success: true, request: toClientRequestView(request) });
  } catch (err: any) {
    console.error('[portal] Error creando solicitud:', err);
    res.status(500).json({ success: false, error: 'No se pudo enviar la solicitud' });
  }
});

// ── Gestión interna (requiere sesión) ───────────────────────────

function requireDb(res: Response): Firestore | null {
  const db = getDb();
  if (!db) res.status(503).json({ success: false, error: 'Firestore no configurado' });
  return db;
}

/** Clientes conocidos (a partir de las cotizaciones) para sugerirlos al crear un enlace. */
clientPortalRouter.get('/clients', async (_req, res) => {
  const db = requireDb(res);
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'quotes'));
    const byKey = new Map<string, { name: string; nit: string }>();
    for (const d of snap.docs) {
      const q = d.data();
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
  const db = requireDb(res);
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, LINKS));
    const links = snap.docs
      .map((d) => ({ ...(d.data() as PortalLink), id: d.id }))
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
  const db = requireDb(res);
  if (!db) return;
  const parsed = NewLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }
  try {
    const token = generateToken();
    const link: PortalLink = {
      id: hashToken(token),
      clientName: parsed.data.clientName,
      clientNit: parsed.data.clientNit,
      createdAt: new Date().toISOString(),
      createdById: String(req.headers['x-user-id'] || ''),
      createdByName: String(req.headers['x-user-name'] || ''),
      revokedAt: null,
      lastAccessAt: null,
    };
    await setDoc(doc(db, LINKS, link.id), link);
    // El token en claro solo se devuelve aquí; después no se puede recuperar.
    res.status(201).json({ success: true, link, path: `/portal/${token}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

clientPortalRouter.delete('/links/:id', async (req, res) => {
  const db = requireDb(res);
  if (!db) return;
  try {
    await updateDoc(doc(db, LINKS, req.params.id), { revokedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

clientPortalRouter.get('/requests', async (_req, res) => {
  const db = requireDb(res);
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, REQUESTS));
    const requests = snap.docs
      .map((d) => ({ ...(d.data() as ClientRequest), id: d.id }))
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
  const db = requireDb(res);
  if (!db) return;
  const parsed = UpdateRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Estado inválido' });
  try {
    const update: Partial<ClientRequest> = { status: parsed.data.status, updatedAt: new Date().toISOString() };
    if (parsed.data.response !== undefined) update.response = parsed.data.response || null;
    await updateDoc(doc(db, REQUESTS, req.params.id), update);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
