import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { canAccessModule, FusionModuleKey, SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../packages/core/src/auth/permissions';

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
  permanentSuperUser: FusionEmployee | null;
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

const LOCAL_STORAGE_USER_KEY = 'fusion_active_user_id';

export const FusionAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<FusionEmployee[]>([]);
  const [roles, setRoles] = useState<FusionRole[]>([]);
  const [currentUser, setCurrentUser] = useState<FusionEmployee | null>(null);
  const [permanentSuperUser, setPermanentSuperUser] = useState<FusionEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Initial loading
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      try {
        const [empData, roleData] = await Promise.all([
          fetch('/api/admin/users').then(r => r.json()),
          fetch('/api/admin/roles').then(r => r.json()),
        ]);

        if (!mounted) return;
        setEmployees(empData || []);
        setRoles(roleData || []);

        // Cristian Andrés Sepúlveda es el Super Usuario permanente
        const permanent =
          (empData || []).find(
            (e: FusionEmployee) =>
              e.id === PERMANENT_SUPER_USER_ID ||
              e.email === 'andresepulveda718@gmail.com' ||
              (e.name && e.name.toLowerCase().includes('cristian andrés sepúlveda'))
          ) ||
          (empData || []).find((e: FusionEmployee) => e.roleKey === 'super_admin') ||
          (empData || [])[0];

        setPermanentSuperUser(permanent || null);

        // Retrieve stored user ID (for impersonation/simulation)
        const storedId = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        let selected = (empData || []).find((e: FusionEmployee) => e.id === storedId);

        // Default to permanent super user
        if (!selected) {
          selected = permanent;
        }

        if (selected) {
          setCurrentUser(selected);
          applyUserToWindow(selected, roleData || []);
        }
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

  useEffect(() => {
    const handleEmployeesUpdated = () => {
      refreshEmployees(true);
    };
    window.addEventListener('fusion_employees_updated', handleEmployeesUpdated);
    return () => window.removeEventListener('fusion_employees_updated', handleEmployeesUpdated);
  }, [refreshEmployees]);

  const impersonateUser = useCallback(async (user: FusionEmployee) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, user.id);
    applyUserToWindow(user, roles);

    try {
      await fetch('/api/admin/current-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
    } catch (e) {
      console.warn('Could not notify backend of active user change', e);
    }
  }, [applyUserToWindow, roles]);

  const revertToSuperAdmin = useCallback(async () => {
    const admin =
      employees.find((e) => e.id === PERMANENT_SUPER_USER_ID) ||
      employees.find((e) => e.email === 'andresepulveda718@gmail.com') ||
      employees.find((e) => e.roleKey === 'super_admin');
    if (admin) {
      await impersonateUser(admin);
    }
  }, [employees, impersonateUser]);

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
  const isImpersonating = !isSuperAdmin;

  return (
    <FusionAuthContext.Provider
      value={{
        currentUser,
        permanentSuperUser,
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
