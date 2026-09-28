import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// El navegador no usa Firestore: todos los datos pasan por la API del servidor.

// Global suppression of background retry errors for exhausted quotas to prevent unhandled rejection crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    if (err) {
      const code = String(err.code || '').toLowerCase();
      const msg = String(err.message || '').toLowerCase();
      if (
        code.includes('resource-exhausted') ||
        code.includes('quota') ||
        msg.includes('quota limit exceeded') ||
        msg.includes('resource-exhausted') ||
        msg.includes('maximum backoff delay') ||
        msg.includes('free daily write units')
      ) {
        event.preventDefault();
      }
    }
  });
}
