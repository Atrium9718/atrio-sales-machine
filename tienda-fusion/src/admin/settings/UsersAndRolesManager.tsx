import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Key, Lock, UserPlus, Search, Filter, CheckCircle2, 
  AlertCircle, ShieldAlert, ShieldCheck, RefreshCw, MoreVertical, Edit2, 
  Trash2, Copy, Check, Eye, EyeOff, FileText, ChevronRight, UserCheck, 
  UserX, Smartphone, Globe, Clock, History, Sliders, CheckSquare, 
  Square, AlertTriangle, ArrowUpRight, Mail, Phone, Building, Sparkles,
  Layers, Download, LogIn
} from 'lucide-react';
import { SystemUser, RoleDefinition, AuditLog, SecuritySettings, UserRoleKey, UserStatus } from '../../backend/users/users.types';
import { PERMISSION_MODULES } from '../../backend/users/permissions.data';
import { INITIAL_DEFAULT_ROLES } from '../../backend/users/users.defaults';

export default function UsersAndRolesManager() {
  const [subTab, setSubTab] = useState<'users' | 'roles' | 'audit' | 'security'>('users');
  
  // Data states
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [rolesList, setRolesList] = useState<RoleDefinition[]>(INITIAL_DEFAULT_ROLES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    passwordMinLength: 10,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    sessionTimeoutMinutes: 60,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    enforce2FAForAdmins: true,
    allowDomainRestrictedSignups: true,
    allowedDomains: ['fusiongrafica.com.co', 'fusion.com']
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    admins: 0,
    productionAndDesign: 0,
    logisticsAndSales: 0
  });

  // UI & Filter states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('ALL');

  // RBAC Selection
  const [selectedRoleKey, setSelectedRoleKey] = useState<UserRoleKey>('ADMIN');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Modals & Feedback
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Temporary password display modal
  const [tempPassModal, setTempPassModal] = useState<{ isOpen: boolean; email: string; pass: string; name: string } | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);

  // Role Creation / Edit Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isResettingDefaults, setIsResettingDefaults] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    key: '',
    description: '',
    level: 3,
    color: 'teal',
    permissions: ['catalog:view', 'orders:view'] as string[]
  });

  // Form State for User Creation / Edit
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Taller Litográfico & CTP',
    role: 'PREPRESS_DESIGNER' as UserRoleKey,
    status: 'active' as UserStatus,
    twoFactorEnabled: false,
    notes: '',
    sendInvitationEmail: true
  });

  // Load initial data
  const loadUsersAndStats = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (roleFilter !== 'ALL') queryParams.append('role', roleFilter);
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/users/rbac/roles');
      if (res.ok) {
        const data = await res.json();
        setRolesList(data.roles || []);
        const currentRole = data.roles?.find((r: RoleDefinition) => r.key === selectedRoleKey);
        if (currentRole) {
          setEditingPermissions(currentRole.permissions || []);
        }
      }
    } catch (e) {
      console.error('Error al cargar roles:', e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditCategoryFilter !== 'ALL') params.append('category', auditCategoryFilter);
      if (auditSeverityFilter !== 'ALL') params.append('severity', auditSeverityFilter);
      params.append('limit', '80');

      const res = await fetch(`/api/admin/users/audit/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch (e) {
      console.error('Error al cargar logs de auditoría:', e);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const res = await fetch('/api/admin/users/security/settings');
      if (res.ok) {
        const data = await res.json();
        setSecuritySettings(data);
      }
    } catch (e) {
      console.error('Error al cargar políticas de seguridad:', e);
    }
  };

  useEffect(() => {
    loadUsersAndStats();
    loadRoles();
    loadAuditLogs();
    loadSecuritySettings();
  }, []);

  useEffect(() => {
    loadUsersAndStats();
  }, [roleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (subTab === 'audit') {
      loadAuditLogs();
    }
  }, [subTab, auditCategoryFilter, auditSeverityFilter]);

  // When role selection changes in RBAC tab
  const handleSelectRole = (roleKey: UserRoleKey) => {
    setSelectedRoleKey(roleKey);
    const r = rolesList.find(role => role.key === roleKey);
    if (r) {
      setEditingPermissions([...r.permissions]);
    }
  };

  const togglePermission = (permKey: string) => {
    if (editingPermissions.includes(permKey)) {
      setEditingPermissions(editingPermissions.filter(p => p !== permKey));
    } else {
      setEditingPermissions([...editingPermissions, permKey]);
    }
  };

  const toggleAllModulePermissions = (modulePerms: { key: string }[], selectAll: boolean) => {
    const keys = modulePerms.map(p => p.key);
    if (selectAll) {
      const combined = Array.from(new Set([...editingPermissions, ...keys]));
      setEditingPermissions(combined);
    } else {
      setEditingPermissions(editingPermissions.filter(p => !keys.includes(p)));
    }
  };

  const handleSaveRolePermissions = async () => {
    try {
      setIsSavingPermissions(true);
      const res = await fetch(`/api/admin/users/rbac/roles/${selectedRoleKey}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions })
      });

      if (res.ok) {
        const updatedRole = await res.json();
        setRolesList(rolesList.map(r => r.key === selectedRoleKey ? updatedRole : r));
        showNotification('success', `Permisos del rol ${updatedRole.name} actualizados exitosamente`);
      } else {
        showNotification('error', 'Error al guardar los permisos del rol');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error de conexión');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotificationMsg({ type, message });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Open modal for creating a new role
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      key: '',
      description: '',
      level: 3,
      color: 'teal',
      permissions: ['catalog:view', 'orders:view']
    });
    setIsRoleModalOpen(true);
  };

  // Open modal for editing an existing role
  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      key: role.key,
      description: role.description,
      level: role.level,
      color: role.color || 'teal',
      permissions: [...role.permissions]
    });
    setIsRoleModalOpen(true);
  };

  // Save role (Create or Update)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) {
      showNotification('error', 'El nombre del rol es obligatorio');
      return;
    }

    try {
      setIsSavingRole(true);
      if (editingRole) {
        // Update existing role
        const res = await fetch(`/api/admin/users/rbac/roles/${editingRole.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleFormData.name,
            description: roleFormData.description,
            level: Number(roleFormData.level),
            color: roleFormData.color,
            permissions: roleFormData.permissions
          })
        });

        if (res.ok) {
          const updated = await res.json();
          setRolesList(rolesList.map(r => r.key === updated.key ? updated : r));
          if (selectedRoleKey === updated.key) {
            setEditingPermissions([...updated.permissions]);
          }
          showNotification('success', `Rol '${updated.name}' actualizado exitosamente`);
          setIsRoleModalOpen(false);
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al actualizar el rol');
        }
      } else {
        // Create new role
        const res = await fetch('/api/admin/users/rbac/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleFormData)
        });

        if (res.ok) {
          const created = await res.json();
          setRolesList([...rolesList, created]);
          setSelectedRoleKey(created.key);
          setEditingPermissions([...created.permissions]);
          showNotification('success', `Rol '${created.name}' (${created.key}) creado exitosamente`);
          setIsRoleModalOpen(false);
          loadRoles();
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al crear el rol');
        }
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error de conexión');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Delete custom role
  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.isSystem || role.key === 'SUPER_ADMIN' || role.key === 'ADMIN') {
      showNotification('error', 'Los roles predeterminados del sistema no pueden eliminarse');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar permanentemente el rol '${role.name}' (${role.key})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/rbac/roles/${role.key}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('success', `Rol '${role.name}' eliminado exitosamente`);
        setRolesList(rolesList.filter(r => r.key !== role.key));
        if (selectedRoleKey === role.key) {
          setSelectedRoleKey('ADMIN');
          const adminRole = rolesList.find(r => r.key === 'ADMIN');
          if (adminRole) setEditingPermissions([...adminRole.permissions]);
        }
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'No se pudo eliminar el rol');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error al procesar la eliminación');
    }
  };

  // Reset / Sync 5+ Default Profiles
  const handleResetDefaults = async () => {
    if (!window.confirm('¿Deseas cargar y sincronizar los perfiles predeterminados con Andrés Sepúlveda (andresepulveda718@gmail.com) como Super Usuario?')) {
      return;
    }

    try {
      setIsResettingDefaults(true);
      const res = await fetch('/api/admin/users/reset-defaults', {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('success', data.message || 'Perfiles predeterminados cargados exitosamente');
        await loadUsersAndStats();
        await loadRoles();
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'Error al sincronizar perfiles');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error de conexión');
    } finally {
      setIsResettingDefaults(false);
    }
  };

  // Open modal for new user
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '+57 ',
      department: 'Taller Litográfico & CTP',
      role: 'PREPRESS_DESIGNER',
      status: 'active',
      twoFactorEnabled: false,
      notes: '',
      sendInvitationEmail: true
    });
    setIsUserModalOpen(true);
  };

  // Open modal for editing user
  const handleOpenEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      department: u.department,
      role: u.role,
      status: u.status,
      twoFactorEnabled: u.twoFactorEnabled,
      notes: u.notes || '',
      sendInvitationEmail: false
    });
    setIsUserModalOpen(true);
  };

  // Save (Create or Update) User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      showNotification('error', 'Nombre y Correo Electrónico son obligatorios');
      return;
    }

    try {
      setIsSavingUser(true);
      if (editingUser) {
        // Update
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });

        if (res.ok) {
          showNotification('success', `Usuario ${userFormData.name} actualizado correctamente`);
          setIsUserModalOpen(false);
          loadUsersAndStats();
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al actualizar usuario');
        }
      } else {
        // Create
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });

        if (res.ok) {
          const data = await res.json();
          setIsUserModalOpen(false);
          loadUsersAndStats();
          
          if (data.temporaryPassword) {
            setTempPassModal({
              isOpen: true,
              email: data.user.email,
              name: data.user.name,
              pass: data.temporaryPassword
            });
          } else {
            showNotification('success', `Usuario ${data.user.name} creado exitosamente`);
          }
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al crear usuario');
        }
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error al procesar la solicitud');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: SystemUser) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle-status`, {
        method: 'POST'
      });

      if (res.ok) {
        const updated = await res.json();
        showNotification('success', `Estado de ${user.name} cambiado a: ${updated.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}`);
        loadUsersAndStats();
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'No se pudo cambiar el estado');
      }
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  // Reset password
  const handleResetPassword = async (user: SystemUser) => {
    if (!window.confirm(`¿Generar nueva clave de acceso temporal para ${user.name} (${user.email})?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setTempPassModal({
          isOpen: true,
          email: user.email,
          name: user.name,
          pass: data.tempPass
        });
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'Error al restablecer contraseña');
      }
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: SystemUser) => {
    if (!window.confirm(`¿Estás completamente seguro de eliminar permanentemente al usuario ${user.name} (${user.email})?\n\nEsta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('success', `Usuario ${user.name} eliminado del sistema`);
        loadUsersAndStats();
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'No se pudo eliminar el usuario');
      }
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  // Save security policies
  const handleSaveSecuritySettings = async () => {
    try {
      const res = await fetch('/api/admin/users/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings)
      });

      if (res.ok) {
        showNotification('success', 'Políticas globales de seguridad y control de acceso actualizadas');
      } else {
        showNotification('error', 'Error al guardar las políticas de seguridad');
      }
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  const getRoleBadge = (roleKey: UserRoleKey) => {
    const role = rolesList.find(r => r.key === roleKey);
    if (!role) return <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">{roleKey}</span>;

    const colorMap: Record<string, string> = {
      teal: 'bg-teal-50 text-teal-800 border-teal-200',
      purple: 'bg-purple-50 text-purple-800 border-purple-200',
      orange: 'bg-orange-50 text-orange-800 border-orange-200',
      blue: 'bg-blue-50 text-blue-800 border-blue-200',
      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      amber: 'bg-amber-50 text-amber-800 border-amber-200',
      indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
      <span className={`text-[11px] font-black tracking-wide uppercase px-2.5 py-1 rounded-xl border ${colorMap[role.color] || colorMap.slate} inline-flex items-center gap-1.5`}>
        {roleKey === 'SUPER_ADMIN' && <ShieldAlert size={12} className="text-teal-700" />}
        {roleKey === 'ADMIN' && <Shield size={12} className="text-purple-700" />}
        {role.name}
      </span>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Activo
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Suspendido
          </span>
        );
      case 'pending_invitation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Invitación Pendiente
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Bloqueado por Seguridad
          </span>
        );
    }
  };

  const currentSelectedRoleDef = rolesList.find(r => r.key === selectedRoleKey);

  return (
    <div className="space-y-6">

      {/* Banner de Notificación */}
      {notificationMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
          notificationMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-rose-600 shrink-0" size={20} />
            )}
            <p className="text-xs font-bold">{notificationMsg.message}</p>
          </div>
          <button 
            onClick={() => setNotificationMsg(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Banner de Estado del Super Usuario */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white shadow-sm border border-teal-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-400">Super Usuario Activo:</span>
              <span className="text-xs font-extrabold text-white">andresepulveda718@gmail.com</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/30 border border-teal-400/40 text-teal-200 text-[10px] font-black">
                SUPER_ADMIN (Permanente)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Acceso total sin restricciones a todos los módulos litográficos, pasarelas de pago, transportadoras Skydropx y gestión de roles.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResettingDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-bold border border-teal-500/50 transition-colors shadow-xs"
            title="Recargar perfiles operativos predeterminados"
          >
            {isResettingDefaults ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Sincronizar Roles Base</span>
          </button>
        </div>
      </div>

      {/* Header Principal del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestión de Usuarios, Roles & Seguridad</h2>
              <p className="text-xs text-slate-500">Control de acceso granular (RBAC), directivas de seguridad y registro de auditoría</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              loadUsersAndStats();
              loadRoles();
              loadAuditLogs();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Sincronizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button 
            onClick={handleOpenCreateRole}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition-all shadow-2xs"
          >
            <Shield size={14} className="text-teal-700" />
            <span>Crear Rol</span>
          </button>

          <button 
            onClick={handleOpenCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <UserPlus size={15} />
            <span>Crear / Invitar Usuario</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Usuarios Totales</span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
            <CheckCircle2 size={11} /> {stats.active} activos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Administradores</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900">{stats.admins}</p>
          <span className="text-[10px] text-purple-600 font-bold mt-1 block">Acceso nivel directivo</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Taller & Preprensa CTP</span>
            <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-orange-950">{stats.productionAndDesign}</p>
          <span className="text-[10px] text-orange-600 font-bold mt-1 block">Operadores de planta</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Logística & Ventas</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950">{stats.logisticsAndSales}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Despachos & Comercial</span>
        </div>
      </div>

      {/* Sub-Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            subTab === 'users' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={15} />
          <span>Directorio de Usuarios ({stats.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            subTab === 'roles' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield size={15} />
          <span>Roles & Matriz de Permisos (RBAC)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            subTab === 'audit' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History size={15} />
          <span>Logs de Auditoría & Accesos</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            subTab === 'security' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock size={15} />
          <span>Políticas de Seguridad</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-TAB: DIRECTORIO DE USUARIOS */}
      {/* ========================================================================= */}
      {subTab === 'users' && (
        <div className="space-y-4">
          
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, correo institucional o departamento..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos los Roles ({rolesList.length})</option>
                {rolesList.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Suspendidos</option>
                <option value="pending_invitation">Invitaciones Pendientes</option>
                <option value="blocked">Bloqueados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Usuario / Colaborador</th>
                    <th className="py-3.5 px-4">Rol Asignado</th>
                    <th className="py-3.5 px-4">Departamento</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">2FA</th>
                    <th className="py-3.5 px-4">Último Acceso</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="font-bold text-sm text-slate-600">No se encontraron usuarios</p>
                        <p className="text-xs text-slate-400 mt-0.5">Prueba ajustando los filtros de búsqueda</p>
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Usuario */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs"
                              style={{ backgroundColor: user.avatarColor || '#0d9488' }}
                            >
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.email === 'andresepulveda718@gmail.com' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold">PROPIETARIO</span>
                                )}
                              </div>
                              <span className="text-slate-500 font-mono text-[11px] block">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td className="py-3.5 px-4">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* Departamento */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-700">{user.department}</span>
                          {user.phone && (
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{user.phone}</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(user.status)}
                        </td>

                        {/* 2FA */}
                        <td className="py-3.5 px-4">
                          {user.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700" title="Autenticación en Dos Pasos Activada">
                              <ShieldCheck size={14} className="text-teal-600" />
                              <span>2FA On</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium" title="2FA no activado">
                              Off
                            </span>
                          )}
                        </td>

                        {/* Último Acceso */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-600 font-medium text-[11px]">
                            {user.lastLogin === 'Nunca' ? (
                              <span className="text-slate-400 italic">Nunca</span>
                            ) : (
                              <>
                                <span>{new Date(user.lastLogin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{user.lastIp}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Editar Usuario y Rol"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetPassword(user)}
                              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-800 transition-colors"
                              title="Generar nueva clave de acceso"
                            >
                              <Key size={14} />
                            </button>

                            {user.email !== 'andresepulveda718@gmail.com' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(user)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    user.status === 'active' 
                                      ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-700' 
                                      : 'hover:bg-emerald-100 text-emerald-600'
                                  }`}
                                  title={user.status === 'active' ? 'Suspender acceso' : 'Activar usuario'}
                                >
                                  {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition-colors"
                                  title="Eliminar usuario permanentemente"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: ROLES & MATRIZ DE PERMISOS (RBAC) */}
      {/* ========================================================================= */}
      {subTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Lista de Roles */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Roles ({rolesList.length})</h3>
              <button
                type="button"
                onClick={handleOpenCreateRole}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all"
              >
                <UserPlus size={13} />
                <span>+ Crear Rol</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {rolesList.map((role) => {
                const isSelected = selectedRoleKey === role.key;
                return (
                  <div
                    key={role.key}
                    onClick={() => handleSelectRole(role.key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-300 shadow-xs ring-1 ring-teal-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm">{role.name}</span>
                        {role.isSystem ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Sistema</span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">Personalizado</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        Nivel {role.level}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{role.description}</p>
                    
                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
                      <span className="font-bold text-teal-800 flex items-center gap-1">
                        <CheckSquare size={12} /> {role.permissions.length} permisos activos
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[10px]">{role.key}</span>
                        {!role.isSystem && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(role)}
                              className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors"
                              title="Editar rol"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Eliminar rol"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Matriz Interactiva de Permisos para el Rol Seleccionado */}
          <div className="lg:col-span-8 space-y-5">
            {currentSelectedRoleDef && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
                
                {/* Header del Rol Seleccionado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900">{currentSelectedRoleDef.name}</span>
                      {getRoleBadge(currentSelectedRoleDef.key)}
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                        Nivel {currentSelectedRoleDef.level}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{currentSelectedRoleDef.description}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!currentSelectedRoleDef.isSystem && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditRole(currentSelectedRoleDef)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs"
                        >
                          <Edit2 size={13} />
                          <span>Editar Rol</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(currentSelectedRoleDef)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar Rol</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveRolePermissions}
                      disabled={isSavingPermissions || currentSelectedRoleDef.key === 'SUPER_ADMIN'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingPermissions ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Guardar Permisos
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {currentSelectedRoleDef.key === 'SUPER_ADMIN' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                    <span>El <strong>Super Administrador</strong> posee acceso absoluto y permanente a todos los módulos y acciones del sistema por directiva de seguridad.</span>
                  </div>
                )}

                {/* Módulos de Permisos */}
                <div className="space-y-4">
                  {PERMISSION_MODULES.map((module) => {
                    const allSelected = module.permissions.every(p => editingPermissions.includes(p.key));
                    const someSelected = module.permissions.some(p => editingPermissions.includes(p.key));

                    return (
                      <div key={module.moduleId} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                              {module.moduleName}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{module.description}</p>
                          </div>

                          {currentSelectedRoleDef.key !== 'SUPER_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(module.permissions, !allSelected)}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              {allSelected ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {module.permissions.map((perm) => {
                            const isChecked = editingPermissions.includes(perm.key) || currentSelectedRoleDef.key === 'SUPER_ADMIN';

                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isChecked 
                                    ? 'bg-teal-50/50 border-teal-200 text-slate-900' 
                                    : 'bg-white border-slate-200/80 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={currentSelectedRoleDef.key === 'SUPER_ADMIN'}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <div className="text-left">
                                  <span className="font-bold text-xs block text-slate-800">{perm.label}</span>
                                  <span className="text-[10px] text-slate-500 leading-tight block">{perm.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: LOGS DE AUDITORÍA & ACCESOS */}
      {/* ========================================================================= */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filtro de Eventos:</span>
              
              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="auth">Autenticación & Accesos</option>
                <option value="users">Gestión de Usuarios</option>
                <option value="roles">Roles & Permisos</option>
                <option value="security">Políticas de Seguridad</option>
                <option value="shipping">Logística & Skydropx</option>
                <option value="config">Configuraciones</option>
              </select>

              <select
                value={auditSeverityFilter}
                onChange={(e) => setAuditSeverityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas las Severidades</option>
                <option value="info">Informativo (Info)</option>
                <option value="warning">Advertencia (Warning)</option>
                <option value="critical">Crítico (Critical)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                  const dlAnchor = document.createElement('a');
                  dlAnchor.setAttribute("href", dataStr);
                  dlAnchor.setAttribute("download", `audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
                  dlAnchor.click();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Download size={13} /> Exportar JSON
              </button>
            </div>
          </div>

          {/* Tabla de Logs */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Fecha & Hora</th>
                    <th className="py-3.5 px-4">Severidad</th>
                    <th className="py-3.5 px-4">Acción Realizada</th>
                    <th className="py-3.5 px-4">Usuario / Actor</th>
                    <th className="py-3.5 px-4">Detalles Técnicos</th>
                    <th className="py-3.5 px-4 text-right">Dirección IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                        No hay registros de auditoría que coincidan con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Fecha */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('es-CO', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>

                        {/* Severidad */}
                        <td className="py-3 px-4">
                          {log.severity === 'critical' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black uppercase">Crítico</span>
                          )}
                          {log.severity === 'warning' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">Alerta</span>
                          )}
                          {log.severity === 'info' && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">Info</span>
                          )}
                        </td>

                        {/* Acción */}
                        <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {log.action}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                          {log.userEmail}
                        </td>

                        {/* Detalles */}
                        <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>

                        {/* IP */}
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.ip}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB: POLÍTICAS DE SEGURIDAD */}
      {/* ========================================================================= */}
      {subTab === 'security' && (
        <div className="space-y-6 max-w-4xl">
          
          {/* Directivas de Contraseñas */}
          <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Políticas de Robustez de Contraseñas</h3>
                <p className="text-xs text-slate-500">Reglas aplicadas a colaboradores al crear o cambiar sus claves de acceso</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitud Mínima de Contraseña</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    min={8}
                    max={32}
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value, 10) || 8 })}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">caracteres mínimos (Recomendado: 10)</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={securitySettings.requireSpecialChars}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Requerir símbolos especiales (!@#$%^&*)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={securitySettings.requireNumbers}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Requerir al menos un número (0-9)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={securitySettings.requireUppercase}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Requerir letras mayúsculas y minúsculas</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sesiones y Control de Fuerza Bruta */}
          <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-black">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Sesiones & Protección contra Ataques de Fuerza Bruta</h3>
                <p className="text-xs text-slate-500">Límites de inactividad y bloqueo automático ante intentos fallidos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiempo de Expiración de Sesión</label>
                <select
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value={15}>15 minutos de inactividad</option>
                  <option value={30}>30 minutos de inactividad</option>
                  <option value={60}>1 hora de inactividad</option>
                  <option value={240}>4 horas de inactividad</option>
                  <option value={480}>8 horas (Jornada laboral)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Intentos Fallidos antes de Bloqueo</label>
                <select
                  value={securitySettings.maxFailedLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxFailedLoginAttempts: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value={3}>3 intentos fallidos (Máxima seguridad)</option>
                  <option value={5}>5 intentos fallidos (Recomendado)</option>
                  <option value={10}>10 intentos fallidos</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={securitySettings.enforce2FAForAdmins}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, enforce2FAForAdmins: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">Exigir Autenticación en Dos Pasos (2FA) para Roles Administrativos</span>
                  <span className="text-[11px] text-slate-500">Obliga a Super Administradores y Administradores a validar su identidad con token móvil o Google Auth.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Botón para Guardar Políticas */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveSecuritySettings}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 text-xs"
            >
              <Lock size={15} /> Guardar Políticas de Seguridad
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR USUARIO */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingUser ? `Editar Usuario: ${editingUser.name}` : 'Crear / Invitar Nuevo Colaborador'}
                </h3>
                <p className="text-xs text-slate-500">Asigna datos de contacto, departamento y rol de seguridad</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input 
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="Ej. Valentina Morales"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico Institucional *</label>
                  <input 
                    type="email"
                    required
                    disabled={Boolean(editingUser)}
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="usuario@fusiongrafica.com.co"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input 
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+57 311 458 9231"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Departamento / Área</label>
                  <select
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Dirección General & Tecnología">Dirección General & Tecnología</option>
                    <option value="Gerencia Operativa">Gerencia Operativa</option>
                    <option value="Taller Litográfico & CTP">Taller Litográfico & CTP</option>
                    <option value="Preprensa & Diseño Gráfico">Preprensa & Diseño Gráfico</option>
                    <option value="Logística & Envíos Skydropx">Logística & Envíos Skydropx</option>
                    <option value="Ventas Corporativas & B2B">Ventas Corporativas & B2B</option>
                    <option value="Contabilidad & Facturación DIAN">Contabilidad & Facturación DIAN</option>
                    <option value="Atención al Cliente">Atención al Cliente</option>
                  </select>
                </div>
              </div>

              {/* Rol Asignado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol de Seguridad y Permisos *</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRoleKey })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  {rolesList.map(r => (
                    <option key={r.key} value={r.key}>
                      {r.name} (Nivel {r.level}/10)
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {rolesList.find(r => r.key === userFormData.role)?.description}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado de la Cuenta</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as UserStatus })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="active">Activo (Permitir inicio de sesión)</option>
                    <option value="inactive">Inactivo / Suspendido</option>
                    <option value="pending_invitation">Invitación Pendiente</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={userFormData.twoFactorEnabled}
                      onChange={(e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Activar 2FA para este usuario</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas Internas</label>
                <textarea 
                  rows={2}
                  value={userFormData.notes}
                  onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                  placeholder="Información sobre funciones específicas o credenciales..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  {isSavingUser ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONTRASEÑA TEMPORAL GENERADA */}
      {/* ========================================================================= */}
      {tempPassModal && tempPassModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black mx-auto mb-3">
              <Key size={24} />
            </div>

            <h3 className="text-base font-black text-slate-900 text-center">Clave Temporal de Acceso Generada</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Comparte estas credenciales seguras con <strong>{tempPassModal.name}</strong> para su primer ingreso al sistema:
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Usuario / Correo:</span>
                <p className="text-xs font-mono font-bold text-slate-800 select-all">{tempPassModal.email}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Contraseña Temporal:</span>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-black text-teal-700 select-all tracking-wider">{tempPassModal.pass}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Usuario: ${tempPassModal.email}\nContraseña: ${tempPassModal.pass}`);
                      setCopiedTempPass(true);
                      setTimeout(() => setCopiedTempPass(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {copiedTempPass ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
                    <span>{copiedTempPass ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              El usuario deberá cambiar esta clave temporal en su primer inicio de sesión de acuerdo con las políticas de seguridad.
            </div>

            <button
              type="button"
              onClick={() => setTempPassModal(null)}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Entendido y Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR ROL PERSONALIZADO */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol Personalizado'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define la jerarquía, distintivo visual y permisos base del perfil
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 overflow-y-auto pr-1 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Rol *</label>
                  <input 
                    type="text"
                    required
                    value={roleFormData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoKey = name.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
                      setRoleFormData({
                        ...roleFormData,
                        name,
                        key: editingRole ? roleFormData.key : autoKey
                      });
                    }}
                    placeholder="Ej. Operador Offset Heidelberg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clave Identificadora (Key) *</label>
                  <input 
                    type="text"
                    required
                    disabled={!!editingRole}
                    value={roleFormData.key}
                    onChange={(e) => setRoleFormData({ ...roleFormData, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    placeholder="Ej. OFFSET_OPERATOR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white disabled:opacity-60"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Identificador único en mayúsculas usado en el backend</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nivel Jerárquico: <span className="text-teal-700 font-extrabold">{roleFormData.level} / 9</span>
                  </label>
                  <input 
                    type="range"
                    min={1}
                    max={9}
                    step={1}
                    value={roleFormData.level}
                    onChange={(e) => setRoleFormData({ ...roleFormData, level: parseInt(e.target.value, 10) })}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                    <span>1: Básico</span>
                    <span>5: Operativo</span>
                    <span>9: Directivo</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Color Distintivo del Badge</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { key: 'teal', label: 'Teal', bg: 'bg-teal-500' },
                      { key: 'purple', label: 'Morado', bg: 'bg-purple-500' },
                      { key: 'orange', label: 'Naranja', bg: 'bg-orange-500' },
                      { key: 'blue', label: 'Azul', bg: 'bg-blue-500' },
                      { key: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500' },
                      { key: 'amber', label: 'Ámbar', bg: 'bg-amber-500' },
                      { key: 'indigo', label: 'Índigo', bg: 'bg-indigo-500' },
                      { key: 'cyan', label: 'Cian', bg: 'bg-cyan-500' },
                      { key: 'slate', label: 'Gris', bg: 'bg-slate-500' },
                    ].map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setRoleFormData({ ...roleFormData, color: c.key })}
                        className={`w-6 h-6 rounded-full ${c.bg} transition-all flex items-center justify-center ${
                          roleFormData.color === c.key ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.label}
                      >
                        {roleFormData.color === c.key && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción de Funciones & Responsabilidades</label>
                <textarea 
                  rows={2}
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Describe las tareas y permisos que desempeñan los usuarios con este rol..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              {/* Selector de Permisos Iniciales */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Permisos Asignados ({roleFormData.permissions.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">Marca las capacidades que tendrá este rol:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allPermKeys = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));
                        setRoleFormData({ ...roleFormData, permissions: allPermKeys });
                      }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFormData({ ...roleFormData, permissions: [] })}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module.moduleId} className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                      <span className="text-[11px] font-extrabold text-slate-900 block mb-1.5">{module.moduleName}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {module.permissions.map((p) => {
                          const checked = roleFormData.permissions.includes(p.key);
                          return (
                            <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                              <input 
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleFormData({
                                      ...roleFormData,
                                      permissions: [...roleFormData.permissions, p.key]
                                    });
                                  } else {
                                    setRoleFormData({
                                      ...roleFormData,
                                      permissions: roleFormData.permissions.filter(k => k !== p.key)
                                    });
                                  }
                                }}
                                className="rounded text-teal-600 focus:ring-teal-500 text-xs"
                              />
                              <span className="truncate" title={p.description}>{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  {isSavingRole ? 'Guardando...' : editingRole ? 'Guardar Cambios' : 'Crear y Activar Rol'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
