import { auth } from './firebase';

/**
 * Adjunta automáticamente el token de Firebase (Authorization: Bearer ...) a todas
 * las llamadas same-origin a /api/ cuando hay una sesión iniciada. Así el backend
 * puede proteger las rutas de administración sin tocar cada fetch del panel.
 */
export const installAuthFetch = () => {
  if (typeof window === 'undefined' || (window as any).__authFetchInstalled) return;
  (window as any).__authFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const currentUser = auth.currentUser;

      if (currentUser && url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        const existing = headers.get('Authorization') || '';
        // Reemplaza cabeceras vacías como "Bearer " o "Bearer null" que envían algunas pantallas
        if (!/^Bearer\s+[A-Za-z0-9._-]{20,}/.test(existing)) {
          headers.set('Authorization', `Bearer ${await currentUser.getIdToken()}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // Si algo falla al preparar el token, se hace la petición original
    }
    return originalFetch(input, init);
  };
};
