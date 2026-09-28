import type { AppDocument, DocumentRepository } from './types';
import { createFirestoreRepository } from './firestoreRepository';
import { getPrisma } from './prisma/client';
import { dataBackend } from './index';

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

/**
 * Colección genérica en Postgres (tabla app_documents): mismo documento JSON que en Firestore.
 * Para colecciones sin modelo propio (conversaciones omnicanal, configuración de agentes…).
 */
export function createPostgresDocumentRepository<T extends AppDocument = AppDocument>(collection: string): DocumentRepository<T> {
  const db = () => getPrisma().storedDocument;
  return {
    backend: 'postgres',

    async list() {
      const rows = await db().findMany({ where: { collection }, orderBy: { updatedAt: 'desc' } });
      return rows.map((r) => ({ ...(r.data as T), id: r.id }));
    },

    async get(id) {
      const row = await db().findUnique({ where: { collection_id: { collection, id } } });
      return row ? ({ ...(row.data as T), id: row.id } as T) : null;
    },

    async upsert(document) {
      const data = plain(document);
      await db().upsert({
        where: { collection_id: { collection, id: document.id } },
        create: { collection, id: document.id, data: data as any },
        update: { data: data as any },
      });
      return data;
    },

    async upsertMany(documents) {
      await getPrisma().$transaction(
        documents.map((d) =>
          db().upsert({
            where: { collection_id: { collection, id: d.id } },
            create: { collection, id: d.id, data: plain(d) as any },
            update: { data: plain(d) as any },
          })
        )
      );
    },

    async patch(id, fields) {
      const current = await this.get(id);
      if (!current) return null;
      return this.upsert({ ...current, ...fields, id } as T);
    },

    async delete(id) {
      await db().deleteMany({ where: { collection, id } });
    },

    async deleteAll() {
      const { count } = await db().deleteMany({ where: { collection } });
      return count;
    },
  };
}

/** Colección en memoria: pruebas y el simulador de canales (no persiste). */
export function createMemoryRepository<T extends AppDocument = AppDocument>(): DocumentRepository<T> & { readonly size: number } {
  const store = new Map<string, T>();
  return {
    backend: 'firestore',
    get size() {
      return store.size;
    },
    async list() {
      return [...store.values()].map((d) => plain(d));
    },
    async get(id) {
      const d = store.get(id);
      return d ? plain(d) : null;
    },
    async upsert(document) {
      const data = plain(document);
      store.set(document.id, data);
      return plain(data);
    },
    async upsertMany(documents) {
      for (const d of documents) store.set(d.id, plain(d));
    },
    async patch(id, fields) {
      const current = store.get(id);
      if (!current) return null;
      const next = plain({ ...current, ...fields, id });
      store.set(id, next);
      return plain(next);
    },
    async delete(id) {
      store.delete(id);
    },
    async deleteAll() {
      const n = store.size;
      store.clear();
      return n;
    },
  };
}

const cache = new Map<string, DocumentRepository>();

/** Repositorio de una colección genérica, en el backend configurado (DATA_BACKEND). */
export function documentRepository<T extends AppDocument = AppDocument>(collection: string): DocumentRepository<T> {
  const backend = dataBackend();
  const key = `${backend}:${collection}`;
  if (!cache.has(key)) {
    cache.set(key, backend === 'postgres' ? createPostgresDocumentRepository(collection) : createFirestoreRepository(collection));
  }
  return cache.get(key) as DocumentRepository<T>;
}
