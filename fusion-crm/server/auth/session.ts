import { Router, type Request, type Response, type NextFunction } from 'express';
import { employeeService, type Employee } from '../services/employeeService';
import { getAdminAuth } from './firebaseAdmin';
import { requestContext, type RequestAuthContext } from './requestContext';

export const SESSION_COOKIE = 'fusion_session';
export const IMPERSONATE_COOKIE = 'fusion_impersonate';

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_SIGN_IN_AGE_S = 5 * 60;

/** Rutas de la API accesibles sin sesión (webhooks externos y widget público). */
const PUBLIC_API_PREFIXES = ['/api/health', '/api/auth/', '/api/webhooks/meta', '/api/widget'];

/** Módulos que solo pueden usar administradores (cualquier método). */
const ADMIN_ONLY_PREFIXES = ['/api/ops', '/api/interventoria'];
/** Módulos cuyas escrituras solo pueden hacer administradores. */
const ADMIN_WRITE_PREFIXES = ['/api/admin', '/api/settings'];

export function isAdminRole(roleKey: string | undefined): boolean {
  return roleKey === 'super_admin' || roleKey === 'admin';
}

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(p + '/')));
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[key] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

function cookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

function clearAuthCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.clearCookie(IMPERSONATE_COOKIE, cookieOptions());
}

function findActiveEmployeeByEmail(email: string | undefined): Employee | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return employeeService
    .getEmployees()
    .find((e) => typeof e.email === 'string' && e.email.trim().toLowerCase() === normalized);
}

/**
 * Resuelve la identidad de la petición a partir de la cookie de sesión de Firebase.
 * Devuelve null si no hay sesión válida o el correo no pertenece a un colaborador activo.
 */
export async function resolveRequestAuth(req: Request): Promise<RequestAuthContext | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies[SESSION_COOKIE];
  if (!sessionCookie) return null;

  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;

  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    email = decoded.email;
  } catch {
    return null;
  }

  const realUser = findActiveEmployeeByEmail(email);
  if (!realUser) return null;

  let user = realUser;
  const impersonatedId = cookies[IMPERSONATE_COOKIE];
  if (impersonatedId && impersonatedId !== realUser.id && isAdminRole(realUser.roleKey)) {
    const target = employeeService.getEmployeeById(impersonatedId);
    if (target && target.status === 'ACTIVO') user = target;
  }

  return { user, realUser };
}

/**
 * Exige sesión en toda la API salvo las rutas públicas. Sobrescribe los headers
 * x-user-* (que las rutas usan como identidad) con los valores verificados, para
 * que el cliente no pueda suplantarlos, y publica la identidad en el contexto de la petición.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  if (!path.startsWith('/api/') || matchesPrefix(path, PUBLIC_API_PREFIXES)) {
    return next();
  }

  const auth = await resolveRequestAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'Sesión requerida', code: 'UNAUTHENTICATED' });
  }

  const isWrite = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
  const needsAdmin =
    matchesPrefix(path, ADMIN_ONLY_PREFIXES) ||
    (isWrite && matchesPrefix(path, ADMIN_WRITE_PREFIXES) && path !== '/api/admin/current-user');
  if (needsAdmin && !isAdminRole(auth.user.roleKey)) {
    return res.status(403).json({ error: 'Se requiere rol de administrador', code: 'FORBIDDEN' });
  }

  req.headers['x-user-id'] = auth.user.id;
  req.headers['x-user-name'] = auth.user.name;
  req.headers['x-user-role'] = auth.user.roleKey;
  (req as any).auth = auth;

  requestContext.run(auth, () => next());
}

export const authRouter = Router();

/** Intercambia un ID token de Firebase (login con Google reciente) por una cookie de sesión. */
authRouter.post('/session', async (req: Request, res: Response) => {
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken) {
    return res.status(400).json({ error: 'idToken requerido' });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return res.status(503).json({ error: 'Autenticación no configurada en el servidor' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_S) {
      return res.status(401).json({ error: 'Inicio de sesión demasiado antiguo, vuelva a ingresar' });
    }
    if (!decoded.email || decoded.email_verified === false) {
      return res.status(403).json({ error: 'La cuenta de Google no tiene un correo verificado' });
    }

    const employee = findActiveEmployeeByEmail(decoded.email);
    if (!employee) {
      return res.status(403).json({
        error: `El correo ${decoded.email} no corresponde a un colaborador activo`,
        code: 'NOT_AN_EMPLOYEE',
      });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
    res.cookie(SESSION_COOKIE, sessionCookie, cookieOptions(SESSION_DURATION_MS));
    res.clearCookie(IMPERSONATE_COOKIE, cookieOptions());
    return res.json({ user: employee, realUser: employee, isImpersonating: false });
  } catch (err: any) {
    console.error('[auth] Error creando sesión', err?.message || err);
    return res.status(401).json({ error: 'Token de Google inválido' });
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const auth = await resolveRequestAuth(req);
  if (!auth) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Sesión requerida', code: 'UNAUTHENTICATED' });
  }
  res.json({ user: auth.user, realUser: auth.realUser, isImpersonating: auth.user.id !== auth.realUser.id });
});

/**
 * Cambia el usuario simulado (solo administradores autenticados). Enviar el id propio
 * termina la simulación.
 */
export function setImpersonation(req: Request, res: Response): Response {
  const auth = (req as any).auth as RequestAuthContext | undefined;
  if (!auth || !isAdminRole(auth.realUser.roleKey)) {
    return res.status(403).json({ error: 'Solo un administrador puede simular otro usuario' });
  }

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });

  if (id === auth.realUser.id) {
    res.clearCookie(IMPERSONATE_COOKIE, cookieOptions());
    return res.json(auth.realUser);
  }

  const target = employeeService.getEmployeeById(id);
  if (!target || target.status !== 'ACTIVO') {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.cookie(IMPERSONATE_COOKIE, target.id, cookieOptions(SESSION_DURATION_MS));
  return res.json(target);
}
