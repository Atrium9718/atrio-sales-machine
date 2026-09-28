/**
 * Gestión de Acuses, Métricas de Lectura y Reglas de Descarte — Etapa 15.4
 */

import { isBusinessDay } from '../calendar/colombian-holidays';

export interface ReceiptRecord {
  id?: string;
  userId: string;
  deliveredAt?: Date | string | null;
  seenAt?: Date | string | null;
  readAt?: Date | string | null;
  acknowledgedAt?: Date | string | null;
  acknowledgedIp?: string | null;
  dismissedAt?: Date | string | null;
}

export interface ReadingMetrics {
  totalTarget: number;
  deliveredCount: number;
  seenCount: number;
  readCount: number;
  acknowledgedCount: number;
  pendingCount: number;
  readPercent: number;
  acknowledgedPercent: number;
}

/**
 * Calcula las métricas consolidadas de lectura y confirmación de un anuncio.
 */
export function calculateReadingMetrics(receipts: ReceiptRecord[]): ReadingMetrics {
  const totalTarget = receipts.length;
  if (totalTarget === 0) {
    return {
      totalTarget: 0,
      deliveredCount: 0,
      seenCount: 0,
      readCount: 0,
      acknowledgedCount: 0,
      pendingCount: 0,
      readPercent: 0,
      acknowledgedPercent: 0,
    };
  }

  let deliveredCount = 0;
  let seenCount = 0;
  let readCount = 0;
  let acknowledgedCount = 0;

  for (const r of receipts) {
    if (r.deliveredAt) deliveredCount++;
    if (r.seenAt) seenCount++;
    if (r.readAt) readCount++;
    if (r.acknowledgedAt) acknowledgedCount++;
  }

  const pendingCount = totalTarget - acknowledgedCount;
  const readPercent = Math.round((readCount / totalTarget) * 1000) / 10;
  const acknowledgedPercent = Math.round((acknowledgedCount / totalTarget) * 1000) / 10;

  return {
    totalTarget,
    deliveredCount,
    seenCount,
    readCount,
    acknowledgedCount,
    pendingCount,
    readPercent,
    acknowledgedPercent,
  };
}

/**
 * Valida si un anuncio puede ser descartado de la vista por el usuario.
 * Regla de negocio:
 * "Un anuncio con confirmación obligatoria no se puede descartar hasta que el usuario confirme su lectura."
 */
export function canDismissAnnouncement(
  requiresAcknowledgement: boolean,
  receipt?: ReceiptRecord | null
): boolean {
  if (!requiresAcknowledgement) {
    return true;
  }
  return !!(receipt && receipt.acknowledgedAt);
}

/**
 * Valida si el momento actual corresponde a horario hábil colombiano.
 * Regla de negocio:
 * "No se envía ningún recordatorio fuera de horario hábil ni en festivo (Etapa 4)."
 *
 * Horario hábil colombiano: Lunes a Viernes (no festivos), entre las 08:00 y las 18:00 UTC-5.
 */
export function isColombianBusinessHours(date = new Date()): boolean {
  if (!isBusinessDay(date)) {
    return false;
  }

  // Convertir hora UTC a hora colombiana (UTC-5)
  const colombiaHour = (date.getUTCHours() - 5 + 24) % 24;

  return colombiaHour >= 8 && colombiaHour < 18;
}
