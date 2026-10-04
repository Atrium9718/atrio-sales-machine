import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  driveAccessToken: string | null;
  isAdmin: boolean;
  login: () => Promise<string | null>;
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

  const login = async (): Promise<string | null> => {
    // If a login attempt is already in flight, reuse the promise to prevent duplicate popup collisions
    if (activeLoginPromise) {
      return activeLoginPromise;
    }

    setIsLoggingIn(true);
    activeLoginPromise = (async () => {
      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
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
          // Gracefully return null without bubbling uncaught error
          return null;
        }

        if (errorCode === 'auth/popup-blocked') {
          console.warn("Ventana emergente bloqueada por el navegador. Habilita las ventanas emergentes para iniciar sesión con Google.");
          return null;
        }

        console.error("Error al iniciar sesión con Google:", error);
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
    <AuthContext.Provider value={{ user, token, driveAccessToken, isAdmin, login, logout, loading, isLoggingIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

