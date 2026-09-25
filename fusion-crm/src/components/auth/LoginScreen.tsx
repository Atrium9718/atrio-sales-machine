import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { LogIn, ShieldCheck } from 'lucide-react';
import { auth } from '../../lib/firebase';

/**
 * Rutas que se ven sin iniciar sesión: portal de cliente, kiosco de mostrador, preferencias
 * y habeas data. El kiosco de planta (/kiosko-planta) muestra órdenes internas y exige sesión.
 */
const PUBLIC_PATH_PREFIXES = ['/c/', '/preferencias/'];
const PUBLIC_PATHS = ['/kiosko', '/habeas-data'];

export function isPublicPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_PATHS.includes(path) || PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));
}

export function LoginScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      // La sesión vive en una cookie httpOnly del servidor; no se necesita la de Firebase en el navegador.
      await signOut(auth).catch(() => undefined);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `No se pudo iniciar sesión (HTTP ${res.status})`);
      }
      window.location.reload();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(err?.message || 'No se pudo iniciar sesión');
      }
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Fusion CRM &amp; ERP</h1>
          <p className="text-sm text-muted-foreground">Ingresa con la cuenta de Google registrada como colaborador.</p>
        </div>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          <LogIn className="w-4 h-4" />
          {isSigningIn ? 'Ingresando…' : 'Iniciar sesión con Google'}
        </button>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
