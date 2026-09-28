/**
 * Subida de archivos del equipo al servidor (que los guarda en el Google Drive de la empresa o
 * en su disco). Nadie tiene que conectar su propia cuenta de Drive.
 */
export interface FileRef {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storage: 'drive' | 'local';
  webViewLink?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export const MAX_UPLOAD_MB = 25;

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

export async function uploadFile(file: File, folder: string[]): Promise<{ file: FileRef; warning?: string }> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`"${file.name}" supera ${MAX_UPLOAD_MB} MB`);
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, dataBase64: await toBase64(file), folder }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `No se pudo subir "${file.name}"`);
  return { file: data.file, warning: data.warning };
}

/** Enlace para abrir o descargar el archivo desde la app. */
export const fileUrl = (ref: Pick<FileRef, 'id'>, download = false) => `/api/files/${encodeURIComponent(ref.id)}/download${download ? '?download=1' : ''}`;

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
