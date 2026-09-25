/**
 * Búsqueda de Mensajes en Español sin Acentos / Tildes (Etapa 15.5)
 */

import { ChatMessage } from './types';

/**
 * Normaliza una cadena de texto en español:
 * - Descompone tildes/diacríticos (NFD)
 * - Remueve marcas de acentuación: á->a, é->e, í->i, ó->o, ú->u, ü->u, ñ se preserva como n o ñ
 * - Convierte a minúsculas y elimina espacios extras.
 */
export function normalizeSpanishSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos/tildes
    .toLowerCase()
    .trim();
}

export interface ChatSearchFilters {
  channelId?: string;
  authorId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  hasAttachments?: boolean;
  entityType?: string;
}

/**
 * Realiza búsqueda en una colección de mensajes aplicando coincidencia sin tilde
 * sobre bodyPlain y autor, además de filtros de canal, autor y rango de fechas.
 */
export function searchChatMessages(
  messages: ChatMessage[],
  query: string,
  filters?: ChatSearchFilters
): ChatMessage[] {
  const normalizedQuery = normalizeSpanishSearchText(query);
  const queryTokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  let dateFromMs: number | null = null;
  let dateToMs: number | null = null;

  if (filters?.dateFrom) {
    dateFromMs = new Date(filters.dateFrom).getTime();
  }
  if (filters?.dateTo) {
    const d = new Date(filters.dateTo);
    d.setHours(23, 59, 59, 999);
    dateToMs = d.getTime();
  }

  return messages.filter((msg) => {
    // 1. Filtro por canal
    if (filters?.channelId && msg.channelId !== filters.channelId) {
      return false;
    }

    // 2. Filtro por autor
    if (filters?.authorId && msg.authorId !== filters.authorId) {
      return false;
    }

    // 3. Filtro por fecha inicial
    const msgTime = new Date(msg.createdAt).getTime();
    if (dateFromMs !== null && msgTime < dateFromMs) {
      return false;
    }

    // 4. Filtro por fecha final
    if (dateToMs !== null && msgTime > dateToMs) {
      return false;
    }

    // 5. Filtro por adjuntos
    if (filters?.hasAttachments !== undefined) {
      const has = Array.isArray(msg.attachments) && msg.attachments.length > 0;
      if (filters.hasAttachments && !has) return false;
      if (!filters.hasAttachments && has) return false;
    }

    // 6. Si no hay texto de búsqueda, cumple los filtros
    if (queryTokens.length === 0) {
      return true;
    }

    // 7. Búsqueda de tokens sin tildes en bodyPlain y autor
    const targetText = `${msg.bodyPlain || ''} ${msg.authorName || ''} ${msg.linkedEntityType || ''}`;
    const normalizedTarget = normalizeSpanishSearchText(targetText);

    // Todos los tokens deben coincidir (AND)
    return queryTokens.every((token) => normalizedTarget.includes(token));
  });
}
