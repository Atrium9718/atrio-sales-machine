import * as React from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, GraduationCap, Trash2, Eye, EyeOff, Wallet } from 'lucide-react';
import { notify } from '@/lib/notify';
import { inboxApi, timeAgo, type AiCorrection, type BudgetStatus, type EvalRun } from './api';

const cop = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const KIND_LABEL: Record<AiCorrection['kind'], string> = { editada: 'Corregida', descartada: 'Descartada', reemplazada: 'Reemplazada' };

/** Calidad y costo de la IA: gasto del mes, correcciones del equipo y evaluación de los agentes. */
export function AiQualityPanel({ canEdit }: { canEdit: boolean }) {
  const [budget, setBudget] = React.useState<BudgetStatus | null>(null);
  const [corrections, setCorrections] = React.useState<AiCorrection[] | null>(null);
  const [runs, setRuns] = React.useState<EvalRun[] | null>(null);
  const [running, setRunning] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  const load = React.useCallback(() => {
    inboxApi.budget().then(setBudget).catch(() => setBudget(null));
    inboxApi.corrections().then(setCorrections).catch(() => setCorrections([]));
    inboxApi.evals().then(setRuns).catch(() => setRuns([]));
  }, []);
  React.useEffect(load, [load]);

  const runEvals = async () => {
    setRunning(true);
    try {
      const run = await inboxApi.runEvals();
      setRuns((prev) => [run, ...(prev ?? [])]);
      notify(`Evaluación terminada: ${run.passed} de ${run.total} casos correctos.`, run.passed === run.total ? 'success' : 'error');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const toggle = async (c: AiCorrection) => {
    try {
      await inboxApi.setCorrectionActive(c.id, !c.active);
      setCorrections((list) => list?.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)) ?? null);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const remove = async (c: AiCorrection) => {
    if (!confirm('¿Borrar esta corrección?')) return;
    try {
      await inboxApi.deleteCorrection(c.id);
      setCorrections((list) => list?.filter((x) => x.id !== c.id) ?? null);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const last = runs?.[0];
  const visibleCorrections = showAll ? corrections ?? [] : (corrections ?? []).slice(0, 5);

  return (
    <div className="space-y-4">
      {budget && budget.budgetCop ? (
        <section className={`bg-card border rounded-xl p-4 space-y-2 ${budget.level === 'exceeded' ? 'border-destructive/40' : budget.level === 'warning' ? 'border-amber-500/40' : 'border-border'}`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Gasto del mes en IA y mensajería
          </h3>
          <div className="flex justify-between text-sm">
            <span>
              {cop(budget.spentCop)} de {cop(budget.budgetCop)}
            </span>
            <span className="font-bold">{Math.round((budget.percent ?? 0) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full ${budget.level === 'exceeded' ? 'bg-destructive' : budget.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (budget.percent ?? 0) * 100)}%` }}
            />
          </div>
          {budget.aiPaused && <p className="text-xs text-destructive font-semibold">Se superó el tope: la IA está en pausa y todo pasa a tu equipo hasta el próximo mes o hasta que subas el tope.</p>}
        </section>
      ) : null}

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Evaluar a los agentes
          </h3>
          {canEdit && (
            <button onClick={runEvals} disabled={running} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />} {running ? 'Evaluando… (≈1 min)' : 'Evaluar ahora'}
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Casos de prueba con clientes ficticios (no envía nada): consulta de pedidos, verificación, que no dé precios, que no revele datos de otros clientes aunque se lo pidan, y que pase las
          quejas a una persona. Hazlo antes de activar el modo automático y cada vez que cambies «Lo que la IA debe saber».
        </p>
        {last ? (
          <div>
            <div className={`text-sm font-bold mb-2 ${last.passed === last.total ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
              {last.passed} de {last.total} correctos · {timeAgo(last.at)}
            </div>
            <div className="divide-y divide-border border border-border rounded-lg">
              {last.results.map((r) => (
                <details key={r.id} className="px-3 py-2 text-sm">
                  <summary className="cursor-pointer flex items-center gap-2 list-none">
                    {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                    <span className="flex-1">{r.title}</span>
                    {!r.passed && <span className="text-xs text-destructive">{r.failures[0]}</span>}
                  </summary>
                  <div className="mt-2 text-xs space-y-1 pl-6">
                    <div>
                      <b>Respuesta:</b> {r.reply || '(sin respuesta)'}
                    </div>
                    <div className="text-muted-foreground">
                      {r.handoff ? 'Pasó a una persona · ' : ''}
                      {r.verified ? 'Cliente verificado · ' : ''}
                      {r.tools.length ? `Consultó: ${r.tools.join(', ')}` : 'Sin consultas'}
                    </div>
                    {r.failures.map((f) => (
                      <div key={f} className="text-destructive">
                        • {f}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{runs === null ? 'Cargando…' : 'Aún no se ha evaluado.'}</p>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Lo que la IA aprendió de tu equipo
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Cada vez que alguien corrige, descarta o reemplaza una respuesta sugerida, queda aquí. Las más recientes se le dan a la IA como ejemplos de cómo responder. Excluye las que no quieras que
          imite.
        </p>
        {corrections === null ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : corrections.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todavía no hay correcciones. Aparecen cuando el equipo corrige respuestas en modo sugerencia.</p>
        ) : (
          <div className="space-y-2">
            {visibleCorrections.map((c) => (
              <div key={c.id} className={`border rounded-lg p-3 text-xs space-y-1 ${c.active ? 'border-border' : 'border-dashed border-border opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {KIND_LABEL[c.kind]} por {c.by} · {timeAgo(c.at)}
                  </span>
                  {canEdit && (
                    <span className="flex gap-1">
                      <button onClick={() => toggle(c)} className="p-1 rounded hover:bg-muted" title={c.active ? 'Excluir de los ejemplos' : 'Volver a usar como ejemplo'}>
                        {c.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => remove(c)} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="Borrar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <div>
                  <b>Cliente:</b> {c.question || '—'}
                </div>
                <div className="text-muted-foreground line-through decoration-destructive/50">
                  <b>IA:</b> {c.aiText}
                </div>
                {c.finalText && (
                  <div className="text-emerald-800 dark:text-emerald-300">
                    <b>Equipo:</b> {c.finalText}
                  </div>
                )}
              </div>
            ))}
            {corrections.length > 5 && (
              <button onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-primary">
                {showAll ? 'Ver menos' : `Ver las ${corrections.length}`}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
