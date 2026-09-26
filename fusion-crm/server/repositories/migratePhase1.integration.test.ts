import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AppDocument, DocumentRepository } from './types';
import { migratePhase1 } from './migratePhase1';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

function memoryRepo(docs: AppDocument[]): DocumentRepository {
  const map = new Map(docs.map((d) => [d.id, d]));
  return {
    backend: 'firestore',
    list: async () => [...map.values()],
    get: async (id) => map.get(id) ?? null,
    upsert: async (d) => (map.set(d.id, d), d),
    upsertMany: async (ds) => void ds.forEach((d) => map.set(d.id, d)),
    patch: async () => null,
    delete: async (id) => void map.delete(id),
    deleteAll: async () => map.size,
  };
}

// Datos con los problemas típicos de Firestore
const source = () => ({
  clients: memoryRepo([
    { id: 'cust-1', name: 'Pintuco S.A.S', nit: '900.123.456-1', type: 'ACTIVE', temp: 'HOT', billingContact: 'Claudia' },
    { id: 'cust-2', name: 'Pintuco (duplicado)', nit: '900123456-1' },
    { id: 'cust-3', name: 'Sin NIT Ltda', nit: '' },
  ]),
  quotes: memoryRepo([
    { id: 'mq-1', number: 'COT-1', status: 'Aprobada', clientName: 'Pintuco S.A.S', clientNit: '900.123.456-1', total: 119000, items: [{ id: 'i1', description: 'A', quantity: 1, unitPrice: 100000, total: 119000 }] },
    { id: 'mq-2', number: 'COT-1', status: 'estado raro', clientName: 'Nuevo Cliente', total: 'NaN', items: [] },
    { id: 'mq-3', number: '', status: 'Enviada', clientName: '', total: 50, date: 'no es fecha' },
  ]),
  projects: memoryRepo([
    { id: 'mp-1', number: 'OT-1', name: 'OT uno', stageId: '4', quoteId: 'mq-1', productType: 'Offset', timeEntries: [{ hours: 2 }] },
    { id: 'mp-2', number: 'OT-1', name: 'OT repetida', stageId: 'ETAPA_INEXISTENTE' },
  ]),
});

suite('migratePhase1 (integración con Postgres)', () => {
  let target: any;
  let prismaMod: typeof import('./prisma/client');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const repos = await import('./prisma/repositories');
    prismaMod = await import('./prisma/client');
    const db = prismaMod.getPrisma();
    await db.quoteItem.deleteMany({});
    await db.quote.deleteMany({});
    await db.productionProject.deleteMany({});
    await db.client.deleteMany({});
    target = { clients: repos.createClientsRepository(), quotes: repos.createQuotesRepository(), projects: repos.createProjectsRepository() };
  });

  afterAll(async () => {
    await prismaMod?.disconnectPrisma();
  });

  it('en simulación solo cuenta', async () => {
    const report = await migratePhase1(source(), target, { dryRun: true });
    expect(report.entities.quotes).toMatchObject({ read: 3, written: 0 });
    expect(await prismaMod.getPrisma().quote.count()).toBe(0);
  });

  it('copia todo, sin diferencias, y se puede repetir sin duplicar', async () => {
    for (let run = 0; run < 2; run++) {
      const report = await migratePhase1(source(), target);
      for (const e of Object.values(report.entities)) expect(e.failed).toEqual([]);
      expect(report.mismatches).toEqual([]);
      expect(report.entities).toMatchObject({ clients: { written: 3 }, quotes: { written: 3 }, projects: { written: 2 } });
    }
    const db = prismaMod.getPrisma();
    expect(await db.quote.count()).toBe(3);
    expect(await db.productionProject.count()).toBe(2);
    // Los 3 clientes del origen + 2 creados desde cotizaciones ("Nuevo Cliente" y "Cliente General")
    expect(await db.client.count()).toBe(5);
    // Solo un cliente conserva el NIT repetido en su columna
    expect(await db.client.count({ where: { documentNumber: '900123456' } })).toBe(1);
    // La cotización con NIT se enlazó al cliente existente
    const q1 = await db.quote.findUnique({ where: { id: 'mq-1' }, include: { client: true } });
    expect(q1!.client.id).toBe('cust-1');
    expect(q1!.status).toBe('APPROVED');
    expect((await target.quotes.get('mq-2')).status).toBe('estado raro');
  });
});
