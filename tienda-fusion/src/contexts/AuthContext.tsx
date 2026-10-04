import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider, googleDriveAuthProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  driveAccessToken: string | null;
  isAdmin: boolean;
  /** Inicia sesión con Google. Con `withDrive` pide además permisos de Google Drive y devuelve su token. */
  login: (options?: { withDrive?: boolean }) => Promise<string | null>;
  /** Mensaje para el usuario cuando el inicio de sesión falla (null si no hay error). */
  loginError: string | null;
  clearLoginError: () => void;
  logout: () => Promise<void>;
  loading: boolean;
  isLoggingIn: boolean;
}

export const ADMIN_EMAILS = [
  'andresepulveda718@gmail.com',
  'admin@fusion.com',
  'admin@fusiongrafica.com.co',
  'gerencia@fusiongrafica.com.co',
  'diseno@fusion.com',
];

export const checkIsAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    ADMIN_EMAILS.includes(normalized) ||
    normalized.endsWith('@fusion.com') ||
    normalized.endsWith('@fusiongrafica.com.co') ||
    normalized.startsWith('admin')
  );
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const describeLoginError = (code: string): string => {
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'El inicio de sesión aún no está habilitado para esta dirección. El administrador debe autorizar el dominio en Firebase.';
    case 'auth/popup-blocked':
      return 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'El inicio de sesión con Google no está configurado todavía. Inténtalo más tarde.';
    case 'auth/network-request-failed':
      return 'No hay conexión con Google. Revisa tu internet e inténtalo de nuevo.';
    default:
      return 'No pudimos iniciar sesión con Google. Inténtalo de nuevo en unos minutos.';
  }
};

// In-memory cache for Google OAuth access token
let cachedDriveAccessToken: string | null = null;
let activeLoginPromise: Promise<string | null> | null = null;

export const getCachedDriveAccessToken = () => cachedDriveAccessToken;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(cachedDriveAccessToken);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const currentToken = await currentUser.getIdToken();
          setToken(currentToken);
        } catch {
          setToken(null);
        }
      } else {
        setToken(null);
        cachedDriveAccessToken = null;
        setDriveAccessToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (options?: { withDrive?: boolean }): Promise<string | null> => {
    // If a login attempt is already in flight, reuse the promise to prevent duplicate popup collisions
    if (activeLoginPromise) {
      return activeLoginPromise;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    activeLoginPromise = (async () => {
      try {
        const provider = options?.withDrive ? googleDriveAuthProvider : googleAuthProvider;
        const result = await signInWithPopup(auth, provider);
        if (!options?.withDrive) return null;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedDriveAccessToken = credential.accessToken;
          setDriveAccessToken(credential.accessToken);
          return credential.accessToken;
        }
        return null;
      } catch (error: any) {
        const errorCode = error?.code || '';
        // Benign cancellations when user closes popup or cancels request
        if (
          errorCode === 'auth/cancelled-popup-request' ||
          errorCode === 'auth/popup-closed-by-user' ||
          errorCode === 'auth/user-cancelled'
        ) {
          return null;
        }

        console.error("Error al iniciar sesión con Google:", error);
        setLoginError(describeLoginError(errorCode));
        return null;
      } finally {
        activeLoginPromise = null;
        setIsLoggingIn(false);
      }
    })();

    return activeLoginPromise;
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      cachedDriveAccessToken = null;
      setDriveAccessToken(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const isAdmin = Boolean(user && checkIsAdmin(user.email));

  return (
    <AuthContext.Provider value={{ user, token, driveAccessToken, isAdmin, login, logout, loading, isLoggingIn, loginError, clearLoginError: () => setLoginError(null) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

