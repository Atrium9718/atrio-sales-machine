/**
 * Vista del cliente sobre el avance de su proyecto (OT). Traduce las etapas internas de
 * producción a pasos comprensibles y calcula el porcentaje que ve el cliente, sin exponer
 * costos, tiempos ni comentarios internos.
 */

export interface ClientProgressStep {
  key: string;
  label: string;
  description: string;
}

/** Mismo orden que las etapas del tablero de producción (ids '1'…'6'). */
export const CLIENT_PROGRESS_STEPS: ClientProgressStep[] = [
  { key: 'POR_REVISAR', label: 'Revisión de archivos', description: 'Revisamos tus artes y especificaciones.' },
  { key: 'PRODUCCION_PROGRAMADA', label: 'Programado', description: 'Tu trabajo tiene turno asignado en planta.' },
  { key: 'EN_PRODUCCION', label: 'En producción', description: 'Estamos imprimiendo tu pedido.' },
  { key: 'ACABADOS', label: 'Acabados', description: 'Cortes, laminados y terminaciones.' },
  { key: 'FINALIZADO', label: 'Listo para entrega', description: 'Tu pedido pasó control de calidad.' },
  { key: 'ENTREGADO', label: 'Entregado', description: 'Pedido entregado.' },
];

/** Índice (0-based) de la etapa del proyecto; acepta el id numérico o la clave de la etapa. */
export function resolveStageIndex(stageId: unknown): number {
  const raw = String(stageId ?? '').trim();
  if (!raw || raw === 'POR_REVISAR') return 0;
  const byKey = CLIENT_PROGRESS_STEPS.findIndex((s) => s.key === raw.toUpperCase());
  if (byKey >= 0) return byKey;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= CLIENT_PROGRESS_STEPS.length) return n - 1;
  return 0;
}

export type ClientStepStatus = 'done' | 'current' | 'pending';

export interface ClientProjectView {
  id: string;
  number: string;
  name: string;
  quoteNumber: string | null;
  items: { name: string; quantity: number }[];
  percent: number;
  currentStep: ClientProgressStep;
  steps: (ClientProgressStep & { status: ClientStepStatus })[];
  isDelivered: boolean;
  dueDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Porcentaje visible: cada etapa alcanzada suma una parte igual; entregado = 100 %. */
export function computeClientPercent(stageIndex: number): number {
  const total = CLIENT_PROGRESS_STEPS.length;
  const idx = Math.min(Math.max(stageIndex, 0), total - 1);
  return Math.round(((idx + 1) / total) * 100);
}

const asString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Proyección segura de un proyecto interno para mostrarla al cliente. */
export function toClientProjectView(project: any): ClientProjectView {
  const idx = resolveStageIndex(project?.stageId ?? project?.stage);
  const lastIdx = CLIENT_PROGRESS_STEPS.length - 1;
  const items = Array.isArray(project?.itemsDetail)
    ? project.itemsDetail.map((it: any) => ({
        name: String(it?.name ?? 'Ítem'),
        quantity: Number(it?.quantity) || 0,
      }))
    : [];

  return {
    id: String(project?.id ?? ''),
    number: String(project?.number ?? ''),
    name: String(project?.name ?? 'Proyecto'),
    quoteNumber: asString(project?.quoteNumber),
    items,
    percent: computeClientPercent(idx),
    currentStep: CLIENT_PROGRESS_STEPS[idx],
    steps: CLIENT_PROGRESS_STEPS.map((s, i) => ({
      ...s,
      status: i < idx || (i === idx && idx === lastIdx) ? 'done' : i === idx ? 'current' : 'pending',
    })),
    isDelivered: idx === lastIdx,
    dueDate: asString(project?.dueDate),
    createdAt: asString(project?.createdAt),
    updatedAt: asString(project?.updatedAt),
  };
}

/** NIT sin puntos, guiones ni dígito de verificación separado ("900.123.456-1" -> "900123456"). */
export function normalizeNit(nit: unknown): string {
  const raw = String(nit ?? '').trim();
  if (!raw) return '';
  const base = raw.includes('-') ? raw.slice(0, raw.lastIndexOf('-')) : raw;
  return base.replace(/\D/g, '');
}

/** Nombre comparable: minúsculas, sin tildes, sin puntuación ni sufijos societarios. */
export function normalizeClientName(name: unknown): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(s ?a ?s|s ?a|ltda|limitada|sociedad anonima)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ClientIdentity {
  nit?: string;
  name?: string;
}

/**
 * ¿El proyecto pertenece al cliente? Si ambos tienen NIT, decide el NIT; si no, el nombre
 * normalizado debe coincidir exactamente.
 */
export function projectBelongsToClient(
  project: any,
  quote: any | undefined,
  client: ClientIdentity
): boolean {
  const clientNit = normalizeNit(client.nit);
  const projectNit = normalizeNit(quote?.clientNit ?? project?.clientNit);
  if (clientNit && projectNit) return clientNit === projectNit;

  const clientName = normalizeClientName(client.name);
  if (!clientName) return false;
  const names = [project?.client, project?.clientName, quote?.clientName, quote?.client].map(normalizeClientName);
  return names.some((n) => n && n === clientName);
}
