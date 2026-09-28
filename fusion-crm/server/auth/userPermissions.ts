import { isAdminRole } from './session';
import { employeeService } from '../services/employeeService';
import { SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../packages/core/src/auth/permissions';

/**
 * Permisos efectivos de quien hace la petición: los de su rol (guardado o de fábrica) más
 * los permisos especiales de su ficha. Se calculan en el servidor desde la sesión; nunca se
 * toman de headers que envíe el navegador.
 */
export function permissionsForRequest(req: { headers: Record<string, any> }): { userId: string; role: string; permissions: string[] } {
  const userId = String(req.headers['x-user-id'] || '');
  const role = String(req.headers['x-user-role'] || '');
  if (!userId) return { userId, role, permissions: [] };
  if (isAdminRole(role)) return { userId, role, permissions: ['*'] };
  const saved = employeeService.getRoleByKey(role)?.permissions;
  const base = saved?.length ? saved : ((SEED_ROLE_COLLABORATION_PERMISSIONS as Record<string, string[]>)[role] ?? []);
  const custom = employeeService.getEmployeeById(userId)?.customPermissions ?? [];
  return { userId, role, permissions: Array.from(new Set([...base, ...custom])) };
}
