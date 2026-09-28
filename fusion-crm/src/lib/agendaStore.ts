import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';

export type AppointmentType = 'VISITA' | 'LLAMADA' | 'REUNION' | 'DEMO' | 'SEGUIMIENTO';

export interface Appointment {
  id: string;
  title: string;
  /** Fechas en ISO (se guardan como texto en la base). */
  start: string;
  end: string;
  allDay?: boolean;
  type: AppointmentType;
  clientId?: string;
  clientName?: string;
  organizerId: string;
  organizerName?: string;
  attendeeIds?: string[];
  externalAttendees?: string;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  visibility: 'TEAM' | 'PRIVATE';
  status?: 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA';
  checkInAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'VISITA', label: 'Visita presencial' },
  { value: 'LLAMADA', label: 'Llamada' },
  { value: 'REUNION', label: 'Reunión interna' },
  { value: 'DEMO', label: 'Demostración' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
];

/** Agenda comercial: se guarda en el servidor (/api/data/appointments). */
export const appointmentsCollection = createServerCollection<Appointment>({
  updatedEvent: 'fusion_appointments_updated',
  adapter: dataApiAdapter('appointments'),
});

export const newAppointmentId = () => `apt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
