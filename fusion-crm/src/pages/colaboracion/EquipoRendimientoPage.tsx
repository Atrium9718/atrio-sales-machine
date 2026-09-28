import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  Clock,
  Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EquipoRendimientoPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('supervisor');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/performance/team?role=${userRole}`, {
        headers: {
          'x-user-role': userRole,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Error al cargar el rendimiento del equipo');
        setData(null);
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [userRole]);

  const handleTriggerRollup = async () => {
    setRunningJob('rollup');
    setJobMessage(null);
    try {
      const res = await fetch('/api/goals/trigger-rollup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setJobMessage('Rollup horario de metas y cumplimiento recalculado con éxito.');
        fetchTeamData();
      }
    } catch (err: any) {
      setJobMessage('Error al ejecutar cálculo de metas: ' + err.message);
    } finally {
      setRunningJob(null);
    }
  };

  const filteredMembers = (data?.members || []).filter((m: any) => {
    const matchesArea = selectedArea === 'ALL' || m.area.toLowerCase().includes(selectedArea.toLowerCase());
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArea && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* HEADER CON GESTIÓN DE ROL PARA TESTING DE PRIVACIDAD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Rendimiento y Capacidad del Equipo</h1>
            <p className="text-xs text-muted-foreground">
              Supervisión de cumplimiento de entregas, horas productivas y balance de carga de trabajo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de rol para probar restricción de privacidad */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <span className="px-2 text-muted-foreground font-medium text-[11px]">Probar como:</span>
            <button
              onClick={() => setUserRole('supervisor')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                userRole === 'supervisor'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Supervisor (Autorizado)
            </button>
            <button
              onClick={() => setUserRole('comercial')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                userRole === 'comercial'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Comercial (Sin permiso)
            </button>
          </div>

          <button
            onClick={fetchTeamData}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            title="Recargar datos del equipo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* BLOQUEO DE PRIVACIDAD ESTRICTO */}
      {error && (
        <div className="bg-card border border-red-500/30 rounded-xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Acceso Denegado por Privacidad</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              <strong>"Nadie ve el rendimiento de un par sin permiso."</strong>
              <br />
              Esta vista está restringida a supervisores y gerencia con el permiso{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
                performance:read_team
              </code>
              .
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setUserRole('supervisor')}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Cambiar a rol Supervisor
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL CUANDO TIENE PERMISOS */}
      {!error && data && (
        <div className="space-y-6">
          {/* BANNER REGLA MAESTRA SOBRECARGA */}
          {data.summary?.overloadedCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block mb-0.5">
                  Alerta Operativa: {data.summary.overloadedCount} miembro(s) con sobrecarga (&gt;95%)
                </strong>
                <p className="leading-relaxed">
                  <strong>Sobrecarga no es un logro:</strong> mantener colaboradores por encima de 95% de
                  capacidad sostenida genera fallas de calidad, fatiga y entregas tardías en planta. Evalúe
                  rebalancear turnos o redistribuir órdenes.
                </p>
              </div>
            </div>
          )}

          {/* TARJETAS RESUMEN DE EQUIPO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cumplimiento Promedio
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">{data.summary.avgCompliance}%</span>
                <span className="text-xs text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  Semáforo Verde
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Tasa global de tareas a tiempo</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Utilización Promedio
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">{data.summary.avgUtilization}%</span>
                <span className="text-xs text-muted-foreground">de jornada</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Horas efectivas registradas</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Distribución Semafórica
              </span>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex mt-2">
                <div
                  style={{ width: `${data.summary.distribution.green}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Verde: ${data.summary.distribution.green}%`}
                />
                <div
                  style={{ width: `${data.summary.distribution.amber}%` }}
                  className="bg-amber-500 h-full"
                  title={`Ámbar: ${data.summary.distribution.amber}%`}
                />
                <div
                  style={{ width: `${data.summary.distribution.red}%` }}
                  className="bg-red-500 h-full"
                  title={`Rojo: ${data.summary.distribution.red}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                <span className="text-emerald-600 font-semibold">{data.summary.distribution.green}% Verde</span>
                <span className="text-amber-600 font-semibold">{data.summary.distribution.amber}% Ámbar</span>
                <span className="text-red-600 font-semibold">{data.summary.distribution.red}% Rojo</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Horas sin Asentar
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${data.summary.unregisteredTotalHours > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                  {data.summary.unregisteredTotalHours}h
                </span>
                <span className="text-xs text-muted-foreground">en el equipo</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Requieren registro para costeo real</p>
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-muted px-3 py-1.5 rounded-lg text-xs">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador o cargo..."
                className="bg-transparent border-none outline-none text-foreground w-full text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                {(['ALL', 'Impresión', 'Acabados', 'Comercial', 'Preprensa'] as const).map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-2 py-0.5 rounded text-xs transition-all ${
                      selectedArea === area
                        ? 'bg-card text-foreground font-semibold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {area === 'ALL' ? 'Todas las áreas' : area}
                  </button>
                ))}
              </div>

              {/* Botón de recálculo manual de rollup de metas */}
              <button
                onClick={handleTriggerRollup}
                disabled={runningJob !== null}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                title="Ejecutar job horario de consolidación"
              >
                <Play className={`w-3.5 h-3.5 ${runningJob ? 'animate-spin' : 'text-primary'}`} />
                Consolidar Métricas
              </button>
            </div>
          </div>

          {jobMessage && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              {jobMessage}
            </div>
          )}

          {/* LISTA DE COLABORADORES */}
          <div className="space-y-3">
            {filteredMembers.map((member: any) => {
              const isOver = member.capacityLevel === 'OVERLOADED';
              const levelBadge = {
                GREEN: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
                AMBER: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                RED: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
              }[member.level as 'GREEN' | 'AMBER' | 'RED'];

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border bg-card transition-all ${
                    isOver ? 'border-amber-500/40 shadow-sm' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Info Básica */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">{member.name}</h3>
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
                            {member.area}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                      </div>
                    </div>

                    {/* Métricas Clave */}
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                          Cumplimiento
                        </span>
                        <span className={`text-base font-black px-2 py-0.5 rounded border inline-block mt-0.5 ${levelBadge}`}>
                          {member.compliancePercent}%
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                          Utilización
                        </span>
                        <span
                          className={`text-base font-black inline-block mt-0.5 ${
                            isOver ? 'text-red-600' : 'text-foreground'
                          }`}
                        >
                          {member.utilizationPercent}%
                        </span>
                        {isOver && (
                          <span className="text-[9px] font-bold block text-red-600 uppercase">Sobrecarga</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                          Sin Registrar
                        </span>
                        <span
                          className={`text-base font-bold inline-block mt-0.5 ${
                            member.unregisteredHours > 0 ? 'text-amber-600' : 'text-muted-foreground'
                          }`}
                        >
                          {member.unregisteredHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Frase Explicativa y Diagnóstico */}
                  <div className="mt-3 pt-3 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <span className="text-primary font-bold">Diagnóstico:</span>
                      <span>{member.explanation}</span>
                    </p>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {member.tasksOnTime} de {member.tasksDue} tareas cerradas a tiempo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
