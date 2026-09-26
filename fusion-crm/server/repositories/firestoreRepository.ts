import { getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { loadFirebaseConfig } from '../auth/firebaseConfig';
import type { AppDocument, DocumentRepository } from './types';

function getDb(): Firestore {
  if (!getApps().length) throw new Error('Firestore no configurado');
  return getFirestore(getApps()[0], loadFirebaseConfig().firestoreDatabaseId as string | undefined);
}

/** Firestore rechaza `undefined`: se guarda el documento como JSON plano. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

export function createFirestoreRepository<T extends AppDocument = AppDocument>(collectionName: string): DocumentRepository<T> {
  return {
    backend: 'firestore',

    async list() {
      const snap = await getDocs(collection(getDb(), collectionName));
      return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
    },

    async get(id) {
      const snap = await getDoc(doc(getDb(), collectionName, id));
      return snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as T) : null;
    },

    async upsert(document) {
      const data = plain(document);
      await setDoc(doc(getDb(), collectionName, document.id), data);
      return data;
    },

    async upsertMany(documents) {
      const db = getDb();
      for (let i = 0; i < documents.length; i += 450) {
        const batch = writeBatch(db);
        for (const d of documents.slice(i, i + 450)) batch.set(doc(db, collectionName, d.id), plain(d));
        await batch.commit();
      }
    },

    async patch(id, fields) {
      const current = await this.get(id);
      if (!current) return null;
      const next = plain({ ...current, ...fields, id });
      await setDoc(doc(getDb(), collectionName, id), next);
      return next;
    },

    async delete(id) {
      await deleteDoc(doc(getDb(), collectionName, id));
    },

    async deleteAll() {
      const db = getDb();
      const snap = await getDocs(collection(db, collectionName));
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        for (const d of snap.docs.slice(i, i + 450)) batch.delete(d.ref);
        await batch.commit();
      }
      return snap.size;
    },
  };
}
