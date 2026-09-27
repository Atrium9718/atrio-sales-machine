/** Almacén genérico en Postgres (tabla app_documents). Requiere TEST_DATABASE_URL. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('almacén genérico de documentos en Postgres (integración)', () => {
  let store: typeof import('./documentStore');
  let prismaMod: typeof import('./prisma/client');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    store = await import('./documentStore');
    prismaMod = await import('./prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { startsWith: 'it_' } } });
  });

  afterAll(async () => {
    await prismaMod?.disconnectPrisma();
  });

  it('guarda, lee, mezcla y borra documentos por colección', async () => {
    const a = store.createPostgresDocumentRepository('it_conv');
    const b = store.createPostgresDocumentRepository('it_otra');
    await a.upsert({ id: 'c1', channel: 'whatsapp', messages: [{ text: 'hola' }], optional: undefined });
    await b.upsert({ id: 'c1', other: true });
    expect(await a.get('c1')).toEqual({ id: 'c1', channel: 'whatsapp', messages: [{ text: 'hola' }] });
    expect((await b.get('c1'))?.other).toBe(true);

    const patched = await a.patch('c1', { mode: 'human' });
    expect(patched).toMatchObject({ channel: 'whatsapp', mode: 'human' });
    expect(await a.patch('no-existe', { x: 1 })).toBeNull();

    await a.upsertMany([{ id: 'c2' }, { id: 'c3' }]);
    expect((await a.list()).map((d) => d.id).sort()).toEqual(['c1', 'c2', 'c3']);
    await a.delete('c2');
    expect(await a.get('c2')).toBeNull();
    expect(await a.deleteAll()).toBe(2);
    expect(await b.list()).toHaveLength(1);
  });
});
