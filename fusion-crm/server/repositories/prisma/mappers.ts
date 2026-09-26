/**
 * Conversión entre los documentos que usa la aplicación (forma heredada de Firestore) y las
 * tablas relacionales de Postgres. Las columnas guardan los datos clave para reportes; el
 * documento completo se conserva en `appData` para que la aplicación reciba exactamente lo
 * que guardó.
 */
import { normalizeClientName, normalizeNit } from '../../../packages/core/src/portal/clientProgress';

export const ORGANIZATION_ID = 'org-1';

// ── Utilidades numéricas ───────────────────────────────────────

/** Número finito o 0; limita al rango de la columna decimal para no romper el INSERT. */
export function money(value: unknown, max = 9_999_999_999_999): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-max, Math.min(max, Math.round(n * 100) / 100));
}

export const percent = (value: unknown) => money(value, 999.99);

export function intOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(-2_147_483_648, Math.min(2_147_483_647, Math.round(n))) : null;
}

export function dateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** JSON plano (sin undefined, Decimal ni Date) para columnas JSONB. */
export const plainJson = <T>(value: T): any => JSON.parse(JSON.stringify(value ?? {}));

// ── Cotizaciones ───────────────────────────────────────────────

const QUOTE_STATUS: Record<string, string> = {
  borrador: 'DRAFT',
  'pre-cotización': 'DRAFT',
  'pre-cotizacion': 'DRAFT',
  precotización: 'DRAFT',
  finalizada: 'DRAFT',
  enviada: 'SENT',
  vista: 'VIEWED',
  'en negociación': 'NEGOTIATING',
  'en negociacion': 'NEGOTIATING',
  negociacion: 'NEGOTIATING',
  aprobada: 'APPROVED',
  ganada: 'APPROVED',
  ganado: 'APPROVED',
  aceptada: 'APPROVED',
  rechazada: 'REJECTED',
  perdida: 'REJECTED',
  expirada: 'EXPIRED',
  vencida: 'EXPIRED',
  cancelada: 'CANCELLED',
  anulada: 'CANCELLED',
};

export function mapQuoteStatus(status: unknown): string {
  const key = String(status ?? '').trim().toLowerCase();
  if (QUOTE_STATUS[key]) return QUOTE_STATUS[key];
  const upper = key.toUpperCase();
  return ['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(upper) ? upper : 'DRAFT';
}

const PRODUCTION_MODES = ['IN_HOUSE', 'OUTSOURCED', 'AGENCY'];

/** Id de fila de un ítem: los ids de ítem solo son únicos dentro de su cotización. */
export const quoteItemRowId = (quoteId: string, itemId: string, index: number) => `${quoteId}::${itemId || `item-${index + 1}`}`;

export function toQuoteItemRow(quoteId: string, item: any, index: number) {
  const technique = String(item?.printTechnique ?? '').toUpperCase();
  return {
    id: quoteItemRowId(quoteId, String(item?.id ?? ''), index),
    organizationId: ORGANIZATION_ID,
    quoteId,
    order: intOrNull(item?.order) ?? index + 1,
    reference: str(item?.reference),
    description: String(item?.description ?? ''),
    productionMode: (PRODUCTION_MODES.includes(item?.productionMode) ? item.productionMode : 'IN_HOUSE') as any,
    size: str(item?.size),
    inks: str(item?.inks),
    materials: str(item?.materials) ?? str(item?.material),
    finishes: str(item?.finishes),
    quantity: money(item?.quantity, 99_999_999),
    unit: str(item?.unit),
    unitPrice: money(item?.unitPrice),
    lineSubtotal: money(item?.lineSubtotal ?? item?.subtotal),
    applyVat: item?.applyVat !== false,
    vatAmount: money(item?.vatAmount),
    lineTotal: money(item?.lineTotal ?? item?.total),
    rawMaterialCost: money(item?.rawMaterialCost),
    laborHours: money(item?.laborHours, 99_999_999),
    laborCost: money(item?.laborCost),
    outsourcedCost: money(item?.outsourcedCost),
    otherCost: money(item?.otherCost),
    internalCost: money(item?.internalCost),
    marginPercent: percent(item?.marginPercent),
    paperTypeId: str(item?.paperTypeId),
    paperSheets: intOrNull(item?.paperSheets),
    wastePercent: percent(item?.wastePercent),
    notes: str(item?.notes),
    // La corrida del asistente vive en Firestore en esta fase: se conserva en appData
    assistRunId: null,
    productionSpec: str(item?.productionSpec),
    impositionPerSheet: intOrNull(item?.impositionPerSheet),
    plateCount: intOrNull(item?.plateCount),
    sheetsNeeded: intOrNull(item?.sheetsNeeded),
    printTechnique: (technique === 'LITHO' || technique === 'DIGITAL' ? technique : null) as any,
    appData: plainJson(item),
  };
}

export interface QuoteRelations {
  clientId: string;
  ownerId: string;
  /** Revisión a usar si el número ya lo tiene otra cotización. */
  revision: number;
}

export function toQuoteRow(quote: any, rel: QuoteRelations) {
  const { items, ...rest } = quote;
  const list: any[] = Array.isArray(items) ? items : [];
  const status = mapQuoteStatus(quote.status);
  const sentVia = str(quote.sentVia);
  return {
    id: String(quote.id),
    organizationId: ORGANIZATION_ID,
    number: String(quote.number || quote.id),
    revision: rel.revision,
    clientId: rel.clientId,
    contactName: str(quote.contactName) ?? str(quote.clientData?.contactName),
    ownerId: rel.ownerId,
    status: status as any,
    issueDate: dateOrNull(quote.date) ?? dateOrNull(quote.createdAt) ?? new Date(),
    paymentTerms: str(quote.paymentTerms),
    deliveryTime: str(quote.deliveryTime),
    notes: str(quote.notes) ?? str(quote.observations),
    internalNotes: str(quote.commercialNotes),
    subtotal: money(quote.subtotal),
    vatAmount: money(quote.vatAmount),
    total: money(quote.total),
    internalCost: money(list.reduce((s, it) => s + (Number(it?.internalCost) || 0), 0)),
    approvedAt: status === 'APPROVED' ? dateOrNull(quote.approvedAt) : null,
    approvedByName: status === 'APPROVED' ? str(quote.approvedBy) : null,
    sentAt: dateOrNull(quote.sentAt),
    sentVia: sentVia ? [sentVia] : [],
    aiExtracted: /agente ia/i.test(String(quote.advisorName ?? '')),
    createdAt: dateOrNull(quote.createdAt) ?? new Date(),
    appData: plainJson(rest),
  };
}

export function fromQuoteRow(row: { id: string; appData: any; items?: { appData: any; order: number }[] }): any {
  const items = [...(row.items || [])].sort((a, b) => a.order - b.order).map((it) => it.appData);
  return { ...(row.appData || {}), id: row.id, items };
}

// ── Clientes ───────────────────────────────────────────────────

export function splitNit(nit: unknown): { number: string | null; dv: string | null } {
  const raw = String(nit ?? '').trim();
  if (!raw || /por definir/i.test(raw)) return { number: null, dv: null };
  const number = normalizeNit(raw);
  const dv = raw.includes('-') ? raw.slice(raw.lastIndexOf('-') + 1).replace(/\D/g, '') || null : null;
  return { number: number || null, dv };
}

const CLIENT_TYPES = ['PROSPECT', 'ACTIVE', 'INACTIVE', 'LOST'];
const TEMPERATURES = ['COLD', 'WARM', 'HOT'];

export function toClientRow(customer: any, code: string, documentNumber: string | null) {
  const { dv } = splitNit(customer.nit ?? customer.documentNumber);
  const name = String(customer.name || customer.tradeName || customer.legalName || 'Cliente sin nombre');
  return {
    id: String(customer.id),
    organizationId: ORGANIZATION_ID,
    code,
    name,
    legalName: str(customer.legalName) ?? str(customer.name),
    documentType: (documentNumber ? 'NIT' : 'NONE') as any,
    documentNumber,
    documentDv: dv,
    email: str(customer.email),
    phone: str(customer.phone1) ?? str(customer.phone),
    mobile: str(customer.phone2) ?? str(customer.mobile),
    address: str(customer.address),
    city: str(customer.city),
    sector: str(customer.sector),
    clientType: (CLIENT_TYPES.includes(customer.type) ? customer.type : 'PROSPECT') as any,
    temperature: (TEMPERATURES.includes(customer.temp) ? customer.temp : 'COLD') as any,
    normalizedName: normalizeClientName(name),
    customFields: plainJson(customer),
  };
}

export const fromClientRow = (row: { id: string; customFields: any }) => ({ ...(row.customFields || {}), id: row.id });

// ── Proyectos de producción ────────────────────────────────────

/** Etapas del tablero de producción (mismo orden e ids que la interfaz). */
export const PRODUCTION_STAGES = [
  { appId: '1', key: 'POR_REVISAR', name: 'Por Revisar', isFinal: false, requiresQualityApproval: false, approvals: 0 },
  { appId: '2', key: 'PRODUCCION_PROGRAMADA', name: 'Programada', isFinal: false, requiresQualityApproval: false, approvals: 0 },
  { appId: '3', key: 'EN_PRODUCCION', name: 'En Producción', isFinal: false, requiresQualityApproval: false, approvals: 0 },
  { appId: '4', key: 'ACABADOS', name: 'Acabados', isFinal: false, requiresQualityApproval: true, approvals: 2 },
  { appId: '5', key: 'FINALIZADO', name: 'Finalizado', isFinal: false, requiresQualityApproval: false, approvals: 0 },
  { appId: '6', key: 'ENTREGADO', name: 'Entregado', isFinal: true, requiresQualityApproval: false, approvals: 0 },
];

export const stageRowId = (key: string) => `${ORGANIZATION_ID}-stage-${key}`;

export function resolveStageKey(stageId: unknown): string {
  const raw = String(stageId ?? '').trim();
  const byId = PRODUCTION_STAGES.find((s) => s.appId === raw);
  if (byId) return byId.key;
  const byKey = PRODUCTION_STAGES.find((s) => s.key === raw.toUpperCase());
  return byKey ? byKey.key : 'POR_REVISAR';
}

export function mapProductType(productType: unknown): string {
  const t = String(productType ?? '').toLowerCase();
  if (/lito|offset/.test(t)) return 'LITHOGRAPHY';
  if (/gran formato|large/.test(t)) return 'LARGE_FORMAT';
  if (/uv|dtf/.test(t)) return 'DTF_UV';
  if (/editorial|libro|revista/.test(t)) return 'EDITORIAL';
  if (/empaque|packaging|caja/.test(t)) return 'PACKAGING';
  if (/merch|promocional/.test(t)) return 'MERCHANDISING';
  if (/tercer|outsourc/.test(t)) return 'OUTSOURCED';
  if (/demanda/.test(t)) return 'PRINT_ON_DEMAND';
  return 'DIGITAL';
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function toProjectRow(project: any, number: string) {
  const stageKey = resolveStageKey(project.stageId ?? project.stage);
  return {
    id: String(project.id),
    organizationId: ORGANIZATION_ID,
    number,
    name: String(project.name || project.number || 'Proyecto'),
    description: str(project.description),
    clientNameSnapshot: str(project.client) ?? str(project.clientName),
    quoteId: str(project.quoteId),
    stageId: stageRowId(stageKey),
    stageEnteredAt: dateOrNull(project.stageEnteredAt) ?? new Date(),
    productType: mapProductType(project.productType) as any,
    priority: (PRIORITIES.includes(project.priority) ? project.priority : 'MEDIUM') as any,
    dueDate: dateOrNull(project.dueDate),
    completedAt: dateOrNull(project.completedAt),
    budgetTotal: money(project.quoteTotal),
    laborCost: money(project.laborCost),
    materialCost: money(project.materialCost),
    outsourcedCost: money(project.outsourcedCost),
    otherCost: money(project.otherCost),
    totalRealHours: money(project.totalRealHours, 99_999_999),
    invoiced: project.isBilled === true,
    artworkKeys: Array.isArray(project.artworkKeys) ? project.artworkKeys.map(String) : [],
    itemsDetail: Array.isArray(project.itemsDetail) ? plainJson(project.itemsDetail) : undefined,
    createdAt: dateOrNull(project.createdAt) ?? new Date(),
    appData: plainJson(project),
  };
}

export const fromProjectRow = (row: { id: string; appData: any }) => ({ ...(row.appData || {}), id: row.id });
