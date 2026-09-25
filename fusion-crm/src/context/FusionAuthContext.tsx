import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { canAccessModule, FusionModuleKey, SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../packages/core/src/auth/permissions';
import { LoginScreen, isPublicPath } from '../components/auth/LoginScreen';
import { hydrateBusinessData } from '../lib/businessData';

export interface FusionEmployee {
  id: string;
  initials: string;
  name: string;
  jobTitle: string;
  status: 'ACTIVO' | 'INACTIVO';
  contractType: 'PLANTA' | 'SUPERNUMERARIO';
  email: string;
  phone?: string;
  extension?: string;
  roleKey: string;
  roleName: string;
  area?: string;
  customAllowedModules?: string[];
  customDeniedModules?: string[];
  customPermissions?: string[];
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

// Canonical Employee alias
export type Employee = FusionEmployee;

export interface FusionRole {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  allowedModules: string[];
  permissions: string[];
}

export const PERMANENT_SUPER_USER_ID = 'emp-03';

interface FusionAuthContextType {
  currentUser: FusionEmployee | null;
  /** Usuario que inició sesión con Google (distinto de currentUser mientras se simula a otro). */
  realUser: FusionEmployee | null;
  permanentSuperUser: FusionEmployee | null;
  canImpersonate: boolean;
  logout: () => Promise<void>;
  employees: FusionEmployee[];
  roles: FusionRole[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonateUser: (user: FusionEmployee) => Promise<void>;
  revertToSuperAdmin: () => Promise<void>;
  refreshEmployees: (includeInactive?: boolean) => Promise<FusionEmployee[]>;
  refreshRoles: () => Promise<FusionRole[]>;
  canSeeModule: (moduleKey: FusionModuleKey) => boolean;
}

const FusionAuthContext = createContext<FusionAuthContextType | undefined>(undefined);

const isAdminRoleKey = (roleKey?: string) => roleKey === 'super_admin' || roleKey === 'admin';

export const FusionAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<FusionEmployee[]>([]);
  const [roles, setRoles] = useState<FusionRole[]>([]);
  const [currentUser, setCurrentUser] = useState<FusionEmployee | null>(null);
  const [realUser, setRealUser] = useState<FusionEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  const applyUserToWindow = useCallback((user: FusionEmployee, allRoles: FusionRole[]) => {
    if (typeof window === 'undefined') return;

    (window as any).__FUSION_CURRENT_USER__ = user;
    (window as any).__FUSION_USER_ROLE__ = user.roleKey;

    const isSuper =
      user.roleKey === 'super_admin' ||
      user.roleKey === 'admin' ||
      user.id === PERMANENT_SUPER_USER_ID ||
      (typeof user.email === 'string' && user.email.toLowerCase().includes('andresepulveda718'));

    if (isSuper) {
      (window as any).__FUSION_USER_PERMISSIONS__ = ['*'];
      (window as any).__FUSION_USER_ROLE__ = 'super_admin';
    } else {
      const userRole = allRoles.find(r => r.key === user.roleKey);
      const basePerms = userRole?.permissions || (SEED_ROLE_COLLABORATION_PERMISSIONS as any)[userRole?.key || ''] || (SEED_ROLE_COLLABORATION_PERMISSIONS as any)['planta'] || [];
      const customPerms = user.customPermissions || [];
      (window as any).__FUSION_USER_PERMISSIONS__ = Array.from(new Set([...basePerms, ...customPerms]));
    }

    window.dispatchEvent(new CustomEvent('fusion_user_changed', { detail: { user } }));
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
        return data;
      }
    } catch (e) {
      console.warn('Error loading roles', e);
    }
    return [];
  }, []);

  const refreshEmployees = useCallback(async (includeInactive = false) => {
    try {
      const url = includeInactive ? '/api/admin/users?includeInactive=true' : '/api/admin/users';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        return data;
      }
    } catch (e) {
      console.warn('Error loading employees', e);
    }
    return [];
  }, []);

  // Carga inicial: la identidad la decide el servidor a partir de la cookie de sesión
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) {
          if (mounted) setNeedsLogin(true);
          return;
        }
        if (!meRes.ok) throw new Error(`HTTP ${meRes.status}`);
        const me = await meRes.json();

        const [empData, roleData] = await Promise.all([
          fetch('/api/admin/users').then(r => (r.ok ? r.json() : [])),
          fetch('/api/admin/roles').then(r => (r.ok ? r.json() : [])),
          hydrateBusinessData(),
        ]);

        if (!mounted) return;
        setEmployees(empData || []);
        setRoles(roleData || []);
        setRealUser(me.realUser);
        setCurrentUser(me.user);
        applyUserToWindow(me.user, roleData || []);
      } catch (err) {
        console.error('Error initializing Fusion auth', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [applyUserToWindow]);

  // Si la sesión expira mientras se usa la aplicación, volver a pedir inicio de sesión
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].pathname : args[0].url;
      if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/') && !isPublicPath(window.location.pathname)) {
        setNeedsLogin(true);
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const handleEmployeesUpdated = () => {
      refreshEmployees(true);
    };
    window.addEventListener('fusion_employees_updated', handleEmployeesUpdated);
    return () => window.removeEventListener('fusion_employees_updated', handleEmployeesUpdated);
  }, [refreshEmployees]);

  const impersonateUser = useCallback(async (user: FusionEmployee) => {
    const res = await fetch('/api/admin/current-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    });
    if (!res.ok) {
      console.warn('El servidor rechazó el cambio de usuario simulado', res.status);
      return;
    }
    setCurrentUser(user);
    applyUserToWindow(user, roles);
  }, [applyUserToWindow, roles]);

  const revertToSuperAdmin = useCallback(async () => {
    if (realUser) {
      await impersonateUser(realUser);
    }
  }, [realUser, impersonateUser]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }, []);

  const permanentSuperUser = realUser && isAdminRoleKey(realUser.roleKey) ? realUser : null;
  const canImpersonate = !!permanentSuperUser;

  const canSeeModule = useCallback((moduleKey: FusionModuleKey): boolean => {
    if (!currentUser) return true;
    if (
      currentUser.roleKey === 'super_admin' ||
      currentUser.roleKey === 'admin' ||
      currentUser.id === PERMANENT_SUPER_USER_ID ||
      (typeof currentUser.email === 'string' && currentUser.email.toLowerCase().includes('andresepulveda718'))
    ) {
      return true;
    }
    return canAccessModule(currentUser, moduleKey);
  }, [currentUser]);

  const isSuperAdmin =
    currentUser?.roleKey === 'super_admin' ||
    currentUser?.roleKey === 'admin' ||
    currentUser?.id === PERMANENT_SUPER_USER_ID ||
    (typeof currentUser?.email === 'string' && currentUser.email.toLowerCase().includes('andresepulveda718'));
  const isImpersonating = !!realUser && !!currentUser && currentUser.id !== realUser.id;

  if (!isPublicPath(typeof window !== 'undefined' ? window.location.pathname : '/')) {
    if (needsLogin) return <LoginScreen />;
    if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
    }
  }

  return (
    <FusionAuthContext.Provider
      value={{
        currentUser,
        realUser,
        permanentSuperUser,
        canImpersonate,
        logout,
        employees,
        roles,
        isLoading,
        isSuperAdmin,
        isImpersonating,
        impersonateUser,
        revertToSuperAdmin,
        refreshEmployees,
        refreshRoles,
        canSeeModule,
      }}
    >
      {children}
    </FusionAuthContext.Provider>
  );
};

export function useFusionAuth() {
  const context = useContext(FusionAuthContext);
  if (!context) {
    throw new Error('useFusionAuth must be used within a FusionAuthProvider');
  }
  return context;
}
