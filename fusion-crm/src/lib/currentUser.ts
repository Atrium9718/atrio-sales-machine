/**
 * Usuario que está usando la aplicación (el verificado por la sesión, o el simulado por un
 * administrador). FusionAuthProvider lo publica en window al iniciar sesión.
 * Se usa para firmar acciones (aprobaciones, envíos, registros de tiempo) con la persona real
 * en lugar de nombres fijos.
 */
export interface CurrentUserInfo {
  id: string;
  name: string;
  initials: string;
  email?: string;
}

export function getCurrentUser(): CurrentUserInfo | null {
  if (typeof window === 'undefined') return null;
  const u = (window as any).__FUSION_CURRENT_USER__;
  if (!u?.id || !u?.name) return null;
  return { id: String(u.id), name: String(u.name), initials: String(u.initials || u.name.slice(0, 2)).toUpperCase(), email: u.email };
}

export function getCurrentUserName(fallback = ''): string {
  return getCurrentUser()?.name || fallback;
}
