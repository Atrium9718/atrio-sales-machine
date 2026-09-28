/**
 * Motor de Estrategias y Reparto para Colas de Atención Telefónica (VoiceQueue)
 * Etapa 17.6 — Bloque A.
 *
 * Funciones puras para:
 *  1. Selección de agente según 5 estrategias ACD + Skill-Based
 *  2. Respeto estricto de penalidades (penalty 0 primero)
 *  3. Exclusión de agentes no disponibles (WRAP_UP, BREAK, ON_CALL, OFFLINE)
 *  4. Detección de auto-pausa por desatención (2 no respuestas consecutivas)
 *  5. Control de rebote máximo entre colas (máx 2 saltos)
 *  6. Cálculo exacto de Nivel de Servicio (SLA) y Tiempo Estimado de Espera (AHT móvil)
 */

export type VoiceAgentState =
  | 'AVAILABLE'
  | 'ON_CALL'
  | 'WRAP_UP'
  | 'BREAK'
  | 'OFFLINE';

export type QueueStrategyType =
  | 'RINGALL'
  | 'ROUND_ROBIN'
  | 'LEAST_RECENT'
  | 'FEWEST_CALLS'
  | 'LONGEST_IDLE'
  | 'SKILL_BASED';

export interface QueueAgentCandidate {
  userId: string;
  name: string;
  extension: string;
  penalty: number; // 0, 1, 2... (menor número = mayor prioridad)
  skills: string[];
  status: VoiceAgentState;
  lastCallCompletedAt: Date | null;
  callsHandledToday: number;
  availableSince: Date | null;
  consecutiveMissedCalls: number;
}

export interface QueueSelectionOptions {
  lastAssignedUserId?: string;
  requiredSkills?: string[];
  now?: Date;
}

export interface ServiceLevelCallSample {
  callId: string;
  waitSeconds: number;
  answered: boolean;
}

/**
 * Filtra los candidatos elegibles:
 *  1. Solo agentes en estado AVAILABLE
 *  2. Si requiredSkills está presente, deben poseer todas las habilidades requeridas
 *  3. Solo del nivel de penalidad más bajo que tenga al menos un agente disponible
 */
export function filterEligibleCandidates(
  candidates: QueueAgentCandidate[],
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  // 1. Filtrar solo disponibles
  let available = candidates.filter((c) => c.status === 'AVAILABLE');
  if (available.length === 0) return [];

  // 2. Si se solicitan skills, filtrar por coincidencia exacta de todas las habilidades
  if (requiredSkills && requiredSkills.length > 0) {
    const requiredNormalized = requiredSkills.map((s) => s.trim().toLowerCase());
    available = available.filter((c) => {
      const agentSkills = c.skills.map((s) => s.trim().toLowerCase());
      return requiredNormalized.every((req) => agentSkills.includes(req));
    });
    if (available.length === 0) return [];
  }

  // 3. Obtener la penalidad mínima presente entre los disponibles
  const minPenalty = Math.min(...available.map((c) => c.penalty));

  // 4. Retornar únicamente los agentes de la penalidad mínima
  return available.filter((c) => c.penalty === minPenalty);
}

/**
 * Estrategia RINGALL:
 * Timbra a TODOS los agentes disponibles del menor nivel de penalidad simultáneamente.
 */
export function selectRingall(
  candidates: QueueAgentCandidate[],
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  return filterEligibleCandidates(candidates, requiredSkills);
}

/**
 * Estrategia ROUND_ROBIN:
 * Reparto circular por turnos, recordando el último agente asignado.
 * Retorna un único agente o array vacío.
 */
export function selectRoundRobin(
  candidates: QueueAgentCandidate[],
  lastAssignedUserId?: string,
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  const eligible = filterEligibleCandidates(candidates, requiredSkills);
  if (eligible.length === 0) return [];

  // Orden estable por userId para consistencia determinista
  const sorted = [...eligible].sort((a, b) => a.userId.localeCompare(b.userId));

  if (!lastAssignedUserId) {
    return [sorted[0]];
  }

  const lastIndex = sorted.findIndex((c) => c.userId === lastAssignedUserId);
  if (lastIndex === -1) {
    // Si el último agente asignado ya no está en el grupo elegible, tomar el primero
    return [sorted[0]];
  }

  const nextIndex = (lastIndex + 1) % sorted.length;
  return [sorted[nextIndex]];
}

/**
 * Estrategia LEAST_RECENT:
 * Asigna la llamada al agente que hace más tiempo que no atiende una llamada.
 * Quienes nunca han atendido (lastCallCompletedAt === null) tienen máxima prioridad.
 */
export function selectLeastRecent(
  candidates: QueueAgentCandidate[],
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  const eligible = filterEligibleCandidates(candidates, requiredSkills);
  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => {
    // Si a nunca ha atendido y b sí, a va primero
    if (!a.lastCallCompletedAt && b.lastCallCompletedAt) return -1;
    if (a.lastCallCompletedAt && !b.lastCallCompletedAt) return 1;
    // Si ambos nunca han atendido, desempate por availableSince (más tiempo libre)
    if (!a.lastCallCompletedAt && !b.lastCallCompletedAt) {
      const timeA = a.availableSince ? a.availableSince.getTime() : 0;
      const timeB = b.availableSince ? b.availableSince.getTime() : 0;
      if (timeA !== timeB) return timeA - timeB; // Más antiguo primero
      return a.userId.localeCompare(b.userId);
    }
    // Si ambos tienen fecha de última llamada, el de fecha más antigua va primero
    const diff = a.lastCallCompletedAt!.getTime() - b.lastCallCompletedAt!.getTime();
    if (diff !== 0) return diff;
    return a.userId.localeCompare(b.userId);
  });

  return [sorted[0]];
}

/**
 * Estrategia FEWEST_CALLS:
 * Asigna la llamada al agente que menos llamadas lleva atendidas en la jornada de hoy.
 */
export function selectFewestCalls(
  candidates: QueueAgentCandidate[],
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  const eligible = filterEligibleCandidates(candidates, requiredSkills);
  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => {
    if (a.callsHandledToday !== b.callsHandledToday) {
      return a.callsHandledToday - b.callsHandledToday;
    }
    // Desempate por quien lleva más tiempo disponible
    const timeA = a.availableSince ? a.availableSince.getTime() : 0;
    const timeB = b.availableSince ? b.availableSince.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.userId.localeCompare(b.userId);
  });

  return [sorted[0]];
}

/**
 * Estrategia LONGEST_IDLE:
 * Asigna la llamada al agente que lleva más tiempo disponible sin hacer nada (availableSince más antiguo).
 */
export function selectLongestIdle(
  candidates: QueueAgentCandidate[],
  requiredSkills?: string[]
): QueueAgentCandidate[] {
  const eligible = filterEligibleCandidates(candidates, requiredSkills);
  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => {
    const timeA = a.availableSince ? a.availableSince.getTime() : 0;
    const timeB = b.availableSince ? b.availableSince.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB; // Menor timestamp = más tiempo en espera
    return a.userId.localeCompare(b.userId);
  });

  return [sorted[0]];
}

/**
 * Estrategia SKILL_BASED:
 * Filtra rigurosamente por habilidades requeridas y aplica LONGEST_IDLE entre los calificados.
 */
export function selectSkillBased(
  candidates: QueueAgentCandidate[],
  requiredSkills: string[] = []
): QueueAgentCandidate[] {
  return selectLongestIdle(candidates, requiredSkills);
}

/**
 * Función Maestra de Despacho de Cola:
 * Ejecuta la estrategia solicitada garantizando el respeto a penalidades y disponibilidad.
 */
export function selectQueueAgent(
  strategy: QueueStrategyType,
  candidates: QueueAgentCandidate[],
  options: QueueSelectionOptions = {}
): QueueAgentCandidate[] {
  switch (strategy) {
    case 'RINGALL':
      return selectRingall(candidates, options.requiredSkills);
    case 'ROUND_ROBIN':
      return selectRoundRobin(candidates, options.lastAssignedUserId, options.requiredSkills);
    case 'LEAST_RECENT':
      return selectLeastRecent(candidates, options.requiredSkills);
    case 'FEWEST_CALLS':
      return selectFewestCalls(candidates, options.requiredSkills);
    case 'LONGEST_IDLE':
      return selectLongestIdle(candidates, options.requiredSkills);
    case 'SKILL_BASED':
      return selectSkillBased(candidates, options.requiredSkills);
    default:
      return selectRingall(candidates, options.requiredSkills);
  }
}

/**
 * Regla de Auto-Pausa:
 * Si un agente no contesta 2 veces consecutivas en ringSeconds,
 * debe ser puesto en BREAK ("no responde") automáticamente.
 */
export function shouldAutoBreakAgent(consecutiveMissedCalls: number): boolean {
  return consecutiveMissedCalls >= 2;
}

/**
 * Regla de Desborde y Detección de Rebote:
 * Una llamada no puede dar más de 2 saltos entre colas para evitar bucles infinitos.
 */
export const MAX_QUEUE_BOUNCES = 2;

export function canBounceToAnotherQueue(currentHops: number): boolean {
  return currentHops < MAX_QUEUE_BOUNCES;
}

/**
 * Cálculo del Nivel de Servicio (SLA):
 * Porcentaje de llamadas contestadas antes de targetSeconds (estándar 20s).
 *
 * Fórmula estándar de contact center:
 *   SLA% = (Llamadas contestadas en <= targetSeconds / Total llamadas contestadas) * 100
 * Si no hubo llamadas contestadas, retorna 100.0%.
 */
export function calculateServiceLevel(
  calls: ServiceLevelCallSample[],
  targetSeconds = 20
): number {
  const answeredCalls = calls.filter((c) => c.answered);
  if (answeredCalls.length === 0) return 100;

  const withinTarget = answeredCalls.filter((c) => c.waitSeconds <= targetSeconds).length;
  const percentage = (withinTarget / answeredCalls.length) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Cálculo del Tiempo Estimado de Espera:
 * Basado en el promedio móvil de atención (AHT) de esa cola en los últimos 30 minutos,
 * la posición en la fila y la cantidad de asesores disponibles.
 *
 * @param rollingDurationsSeconds Duraciones de llamadas completadas en los últimos 30m
 * @param queuePosition Posición del llamante en la fila (1 = primero en la fila)
 * @param availableAgentsCount Cantidad de agentes disponibles actualmente
 * @returns Minutos estimados de espera (mínimo 1 minuto si hay espera)
 */
export function calculateEstimatedWaitTime(
  rollingDurationsSeconds: number[],
  queuePosition: number,
  availableAgentsCount: number
): { estimatedSeconds: number; estimatedMinutes: number } {
  // Si no hay duración histórica, asumimos un AHT estándar de 180 segundos (3 minutos)
  const averageHandlingTime =
    rollingDurationsSeconds.length > 0
      ? rollingDurationsSeconds.reduce((acc, curr) => acc + curr, 0) / rollingDurationsSeconds.length
      : 180;

  const effectiveAgents = Math.max(1, availableAgentsCount);
  const effectivePosition = Math.max(1, queuePosition);

  // Estimación: (AHT * posición) / agentes disponibles
  const estimatedSeconds = Math.round((averageHandlingTime * effectivePosition) / effectiveAgents);
  const estimatedMinutes = Math.max(1, Math.ceil(estimatedSeconds / 60));

  return { estimatedSeconds, estimatedMinutes };
}
