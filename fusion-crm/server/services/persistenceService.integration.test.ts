/** Estado en memoria guardado en Postgres (tabla app_documents). Requiere TEST_DATABASE_URL. */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('firebase/app', () => ({ getApps: () => [] }));

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('persistencia del chat y demás estado en Postgres (integración)', () => {
  let svc: typeof import('./persistenceService');
  let chat: typeof import('../routes/chat');
  let store: typeof import('../repositories/documentStore');
  let prismaMod: typeof import('../repositories/prisma/client');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATA_BACKEND = 'postgres';
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { startsWith: 'state_' } } });
    svc = await import('./persistenceService');
    chat = await import('../routes/chat');
    store = await import('../repositories/documentStore');
  });

  afterAll(async () => {
    await prismaMod?.getPrisma().storedDocument.deleteMany({ where: { collection: { startsWith: 'state_' } } });
    delete process.env.DATA_BACKEND;
    await prismaMod?.disconnectPrisma();
  });

  it('los mensajes sobreviven a un reinicio y no se reescriben si no cambian', async () => {
    await svc.loadStateFromFirestore();
    chat.inMemoryMessages.push({ id: 'it-msg', channelId: 'general', text: 'Hola desde Postgres', meta: { z: 1, a: 2 } } as any);
    await svc.saveStateToFirestore();

    // Reinicio
    chat.inMemoryMessages.length = 0;
    svc.__test.reset();
    await svc.loadStateFromFirestore();
    expect(chat.inMemoryMessages.find((m) => m.id === 'it-msg')).toMatchObject({ text: 'Hola desde Postgres' });

    // jsonb reordena las claves: aun así no debe volver a escribir nada
    const repo = store.documentRepository('state_messages');
    const spy = vi.spyOn(repo, 'upsertMany');
    await svc.saveStateToFirestore();
    expect(spy).not.toHaveBeenCalled();
  });
});
