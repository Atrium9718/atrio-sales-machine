import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bogotaYmd, DEFAULT_WORK_CALENDAR, type WorkCalendar } from '../../../../../../../../packages/core/src/calendar/workCalendar';
import { BUCKET_LABEL, buildWorkload, type DueBucket, type LoadProject, type LoadStage } from '../workload';

const BUCKET_STYLE: Record<DueBucket, string> = {
  OVERDUE: 'border-red-500/40 bg-red-500/5',
  TODAY: 'border-amber-500/40 bg-amber-500/5',
  SOON: 'border-blue-500/30 bg-blue-500/5',
  LATER: 'border-border',
  NO_DATE: 'border-dashed border-border',
};

const fmt = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });

/** Carga y entregas con datos reales (reemplaza el Gantt simulado). */
export function WorkloadView({ projects, stages, onOpen }: { projects: LoadProject[]; stages: LoadStage[]; onOpen: (id: string) => void }) {
  const [calendar, setCalendar] = useState<WorkCalendar>(DEFAULT_WORK_CALENDAR);
  useEffect(() => {
    fetch('/api/admin/work-calendar')
      .then((r) => r.json())
      .then((d) => d?.success && setCalendar(d.calendar))
      .catch(() => undefined);
  }, []);

  const today = bogotaYmd(new Date());
  const { byBucket, byStage, rows } = useMemo(() => buildWorkload(projects, stages, calendar, today), [projects, stages, calendar, today]);
  const max = Math.max(1, ...byStage.map((s) => s.total));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
          <h3 className="font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Carga por etapa ({rows.length} OT activas)
          </h3>
          <Link to="/dashboard/admin/calendario" className="text-xs text-primary hover:underline">
            Los días hábiles salen del calendario laboral
          </Link>
        </div>
        <div className="space-y-2">
          {byStage.map(({ stage, total, overdue }) => (
            <div key={stage.id} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-right shrink-0 font-medium">{stage.name}</span>
              <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                <div className="h-full bg-primary/70" style={{ width: `${(total / max) * 100}%` }} />
                {overdue > 0 && <div className="absolute inset-y-0 left-0 bg-red-500/80" style={{ width: `${(overdue / max) * 100}%` }} />}
              </div>
              <span className="w-24 shrink-0 text-xs">
                <b>{total}</b> OT{overdue > 0 && <span className="text-red-600"> · {overdue} atrasada(s)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {byBucket
          .filter((b) => b.rows.length || b.bucket !== 'LATER')
          .map(({ bucket, rows: list }) => (
            <div key={bucket} className={`border rounded-xl p-4 bg-card ${BUCKET_STYLE[bucket]}`}>
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                {bucket === 'OVERDUE' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                {BUCKET_LABEL[bucket]} <span className="text-muted-foreground font-normal">({list.length})</span>
              </h4>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ninguna.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {list.map((r) => (
                    <button key={r.project.id} onClick={() => onOpen(r.project.id)} className="w-full text-left p-2 rounded-lg bg-background border border-border hover:border-primary/50 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold font-mono">{r.project.number || r.project.id}</span>
                        <span className="text-muted-foreground shrink-0">
                          {r.due ? fmt(r.due) : bucket === 'NO_DATE' && r.project.dueDate ? String(r.project.dueDate).slice(0, 24) : ''}
                          {r.workingDaysLeft !== null && r.workingDaysLeft !== 0 && (
                            <span className={r.workingDaysLeft < 0 ? 'text-red-600 font-bold' : ''}>
                              {' '}
                              · {r.workingDaysLeft < 0 ? `${-r.workingDaysLeft} háb. tarde` : `${r.workingDaysLeft} háb.`}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="truncate">
                        {r.project.client} — {r.project.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{r.stage?.name ?? 'Sin etapa'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
