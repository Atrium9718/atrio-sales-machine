import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';

export const PIPELINE_STAGES = [
  { id: 's1', name: 'Contacto inicial', color: 'border-blue-500', probability: 10 },
  { id: 's2', name: 'Calificado', color: 'border-indigo-500', probability: 25 },
  { id: 's3', name: 'Cotización enviada', color: 'border-purple-500', probability: 50 },
  { id: 's4', name: 'Negociación', color: 'border-amber-500', probability: 75 },
  { id: 's5', name: 'Ganada', color: 'border-green-500', probability: 100 },
  { id: 's6', name: 'Perdida', color: 'border-red-500', probability: 0 },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]['id'];
export const OPEN_STAGES: StageId[] = ['s1', 's2', 's3', 's4'];

export interface OpportunityEvent {
  at: string;
  by?: string;
  text: string;
}

export interface Opportunity {
  id: string;
  title: string;
  clientId?: string;
  clientName: string;
  contactName?: string;
  contactPhone?: string;
  amount: number;
  stageId: StageId;
  ownerId?: string;
  ownerName?: string;
  expectedCloseAt?: string;
  nextAction?: string;
  nextActionAt?: string;
  lostReason?: string;
  quoteId?: string;
  notes?: string;
  hot?: boolean;
  history?: OpportunityEvent[];
  createdAt?: string;
  updatedAt?: string;
}

/** Pipeline comercial: se guarda en el servidor (/api/data/opportunities). */
export const opportunitiesCollection = createServerCollection<Opportunity>({
  updatedEvent: 'fusion_opportunities_updated',
  adapter: dataApiAdapter('opportunities'),
});

export const stageName = (id: string) => PIPELINE_STAGES.find((s) => s.id === id)?.name ?? id;

/** Id corto y legible: OPP-AAMMDD-XXXX. */
export function newOpportunityId(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `OPP-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Aplica un cambio de etapa dejando constancia en el historial. */
export function moveOpportunity(opp: Opportunity, stageId: StageId, by?: string, extra: Partial<Opportunity> = {}): Opportunity {
  if (opp.stageId === stageId) return { ...opp, ...extra };
  const text = `Pasó de «${stageName(opp.stageId)}» a «${stageName(stageId)}»${extra.lostReason ? `: ${extra.lostReason}` : ''}`;
  return { ...opp, ...extra, stageId, history: [...(opp.history ?? []), { at: new Date().toISOString(), by, text }] };
}

/** Enlace de WhatsApp (Colombia por defecto si el número tiene 10 dígitos). */
export function whatsappLink(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`;
}
