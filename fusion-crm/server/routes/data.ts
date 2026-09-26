import { Router, type Request, type Response } from 'express';
import { repositories, writeContextFrom, type DocumentRepository } from '../repositories';
import { createFirestoreRepository } from '../repositories/firestoreRepository';

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
};

const MAX_BULK_ITEMS = 2000;

/** Los proyectos pasan por el repositorio (Firestore o Postgres); el resto sigue en Firestore. */
function repoFor(name: string): DocumentRepository {
  return name === 'projects' ? repositories().projects : createFirestoreRepository(DATA_COLLECTIONS[name]);
}

/** Firestore rechaza `undefined`; se normaliza el documento a JSON plano. */
export function toStorableDoc(item: any, id: string, now = new Date().toISOString()) {
  const plain = JSON.parse(JSON.stringify(item ?? {}));
  return { ...plain, id, createdAt: plain.createdAt || now, updatedAt: now };
}

export function isValidDocId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 700 && !id.includes('/') && id !== '.' && id !== '..';
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
    const item = await repo.upsert(toStorableDoc(req.body, id), writeContextFrom(req));
    res.json({ success: true, item });
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
    await repo.upsertMany(saved, writeContextFrom(req));
    res.json({ success: true, count: saved.length, items: saved });
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
