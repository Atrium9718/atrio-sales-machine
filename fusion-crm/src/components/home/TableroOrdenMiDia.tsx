import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Briefcase,
  User,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Flame,
  Zap,
  Coffee,
  Filter,
  Check,
  Calendar,
  Layers,
  Archive,
  Download,
} from 'lucide-react';

export type TaskStatus = 'SIN_EMPEZAR' | 'INICIADA' | 'TERMINADA';
export type TaskPriority = 'ALTA' | 'MEDIA' | 'BAJA';
export type TaskCategory = 'PROYECTO' | 'CRM' | 'EXTERNO' | 'PERSONAL' | 'LLAMADA' | 'GENERAL';

export interface MyDayTaskItem {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  projectName?: string;
  isCrmLinked: boolean;
  crmTaskId?: string;
  estimatedMinutes?: number;
  timeSlot?: string;
  order: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface TableroOrdenMiDiaProps {
  userId?: string;
  onTaskChange?: () => void;
}

export const TableroOrdenMiDia: React.FC<TableroOrdenMiDiaProps> = ({
  userId = 'default',
  onTaskChange,
}) => {
  const [tasks, setTasks] = useState<MyDayTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fusion_my_day_collapsed') === 'true';
  });
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CRM' | 'NON_CRM' | 'HIGH_PRIORITY'>('ALL');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIA');
  const [newStatus, setNewStatus] = useState<TaskStatus>('SIN_EMPEZAR');
  const [newCategory, setNewCategory] = useState<TaskCategory>('GENERAL');
  const [newProjectName, setNewProjectName] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [newEstimatedMin, setNewEstimatedMin] = useState<string>('');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Cargar tareas desde API o caché local
  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/home/my-day-board?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
          localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(data.tasks));
        }
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      // Fallback local
      const cached = localStorage.getItem(`fusion_my_day_cache_${userId}`);
      if (cached) {
        try {
          setTasks(JSON.parse(cached));
        } catch {
          // Ignore parse error
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [userId]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('fusion_my_day_collapsed', String(nextState));
  };

  // Guardar en servidor y sincronizar estado local
  const updateTaskOnServer = async (id: string, updates: Partial<MyDayTaskItem>) => {
    // Optimistic UI
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`/api/home/my-day-board/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(updates),
      });
      if (onTaskChange) onTaskChange();
    } catch (e) {
      console.error('Error al actualizar tarea de mi día:', e);
    }
  };

  // Cambiar estado entre las 3 casillas
  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const completedAt = newStatus === 'TERMINADA' ? new Date().toISOString() : null;
    updateTaskOnServer(id, { status: newStatus, completedAt });

    if (newStatus === 'TERMINADA') {
      showToast('¡Gran trabajo! Tarea terminada.');
    } else if (newStatus === 'INICIADA') {
      showToast('Tarea iniciada. ¡A enfocarse!');
    }
  };

  // Alternar prioridad cíclicamente
  const handleCyclePriority = (id: string, current: TaskPriority) => {
    const order: TaskPriority[] = ['BAJA', 'MEDIA', 'ALTA'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextPriority = order[nextIdx];
    updateTaskOnServer(id, { priority: nextPriority });
  };

  // Mover orden arriba/abajo
  const handleMoveOrder = (id: string, direction: 'UP' | 'DOWN', status: TaskStatus) => {
    const statusTasks = tasks.filter((t) => t.status === status);
    const index = statusTasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    if (direction === 'UP' && index > 0) {
      const tempOrder = statusTasks[index].order;
      statusTasks[index].order = statusTasks[index - 1].order;
      statusTasks[index - 1].order = tempOrder;
    } else if (direction === 'DOWN' && index < statusTasks.length - 1) {
      const tempOrder = statusTasks[index].order;
      statusTasks[index].order = statusTasks[index + 1].order;
      statusTasks[index + 1].order = tempOrder;
    }

    setTasks([...tasks]);
    localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(tasks));
  };

  // Eliminar tarea
  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`/api/home/my-day-board/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });
      showToast('Tarea eliminada del día');
      if (onTaskChange) onTaskChange();
    } catch {
      // Fallback
    }
  };

  // Crear nueva tarea
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      priority: newPriority,
      status: newStatus,
      category: newCategory,
      projectName: newProjectName.trim() || (newCategory === 'CRM' || newCategory === 'PROYECTO' ? 'Proyecto General' : undefined),
      isCrmLinked: newCategory === 'CRM' || newCategory === 'PROYECTO',
      timeSlot: newTimeSlot.trim() || undefined,
      estimatedMinutes: newEstimatedMin ? Number(newEstimatedMin) : undefined,
    };

    try {
      const res = await fetch('/api/home/my-day-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => {
          const updated = [...prev, data.task];
          localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(updated));
          return updated;
        });
        showToast('Tarea agregada al orden de tu día');
      } else {
        // Fallback local
        const localNew: MyDayTaskItem = {
          id: `local-${Date.now()}`,
          ...payload,
          order: tasks.filter((t) => t.status === newStatus).length,
          createdAt: new Date().toISOString(),
        };
        setTasks((prev) => {
          const updated = [...prev, localNew];
          localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(updated));
          return updated;
        });
        showToast('Tarea guardada localmente');
      }

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewProjectName('');
      setNewTimeSlot('');
      setNewEstimatedMin('');
      setShowNewForm(false);
      if (onTaskChange) onTaskChange();
    } catch (err) {
      console.error(err);
    }
  };

  // Importar pendientes de CRM
  const handleImportFromCrm = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/home/my-day-board/import-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      });
      const data = await res.json();
      if (data.success && data.tasks) {
        setTasks(data.tasks);
        localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(data.tasks));
        showToast(data.message || 'Tareas importadas con éxito');
      } else {
        showToast('No hay pendientes nuevos en CRM para importar');
      }
      if (onTaskChange) onTaskChange();
    } catch {
      showToast('Error al importar tareas del CRM');
    } finally {
      setIsImporting(false);
    }
  };

  // Limpiar / Archivar terminadas
  const handleClearCompleted = async () => {
    if (!window.confirm('¿Deseas archivar todas las tareas terminadas de hoy?')) return;
    try {
      const res = await fetch('/api/home/my-day-board/clear-completed', {
        method: 'POST',
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        setTasks((prev) => {
          const remaining = prev.filter((t) => t.status !== 'TERMINADA');
          localStorage.setItem(`fusion_my_day_cache_${userId}`, JSON.stringify(remaining));
          return remaining;
        });
        showToast('Tareas terminadas archivadas');
        if (onTaskChange) onTaskChange();
      }
    } catch {
      setTasks((prev) => prev.filter((t) => t.status !== 'TERMINADA'));
    }
  };

  // Filtrado de tareas
  const filteredTasks = tasks.filter((t) => {
    if (categoryFilter === 'CRM') return t.isCrmLinked || t.category === 'CRM' || t.category === 'PROYECTO';
    if (categoryFilter === 'NON_CRM') return !t.isCrmLinked && t.category !== 'CRM' && t.category !== 'PROYECTO';
    if (categoryFilter === 'HIGH_PRIORITY') return t.priority === 'ALTA';
    return true;
  });

  const sinEmpezarList = filteredTasks.filter((t) => t.status === 'SIN_EMPEZAR');
  const iniciadaList = filteredTasks.filter((t) => t.status === 'INICIADA');
  const terminadaList = filteredTasks.filter((t) => t.status === 'TERMINADA');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'TERMINADA').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'INICIADA').length;
  const notStartedTasks = tasks.filter((t) => t.status === 'SIN_EMPEZAR').length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Fecha legible de hoy
  const todayFormatted = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <section
      id="tablero-orden-mi-dia"
      aria-label="Tablero de Orden de Mi Día"
      className="mb-8 bg-card border border-border/90 rounded-2xl shadow-xs overflow-hidden transition-all"
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Encabezado del Tablero */}
      <div className="p-4 sm:p-6 border-b border-border/70 bg-gradient-to-r from-muted/40 via-card to-muted/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    Tablero de Orden de Mi Día
                  </h2>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                    {capitalizedDate}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Planifica y prioriza tus tareas de hoy: proyectos de clientes, cotizaciones o actividades personales fuera del CRM.
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas y Controles de Cabecera */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Barra de Progreso Compacta */}
            <div className="flex items-center gap-2 bg-background/80 border border-border/80 px-3 py-1.5 rounded-xl">
              <div className="w-20 sm:w-24 bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-foreground whitespace-nowrap">
                {percent}% <span className="text-[10px] font-normal text-muted-foreground">({completedTasks}/{totalTasks})</span>
              </span>
            </div>

            {/* Botón Importar de CRM */}
            <button
              onClick={handleImportFromCrm}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-background hover:bg-muted/80 text-foreground border border-border/90 transition-colors shadow-2xs"
              title="Cargar tareas pendientes del CRM automáticamente"
            >
              <Download className={`w-3.5 h-3.5 text-primary ${isImporting ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">Importar de CRM</span>
            </button>

            {/* Botón Crear Tarea */}
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{showNewForm ? 'Cerrar Formulario' : 'Nueva Tarea'}</span>
            </button>

            {/* Botón Colapsar/Expandir */}
            <button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expandir tablero' : 'Minimizar tablero'}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos (si no está colapsado) */}
        {!isCollapsed && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtrar:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'ALL'
                    ? 'bg-foreground text-background font-bold shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Todas ({totalTasks})
              </button>
              <button
                onClick={() => setCategoryFilter('CRM')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  categoryFilter === 'CRM'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>Proyectos / CRM</span>
              </button>
              <button
                onClick={() => setCategoryFilter('NON_CRM')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  categoryFilter === 'NON_CRM'
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Fuera de CRM / Personal</span>
              </button>
              <button
                onClick={() => setCategoryFilter('HIGH_PRIORITY')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  categoryFilter === 'HIGH_PRIORITY'
                    ? 'bg-rose-600 text-white font-bold shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Alta Prioridad</span>
              </button>
            </div>

            {completedTasks > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto"
              >
                <Archive className="w-3 h-3" />
                <span>Archivar terminadas ({completedTasks})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Si está colapsado, mostramos barra resumen compacta */}
      {isCollapsed ? (
        <div className="p-3.5 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Sin empezar: <strong>{notStartedTasks}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Iniciadas: <strong>{inProgressTasks}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Terminadas: <strong>{completedTasks}</strong>
            </span>
          </div>
          <button
            onClick={toggleCollapse}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Abrir tablero de organización →
          </button>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Formulario Rápido de Creación de Tarea */}
          {showNewForm && (
            <form
              onSubmit={handleCreateTask}
              className="p-4 bg-muted/30 border border-primary/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nueva Tarea para Hoy
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Presiona Enter o clic en Agregar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Título de la tarea o pendiente *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej. Revisar cotización #1204, Comprar cinta VHB en ferretería, Llamar a cliente..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    autoFocus
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Casilla inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="SIN_EMPEZAR">📋 Sin empezar</option>
                    <option value="INICIADA">⏳ Iniciada (En curso)</option>
                    <option value="TERMINADA">✅ Terminada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ALTA">🔥 Alta (Urgente hoy)</option>
                    <option value="MEDIA">⚡ Media (Normal)</option>
                    <option value="BAJA">☕ Baja (Secundaria)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Origen / Tipo
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="GENERAL">General / Tarea rápida</option>
                    <option value="PROYECTO">Proyecto de Producción</option>
                    <option value="CRM">Comercial / CRM</option>
                    <option value="EXTERNO">Gestión Externa (Fuera de CRM)</option>
                    <option value="PERSONAL">Personal / Asuntos propios</option>
                    <option value="LLAMADA">Llamada / Contacto</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Nombre de Proyecto o Nota
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ej. Avisos Gran Estación / Compras"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Horario o Tiempo estimado
                  </label>
                  <input
                    type="text"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    placeholder="Ej. 10:30 AM o 30 min"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-transparent hover:bg-muted text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Agregar al Tablero
                </button>
              </div>
            </form>
          )}

          {/* LAS TRES CASILLAS DEL TABLERO: SIN EMPEZAR, INICIADA, TERMINADA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start">
            {/* 1. CASILLA: SIN EMPEZAR */}
            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Sin Empezar
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">
                  {sinEmpezarList.length}
                </span>
              </div>

              {sinEmpezarList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/80 border border-dashed border-border/70 rounded-xl bg-background/50 my-auto">
                  <Clock className="w-7 h-7 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">Casilla despejada</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No tienes tareas pendientes por iniciar.
                  </p>
                  <button
                    onClick={() => {
                      setNewStatus('SIN_EMPEZAR');
                      setShowNewForm(true);
                    }}
                    className="mt-3 text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar tarea
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {sinEmpezarList.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onCyclePriority={handleCyclePriority}
                      onDelete={handleDeleteTask}
                      onMoveOrder={handleMoveOrder}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 2. CASILLA: INICIADA */}
            <div className="bg-amber-500/[0.03] border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Iniciada (En Curso)
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {iniciadaList.length}
                </span>
              </div>

              {iniciadaList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/80 border border-dashed border-amber-500/20 rounded-xl bg-background/50 my-auto">
                  <Play className="w-7 h-7 text-amber-500/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">Ninguna en foco activo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Elige una tarea de "Sin empezar" y haz clic en Iniciar para enfocarte.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {iniciadaList.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onCyclePriority={handleCyclePriority}
                      onDelete={handleDeleteTask}
                      onMoveOrder={handleMoveOrder}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 3. CASILLA: TERMINADA */}
            <div className="bg-emerald-500/[0.03] border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Terminada
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {terminadaList.length}
                </span>
              </div>

              {terminadaList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/80 border border-dashed border-emerald-500/20 rounded-xl bg-background/50 my-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">Aún sin terminar</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Al completar cada actividad, márcala como terminada para registrar tus logros de hoy.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {terminadaList.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onCyclePriority={handleCyclePriority}
                      onDelete={handleDeleteTask}
                      onMoveOrder={handleMoveOrder}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Componente individual de Tarjeta de Tarea
interface TaskCardProps {
  task: MyDayTaskItem;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onCyclePriority: (id: string, current: TaskPriority) => void;
  onDelete: (id: string) => void;
  onMoveOrder: (id: string, direction: 'UP' | 'DOWN', status: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onCyclePriority,
  onDelete,
  onMoveOrder,
}) => {
  const isTerminada = task.status === 'TERMINADA';
  const isIniciada = task.status === 'INICIADA';
  const isSinEmpezar = task.status === 'SIN_EMPEZAR';

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Flame className="w-2.5 h-2.5 text-rose-600" /> Alta
          </span>
        );
      case 'MEDIA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-2.5 h-2.5 text-amber-500" /> Media
          </span>
        );
      case 'BAJA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Coffee className="w-2.5 h-2.5 text-slate-500" /> Baja
          </span>
        );
    }
  };

  const getCategoryBadge = () => {
    if (task.isCrmLinked || task.category === 'CRM' || task.category === 'PROYECTO') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 truncate max-w-[130px]"
          title={task.projectName || 'Proyecto CRM'}
        >
          <Briefcase className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{task.projectName || 'Proyecto CRM'}</span>
        </span>
      );
    }

    if (task.category === 'EXTERNO') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 truncate max-w-[130px]"
          title="Gestión externa fuera del CRM"
        >
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{task.projectName || 'Fuera de CRM'}</span>
        </span>
      );
    }

    if (task.category === 'PERSONAL') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20"
          title="Asunto personal"
        >
          <User className="w-2.5 h-2.5 shrink-0" />
          <span>Personal</span>
        </span>
      );
    }

    return null;
  };

  return (
    <div
      className={`group relative p-3 rounded-xl border transition-all duration-200 ${
        isTerminada
          ? 'bg-card/60 border-border/60 opacity-70 hover:opacity-100'
          : isIniciada
          ? 'bg-card border-amber-500/30 shadow-2xs hover:border-amber-500/50'
          : 'bg-card border-border/90 hover:border-primary/40 shadow-2xs'
      }`}
    >
      {/* Cabecera de la tarjeta: Título y prioridad */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={() => {
              if (isTerminada) onStatusChange(task.id, 'INICIADA');
              else if (isIniciada) onStatusChange(task.id, 'TERMINADA');
              else onStatusChange(task.id, 'INICIADA');
            }}
            aria-label={isTerminada ? 'Reabrir tarea' : 'Marcar estado'}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors"
          >
            {isTerminada ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isIniciada ? (
              <Circle className="w-4 h-4 text-amber-500 stroke-[2.5]" />
            ) : (
              <Circle className="w-4 h-4 hover:stroke-emerald-600" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-semibold leading-snug break-words ${
                isTerminada ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {task.title}
            </h4>
            {task.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Botón de ciclo de prioridad */}
        <button
          type="button"
          onClick={() => onCyclePriority(task.id, task.priority)}
          title="Clic para alternar prioridad (Alta, Media, Baja)"
          className="shrink-0 cursor-pointer hover:scale-105 transition-transform"
        >
          {getPriorityBadge(task.priority)}
        </button>
      </div>

      {/* Metadatos (Horario, Proyecto, Tiempo) */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
        {getCategoryBadge()}

        {task.timeSlot && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium">
            <Clock className="w-2.5 h-2.5 text-muted-foreground" />
            {task.timeSlot}
          </span>
        )}

        {task.estimatedMinutes && (
          <span className="text-muted-foreground">
            · {task.estimatedMinutes}m
          </span>
        )}

        {isTerminada && task.completedAt && (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium ml-auto flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> Hecha
          </span>
        )}
      </div>

      {/* Botones de Acción Rápida para Mover entre Casillas */}
      <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-border/40">
        <div className="flex items-center gap-1">
          {/* Mover hacia atrás */}
          {isIniciada && (
            <button
              onClick={() => onStatusChange(task.id, 'SIN_EMPEZAR')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Volver a Sin empezar"
            >
              <ArrowLeft className="w-2.5 h-2.5" />
              <span>Pausar</span>
            </button>
          )}

          {isTerminada && (
            <button
              onClick={() => onStatusChange(task.id, 'INICIADA')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Reabrir a Iniciada"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reabrir</span>
            </button>
          )}

          {/* Mover hacia adelante */}
          {isSinEmpezar && (
            <button
              onClick={() => onStatusChange(task.id, 'INICIADA')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
              title="Poner en curso activo"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Iniciar</span>
            </button>
          )}

          {(isSinEmpezar || isIniciada) && (
            <button
              onClick={() => onStatusChange(task.id, 'TERMINADA')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
              title="Marcar como terminada"
            >
              <Check className="w-2.5 h-2.5" />
              <span>Terminar</span>
            </button>
          )}
        </div>

        {/* Botón Eliminar */}
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Eliminar tarea"
          className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
          title="Eliminar de mi día"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
