import { idbSaveCustomers, idbGetAllCustomers, idbClearAllCustomers, StoredCustomer } from '@/lib/indexedDbService';

export interface Customer extends StoredCustomer {}

const QUOTA_DATE_KEY = 'crm_firestore_quota_exhausted_date';
const CLEARED_TIMESTAMP_KEY = 'crm_customers_cleared_timestamp';

export function getClearedTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(CLEARED_TIMESTAMP_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function setClearedTimestamp(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLEARED_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.error('Failed to set cleared timestamp', e);
  }
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isQuotaExhaustedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_DATE_KEY);
    return raw === getTodayDateString();
  } catch {
    return false;
  }
}

export function markQuotaExhausted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_DATE_KEY, getTodayDateString());
  } catch (e) {
    console.error('Failed to set quota key in localStorage', e);
  }
}

export function resetQuotaFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUOTA_DATE_KEY);
  } catch (e) {
    console.error('Failed to remove quota key', e);
  }
}

export function isFirestoreQuotaError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('quota') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('free daily write units per project')
  );
}

/**
 * Filter out corrupt or dummy records that don't have a real name or NIT
 */
function isValidCustomerRecord(c: any, clearedAt: number): boolean {
  if (!c) return false;
  
  // Check if cleared
  if (clearedAt > 0) {
    const docTime = new Date(c.updatedAt || c.createdAt || 0).getTime();
    if (docTime > 0 && docTime <= clearedAt) {
      return false;
    }
  }

  // Filter dummy records like "Cliente #1846" with no NIT
  const name = String(c.name || '').trim();
  const nit = String(c.nit || c.doc || '').trim();
  if (name.startsWith('Cliente #') && (!nit || nit === '')) {
    return false;
  }

  return true;
}

/**
 * Fetch all customers reading from IndexedDB (ultra-fast, unlimited capacity, quota-free)
 */
export async function getAllCustomers(): Promise<{
  customers: Customer[];
  isQuotaExhausted: boolean;
  fromLocalCacheOnly: boolean;
}> {
  const clearedAt = getClearedTimestamp();
  let localList: Customer[] = [];
  try {
    localList = await idbGetAllCustomers();
  } catch (e) {
    console.warn('Could not read from IndexedDB:', e);
  }

  // Filter local list against cleared timestamp and dummy rows
  localList = localList.filter(c => isValidCustomerRecord(c, clearedAt));

  return { customers: localList, isQuotaExhausted: true, fromLocalCacheOnly: true };
}

/**
 * Import customers: saves immediately to IndexedDB (handles 50,000+ records with zero quota limits).
 * Completely avoids Firestore write quotas to prevent RESOURCE_EXHAUSTED errors.
 */
export async function importCustomers(
  items: Array<Omit<Customer, 'id'>>,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  success: boolean;
  total: number;
  cloudSynced: boolean;
  quotaHit: boolean;
  message: string;
}> {
  const total = items.length;
  if (total === 0) {
    return { success: true, total: 0, cloudSynced: false, quotaHit: false, message: 'No hay datos válidos para importar.' };
  }

  // 1. Read existing records from IndexedDB
  let existing: Customer[] = [];
  try {
    existing = await idbGetAllCustomers();
  } catch (e) {
    console.warn('Error reading existing customers:', e);
  }

  const timestamp = Date.now();
  const preparedList: Customer[] = items.map((item, idx) => {
    const id = `loc_${timestamp}_${idx}`;
    return {
      ...item,
      id,
      code: item.code || `CLI-${timestamp}-${idx}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      syncedToCloud: false,
    };
  });

  // Map to deduplicate / update by NIT
  const existingMap = new Map<string, Customer>();
  existing.forEach((c) => {
    if (c.nit) existingMap.set(c.nit.trim(), c);
  });
  
  // Combine: update existing or add new
  preparedList.forEach((p) => {
    if (p.nit) existingMap.set(p.nit.trim(), p);
    else existingMap.set(p.id, p);
  });

  const combined = Array.from(existingMap.values());
  await idbSaveCustomers(combined);

  if (onProgress) onProgress(total, total);

  return {
    success: true,
    total,
    cloudSynced: false,
    quotaHit: false,
    message: `¡${total.toLocaleString()} clientes importados exitosamente y guardados en la aplicación!`,
  };
}

/**
 * Add a single customer directly to IndexedDB
 */
export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const timestamp = new Date().toISOString();
  const localId = `cust_${Date.now()}`;
  const newCust: Customer = {
    ...data,
    id: localId,
    code: data.code || `CLI-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncedToCloud: false,
  };

  // Save to IndexedDB
  await idbSaveCustomers([newCust]);
  return newCust;
}

/**
 * Fast search over customers: searches IndexedDB store directly (instantaneous & offline safe)
 */
export async function searchCustomers(q: string): Promise<Customer[]> {
  const trimmed = (q || '').trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const clearedAt = getClearedTimestamp();
  let localList: Customer[] = [];
  try {
    localList = await idbGetAllCustomers();
  } catch (e) {
    console.warn('Error fetching for search:', e);
  }

  const localMatches = localList
    .filter(c => isValidCustomerRecord(c, clearedAt))
    .filter((c) => {
      const name = (c.name || '').toLowerCase();
      const tradeName = (c.tradeName || '').toLowerCase();
      const nit = (c.nit || c.doc || '').toLowerCase();
      const phone = (c.phone1 || c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const billingContact = (c.billingContact || '').toLowerCase();
      const address = (c.address || '').toLowerCase();

      return (
        name.includes(trimmed) ||
        tradeName.includes(trimmed) ||
        nit.includes(trimmed) ||
        phone.includes(trimmed) ||
        email.includes(trimmed) ||
        billingContact.includes(trimmed) ||
        address.includes(trimmed)
      );
    });

  return localMatches.slice(0, 15);
}

/**
 * Reload/Seed the database with real sample data from the server
 */
export async function seedCustomerDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/clients/seed', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      // Clear IndexedDB first to avoid duplicates or keep it clean
      await idbClearAllCustomers();
      // Import from cloud to local
      const cloudRes = await fetch('/api/clients');
      const cloudData = await cloudRes.json();
      if (cloudData.success && Array.isArray(cloudData.clients)) {
        await idbSaveCustomers(cloudData.clients);
      }
      return { success: true, message: data.message };
    }
    return { success: false, message: data.error || 'Error al sembrar base de datos' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Clear all customers: empties IndexedDB store, resets cache, and permanently removes old records
 */
export async function clearAllCustomers(): Promise<{ success: boolean; cloudCleared: boolean; message: string }> {
  // 1. Mark cleared timestamp immediately so any old or corrupted docs are permanently ignored
  setClearedTimestamp();

  // 2. Clear IndexedDB
  await idbClearAllCustomers();

  return {
    success: true,
    cloudCleared: false,
    message: 'Base de datos de clientes vaciada con éxito. Ahora puedes cargar tu archivo Excel limpio.',
  };
}
