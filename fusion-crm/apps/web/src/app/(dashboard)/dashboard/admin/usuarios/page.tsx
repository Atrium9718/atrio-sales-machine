import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  Eye,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Lock,
  Unlock,
  Check,
  Building,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { useFusionAuth, FusionEmployee, FusionRole } from '@/context/FusionAuthContext';
import { useEmployeesQuery } from '@/hooks/useDomainQueries';
import { FUSION_MODULES_CATALOG, FusionModuleKey, canAccessModule } from '@fusion/core/src/auth/permissions';
import { Link } from 'react-router-dom';

export default function UsuariosPage() {
  const { currentUser, employees: authEmployees, roles, refreshEmployees, refreshRoles, impersonateUser } = useFusionAuth();
  const { data: queryEmployees } = useEmployeesQuery({ includeInactive: true });
  const employees = queryEmployees || authEmployees;
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState<'TODOS' | 'PLANTA' | 'SUPERNUMERARIO'>('TODOS');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS');

  // Modals
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<FusionEmployee | null>(null);
  const [visibilityModalEmployee, setVisibilityModalEmployee] = useState<FusionEmployee | null>(null);

  // Form State for create/edit
  const [formData, setFormData] = useState({
    name: '',
    initials: '',
    jobTitle: '',
    contractType: 'PLANTA' as 'PLANTA' | 'SUPERNUMERARIO',
    roleKey: 'operario_planta',
    status: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
    email: '',
    phone: '',
    extension: '',
  });

  // Visibility Editor State
  const [customVisibilityOverrides, setCustomVisibilityOverrides] = useState<{
    useCustom: boolean;
    allowed: FusionModuleKey[];
    denied: FusionModuleKey[];
  }>({
    useCustom: false,
    allowed: [],
    denied: [],
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Metrics
  const totalEmployees = employees.length;
  const plantaCount = employees.filter(e => e.contractType === 'PLANTA').length;
  const supernumerarioCount = employees.filter(e => e.contractType === 'SUPERNUMERARIO').length;
  const activeCount = employees.filter(e => e.status === 'ACTIVO').length;

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        emp.name.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.initials.toLowerCase().includes(q) ||
        emp.roleName.toLowerCase().includes(q);

      const matchesContract = contractFilter === 'TODOS' || emp.contractType === contractFilter;
      const matchesRole = roleFilter === 'TODOS' || emp.roleKey === roleFilter;
      const matchesStatus = statusFilter === 'TODOS' || emp.status === statusFilter;

      return matchesSearch && matchesContract && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, contractFilter, roleFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      initials: '',
      jobTitle: '',
      contractType: 'SUPERNUMERARIO',
      roleKey: 'operario_planta',
      status: 'ACTIVO',
      email: '',
      phone: '',
      extension: '',
    });
    setEditingEmployee(null);
    setIsNewEmployeeModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: FusionEmployee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      initials: emp.initials,
      jobTitle: emp.jobTitle,
      contractType: emp.contractType,
      roleKey: emp.roleKey,
      status: emp.status,
      email: emp.email,
      phone: emp.phone || '',
      extension: emp.extension || '',
    });
    setIsNewEmployeeModalOpen(true);
  };

  // Auto-generate initials when typing name
  const handleNameChange = (name: string) => {
    const parts = name.trim().split(/\s+/);
    let initials = '';
    if (parts.length === 1 && parts[0]) initials = parts[0].substring(0, 2).toUpperCase();
    else if (parts.length >= 2) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

    setFormData(prev => ({
      ...prev,
      name,
      initials: prev.initials && prev.initials !== '' && prev.initials !== initials ? prev.initials : initials,
      email: prev.email ? prev.email : (parts.length >= 2 ? `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@fusiongrafica.com.co` : prev.email)
    }));
  };

  // Save Employee Form
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('El nombre es obligatorio');

    try {
      const url = editingEmployee ? `/api/admin/users/${editingEmployee.id}` : '/api/admin/users';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          initials: formData.initials || formData.name.substring(0, 2).toUpperCase(),
        }),
      });

      if (res.ok) {
        await refreshEmployees();
        setIsNewEmployeeModalOpen(false);
        showNotification(editingEmployee ? 'Empleado actualizado con éxito' : 'Nuevo empleado registrado con éxito');
      } else {
        alert('Error al guardar empleado');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la comunicación con el servidor');
    }
  };

  // Open Visibility Config Modal
  const handleOpenVisibilityModal = (emp: FusionEmployee) => {
    setVisibilityModalEmployee(emp);
    const hasCustom = !!(emp.customAllowedModules?.length || emp.customDeniedModules?.length);
    setCustomVisibilityOverrides({
      useCustom: hasCustom,
      allowed: (emp.customAllowedModules as FusionModuleKey[]) || [],
      denied: (emp.customDeniedModules as FusionModuleKey[]) || [],
    });
  };

  // Toggle Module in Visibility Modal
  const handleToggleModuleVisibility = (moduleKey: FusionModuleKey) => {
    if (!visibilityModalEmployee) return;

    // Check if by default the role can see it
    const defaultAllowed = canAccessModule({ roleKey: visibilityModalEmployee.roleKey }, moduleKey);

    setCustomVisibilityOverrides(prev => {
      const isCurrentlyAllowed = prev.useCustom
        ? (prev.allowed.includes(moduleKey) || (defaultAllowed && !prev.denied.includes(moduleKey)))
        : defaultAllowed;

      let newAllowed = [...prev.allowed];
      let newDenied = [...prev.denied];

      if (isCurrentlyAllowed) {
        // Bloquear módulo
        newAllowed = newAllowed.filter(k => k !== moduleKey);
        if (!newDenied.includes(moduleKey)) newDenied.push(moduleKey);
      } else {
        // Permitir módulo
        newDenied = newDenied.filter(k => k !== moduleKey);
        if (!newAllowed.includes(moduleKey)) newAllowed.push(moduleKey);
      }

      return {
        useCustom: true,
        allowed: newAllowed,
        denied: newDenied,
      };
    });
  };

  // Save Visibility Overrides
  const handleSaveVisibility = async () => {
    if (!visibilityModalEmployee) return;

    try {
      const res = await fetch(`/api/admin/users/${visibilityModalEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAllowedModules: customVisibilityOverrides.useCustom ? customVisibilityOverrides.allowed : [],
          customDeniedModules: customVisibilityOverrides.useCustom ? customVisibilityOverrides.denied : [],
        }),
      });

      if (res.ok) {
        await refreshEmployees();
        setVisibilityModalEmployee(null);
        showNotification(`Permisos de visibilidad actualizados para ${visibilityModalEmployee.name}`);
      } else {
        alert('Error al guardar permisos de visibilidad');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la comunicación con el servidor');
    }
  };

  // Reset Team to Default
  const handleSeedTeam = async () => {
    if (!confirm('¿Deseas restaurar la lista oficial de los 19 colaboradores de Fusión Comunicación Gráfica?')) return;
    try {
      const res = await fetch('/api/admin/users/seed', { method: 'POST' });
      if (res.ok) {
        await refreshEmployees();
        showNotification('Equipo de Fusión Comunicación Gráfica restaurado con éxito.');
      }
    } catch (err) {
      alert('Error al restaurar equipo');
    }
  };

  // Toggle status
  const handleToggleStatus = async (emp: FusionEmployee) => {
    try {
      const res = await fetch(`/api/admin/users/${emp.id}/deactivate`, { method: 'POST' });
      if (res.ok) {
        await refreshEmployees();
        showNotification(`Estado de ${emp.name} actualizado.`);
      }
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {notification}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              Gestión del equipo de Fusión Comunicación Gráfica
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Administración de empleados, vinculación (Planta vs Supernumerario) y control de qué puede ver o no cada usuario.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSeedTeam}
            className="px-3 py-2 border border-border bg-card hover:bg-muted text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            title="Restaurar la nómina de 19 colaboradores de Fusión"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            Restaurar Nómina
          </button>

          <Link
            to="/dashboard/admin/roles"
            className="px-3 py-2 border border-border bg-card hover:bg-muted text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-primary" />
            Editor de Perfiles y Roles
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Total Empleados</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{totalEmployees}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Equipo Fusión activo</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Personal de Planta</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{plantaCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Contrato fijo / planta</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Supernumerarios</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{supernumerarioCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Taller / Temporales</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Usuarios Activos</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">{activeCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Con acceso habilitado</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-card border border-border p-3.5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cargo, iniciales..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Vinculación filter */}
          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border text-xs shrink-0">
            <button
              onClick={() => setContractFilter('TODOS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                contractFilter === 'TODOS' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({totalEmployees})
            </button>
            <button
              onClick={() => setContractFilter('PLANTA')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                contractFilter === 'PLANTA' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Planta ({plantaCount})
            </button>
            <button
              onClick={() => setContractFilter('SUPERNUMERARIO')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                contractFilter === 'SUPERNUMERARIO' ? 'bg-amber-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Supernumerarios ({supernumerarioCount})
            </button>
          </div>

          {/* Rol filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="TODOS">Todos los Roles</option>
            {roles.map(r => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Estado filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="INACTIVO">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Empleado / Cargo</th>
                <th className="py-3 px-3">Vinculación</th>
                <th className="py-3 px-3">Perfil / Rol</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">¿Qué Puede Ver?</th>
                <th className="py-3 px-4 text-right">Acciones de Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No se encontraron empleados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const isSuperAdminUser = emp.roleKey === 'super_admin';
                  const isPermanentSuperUser =
                    emp.id === 'emp-03' ||
                    (emp.email && emp.email.includes('andresepulveda718')) ||
                    (emp.name && emp.name.toLowerCase().includes('cristian andrés sepúlveda'));
                  const isCurrentActive = currentUser?.id === emp.id;
                  const hasCustomOverrides = !!(emp.customAllowedModules?.length || emp.customDeniedModules?.length);

                  // Count visible modules
                  const visibleCount = FUSION_MODULES_CATALOG.filter(m => canAccessModule(emp, m.key)).length;
                  const canSeeCosts = canAccessModule(emp, 'costos');

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isPermanentSuperUser ? 'bg-amber-500/5' : isCurrentActive ? 'bg-primary/5 font-medium' : ''
                      }`}
                    >
                      {/* Name & Job Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              isPermanentSuperUser
                                ? 'bg-amber-600 text-white ring-2 ring-amber-400/60'
                                : isSuperAdminUser
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                                : emp.contractType === 'SUPERNUMERARIO'
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {emp.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 truncate flex-wrap">
                              <span>{emp.name}</span>
                              {isPermanentSuperUser && (
                                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5 text-amber-600" /> Super Usuario (Tú)
                                </span>
                              )}
                              {isCurrentActive && !isPermanentSuperUser && (
                                <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Tú ahora
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{emp.jobTitle}</div>
                            <div className="text-[10px] text-muted-foreground/80 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" /> {emp.email}
                              </span>
                              {emp.extension && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" /> Ext. {emp.extension}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vinculación */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            emp.contractType === 'SUPERNUMERARIO'
                              ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                          }`}
                        >
                          {emp.contractType === 'SUPERNUMERARIO' ? (
                            <Briefcase className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Building className="w-3 h-3 text-blue-600" />
                          )}
                          {emp.contractType}
                        </span>
                      </td>

                      {/* Role / Perfil */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-foreground bg-muted px-2 py-0.5 rounded text-[11px]">
                          {emp.roleName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            emp.status === 'ACTIVO'
                              ? 'bg-green-500/15 text-green-700'
                              : 'bg-gray-500/15 text-gray-600'
                          }`}
                        >
                          {emp.status === 'ACTIVO' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-gray-500" />
                          )}
                          {emp.status}
                        </span>
                      </td>

                      {/* Qué Puede Ver summary */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">
                              {visibleCount} de {FUSION_MODULES_CATALOG.length} módulos
                            </span>
                            {hasCustomOverrides && (
                              <span className="text-[9px] bg-primary/15 text-primary font-bold px-1.5 py-0.2 rounded">
                                Personalizado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!canSeeCosts ? (
                              <span className="text-[10px] text-red-600 bg-red-500/10 px-1.5 py-0.2 rounded flex items-center gap-1 font-medium">
                                <Lock className="w-2.5 h-2.5" /> Costos Ocultos
                              </span>
                            ) : (
                              <span className="text-[10px] text-green-700 bg-green-500/10 px-1.5 py-0.2 rounded flex items-center gap-1 font-medium">
                                <Unlock className="w-2.5 h-2.5" /> Ve Costos
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate button */}
                          <button
                            onClick={() => impersonateUser(emp)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title={`Simular pantalla de ${emp.name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Visibility configuration button */}
                          <button
                            onClick={() => handleOpenVisibilityModal(emp)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Configurar qué puede ver o no este usuario"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Edit details button */}
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Editar datos del empleado"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Status toggle button */}
                          {!isSuperAdminUser && !isPermanentSuperUser && (
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`p-1.5 rounded-md transition-colors ${
                                emp.status === 'ACTIVO'
                                  ? 'text-red-500 hover:bg-red-500/10'
                                  : 'text-green-600 hover:bg-green-500/10'
                              }`}
                              title={emp.status === 'ACTIVO' ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Nuevo Empleado / Editar Empleado */}
      {isNewEmployeeModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado — Fusión Comunicación Gráfica'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completa los datos del colaborador y asígnale su perfil.
                </p>
              </div>
              <button
                onClick={() => setIsNewEmployeeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej: Clara Alicia Vasco de Londoño"
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Iniciales (Avatar)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formData.initials}
                    onChange={e => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                    placeholder="Ej: CA"
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Tipo de Vinculación *</label>
                  <select
                    value={formData.contractType}
                    onChange={e => setFormData({ ...formData, contractType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="SUPERNUMERARIO">SUPERNUMERARIO (Taller / Temporal)</option>
                    <option value="PLANTA">PLANTA (Nómina Fija)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Cargo / Puesto *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Ej: Encuadernadora / Impresora"
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Perfil / Rol del Sistema *</label>
                  {editingEmployee?.id === 'emp-03' ? (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Super Administrador (Inmutable / Tú)</span>
                    </div>
                  ) : (
                    <select
                      value={formData.roleKey}
                      onChange={e => setFormData({ ...formData, roleKey: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      {roles.map(r => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Email Corporativo</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@fusiongrafica.com.co"
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Extensión Telefónica</label>
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={e => setFormData({ ...formData, extension: e.target.value })}
                    placeholder="Ej: 215"
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Estado</label>
                <div className="flex gap-4 items-center mt-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'ACTIVO'}
                      onChange={() => setFormData({ ...formData, status: 'ACTIVO' })}
                    />
                    <span className="text-green-700 font-semibold">ACTIVO</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'INACTIVO'}
                      onChange={() => setFormData({ ...formData, status: 'INACTIVO' })}
                    />
                    <span className="text-gray-500 font-semibold">INACTIVO</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewEmployeeModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg shadow-sm hover:bg-primary/90"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Configuración Granular de "¿Qué Puede Ver o Qué No?" */}
      {visibilityModalEmployee && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    visibilityModalEmployee.contractType === 'SUPERNUMERARIO' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}
                >
                  {visibilityModalEmployee.initials}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Control de Visibilidad: {visibilityModalEmployee.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cargo: {visibilityModalEmployee.jobTitle} • Perfil base:{' '}
                    <span className="font-semibold text-foreground">{visibilityModalEmployee.roleName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVisibilityModalEmployee(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex items-start gap-2.5 text-xs text-primary">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Control de Super Admin:</strong> Como super administrador, tú decides qué módulos y menús
                  están disponibles para este empleado. Si desactivas un módulo, desaparecerá de su menú lateral y no
                  podrá ingresar ni ver datos confidenciales.
                </div>
              </div>

              {/* Modules Matrix */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Módulos y Pantallas del Sistema (10)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {FUSION_MODULES_CATALOG.map(module => {
                    const defaultAllowed = canAccessModule(
                      { roleKey: visibilityModalEmployee.roleKey },
                      module.key
                    );

                    const isAllowed = customVisibilityOverrides.useCustom
                      ? customVisibilityOverrides.allowed.includes(module.key) ||
                        (defaultAllowed && !customVisibilityOverrides.denied.includes(module.key))
                      : defaultAllowed;

                    return (
                      <div
                        key={module.key}
                        onClick={() => handleToggleModuleVisibility(module.key)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isAllowed
                            ? 'bg-card border-green-500/40 hover:border-green-500 shadow-2xs'
                            : 'bg-muted/30 border-border opacity-70 hover:opacity-100 hover:border-muted-foreground/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              {module.name}
                              {module.isSensitive && (
                                <span className="bg-red-500/10 text-red-600 text-[9px] font-bold px-1 rounded uppercase">
                                  Sensible
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {module.description}
                            </p>
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {isAllowed ? (
                              <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                          <span
                            className={`font-semibold ${
                              isAllowed ? 'text-green-700' : 'text-muted-foreground'
                            }`}
                          >
                            {isAllowed ? 'VISIBLE PARA ESTE USUARIO' : 'BLOQUEADO / OCULTO'}
                          </span>
                          <span className="text-muted-foreground">
                            {defaultAllowed ? 'Incluido en su rol' : 'No incluido en rol'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <button
                onClick={() =>
                  setCustomVisibilityOverrides({
                    useCustom: false,
                    allowed: [],
                    denied: [],
                  })
                }
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restablecer a valores por defecto del rol
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVisibilityModalEmployee(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveVisibility}
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg shadow-sm hover:bg-primary/90"
                >
                  Guardar Permisos de Visibilidad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
