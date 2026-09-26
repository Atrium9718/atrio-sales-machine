import React, { useState, useEffect } from 'react';
import {
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Plus,
  Megaphone,
  Sparkles,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type GlobalDateRange = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

interface HomeHeaderProps {
  userName?: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaveEdit: () => void;
  onResetRole: () => void;
  onOpenAddModal: () => void;
  dateRange: GlobalDateRange;
  onDateRangeChange: (range: GlobalDateRange) => void;
  hasUnsavedChanges?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName = 'Cristian',
  isEditing,
  onToggleEdit,
  onSaveEdit,
  onResetRole,
  onOpenAddModal,
  dateRange,
  onDateRangeChange,
  hasUnsavedChanges = false,
}) => {
  const navigate = useNavigate();
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/announcements/urgent-unconfirmed')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.hasUrgent && data.announcements?.length > 0) {
          setUrgentAnnouncement(data.announcements[0]);
        } else {
          setUrgentAnnouncement(null);
        }
      })
      .catch(() => setUrgentAnnouncement(null));
  }, []);
  // Fecha larga en español de Colombia
  const now = new Date();
  const colombiaDateFormatted = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  }).format(now);

  // Capitalizar primera letra
  const capitalizedDate =
    colombiaDateFormatted.charAt(0).toUpperCase() + colombiaDateFormatted.slice(1);

  // Saludo contextual según hora de Colombia
  const getGreeting = () => {
    const hours = now.getHours();
    if (hours < 12) return 'Buenos días';
    if (hours < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Franja de Anuncios Urgentes (Etapa 15.4) */}
      {urgentAnnouncement ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-red-900 dark:text-red-200 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>
              <strong>Directiva Urgente Pendiente:</strong> {urgentAnnouncement.title}
            </span>
          </div>
          <button
            onClick={() => navigate(`/anuncios/${urgentAnnouncement.id}`)}
            className="inline-flex items-center gap-1 font-semibold text-xs text-red-700 dark:text-red-300 hover:underline shrink-0 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/20"
          >
            Confirmar lectura obligatoria <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 px-4 flex items-center justify-between text-xs text-foreground/80">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary shrink-0" />
            <span>
              Tablero de Dirección y Comunicados al día. Puedes consultar el histórico completo en cualquier momento.
            </span>
          </div>
          <button
            onClick={() => navigate('/anuncios')}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            Ver Anuncios <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Encabezado Principal y Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {getGreeting()}, {userName}
            </h1>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{capitalizedDate}</span>
            </div>
            <span className="text-border">·</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Bogotá (UTC-5)
            </span>
            {hasUnsavedChanges && (
              <>
                <span className="text-border">·</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Cambios sin guardar
                </span>
              </>
            )}
          </div>
        </div>

        {/* Acciones y Selectores */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Rango de Fechas Global */}
          <div className="relative inline-flex items-center">
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as GlobalDateRange)}
              aria-label="Rango de fecha del tablero"
              className="appearance-none bg-background border border-border/80 text-foreground text-xs font-bold rounded-xl pl-3.5 pr-8 py-2.5 hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
            >
              <option value="TODAY">Hoy</option>
              <option value="THIS_WEEK">Esta semana</option>
              <option value="THIS_MONTH">Este mes</option>
              <option value="LAST_MONTH">Mes pasado</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 pointer-events-none" />
          </div>

          {/* Botones de Modo Edición */}
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-2xs"
                title="Agregar widget al tablero"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Widget</span>
              </button>
              <button
                onClick={onResetRole}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shadow-2xs"
                title="Restablecer a la plantilla predeterminada de mi rol"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
              <button
                onClick={onSaveEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
                title="Guardar cambios de disposición"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Tablero</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onToggleEdit}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-card text-foreground hover:bg-muted border border-border/80 transition-colors shadow-2xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Personalizar Tablero</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
