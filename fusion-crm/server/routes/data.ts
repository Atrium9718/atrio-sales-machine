import { Router, type Request, type Response } from 'express';
import { getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { loadFirebaseConfig } from '../auth/firebaseConfig';

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
const FIRESTORE_BATCH_LIMIT = 500;

function getDb(): Firestore | null {
  if (!getApps().length) return null;
  return getFirestore(getApps()[0], loadFirebaseConfig().firestoreDatabaseId as string | undefined);
}

/** Firestore rechaza `undefined`; se normaliza el documento a JSON plano. */
export function toStorableDoc(item: any, id: string, now = new Date().toISOString()) {
  const plain = JSON.parse(JSON.stringify(item ?? {}));
  return { ...plain, id, createdAt: plain.createdAt || now, updatedAt: now };
}

export function isValidDocId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 700 && !id.includes('/') && id !== '.' && id !== '..';
}

function resolveCollection(req: Request, res: Response): { db: Firestore; name: string } | null {
  const name = DATA_COLLECTIONS[req.params.collection];
  if (!name) {
    res.status(404).json({ success: false, error: 'Colección desconocida' });
    return null;
  }
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, error: 'Firestore no configurado' });
    return null;
  }
  return { db, name };
}

dataRouter.get('/:collection', async (req, res) => {
  const target = resolveCollection(req, res);
  if (!target) return;
  try {
    const snap = await getDocs(collection(target.db, target.name));
    res.json({ success: true, items: snap.docs.map((d) => ({ ...d.data(), id: d.id })) });
  } catch (err: any) {
    console.error(`[data] Error listando ${target.name}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.put('/:collection/:id', async (req, res) => {
  const target = resolveCollection(req, res);
  if (!target) return;
  const { id } = req.params;
  if (!isValidDocId(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
  try {
    const item = toStorableDoc(req.body, id);
    await setDoc(doc(target.db, target.name, id), item);
    res.json({ success: true, item });
  } catch (err: any) {
    console.error(`[data] Error guardando ${target.name}/${id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/:collection/bulk', async (req, res) => {
  const target = resolveCollection(req, res);
  if (!target) return;
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
    for (let i = 0; i < saved.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(target.db);
      for (const item of saved.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.set(doc(target.db, target.name, item.id), item);
      }
      await batch.commit();
    }
    res.json({ success: true, count: saved.length, items: saved });
  } catch (err: any) {
    console.error(`[data] Error en carga masiva de ${target.name}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.delete('/:collection/:id', async (req, res) => {
  const target = resolveCollection(req, res);
  if (!target) return;
  const { id } = req.params;
  if (!isValidDocId(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
  try {
    await deleteDoc(doc(target.db, target.name, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(`[data] Error eliminando ${target.name}/${id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});
