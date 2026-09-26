import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../lib/queryKeys';
import {
  MoreVertical,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  EyeOff,
  GripVertical,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResolvedWidget } from '../../../packages/core/src/home/resolve-layout';
import { WidgetSize } from '../../../packages/core/src/home/widget-catalog';
import { WidgetContent } from './WidgetContent';

interface WidgetRendererProps {
  widget: ResolvedWidget;
  isEditing?: boolean;
  dateRange?: string;
  onHideWidget?: (key: string) => void;
  onChangeSize?: (key: string, newSize: WidgetSize) => void;
  dragHandleProps?: any;
}

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case 'COMERCIAL':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
    case 'PRODUCCION':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
    case 'FINANCIERO':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
    case 'PERSONAL':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20';
    case 'SISTEMA':
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20';
    case 'EQUIPO':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
};

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  isEditing = false,
  dateRange = 'THIS_MONTH',
  onHideWidget,
  onChangeSize,
  dragHandleProps,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const {
    data: queryResult,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.metrics.home, widget.key, dateRange],
    queryFn: async () => {
      const res = await fetch(
        `/api/home/widget-data/${widget.key}?dateRange=${dateRange}`,
        {
          headers: {
            'x-user-role': (window as any).__FUSION_USER_ROLE__ || 'admin',
            'x-user-permissions': JSON.stringify(
              (window as any).__FUSION_USER_PERMISSIONS__ || ['*']
            ),
          },
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error de servidor' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 1000 * 30,
  });

  const data = queryResult?.data ?? null;
  const timestamp = queryResult?.timestamp ?? 'al corte de las 06:00';
  const error = queryError ? (queryError as Error).message : null;

  const fetchWidgetData = async (_force = false) => {
    await refetch();
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full relative group min-w-0 overflow-hidden">
      {/* Barra de título y acciones del Widget */}
      <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Asa de arrastre en modo edición */}
          {isEditing && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/80 shrink-0 transition-colors"
              title="Arrastrar para reordenar"
            >
              <GripVertical className="w-4 h-4 text-primary" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                {widget.title}
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${getCategoryBadgeStyle(
                  widget.category
                )}`}
              >
                {widget.category}
              </span>
            </div>
            {widget.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                {widget.description}
              </p>
            )}
          </div>
        </div>

        {/* Acciones de la tarjeta */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Botón Ir al Detalle */}
          {widget.drillDownRoute && widget.drillDownRoute !== '/' && (
            <button
              onClick={() => navigate(widget.drillDownRoute)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Ver detalle del módulo"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Menú de opciones Kebab */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Opciones del widget"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border/80 rounded-xl shadow-lg p-1.5 z-30 text-xs animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    fetchWidgetData(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar datos
                </button>

                {onHideWidget && (
                  <button
                    onClick={() => {
                      onHideWidget(widget.key);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Ocultar del Tablero
                  </button>
                )}

                {isEditing && onChangeSize && (
                  <div className="border-t border-border mt-1.5 pt-1.5">
                    <p className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Ancho del Widget
                    </p>
                    {(['SMALL', 'MEDIUM', 'LARGE', 'FULL'] as WidgetSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          onChangeSize(widget.key, sz);
                          setMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs transition-colors ${
                          widget.size === sz
                            ? 'font-bold text-primary bg-primary/10'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {sz === 'SMALL' && 'Pequeño (1/4 ancho)'}
                        {sz === 'MEDIUM' && 'Mediano (1/2 ancho)'}
                        {sz === 'LARGE' && 'Grande (2/3 ancho)'}
                        {sz === 'FULL' && 'Completo (Ancho total)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo del Widget (Con Suspense, Loading Skeleton y Error Boundary) */}
      <div className="flex-1 min-h-[140px] flex flex-col justify-between">
        {isLoading ? (
          // Estado de Carga (Skeleton pulido)
          <div className="space-y-3 py-3 animate-pulse">
            <div className="h-4 bg-muted rounded-md w-3/4" />
            <div className="h-16 bg-muted/60 rounded-xl w-full" />
            <div className="h-4 bg-muted/40 rounded-md w-1/2" />
          </div>
        ) : error ? (
          // Estado de Error Aislado (nunca rompe el Home)
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col items-center text-center justify-center min-h-[140px]">
            <AlertCircle className="w-6 h-6 text-red-500 mb-1.5" />
            <p className="text-xs font-bold text-foreground">Error al cargar datos</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">{error}</p>
            <button
              onClick={() => fetchWidgetData(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        ) : (
          // Contenido Resuelto del Widget
          <WidgetContent
            widgetKey={widget.key}
            data={data}
            onRefresh={() => fetchWidgetData(true)}
            drillDownRoute={widget.drillDownRoute}
          />
        )}
      </div>

      {/* Pie de Widget con marca de hora del dato */}
      <div className="pt-3.5 mt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[11px]">
          {timestamp && timestamp.toLowerCase().includes('tiempo real') ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tiempo real
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
              <span>{timestamp || 'Al corte de las 06:00 (métrica calculada)'}</span>
            </span>
          )}
        </div>
        {isEditing && onChangeSize && (
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
            {(['SMALL', 'MEDIUM', 'LARGE', 'FULL'] as WidgetSize[]).map((sz) => (
              <button
                key={sz}
                onClick={() => onChangeSize(widget.key, sz)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  widget.size === sz
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`Cambiar a tamaño ${sz}`}
              >
                {sz === 'SMALL' ? 'S' : sz === 'MEDIUM' ? 'M' : sz === 'LARGE' ? 'L' : 'F'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
