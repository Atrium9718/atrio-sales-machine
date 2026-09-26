/**
 * Adjuntos que el cliente envía desde su portal (artes, referencias). El tipo se decide por
 * la firma binaria del contenido, no por lo que declare el navegador, y la extensión debe
 * coincidir con ese tipo.
 */

export const MAX_CLIENT_ATTACHMENTS = 3;
export const MAX_CLIENT_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB por archivo

interface FileKind {
  mime: string;
  extensions: string[];
  matches: (b: Uint8Array) => boolean;
}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

const FILE_KINDS: FileKind[] = [
  // Los .ai modernos son PDF internamente
  { mime: 'application/pdf', extensions: ['.pdf', '.ai'], matches: (b) => startsWith(b, ascii('%PDF-')) },
  {
    mime: 'application/postscript',
    extensions: ['.eps', '.ps', '.ai'],
    matches: (b) => startsWith(b, ascii('%!PS')) || startsWith(b, [0xc5, 0xd0, 0xd3, 0xc6]),
  },
  { mime: 'image/png', extensions: ['.png'], matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'], matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { mime: 'image/webp', extensions: ['.webp'], matches: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8) },
  {
    mime: 'image/tiff',
    extensions: ['.tif', '.tiff'],
    matches: (b) => startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a]),
  },
];

export const CLIENT_ATTACHMENT_EXTENSIONS = Array.from(new Set(FILE_KINDS.flatMap((k) => k.extensions)));

/** Nombre seguro para almacenamiento: sin rutas ni caracteres especiales, máx. 100 caracteres. */
export function sanitizeFileName(name: string): string {
  const base = String(name || '').split(/[\\/]/).pop() || '';
  const cleaned = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '');
  if (!cleaned) return 'archivo';
  if (cleaned.length <= 100) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 && cleaned.length - dot <= 6 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, 100 - ext.length) + ext;
}

export type AttachmentCheck = { ok: true; mime: string } | { ok: false; error: string };

export function validateClientAttachment(name: string, bytes: Uint8Array): AttachmentCheck {
  if (bytes.length === 0) return { ok: false, error: `"${name}" está vacío.` };
  if (bytes.length > MAX_CLIENT_ATTACHMENT_BYTES) {
    return { ok: false, error: `"${name}" supera el máximo de ${MAX_CLIENT_ATTACHMENT_BYTES / (1024 * 1024)} MB.` };
  }
  const lower = name.toLowerCase();
  const kind = FILE_KINDS.find((k) => k.matches(bytes));
  if (!kind) {
    return { ok: false, error: `"${name}" no es un tipo permitido. Envía PDF, AI, EPS, PNG, JPG, WEBP o TIFF.` };
  }
  if (!kind.extensions.some((ext) => lower.endsWith(ext))) {
    return { ok: false, error: `La extensión de "${name}" no coincide con su contenido.` };
  }
  return { ok: true, mime: kind.mime };
}
