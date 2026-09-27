/** Empleados y roles en Postgres (TEST_DATABASE_URL): se siembran, se guardan y sobreviven. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('empleados en Postgres (integración)', () => {
  let prismaMod: typeof import('../repositories/prisma/client');
  let svc: typeof import('./employeeService');
  let store: typeof import('../repositories/documentStore');
  const saved = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres' });
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['employees', 'roles'] } } });
    svc = await import('./employeeService');
    store = await import('../repositories/documentStore');
  });

  afterAll(async () => {
    await prismaMod?.disconnectPrisma();
    process.env = saved;
  });

  it('la primera carga siembra los valores base; los cambios quedan guardados', async () => {
    await svc.loadEmployees();
    const employees = await store.documentRepository('employees').list();
    expect(employees.length).toBe(svc.INITIAL_EMPLOYEES.length);
    expect((await store.documentRepository('roles').list()).length).toBe(svc.INITIAL_ROLES.length);
    expect(await store.documentRepository('employees').get('emp-03')).toMatchObject({ roleKey: 'super_admin', status: 'ACTIVO' });

    const nuevo = svc.employeeService.saveEmployee({ name: 'Persona Prueba', email: 'prueba@fusion.test', roleKey: 'comercial', status: 'ACTIVO' } as any);
    await new Promise((r) => setTimeout(r, 200));
    expect(await store.documentRepository('employees').get(nuevo.id)).toMatchObject({ name: 'Persona Prueba' });

    svc.employeeService.softDeleteEmployee(nuevo.id);
    await new Promise((r) => setTimeout(r, 200));
    expect(await store.documentRepository('employees').get(nuevo.id)).toMatchObject({ status: 'INACTIVO' });

    // Recarga (como tras reiniciar): conserva lo guardado
    await svc.loadEmployees();
    expect(svc.employeeService.getEmployeeById(nuevo.id)).toMatchObject({ status: 'INACTIVO' });
  });
});
