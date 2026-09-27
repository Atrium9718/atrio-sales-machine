import { vi } from 'vitest';
vi.mock('firebase/app', () => ({ getApps: () => [] }));
import { describe, it, expect } from 'vitest';
import { GENERIC_COLLECTIONS, migrateGenericCollections } from './migrateGeneric';
import { createMemoryRepository } from './documentStore';

describe('migración de colecciones genéricas', () => {
  const make = () => new Map<string, ReturnType<typeof createMemoryRepository>>();
  const repoIn = (m: Map<string, any>) => (name: string) => {
    if (!m.has(name)) m.set(name, createMemoryRepository());
    return m.get(name);
  };

  it('copia cada colección tal cual, es idempotente y verifica los ids', async () => {
    const src = make();
    const dst = make();
    await repoIn(src)('employees').upsertMany([{ id: 'emp-1', name: 'Ana' }, { id: 'emp-2', name: 'Luis' }]);
    await repoIn(src)('opportunities').upsert({ id: 'OPP-1', amount: 5 });

    const r1 = await migrateGenericCollections(['employees', 'opportunities', 'chats'], repoIn(src), repoIn(dst), { batchSize: 1 });
    expect(r1.collections.employees).toMatchObject({ read: 2, written: 2, failed: 0 });
    expect(r1.collections.chats).toMatchObject({ read: 0, written: 0 });
    expect(r1.mismatches).toEqual([]);
    expect(await repoIn(dst)('employees').get('emp-2')).toEqual({ id: 'emp-2', name: 'Luis' });

    const r2 = await migrateGenericCollections(['employees'], repoIn(src), repoIn(dst));
    expect(r2.collections.employees.written).toBe(2);
    expect(await repoIn(dst)('employees').list()).toHaveLength(2);
  });

  it('simulación: solo cuenta; y registra colecciones ilegibles sin detenerse', async () => {
    const src = make();
    const dst = make();
    await repoIn(src)('roles').upsert({ id: 'r1' });
    const broken = (name: string) => (name === 'roles' ? repoIn(src)(name) : ({ list: async () => { throw new Error('sin permiso'); } } as any));
    const r = await migrateGenericCollections(['employees', 'roles'], broken, repoIn(dst), { dryRun: true });
    expect(r.collections.employees.error).toBe('sin permiso');
    expect(r.collections.roles).toMatchObject({ read: 1, written: 0 });
    expect(await repoIn(dst)('roles').list()).toEqual([]);
  });

  it('la lista cubre las colecciones del estado en memoria', async () => {
    const { __test } = await import('../services/persistenceService');
    for (const b of __test.BINDINGS) expect(GENERIC_COLLECTIONS).toContain(`state_${b.name}`);
    expect(new Set(GENERIC_COLLECTIONS).size).toBe(GENERIC_COLLECTIONS.length);
  });
});
