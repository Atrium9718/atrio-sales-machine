import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServerCollection, type CollectionAdapter } from './serverCollection';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

type Item = { id: string; value?: number };

function fakeAdapter(initial: Item[] = []) {
  const server = new Map(initial.map((i) => [i.id, i]));
  const adapter: CollectionAdapter<Item> & { saves: Item[][] } = {
    saves: [],
    list: vi.fn(async () => Array.from(server.values())),
    save: vi.fn(async (items: Item[]) => {
      adapter.saves.push(items);
      items.forEach((i) => server.set(i.id, i));
    }),
    remove: vi.fn(async (id: string) => { server.delete(id); }),
  };
  return { adapter, server };
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemoryStorage();
});

describe('createServerCollection', () => {
  it('carga desde el servidor y no escribe en localStorage', async () => {
    const { adapter } = fakeAdapter([{ id: 'a', value: 1 }]);
    const col = createServerCollection<Item>({ updatedEvent: 'x', adapter });
    expect(col.isHydrated()).toBe(false);
    await col.hydrate();
    expect(col.isHydrated()).toBe(true);
    expect(col.getAll()).toEqual([{ id: 'a', value: 1 }]);
  });

  it('migra una vez los datos antiguos que faltan en el servidor y borra la clave', async () => {
    localStorage.setItem('legacy', JSON.stringify([{ id: 'a', value: 99 }, { id: 'b', value: 2 }, { id: 'demo' }]));
    const { adapter, server } = fakeAdapter([{ id: 'a', value: 1 }]);
    const col = createServerCollection<Item>({
      updatedEvent: 'x',
      legacyStorageKey: 'legacy',
      legacyFilter: (i) => i.id !== 'demo',
      adapter,
    });
    await col.hydrate();
    expect(adapter.saves).toEqual([[{ id: 'b', value: 2 }]]);
    expect(server.get('a')).toEqual({ id: 'a', value: 1 }); // el servidor manda
    expect(localStorage.getItem('legacy')).toBeNull();
    expect(col.getAll().map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('convierte el formato antiguo con fromLegacy', async () => {
    localStorage.setItem('legacy', JSON.stringify(['k1', '', 'k2']));
    const { adapter } = fakeAdapter();
    const col = createServerCollection<Item>({
      updatedEvent: 'x',
      legacyStorageKey: 'legacy',
      fromLegacy: (raw) => (raw ? { id: raw } : null),
      adapter,
    });
    await col.hydrate();
    expect(adapter.saves).toEqual([[{ id: 'k1' }, { id: 'k2' }]]);
  });

  it('conserva los datos antiguos si la migración falla', async () => {
    localStorage.setItem('legacy', JSON.stringify([{ id: 'b' }]));
    const { adapter } = fakeAdapter();
    adapter.save = vi.fn(async () => { throw new Error('offline'); });
    const col = createServerCollection<Item>({ updatedEvent: 'x', legacyStorageKey: 'legacy', adapter });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await col.hydrate();
    spy.mockRestore();
    expect(localStorage.getItem('legacy')).not.toBeNull();
  });

  it('saveChanged solo persiste elementos nuevos o modificados', async () => {
    const { adapter } = fakeAdapter([{ id: 'a', value: 1 }, { id: 'b', value: 2 }]);
    const col = createServerCollection<Item>({ updatedEvent: 'x', adapter });
    await col.hydrate();
    await col.saveChanged([{ id: 'a', value: 1 }, { id: 'b', value: 3 }, { id: 'c', value: 4 }]);
    expect(adapter.saves).toEqual([[{ id: 'b', value: 3 }, { id: 'c', value: 4 }]]);
    await col.saveChanged(col.getAll());
    expect(adapter.saves).toHaveLength(1);
  });

  it('save inserta o actualiza y remove elimina en caché y servidor', async () => {
    const { adapter, server } = fakeAdapter([{ id: 'a', value: 1 }]);
    const col = createServerCollection<Item>({ updatedEvent: 'x', adapter });
    await col.hydrate();
    await col.save([{ id: 'a', value: 5 }, { id: 'n', value: 7 }]);
    expect(col.getAll()).toEqual([{ id: 'n', value: 7 }, { id: 'a', value: 5 }]);
    await col.remove('a');
    expect(col.getAll()).toEqual([{ id: 'n', value: 7 }]);
    expect(server.has('a')).toBe(false);
  });

  it('comparte una sola petición si se hidrata en paralelo', async () => {
    const { adapter } = fakeAdapter([{ id: 'a' }]);
    const col = createServerCollection<Item>({ updatedEvent: 'x', adapter });
    await Promise.all([col.hydrate(), col.hydrate()]);
    expect(adapter.list).toHaveBeenCalledTimes(1);
  });
});
