/**
 * Catálogo Centralizado de Claves de Consulta Tipadas (SSOT Query Keys)
 * Estandariza la jerarquía de claves para React Query y sincronización en tiempo real vía SSE.
 */

export const QUERY_KEYS = {
  employees: {
    all: ['employees'] as const,
    active: ['employees', 'active'] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    byStage: (stage: string) => ['projects', 'stage', stage] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  quotes: {
    all: ['quotes'] as const,
    pipeline: ['quotes', 'pipeline'] as const,
    detail: (id: string) => ['quotes', 'detail', id] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    home: ['metrics', 'home'] as const,
    salesGoals: ['metrics', 'salesGoals'] as const,
    oee: ['metrics', 'oee'] as const,
  },
  chat: {
    all: ['chat'] as const,
    channels: ['chat', 'channels'] as const,
    messages: (channelId: string) => ['chat', 'messages', channelId] as const,
  },
} as const;

export type QueryKeys = typeof QUERY_KEYS;
