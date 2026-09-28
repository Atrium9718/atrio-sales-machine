import { idbGetAllCustomers, idbClearAllCustomers, StoredCustomer } from '@/lib/indexedDbService';

/**
 * Clientes: viven en el servidor (la misma base para todo el equipo, la ficha del cliente,
 * la identificación de llamadas y el portal). Antes se guardaban solo en el navegador de cada
 * persona; lo que haya quedado ahí se sube una vez al servidor y se borra del navegador.
 */

export interface Customer extends StoredCustomer {}

let cache: { at: number; list: Customer[] } | null = null;
const CACHE_MS = 30_000;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

/** Sube al servidor los clientes que quedaron guardados solo en este navegador (una sola vez). */
let migrated = false;
async function migrateLocalCustomers(): Promise<void> {
  if (migrated) return;
  migrated = true;
  let local: StoredCustomer[] = [];
  try {
    local = await idbGetAllCustomers();
  } catch {
    return;
  }
  if (!local.length) return;
  const valid = local.filter((c) => String(c.name || '').trim() && !String(c.name).startsWith('Cliente #'));
  for (let i = 0; i < valid.length; i += 2000) {
    await api('/api/clients/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: valid.slice(i, i + 2000).map(({ syncedToCloud: _s, ...c }: any) => ({ ...c, id: String(c.id).startsWith('loc_') || String(c.id).startsWith('cust_') ? undefined : c.id })) }),
    });
  }
  await idbClearAllCustomers().catch(() => undefined);
  cache = null;
}

async function loadAll(force = false): Promise<Customer[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.list;
  await migrateLocalCustomers().catch((err) => console.warn('No se pudieron subir los clientes del navegador:', err));
  const data = await api<{ clients: Customer[] }>('/api/clients');
  cache = { at: Date.now(), list: data.clients || [] };
  return cache.list;
}

/** Todos los clientes del servidor. */
export async function getAllCustomers(): Promise<{ customers: Customer[]; isQuotaExhausted: boolean; fromLocalCacheOnly: boolean }> {
  const customers = await loadAll(true);
  return { customers, isQuotaExhausted: false, fromLocalCacheOnly: false };
}

/** Ya no hay cuota de Firestore que se agote: se conserva para las pantallas que lo consultan. */
export function isQuotaExhaustedToday(): boolean {
  return false;
}

/**
 * Importa clientes (Excel). El servidor actualiza al que ya exista con el mismo NIT en vez de
 * duplicarlo. Se envía por partes para que una lista grande no falle de una vez.
 */
export async function importCustomers(
  items: Array<Omit<Customer, 'id'>>,
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; total: number; cloudSynced: boolean; quotaHit: boolean; message: string }> {
  const total = items.length;
  if (!total) return { success: true, total: 0, cloudSynced: true, quotaHit: false, message: 'No hay datos válidos para importar.' };
  let done = 0;
  for (let i = 0; i < total; i += 1000) {
    const part = items.slice(i, i + 1000);
    await api('/api/clients/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: part }) });
    done += part.length;
    onProgress?.(done, total);
  }
  cache = null;
  return { success: true, total, cloudSynced: true, quotaHit: false, message: `${total.toLocaleString('es-CO')} clientes importados. Los que ya existían con el mismo NIT se actualizaron.` };
}

/** Crea un cliente. */
export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const res = await api<{ client: Customer }>('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  cache = null;
  return res.client;
}

/** Búsqueda rápida por nombre, NIT, teléfono, correo, contacto o dirección. */
export async function searchCustomers(q: string): Promise<Customer[]> {
  const trimmed = (q || '').trim().toLowerCase();
  if (trimmed.length < 2) return [];
  let list: Customer[] = [];
  try {
    list = await loadAll();
  } catch (e) {
    console.warn('No se pudieron buscar clientes:', e);
    return [];
  }
  return list
    .filter((c) =>
      [c.name, c.tradeName, c.nit || (c as any).doc, c.phone1 || (c as any).phone, c.email, c.billingContact, c.address].some((v) =>
        String(v || '').toLowerCase().includes(trimmed)
      )
    )
    .slice(0, 15);
}

/** Olvida la copia local (no borra nada del servidor). */
export async function clearAllCustomers(): Promise<{ success: boolean; cloudCleared: boolean; message: string }> {
  cache = null;
  return { success: true, cloudCleared: false, message: 'Los clientes se conservan; la importación actualiza los que tengan el mismo NIT.' };
}
