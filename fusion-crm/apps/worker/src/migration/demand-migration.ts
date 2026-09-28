import crypto from 'crypto';

export type HistoricalDemandState =
  | 'Pagado'
  | 'Entregado'
  | 'Listo para entregar'
  | 'Facturación'
  | 'Trabajando en ello'
  | string;

export type MappedPrintOrderStatus =
  | 'COMPLETED'
  | 'DELIVERED'
  | 'READY'
  | 'AWAITING_ARTWORK'
  | 'IN_PRODUCTION'
  | 'NEW'
  | 'CANCELLED';

export interface RawHistoricalRow {
  sheetName: 'Por demanda' | 'UV-DTF' | '30 Sept 2025' | '2024' | string;
  rowNumber: number;
  date?: string | Date;
  customerNameRaw: string;
  responsibleRaw?: string;
  description: string;
  quantity?: number;
  amount?: number;
  statusRaw: HistoricalDemandState;
  metadata?: Record<string, any>;
}

export interface ClientTarget {
  id: string;
  name: string;
  documentNumber?: string;
}

export interface MigrationMatchResult {
  rowHash: string;
  sheetName: string;
  rowNumber: number;
  date: string;
  customerNameRaw: string;
  matchedClientId: string | null;
  matchedClientName: string | null;
  similarityScore: number;
  responsible: string;
  status: MappedPrintOrderStatus;
  description: string;
  amount: number;
  isLinked: boolean;
}

export interface MigrationReport {
  timestamp: string;
  totalProcessed: number;
  totalLinked: number;
  totalUnlinked: number;
  totalSkippedDuplicates: number;
  statusCounts: Record<MappedPrintOrderStatus, number>;
  unlinkedItems: {
    sheetName: string;
    rowNumber: number;
    customerNameRaw: string;
    bestMatchCandidate: string | null;
    bestSimilarity: number;
    description: string;
  }[];
}

/**
 * Mapeo de estados del archivo histórico a PrintOrderStatus de Prisma
 */
export function mapHistoricalStatus(statusRaw: string): MappedPrintOrderStatus {
  const norm = (statusRaw || '').trim().toLowerCase();

  if (norm.includes('pagad')) return 'COMPLETED';
  if (norm.includes('entregad')) return 'DELIVERED';
  if (norm.includes('listo') || norm.includes('terminad')) return 'READY';
  if (norm.includes('factura') || norm.includes('cobro')) return 'AWAITING_ARTWORK';
  if (norm.includes('trabajando') || norm.includes('proceso') || norm.includes('producci')) return 'IN_PRODUCTION';
  if (norm.includes('anulad') || norm.includes('cancelad')) return 'CANCELLED';

  return 'NEW';
}

/**
 * Cálculo de similitud de cadenas (Levenshtein normalizado + Token Overlap)
 * Devuelve un score entre 0.0 y 1.0
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const clean = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,\-_/\\()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const s1 = clean(str1);
  const s2 = clean(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // Substring or prefix match (e.g. "Editorial Planeta Col" vs "Editorial Planeta Colombia")
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    if (ratio >= 0.75) return Math.max(0.92, ratio);
  }

  // Token Jaccard similarity
  const tokens1 = new Set(s1.split(' ').filter(Boolean));
  const tokens2 = new Set(s2.split(' ').filter(Boolean));
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const tokenJaccard = union.size > 0 ? intersection.size / union.size : 0;

  // Levenshtein distance
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  const levSim = Math.max(0, 1 - distance / maxLen);

  // Return highest of token overlap or Levenshtein
  return Math.max(levSim, tokenJaccard >= 0.8 ? 0.93 : tokenJaccard);
}

/**
 * Genera un hash SHA-256 idempotente para la fila
 */
export function generateRowHash(row: RawHistoricalRow): string {
  const payload = [
    row.sheetName,
    row.rowNumber,
    row.customerNameRaw,
    row.description,
    row.amount ?? 0,
    row.statusRaw,
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Procesa la migración del histórico contra una lista de clientes objetivo
 */
export function migrateHistoricalDemandRows(
  rows: RawHistoricalRow[],
  clients: ClientTarget[],
  existingRowHashes: Set<string> = new Set()
): { results: MigrationMatchResult[]; report: MigrationReport } {
  const results: MigrationMatchResult[] = [];
  const statusCounts: Record<MappedPrintOrderStatus, number> = {
    COMPLETED: 0,
    DELIVERED: 0,
    READY: 0,
    AWAITING_ARTWORK: 0,
    IN_PRODUCTION: 0,
    NEW: 0,
    CANCELLED: 0,
  };

  let totalSkippedDuplicates = 0;
  let totalLinked = 0;
  let totalUnlinked = 0;
  const unlinkedItems: MigrationReport['unlinkedItems'] = [];

  for (const row of rows) {
    const rowHash = generateRowHash(row);

    // Idempotencia: si ya existe el hash, ignorar
    if (existingRowHashes.has(rowHash)) {
      totalSkippedDuplicates++;
      continue;
    }
    existingRowHashes.add(rowHash);

    // Mapear estado
    const status = mapHistoricalStatus(row.statusRaw);
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Coincidencia difusa contra clientes
    let bestClient: ClientTarget | null = null;
    let bestSimilarity = 0;

    for (const client of clients) {
      const sim = calculateStringSimilarity(row.customerNameRaw, client.name);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestClient = client;
      }
      if (bestSimilarity >= 0.99) break; // Perfect match shortcut
    }

    const isLinked = bestSimilarity >= 0.9 && bestClient !== null;

    if (isLinked && bestClient) {
      totalLinked++;
      results.push({
        rowHash,
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        customerNameRaw: row.customerNameRaw,
        matchedClientId: bestClient.id,
        matchedClientName: bestClient.name,
        similarityScore: Math.round(bestSimilarity * 1000) / 1000,
        responsible: row.responsibleRaw || 'Carlos M.',
        status,
        description: row.description || 'Trabajo por demanda',
        amount: Number(row.amount) || 0,
        isLinked: true,
      });
    } else {
      totalUnlinked++;
      unlinkedItems.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        customerNameRaw: row.customerNameRaw,
        bestMatchCandidate: bestClient ? bestClient.name : null,
        bestSimilarity: Math.round(bestSimilarity * 1000) / 1000,
        description: row.description || '',
      });

      results.push({
        rowHash,
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        customerNameRaw: row.customerNameRaw,
        matchedClientId: null, // Sin enlazar si < 0.9
        matchedClientName: null,
        similarityScore: Math.round(bestSimilarity * 1000) / 1000,
        responsible: row.responsibleRaw || 'Carlos M.',
        status,
        description: row.description || 'Trabajo por demanda',
        amount: Number(row.amount) || 0,
        isLinked: false,
      });
    }
  }

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalProcessed: results.length,
    totalLinked,
    totalUnlinked,
    totalSkippedDuplicates,
    statusCounts,
    unlinkedItems,
  };

  return { results, report };
}
