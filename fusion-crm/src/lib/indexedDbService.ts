// Robust IndexedDB wrapper for CRM customers with zero quota limitations
const DB_NAME = 'CRM_FUSION_DB';
const DB_VERSION = 1;
const STORE_NAME = 'customers';

export interface StoredCustomer {
  id: string;
  code?: string;
  nit: string;
  doc?: string;
  doc_clean?: string;
  name: string;
  name_lower?: string;
  tradeName?: string;
  tradeName_lower?: string;
  firstName?: string;
  secondName?: string;
  firstLastName?: string;
  secondLastName?: string;
  address?: string;
  phone?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  billingContact?: string;
  billingEmail?: string;
  sector?: string;
  type?: string;
  temp?: string;
  updatedAt: string;
  createdAt: string;
  syncedToCloud?: boolean;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('nit', 'nit', { unique: false });
        store.createIndex('name_lower', 'name_lower', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      dbInstance = event.target.result;
      resolve(dbInstance!);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

export async function idbSaveCustomers(customers: StoredCustomer[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      customers.forEach((c) => {
        store.put(c);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Fallback to memory/localStorage:', err);
    // In case of restricted iframe context
    try {
      localStorage.setItem('crm_customers_store_cache', JSON.stringify(customers.slice(0, 1000)));
    } catch {}
  }
}

export async function idbGetAllCustomers(): Promise<StoredCustomer[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: StoredCustomer[] = request.result || [];
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    try {
      const raw = localStorage.getItem('crm_customers_store_cache');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function idbClearAllCustomers(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  } finally {
    try {
      localStorage.removeItem('crm_customers_store_cache');
      localStorage.removeItem('crm_customers_store_v2');
    } catch {}
  }
}
