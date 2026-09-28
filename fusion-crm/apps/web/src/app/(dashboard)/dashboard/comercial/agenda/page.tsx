import React, { useEffect, useMemo, useState } from 'react';
import { AppointmentModal } from './components/AppointmentModal';
import { AgendaReportsTab } from './components/AgendaReportsTab';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, LayoutList, MapPin, Plus, Users, Lock, Video } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useFusionAuth } from '@/context/FusionAuthContext';
import { APPOINTMENT_TYPES, appointmentsCollection, type Appointment } from '@/lib/agendaStore';

type ViewMode = 'day' | 'week' | 'month' | 'list';

const COLORS = [
  'bg-primary border-primary',
  'bg-emerald-500 border-emerald-600',
  'bg-amber-500 border-amber-600',
  'bg-sky-500 border-sky-600',
  'bg-rose-500 border-rose-600',
  'bg-violet-500 border-violet-600',
  'bg-teal-500 border-teal-600',
  'bg-orange-500 border-orange-600',
];

const typeLabel = (t: string) => APPOINTMENT_TYPES.find((x) => x.value === t)?.label ?? t;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
const sameDay = (iso: string, d: Date) => new Date(iso).toDateString() === d.toDateString();

function useAppointments() {
  const [items, setItems] = useState<Appointment[]>(appointmentsCollection.getAll());
  const [loading, setLoading] = useState(!appointmentsCollection.isHydrated());
  useEffect(() => {
    const refresh = () => setItems([...appointmentsCollection.getAll()]);
    window.addEventListener('fusion_appointments_updated', refresh);
    appointmentsCollection
      .hydrate()
      .catch(() => notify('No se pudo cargar la agenda. Revisa la conexión.', 'error'))
      .finally(() => setLoading(false));
    return () => window.removeEventListener('fusion_appointments_updated', refresh);
  }, []);
  return { items, loading };
}

export default function AgendaComercialPage() {
  const { currentUser, employees } = useFusionAuth();
  const { items: appointments, loading } = useAppointments();
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'REPORTS'>('CALENDAR');
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedUsers, setSelectedUsers] = useState<string[]>(currentUser ? [currentUser.id] : []);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [modal, setModal] = useState<{ open: boolean; appointment?: Appointment | null; date?: Date }>({ open: false });

  const people = useMemo(() => {
    const active = employees.filter((e) => e.status !== 'INACTIVO');
    const list = currentUser && !active.some((e) => e.id === currentUser.id) ? [currentUser, ...active] : active;
    // Yo primero; después por nombre
    return [...list].sort((a, b) => (a.id === currentUser?.id ? -1 : b.id === currentUser?.id ? 1 : a.name.localeCompare(b.name)));
  }, [employees, currentUser]);
  const colorOf = (id: string) => COLORS[Math.max(0, people.findIndex((p) => p.id === id)) % COLORS.length];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Sin asignar';

  useEffect(() => {
    if (currentUser && selectedUsers.length === 0) setSelectedUsers([currentUser.id]);
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [startOfWeek]
  );

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') return setCurrentDate(new Date());
    const d = new Date(currentDate);
    const sign = direction === 'next' ? 1 : -1;
    if (view === 'month' || view === 'list') d.setMonth(d.getMonth() + sign);
    else d.setDate(d.getDate() + sign * (view === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const visibleAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'CANCELADA')
        .filter((a) => selectedUsers.includes(a.organizerId) || (a.attendeeIds ?? []).some((id) => selectedUsers.includes(id)))
        .filter((a) => typeFilter === 'ALL' || a.type === typeFilter)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, selectedUsers, typeFilter]
  );

  const canSeeDetails = (a: Appointment) =>
    a.visibility !== 'PRIVATE' || a.organizerId === currentUser?.id || (a.attendeeIds ?? []).includes(currentUser?.id ?? '');

  const openAppointment = (a: Appointment) => {
    if (!canSeeDetails(a)) return;
    setModal({ open: true, appointment: a });
  };

  const saveAppointment = async (a: Appointment) => {
    await appointmentsCollection.save(a);
    notify('Cita guardada.', 'success');
  };

  const deleteAppointment = async (id: string) => {
    await appointmentsCollection.remove(id);
    notify('Cita eliminada.');
  };

  const START_HOUR = 6;
  const END_HOUR = 21;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  const eventPosition = (a: Appointment) => {
    const s = new Date(a.start);
    const e = new Date(a.end);
    if (a.allDay) return { top: '0%', height: '6%' };
    const startMins = s.getHours() * 60 + s.getMinutes() - START_HOUR * 60;
    const duration = Math.max(20, (e.getTime() - s.getTime()) / 60000);
    const top = Math.min(95, Math.max(0, (startMins / TOTAL_MINUTES) * 100));
    return { top: `${top}%`, height: `${Math.min(100 - top, (duration / TOTAL_MINUTES) * 100)}%` };
  };

  const renderEvent = (a: Appointment, columnIndex = 0, columnCount = 1) => {
    const show = canSeeDetails(a);
    const width = 90 / columnCount;
    return (
      <div
        key={a.id}
        onClick={() => openAppointment(a)}
        className={`absolute rounded-md p-1.5 text-xs overflow-hidden border shadow-sm flex flex-col gap-0.5 hover:z-10 hover:shadow-md ${show ? `${colorOf(a.organizerId)} text-white cursor-pointer` : 'bg-muted/80 border-border text-muted-foreground repeating-lines'}`}
        style={{ ...eventPosition(a), width: `${width}%`, left: `${5 + width * columnIndex}%` }}
        title={show ? a.title : 'Ocupado'}
      >
        <span className="font-bold truncate leading-tight">{show ? a.title : 'Ocupado'}</span>
        {show ? (
          <>
            <div className="opacity-90 flex items-center gap-1 truncate text-[10px]">
              <Clock className="w-3 h-3 shrink-0" />
              {a.allDay ? 'Todo el día' : `${timeOf(a.start)} - ${timeOf(a.end)}`}
            </div>
            {a.clientName && <div className="opacity-90 truncate text-[10px]">{a.clientName}</div>}
            <div className="mt-auto flex items-center justify-between opacity-80 pt-1 text-[9px] font-bold uppercase">
              <span>{typeLabel(a.type)}</span>
              {a.meetingUrl && <Video className="w-3 h-3" />}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1 mt-1 opacity-70">
            <Lock className="w-3 h-3" /> Privado
          </div>
        )}
      </div>
    );
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  const hourColumn = (
    <div className="w-16 flex flex-col border-r border-border bg-muted/20 shrink-0 pt-12">
      {hours.slice(0, -1).map((h) => (
        <div key={h} className="h-16 border-b border-border/50 text-[10px] text-muted-foreground font-medium p-1 text-right">
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );

  const dayColumnBody = (events: Appointment[], onEmptyClick: () => void) => (
    <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 4}rem` }} onDoubleClick={onEmptyClick}>
      {hours.slice(0, -1).map((h) => (
        <div key={h} className="absolute w-full border-b border-border/30 h-16 pointer-events-none" style={{ top: `${(h - START_HOUR) * 4}rem` }} />
      ))}
      {events.map((a, i) => renderEvent(a, i % Math.min(events.length, 3), Math.min(events.length, 3)))}
    </div>
  );

  const renderGrid = () => {
    if (view === 'week') {
      return (
        <div className="flex flex-1 overflow-auto bg-card rounded-b-xl border-x border-b border-border">
          {hourColumn}
          <div className="flex flex-1">
            {weekDays.map((day) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={day.toISOString()} className="flex-1 flex flex-col border-r border-border min-w-[120px]">
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-border shrink-0 sticky top-0 z-20 ${isToday ? 'bg-primary/5' : 'bg-card'}`}>
                    <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
                    <span className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>{day.getDate()}</span>
                  </div>
                  {dayColumnBody(
                    visibleAppointments.filter((a) => sameDay(a.start, day)),
                    () => setModal({ open: true, date: day })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (view === 'day') {
      return (
        <div className="flex flex-1 overflow-auto bg-card rounded-b-xl border-x border-b border-border">
          {hourColumn}
          <div className="flex flex-1">
            {selectedUsers.map((uid) => (
              <div key={uid} className="flex-1 flex flex-col border-r border-border min-w-[200px]">
                <div className="h-12 flex items-center justify-center gap-2 border-b border-border shrink-0 sticky top-0 z-20 bg-card">
                  <div className={`w-3 h-3 rounded-full ${colorOf(uid).split(' ')[0]}`} />
                  <span className="font-bold text-sm text-foreground">{nameOf(uid)}</span>
                </div>
                {dayColumnBody(
                  visibleAppointments.filter((a) => (a.organizerId === uid || (a.attendeeIds ?? []).includes(uid)) && sameDay(a.start, currentDate)),
                  () => setModal({ open: true, date: currentDate })
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'month') {
      const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const gridStart = new Date(first);
      gridStart.setDate(first.getDate() - ((first.getDay() || 7) - 1));
      const cells = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
      });
      return (
        <div className="flex-1 grid grid-cols-7 auto-rows-fr border-x border-b border-border rounded-b-xl bg-card overflow-auto">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
            <div key={d} className="text-[10px] font-bold uppercase text-muted-foreground text-center py-1 border-b border-border">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const events = visibleAppointments.filter((a) => sameDay(a.start, d));
            const outside = d.getMonth() !== currentDate.getMonth();
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={d.toISOString()}
                onDoubleClick={() => setModal({ open: true, date: d })}
                className={`min-h-[90px] border-r border-b border-border p-1 space-y-0.5 ${outside ? 'bg-muted/20 text-muted-foreground' : ''}`}
              >
                <div className={`text-xs font-bold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</div>
                {events.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openAppointment(a)}
                    className={`w-full text-left truncate text-[10px] px-1 rounded text-white ${canSeeDetails(a) ? colorOf(a.organizerId).split(' ')[0] : 'bg-muted-foreground/50'}`}
                  >
                    {a.allDay ? '' : `${timeOf(a.start)} `}
                    {canSeeDetails(a) ? a.title : 'Ocupado'}
                  </button>
                ))}
                {events.length > 3 && <div className="text-[10px] text-muted-foreground">+{events.length - 3} más</div>}
              </div>
            );
          })}
        </div>
      );
    }

    // Lista: citas del mes, agrupadas por día
    const monthItems = visibleAppointments.filter((a) => {
      const d = new Date(a.start);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
    if (monthItems.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center border border-border rounded-b-xl text-muted-foreground bg-card">
          <div className="text-center">
            <LayoutList className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay citas este mes con los filtros elegidos.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 overflow-auto border border-border rounded-b-xl bg-card divide-y divide-border">
        {monthItems.map((a) => (
          <button key={a.id} onClick={() => openAppointment(a)} className="w-full text-left p-3 hover:bg-muted/30 flex items-center gap-4">
            <div className="w-28 shrink-0 text-xs">
              <div className="font-bold">{new Date(a.start).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              <div className="text-muted-foreground">{a.allDay ? 'Todo el día' : `${timeOf(a.start)} - ${timeOf(a.end)}`}</div>
            </div>
            <div className={`w-2 h-10 rounded-full shrink-0 ${colorOf(a.organizerId).split(' ')[0]}`} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{canSeeDetails(a) ? a.title : 'Ocupado'}</div>
              <div className="text-xs text-muted-foreground truncate">
                {typeLabel(a.type)} · {nameOf(a.organizerId)}
                {canSeeDetails(a) && a.clientName ? ` · ${a.clientName}` : ''}
              </div>
            </div>
            {canSeeDetails(a) && a.location && (
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {a.location}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  const rangeLabel =
    view === 'week'
      ? `${startOfWeek.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - ${new Date(startOfWeek.getTime() + 6 * 86400000).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}`
      : view === 'day'
        ? currentDate.toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' })
        : currentDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Agenda Comercial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visitas, llamadas y reuniones del equipo. {loading ? 'Cargando…' : 'Doble clic en un día para agendar.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'CALENDAR' && (
            <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border mr-2">
              {(['day', 'week', 'month', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Lista'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setModal({ open: true, date: view === 'day' ? currentDate : undefined })}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agendar
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border">
        {(['CALENDAR', 'REPORTS'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'CALENDAR' ? 'Calendario' : 'Reportes'}
          </button>
        ))}
      </div>

      {activeTab === 'CALENDAR' ? (
        <>
          <div className="flex flex-col lg:flex-row gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1.5 shrink-0">
              <button onClick={() => navigateDate('prev')} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground" aria-label="Anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => navigateDate('today')} className="px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted rounded-md">
                Hoy
              </button>
              <button onClick={() => navigateDate('next')} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground" aria-label="Siguiente">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="px-3 text-sm font-bold text-foreground border-l border-border ml-1 capitalize">{rangeLabel}</div>
            </div>

            <div className="flex flex-1 items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shrink-0">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-muted-foreground mr-1">Ver:</span>
                {people.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-1.5 cursor-pointer p-1 rounded pr-2 ${selectedUsers.includes(u.id) ? 'bg-muted' : 'hover:bg-muted/50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={(e) => setSelectedUsers(e.target.checked ? [...selectedUsers, u.id] : selectedUsers.filter((id) => id !== u.id))}
                      className="rounded w-3.5 h-3.5"
                    />
                    <div className={`w-2.5 h-2.5 rounded-full ${colorOf(u.id).split(' ')[0]}`} />
                    <span className="text-xs font-medium whitespace-nowrap">{u.id === currentUser?.id ? 'Yo' : u.name.split(' ')[0]}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shrink-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer">
                  <option value="ALL">Todos los tipos</option>
                  {APPOINTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[500px] flex flex-col relative overflow-hidden bg-card rounded-xl shadow-sm">
            <style
              dangerouslySetInnerHTML={{
                __html: `.repeating-lines{background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.05) 4px,rgba(0,0,0,0.05) 8px);}`,
              }}
            />
            {renderGrid()}
          </div>
        </>
      ) : (
        <AgendaReportsTab appointments={appointments} people={people} onSave={saveAppointment} />
      )}

      <AppointmentModal
        isOpen={modal.open}
        appointment={modal.appointment}
        selectedDate={modal.date}
        employees={people}
        currentUser={currentUser}
        onClose={() => setModal({ open: false })}
        onSave={saveAppointment}
        onDelete={deleteAppointment}
      />
    </div>
  );
}
