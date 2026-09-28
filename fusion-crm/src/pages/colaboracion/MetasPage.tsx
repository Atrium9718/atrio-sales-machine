import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  RefreshCw,
  TrendingUp,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  Play,
} from 'lucide-react';

export const MetasPage: React.FC = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    scope: 'ORGANIZATION',
    metricKey: 'revenue.sales.total',
    targetValue: '',
    period: 'MONTH',
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    direction: 'HIGHER_IS_BETTER',
    ownerName: 'Equipo General',
  });

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/goals?scope=${scopeFilter}&period=${periodFilter}`);
      const json = await res.json();
      if (json.success) {
        setGoals(json.goals || []);
      }
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [scopeFilter, periodFilter]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setMessage('Meta creada exitosamente.');
        setFormData({
          title: '',
          scope: 'ORGANIZATION',
          metricKey: 'revenue.sales.total',
          targetValue: '',
          period: 'MONTH',
          periodStart: new Date().toISOString().slice(0, 10),
          periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          direction: 'HIGHER_IS_BETTER',
          ownerName: 'Equipo General',
        });
        fetchGoals();
      } else {
        setMessage('Error: ' + json.error);
      }
    } catch (err: any) {
      setMessage('Error de conexión: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTriggerRollup = async () => {
    setLoading(true);
    try {
      await fetch('/api/goals/trigger-rollup', { method: 'POST' });
      setMessage('Cálculo de ritmo y consolidación completados.');
      fetchGoals();
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Metas y Objetivos Estratégicos</h1>
            <p className="text-xs text-muted-foreground">
              Monitoreo del ritmo de avance ponderado según el calendario de días hábiles colombianos (Ley Emiliani).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerRollup}
            disabled={loading}
            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
            title="Recalcular avance de todas las metas"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            Recalcular Ritmo
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Meta
          </button>
          <button
            onClick={fetchGoals}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
          {message}
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl text-xs">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <span className="px-2 text-muted-foreground font-medium text-[11px]">Alcance:</span>
          {(['ALL', 'ORGANIZATION', 'AREA', 'MACHINE', 'USER'] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setScopeFilter(sc)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${
                scopeFilter === sc
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sc === 'ALL' ? 'Todos' : sc}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <span className="px-2 text-muted-foreground font-medium text-[11px]">Período:</span>
          {(['ALL', 'MONTH', 'QUARTER', 'YEAR'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${
                periodFilter === p
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'ALL' ? 'Todos' : p}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE METAS CON RITMO */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pace = goal.pace || {};
            const status = pace.paceStatus || 'ON_TRACK';
            const statusColors = {
              AHEAD: { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Adelantado' },
              ON_TRACK: { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'A Tiempo' },
              AT_RISK: { text: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'En Riesgo' },
              BEHIND: { text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Atrasado' },
            }[status as 'AHEAD' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND'] || { text: 'text-foreground', bg: 'bg-muted', border: 'border-border', label: 'Sin Datos' };

            return (
              <div key={goal.id} className="p-5 rounded-xl bg-card border border-border space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                        {goal.scope}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {goal.period}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-foreground mt-1">{goal.title}</h3>
                    <p className="text-xs text-muted-foreground">Responsable: {goal.ownerName}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                    {statusColors.label}
                  </span>
                </div>

                {/* Valores de Avance */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Actual</span>
                    <span className="font-bold text-foreground text-sm">
                      {goal.actualValue > 1000000
                        ? `$ ${(goal.actualValue / 1000000).toFixed(1)}M`
                        : goal.actualValue}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Objetivo</span>
                    <span className="font-bold text-foreground text-sm">
                      {goal.targetValue > 1000000
                        ? `$ ${(goal.targetValue / 1000000).toFixed(1)}M`
                        : goal.targetValue}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Logro</span>
                    <span className="font-black text-primary text-sm">
                      {pace.attainmentPercent ?? 0}%
                    </span>
                  </div>
                </div>

                {/* Barra de progreso visual con marcador de ritmo esperado */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Avance Real: {pace.attainmentPercent ?? 0}%</span>
                    <span>Esperado hoy: {pace.expectedProgressPercent ?? 0}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, pace.attainmentPercent || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Frase explicativa del ritmo */}
                <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                  {pace.explanation || 'Calculando avance en base a días hábiles transcurridos.'}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-xl bg-card border border-border text-center space-y-4">
          <Target className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Sin metas ni objetivos registrados</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Aún no se han creado metas comerciales, operativas o de equipo para este período inicial.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Meta
          </button>
        </div>
      )}

      {/* MODAL CREAR META */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Crear Nueva Meta</h2>
            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Título de la Meta</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Facturación Nuevas Cuentas Q3"
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Alcance</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="ORGANIZATION">Organización</option>
                    <option value="AREA">Área</option>
                    <option value="MACHINE">Máquina</option>
                    <option value="USER">Usuario</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Período</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="MONTH">Mensual</option>
                    <option value="QUARTER">Trimestral</option>
                    <option value="YEAR">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Valor Objetivo</label>
                  <input
                    type="number"
                    required
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="Ej: 50000000"
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Dirección</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="HIGHER_IS_BETTER">Mayor es mejor (Ventas, OTD)</option>
                    <option value="LOWER_IS_BETTER">Menor es mejor (Desperdicio)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={formData.periodStart}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Responsable / Asignado</label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="Ej: Equipo Comercial Bogotá"
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  {creating ? 'Guardando...' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
