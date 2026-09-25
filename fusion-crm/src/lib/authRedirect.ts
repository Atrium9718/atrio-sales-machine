/**
 * Helper de redirección post-inicio de sesión (Etapa 15.1)
 *
 * Determina la ruta de destino tras iniciar sesión o al acceder a la raíz del sistema.
 * Por defecto redirige a '/' (Home) en lugar del pipeline, respetando la preferencia
 * UserHomePreference.startPage cuando exista.
 */

export function getPostLoginRedirect(startPage?: string | null): string {
  if (!startPage) {
    // Intentar leer preferencia en caché local de sesión si existe
    try {
      const stored = localStorage.getItem('fusion_start_page');
      if (stored) startPage = stored;
    } catch {
      // Ignorar errores de localStorage
    }
  }

  switch (startPage) {
    case 'pipeline':
      return '/dashboard/oportunidades';
    case 'produccion':
      return '/dashboard/produccion';
    case 'bandeja':
      return '/dashboard/inbox';
    case 'home':
    default:
      return '/';
  }
}
