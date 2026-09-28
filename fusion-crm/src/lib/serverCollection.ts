/**
 * Colección de negocio respaldada por el servidor.
 *
 * El servidor (Firestore) es la fuente de verdad. En el navegador solo se mantiene una
 * caché en memoria para que los stores sigan ofreciendo lecturas síncronas (getQuotes(),
 * getProjects()…). La caché se carga con hydrate() al iniciar sesión, se descarta al
 * recargar la página y nunca se guarda en localStorage.
 *
 * Datos antiguos: si existe la clave de localStorage que la colección usaba antes, en la
 * primera hidratación se suben al servidor los elementos que falten y se borra la clave.
 */

export interface CollectionAdapter<T> {
  list(): Promise<T[]>;
  save(items: T[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ServerCollectionOptions<T> {
  /** Evento de window que ya escuchan los componentes para refrescarse. */
  updatedEvent: string;
  /** Clave de localStorage usada antes de migrar al servidor. */
  legacyStorageKey?: string;
  /** Convierte cada elemento del formato antiguo (null para descartarlo). */
  fromLegacy?: (raw: any) => T | null;
  /** Filtra elementos antiguos que no deben migrarse (p. ej. datos demo). */
  legacyFilter?: (item: T) => boolean;
  adapter: CollectionAdapter<T>;
}

export interface ServerCollection<T extends { id: string }> {
  getAll(): T[];
  isHydrated(): boolean;
  hydrate(): Promise<T[]>;
  /** Reemplaza la caché sin escribir en el servidor (para datos que ya se persistieron). */
  replaceLocal(items: T[]): void;
  /** Inserta/actualiza en la caché y persiste en el servidor. */
  save(items: T | T[]): Promise<void>;
  /** Reemplaza la caché y persiste solo los elementos nuevos o modificados. */
  saveChanged(items: T[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export function dataApiAdapter<T extends { id: string }>(collection: string): CollectionAdapter<T> {
  const base = `/api/data/${collection}`;
  return {
    async list() {
      const res = await fetch(base);
      if (!res.ok) throw new Error(`GET ${base}: HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    },
    async save(items) {
      if (items.length === 0) return;
      const res =
        items.length === 1
          ? await fetch(`${base}/${encodeURIComponent(items[0].id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(items[0]),
            })
          : await fetch(`${base}/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items }),
            });
      if (!res.ok) throw new Error(`Guardar en ${base}: HTTP ${res.status}`);
    },
    async remove(id) {
      const res = await fetch(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE ${base}/${id}: HTTP ${res.status}`);
    },
  };
}

function readLegacy<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createServerCollection<T extends { id: string }>(
  options: ServerCollectionOptions<T>
): ServerCollection<T> {
  let items: T[] = [];
  let hydrated = false;
  let hydrating: Promise<T[]> | null = null;
  /** Última versión conocida en el servidor de cada elemento, para detectar cambios. */
  const snapshots = new Map<string, string>();

  const emit = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(options.updatedEvent));
  };

  const remember = (list: T[]) => {
    for (const it of list) if (it?.id) snapshots.set(it.id, JSON.stringify(it));
  };

  const persist = async (list: T[]) => {
    try {
      await options.adapter.save(list);
      remember(list);
    } catch (err) {
      console.error(`[${options.updatedEvent}] No se pudo guardar en el servidor`, err);
      throw err;
    }
  };

  async function migrateLegacy(serverItems: T[]): Promise<T[]> {
    const key = options.legacyStorageKey;
    if (!key || typeof localStorage === 'undefined') return [];
    const raw = readLegacy<any>(key);
    if (raw === null) return [];
    const legacy: T[] = options.fromLegacy
      ? raw.map(options.fromLegacy).filter((it): it is T => it !== null)
      : raw;

    const known = new Set(serverItems.map((it) => it.id));
    const pending = legacy.filter(
      (it) => it && typeof it.id === 'string' && !known.has(it.id) && (!options.legacyFilter || options.legacyFilter(it))
    );
    if (pending.length > 0) {
      await options.adapter.save(pending);
      console.info(`[migración] ${pending.length} elemento(s) de "${key}" subidos al servidor`);
    }
    localStorage.removeItem(key);
    return pending;
  }

  const collection: ServerCollection<T> = {
    getAll: () => items,
    isHydrated: () => hydrated,

    hydrate() {
      if (hydrating) return hydrating;
      hydrating = (async () => {
        try {
          const serverItems = await options.adapter.list();
          let migrated: T[] = [];
          try {
            migrated = await migrateLegacy(serverItems);
          } catch (err) {
            // Se conservan los datos antiguos en localStorage para reintentar en la próxima carga.
            console.error(`[migración] No se pudieron subir los datos de "${options.legacyStorageKey}"`, err);
          }
          items = [...migrated, ...serverItems];
          snapshots.clear();
          remember(items);
          hydrated = true;
          emit();
          return items;
        } finally {
          hydrating = null;
        }
      })();
      return hydrating;
    },

    replaceLocal(list) {
      items = list;
      remember(list);
      emit();
    },

    async save(input) {
      const list = Array.isArray(input) ? input : [input];
      const byId = new Map(list.map((it) => [it.id, it]));
      items = [...list.filter((it) => !items.some((e) => e.id === it.id)), ...items.map((e) => byId.get(e.id) ?? e)];
      emit();
      await persist(list);
    },

    async saveChanged(list) {
      items = list;
      emit();
      const changed = list.filter((it) => it?.id && snapshots.get(it.id) !== JSON.stringify(it));
      if (changed.length > 0) await persist(changed);
    },

    async remove(id) {
      items = items.filter((it) => it.id !== id);
      snapshots.delete(id);
      emit();
      await options.adapter.remove(id);
    },
  };

  return collection;
}
