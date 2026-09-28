/**
 * Validación Real de Tipos MIME y Adjuntos — Tablero de Anuncios (Etapa 15.4)
 */

export interface AttachmentValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedMime?: string;
}

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Imágenes
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  // Documentos de oficina y PDF
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Valida un archivo adjunto según su tipo MIME real y tamaño.
 */
export function validateAttachment(file: {
  name: string;
  size: number;
  mimeType: string;
}): AttachmentValidationResult {
  if (file.size <= 0) {
    return { isValid: false, error: 'El archivo está vacío o dañado.' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `El archivo supera el tamaño máximo permitido de ${sizeMb} MB.`,
    };
  }

  const normalizedMime = (file.mimeType || '').toLowerCase().trim();
  const allowedExtensions = ALLOWED_MIME_TYPES[normalizedMime];

  if (!allowedExtensions) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido (${normalizedMime || 'desconocido'}). Solo se admiten PDF, imágenes y documentos de oficina.`,
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `La extensión del archivo no coincide con su tipo MIME real (${normalizedMime}).`,
    };
  }

  return { isValid: true, sanitizedMime: normalizedMime };
}
