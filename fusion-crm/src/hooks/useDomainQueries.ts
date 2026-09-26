/**
 * Hooks canónicos de consulta con React Query (SSOT Query Hooks)
 * Vinculados directamente a QUERY_KEYS para invalidación y reactividad global.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryKeys';
import { FusionEmployee } from '../context/FusionAuthContext';
import { getProjects, syncProjectsFromApi } from '../../apps/web/src/lib/projectsStore';
import { getQuotes } from '../../apps/web/src/lib/quotesStore';

/**
 * Hook para consultar lista de empleados (activos o todos)
 */
export function useEmployeesQuery(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  return useQuery({
    queryKey: includeInactive ? QUERY_KEYS.employees.all : QUERY_KEYS.employees.active,
    queryFn: async (): Promise<FusionEmployee[]> => {
      const url = includeInactive ? '/api/admin/users?includeInactive=true' : '/api/admin/users';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Error al cargar empleados del servidor');
      }
      return res.json();
    },
    staleTime: 1000 * 30, // 30s
  });
}

/**
 * Hook para consultar detalle de un empleado específico
 */
export function useEmployeeQuery(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.employees.detail(id),
    queryFn: async (): Promise<FusionEmployee> => {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Error al obtener datos del empleado ${id}`);
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook para consultar proyectos/órdenes de trabajo
 */
export function useProjectsQuery(stage?: string) {
  return useQuery({
    queryKey: stage ? QUERY_KEYS.projects.byStage(stage) : QUERY_KEYS.projects.all,
    queryFn: async (): Promise<any[]> => {
      // 1. Sincronizar desde API en segundo plano
      try {
        const remote = await syncProjectsFromApi();
        if (Array.isArray(remote) && remote.length > 0) {
          return stage ? remote.filter((p) => p.stageId === stage) : remote;
        }
      } catch {}

      // 2. Fallback a proyectos consolidados locales
      const local = getProjects();
      return stage ? local.filter((p) => p.stageId === stage) : local;
    },
    staleTime: 1000 * 15,
  });
}

/**
 * Hook para consultar cotizaciones
 */
export function useQuotesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.quotes.all,
    queryFn: async (): Promise<any[]> => {
      try {
        const res = await fetch('/api/quotes');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch {}
      return getQuotes();
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Hook para métricas de metas comerciales
 */
export function useSalesGoalsQuery(scope: string = 'personal', period: string = 'mensual') {
  return useQuery({
    queryKey: [...QUERY_KEYS.metrics.salesGoals, scope, period],
    queryFn: async () => {
      const res = await fetch(`/api/goals?scope=${scope}&period=${period}`);
      if (!res.ok) {
        throw new Error('Error al cargar metas');
      }
      return res.json();
    },
    staleTime: 1000 * 30,
  });
}
