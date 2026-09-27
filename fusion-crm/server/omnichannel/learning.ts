import type { DocumentRepository } from '../repositories/types';
import type { AgentKey } from '../../packages/core/src/omnichannel';

/**
 * Aprendizaje de las correcciones del equipo: cuando una persona corrige, descarta o reemplaza
 * la respuesta que propuso la IA, se guarda el par (pregunta del cliente → respuesta correcta).
 * Los más recientes se le dan a la IA como ejemplos del tono y el criterio del negocio.
 */

export interface Correction {
  id: string;
  at: string;
  agent: AgentKey | null;
  /** Lo que escribió el cliente. */
  question: string;
  /** Lo que propuso la IA. */
  aiText: string;
  /** Lo que respondió el equipo (null si solo descartó la sugerencia). */
  finalText: string | null;
  kind: 'editada' | 'descartada' | 'reemplazada';
  by: string;
  conversationId: string;
  /** Un administrador puede excluirla de los ejemplos. */
  active: boolean;
}

const MAX_TEXT = 1200;
const clip = (s: string) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s);

/** Cambios que no enseñan nada (espacios, puntuación final, mayúsculas) no se guardan. */
export function isMeaningfulEdit(before: string, after: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').replace(/[.!¡¿?,;:]+$/g, '').trim();
  return norm(before) !== norm(after);
}

export function createCorrectionsStore(repo: DocumentRepository<Correction>, now: () => Date = () => new Date()) {
  return {
    async record(input: Omit<Correction, 'id' | 'at' | 'active'>): Promise<Correction | null> {
      if (input.finalText !== null && !isMeaningfulEdit(input.aiText, input.finalText)) return null;
      const at = now().toISOString();
      const correction: Correction = {
        ...input,
        question: clip(input.question),
        aiText: clip(input.aiText),
        finalText: input.finalText === null ? null : clip(input.finalText),
        id: `cor-${at.replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`,
        at,
        active: true,
      };
      await repo.upsert(correction);
      return correction;
    },

    async list(): Promise<Correction[]> {
      return (await repo.list()).sort((a, b) => b.at.localeCompare(a.at));
    },

    /** Ejemplos para la IA: correcciones con respuesta, activas y del mismo agente, las más recientes. */
    async examplesFor(agent: AgentKey, limit = 8): Promise<Correction[]> {
      return (await this.list()).filter((c) => c.active && c.finalText && (!c.agent || c.agent === agent)).slice(0, limit);
    },

    async setActive(id: string, active: boolean) {
      return repo.patch(id, { active });
    },

    async remove(id: string) {
      await repo.delete(id);
    },
  };
}

export type CorrectionsStore = ReturnType<typeof createCorrectionsStore>;

/** Bloque del prompt con los ejemplos (vacío si no hay). */
export function examplesBlock(examples: Pick<Correction, 'question' | 'finalText'>[]): string {
  const usable = examples.filter((e) => e.finalText);
  if (!usable.length) return '';
  const items = usable.map((e, i) => `${i + 1}. Cliente: "${e.question}"\n   Respuesta del equipo: "${e.finalText}"`).join('\n');
  return `\n\nASÍ RESPONDE NUESTRO EQUIPO (correcciones reales a respuestas anteriores; imita su tono y criterio, pero los datos de pedidos salen SOLO de las herramientas):\n${items}`;
}
