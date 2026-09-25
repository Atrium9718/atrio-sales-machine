import { getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in customerSearchService', e);
}

function getDb() {
  if (!getApps().length) return null;
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

export interface CustomerRecord {
  id: string;
  name: string;
  company: string;
  tradeName?: string;
  phones: string[];
  primaryPhone: string;
  emails: string[];
  primaryEmail: string;
  nit: string;
  address: string;
  city: string;
  contactPerson: string;
  billingContact?: string;
  billingEmail?: string;
  matchedBy?: string;
  raw?: any;
}

// In-memory cache of customers to avoid slow repeated Firestore queries and quota spikes
let customerCache: CustomerRecord[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function cleanDigits(val: any): string {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

function cleanText(val: any): string {
  if (!val) return '';
  return String(val).toLowerCase().trim();
}

/**
 * Normaliza un documento proveniente de Firestore o carga de Excel
 */
function normalizeDoc(id: string, data: any): CustomerRecord {
  const raw = data.raw || {};

  // 1. Empresa / Razón Social
  const company = (
    data.company ||
    data.tradeName ||
    data.nombreComercial ||
    raw.__EMPTY ||
    data.name ||
    ''
  ).trim();

  // 2. Persona de Contacto o Nombre Personal
  const contactPerson = (
    data.contactPerson ||
    data.contact ||
    data.billingContact ||
    raw.__EMPTY_10 ||
    raw.__EMPTY_1 ||
    (data.firstName ? `${data.firstName} ${data.firstLastName || ''}`.trim() : '') ||
    ''
  ).trim();

  const name = (
    data.name ||
    contactPerson ||
    company ||
    'Cliente Fusión'
  ).trim();

  // 3. Teléfonos
  const phonesSet = new Set<string>();
  [
    data.phone,
    data.phone1,
    data.phone2,
    data.phone3,
    data.mobile,
    raw.__EMPTY_6,
    raw.__EMPTY_7
  ].forEach(p => {
    if (p) {
      const cleaned = cleanDigits(p);
      if (cleaned.length >= 7) {
        phonesSet.add(cleaned);
        const str = String(p).trim();
        if (str && str !== '0' && !str.toUpperCase().includes('TELÉFONO')) {
          phonesSet.add(str);
        }
      }
    }
  });
  const phones = Array.from(phonesSet);
  const primaryPhone = phones.find(p => cleanDigits(p).length >= 7) || phones[0] || '';

  // 4. Correos electrónicos
  const emailsSet = new Set<string>();
  [
    data.email,
    data.billingEmail,
    data.contactEmail,
    raw.__EMPTY_9,
    raw.__EMPTY_11
  ].forEach(e => {
    if (e && String(e).includes('@')) {
      emailsSet.add(String(e).toLowerCase().trim());
    }
  });
  const emails = Array.from(emailsSet);
  const primaryEmail = emails[0] || '';

  // 5. NIT / Identificación
  const nitRaw = data.nit || data.doc || data.identification || raw.__EMPTY_2 || raw.__EMPTY_3 || '';
  const nit = String(nitRaw).trim();

  // 6. Dirección y Ciudad
  const address = (data.address || raw.__EMPTY_5 || '').trim();
  const city = (data.city || raw.__EMPTY_4 || 'Medellín / Colombia').trim();

  return {
    id,
    name,
    company,
    tradeName: (data.tradeName || raw.__EMPTY || '').trim(),
    phones,
    primaryPhone,
    emails,
    primaryEmail,
    nit,
    address,
    city,
    contactPerson,
    billingContact: (data.billingContact || raw.__EMPTY_10 || '').trim(),
    billingEmail: (data.billingEmail || raw.__EMPTY_11 || '').trim(),
    raw
  };
}

/**
 * Carga o actualiza el cache de clientes desde Firestore
 */
export async function loadAllCustomers(forceRefresh = false): Promise<CustomerRecord[]> {
  const now = Date.now();
  if (customerCache && !forceRefresh && (now - lastCacheUpdate < CACHE_TTL_MS)) {
    return customerCache;
  }

  const db = getDb();
  if (!db) {
    return customerCache || [];
  }

  try {
    const snap = await getDocs(collection(db, 'customers'));
    const list: CustomerRecord[] = [];
    for (const d of snap.docs) {
      list.push(normalizeDoc(d.id, d.data()));
    }
    customerCache = list;
    lastCacheUpdate = now;
    return list;
  } catch (err) {
    console.warn('Error loading customers from Firestore in customerSearchService:', err);
    return customerCache || [];
  }
}

export interface SearchCriteria {
  query?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  nit?: string;
  limit?: number;
}

/**
 * Motor de consulta avanzado de clientes para las IAs y endpoints
 * Permite buscar por nombres, empresas, números de teléfono, correos y NIT
 */
export async function searchCustomers(criteria: SearchCriteria): Promise<CustomerRecord[]> {
  const all = await loadAllCustomers();
  if (!all.length) return [];

  const q = cleanText(criteria.query);
  const searchName = cleanText(criteria.name);
  const searchCompany = cleanText(criteria.company);
  const searchPhone = cleanDigits(criteria.phone);
  const searchEmail = cleanText(criteria.email);
  const searchNit = cleanDigits(criteria.nit);
  const maxResults = criteria.limit || 10;

  // Si no se pasó ningún parámetro, devolver los primeros
  if (!q && !searchName && !searchCompany && !searchPhone && !searchEmail && !searchNit) {
    return all.slice(0, maxResults);
  }

  const results: { record: CustomerRecord; score: number; matchedBy: string }[] = [];

  for (const c of all) {
    let score = 0;
    const matchReasons: string[] = [];

    const normName = cleanText(c.name);
    const normCompany = cleanText(c.company);
    const normContact = cleanText(c.contactPerson);
    const normTrade = cleanText(c.tradeName);
    const normAddress = cleanText(c.address);
    const normNitDigits = cleanDigits(c.nit);

    // 1. Búsqueda directa por Correo Electrónico
    if (searchEmail) {
      const emailMatch = c.emails.some(e => e.includes(searchEmail) || searchEmail.includes(e));
      if (emailMatch) {
        score += 100;
        matchReasons.push(`Correo: ${c.primaryEmail || searchEmail}`);
      }
    }

    // 2. Búsqueda directa por Teléfono (exacto o subcadena de 7-10 dígitos)
    if (searchPhone && searchPhone.length >= 7) {
      const phoneMatch = c.phones.some(p => {
        const pDig = cleanDigits(p);
        if (pDig.length < 7) return false;
        return pDig.includes(searchPhone) || searchPhone.includes(pDig);
      });
      if (phoneMatch) {
        score += 100;
        matchReasons.push(`Teléfono: ${searchPhone}`);
      }
    }

    // 3. Búsqueda por NIT / Identificación
    if (searchNit && searchNit.length >= 4) {
      if (normNitDigits && (normNitDigits.includes(searchNit) || searchNit.includes(normNitDigits))) {
        score += 90;
        matchReasons.push(`NIT: ${c.nit}`);
      }
    }

    // 4. Búsqueda por Empresa
    if (searchCompany && searchCompany.length >= 3) {
      if (normCompany.includes(searchCompany) || searchCompany.includes(normCompany) ||
          normTrade.includes(searchCompany) || searchCompany.includes(normTrade)) {
        score += 85;
        matchReasons.push(`Empresa: ${c.company || c.tradeName}`);
      }
    }

    // 5. Búsqueda por Nombre de Persona / Contacto
    if (searchName && searchName.length >= 3) {
      if (normName.includes(searchName) || searchName.includes(normName) ||
          normContact.includes(searchName) || searchName.includes(normContact)) {
        score += 80;
        matchReasons.push(`Nombre: ${c.name}`);
      }
    }

    // 6. Búsqueda libre 'query' (analiza todos los campos)
    if (q) {
      const qDigits = cleanDigits(q);
      
      // Chequeo si el query contiene un correo
      if (q.includes('@')) {
        const matchedEmail = c.emails.find(e => e.includes(q) || q.includes(e));
        if (matchedEmail) {
          score += 100;
          matchReasons.push(`Correo: ${matchedEmail}`);
        }
      }

      // Chequeo si el query contiene un teléfono
      if (qDigits && qDigits.length >= 7) {
        const matchedPhone = c.phones.find(p => {
          const pDig = cleanDigits(p);
          return pDig.includes(qDigits) || qDigits.includes(pDig);
        });
        if (matchedPhone) {
          score += 95;
          matchReasons.push(`Teléfono: ${matchedPhone}`);
        }
      }

      // Chequeo de NIT en query
      if (qDigits && qDigits.length >= 6 && normNitDigits.includes(qDigits)) {
        score += 90;
        matchReasons.push(`NIT: ${c.nit}`);
      }

      // Chequeo en Empresa
      if ((normCompany && normCompany.includes(q)) || (normTrade && normTrade.includes(q))) {
        score += 70;
        matchReasons.push(`Empresa: ${c.company || c.tradeName}`);
      }

      // Chequeo en Nombre o Contacto
      if (normName.includes(q) || normContact.includes(q)) {
        score += 65;
        matchReasons.push(`Nombre: ${c.name}`);
      }

      // Chequeo de palabras individuales
      const terms = q.split(/\s+/).filter(t => t.length >= 3);
      if (terms.length > 1) {
        const allTermsMatch = terms.every(t => 
          normCompany.includes(t) || 
          normName.includes(t) || 
          normContact.includes(t) || 
          normAddress.includes(t)
        );
        if (allTermsMatch) {
          score += 60;
          matchReasons.push(`Coincidencia múltiple (${terms.join(', ')})`);
        }
      }
    }

    if (score > 0) {
      results.push({
        record: {
          ...c,
          matchedBy: matchReasons.join(' | ') || 'Coincidencia en base de datos'
        },
        score,
        matchedBy: matchReasons.join(' | ')
      });
    }
  }

  // Ordenar por relevancia / score descendente
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults).map(r => r.record);
}

/**
 * Extrae entidades (correo, teléfono, empresa, nombre, nit) directamente de un mensaje de chat
 */
export function extractEntitiesFromMessage(text: string): SearchCriteria {
  const criteria: SearchCriteria = {};

  if (!text) return criteria;

  // 1. Correo electrónico
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    criteria.email = emailMatch[0];
  }

  // 2. Teléfono (10 dígitos empezando en 3 o 7 dígitos fijos)
  const phoneMatch = text.match(/(?:(?:\+?57)?\s*3\d{9}|\b\d{7,10}\b)/);
  if (phoneMatch) {
    criteria.phone = phoneMatch[0].replace(/\D/g, '');
  }

  // 3. NIT / Cédula
  const nitMatch = text.match(/(?:nit|rut|c[eé]dula|cc)\s*[:#]?\s*([0-9.\-]{6,15})/i);
  if (nitMatch) {
    criteria.nit = nitMatch[1].replace(/\D/g, '');
  }

  // 4. Nombre ("soy Juan Pérez", "mi nombre es Juan", "me llamo...")
  const nameMatch = text.match(/(?:soy|me llamo|mi nombre es|habla|hablas con)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){1,3})/i);
  if (nameMatch) {
    criteria.name = nameMatch[1].trim();
  }

  // 5. Empresa ("de Copidrogas", "empresa Pintuco", "para la empresa...", "laboratorios...")
  const companyMatch = text.match(/(?:de la empresa|de|empresa|laboratorio|laboratorios|cooperativa|industrias)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+){0,2})/i);
  if (companyMatch && !criteria.name) {
    criteria.company = companyMatch[1].trim();
  }

  return criteria;
}
