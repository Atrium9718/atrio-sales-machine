/**
 * Pruebas contra un Postgres real. Se ejecutan solo si TEST_DATABASE_URL está definida
 * (en CI la provee un servicio postgres). La base debe tener las migraciones aplicadas.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('repositorios Postgres (integración)', () => {
  let repos: typeof import('./repositories');
  let prismaMod: typeof import('./client');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    repos = await import('./repositories');
    prismaMod = await import('./client');
    const db = prismaMod.getPrisma();
    await db.quoteItem.deleteMany({});
    await db.quote.deleteMany({});
    await db.productionProject.deleteMany({});
    await db.client.deleteMany({});
  });

  afterAll(async () => {
    await prismaMod?.disconnectPrisma();
  });

  const quoteDoc = (over: Record<string, any> = {}) => ({
    id: 'quote-it-1',
    number: 'COT-9001',
    status: 'Borrador',
    clientName: 'Pintuco S.A.S',
    clientNit: '900.123.456-1',
    clientEmail: 'compras@pintuco.com',
    date: '2026-09-20T10:00:00.000Z',
    subtotal: 150000,
    vatAmount: 28500,
    total: 178500,
    advisorName: 'Laura Gómez',
    pricingReview: { belowCost: false, items: [] },
    items: [
      { id: 'item-1', order: 1, description: 'Volantes', quantity: 1000, unitPrice: 150, applyVat: true, vatRate: 0.19, lineSubtotal: 150000, vatAmount: 28500, total: 178500, assistRunId: 'run_1', printTechnique: 'LITHO', assistInput: { qty1: 1000 } },
    ],
    ...over,
  });

  it('guarda y devuelve la cotización con la misma forma, incluidos los ítems', async () => {
    const quotes = repos.createQuotesRepository();
    const saved = await quotes.upsert(quoteDoc(), { actorId: 'emp-10', actorName: 'Laura Gómez' });
    expect(saved).toMatchObject({ id: 'quote-it-1', number: 'COT-9001', status: 'Borrador', advisorName: 'Laura Gómez' });
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0]).toMatchObject({ id: 'item-1', assistRunId: 'run_1', assistInput: { qty1: 1000 } });

    const row = await prismaMod.getPrisma().quote.findUnique({ where: { id: 'quote-it-1' }, include: { items: true, client: true, owner: true } });
    expect(row!.status).toBe('DRAFT');
    expect(Number(row!.total)).toBe(178500);
    expect(row!.client.documentNumber).toBe('900123456');
    expect(row!.client.documentDv).toBe('1');
    expect(row!.owner.name).toBe('Laura Gómez');
    expect(Number(row!.items[0].quantity)).toBe(1000);
  });

  it('reutiliza el cliente por NIT y mapea el estado aprobado', async () => {
    const quotes = repos.createQuotesRepository();
    await quotes.upsert(quoteDoc({ id: 'quote-it-2', number: 'COT-9002', clientName: 'PINTUCO', status: 'Aprobada', approvedBy: 'Ana', approvedAt: '2026-09-21T10:00:00.000Z' }));
    const db = prismaMod.getPrisma();
    expect(await db.client.count()).toBe(1);
    const row = await db.quote.findUnique({ where: { id: 'quote-it-2' } });
    expect(row).toMatchObject({ status: 'APPROVED', approvedByName: 'Ana' });
  });

  it('da una nueva revisión cuando el número ya lo usa otra cotización', async () => {
    const quotes = repos.createQuotesRepository();
    await quotes.upsert(quoteDoc({ id: 'quote-it-3', number: 'COT-9001' }));
    const rows = await prismaMod.getPrisma().quote.findMany({ where: { number: 'COT-9001' }, orderBy: { revision: 'asc' } });
    expect(rows.map((r) => [r.id, r.revision])).toEqual([['quote-it-1', 1], ['quote-it-3', 2]]);
    // Volver a guardar no cambia su revisión
    await quotes.upsert(quoteDoc({ id: 'quote-it-3', number: 'COT-9001', status: 'Enviada' }));
    expect((await prismaMod.getPrisma().quote.findUnique({ where: { id: 'quote-it-3' } }))!.revision).toBe(2);
  });

  it('patch mezcla campos y reemplaza los ítems', async () => {
    const quotes = repos.createQuotesRepository();
    const patched = await quotes.patch('quote-it-1', { status: 'Enviada', items: [] });
    expect(patched).toMatchObject({ status: 'Enviada', clientName: 'Pintuco S.A.S', items: [] });
    expect(await prismaMod.getPrisma().quoteItem.count({ where: { quoteId: 'quote-it-1' } })).toBe(0);
    expect(await quotes.patch('no-existe', { status: 'x' })).toBeNull();
  });

  it('lista, borra y crea clientes desde cotizaciones sin NIT', async () => {
    const quotes = repos.createQuotesRepository();
    await quotes.upsert(quoteDoc({ id: 'quote-it-4', number: 'COT-9004', clientName: 'Almacenes Éxito S.A.', clientNit: 'Por definir' }));
    const clients = await repos.createClientsRepository().list();
    expect(clients.map((c) => c.name).sort()).toEqual(['Almacenes Éxito S.A.', 'Pintuco S.A.S']);
    await quotes.delete('quote-it-4');
    expect(await quotes.get('quote-it-4')).toBeNull();
    expect((await quotes.list()).map((q) => q.id).sort()).toEqual(['quote-it-1', 'quote-it-2', 'quote-it-3']);
  });

  it('guarda proyectos con su etapa y desambigua números repetidos', async () => {
    const projects = repos.createProjectsRepository();
    const base = { number: 'OT-9001', name: 'Volantes', client: 'Pintuco', quoteId: 'quote-it-1', stageId: '3', productType: 'Gran Formato', priority: 'HIGH', tasks: [{ id: 't1' }], timeEntries: [{ hours: 1.5 }] };
    const saved = await projects.upsert({ id: 'proj-it-1', ...base });
    expect(saved).toMatchObject({ id: 'proj-it-1', stageId: '3', tasks: [{ id: 't1' }] });
    await projects.upsert({ id: 'proj-it-2', ...base, stageId: 'ENTREGADO' });
    const rows = await prismaMod.getPrisma().productionProject.findMany({ orderBy: { id: 'asc' }, include: { stage: true } });
    expect(rows.map((r) => [r.stage.key, r.productType, r.priority])).toEqual([
      ['EN_PRODUCCION', 'LARGE_FORMAT', 'HIGH'],
      ['ENTREGADO', 'LARGE_FORMAT', 'HIGH'],
    ]);
    expect(rows[0].number).toBe('OT-9001');
    expect(rows[1].number).toMatch(/^OT-9001-.+/);
    expect((await projects.get('proj-it-2'))!.number).toBe('OT-9001');
    expect(await projects.deleteAll()).toBe(2);
  });

  it('archiva clientes en vez de borrarlos y los recupera al volver a guardarlos', async () => {
    const clients = repos.createClientsRepository();
    await clients.upsert({ id: 'cli-x', name: 'Cliente X', nit: '800.555.777-9', temp: 'HOT', type: 'ACTIVE', billingContact: 'Marta' });
    await clients.delete('cli-x');
    expect(await clients.get('cli-x')).toBeNull();
    const restored = await clients.upsert({ id: 'cli-x', name: 'Cliente X' });
    expect(restored).toMatchObject({ id: 'cli-x', name: 'Cliente X' });
  });
});
