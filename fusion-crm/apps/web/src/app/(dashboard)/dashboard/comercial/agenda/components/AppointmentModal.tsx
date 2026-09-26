import React, { useState } from 'react';
import { X, Search, Clock, MapPin, Video, Users, Mail, Bell, Repeat, Calendar as CalendarIcon, Wand2, RefreshCcw } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onSave: (data: any) => void;
}

export function AppointmentModal({ isOpen, onClose, selectedDate, onSave }: AppointmentModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [type, setType] = useState('VISITA');
  const [isVirtual, setIsVirtual] = useState(false);
  const [location, setLocation] = useState('');
  
  // Combobox simulation for "Relacionado con"
  const [relatedQuery, setRelatedQuery] = useState('');
  const [isSearchingRelated, setIsSearchingRelated] = useState(false);
  const [selectedRelated, setSelectedRelated] = useState<any>(null);

  // Time
  const [isAllDay, setIsAllDay] = useState(false);
  
  // Attendees
  const [internalAttendees, setInternalAttendees] = useState<string[]>([]);
  const [externalAttendees, setExternalAttendees] = useState<string>('');
  
  // Smart scheduling
  const [isSearchingSlot, setIsSearchingSlot] = useState(false);
  const [suggestedSlot, setSuggestedSlot] = useState<string | null>(null);

  const mockUsers = [
    { id: 'u1', name: 'Andrés (Tú)' },
    { id: 'u2', name: 'Ana Gómez' },
    { id: 'u3', name: 'Carlos Ruiz' },
  ];

  const handleSearchSlot = () => {
    setIsSearchingSlot(true);
    setTimeout(() => {
      setIsSearchingSlot(false);
      setSuggestedSlot("Mañana a las 10:00 AM (Todos libres)");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Nueva Cita
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Title & Type */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Añade un título..."
                className="w-full text-xl font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-2 py-2 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="w-full md:w-48 shrink-0">
              <select 
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm font-bold bg-background focus:ring-2 focus:ring-primary/20"
              >
                <option value="VISITA">Visita Presencial</option>
                <option value="LLAMADA">Llamada</option>
                <option value="REUNION">Reunión Interna</option>
                <option value="DEMO">Demostración</option>
                <option value="SEGUIMIENTO">Seguimiento</option>
              </select>
            </div>
          </div>

          {/* DateTime & Timezone */}
          <div className="bg-muted/10 p-4 rounded-lg border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">Fecha y Hora</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                <span className="text-xs font-medium text-muted-foreground">Todo el día</span>
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
              {!isAllDay && <input type="time" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />}
              <div className="flex items-center justify-center text-muted-foreground text-sm font-bold">hasta</div>
              {!isAllDay && <input type="time" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />}
              <input type="date" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Zona horaria: America/Bogota</span>
            </div>
          </div>

          {/* Relacionado Con (EntityCombobox Mock) */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-muted-foreground">Relacionado con (Cliente, Oportunidad, Cotización)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={relatedQuery}
                onChange={e => {
                  setRelatedQuery(e.target.value);
                  setIsSearchingRelated(e.target.value.length > 2);
                  if (e.target.value.length === 0) setSelectedRelated(null);
                }}
                className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Buscar entidad..."
              />
            </div>
            {isSearchingRelated && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 p-2">
                <div 
                  className="p-2 hover:bg-muted rounded cursor-pointer flex flex-col"
                  onClick={() => {
                    setSelectedRelated({ type: 'CLIENT', name: relatedQuery, contact: '' });
                    setIsSearchingRelated(false);
                  }}
                >
                  <span className="font-bold text-sm">Vincular: &quot;{relatedQuery}&quot;</span>
                  <span className="text-xs text-muted-foreground">Cliente / Entidad Comercial</span>
                </div>
              </div>
            )}
          </div>

          {/* Ubicación o Virtual */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground">Ubicación</label>
              <button 
                type="button"
                onClick={() => setIsVirtual(!isVirtual)}
                className={`text-xs font-bold flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${isVirtual ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <Video className="w-3 h-3" /> Reunión Virtual (Meet)
              </button>
            </div>
            {isVirtual ? (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-md flex items-center gap-3 text-sm text-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Video className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">Google Meet</div>
                  <div className="text-xs text-muted-foreground">El enlace se generará al guardar la cita</div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm font-medium bg-background"
                  placeholder="Añadir ubicación física..."
                />
              </div>
            )}
          </div>

          {/* Invitados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Users className="w-3 h-3" /> Invitados Internos</label>
              <div className="p-3 border border-border rounded-md bg-muted/10 space-y-2">
                {mockUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={internalAttendees.includes(u.id)}
                      onChange={(e) => {
                         if(e.target.checked) setInternalAttendees([...internalAttendees, u.id]);
                         else setInternalAttendees(internalAttendees.filter(id => id !== u.id));
                      }}
                      className="rounded text-primary focus:ring-primary"
                    />
                    {u.name}
                  </label>
                ))}
              </div>
              {internalAttendees.length > 0 && (
                <button 
                  type="button"
                  onClick={handleSearchSlot}
                  disabled={isSearchingSlot}
                  className="w-full py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSearchingSlot ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  {isSearchingSlot ? "Calculando disponibilidad..." : "Buscar Hueco Común"}
                </button>
              )}
              {suggestedSlot && (
                <div className="text-xs font-bold text-success bg-success/10 p-2 rounded-md text-center border border-success/20">
                  Sugerencia: {suggestedSlot}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Invitados Externos</label>
              <textarea 
                value={externalAttendees}
                onChange={e => setExternalAttendees(e.target.value)}
                placeholder="Correos separados por coma..."
                className="w-full p-3 border border-input rounded-md text-sm bg-background min-h-[100px] font-medium resize-none"
              />
              <p className="text-[10px] text-muted-foreground">Recibirán invitación por correo con archivo .ics</p>
            </div>
          </div>
          
          {/* Extra options */}
          <div className="flex gap-4">
             <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-bold text-muted-foreground hover:bg-muted transition-colors">
               <Bell className="w-3 h-3" /> Añadir Recordatorio
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-bold text-muted-foreground hover:bg-muted transition-colors">
               <Repeat className="w-3 h-3" /> No se repite
             </button>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-3 shrink-0 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button 
            onClick={() => {
              onSave({ title, type, isVirtual });
              onClose();
            }} 
            className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-md text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Guardar Cita
          </button>
        </div>
      </div>
    </div>
  );
}
