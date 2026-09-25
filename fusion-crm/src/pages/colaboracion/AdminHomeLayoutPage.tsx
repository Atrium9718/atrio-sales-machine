import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Eye,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { WIDGET_CATALOG, getAllWidgets, WidgetSize } from '../../../packages/core/src/home/widget-catalog';

interface RoleLayoutItem {
  key: string;
  size: WidgetSize;
  order: number;
}

export const AdminHomeLayoutPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('comercial');
  const [roleLayouts, setRoleLayouts] = useState<Record<string, RoleLayoutItem[]>>({});
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isForceModalOpen, setIsForceModalOpen] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const roles = [
    { id: 'comercial', label: 'Comercial / Asesor' },
    { id: 'produccion', label: 'Jefe de Producción' },
    { id: 'planta', label: 'Operario de Planta' },
    { id: 'gerencia', label: 'Gerencia General' },
    { id: 'supervisor', label: 'Supervisor de Área' },
    { id: 'admin', label: 'Administrador del Sistema' },
  ];

  const allCatalog = getAllWidgets();

  const fetchRoleLayouts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/home/admin/role-layouts', {
        headers: {
          'x-user-role': (window as any).__FUSION_USER_ROLE__ || 'admin',
          'x-user-permissions': JSON.stringify(
            (window as any).__FUSION_USER_PERMISSIONS__ || ['*']
          ),
        },
      });
      const data = await res.json();
      if (data.success) {
        setRoleLayouts(data.layouts || {});
        setUserCounts(data.userCountsByRole || {});
      }
    } catch (err) {
      console.error('Error cargando plantillas', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleLayouts();
  }, []);

  const currentWidgets: RoleLayoutItem[] = roleLayouts[selectedRole] || [];

  const handleRemoveWidget = (key: string) => {
    setRoleLayouts((prev) => ({
      ...prev,
      [selectedRole]: (prev[selectedRole] || []).filter((w) => w.key !== key),
    }));
  };

  const handleAddWidgetToRole = (key: string) => {
    const def = WIDGET_CATALOG[key];
    if (!def) return;

    setRoleLayouts((prev) => {
      const list = prev[selectedRole] || [];
      if (list.some((w) => w.key === key)) return prev;
      return {
        ...prev,
        [selectedRole]: [
          ...list,
          { key, size: def.defaultSize, order: list.length },
        ],
      };
    });
  };

  const handleChangeSize = (key: string, size: WidgetSize) => {
    setRoleLayouts((prev) => ({
      ...prev,
      [selectedRole]: (prev[selectedRole] || []).map((w) =>
        w.key === key ? { ...w, size } : w
      ),
    }));
  };

  const handlePublish = async (forceToAll = false) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/home/admin/role-layouts/${selectedRole}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': (window as any).__FUSION_USER_ROLE__ || 'admin',
          'x-user-permissions': JSON.stringify(
            (window as any).__FUSION_USER_PERMISSIONS__ || ['*']
          ),
        },
        body: JSON.stringify({
          widgets: currentWidgets,
          forceToAll,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsForceModalOpen(false);
        showNotice(
          forceToAll
            ? `Disposición aplicada forzosamente a todos los usuarios del rol ${selectedRole}. Registrado en AuditLog.`
            : `Plantilla para ${selectedRole} publicada exitosamente.`
        );
      } else {
        showNotice(data.error || 'Error al guardar plantilla');
      }
    } catch {
      showNotice('Error al conectar con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const affectedCount = userCounts[selectedRole] || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border rounded-xl p-5 md:p-6 mb-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Administración de Disposiciones de Home por Rol
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Configura qué tarjetas y en qué orden aparecen por defecto para cada puesto de trabajo en la empresa.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              previewMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {previewMode ? 'Salir de Vista Previa' : `Vista Previa como ${selectedRole}`}
          </button>

          <button
            onClick={() => handlePublish(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Publicar Plantilla
          </button>
        </div>
      </div>

      {/* Selector de Roles */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
              selectedRole === r.id
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>{r.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-background/20 font-mono">
              {userCounts[r.id] ?? 0} usuarios
            </span>
          </button>
        ))}
      </div>

      {/* Panel Informativo de Impacto */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">
              Regla de Publicación para el Rol {selectedRole.toUpperCase()}
            </p>
            <p className="text-muted-foreground mt-0.5 leading-snug">
              Publicar cambia la plantilla para los {affectedCount} usuarios del rol que no han personalizado su vista y para los nuevos ingresos. Las personalizaciones previas se conservan.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsForceModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 whitespace-nowrap self-start sm:self-auto"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Forzar a todos los usuarios
        </button>
      </div>

      {/* Vista de Edición vs Vista Previa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Widgets Activos en la Plantilla */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Tarjetas Asignadas al Rol ({currentWidgets.length})
            </h3>
            <span className="text-xs text-muted-foreground">Ordenadas de arriba hacia abajo</span>
          </div>

          <div className="space-y-2">
            {currentWidgets.map((item, idx) => {
              const def = WIDGET_CATALOG[item.key];
              if (!def) return null;

              return (
                <div
                  key={item.key}
                  className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-muted-foreground w-5">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground">{def.title}</h4>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase px-1.5 py-0.2 rounded bg-muted">
                          {def.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate max-w-md mt-0.5">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Selector de tamaño */}
                    <div className="flex items-center gap-1 text-[10px]">
                      {(['SMALL', 'MEDIUM', 'LARGE', 'FULL'] as WidgetSize[]).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleChangeSize(item.key, sz)}
                          className={`px-2 py-1 rounded font-semibold ${
                            item.size === sz
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {sz[0]}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleRemoveWidget(item.key)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                      title="Eliminar de la plantilla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Catálogo de Widgets Disponibles para Agregar */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Widgets Disponibles</h3>
          <div className="bg-card border border-border rounded-xl p-3 max-h-[600px] overflow-y-auto space-y-2">
            {allCatalog
              .filter((w) => !currentWidgets.some((cw) => cw.key === w.key))
              .map((w) => (
                <div
                  key={w.key}
                  className="p-2.5 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{w.category}</p>
                  </div>
                  <button
                    onClick={() => handleAddWidgetToRole(w.key)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación: Forzar Plantilla a Todos los Usuarios */}
      {isForceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">¿Forzar disposición a todos los usuarios?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta acción restablecerá el diseño de inicio de los <strong>{affectedCount} usuarios</strong> con el rol <strong>{selectedRole}</strong>, sobreescribiendo cualquier personalización que hayan hecho.
            </p>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-400 font-medium">
              Esta operación quedará registrada de forma inmutable en el <strong>AuditLog</strong> del sistema.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsForceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePublish(true)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs"
              >
                Sí, forzar y registrar en auditoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
