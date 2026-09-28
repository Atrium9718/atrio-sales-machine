/**
 * Revisión de accesos: foto de quién puede entrar, con qué rol y cuándo lo usó por última vez,
 * con alertas para decidir persona por persona (mantener o quitar el acceso).
 */

export type AccessFlag = 'ADMIN' | 'NEVER_USED' | 'IDLE' | 'CUSTOM_PERMISSIONS' | 'DOMAIN_NOT_ALLOWED';
export type AccessDecision = 'KEEP' | 'REMOVE' | 'CHANGE_ROLE';

export interface AccessRow {
  employeeId: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  jobTitle: string;
  lastActivityAt: string | null;
  flags: AccessFlag[];
  decision: AccessDecision | null;
  note: string;
}

export interface AccessReview {
  id: string;
  status: 'OPEN' | 'COMPLETED';
  startedAt: string;
  startedBy: string;
  completedAt?: string;
  completedBy?: string;
  rows: AccessRow[];
  summary?: { kept: number; removed: number; roleChanges: number };
}

export const FLAG_LABEL: Record<AccessFlag, string> = {
  ADMIN: 'Administrador',
  NEVER_USED: 'Nunca ha entrado',
  IDLE: 'Sin uso reciente',
  CUSTOM_PERMISSIONS: 'Permisos especiales',
  DOMAIN_NOT_ALLOWED: 'Correo fuera de los dominios permitidos',
};

export const IDLE_DAYS = 45;

export function buildAccessRows(input: {
  employees: { id: string; name: string; email: string; roleKey: string; roleName?: string; jobTitle?: string; status: string; customAllowedModules?: string[]; customPermissions?: string[] }[];
  roles: { key: string; name: string }[];
  lastActivityByEmail: Map<string, string>;
  allowedDomains: string[];
  now: Date;
}): AccessRow[] {
  const roleName = new Map(input.roles.map((r) => [r.key, r.name]));
  return input.employees
    .filter((e) => e.status === 'ACTIVO')
    .map((e) => {
      const last = input.lastActivityByEmail.get(String(e.email || '').toLowerCase()) ?? null;
      const flags: AccessFlag[] = [];
      if (e.roleKey === 'admin' || e.roleKey === 'super_admin') flags.push('ADMIN');
      if (!last) flags.push('NEVER_USED');
      else if (input.now.getTime() - Date.parse(last) > IDLE_DAYS * 86400_000) flags.push('IDLE');
      if ((e.customAllowedModules?.length ?? 0) > 0 || (e.customPermissions?.length ?? 0) > 0) flags.push('CUSTOM_PERMISSIONS');
      const domain = String(e.email || '').toLowerCase().split('@')[1] || '';
      if (input.allowedDomains.length && !input.allowedDomains.includes(domain)) flags.push('DOMAIN_NOT_ALLOWED');
      return {
        employeeId: e.id,
        name: e.name,
        email: e.email,
        roleKey: e.roleKey,
        roleName: roleName.get(e.roleKey) || e.roleName || e.roleKey,
        jobTitle: e.jobTitle || '',
        lastActivityAt: last,
        flags,
        decision: null,
        note: '',
      };
    })
    .sort((a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name, 'es'));
}

export function pendingDecisions(review: AccessReview): number {
  return review.rows.filter((r) => !r.decision).length;
}

export function summarize(rows: AccessRow[]) {
  return {
    kept: rows.filter((r) => r.decision === 'KEEP').length,
    removed: rows.filter((r) => r.decision === 'REMOVE').length,
    roleChanges: rows.filter((r) => r.decision === 'CHANGE_ROLE').length,
  };
}

/** Días hasta la próxima revisión recomendada (negativo si está vencida); null si nunca se ha hecho. */
export function daysUntilNextReview(reviews: AccessReview[], everyDays: number, now: Date): number | null {
  const last = reviews.filter((r) => r.status === 'COMPLETED' && r.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))[0];
  if (!last) return null;
  return Math.ceil((Date.parse(last.completedAt!) + everyDays * 86400_000 - now.getTime()) / 86400_000);
}
