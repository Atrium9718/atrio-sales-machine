import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  Activity,
  Award,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldCheck,
  Zap,
  Briefcase,
  User,
  Flame,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MiRendimientoPage: React.FC = () => {
  const [role, setRole] = useState<'comercial' | 'produccion' | 'planta'>('comercial');
  const [dateRange, setDateRange] = useState<'7D' | '14D' | '30D'>('30D');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tareas' | 'capacidad' | 'metas'>('tareas');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/me?role=${role}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role, dateRange]);

  const taskCompliance = data?.taskCompliance;
  const capacity = data?.capacity;
  const isProduction = role === 'produccion' || role === 'planta';

  const complianceLevel = taskCompliance?.level || 'GREEN';
  const compColor = {
    GREEN: { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'Nivel Verde · Óptimo' },
    AMBER: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'Nivel Ámbar · En Alerta' },
    RED: { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'Nivel Rojo · Crítico' },
  }[complianceLevel as 'GREEN' | 'AMBER' | 'RED'];

  const utilPercent = capacity?.utilizationPercent ?? 0;
  const isOverloaded = capacity?.level === 'OVERLOADED' || utilPercent > 95;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* HEADER & SELECTOR DE ROL PARA AUDITORÍA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Mi Rendimiento y Capacidad</h1>
            <p className="text-xs text-muted-foreground">
              Métricas individuales calculadas con cortes diarios, período de gracia de 4h y análisis de jornada.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de rol */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <span className="px-2 text-muted-foreground font-medium text-[11px]">Rol activo:</span>
            {(['comercial', 'produccion', 'planta'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  role === r
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Selector de rango de días */}
          <div className="flex items-center bg-muted p-1 rounded-lg text-xs">
            {(['7D', '14D', '30D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dateRange === r
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            title="Recargar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-border text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('tareas')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tareas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Cumplimiento de Tareas
        </button>
        <button
          onClick={() => setActiveTab('capacidad')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'capacidad'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          Capacidad y Horas ({isProduction ? 'Planta' : 'Comercial'})
        </button>
        <button
          onClick={() => setActiveTab('metas')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'metas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4" />
          Metas y Ritmo de Avance
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CUMPLIMIENTO DE TAREAS */}
      {/* ==================================================================== */}
      {activeTab === 'tareas' && (
        <div className="space-y-5">
          {/* Tarjeta Principal de Cumplimiento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`md:col-span-2 p-5 rounded-xl border ${compColor.bg} ${compColor.border} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tasa de Cumplimiento
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${compColor.bg} ${compColor.text} ${compColor.border}`}>
                  {compColor.badge}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-black ${compColor.text}`}>
                  {taskCompliance?.compliancePercent ?? 0}%
                </span>
                <span className="text-xs text-muted-foreground">
                  en la ventana de los últimos {dateRange === '30D' ? 30 : dateRange === '14D' ? 14 : 7} días
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    complianceLevel === 'GREEN' ? 'bg-emerald-500' : complianceLevel === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${taskCompliance?.compliancePercent || 0}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Regla de cálculo: tareas completadas dentro del plazo o con hasta <strong>4 horas de gracia</strong> se clasifican a tiempo.
              </p>
            </div>

            {/* Desglose de Estado de Tareas */}
            <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A Tiempo</span>
                <p className="text-3xl font-black text-emerald-600 mt-1">{taskCompliance?.onTime ?? 0}</p>
              </div>
              <div className="pt-3 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Con Retraso</span>
                <p className="text-xl font-bold text-amber-600 mt-0.5">{taskCompliance?.late ?? 0}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencidas Abiertas</span>
                <p className="text-3xl font-black text-red-600 mt-1">{taskCompliance?.overdueOpen ?? 0}</p>
              </div>
              <div className="pt-3 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pospuestas Crónicas</span>
                <p className="text-xl font-bold text-muted-foreground mt-0.5">{taskCompliance?.snoozedChronic ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Pospuestas 3 o más veces</p>
              </div>
            </div>
          </div>

          {/* Explicación en Frases Humanas */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              Diagnóstico del Sistema
            </h3>
            {taskCompliance?.explanation && Array.isArray(taskCompliance.explanation) ? (
              <div className="space-y-1.5 text-xs text-foreground">
                {taskCompliance.explanation.map((ph: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{ph}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay observaciones registradas para este período.</p>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CAPACIDAD Y HORAS */}
      {/* ==================================================================== */}
      {activeTab === 'capacidad' && (
        <div className="space-y-5">
          {/* Alerta de regla estricta de sobrecarga */}
          {isOverloaded && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-900 dark:text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block mb-0.5">
                  Sobrecarga no es un logro
                </strong>
                Por encima del 95% de utilización sostenido el sistema emite una alerta prioritaria, porque es
                allí donde estadísticamente se originan los reprocesos, las mermas y las entregas tardías. Se
                recomienda rebalancear órdenes o solicitar apoyo.
              </div>
            </div>
          )}

          {isProduction ? (
            /* Vista Planta / Producción */
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Utilización Semanal
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-foreground">{utilPercent}%</span>
                    <span className="text-xs text-muted-foreground">de la jornada</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isOverloaded ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, utilPercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Horas registradas: {capacity?.loggedHours}h / Disponibles: {capacity?.availableHours}h
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Eficiencia Operativa
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-600">
                      {capacity?.efficiencyPercent ?? 0}%
                    </span>
                    <span className="text-xs text-muted-foreground">horas estándar / registradas</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tiempo productivo neto: {capacity?.productiveHours}h
                  </p>
                </div>

                <div className={`p-5 rounded-xl border ${capacity?.unregisteredHours > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border'} space-y-2`}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Huecos de Registro
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black ${capacity?.unregisteredHours > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                      {capacity?.unregisteredHours ?? 0}h
                    </span>
                    <span className="text-xs text-muted-foreground">sin asentar en jornada</span>
                  </div>
                  {capacity?.unregisteredHours > 0 ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Atención: existen días donde la jornada no tiene horas de producción asentadas.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Jornada 100% registrada al día.</p>
                  )}
                </div>
              </div>

              {/* Registro de Paros y Tiempos Muertos */}
              <div className="p-5 rounded-xl bg-card border border-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Desglose de Paros y Tiempos Improductivos
                </h3>
                {capacity?.downtimeReasons && capacity.downtimeReasons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {capacity.downtimeReasons.map((d: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/40 border border-border flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">{d.reason}</span>
                        <span className="font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                          {d.hours} horas
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin registros de paro en este período.</p>
                )}
              </div>
            </div>
          ) : (
            /* Vista Comercial */
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Meta de Ventas Asignada
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground">$ 0</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Período inicial sin meta configurada</p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ventas Facturadas / Cerradas
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">$ 0</span>
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      0%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Sin actividad comercial registrada en este período inicial</p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actividades Comerciales
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-muted rounded">
                      <span className="font-bold text-base block text-foreground">0</span>
                      <span className="text-[10px] text-muted-foreground">Cotizaciones</span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="font-bold text-base block text-foreground">0</span>
                      <span className="text-[10px] text-muted-foreground">Visitas Técnicas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: METAS Y RITMO */}
      {/* ==================================================================== */}
      {activeTab === 'metas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Mis Metas y Objetivos Activos</h2>
              <p className="text-xs text-muted-foreground">
                Cálculo de ritmo normalizado contra el calendario laboral de Colombia (días hábiles reales).
              </p>
            </div>
            <Link
              to="/metas"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas las metas corporativas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(data?.goals && data.goals.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.goals.map((goal: any) => (
                <div key={goal.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                        {goal.scope}
                      </span>
                      <h3 className="font-bold text-sm text-foreground mt-1.5">{goal.title}</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {goal.direction === 'LOWER_IS_BETTER' ? 'Menor es mejor' : 'Mayor es mejor'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Actual</p>
                      <p className="font-bold text-foreground text-base">
                        {typeof goal.actualValue === 'number' && goal.actualValue > 1000000
                          ? `$ ${(goal.actualValue / 1000000).toFixed(1)}M`
                          : goal.actualValue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Objetivo</p>
                      <p className="font-bold text-foreground text-base">
                        {typeof goal.targetValue === 'number' && goal.targetValue > 1000000
                          ? `$ ${(goal.targetValue / 1000000).toFixed(1)}M`
                          : goal.targetValue}
                      </p>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (goal.actualValue / (goal.targetValue || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-3">
              <Award className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="text-sm font-bold text-foreground">Sin metas individuales asignadas</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Aún no tienes objetivos personales o de área asignados para este período inicial.
              </p>
              <Link
                to="/metas"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
              >
                Explorar metas de la empresa <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
