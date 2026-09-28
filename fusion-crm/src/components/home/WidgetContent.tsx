import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Flame,
  Zap,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  Layers,
  Activity,
  DollarSign,
  Briefcase,
  Users,
  Building,
  CheckCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  Lock,
  Target,
  BarChart3,
  Gauge,
  Clock4,
  CheckSquare,
  Megaphone,
  Pin,
  Award,
  Sparkles,
  HeartHandshake,
  AtSign,
  Radio,
  PhoneOff,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WidgetContentProps {
  widgetKey: string;
  data: any;
  onRefresh?: () => void;
  drillDownRoute?: string;
}

export const WidgetContent: React.FC<WidgetContentProps> = ({
  widgetKey,
  data,
  onRefresh,
  drillDownRoute,
}) => {
  const navigate = useNavigate();
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Acción de completar tarea en 1 solo clic desde mi_dia
  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: true }));
    try {
      await fetch('/api/home/actions/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (onRefresh) onRefresh();
    } catch {
      // Fallback
    }
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground min-h-[140px]">
        <AlertTriangle className="w-6 h-6 text-amber-500 mb-2 opacity-70" />
        <p className="font-medium text-foreground">Sin registros en el período</p>
        <p className="text-[11px] mt-0.5">No hay métricas reportadas o actividad registrada.</p>
      </div>
    );
  }

  switch (widgetKey) {
    // ------------------------------------------------------------------------
    // MI DÍA
    // ------------------------------------------------------------------------
    case 'mi_dia': {
      const tasks = data.pendingTasks || [];
      const nextMeeting = data.nextMeeting;
      const cols = data.columnsSummary || { sinEmpezarCount: 0, iniciadaCount: 0, terminadaCount: 0, percentCompleted: 0 };
      return (
        <div className="space-y-3">
          {/* Indicadores de las 3 casillas de Mi Día */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-muted/60 border border-border/80 p-2 rounded-xl">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sin empezar</p>
              <p className="text-base font-bold text-foreground mt-0.5">{cols.sinEmpezarCount}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 p-2 rounded-xl">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider">Iniciadas</p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{cols.iniciadaCount}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Terminadas</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{cols.terminadaCount}</p>
            </div>
          </div>

          {/* Próxima Cita */}
          {nextMeeting && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{nextMeeting.title}</p>
                  <p className="text-[11px] text-muted-foreground">{nextMeeting.time} · {nextMeeting.location}</p>
                </div>
              </div>
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                Próxima Cita
              </span>
            </div>
          )}

          {/* Tareas del Día */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
              <span>Prioridades de Hoy ({tasks.length})</span>
              <a
                href="#tablero-orden-mi-dia"
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
              >
                Abrir Tablero Completo →
              </a>
            </div>
            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
                  Sin tareas pendientes. ¡Todo al día!
                </div>
              ) : (
                tasks.map((task: any) => {
                  const isCompleted = completedTaskIds[task.id];
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                        isCompleted
                          ? 'bg-muted/40 border-muted text-muted-foreground opacity-60'
                          : task.status === 'INICIADA'
                          ? 'bg-amber-500/[0.04] border-amber-500/30'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      <button
                        onClick={(e) => handleCompleteTask(task.id, e)}
                        aria-label={`Completar tarea ${task.title}`}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : task.status === 'INICIADA' ? (
                          <Circle className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                        ) : (
                          <Circle className="w-4 h-4 hover:stroke-emerald-600" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium leading-tight truncate ${
                            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                          {task.projectName && (
                            <span className="text-primary font-medium truncate max-w-[140px]">
                              {task.projectName} ·
                            </span>
                          )}
                          <span>{task.dueTime}</span>
                          <span>·</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold ${
                              task.priority === 'ALTA'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                          {task.status === 'INICIADA' && (
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-600">
                              En Curso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // RESUMEN DE MIS TAREAS
    // ------------------------------------------------------------------------
    case 'mis_tareas_resumen':
      return (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
            <span className="text-xl font-bold text-red-600 leading-none">{data.overdueCount}</span>
            <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 mt-1">Vencidas</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
            <span className="text-xl font-bold text-amber-600 leading-none">{data.dueTodayCount}</span>
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1">Hoy</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg">
            <span className="text-xl font-bold text-blue-600 leading-none">{data.dueThisWeekCount}</span>
            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 mt-1">Esta Semana</p>
          </div>
        </div>
      );

    // ------------------------------------------------------------------------
    // MI AGENDA
    // ------------------------------------------------------------------------
    case 'mi_agenda':
      return (
        <div className="space-y-2">
          {(data.meetings || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <div>
                <p className="font-semibold text-foreground truncate max-w-[190px]">{m.title}</p>
                <p className="text-[11px] text-muted-foreground">{m.time}</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                {m.type}
              </span>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // MIS ANCLADOS
    // ------------------------------------------------------------------------
    case 'mis_anclados':
      return (
        <div className="space-y-1.5">
          {(data.items || []).map((pin: any) => (
            <div key={pin.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-all">
              <Building className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{pin.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{pin.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // MIS NOTIFICACIONES
    // ------------------------------------------------------------------------
    case 'mis_notificaciones':
      return (
        <div className="space-y-2">
          {(data.notifications || []).map((n: any) => (
            <div key={n.id} className="p-2 rounded-lg bg-card border border-border text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{n.title}</span>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // ATAJOS
    // ------------------------------------------------------------------------
    case 'atajos':
      return (
        <div className="grid grid-cols-2 gap-2">
          {(data.shortcuts || []).map((s: any) => (
            <button
              key={s.id}
              onClick={() => navigate(s.route)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/60 text-left transition-all group"
            >
              <Zap className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-foreground truncate">{s.label}</span>
            </button>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // META DE VENTAS
    // ------------------------------------------------------------------------
    case 'meta_ventas':
      return (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-foreground">
                ${(data.currentActual / 1000000).toFixed(1)}M{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  de ${(data.monthlyTarget / 1000000).toFixed(0)}M
                </span>
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
              {data.actualPercent}% alcanzado
            </span>
          </div>

          {/* Barra de Ritmo */}
          <div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(data.actualPercent, 100)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
                style={{ left: `${Math.min(data.expectedPercent, 100)}%` }}
                title={`Ritmo esperado: ${data.expectedPercent}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
              <span>Ritmo esperado al día: <strong>{data.expectedPercent}%</strong></span>
              <span className="text-amber-600 font-semibold">
                Va en {data.actualPercent}% y debería ir en {data.expectedPercent}%
              </span>
            </div>
          </div>
        </div>
      );

    // ------------------------------------------------------------------------
    // RESUMEN PIPELINE
    // ------------------------------------------------------------------------
    case 'pipeline_resumen':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Valor Total</p>
              <p className="text-base sm:text-lg font-black text-foreground truncate" title={`${(data.totalPipelineValue / 1000000).toFixed(1)}M`}>
                ${(data.totalPipelineValue / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg min-w-0">
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium truncate">Ponderado</p>
              <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-500 truncate" title={`${(data.weightedValue / 1000000).toFixed(1)}M`}>
                ${(data.weightedValue / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-muted border border-border rounded-lg min-w-0 col-span-2 sm:col-span-1">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Oportunidades</p>
              <p className="text-base sm:text-lg font-black text-foreground truncate">{data.totalDealsCount} tratos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(data.stages || []).map((st: any) => (
              <div key={st.stage} className="p-2 border border-border rounded-lg bg-card min-w-0">
                <p className="font-semibold text-foreground truncate" title={st.stage}>{st.stage}</p>
                <p className="text-muted-foreground text-[10px] sm:text-[11px] truncate">{st.count} tratos</p>
                <p className="font-bold text-primary text-[10px] sm:text-[11px] mt-0.5 truncate">${(st.value / 1000000).toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>
      );

    // ------------------------------------------------------------------------
    // PROYECTOS EN RIESGO
    // ------------------------------------------------------------------------
    case 'proyectos_en_riesgo': {
      const projects = data.projects || [];
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Proyectos retrasados o críticos</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
              {data.count || 0} en riesgo
            </span>
          </div>
          {projects.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
              No hay proyectos en riesgo actualmente.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((prj: any) => (
                <div
                  key={prj.id}
                  onClick={() => navigate(`/dashboard/produccion?projectId=${prj.id}`)}
                  className="p-3 rounded-lg border border-border/60 hover:border-primary/40 bg-card hover:bg-muted/40 transition-all cursor-pointer flex justify-between items-center"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground truncate">{prj.name}</span>
                      {prj.criticality === 'CRITICA' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">ID: {prj.id}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                      {prj.status}
                    </span>
                    <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                      {prj.delayDays} días req.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    // ------------------------------------------------------------------------
    // COTIZACIONES SIN SEGUIMIENTO
    // ------------------------------------------------------------------------
    case 'cotizaciones_sin_seguimiento':
      return (
        <div className="space-y-2">
          {(data.items || []).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
              <div>
                <p className="font-semibold text-foreground">{c.client}</p>
                <p className="text-[11px] text-muted-foreground">{c.value} · Sin contacto: {c.daysWithoutContact} días</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-600">
                {c.urgency}
              </span>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // CLIENTES CALIENTES
    // ------------------------------------------------------------------------
    case 'clientes_calientes':
      return (
        <div className="space-y-2">
          {(data.clients || []).map((cl: any) => (
            <div key={cl.id} className="p-2 rounded-lg bg-card border border-border text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{cl.name}</span>
                <span className="font-mono font-bold text-amber-600 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {cl.temp}°
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{cl.reason}</p>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // ACTIVIDAD DE LA SEMANA
    // ------------------------------------------------------------------------
    case 'actividad_semana':
      return (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted border border-border">
            <Phone className="w-4 h-4 mx-auto text-primary mb-1" />
            <span className="font-bold text-base text-foreground">{data.calls}</span>
            <p className="text-[10px] text-muted-foreground">Llamadas</p>
          </div>
          <div className="p-2 rounded-lg bg-muted border border-border">
            <Mail className="w-4 h-4 mx-auto text-primary mb-1" />
            <span className="font-bold text-base text-foreground">{data.emails}</span>
            <p className="text-[10px] text-muted-foreground">Correos</p>
          </div>
          <div className="p-2 rounded-lg bg-muted border border-border">
            <MessageSquare className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
            <span className="font-bold text-base text-foreground">{data.whatsapps}</span>
            <p className="text-[10px] text-muted-foreground">WhatsApp</p>
          </div>
          <div className="p-2 rounded-lg bg-muted border border-border">
            <MapPin className="w-4 h-4 mx-auto text-primary mb-1" />
            <span className="font-bold text-base text-foreground">{data.visits}</span>
            <p className="text-[10px] text-muted-foreground">Visitas</p>
          </div>
        </div>
      );

    // ------------------------------------------------------------------------
    // CAPACIDAD DE PLANTA CON CUELLO DE BOTELLA
    // ------------------------------------------------------------------------
    case 'capacidad_planta':
      return (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Cuello de Botella: {data.bottleneck}
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                Utilización crítica de la semana al {data.bottleneckUtilization}%
              </p>
            </div>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
              Alerta Operativa
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {(data.machines || []).map((m: any) => (
              <div key={m.name} className={`p-2 rounded-lg border ${m.isBottleneck ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-foreground truncate">{m.name}</span>
                  <span className="font-bold text-xs">{m.utilization}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.isBottleneck ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${m.utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // ------------------------------------------------------------------------
    // MARGEN REAL DEL MES (Financiero con permiso cost:read)
    // ------------------------------------------------------------------------
    case 'margen_real_mes':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black text-foreground">{data.actualMargin}%</p>
              <p className="text-[11px] text-muted-foreground">Margen real acumulado</p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${data.deviation < 0 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                Desviación: {data.deviation}%
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cotizado: {data.quotedMargin}%</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border">
            Causa principal: {data.varianceReason}
          </p>
        </div>
      );

    // ------------------------------------------------------------------------
    // CUMPLIMIENTO INDIVIDUAL DE TAREAS (Etapa 15.3)
    // ------------------------------------------------------------------------
    case 'cumplimiento_tareas': {
      const level = data.level || 'GREEN';
      const percent = data.compliancePercent ?? 0;
      const levelColors = {
        GREEN: { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500', badge: 'Verde · Óptimo' },
        AMBER: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500', badge: 'Ámbar · En Alerta' },
        RED: { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', bar: 'bg-red-500', badge: 'Rojo · Crítico' },
      }[level as 'GREEN' | 'AMBER' | 'RED'] || { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', bar: 'bg-primary', badge: 'Normal' };

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${levelColors.text}`}>{percent}%</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelColors.bg} ${levelColors.text} ${levelColors.border}`}>
                  {levelColors.badge}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Últimos {data.windowDays || 30} días (con gracia de 4h)</p>
            </div>
            <button
              onClick={() => navigate('/mi-rendimiento')}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver detalle
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Barra de progreso con gradiente semafórico */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${levelColors.bar} transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>

          {/* Conteo desglosado */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm block">{data.onTime ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">A tiempo</span>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="font-bold text-amber-700 dark:text-amber-400 text-sm block">{data.late ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">Con retraso</span>
            </div>
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="font-bold text-red-700 dark:text-red-400 text-sm block">{data.overdueOpen ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">Vencidas</span>
            </div>
            <div className="p-1.5 rounded-lg bg-muted border border-border">
              <span className="font-bold text-foreground text-sm block">{data.snoozedChronic ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">Pospuestas</span>
            </div>
          </div>

          {/* Frases explicativas humanas */}
          {data.explanation && Array.isArray(data.explanation) && data.explanation.length > 0 && (
            <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground space-y-1">
              {data.explanation.map((phrase: string, idx: number) => (
                <p key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-primary font-bold">·</span>
                  <span>{phrase}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // MI CAPACIDAD Y HORAS (Bifurcación Planta vs Comercial) (Etapa 15.3)
    // ------------------------------------------------------------------------
    case 'mi_capacidad': {
      const isProd = data.isProductionRole ?? false;

      if (isProd) {
        const util = data.utilizationPercent ?? 0;
        const isOverloaded = data.level === 'OVERLOADED' || util > 95;
        const levelStyle = isOverloaded
          ? { badge: 'Sobrecarga Crítica', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
          : data.level === 'TIGHT'
          ? { badge: 'Ajustado', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
          : data.level === 'HEALTHY'
          ? { badge: 'Saludable', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
          : { badge: 'Capacidad Disponible', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };

        return (
          <div className="space-y-3">
            {/* Alerta de sobrecarga estricta según regla de negocio */}
            {isOverloaded && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <p className="font-medium text-[11px]">
                  <strong>Sobrecarga no es logro:</strong> {util}% sostenido eleva el riesgo de reprocesos y entregas tarde.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-foreground">{util}%</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${levelStyle.bg} ${levelStyle.color} ${levelStyle.border}`}>
                    {levelStyle.badge}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{data.loggedHours}h registradas de {data.availableHours}h disponibles</p>
              </div>
              <button
                onClick={() => navigate('/mi-rendimiento')}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Mi jornada
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Métricas de horas */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-card border border-border">
                <span className="text-xs font-bold text-foreground block">{data.productiveHours ?? 0}h</span>
                <span className="text-[10px] text-muted-foreground">Productivas</span>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border">
                <span className="text-xs font-bold text-amber-600 block">{data.downtimeHours ?? 0}h</span>
                <span className="text-[10px] text-muted-foreground">Paros / Setup</span>
              </div>
              <div className={`p-2 rounded-lg border ${data.unregisteredHours > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border'}`}>
                <span className={`text-xs font-bold block ${data.unregisteredHours > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                  {data.unregisteredHours ?? 0}h
                </span>
                <span className="text-[10px] text-muted-foreground">Sin registrar</span>
              </div>
            </div>

            {/* Frases explicativas */}
            {data.explanation && Array.isArray(data.explanation) && (
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground space-y-1">
                {data.explanation.map((ph: string, i: number) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-primary font-bold">·</span>
                    <span>{ph}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }

      // Capacidad Comercial (ritmo contra meta de ventas / actividades)
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-xs">{data.goalTitle || 'Meta Comercial'}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-foreground">
                  ${((data.actualValue || 0) / 1000000).toFixed(1)}M
                </span>
                <span className="text-[11px] text-muted-foreground">
                  / ${((data.targetValue || 0) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${data.paceStatus === 'BEHIND' ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {data.attainmentPercent}%
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Ritmo: {data.pacePercent}%</p>
            </div>
          </div>

          {/* Barra de avance comercial */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, data.attainmentPercent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-foreground block">{data.quotesSent ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">Cotizaciones enviadas</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-foreground block">{data.visitsCompleted ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">Visitas comerciales</span>
            </div>
          </div>

          {data.explanation && Array.isArray(data.explanation) && (
            <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground space-y-1">
              {data.explanation.map((ph: string, i: number) => (
                <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-primary font-bold">·</span>
                  <span>{ph}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // CUMPLIMIENTO DEL EQUIPO (Supervisor/Gerencia) (Etapa 15.3)
    // ------------------------------------------------------------------------
    case 'cumplimiento_equipo': {
      if (data.unauthorized) {
        return (
          <div className="p-4 rounded-lg bg-muted/40 border border-dashed border-border text-center space-y-2">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="font-semibold text-xs text-foreground">Acceso Protegido por Privacidad</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Nadie ve el rendimiento de un par sin permiso expreso. Se requiere el permiso <code className="text-xs bg-muted px-1 py-0.5 rounded">performance:read_team</code>.
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{data.teamCompliancePercent}%</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Promedio Equipo
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{data.totalMembers || 4} colaboradores monitoreados</p>
            </div>
            <button
              onClick={() => navigate('/equipo/rendimiento')}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Tablero del equipo
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Distribución del semáforo */}
          {data.distribution && (
            <div className="space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                <div style={{ width: `${data.distribution.green || 0}%` }} className="bg-emerald-500 h-full" title={`Verde: ${data.distribution.green}%`} />
                <div style={{ width: `${data.distribution.amber || 0}%` }} className="bg-amber-500 h-full" title={`Ámbar: ${data.distribution.amber}%`} />
                <div style={{ width: `${data.distribution.red || 0}%` }} className="bg-red-500 h-full" title={`Rojo: ${data.distribution.red}%`} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="text-emerald-600 font-semibold">{data.distribution.green}% Verde</span>
                <span className="text-amber-600 font-semibold">{data.distribution.amber}% Ámbar</span>
                <span className="text-red-600 font-semibold">{data.distribution.red}% Rojo</span>
              </div>
            </div>
          )}

          {/* Lista de miembros */}
          <div className="space-y-1.5">
            {(data.members || []).map((m: any) => (
              <div key={m.name} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                <div>
                  <p className="font-semibold text-foreground">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${m.level === 'GREEN' ? 'text-emerald-600' : m.level === 'AMBER' ? 'text-amber-600' : 'text-red-600'}`}>
                    {m.compliancePercent}%
                  </span>
                  <span className={`w-2 h-2 rounded-full ${m.level === 'GREEN' ? 'bg-emerald-500' : m.level === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Explicación en frases */}
          {data.explanation && Array.isArray(data.explanation) && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
              {data.explanation.map((ph: string, i: number) => (
                <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-primary font-bold">·</span>
                  <span>{ph}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // SALUD DE INTEGRACIONES (Admin)
    // ------------------------------------------------------------------------
    case 'salud_integraciones':
      return (
        <div className="space-y-1.5">
          {(data.integrations || []).map((itg: any) => (
            <div key={itg.name} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-foreground">{itg.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-600 font-bold">{itg.latency}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{itg.lastPulse}</span>
              </div>
            </div>
          ))}
        </div>
      );

    // ------------------------------------------------------------------------
    // TABLERO DE ANUNCIOS (Etapa 15.4)
    // ------------------------------------------------------------------------
    case 'tablero_anuncios': {
      const announcements = data.announcements || [];
      if (announcements.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
            <Megaphone className="w-6 h-6 text-muted-foreground/60 mb-2" />
            <p className="font-semibold text-foreground">No hay comunicados publicados</p>
            <p className="text-[11px] mt-0.5">Los nuevos anuncios de dirección aparecerán aquí.</p>
          </div>
        );
      }

      return (
        <div className="space-y-2.5">
          {announcements.map((ann: any) => (
            <div
              key={ann.id}
              onClick={() => navigate(`/anuncios/${ann.id}`)}
              className="p-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      <Pin className="w-3 h-3" />
                      Fijado
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ann.priority === 'URGENT'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        : ann.priority === 'IMPORTANT'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {ann.priority === 'URGENT' ? 'Urgente' : ann.priority === 'IMPORTANT' ? 'Importante' : 'General'}
                  </span>
                  {ann.requiresAcknowledgement && (
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Acuse Requerido
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {ann.publishedAt ? new Date(ann.publishedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>

              <h4 className="text-xs font-bold text-foreground line-clamp-1 hover:text-primary transition-colors">
                {ann.title}
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {ann.summary}
              </p>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                <span>Por {ann.authorName}</span>
                <div className="flex items-center gap-3">
                  {ann.reactionsCount > 0 && <span>👍 {ann.reactionsCount}</span>}
                  {ann.commentsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {ann.commentsCount}
                    </span>
                  )}
                  <span className="text-primary flex items-center gap-0.5 font-medium">
                    Leer <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => navigate('/anuncios')}
            className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            Ir al Tablero Completo de Anuncios <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // ANUNCIOS SIN CONFIRMAR (Etapa 15.4)
    // ------------------------------------------------------------------------
    case 'anuncios_sin_confirmar': {
      const items = data.items || [];
      const pendingCount = data.pendingCount || items.length;

      if (pendingCount === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-5 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">¡Todo confirmado!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No tienes directivas ni comunicados obligatorios pendientes de acuse.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pendingCount} comunicado(s) requieren tu lectura</span>
            </div>
            <span className="text-[10px] font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">Pendiente</span>
          </div>

          <div className="space-y-2">
            {items.map((item: any) => (
              <div
                key={item.id}
                onClick={() => navigate(`/anuncios/${item.id}`)}
                className="p-2.5 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded">
                    Obligatorio
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('es-CO') : ''}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground line-clamp-1">
                  {item.title}
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-muted-foreground text-[10px]">De: {item.authorName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/anuncios/${item.id}`);
                    }}
                    className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Confirmar ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // MURO DE RECONOCIMIENTOS (Etapa 15.4)
    // ------------------------------------------------------------------------
    case 'reconocimientos': {
      const shoutouts = data.shoutouts || [];
      return (
        <div className="space-y-3">
          {shoutouts.length === 0 ? (
            <div className="text-center p-6 text-xs text-muted-foreground">
              <Award className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-semibold text-foreground">Aún no hay reconocimientos publicados</p>
              <p className="text-[11px] mt-0.5">¡Sé el primero en felicitar a un compañero!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shoutouts.map((sho: any) => (
                <div key={sho.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold text-foreground">{sho.fromUserName}</span>
                      <span className="text-muted-foreground text-[11px]">reconoció a</span>
                      <span className="font-bold text-primary">{sho.toUserNames.join(', ')}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                      {sho.valueKey}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/90 italic bg-muted/30 p-2 rounded-lg border-l-2 border-primary">
                    &ldquo;{sho.message}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(sho.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}</span>
                    {sho.reactionsCount > 0 && <span>👏 {sho.reactionsCount} reacciones</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/anuncios?tab=reconocimientos')}
            className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Reconocer a un compañero
          </button>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // MIS MENCIONES EN CHAT (Etapa 15.5)
    // ------------------------------------------------------------------------
    case 'mis_menciones': {
      const items = data.items || [];
      const unreadCount = data.unreadCount || 0;

      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <AtSign className="w-3.5 h-3.5 text-primary" />
              <span>Menciones recientes</span>
            </div>
            {unreadCount > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {unreadCount} sin leer
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Al día</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
              No tienes menciones pendientes en ningún canal.
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((it: any) => (
                <div
                  key={it.messageId}
                  onClick={() => navigate(`/chat?channelId=${it.channelId}`)}
                  className="p-2 rounded-lg border border-border/60 hover:border-primary/40 bg-card hover:bg-muted/40 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-primary truncate max-w-[130px]">
                      {it.channelName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(it.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">
                    <strong className="font-medium text-foreground/80">{it.authorName}: </strong>
                    {it.bodySnippet}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/chat')}
            className="w-full py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded border border-primary/20 transition-colors flex items-center justify-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Abrir Chat de Equipo
          </button>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // PRESENCIA DEL EQUIPO EN TIEMPO REAL (Etapa 15.5)
    // ------------------------------------------------------------------------
    case 'equipo_presencia': {
      const team = data.team || [];
      const summary = data.summary || {};

      const getStatusDot = (status: string) => {
        switch (status) {
          case 'ONLINE':
            return 'bg-emerald-500 ring-2 ring-emerald-500/20';
          case 'AWAY':
            return 'bg-amber-500 ring-2 ring-amber-500/20';
          case 'BUSY':
          case 'IN_CALL':
            return 'bg-rose-500 ring-2 ring-rose-500/20';
          default:
            return 'bg-slate-400';
        }
      };

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'ONLINE':
            return 'En línea';
          case 'AWAY':
            return 'Ausente';
          case 'BUSY':
            return 'Ocupado';
          case 'IN_CALL':
            return 'En llamada';
          default:
            return 'Desconectado';
        }
      };

      return (
        <div className="space-y-3">
          {/* Barra de resumen de estados */}
          <div className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{summary.onlineCount || 0} en línea</span>
            </div>
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{summary.awayCount || 0} ausentes</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{summary.offlineCount || 0} offline</span>
            </div>
          </div>

          {/* Lista de colaboradores con estado */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {team.map((member: any) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {member.name.charAt(0)}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusDot(
                        member.status
                      )}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
                      {member.customStatusEmoji && (
                        <span className="text-xs" title={member.customStatusText || ''}>
                          {member.customStatusEmoji}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {member.customStatusText || member.area || getStatusLabel(member.status)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => navigate(`/chat?targetUserId=${member.userId}`)}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title={`Enviar mensaje directo a ${member.name}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled
                    className="p-1 rounded text-muted-foreground/40 cursor-not-allowed"
                    title="Llamadas de voz disponibles en Etapa 15.6"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/chat')}
            className="w-full py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded border border-primary/20 transition-colors flex items-center justify-center gap-1"
          >
            <Users className="w-3.5 h-3.5" />
            Ver Directorio y Presencia Completa
          </button>
        </div>
      );
    }

    // Fallback genérico para otros widgets
    default: {
      const hasCount = typeof data?.count === 'number' || typeof data?.total === 'number';
      const countVal = data?.count ?? data?.total;
      
      let listItems = null;
      if (data && typeof data === 'object') {
         for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) {
               listItems = v;
               break;
            }
         }
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Datos Consolidados</span>
            {hasCount && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {countVal} total
              </span>
            )}
          </div>
          
          {listItems && listItems.length > 0 ? (
             <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
               {listItems.map((item: any, idx: number) => {
                  const title = item.name || item.title || item.id || item.client || `Item ${idx + 1}`;
                  const subtitle = item.status || item.stage || item.type || item.criticality || '';
                  const metric = item.value || item.amount || (item.delayDays ? item.delayDays + ' días' : '') || item.count || '';
                  
                  return (
                    <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card flex justify-between items-center gap-2 min-w-0">
                       <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{title}</p>
                          {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
                       </div>
                       {metric !== '' && (
                         <div className="shrink-0">
                            <span className="text-[11px] font-semibold text-primary">{metric}</span>
                         </div>
                       )}
                    </div>
                  )
               })}
             </div>
          ) : (
             <div className="grid grid-cols-2 gap-2">
                {Object.entries(data || {}).map(([k, v], i) => {
                   if (typeof v === 'object') return null;
                   return (
                     <div key={i} className="p-2 rounded-lg bg-muted/40 border border-border/40 min-w-0">
                       <p className="text-[10px] text-muted-foreground truncate uppercase">{k}</p>
                       <p className="text-xs font-bold text-foreground truncate">{String(v)}</p>
                     </div>
                   )
                })}
             </div>
          )}
        </div>
      );
    }
  }
};
