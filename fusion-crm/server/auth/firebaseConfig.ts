import fs from 'fs';
import path from 'path';

export interface FirebaseWebConfig {
  projectId?: string;
  storageBucket?: string;
  firestoreDatabaseId?: string;
  [key: string]: unknown;
}

let cached: FirebaseWebConfig | null = null;

/** Lee firebase-applet-config.json del directorio de trabajo (vacío si no existe). */
export function loadFirebaseConfig(): FirebaseWebConfig {
  if (cached) return cached;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    cached = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  } catch (e) {
    console.warn('[auth] No se pudo leer firebase-applet-config.json', e);
    cached = {};
  }
  return cached!;
}
