import crypto from 'crypto';
import fs from 'fs';

/**
 * Google Drive de la empresa, usado desde el servidor (nadie tiene que "conectar su Drive").
 *
 * Carpeta raíz: GOOGLE_DRIVE_FOLDER_ID (una carpeta de la cuenta de la empresa o de una unidad
 * compartida). Autenticación, una de dos:
 *  A) Cuenta de Google de la empresa (sirve con Gmail o Workspace):
 *     GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN
 *  B) Cuenta de servicio (solo con unidad compartida de Google Workspace, porque las cuentas de
 *     servicio no tienen espacio propio): GOOGLE_DRIVE_SERVICE_ACCOUNT (ruta al JSON; por
 *     defecto GOOGLE_APPLICATION_CREDENTIALS) con acceso de Editor a la unidad compartida.
 */

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const SCOPE = 'https://www.googleapis.com/auth/drive';

export function driveMode(env: Env): 'oauth' | 'service_account' | null {
  if (!env.GOOGLE_DRIVE_FOLDER_ID) return null;
  if (env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_REFRESH_TOKEN) return 'oauth';
  if (env.GOOGLE_DRIVE_SERVICE_ACCOUNT) return 'service_account';
  return null;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Escapa comillas para las consultas de Drive (q=name = '...'). */
export const escapeQuery = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function createDriveClient(env: Env, fetchImpl: FetchLike = fetch, now: () => number = Date.now) {
  const mode = driveMode(env);
  let token: { value: string; exp: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.exp - 60_000 > now()) return token.value;
    let body: URLSearchParams;
    if (mode === 'oauth') {
      body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.GOOGLE_DRIVE_CLIENT_ID!,
        client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET!,
        refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN!,
      });
    } else if (mode === 'service_account') {
      const key = JSON.parse(fs.readFileSync(env.GOOGLE_DRIVE_SERVICE_ACCOUNT!, 'utf8'));
      const iat = Math.floor(now() / 1000);
      const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const claims = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
      const signature = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key.private_key));
      body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` });
    } else {
      throw new Error('Google Drive no está configurado');
    }
    const res = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const reason = data.error === 'invalid_grant' ? 'la autorización de Drive venció o fue revocada; genera un nuevo GOOGLE_DRIVE_REFRESH_TOKEN' : data.error_description || data.error || `HTTP ${res.status}`;
      throw new Error(`No se pudo autenticar con Google Drive: ${reason}`);
    }
    token = { value: data.access_token, exp: now() + (Number(data.expires_in) || 3600) * 1000 };
    return token.value;
  }

  async function call(url: string, init: RequestInit = {}): Promise<any> {
    const res = await fetchImpl(url, { ...init, headers: { ...(init.headers as any), Authorization: `Bearer ${await accessToken()}` } });
    if (!res.ok) {
      const data: any = await res.json().catch(() => ({}));
      throw new Error(`Google Drive: ${data?.error?.message || `HTTP ${res.status}`}`);
    }
    return res;
  }

  const shared = 'supportsAllDrives=true&includeItemsFromAllDrives=true';
  const folderCache = new Map<string, string>();

  /** Carpeta hija por nombre (la crea si no existe). */
  async function childFolder(parentId: string, name: string): Promise<string> {
    const clean = name.replace(/[\\/]/g, '-').trim().slice(0, 120) || 'Sin nombre';
    const key = `${parentId}/${clean}`;
    if (folderCache.has(key)) return folderCache.get(key)!;
    const q = `name = '${escapeQuery(clean)}' and mimeType = 'application/vnd.google-apps.folder' and '${escapeQuery(parentId)}' in parents and trashed = false`;
    const found = await (await call(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&${shared}`)).json();
    let id: string | undefined = found.files?.[0]?.id;
    if (!id) {
      const created = await (
        await call(`${API}/files?fields=id&supportsAllDrives=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: clean, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
        })
      ).json();
      id = created.id;
    }
    if (!id) throw new Error('Google Drive no devolvió el id de la carpeta');
    folderCache.set(key, id);
    return id;
  }

  return {
    mode,
    /** Crea (si hace falta) la ruta de carpetas bajo la raíz, p. ej. ["Producción", "Pintuco - Cajas"]. */
    async folderFor(path: string[]): Promise<string> {
      let parent = env.GOOGLE_DRIVE_FOLDER_ID!;
      for (const part of path) parent = await childFolder(parent, part);
      return parent;
    },

    async upload(folderId: string, name: string, mimeType: string, bytes: Buffer): Promise<DriveFile> {
      const boundary = `fusion${crypto.randomBytes(8).toString('hex')}`;
      const meta = JSON.stringify({ name, mimeType, parents: [folderId] });
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
        bytes,
        Buffer.from(`\r\n--${boundary}--`),
      ]);
      const res = await call(`${UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      });
      return res.json();
    },

    async download(fileId: string): Promise<Buffer> {
      const res = await call(`${API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
      return Buffer.from(await res.arrayBuffer());
    },

    /** Prueba: la carpeta raíz existe y se pueden crear archivos en ella. */
    async check(): Promise<string> {
      const res = await call(`${API}/files/${encodeURIComponent(env.GOOGLE_DRIVE_FOLDER_ID!)}?fields=name,capabilities(canAddChildren),driveId&supportsAllDrives=true`);
      const f = await res.json();
      if (!f.capabilities?.canAddChildren) throw new Error(`La carpeta «${f.name}» existe pero no hay permiso para guardar archivos en ella`);
      return `Conectado a la carpeta «${f.name}»${f.driveId ? ' (unidad compartida)' : ''}`;
    },
  };
}

export type DriveClient = ReturnType<typeof createDriveClient>;

let client: DriveClient | null = null;
/** Cliente del proceso; null si Drive no está configurado. */
export function companyDrive(): DriveClient | null {
  const env = { ...process.env, GOOGLE_DRIVE_SERVICE_ACCOUNT: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT || (process.env.GOOGLE_DRIVE_USE_SERVICE_ACCOUNT === 'true' ? process.env.GOOGLE_APPLICATION_CREDENTIALS : undefined) };
  if (!driveMode(env)) return null;
  if (!client) client = createDriveClient(env);
  return client;
}
