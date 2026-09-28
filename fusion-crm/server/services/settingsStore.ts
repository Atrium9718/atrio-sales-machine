import fs from 'fs';
import path from 'path';
import { documentRepository } from '../repositories/documentStore';

/**
 * Configuración general del sistema (parámetros, identidad, reglas de cotización…).
 *
 * Antes vivía en settings.store.json DENTRO del contenedor: cada actualización del sistema la
 * devolvía a los valores de fábrica. Ahora se guarda en la base (colección app_settings) y el
 * archivo del repositorio solo aporta los valores iniciales la primera vez.
 */
const COLLECTION = 'app_settings';
const DOC_ID = 'values';
const DEFAULTS_FILE = path.join(process.cwd(), 'settings.store.json');

let cache: Record<string, any> = {};
let loaded = false;

function readDefaults(): Record<string, any> {
  try {
    if (fs.existsSync(DEFAULTS_FILE)) return JSON.parse(fs.readFileSync(DEFAULTS_FILE, 'utf8'));
  } catch (err) {
    console.warn('[configuración] No se pudo leer settings.store.json:', err);
  }
  return {};
}

/** Se llama al arrancar el servidor, antes de aceptar peticiones. */
export async function loadSettingsStore(): Promise<Record<string, any>> {
  try {
    const stored = await documentRepository(COLLECTION).get(DOC_ID);
    if (stored) {
      const { id: _id, ...values } = stored;
      cache = values;
    } else {
      // Primera vez: se parte de los valores del archivo (incluye lo que ya se hubiera cambiado ahí)
      cache = readDefaults();
      await documentRepository(COLLECTION).upsert({ id: DOC_ID, ...cache });
    }
  } catch (err) {
    console.error('[configuración] No se pudo cargar de la base; se usan los valores del archivo:', err);
    cache = readDefaults();
  }
  loaded = true;
  return cache;
}

/** Valores actuales (lectura síncrona desde la caché). */
export function getSettings(): Record<string, any> {
  if (!loaded) cache = { ...readDefaults(), ...cache };
  return cache;
}

/** Guarda cambios y devuelve la configuración completa. */
export async function updateSettings(updates: Record<string, any>): Promise<Record<string, any>> {
  cache = { ...getSettings(), ...updates };
  await documentRepository(COLLECTION).upsert({ id: DOC_ID, ...cache });
  return cache;
}

/** Solo para pruebas. */
export function __resetSettingsStore() {
  cache = {};
  loaded = false;
}
