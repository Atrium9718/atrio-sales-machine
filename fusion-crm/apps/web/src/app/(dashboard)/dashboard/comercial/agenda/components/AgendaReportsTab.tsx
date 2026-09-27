import React, { useMemo, useState } from 'react';
import { Download, BarChart2, Calendar as CalendarIcon, CheckCircle2, Percent, Users, AlertCircle } from 'lucide-react';
import type { FusionEmployee } from '@/context/FusionAuthContext';
import { APPOINTMENT_TYPES, type Appointment } from '@/lib/agendaStore';

interface Props {
  appointments: Appointment[];
  people: FusionEmployee[];
  onSave: (a: Appointment) => Promise<void>;
}

type Period = 'WEEK' | 'MONTH' | 'QUARTER';

function periodStart(period: Period, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'WEEK') d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
  else if (period === 'MONTH') d.setDate(1);
  else d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  return d;
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Métricas reales de la agenda: agendadas, realizadas, canceladas y citas pasadas sin cerrar. */
export function AgendaReportsTab({ appointments, people, onSave }: Props) {
  const [period, setPeriod] = useState<Period>('MONTH');
  const [person, setPerson] = useState('ALL');
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Sin asignar';

  const inPeriod = useMemo(() => {
    const from = periodStart(period).toISOString();
    return appointments.filter((a) => a.start >= from && (person === 'ALL' || a.organizerId === person));
  }, [appointments, period, person]);

  const now = new Date().toISOString();
  const done = inPeriod.filter((a) => a.status === 'REALIZADA');
  const cancelled = inPeriod.filter((a) => a.status === 'CANCELADA');
  const pendingClose = inPeriod.filter((a) => (a.status ?? 'PROGRAMADA') === 'PROGRAMADA' && a.end < now);
  const pastTotal = inPeriod.filter((a) => a.end < now).length;
  const compliance = pastTotal ? Math.round((done.length / pastTotal) * 100) : null;

  const byType = APPOINTMENT_TYPES.map((t) => ({ ...t, count: inPeriod.filter((a) => a.type === t.value).length }));
  const byPerson = people
    .map((p) => {
      const mine = inPeriod.filter((a) => a.organizerId === p.id);
      return { id: p.id, name: p.name, total: mine.length, done: mine.filter((a) => a.status === 'REALIZADA').length, cancelled: mine.filter((a) => a.status === 'CANCELADA').length };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const handleExport = () => {
    const header = ['Fecha', 'Inicio', 'Fin', 'Título', 'Tipo', 'Responsable', 'Cliente', 'Estado', 'Lugar'];
    const rows = inPeriod.map((a) => [
      new Date(a.start).toLocaleDateString('es-CO'),
      new Date(a.start).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      new Date(a.end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      a.visibility === 'PRIVATE' ? 'Privada' : a.title,
      APPOINTMENT_TYPES.find((t) => t.value === a.type)?.label ?? a.type,
      nameOf(a.organizerId),
      a.visibility === 'PRIVATE' ? '' : a.clientName,
      a.status ?? 'PROGRAMADA',
      a.visibility === 'PRIVATE' ? '' : a.location,
    ]);
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `agenda-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const Kpi = ({ icon, label, value, hint, tone = 'text-foreground' }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string; tone?: string }) => (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
      <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
        {icon} {label}
      </div>
      <div className={`text-3xl font-black ${tone}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-2">{hint}</div>
    </div>
  );

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Rendimiento de la agenda
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Calculado con las citas guardadas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
              <option value="WEEK">Esta semana</option>
              <option value="MONTH">Este mes</option>
              <option value="QUARTER">Este trimestre</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <select value={person} onChange={(e) => setPerson(e.target.value)} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
              <option value="ALL">Todo el equipo</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleExport} disabled={inPeriod.length === 0} className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted/80 disabled:opacity-50">
            <Download className="w-4 h-4" /> Exportar (Excel)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<CalendarIcon className="w-4 h-4" />} label="Agendadas" value={inPeriod.length} hint="En el periodo elegido" />
        <Kpi icon={<CheckCircle2 className="w-4 h-4" />} label="Realizadas" value={done.length} hint={`${cancelled.length} cancelada(s)`} tone="text-success" />
        <Kpi icon={<Percent className="w-4 h-4" />} label="Cumplimiento" value={compliance === null ? '—' : `${compliance}%`} hint="Realizadas / citas ya pasadas" tone="text-primary" />
        <Kpi icon={<AlertCircle className="w-4 h-4" />} label="Sin cerrar" value={pendingClose.length} hint="Citas pasadas sin marcar resultado" tone={pendingClose.length ? 'text-amber-600' : 'text-foreground'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Por tipo</h3>
          <div className="space-y-3">
            {byType.map((t) => {
              const pct = inPeriod.length ? Math.round((t.count / inPeriod.length) * 100) : 0;
              return (
                <div key={t.value}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{t.label}</span>
                    <span className="text-muted-foreground">
                      {t.count} · {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm lg:col-span-2">
          <h3 className="font-bold text-foreground mb-4">Por comercial</h3>
          {byPerson.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay citas en este periodo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2">Comercial</th>
                  <th className="py-2 text-right">Agendadas</th>
                  <th className="py-2 text-right">Realizadas</th>
                  <th className="py-2 text-right">Canceladas</th>
                </tr>
              </thead>
              <tbody>
                {byPerson.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-right">{r.total}</td>
                    <td className="py-2 text-right text-success">{r.done}</td>
                    <td className="py-2 text-right text-muted-foreground">{r.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {pendingClose.length > 0 && (
        <div className="bg-card p-5 rounded-xl border border-amber-500/30 shadow-sm">
          <h3 className="font-bold text-foreground mb-1">Citas pasadas sin cerrar</h3>
          <p className="text-xs text-muted-foreground mb-4">Marca cómo terminó cada una para que el cumplimiento sea real.</p>
          <div className="divide-y divide-border">
            {pendingClose.map((a) => (
              <div key={a.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="w-28 text-xs text-muted-foreground">{new Date(a.start).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                <span className="flex-1 min-w-[160px] font-medium truncate">
                  {a.title}
                  {a.clientName ? ` · ${a.clientName}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">{nameOf(a.organizerId)}</span>
                <button onClick={() => onSave({ ...a, status: 'REALIZADA' })} className="px-2 py-1 text-xs font-bold rounded bg-success/10 text-success hover:bg-success/20">
                  Realizada
                </button>
                <button onClick={() => onSave({ ...a, status: 'CANCELADA' })} className="px-2 py-1 text-xs font-bold rounded bg-muted hover:bg-muted/70">
                  Cancelada
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
