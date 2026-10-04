import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { siteSettings } from './schema';

/**
 * Configuración persistente en la tabla site_settings (clave → JSON).
 * Sustituye a los archivos *.config.json, que se pierden en cada redespliegue
 * del hosting. Los servicios mantienen una copia en memoria para lecturas síncronas
 * y escriben en segundo plano con saveSettingInBackground.
 */
export async function loadSetting<T>(key: string): Promise<T | undefined> {
  const row = (await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1))[0];
  return row ? (row.value as T) : undefined;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await db.insert(siteSettings)
    .values({ key, value: value as any, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: value as any, updatedAt: new Date() } });
}

// Las escrituras de una misma clave se encadenan para que nunca lleguen fuera de orden
const pendingWrites = new Map<string, Promise<void>>();

export function saveSettingInBackground(key: string, value: unknown): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(value));
  const previous = pendingWrites.get(key) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => saveSetting(key, snapshot))
    .catch(err => console.error(`No se pudo guardar la configuración "${key}" en la base de datos:`, err?.message || err));
  pendingWrites.set(key, next);
  return next;
}

/**
 * Carga una configuración desde la base de datos. Si aún no existe, la migra desde el
 * archivo JSON heredado (si lo hay) para no perder lo configurado antes.
 * Devuelve undefined si no hay ni registro ni archivo, o si la base de datos no responde.
 */
export async function loadSettingWithLegacyFile<T>(key: string, legacyFileName: string): Promise<T | undefined> {
  try {
    const stored = await loadSetting<T>(key);
    if (stored !== undefined) return stored;

    const legacyPath = path.join(process.cwd(), legacyFileName);
    if (fs.existsSync(legacyPath)) {
      const raw = fs.readFileSync(legacyPath, 'utf8').trim();
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        await saveSetting(key, parsed);
        console.log(`Configuración "${key}" migrada desde ${legacyFileName} a la base de datos.`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn(`No se pudo cargar la configuración "${key}":`, err?.message || err);
  }
  return undefined;
}
