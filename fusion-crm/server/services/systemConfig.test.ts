import { describe, it, expect } from 'vitest';
import { createMemoryRepository } from '../repositories/documentStore';
import { createSystemConfig } from './systemConfig';
import { createSessionRegistry } from '../auth/sessionRegistry';
import { buildAccessRows, daysUntilNextReview, summarize } from './accessReview';

function setup(existing: string[] = [], now = new Date('2026-03-24T15:00:00Z')) {
  const numbers = [...existing];
  const cfg = createSystemConfig({ repo: createMemoryRepository() as any, existingQuoteNumbers: async () => numbers, now: () => now });
  return { cfg, numbers };
}

describe('consecutivos de cotizaciones', () => {
  it('continúa desde la cotización más alta existente y nunca repite', async () => {
    const { cfg, numbers } = setup(['COT-00007', 'FCG-55555', 'COT-00003']);
    expect(await cfg.issueQuoteNumber()).toBe('COT-00008');
    numbers.push('COT-00009'); // creada por otra vía
    expect(await cfg.issueQuoteNumber()).toBe('COT-00010');
  });

  it('emisiones simultáneas dan números distintos', async () => {
    const { cfg } = setup();
    const issued = await Promise.all(Array.from({ length: 20 }, () => cfg.issueQuoteNumber()));
    expect(new Set(issued).size).toBe(20);
    expect(issued.sort()[19]).toBe('COT-00020');
  });

  it('no deja bajar el último número por debajo de uno existente', async () => {
    const { cfg } = setup(['COT-00050']);
    await expect(cfg.setNumbering({ quote: { prefix: 'COT-' } }, 10, 'Admin')).rejects.toMatchObject({ status: 409 });
    await cfg.setNumbering({ quote: { prefix: 'COT-' } }, 1200, 'Admin');
    expect(await cfg.issueQuoteNumber()).toBe('COT-01201');
    expect((await cfg.numberingStatus()).next).toBe('COT-01202');
  });

  it('serie con año que se reinicia en enero', async () => {
    const repo = createMemoryRepository() as any;
    let now = new Date('2026-12-31T20:00:00Z');
    const cfg = createSystemConfig({ repo, existingQuoteNumbers: async () => [], now: () => now });
    await cfg.setNumbering({ quote: { prefix: 'COT-', yearFormat: 'YY', padding: 4, resetYearly: true } }, 41, 'Admin');
    expect(await cfg.issueQuoteNumber()).toBe('COT-26-0042');
    now = new Date('2027-01-02T15:00:00Z');
    expect(await cfg.issueQuoteNumber()).toBe('COT-27-0001');
  });

  it('guarda y recarga calendario y política', async () => {
    const repo = createMemoryRepository() as any;
    const a = createSystemConfig({ repo, existingQuoteNumbers: async () => [], now: () => new Date() });
    await a.setSecurity({ sessionDays: 99, allowedDomains: '@Fusion.com.co, x, otra.co', reviewEveryDays: 60 }, 'Admin');
    await a.setCalendar({ exceptions: [{ date: '2026-04-16', label: 'Día de la familia', type: 'CLOSED' }] }, 'Admin');
    const b = createSystemConfig({ repo, existingQuoteNumbers: async () => [], now: () => new Date() });
    await b.load();
    expect(b.security()).toEqual({ sessionDays: 14, allowedDomains: ['fusion.com.co', 'otra.co'], reviewEveryDays: 60 });
    expect(b.calendar().exceptions).toEqual([{ date: '2026-04-16', label: 'Día de la familia', type: 'CLOSED' }]);
    expect(b.meta().security_policy?.updatedBy).toBe('Admin');
  });
});

describe('registro de sesiones', () => {
  const make = () => createSessionRegistry({ sessions: createMemoryRepository() as any, events: createMemoryRepository() as any, now: () => new Date('2026-03-24T15:00:00Z') });
  const base = { employeeId: 'e1', name: 'Ana', email: 'ana@fusion.co', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', ip: '1.2.3.4', durationMs: 86400_000 };

  it('registra, lista y cierra sesiones sin guardar la cookie', async () => {
    const r = make();
    const s = await r.started({ ...base, cookie: 'cookie-secreta-1' });
    await r.started({ ...base, employeeId: 'e2', name: 'Luis', email: 'luis@fusion.co', cookie: 'cookie-2' });
    expect(JSON.stringify(r.activeSessions())).not.toContain('cookie-secreta-1');
    expect(r.activeSessions()).toHaveLength(2);
    expect(r.isEnded('cookie-secreta-1')).toBe(false);
    expect(await r.revoke({ allExcept: s.id }, 'Admin')).toBe(1);
    expect(r.isEnded('cookie-2')).toBe(true);
    await r.end('cookie-secreta-1');
    expect(r.isEnded('cookie-secreta-1')).toBe(true);
    expect(r.events().map((e) => e.type)).toEqual(['SESSION_REVOKED', 'LOGIN_OK', 'LOGIN_OK']);
    expect(r.lastActivityByEmail().get('ana@fusion.co')).toBe('2026-03-24T15:00:00.000Z');
  });

  it('las cerradas siguen cerradas al reiniciar el servidor', async () => {
    const sessions = createMemoryRepository() as any;
    const events = createMemoryRepository() as any;
    const now = () => new Date('2026-03-24T15:00:00Z');
    const a = createSessionRegistry({ sessions, events, now });
    await a.started({ ...base, cookie: 'c1' });
    await a.revoke({ employeeId: 'e1' }, 'Admin');
    const b = createSessionRegistry({ sessions, events, now });
    await b.load();
    expect(b.isEnded('c1')).toBe(true);
    expect(b.activeSessions()).toHaveLength(0);
  });
});

describe('revisión de accesos', () => {
  const now = new Date('2026-03-24T15:00:00Z');
  const employees = [
    { id: 'e1', name: 'Ana', email: 'ana@fusion.co', roleKey: 'admin', status: 'ACTIVO' },
    { id: 'e2', name: 'Luis', email: 'luis@gmail.com', roleKey: 'comercial', status: 'ACTIVO', customPermissions: ['quote:assist_cost'] },
    { id: 'e3', name: 'Eva', email: 'eva@fusion.co', roleKey: 'planta', status: 'ACTIVO' },
    { id: 'e4', name: 'Baja', email: 'baja@fusion.co', roleKey: 'planta', status: 'INACTIVO' },
  ];
  it('marca lo que hay que mirar', () => {
    const rows = buildAccessRows({
      employees,
      roles: [{ key: 'admin', name: 'Administrador' }, { key: 'comercial', name: 'Comercial' }, { key: 'planta', name: 'Planta' }],
      lastActivityByEmail: new Map([
        ['ana@fusion.co', '2026-03-23T10:00:00Z'],
        ['eva@fusion.co', '2026-01-02T10:00:00Z'],
      ]),
      allowedDomains: ['fusion.co'],
      now,
    });
    expect(rows.map((r) => [r.name, r.flags])).toEqual([
      ['Luis', ['NEVER_USED', 'CUSTOM_PERMISSIONS', 'DOMAIN_NOT_ALLOWED']],
      ['Ana', ['ADMIN']],
      ['Eva', ['IDLE']],
    ]);
  });

  it('resume decisiones y calcula la próxima revisión', () => {
    const rows: any[] = [{ decision: 'KEEP' }, { decision: 'REMOVE' }, { decision: 'KEEP' }];
    expect(summarize(rows)).toEqual({ kept: 2, removed: 1, roleChanges: 0 });
    expect(daysUntilNextReview([], 90, now)).toBeNull();
    expect(daysUntilNextReview([{ status: 'COMPLETED', completedAt: '2026-01-01T00:00:00Z' } as any], 90, now)).toBe(8);
  });
});
