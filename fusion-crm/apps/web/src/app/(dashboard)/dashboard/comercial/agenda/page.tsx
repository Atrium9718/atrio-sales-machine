import React, { useState, useMemo } from 'react';
import { AppointmentModal } from "./components/AppointmentModal";
import { GoogleSettingsModal } from "./components/GoogleSettingsModal";
import { AgendaReportsTab } from "./components/AgendaReportsTab";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  LayoutList, 
  MapPin, 
  Plus, 
  RefreshCcw, 
  Users,
  Video,
  Lock,
  CheckCircle2,
  AlertCircle,
  MoreVertical
} from 'lucide-react';

// --- MOCK SCHEMA & TYPES ---
type Visibility = 'TEAM' | 'PRIVATE';
type SyncStatus = 'NOT_SYNCED' | 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
type ViewMode = 'day' | 'week' | 'month' | 'list';

interface User {
  id: string;
  name: string;
  colorKey: string;
  isMe?: boolean;
}

interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'VISITA' | 'LLAMADA' | 'REUNION' | 'DEMO';
  clientId?: string;
  clientName?: string;
  organizerId: string;
  timezone: string;
  visibility: Visibility;
  syncStatus: SyncStatus;
  checkInAt?: Date;
  location?: string;
  googleEventId?: string;
}

// Mock Users
const USERS: User[] = [
  { id: 'u1', name: 'Andrés (Tú)', colorKey: 'bg-primary border-primary', isMe: true },
  { id: 'u2', name: 'Ana Gómez', colorKey: 'bg-emerald-500 border-emerald-600', isMe: false },
  { id: 'u3', name: 'Carlos Ruiz', colorKey: 'bg-amber-500 border-amber-600', isMe: false },
];

// Mock Appointments
const today = new Date();
const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

const MOCK_APPOINTMENTS: Appointment[] = [];

export default function AgendaComercialPage() {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'REPORTS'>('CALENDAR');
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['u1']); 
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // --- DATE MATH UTILS ---
  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay() || 7; 
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startOfWeek]);

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const days = view === 'week' ? 7 : view === 'day' ? 1 : 30;
    newDate.setDate(newDate.getDate() + (direction === 'next' ? days : -days));
    setCurrentDate(newDate);
  };

  // --- FILTERING ---
  const visibleAppointments = useMemo(() => {
    return MOCK_APPOINTMENTS.filter(app => {
      if (!selectedUsers.includes(app.organizerId)) return false;
      if (typeFilter !== 'ALL' && app.type !== typeFilter) return false;
      return true;
    });
  }, [selectedUsers, typeFilter]);

  // --- GRID RENDER UTILS ---
  const START_HOUR = 6;
  const END_HOUR = 21;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  const getEventStyles = (app: Appointment, isDayView: boolean, indexInColumn?: number, totalInColumn?: number) => {
    const startMins = app.start.getHours() * 60 + app.start.getMinutes() - (START_HOUR * 60);
    const durationMins = (app.end.getTime() - app.start.getTime()) / 60000;
    
    const top = Math.max(0, (startMins / TOTAL_MINUTES) * 100);
    const height = Math.min(100 - top, (durationMins / TOTAL_MINUTES) * 100);
    
    let width = '90%';
    let left = '5%';
    if (isDayView && totalInColumn && totalInColumn > 1 && indexInColumn !== undefined) {
       width = `${90 / totalInColumn}%`;
       left = `${5 + (90 / totalInColumn) * indexInColumn}%`;
    }

    return { top: `${top}%`, height: `${height}%`, width, left };
  };

  const getSyncIcon = (status: SyncStatus) => {
    switch (status) {
      case 'SYNCED': return <CheckCircle2 className="w-3 h-3" />;
      case 'PENDING': return <RefreshCcw className="w-3 h-3 animate-spin" />;
      case 'CONFLICT': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const renderEvent = (app: Appointment, isDayView: boolean = false, idx?: number, total?: number) => {
    const user = USERS.find(u => u.id === app.organizerId);
    const isMe = user?.isMe;
    const isPrivate = app.visibility === 'PRIVATE';
    
    const showDetails = isMe || !isPrivate;
    const style = getEventStyles(app, isDayView, idx, total);
    const baseColor = user ? user.colorKey : 'bg-muted border-border';
    
    return (
      <div 
        key={app.id}
        className={`absolute rounded-md p-1.5 text-xs overflow-hidden border shadow-sm flex flex-col gap-0.5 transition-all hover:z-10 hover:shadow-md cursor-pointer ${showDetails ? `${baseColor} text-white` : 'bg-muted/80 border-border text-muted-foreground repeating-lines'}`}
        style={style}
        title={showDetails ? app.title : 'Ocupado'}
      >
        <div className="flex justify-between items-start">
          <span className="font-bold truncate leading-tight">
            {!showDetails ? 'Ocupado' : app.title}
          </span>
          {showDetails && app.googleEventId && (
            <span title={`Google Sync: ${app.syncStatus}`}>
              {getSyncIcon(app.syncStatus)}
            </span>
          )}
        </div>
        
        {showDetails && (
          <>
            <div className="opacity-90 flex items-center gap-1 mt-0.5 truncate text-[10px]">
              <Clock className="w-3 h-3 shrink-0" />
              {app.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {app.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            
            {app.clientName && (
              <div className="opacity-90 truncate mt-0.5 text-[10px]">
                {app.clientName}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between opacity-80 pt-1">
              <span className="text-[9px] font-bold uppercase">{app.type}</span>
              {app.checkInAt && (
                <div className="flex items-center gap-1 text-[9px] bg-black/20 px-1 rounded" title="Check-in GPS registrado">
                  <MapPin className="w-3 h-3" /> OK
                </div>
              )}
            </div>
          </>
        )}
        {!showDetails && (
          <div className="flex items-center gap-1 mt-1 opacity-70">
            <Lock className="w-3 h-3" /> Privado
          </div>
        )}
      </div>
    );
  };

  const renderGrid = () => {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

    if (view === 'week') {
      return (
        <div className="flex flex-1 overflow-y-auto bg-card rounded-b-xl border-x border-b border-border">
          <div className="w-16 flex flex-col border-r border-border bg-muted/20 shrink-0">
            {hours.map(h => (
              <div key={h} className="h-16 border-b border-border/50 text-[10px] text-muted-foreground font-medium p-1 text-right">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="flex flex-1">
            {weekDays.map(day => {
              const isToday = day.toDateString() === new Date().toDateString();
              const dayEvents = visibleAppointments.filter(a => a.start.toDateString() === day.toDateString());
              
              return (
                <div key={day.toISOString()} className="flex-1 flex flex-col border-r border-border min-w-[120px] relative group">
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-border shrink-0 sticky top-0 z-20 ${isToday ? 'bg-primary/5' : 'bg-card'}`}>
                    <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {day.toLocaleDateString('es', { weekday: 'short' })}
                    </span>
                    <span className={`text-lg font-bold ${isToday ? 'text-primary bg-primary/10 w-7 h-7 rounded-full flex items-center justify-center' : 'text-foreground'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="relative flex-1 group-hover:bg-muted/5 transition-colors" style={{ height: `${(END_HOUR - START_HOUR) * 4}rem` }}>
                    {hours.slice(0, -1).map(h => (
                      <div key={h} className="absolute w-full border-b border-border/30 h-16 pointer-events-none" style={{ top: `${(h - START_HOUR) * 4}rem` }} />
                    ))}
                    {dayEvents.map(app => renderEvent(app, false))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (view === 'day') {
      return (
        <div className="flex flex-1 overflow-y-auto bg-card rounded-b-xl border-x border-b border-border">
          <div className="w-16 flex flex-col border-r border-border bg-muted/20 shrink-0">
            {hours.map(h => (
              <div key={h} className="h-16 border-b border-border/50 text-[10px] text-muted-foreground font-medium p-1 text-right">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="flex flex-1">
            {selectedUsers.map((uid, idx) => {
              const user = USERS.find(u => u.id === uid);
              if (!user) return null;
              const dayEvents = visibleAppointments.filter(a => a.organizerId === uid && a.start.toDateString() === currentDate.toDateString());
              
              return (
                <div key={uid} className="flex-1 flex flex-col border-r border-border min-w-[200px] relative group">
                  <div className="h-12 flex items-center justify-center gap-2 border-b border-border shrink-0 sticky top-0 z-20 bg-card">
                     <div className={`w-3 h-3 rounded-full ${user.colorKey.split(' ')[0]}`} />
                     <span className="font-bold text-sm text-foreground">{user.name}</span>
                  </div>
                  <div className="relative flex-1 group-hover:bg-muted/5 transition-colors" style={{ height: `${(END_HOUR - START_HOUR) * 4}rem` }}>
                    {hours.slice(0, -1).map(h => (
                      <div key={h} className="absolute w-full border-b border-border/30 h-16 pointer-events-none" style={{ top: `${(h - START_HOUR) * 4}rem` }} />
                    ))}
                    {dayEvents.map(app => renderEvent(app, true, 0, 1))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center border border-border rounded-b-xl text-muted-foreground bg-card">
        <div className="text-center">
          <LayoutList className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Vista {view === 'month' ? 'Mensual' : 'de Lista'} (En construcción)</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Agenda Comercial
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sincronizado con Google Calendar Workspace
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'CALENDAR' && (
            <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border mr-2">
              {(['day', 'week', 'month', 'list'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                    view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Lista'}
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={() => setIsGoogleModalOpen(true)}
            className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted/80 transition-colors"
            title="Configurar Google Calendar"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Sincronización
          </button>
          
          <button 
            onClick={() => setIsAppointmentModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agendar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab('CALENDAR')}
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CALENDAR' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Calendario
        </button>
        <button 
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'REPORTS' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Reportes
        </button>
      </div>

      {activeTab === 'CALENDAR' ? (
        <>

      <div className="flex flex-col lg:flex-row gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1.5 shrink-0">
          <button onClick={() => navigateDate('prev')} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => navigateDate('today')} className="px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted rounded-md transition-colors">Hoy</button>
          <button onClick={() => navigateDate('next')} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
          <div className="px-3 text-sm font-bold text-foreground border-l border-border ml-1">
            {view === 'week' 
              ? `${startOfWeek.toLocaleDateString('es', { month: 'short', day: 'numeric' })} - ${new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`
              : currentDate.toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' })
            }
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-muted-foreground mr-1">Ver también:</span>
            {USERS.map(u => (
              <label key={u.id} className={`flex items-center gap-1.5 cursor-pointer p-1 rounded transition-colors pr-2 ${selectedUsers.includes(u.id) ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(u.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                    else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                  }}
                  className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <div className={`w-2.5 h-2.5 rounded-full ${u.colorKey.split(' ')[0]}`} />
                <span className="text-xs font-medium">{u.isMe ? 'Yo' : u.name.split(' ')[0]}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shrink-0">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="VISITA">Visita Presencial</option>
              <option value="LLAMADA">Llamada</option>
              <option value="REUNION">Reunión Interna</option>
              <option value="DEMO">Demostración</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] flex flex-col relative overflow-hidden bg-card rounded-xl shadow-sm">
        <style dangerouslySetInnerHTML={{__html: `
          .repeating-lines {
            background-image: repeating-linear-gradient(
              45deg,
              transparent,
              transparent 4px,
              rgba(0,0,0,0.05) 4px,
              rgba(0,0,0,0.05) 8px
            );
          }
        `}} />
        {renderGrid()}
      </div>
        </>
      ) : (
        <AgendaReportsTab />
      )}


      <AppointmentModal 
        isOpen={isAppointmentModalOpen} 
        onClose={() => setIsAppointmentModalOpen(false)} 
        onSave={(data) => {
          alert("Cita guardada en base de datos. Si tiene Meet, se generó el enlace. Invitaciones enviadas.");
        }}
      />
      
      <GoogleSettingsModal 
        isOpen={isGoogleModalOpen} 
        onClose={() => setIsGoogleModalOpen(false)} 
      />
    </div>
  );
}
