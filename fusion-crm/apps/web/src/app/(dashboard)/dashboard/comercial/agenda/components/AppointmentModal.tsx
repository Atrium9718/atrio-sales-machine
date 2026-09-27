import React, { useEffect, useState } from 'react';
import { X, Search, Clock, MapPin, Video, Users, Mail, Calendar as CalendarIcon, Lock, Trash2 } from 'lucide-react';
import { searchCustomers, type Customer } from '@/lib/customerService';
import type { FusionEmployee } from '@/context/FusionAuthContext';
import { APPOINTMENT_TYPES, newAppointmentId, type Appointment, type AppointmentType } from '@/lib/agendaStore';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cita a editar; sin ella se crea una nueva. */
  appointment?: Appointment | null;
  selectedDate?: Date;
  employees: FusionEmployee[];
  currentUser: FusionEmployee | null;
  onSave: (appointment: Appointment) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function AppointmentModal(props: AppointmentModalProps) {
  if (!props.isOpen) return null;
  return <AppointmentForm {...props} />;
}

function AppointmentForm({ onClose, appointment, selectedDate, employees, currentUser, onSave, onDelete }: AppointmentModalProps) {
  const base = appointment ? new Date(appointment.start) : selectedDate ?? new Date();
  const defaultStart = new Date(base);
  if (!appointment) defaultStart.setHours(Math.max(8, Math.min(17, new Date().getHours() + 1)), 0, 0, 0);
  const defaultEnd = appointment ? new Date(appointment.end) : new Date(defaultStart.getTime() + 60 * 60000);

  const [title, setTitle] = useState(appointment?.title ?? '');
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? 'VISITA');
  const [date, setDate] = useState(toDateInput(defaultStart));
  const [startTime, setStartTime] = useState(toTimeInput(defaultStart));
  const [endTime, setEndTime] = useState(toTimeInput(defaultEnd));
  const [allDay, setAllDay] = useState(!!appointment?.allDay);
  const [location, setLocation] = useState(appointment?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(appointment?.meetingUrl ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [organizerId, setOrganizerId] = useState(appointment?.organizerId ?? currentUser?.id ?? '');
  const [attendeeIds, setAttendeeIds] = useState<string[]>(appointment?.attendeeIds ?? []);
  const [externalAttendees, setExternalAttendees] = useState(appointment?.externalAttendees ?? '');
  const [isPrivate, setIsPrivate] = useState(appointment?.visibility === 'PRIVATE');
  const [client, setClient] = useState<{ id?: string; name: string } | null>(
    appointment?.clientName ? { id: appointment.clientId, name: appointment.clientName } : null
  );
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (clientQuery.trim().length < 2) {
      setClientResults([]);
      return;
    }
    searchCustomers(clientQuery).then((r) => alive && setClientResults(r)).catch(() => alive && setClientResults([]));
    return () => {
      alive = false;
    };
  }, [clientQuery]);

  const activeEmployees = employees.filter((e) => e.status !== 'INACTIVO');

  const handleSave = async () => {
    if (!title.trim()) return setError('Escribe un título para la cita.');
    const start = new Date(`${date}T${allDay ? '00:00' : startTime}`);
    const end = new Date(`${date}T${allDay ? '23:59' : endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError('Revisa la fecha y la hora.');
    if (end <= start) return setError('La hora de fin debe ser posterior a la de inicio.');
    const organizer = employees.find((e) => e.id === organizerId);
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(appointment ?? {}),
        id: appointment?.id ?? newAppointmentId(),
        title: title.trim(),
        type,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay,
        clientId: client?.id,
        clientName: client?.name,
        organizerId,
        organizerName: organizer?.name,
        attendeeIds,
        externalAttendees: externalAttendees.trim() || undefined,
        location: location.trim() || undefined,
        meetingUrl: meetingUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        visibility: isPrivate ? 'PRIVATE' : 'TEAM',
        status: appointment?.status ?? 'PROGRAMADA',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la cita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {appointment ? 'Editar cita' : 'Nueva cita'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (ej. Visita a Pintuco para muestras)"
              className="flex-1 text-lg font-bold bg-transparent border-b-2 border-border focus:border-primary focus:outline-none px-2 py-2"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
              className="w-full md:w-48 px-3 py-2.5 border border-input rounded-md text-sm font-bold bg-background"
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-muted/10 p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Fecha y hora
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
                Todo el día
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
              {!allDay && (
                <>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Desde
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background" />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Hasta
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background" />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-muted-foreground">Cliente</label>
            {client ? (
              <div className="flex items-center justify-between px-3 py-2 border border-primary/30 bg-primary/5 rounded-md text-sm">
                <span className="font-bold">{client.name}</span>
                <button type="button" onClick={() => setClient(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background"
                  placeholder="Buscar por nombre o NIT (opcional)…"
                />
                {clientQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 p-1 max-h-56 overflow-y-auto">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClient({ id: c.id, name: c.name });
                          setClientQuery('');
                        }}
                        className="w-full text-left p-2 hover:bg-muted rounded flex flex-col"
                      >
                        <span className="font-bold text-sm">{c.name}</span>
                        {(c.nit || c.doc) && <span className="text-xs text-muted-foreground">NIT {c.nit || c.doc}</span>}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setClient({ name: clientQuery.trim() });
                        setClientQuery('');
                      }}
                      className="w-full text-left p-2 hover:bg-muted rounded text-sm"
                    >
                      Usar «{clientQuery.trim()}» (sin vincular a la base de clientes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Lugar
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                placeholder="Dirección u oficina"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Video className="w-3 h-3" /> Enlace de reunión virtual
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                placeholder="https://meet.google.com/…"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Responsable</label>
              <select value={organizerId} onChange={(e) => setOrganizerId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.id === currentUser?.id ? ' (tú)' : ''}
                  </option>
                ))}
              </select>
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 pt-2">
                <Users className="w-3 h-3" /> Acompañan
              </label>
              <div className="p-2 border border-border rounded-md bg-muted/10 max-h-32 overflow-y-auto">
                {activeEmployees
                  .filter((e) => e.id !== organizerId)
                  .map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                      <input
                        type="checkbox"
                        checked={attendeeIds.includes(e.id)}
                        onChange={(ev) => setAttendeeIds(ev.target.checked ? [...attendeeIds, e.id] : attendeeIds.filter((id) => id !== e.id))}
                        className="rounded"
                      />
                      {e.name}
                    </label>
                  ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Invitados externos
              </label>
              <textarea
                value={externalAttendees}
                onChange={(e) => setExternalAttendees(e.target.value)}
                placeholder="Nombres o correos (solo como referencia)"
                className="w-full p-2 border border-input rounded-md text-sm bg-background min-h-[70px] resize-none"
              />
              <label className="text-xs font-bold text-muted-foreground">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Objetivo de la cita, qué llevar…"
                className="w-full p-2 border border-input rounded-md text-sm bg-background min-h-[70px] resize-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            Privada (los demás solo ven «Ocupado»)
          </label>

          {error && <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-between gap-3 shrink-0 rounded-b-xl">
          <div>
            {appointment && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('¿Eliminar esta cita?')) return;
                  await onDelete(appointment.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-md"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-md text-sm hover:bg-primary/90 shadow-sm disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar cita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
