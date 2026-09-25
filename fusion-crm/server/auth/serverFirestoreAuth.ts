import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getAdminAuth } from './firebaseAdmin';
import { loadFirebaseConfig } from './firebaseConfig';

/** Claim que las reglas de Firestore exigen para permitir lectura/escritura. */
export const SERVER_CLAIM = 'fusion_server';
const SERVER_UID = 'fusion-server';

/**
 * El servidor usa el SDK cliente de Firestore. Para que funcione con reglas cerradas
 * (ver firestore.rules), inicia sesión con un token personalizado que lleva el claim
 * `fusion_server`, emitido con la cuenta de servicio de firebase-admin.
 *
 * Debe ejecutarse antes de importar los módulos que consultan Firestore al cargarse.
 */
export async function authenticateServerFirestoreClient(): Promise<boolean> {
  const config = loadFirebaseConfig();
  if (!config.projectId) {
    console.warn('[auth] Sin firebase-applet-config.json: Firestore deshabilitado.');
    return false;
  }

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('firebase-admin no disponible');
    const token = await adminAuth.createCustomToken(SERVER_UID, { [SERVER_CLAIM]: true });

    if (!getApps().length) initializeApp(config);
    await signInWithCustomToken(getAuth(getApps()[0]), token);
    console.log('[auth] Servidor autenticado ante Firestore.');
    return true;
  } catch (err: any) {
    console.error(
      '[auth] No se pudo autenticar el servidor ante Firestore. Revise GOOGLE_APPLICATION_CREDENTIALS ' +
        '(cuenta de servicio con rol "Service Account Token Creator"). Con reglas cerradas, Firestore fallará.',
      err?.message || err
    );
    return false;
  }
}
