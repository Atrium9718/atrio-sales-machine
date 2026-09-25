import { describe, it, expect, vi, beforeEach } from 'vitest';

const employees = [
  { id: 'emp-admin', name: 'Admin', email: 'admin@fusion.test', roleKey: 'super_admin', status: 'ACTIVO' },
  { id: 'emp-planta', name: 'Planta', email: 'Planta@Fusion.test', roleKey: 'planta', status: 'ACTIVO' },
  { id: 'emp-baja', name: 'Baja', email: 'baja@fusion.test', roleKey: 'planta', status: 'INACTIVO' },
];

const sessions: Record<string, string> = {
  'cookie-admin': 'admin@fusion.test',
  'cookie-planta': 'planta@fusion.test',
  'cookie-baja': 'baja@fusion.test',
};

vi.mock('./firebaseAdmin', () => ({
  getAdminAuth: () => ({
    verifySessionCookie: async (cookie: string) => {
      if (!sessions[cookie]) throw new Error('invalid');
      return { email: sessions[cookie] };
    },
  }),
}));

vi.mock('../services/employeeService', () => ({
  employeeService: {
    getEmployees: () => employees.filter((e) => e.status === 'ACTIVO'),
    getEmployeeById: (id: string) => employees.find((e) => e.id === id),
  },
}));

const { requireAuth, parseCookies, setImpersonation } = await import('./session');
const { getRequestAuth } = await import('./requestContext');

function mockReq(path: string, opts: { method?: string; cookie?: string; headers?: Record<string, string>; body?: any } = {}) {
  return {
    path,
    method: opts.method || 'GET',
    headers: { ...(opts.headers || {}), ...(opts.cookie ? { cookie: opts.cookie } : {}) },
    body: opts.body,
  } as any;
}

function mockRes() {
  const res: any = { statusCode: 200, body: undefined, cookies: {} as Record<string, string>, cleared: [] as string[] };
  res.status = (code: number) => ((res.statusCode = code), res);
  res.json = (body: any) => ((res.body = body), res);
  res.cookie = (name: string, value: string) => ((res.cookies[name] = value), res);
  res.clearCookie = (name: string) => (res.cleared.push(name), res);
  return res;
}

async function run(req: any) {
  const res = mockRes();
  let nextCalled = false;
  let ctxUserId: string | undefined;
  await requireAuth(req, res, () => {
    nextCalled = true;
    ctxUserId = getRequestAuth()?.user.id;
  });
  return { res, nextCalled, ctxUserId };
}

describe('parseCookies', () => {
  it('parsea y decodifica cookies', () => {
    expect(parseCookies('a=1; fusion_session=x%3Dy; b')).toEqual({ a: '1', fusion_session: 'x=y' });
    expect(parseCookies(undefined)).toEqual({});
  });
});

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deja pasar rutas públicas y archivos estáticos sin sesión', async () => {
    for (const path of ['/api/health', '/api/auth/me', '/api/webhooks/meta', '/api/widget/session', '/', '/assets/app.js']) {
      expect((await run(mockReq(path))).nextCalled).toBe(true);
    }
  });

  it('no trata prefijos parecidos como públicos', async () => {
    const { res, nextCalled } = await run(mockReq('/api/widgetadmin'));
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('rechaza la API sin sesión, con sesión inválida o de un colaborador inactivo', async () => {
    for (const cookie of [undefined, 'fusion_session=falsa', 'fusion_session=cookie-baja']) {
      const { res, nextCalled } = await run(mockReq('/api/quotes', { cookie }));
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    }
  });

  it('sobrescribe los headers de identidad enviados por el cliente', async () => {
    const req = mockReq('/api/quotes', {
      cookie: 'fusion_session=cookie-planta',
      headers: { 'x-user-id': 'emp-admin', 'x-user-role': 'super_admin' },
    });
    const { nextCalled, ctxUserId } = await run(req);
    expect(nextCalled).toBe(true);
    expect(req.headers['x-user-id']).toBe('emp-planta');
    expect(req.headers['x-user-role']).toBe('planta');
    expect(ctxUserId).toBe('emp-planta');
  });

  it('exige rol de administrador para ops, interventoría y escrituras de admin/settings', async () => {
    const cookie = 'fusion_session=cookie-planta';
    expect((await run(mockReq('/api/ops/secrets', { cookie }))).res.statusCode).toBe(403);
    expect((await run(mockReq('/api/interventoria/scan', { cookie }))).res.statusCode).toBe(403);
    expect((await run(mockReq('/api/admin/users', { cookie, method: 'POST' }))).res.statusCode).toBe(403);
    expect((await run(mockReq('/api/settings', { cookie, method: 'POST' }))).res.statusCode).toBe(403);
    expect((await run(mockReq('/api/admin/users', { cookie }))).nextCalled).toBe(true);

    const admin = 'fusion_session=cookie-admin';
    expect((await run(mockReq('/api/admin/users', { cookie: admin, method: 'POST' }))).nextCalled).toBe(true);
  });

  it('solo aplica la simulación de usuario si quien inició sesión es administrador', async () => {
    const asAdmin = await run(mockReq('/api/quotes', { cookie: 'fusion_session=cookie-admin; fusion_impersonate=emp-planta' }));
    expect(asAdmin.ctxUserId).toBe('emp-planta');

    const asPlanta = await run(mockReq('/api/quotes', { cookie: 'fusion_session=cookie-planta; fusion_impersonate=emp-admin' }));
    expect(asPlanta.ctxUserId).toBe('emp-planta');
  });
});

describe('setImpersonation', () => {
  const admin = employees[0] as any;
  const planta = employees[1] as any;

  it('rechaza a quien no es administrador', () => {
    const res = mockRes();
    setImpersonation({ auth: { user: planta, realUser: planta }, body: { id: 'emp-admin' } } as any, res);
    expect(res.statusCode).toBe(403);
    expect(res.cookies.fusion_impersonate).toBeUndefined();
  });

  it('permite al administrador simular y volver a su usuario', () => {
    const res = mockRes();
    setImpersonation({ auth: { user: admin, realUser: admin }, body: { id: 'emp-planta' } } as any, res);
    expect(res.cookies.fusion_impersonate).toBe('emp-planta');

    const back = mockRes();
    setImpersonation({ auth: { user: planta, realUser: admin }, body: { id: 'emp-admin' } } as any, back);
    expect(back.cleared).toContain('fusion_impersonate');
  });
});
