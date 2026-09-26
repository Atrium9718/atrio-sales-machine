import { describe, it, expect } from 'vitest';
import {
  QueueAgentCandidate,
  selectQueueAgent,
  selectRingall,
  selectRoundRobin,
  selectLeastRecent,
  selectFewestCalls,
  selectLongestIdle,
  selectSkillBased,
  calculateServiceLevel,
  calculateEstimatedWaitTime,
  shouldAutoBreakAgent,
  canBounceToAnotherQueue,
  MAX_QUEUE_BOUNCES,
} from './queueStrategies';

describe('Motor de Estrategias y Reparto de Colas (Etapa 17.6)', () => {
  const baseAgent = (overrides: Partial<QueueAgentCandidate> = {}): QueueAgentCandidate => ({
    userId: 'user-1',
    name: 'Asesor 1',
    extension: '101',
    penalty: 0,
    skills: ['ventas', 'espanol'],
    status: 'AVAILABLE',
    lastCallCompletedAt: new Date('2026-09-18T10:00:00Z'),
    callsHandledToday: 5,
    availableSince: new Date('2026-09-18T11:00:00Z'),
    consecutiveMissedCalls: 0,
    ...overrides,
  });

  // --------------------------------------------------------------------------
  // GRUPO 1: FILTRADO DE DISPONIBILIDAD Y PENALIDADES
  // --------------------------------------------------------------------------
  describe('Disponibilidad y Penalidades', () => {
    it('Caso 1: Excluye agentes en WRAP_UP, BREAK, ON_CALL u OFFLINE', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', status: 'WRAP_UP' }),
        baseAgent({ userId: 'u2', status: 'BREAK' }),
        baseAgent({ userId: 'u3', status: 'ON_CALL' }),
        baseAgent({ userId: 'u4', status: 'OFFLINE' }),
        baseAgent({ userId: 'u5', status: 'AVAILABLE' }),
      ];
      const selected = selectRingall(candidates);
      expect(selected).toHaveLength(1);
      expect(selected[0].userId).toBe('u5');
    });

    it('Caso 2: Si ningún agente está disponible, retorna lista vacía', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', status: 'ON_CALL' }),
        baseAgent({ userId: 'u2', status: 'BREAK' }),
      ];
      expect(selectRingall(candidates)).toEqual([]);
      expect(selectRoundRobin(candidates)).toEqual([]);
      expect(selectLeastRecent(candidates)).toEqual([]);
      expect(selectFewestCalls(candidates)).toEqual([]);
      expect(selectLongestIdle(candidates)).toEqual([]);
    });

    it('Caso 3: Respeta la penalidad 0 sobre la penalidad 1 cuando hay agentes disponibles en 0', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'p1', penalty: 1, status: 'AVAILABLE' }),
        baseAgent({ userId: 'p0', penalty: 0, status: 'AVAILABLE' }),
      ];
      const selected = selectRingall(candidates);
      expect(selected).toHaveLength(1);
      expect(selected[0].userId).toBe('p0');
    });

    it('Caso 4: Pasa a la penalidad 1 si todos los de penalidad 0 están ocupados o en pausa', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'p0', penalty: 0, status: 'ON_CALL' }),
        baseAgent({ userId: 'p1_a', penalty: 1, status: 'AVAILABLE' }),
        baseAgent({ userId: 'p1_b', penalty: 1, status: 'AVAILABLE' }),
      ];
      const selected = selectRingall(candidates);
      expect(selected).toHaveLength(2);
      expect(selected.map((s) => s.userId).sort()).toEqual(['p1_a', 'p1_b']);
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 2: ESTRATEGIA RINGALL
  // --------------------------------------------------------------------------
  describe('Estrategia RINGALL', () => {
    it('Caso 5: Timbra a todos los disponibles del nivel de penalidad más bajo simultáneamente', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'a1', penalty: 0, status: 'AVAILABLE' }),
        baseAgent({ userId: 'a2', penalty: 0, status: 'AVAILABLE' }),
        baseAgent({ userId: 'a3', penalty: 1, status: 'AVAILABLE' }),
      ];
      const result = selectQueueAgent('RINGALL', candidates);
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.userId)).toContain('a1');
      expect(result.map((a) => a.userId)).toContain('a2');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 3: ESTRATEGIA ROUND_ROBIN
  // --------------------------------------------------------------------------
  describe('Estrategia ROUND_ROBIN', () => {
    const pool: QueueAgentCandidate[] = [
      baseAgent({ userId: 'user_a', penalty: 0, status: 'AVAILABLE' }),
      baseAgent({ userId: 'user_b', penalty: 0, status: 'AVAILABLE' }),
      baseAgent({ userId: 'user_c', penalty: 0, status: 'AVAILABLE' }),
    ];

    it('Caso 6: Inicia por el primer agente si no hay cursor previo', () => {
      const selected = selectRoundRobin(pool);
      expect(selected[0].userId).toBe('user_a');
    });

    it('Caso 7: Rota al siguiente agente recordando el último asignado', () => {
      const afterA = selectRoundRobin(pool, 'user_a');
      expect(afterA[0].userId).toBe('user_b');

      const afterB = selectRoundRobin(pool, 'user_b');
      expect(afterB[0].userId).toBe('user_c');
    });

    it('Caso 8: Hace ciclo (wrap-around) al llegar al final del grupo', () => {
      const afterC = selectRoundRobin(pool, 'user_c');
      expect(afterC[0].userId).toBe('user_a');
    });

    it('Caso 9: Si el último agente asignado ya no está disponible, toma el primero disponible', () => {
      const poolWithOffline: QueueAgentCandidate[] = [
        baseAgent({ userId: 'user_b', penalty: 0, status: 'AVAILABLE' }),
        baseAgent({ userId: 'user_c', penalty: 0, status: 'AVAILABLE' }),
      ];
      const selected = selectRoundRobin(poolWithOffline, 'user_a');
      expect(selected[0].userId).toBe('user_b');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 4: ESTRATEGIA LEAST_RECENT
  // --------------------------------------------------------------------------
  describe('Estrategia LEAST_RECENT', () => {
    it('Caso 10: Prioriza a quien nunca ha atendido llamada en el día (lastCallCompletedAt null)', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', lastCallCompletedAt: new Date('2026-09-18T10:00:00Z') }),
        baseAgent({ userId: 'u2', lastCallCompletedAt: null }), // Nunca ha atendido
        baseAgent({ userId: 'u3', lastCallCompletedAt: new Date('2026-09-18T09:00:00Z') }),
      ];
      const selected = selectLeastRecent(candidates);
      expect(selected[0].userId).toBe('u2');
    });

    it('Caso 11: Asigna al que hace más tiempo que no atiende', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'recent', lastCallCompletedAt: new Date('2026-09-18T11:45:00Z') }),
        baseAgent({ userId: 'oldest', lastCallCompletedAt: new Date('2026-09-18T08:30:00Z') }),
        baseAgent({ userId: 'medium', lastCallCompletedAt: new Date('2026-09-18T10:15:00Z') }),
      ];
      const selected = selectLeastRecent(candidates);
      expect(selected[0].userId).toBe('oldest');
    });

    it('Caso 12: Desempata entre agentes sin llamadas por quien lleva más tiempo disponible', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', lastCallCompletedAt: null, availableSince: new Date('2026-09-18T09:00:00Z') }),
        baseAgent({ userId: 'u2', lastCallCompletedAt: null, availableSince: new Date('2026-09-18T08:00:00Z') }), // Más tiempo libre
      ];
      const selected = selectLeastRecent(candidates);
      expect(selected[0].userId).toBe('u2');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 5: ESTRATEGIA FEWEST_CALLS
  // --------------------------------------------------------------------------
  describe('Estrategia FEWEST_CALLS', () => {
    it('Caso 13: Asigna al que menos llamadas lleva hoy', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', callsHandledToday: 12 }),
        baseAgent({ userId: 'u2', callsHandledToday: 3 }), // Menos llamadas
        baseAgent({ userId: 'u3', callsHandledToday: 7 }),
      ];
      const selected = selectFewestCalls(candidates);
      expect(selected[0].userId).toBe('u2');
    });

    it('Caso 14: En empate de llamadas, desempata por quien lleva más tiempo disponible', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', callsHandledToday: 4, availableSince: new Date('2026-09-18T10:30:00Z') }),
        baseAgent({ userId: 'u2', callsHandledToday: 4, availableSince: new Date('2026-09-18T09:15:00Z') }), // Más tiempo idle
      ];
      const selected = selectFewestCalls(candidates);
      expect(selected[0].userId).toBe('u2');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 6: ESTRATEGIA LONGEST_IDLE
  // --------------------------------------------------------------------------
  describe('Estrategia LONGEST_IDLE', () => {
    it('Caso 15: Asigna al que lleva más tiempo disponible sin hacer nada', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'just_arrived', availableSince: new Date('2026-09-18T11:50:00Z') }),
        baseAgent({ userId: 'longest_waiting', availableSince: new Date('2026-09-18T08:00:00Z') }),
      ];
      const selected = selectLongestIdle(candidates);
      expect(selected[0].userId).toBe('longest_waiting');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 7: ESTRATEGIA SKILL_BASED
  // --------------------------------------------------------------------------
  describe('Estrategia SKILL_BASED', () => {
    it('Caso 16: Filtra estrictamente por habilidades requeridas (todas deben coincidir)', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'solo_ventas', skills: ['ventas'] }),
        baseAgent({ userId: 'ventas_y_tecnico', skills: ['ventas', 'soporte_tecnico'] }),
        baseAgent({ userId: 'solo_soporte', skills: ['soporte_tecnico'] }),
      ];
      const selected = selectSkillBased(candidates, ['ventas', 'soporte_tecnico']);
      expect(selected).toHaveLength(1);
      expect(selected[0].userId).toBe('ventas_y_tecnico');
    });

    it('Caso 17: Retorna vacío si ningún agente tiene todas las habilidades requeridas', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'u1', skills: ['ingles'] }),
        baseAgent({ userId: 'u2', skills: ['aleman'] }),
      ];
      const selected = selectSkillBased(candidates, ['portugues']);
      expect(selected).toHaveLength(0);
    });

    it('Caso 18: Aplica LONGEST_IDLE entre los calificados con las habilidades', () => {
      const candidates: QueueAgentCandidate[] = [
        baseAgent({ userId: 'c1', skills: ['vip'], availableSince: new Date('2026-09-18T10:00:00Z') }),
        baseAgent({ userId: 'c2', skills: ['vip'], availableSince: new Date('2026-09-18T09:00:00Z') }), // Más antiguo
      ];
      const selected = selectSkillBased(candidates, ['vip']);
      expect(selected[0].userId).toBe('c2');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 8: REGLAS OPERATIVAS (AUTO-PAUSA, REBOTES, SLA, TIEMPO ESTIMADO)
  // --------------------------------------------------------------------------
  describe('Reglas Operativas y Métricas', () => {
    it('Caso 19: Auto-pausa a agente tras 2 no respuestas consecutivas', () => {
      expect(shouldAutoBreakAgent(0)).toBe(false);
      expect(shouldAutoBreakAgent(1)).toBe(false);
      expect(shouldAutoBreakAgent(2)).toBe(true); // Se activa
      expect(shouldAutoBreakAgent(3)).toBe(true);
    });

    it('Caso 20: Control de rebotes entre colas bloquea tras 2 saltos (max 2)', () => {
      expect(MAX_QUEUE_BOUNCES).toBe(2);
      expect(canBounceToAnotherQueue(0)).toBe(true);
      expect(canBounceToAnotherQueue(1)).toBe(true);
      expect(canBounceToAnotherQueue(2)).toBe(false); // Bloquea tercer salto
      expect(canBounceToAnotherQueue(3)).toBe(false);
    });

    it('Caso 21: Cálculo exacto de Nivel de Servicio (SLA) con datos conocidos', () => {
      // 10 llamadas contestadas: 8 contestadas en <= 20s, 2 en > 20s. 2 abandonadas no contestadas
      const samples = [
        { callId: '1', waitSeconds: 5, answered: true },
        { callId: '2', waitSeconds: 12, answered: true },
        { callId: '3', waitSeconds: 18, answered: true },
        { callId: '4', waitSeconds: 20, answered: true }, // En el límite exacto
        { callId: '5', waitSeconds: 8, answered: true },
        { callId: '6', waitSeconds: 15, answered: true },
        { callId: '7', waitSeconds: 19, answered: true },
        { callId: '8', waitSeconds: 10, answered: true },
        { callId: '9', waitSeconds: 35, answered: true }, // Excedida
        { callId: '10', waitSeconds: 45, answered: true }, // Excedida
        { callId: '11', waitSeconds: 50, answered: false }, // Abandonada
      ];
      // De las 10 contestadas, 8 están dentro del target (8 / 10 = 80.0%)
      const sla = calculateServiceLevel(samples, 20);
      expect(sla).toBe(80.0);
    });

    it('Caso 22: SLA retorna 100% si no hay llamadas contestadas registradas', () => {
      expect(calculateServiceLevel([])).toBe(100);
      expect(calculateServiceLevel([{ callId: 'x', waitSeconds: 30, answered: false }])).toBe(100);
    });

    it('Caso 23: Cálculo de Tiempo Estimado de Espera con promedio móvil de 30 minutos', () => {
      // Promedio móvil de 3 llamadas recientes: (120 + 180 + 240) / 3 = 180s (3 minutos)
      const rollingDurations = [120, 180, 240];
      // Posición 2 en fila, 2 agentes disponibles -> (180 * 2) / 2 = 180s = 3 minutos
      const est1 = calculateEstimatedWaitTime(rollingDurations, 2, 2);
      expect(est1.estimatedSeconds).toBe(180);
      expect(est1.estimatedMinutes).toBe(3);

      // Posición 1 en fila, 1 agente -> 180s = 3 min
      const est2 = calculateEstimatedWaitTime(rollingDurations, 1, 1);
      expect(est2.estimatedMinutes).toBe(3);

      // Posición 3 en fila, 2 agentes -> (180 * 3) / 2 = 270s = 4.5 -> ceil = 5 minutos
      const est3 = calculateEstimatedWaitTime(rollingDurations, 3, 2);
      expect(est3.estimatedSeconds).toBe(270);
      expect(est3.estimatedMinutes).toBe(5);
    });
  });
});
