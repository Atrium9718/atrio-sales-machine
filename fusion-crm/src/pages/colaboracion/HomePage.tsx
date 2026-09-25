import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ResolvedWidget } from '../../../packages/core/src/home/resolve-layout';
import { WidgetSize } from '../../../packages/core/src/home/widget-catalog';
import { HomeHeader, GlobalDateRange } from '../../components/home/HomeHeader';
import { WidgetRenderer } from '../../components/home/WidgetRenderer';
import { AddWidgetModal } from '../../components/home/AddWidgetModal';
import { TableroOrdenMiDia } from '../../components/home/TableroOrdenMiDia';
import { useFusionAuth } from '../../context/FusionAuthContext';
import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react';

interface SortableWidgetProps {
  widget: ResolvedWidget;
  isEditing: boolean;
  dateRange: GlobalDateRange;
  onHideWidget: (key: string) => void;
  onChangeSize: (key: string, newSize: WidgetSize) => void;
}

const getWidgetSpanClass = (size: WidgetSize) => {
  switch (size) {
    case 'FULL':
      return 'col-span-1 md:col-span-6 lg:col-span-12';
    case 'LARGE':
      return 'col-span-1 md:col-span-6 lg:col-span-8';
    case 'MEDIUM':
      return 'col-span-1 md:col-span-6 lg:col-span-6';
    case 'SMALL':
      return 'col-span-1 sm:col-span-3 lg:col-span-4 xl:col-span-3';
    default:
      return 'col-span-1 md:col-span-6 lg:col-span-6';
  }
};

const SortableWidgetWrapper: React.FC<SortableWidgetProps> = ({
  widget,
  isEditing,
  dateRange,
  onHideWidget,
  onChangeSize,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.key, disabled: !isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full min-w-0 transition-all ${getWidgetSpanClass(widget.size)}`}
    >
      <WidgetRenderer
        widget={widget}
        isEditing={isEditing}
        dateRange={dateRange}
        onHideWidget={onHideWidget}
        onChangeSize={onChangeSize}
        dragHandleProps={{ ...attributes, ...(listeners ? listeners : {}) }}
      />
    </div>
  );
};

export const HomePage: React.FC = () => {
  const { currentUser } = useFusionAuth();
  const [widgets, setWidgets] = useState<ResolvedWidget[]>([]);
  const [availableCatalog, setAvailableCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Rango de fechas recordado en localStorage
  const [dateRange, setDateRange] = useState<GlobalDateRange>(() => {
    return (localStorage.getItem('fusion_home_date_range') as GlobalDateRange) || 'THIS_MONTH';
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchLayout = async () => {
    setIsLoading(true);
    try {
      const isMobile = window.innerWidth <= 768;
      const device = isMobile ? 'MOBILE' : 'DESKTOP';
      const res = await fetch(`/api/home/layout?device=${device}&userId=${encodeURIComponent(currentUser?.id || 'emp-03')}`, {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': (window as any).__FUSION_USER_ROLE__ || currentUser?.roleKey || 'super_admin',
          'x-user-permissions': JSON.stringify(
            (window as any).__FUSION_USER_PERMISSIONS__ || ['*']
          ),
        },
      });
      const data = await res.json();
      if (data.success) {
        setWidgets(data.widgets || []);
        setAvailableCatalog(data.availableWidgets || []);
        localStorage.setItem('fusion_home_widgets', JSON.stringify(data.widgets));
        localStorage.setItem('fusion_home_catalog', JSON.stringify(data.availableWidgets));
        const now = new Date();
        setLastSync(now);
        localStorage.setItem('fusion_home_last_sync', now.toISOString());
        setIsOffline(false);
      }
    } catch (err) {
      console.error('Error fetching home layout', err);
      // Fallback to local storage
      const cachedWidgets = localStorage.getItem('fusion_home_widgets');
      const cachedCatalog = localStorage.getItem('fusion_home_catalog');
      const cachedSync = localStorage.getItem('fusion_home_last_sync');
      if (cachedWidgets) setWidgets(JSON.parse(cachedWidgets));
      if (cachedCatalog) setAvailableCatalog(JSON.parse(cachedCatalog));
      if (cachedSync) setLastSync(new Date(cachedSync));
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout();
  }, []);

  const handleDateRangeChange = (range: GlobalDateRange) => {
    setDateRange(range);
    localStorage.setItem('fusion_home_date_range', range);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((items: ResolvedWidget[]) => {
      const oldIndex = items.findIndex((item) => item.key === active.id);
      const newIndex = items.findIndex((item) => item.key === over.id);
      const reordered: ResolvedWidget[] = arrayMove(items, oldIndex, newIndex);
      return reordered.map((w: ResolvedWidget, idx: number) => ({ ...w, order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  const handleHideWidget = (key: string) => {
    setWidgets((prev) => prev.filter((w) => w.key !== key));
    setHasUnsavedChanges(true);
    showNotice('Widget ocultado. Guarda para mantener la disposición.');
  };

  const handleChangeSize = (key: string, newSize: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.key === key ? { ...w, size: newSize } : w))
    );
    setHasUnsavedChanges(true);
  };

  const handleAddWidget = (key: string) => {
    const candidate = availableCatalog.find((w) => w.key === key);
    if (!candidate) return;

    const newResolved: ResolvedWidget = {
      key: candidate.key,
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
      size: candidate.defaultSize,
      order: widgets.length,
      config: {},
      drillDownRoute: '/',
      refreshSeconds: 120,
      dataSource: 'LIVE_LIGHT',
      isAvailable: true,
      requiredPermissions: [],
    };

    setWidgets((prev) => [...prev, newResolved]);
    setHasUnsavedChanges(true);
    setIsAddModalOpen(false);
    showNotice(`Widget "${candidate.title}" agregado al tablero.`);
  };

  const handleSaveLayout = async () => {
    try {
      const payload = widgets.map((w, idx) => ({
        key: w.key,
        size: w.size,
        order: idx,
        config: w.config || {},
      }));

      const res = await fetch('/api/home/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: payload }),
      });

      if (res.ok) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        showNotice('Disposición de widgets guardada correctamente.');
      }
    } catch (err) {
      showNotice('Error al guardar la disposición.');
    }
  };

  const handleResetToRole = async () => {
    if (!window.confirm('¿Deseas restablecer la disposición predeterminada de tu rol? Se perderán las personalizaciones.')) {
      return;
    }
    try {
      const res = await fetch('/api/home/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToRole: true }),
      });
      if (res.ok) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        fetchLayout();
        showNotice('Disposición restablecida a la plantilla del rol.');
      }
    } catch {
      showNotice('Error al restablecer disposición.');
    }
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Notificación flotante */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{notification}</span>
        </div>
      )}
      
      {/* Offline Banner */}
      {isOffline && (
        <div className="mb-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4" />
          <span>
            Sin conexión. Mostrando datos cacheados.{' '}
            {lastSync && `Datos de hace ${Math.round((new Date().getTime() - lastSync.getTime()) / 60000)} minutos.`}
          </span>
        </div>
      )}

      {/* Encabezado Superior */}
      <HomeHeader
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onSaveEdit={handleSaveLayout}
        onResetRole={handleResetToRole}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Tablero de Orden de Mi Día (Casillas: Sin empezar, Iniciada, Terminada) */}
      {!isEditing && (
        <TableroOrdenMiDia userId={currentUser?.id || 'emp-03'} onTaskChange={fetchLayout} />
      )}

      {/* Barra informativa de Modo Edición */}
      {isEditing && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-primary font-medium shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Modo Personalización:</strong> Arrastra desde el asa para organizar tu tablero. Ajusta el ancho con los controles (S, M, L, F) o agrega widgets desde el catálogo.
            </span>
          </div>
          <button
            onClick={handleSaveLayout}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-colors shadow-xs shrink-0"
          >
            Guardar Tablero
          </button>
        </div>
      )}

      {/* Tablero Adaptable de Widgets */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="col-span-1 md:col-span-6 lg:col-span-6 bg-card border border-border/80 rounded-2xl p-6 h-56 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 bg-muted rounded-md w-1/3" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </div>
              <div className="h-20 bg-muted/40 rounded-xl" />
              <div className="h-3 bg-muted/30 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/80 rounded-2xl p-8 max-w-lg mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Tu tablero de inicio está vacío</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Puedes agregar widgets personalizados desde el catálogo o restablecer la plantilla por defecto recomendada para tu rol.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
            >
              Agregar Widgets
            </button>
            <button
              onClick={handleResetToRole}
              className="px-4 py-2.5 text-xs font-semibold bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors"
            >
              Restablecer Plantilla
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map((w) => w.key)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 lg:gap-6">
              {widgets.map((widget) => (
                <SortableWidgetWrapper
                  key={widget.key}
                  widget={widget}
                  isEditing={isEditing}
                  dateRange={dateRange}
                  onHideWidget={handleHideWidget}
                  onChangeSize={handleChangeSize}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal de Agregar Widget */}
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        availableWidgets={availableCatalog}
        currentWidgetKeys={widgets.map((w) => w.key)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
};
