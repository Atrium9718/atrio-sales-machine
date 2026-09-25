import { EventEmitter } from 'events';

class AIEventsEmitter extends EventEmitter {}

export const aiEvents = new AIEventsEmitter();

// Types for events requested in Prompt 14.6
export type AIEventPayloads = {
  'evaluacion.ejecutada': { agentKey: string; version: number; score: number };
  'evaluacion.fallo_critico': { agentKey: string; version: number; failedCases: string[] };
  'ia.presupuesto_70': { organizationId: string; currentSpend: number; limit: number };
  'ia.presupuesto_90': { organizationId: string; currentSpend: number; limit: number };
  'ia.presupuesto_agotado': { organizationId: string; currentSpend: number; limit: number };
  'ia.ejecucion_anomala': { runId: string; cost: number; expectedCost: number };
  'ia.inyeccion_detectada': { userId: string; input: string; agentKey: string };
  'ia.prompt_actualizado': { agentKey: string; newVersion: number; updatedBy: string };
};

export function emitAIEvent<K extends keyof AIEventPayloads>(
  event: K,
  payload: AIEventPayloads[K]
) {
  console.log(`[AI Event] ${event}`, payload);
  aiEvents.emit(event, payload);
}
