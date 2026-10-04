import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import fallbackConfig from '../../firebase-applet-config.json';

// La configuración web de Firebase es pública (va al navegador). Se toma de las variables
// VITE_FIREBASE_* definidas en el hosting al compilar; si no existen, del archivo JSON.
const env = (import.meta as any).env || {};
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Inicio de sesión normal: solo nombre y correo (sin permisos sensibles que Google bloquea
// o marca como "app no verificada").
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Solo cuando el cliente elige "Subir desde Google Drive" se piden permisos de Drive.
export const googleDriveAuthProvider = new GoogleAuthProvider();
googleDriveAuthProvider.setCustomParameters({
  prompt: 'select_account',
});
googleDriveAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleDriveAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleDriveAuthProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
