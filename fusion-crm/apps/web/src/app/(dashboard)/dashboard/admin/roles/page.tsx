import React, { useEffect, useState } from 'react';
import {
  Shield,
  Eye,
  Plus,
  AlertTriangle,
  UserCheck,
  Check,
  Lock,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useFusionAuth, FusionRole } from '@/context/FusionAuthContext';
import { FUSION_MODULES_CATALOG, FusionModuleKey } from '@fusion/core/src/auth/permissions';
import { Link } from 'react-router-dom';

export default function RolesPage() {
  const { roles = [], employees = [], refreshRoles } = useFusionAuth();
  const [editingRole, setEditingRole] = useState<FusionRole | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [roleForm, setRoleForm] = useState<{
    id?: string;
    key: string;
    name: string;
    description: string;
    allowedModules: FusionModuleKey[];
    permissions: string[];
  }>({
    key: '',
    name: '',
    description: '',
    allowedModules: ['equipo'],
    permissions: ['home:read'],
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenEdit = (role: FusionRole) => {
    setEditingRole(role);
    setRoleForm({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description || '',
      allowedModules: Array.isArray(role.allowedModules) ? (role.allowedModules as FusionModuleKey[]) : ['equipo'],
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setIsModalOpen(true);
  };

  const handleToggleModule = (key: FusionModuleKey) => {
    setRoleForm(prev => {
      const current = Array.isArray(prev.allowedModules) ? prev.allowedModules : [];
      const exists = current.includes(key);
      const newAllowed = exists ? current.filter(m => m !== key) : [...current, key];
      return { ...prev, allowedModules: newAllowed };
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return alert('El nombre es requerido');

    try {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : '/api/admin/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      });

      if (res.ok) {
        if (refreshRoles) await refreshRoles();
        setIsModalOpen(false);
        showNotification('Perfil actualizado con éxito');
      } else {
        alert('Error al guardar el rol');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const safeRoles = Array.isArray(roles) ? roles : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Editor de Perfiles y Roles (Matriz de Permisos)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define la plantilla de módulos y alcances por defecto para cada puesto de trabajo en Fusión.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/admin/usuarios"
            className="px-3 py-2 border border-border bg-card hover:bg-muted text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            ← Volver a Gestión de Empleados
          </Link>
        </div>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeRoles.length > 0 ? (
          safeRoles.map(role => {
            const assignedEmployees = safeEmployees.filter(e => e.roleKey === role.key);
            const isSuperAdmin = role.key === 'super_admin';
            const allowedModules = Array.isArray(role.allowedModules) ? role.allowedModules : [];
            const canSeeCosts = allowedModules.includes('costos');

            return (
              <div
                key={role.id}
                className={`border rounded-xl p-5 bg-card flex flex-col justify-between transition-all ${
                  isSuperAdmin ? 'border-primary/40 shadow-xs' : 'border-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">{role.name}</h3>
                        {role.isSystem && (
                          <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(role)}
                      className="text-xs border border-border hover:bg-muted px-2.5 py-1 rounded-md font-medium text-foreground shrink-0 transition-colors"
                    >
                      Editar Módulos
                    </button>
                  </div>

                  {/* Modules Tags */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Módulos accesibles por defecto ({allowedModules.length} de {FUSION_MODULES_CATALOG.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FUSION_MODULES_CATALOG.map(mod => {
                        const isAllowed = isSuperAdmin || allowedModules.includes(mod.key);
                        return (
                          <span
                            key={mod.key}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                              isAllowed
                                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                                : 'bg-muted/40 text-muted-foreground line-through opacity-60'
                            }`}
                          >
                            {isAllowed ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Lock className="w-2.5 h-2.5" />}
                            {mod.name.split(' ')[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Warnings / Badges */}
                  {!canSeeCosts && !isSuperAdmin && (
                    <div className="mt-3 text-[11px] text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Módulo de Costos Reales restringido para este perfil.
                    </div>
                  )}
                </div>

                {/* Assigned Employees */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>
                      <strong>{assignedEmployees.length}</strong> empleado{assignedEmployees.length === 1 ? '' : 's'}{' '}
                      asignado{assignedEmployees.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {assignedEmployees.length > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {assignedEmployees.slice(0, 4).map(e => (
                        <div
                          key={e.id}
                          title={`${e.name} (${e.jobTitle})`}
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-card ${
                            e.contractType === 'SUPERNUMERARIO' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {e.initials}
                        </div>
                      ))}
                      {assignedEmployees.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                          +{assignedEmployees.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 p-12 text-center bg-card border border-border rounded-xl">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-bold text-foreground">No se pudieron cargar los roles</p>
            <p className="text-xs text-muted-foreground mt-1">Verifique la conexión con el servidor o recargue la página.</p>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {isModalOpen && editingRole && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Editar Módulos del Rol: {editingRole.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Los empleados con este rol heredarán estos accesos automáticamente.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nombre del Perfil</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Módulos Habilitados para este Rol
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FUSION_MODULES_CATALOG.map(mod => {
                    const isChecked = Array.isArray(roleForm.allowedModules) && roleForm.allowedModules.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isChecked ? 'bg-primary/5 border-primary/40 text-foreground' : 'bg-muted/20 border-border opacity-70'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold truncate">{mod.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{mod.category}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-border text-primary shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg shadow-sm hover:bg-primary/90"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
