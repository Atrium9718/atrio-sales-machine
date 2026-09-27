import fs from 'fs';
import path from 'path';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '../auth/firebaseAdmin';
import { loadFirebaseConfig } from '../auth/firebaseConfig';

/**
 * Archivos subidos (adjuntos del portal…). En un VPS se guardan en disco (volumen `uploads`,
 * incluido en el respaldo diario); si hay Firebase Storage configurado se puede seguir usando.
 *   FILE_STORAGE=local | firebase   (por defecto: firebase si hay bucket, si no local)
 *   UPLOADS_DIR=/app/uploads         (carpeta para el modo local)
 */
export interface FileStorage {
  readonly kind: 'local' | 'firebase';
  save(key: string, bytes: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
}

/** Claves relativas simples: sin "..", sin rutas absolutas. */
export function safeKey(key: string): string {
  const norm = path.posix.normalize(key.replace(/\\/g, '/'));
  if (!norm || norm.startsWith('/') || norm.startsWith('..') || norm.includes('/../') || norm === '.') throw new Error('Ruta de archivo inválida');
  return norm;
}

export function createLocalStorage(root: string): FileStorage {
  const resolve = (key: string) => {
    const full = path.resolve(root, safeKey(key));
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error('Ruta de archivo inválida');
    return full;
  };
  return {
    kind: 'local',
    async save(key, bytes) {
      const full = resolve(key);
      await fs.promises.mkdir(path.dirname(full), { recursive: true });
      await fs.promises.writeFile(full, bytes);
    },
    async read(key) {
      return fs.promises.readFile(resolve(key));
    },
  };
}

function firebaseBucket() {
  const app = getAdminApp();
  if (!app || !loadFirebaseConfig().storageBucket) return null;
  try {
    return getStorage(app).bucket();
  } catch {
    return null;
  }
}

function createFirebaseStorage(bucket: NonNullable<ReturnType<typeof firebaseBucket>>): FileStorage {
  return {
    kind: 'firebase',
    async save(key, bytes, contentType) {
      await bucket.file(safeKey(key)).save(bytes, { contentType, resumable: false });
    },
    async read(key) {
      const [buffer] = await bucket.file(safeKey(key)).download();
      return buffer;
    },
  };
}

export const uploadsDir = () => process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

let cached: FileStorage | null = null;
export function fileStorage(): FileStorage {
  if (cached) return cached;
  const mode = (process.env.FILE_STORAGE || '').toLowerCase();
  const bucket = mode === 'local' ? null : firebaseBucket();
  cached = bucket ? createFirebaseStorage(bucket) : createLocalStorage(uploadsDir());
  return cached;
}

/** Lee un archivo probando primero el almacenamiento actual y luego el otro (archivos antiguos). */
export async function readStoredFile(key: string): Promise<Buffer> {
  const primary = fileStorage();
  try {
    return await primary.read(key);
  } catch (err) {
    const bucket = primary.kind === 'local' ? firebaseBucket() : null;
    if (bucket) return createFirebaseStorage(bucket).read(key);
    const local = primary.kind === 'firebase' ? createLocalStorage(uploadsDir()) : null;
    if (local) return local.read(key);
    throw err;
  }
}

export function __resetFileStorage() {
  cached = null;
}
