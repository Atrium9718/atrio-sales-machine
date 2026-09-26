import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos de frescura por defecto
      gcTime: 1000 * 60 * 10, // 10 minutos de recolección de basura
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
