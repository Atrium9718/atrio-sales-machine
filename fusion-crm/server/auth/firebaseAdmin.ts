import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { loadFirebaseConfig } from './firebaseConfig';

/**
 * App por defecto de firebase-admin. Las credenciales se toman de Application Default
 * Credentials (GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la cuenta de servicio).
 */
export function getAdminApp(): App | null {
  const existing = getApps();
  if (existing.length) return existing[0];

  const config = loadFirebaseConfig();
  if (!config.projectId) return null;
  try {
    return initializeApp({ projectId: config.projectId, storageBucket: config.storageBucket });
  } catch (err) {
    console.error('[auth] Error inicializando firebase-admin', err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}
