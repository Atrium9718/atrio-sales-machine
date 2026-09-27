import { Router, type Request, type Response } from 'express';
import { repositories, writeContextFrom, type DocumentRepository } from '../repositories';
import { createFirestoreRepository } from '../repositories/firestoreRepository';
import { documentRepository } from '../repositories/documentStore';
import { eventBus } from '../events/DomainEventBus';
import { resolveStageIndex } from '../../packages/core/src/portal/clientProgress';

/**
 * API genérica de colecciones de negocio que antes vivían solo en el localStorage del
 * navegador. El servidor (Firestore) es la fuente de verdad; el cliente mantiene una
 * caché en memoria (src/lib/serverCollection.ts).
 */
export const dataRouter = Router();

/** Colecciones expuestas (nombre en la URL -> colección de Firestore). */
export const DATA_COLLECTIONS: Record<string, string> = {
  projects: 'projects',
  inventory: 'inventory_items',
  'print-orders': 'print_orders',
  'project-tombstones': 'project_tombstones',
  appointments: 'appointments',
  opportunities: 'opportunities',
};

/** Colecciones nuevas: van al backend configurado (Postgres o Firestore) desde el principio. */
const DOCUMENT_COLLECTIONS = new Set(['appointments', 'opportunities']);

const MAX_BULK_ITEMS = 2000;

/** Los proyectos pasan por el repositorio (Firestore o Postgres); el resto sigue en Firestore. */
function repoFor(name: string): DocumentRepository {
  if (name === 'projects') return repositories().projects;
  if (DOCUMENT_COLLECTIONS.has(name)) return documentRepository(DATA_COLLECTIONS[name]);
  return createFirestoreRepository(DATA_COLLECTIONS[name]);
}

/** Firestore rechaza `undefined`; se normaliza el documento a JSON plano. */
export function toStorableDoc(item: any, id: string, now = new Date().toISOString()) {
  const plain = JSON.parse(JSON.stringify(item ?? {}));
  return { ...plain, id, createdAt: plain.createdAt || now, updatedAt: now };
}

export function isValidDocId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 700 && !id.includes('/') && id !== '.' && id !== '..';
}

const stageOf = (doc: any): string | null => {
  const v = doc?.stageId ?? doc?.stage;
  return v === undefined || v === null || v === '' ? null : String(v);
};

/**
 * El tablero de producción guarda los proyectos por esta API: aquí se detecta el cambio de etapa
 * para avisar al cliente (evento PROJECT_STAGE_CHANGED). Proyectos nuevos no generan aviso.
 */
export function detectStageChanges(previous: Map<string, any>, saved: any[]): { projectId: string; fromStage: string; toStage: string }[] {
  const changes = [];
  for (const doc of saved) {
    const before = previous.get(doc.id);
    const from = stageOf(before);
    const to = stageOf(doc);
    if (!before || !from || !to) continue;
    if (resolveStageIndex(from) !== resolveStageIndex(to)) changes.push({ projectId: doc.id, fromStage: from, toStage: to });
  }
  return changes;
}

function publishStageChanges(changes: ReturnType<typeof detectStageChanges>) {
  for (const c of changes) {
    try {
      eventBus.publish('PROJECT_STAGE_CHANGED', c);
    } catch (err) {
      console.error('[data] No se pudo publicar el cambio de etapa:', err);
    }
  }
}

function resolveRepo(req: Request, res: Response): DocumentRepository | null {
  const collection = req.params.collection;
  if (!DATA_COLLECTIONS[collection]) {
    res.status(404).json({ success: false, error: 'Colección desconocida' });
    return null;
  }
  return repoFor(collection);
}

dataRouter.get('/:collection', async (req, res) => {
  const repo = resolveRepo(req, res);
  if (!repo) return;
  try {
    res.json({ success: true, items: await repo.list() });
  } catch (err: any) {
    console.error(`[data] Error listando ${req.params.collection}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.put('/:collection/:id', async (req, res) => {
  const repo = resolveRepo(req, res);
  if (!repo) return;
  const { id } = req.params;
  if (!isValidDocId(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
  try {
    const previous = req.params.collection === 'projects' ? await repo.get(id) : null;
    const item = await repo.upsert(toStorableDoc(req.body, id), writeContextFrom(req));
    res.json({ success: true, item });
    if (previous) publishStageChanges(detectStageChanges(new Map([[id, previous]]), [item]));
  } catch (err: any) {
    console.error(`[data] Error guardando ${req.params.collection}/${id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/:collection/bulk', async (req, res) => {
  const repo = resolveRepo(req, res);
  if (!repo) return;
  const items = req.body?.items;
  if (!Array.isArray(items)) return res.status(400).json({ success: false, error: 'items debe ser un arreglo' });
  if (items.length > MAX_BULK_ITEMS) {
    return res.status(413).json({ success: false, error: `Máximo ${MAX_BULK_ITEMS} elementos por solicitud` });
  }
  if (!items.every((it: any) => isValidDocId(it?.id))) {
    return res.status(400).json({ success: false, error: 'Todos los elementos requieren un id válido' });
  }
  try {
    const now = new Date().toISOString();
    const saved = items.map((it: any) => toStorableDoc(it, it.id, now));
    // Etapas anteriores solo para lotes pequeños (cambios del tablero); las cargas masivas no avisan
    const previous = req.params.collection === 'projects' && saved.length <= 50 ? new Map((await repo.list()).map((d) => [d.id, d])) : null;
    await repo.upsertMany(saved, writeContextFrom(req));
    res.json({ success: true, count: saved.length, items: saved });
    if (previous) publishStageChanges(detectStageChanges(previous, saved));
  } catch (err: any) {
    console.error(`[data] Error en carga masiva de ${req.params.collection}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.delete('/:collection/:id', async (req, res) => {
  const repo = resolveRepo(req, res);
  if (!repo) return;
  const { id } = req.params;
  if (!isValidDocId(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
  try {
    await repo.delete(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`[data] Error eliminando ${req.params.collection}/${id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});
