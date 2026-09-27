import { Router } from 'express';
import crypto from 'crypto';
import { documentRepository } from '../repositories/documentStore';
import { companyDrive, type DriveClient } from '../services/googleDrive';
import { createLocalStorage, uploadsDir, type FileStorage } from '../services/fileStorage';

/**
 * Archivos del equipo (artes de producción, soportes de pago, órdenes de compra, adjuntos del
 * chat y de anuncios). Se guardan en el Google Drive de la empresa si está configurado; si no,
 * en el disco del servidor (con respaldo). Cualquiera del equipo los abre desde la app.
 */
export const filesRouter = Router();

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const BLOCKED_EXT = /\.(exe|bat|cmd|com|msi|scr|ps1|vbs|jar|sh)$/i;

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storage: 'drive' | 'local';
  driveFileId?: string;
  webViewLink?: string;
  localKey?: string;
  folder: string[];
  uploadedBy: string;
  uploadedAt: string;
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  ai: 'application/postscript', eps: 'application/postscript', psd: 'image/vnd.adobe.photoshop', tif: 'image/tiff', tiff: 'image/tiff',
  zip: 'application/zip', rar: 'application/vnd.rar', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', txt: 'text/plain', csv: 'text/csv',
  mp4: 'video/mp4', mov: 'video/quicktime', mp3: 'audio/mpeg', cdr: 'application/octet-stream',
};
export const mimeFor = (name: string) => MIME[(name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

/** Solo imágenes y PDF se muestran en el navegador; lo demás se descarga. */
const INLINE = /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/;

export const cleanName = (name: string) => name.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').trim().slice(0, 180) || 'archivo';

export interface FilesDeps {
  repo: ReturnType<typeof documentRepository<StoredFile>>;
  drive: () => DriveClient | null;
  local: () => FileStorage;
  now: () => Date;
}

export function createFilesService(deps: FilesDeps) {
  return {
    async save(input: { name: string; bytes: Buffer; folder: string[]; by: string }): Promise<{ file: StoredFile; warning?: string }> {
      const name = cleanName(input.name);
      if (BLOCKED_EXT.test(name)) throw Object.assign(new Error('Ese tipo de archivo no se permite'), { status: 400 });
      if (!input.bytes.length) throw Object.assign(new Error('El archivo está vacío'), { status: 400 });
      if (input.bytes.length > MAX_FILE_BYTES) throw Object.assign(new Error('El archivo supera 25 MB'), { status: 413 });
      const folder = input.folder.map((p) => cleanName(p)).filter(Boolean).slice(0, 5);
      const id = `file-${deps.now().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(6).toString('hex')}`;
      const base = { id, name, size: input.bytes.length, mimeType: mimeFor(name), folder, uploadedBy: input.by, uploadedAt: deps.now().toISOString() };

      let warning: string | undefined;
      const drive = deps.drive();
      if (drive) {
        try {
          const folderId = await drive.folderFor(folder);
          const up = await drive.upload(folderId, name, base.mimeType, input.bytes);
          const file: StoredFile = { ...base, storage: 'drive', driveFileId: up.id, webViewLink: up.webViewLink };
          await deps.repo.upsert(file);
          return { file };
        } catch (err: any) {
          // No se pierde el archivo: queda en el servidor y se avisa
          warning = `No se pudo guardar en Google Drive (${err?.message || err}); quedó guardado en el servidor.`;
          console.error('[archivos]', warning);
        }
      }
      const localKey = `files/${id}/${name}`;
      await deps.local().save(localKey, input.bytes, base.mimeType);
      const file: StoredFile = { ...base, storage: 'local', localKey };
      await deps.repo.upsert(file);
      return { file, warning };
    },

    async read(id: string): Promise<{ file: StoredFile; bytes: Buffer } | null> {
      if (!/^file-[a-z0-9-]{6,60}$/.test(id)) return null;
      const file = await deps.repo.get(id);
      if (!file) return null;
      if (file.storage === 'drive') {
        const drive = deps.drive();
        if (!drive || !file.driveFileId) throw new Error('Google Drive no está configurado en el servidor');
        return { file, bytes: await drive.download(file.driveFileId) };
      }
      return { file, bytes: await deps.local().read(file.localKey!) };
    },
  };
}

let service: ReturnType<typeof createFilesService> | null = null;
const files = () =>
  (service ??= createFilesService({
    repo: documentRepository<StoredFile>('files'),
    drive: companyDrive,
    local: () => createLocalStorage(uploadsDir()),
    now: () => new Date(),
  }));

filesRouter.post('/', async (req, res) => {
  try {
    const { name, dataBase64, folder } = req.body ?? {};
    if (typeof name !== 'string' || typeof dataBase64 !== 'string') return res.status(400).json({ success: false, error: 'Falta el archivo' });
    if (dataBase64.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 8) return res.status(413).json({ success: false, error: 'El archivo supera 25 MB' });
    const path = Array.isArray(folder) ? folder.filter((p: unknown): p is string => typeof p === 'string') : ['Otros'];
    const result = await files().save({ name, bytes: Buffer.from(dataBase64, 'base64'), folder: path, by: String(req.headers['x-user-name'] || '') });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

filesRouter.get('/:id/download', async (req, res) => {
  try {
    const found = await files().read(req.params.id);
    if (!found) return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
    const { file, bytes } = found;
    const inline = INLINE.test(file.mimeType) && req.query.download !== '1';
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(bytes);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});
