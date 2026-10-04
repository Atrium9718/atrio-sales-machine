import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRoleKey } from '../backend/users/users.types';
import { INITIAL_DEFAULT_ROLES } from '../backend/users/users.defaults';

export interface UserRolePermissionState {
  currentRole: UserRoleKey;
  roleName: string;
  isSuperAdmin: boolean;
  canPublishCms: boolean;
  canEditCmsDraft: boolean;
  canManageVersions: boolean;
  canDeleteCms: boolean;
  canManageCatalog: boolean;
  canManagePricing: boolean;
  canManageUsers: boolean;
  hasPermission: (permissionKey: string) => boolean;
  switchSimulatedRole: (role: UserRoleKey) => void;
}

export function useRbac(): UserRolePermissionState {
  const { user, isAdmin } = useAuth();
  
  const [currentRole, setCurrentRole] = useState<UserRoleKey>(() => {
    try {
      const saved = localStorage.getItem('fusion_active_simulated_role');
      if (saved) return saved as UserRoleKey;
    } catch {}
    return 'SUPER_ADMIN';
  });

  const switchSimulatedRole = (newRole: UserRoleKey) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem('fusion_active_simulated_role', newRole);
      window.dispatchEvent(new Event('fusion_role_changed'));
    } catch {}
  };

  useEffect(() => {
    const handleRoleChanged = () => {
      try {
        const saved = localStorage.getItem('fusion_active_simulated_role');
        if (saved) setCurrentRole(saved as UserRoleKey);
      } catch {}
    };

    window.addEventListener('fusion_role_changed', handleRoleChanged);
    return () => window.removeEventListener('fusion_role_changed', handleRoleChanged);
  }, []);

  const roleDef = INITIAL_DEFAULT_ROLES.find(r => r.key === currentRole) || INITIAL_DEFAULT_ROLES[0];
  const permissions = roleDef.permissions || [];

  const hasPermission = (permissionKey: string): boolean => {
    if (currentRole === 'SUPER_ADMIN') return true;
    return permissions.includes(permissionKey);
  };

  return {
    currentRole,
    roleName: roleDef.name,
    isSuperAdmin: currentRole === 'SUPER_ADMIN',
    canPublishCms: hasPermission('cms:publish'),
    canEditCmsDraft: hasPermission('cms:edit_draft'),
    canManageVersions: hasPermission('cms:manage_versions'),
    canDeleteCms: hasPermission('cms:delete'),
    canManageCatalog: hasPermission('catalog:edit'),
    canManagePricing: hasPermission('pricing:edit'),
    canManageUsers: hasPermission('users:manage_roles'),
    hasPermission,
    switchSimulatedRole,
  };
}
