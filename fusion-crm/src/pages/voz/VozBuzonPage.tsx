import * as React from 'react';
import { Link } from 'react-router-dom';
import { Archive, Check, Inbox, RefreshCw, Voicemail } from 'lucide-react';
import { notify } from '../../lib/notify';
import { CallBackButton } from './CallBackButton';
import { formatDateTime, formatDuration, formatPhone, voiceApi } from './callFormat';

interface Message {
  id: string;
  callId: string;
  fromNumber: string;
  customerId: string | null;
  callerName: string | null;
  durationSeconds: number;
  status: 'NEW' | 'HEARD' | 'RETURNED' | 'ARCHIVED';
  createdAt: string;
  heardAt: string | null;
  heardByName: string | null;
  queueName: string | null;
  extension: string | null;
  ownerName: string | null;
  audioUrl: string;
}

const FILTERS = [
  ['', 'Pendientes'],
  ['NEW', 'Sin escuchar'],
  ['RETURNED', 'Devueltos'],
  ['ARCHIVED', 'Archivados'],
] as const;

const STATUS_LABEL: Record<Message['status'], { label: string; cls: string }> = {
  NEW: { label: 'Sin escuchar', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  HEARD: { label: 'Escuchado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  RETURNED: { label: 'Devuelto', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  ARCHIVED: { label: 'Archivado', cls: 'bg-muted text-muted-foreground' },
};

export function VozBuzonPage() {
  const [filter, setFilter] = React.useState<string>('');
  const [messages, setMessages] = React.useState<Message[] | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const d = await voiceApi<{ voicemails: Message[] }>(`/api/voice/voicemails${filter ? `?status=${filter}` : ''}`);
      setMessages(d.voicemails);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el buzón');
    }
  }, [filter]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (m: Message, action: 'heard' | 'returned' | 'archive') => {
    try {
      await voiceApi(`/api/voice/voicemails/${m.id}/${action}`, { method: 'POST' });
      if (action !== 'heard') notify(action === 'returned' ? 'Marcado como devuelto' : 'Mensaje archivado', 'success');
      load();
    } catch (err: any) {
      notify(err?.message || 'No se pudo actualizar el mensaje', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Voicemail className="w-6 h-6 text-primary" /> Buzón de voz
          </h1>
          <p className="text-sm text-muted-foreground">Mensajes que dejaron cuando nadie pudo contestar. Cada uno crea una tarea para devolver la llamada.</p>
        </div>
        <button onClick={load} className="h-9 px-3 rounded-md border border-input text-sm inline-flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`h-8 px-3 rounded-full text-sm border ${filter === value ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">{error}</div>}

      {messages && messages.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No hay mensajes {filter ? 'con este filtro' : 'pendientes'}.
        </div>
      )}

      <ul className="space-y-3">
        {messages?.map((m) => (
          <li key={m.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {m.customerId ? (
                    <Link to={`/dashboard/clientes/${m.customerId}`} className="hover:underline">{m.callerName}</Link>
                  ) : (
                    formatPhone(m.fromNumber)
                  )}
                  {m.customerId && <span className="ml-2 text-sm font-normal text-muted-foreground">{formatPhone(m.fromNumber)}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(m.createdAt)} · {formatDuration(m.durationSeconds)}
                  {m.queueName ? ` · cola ${m.queueName}` : ''}
                  {m.extension ? ` · extensión ${m.extension}${m.ownerName ? ` (${m.ownerName})` : ''}` : ''}
                  {!m.queueName && !m.extension ? ' · buzón general' : ''}
                  {m.heardByName ? ` · escuchado por ${m.heardByName}` : ''}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABEL[m.status].cls}`}>{STATUS_LABEL[m.status].label}</span>
            </div>
            <audio controls preload="none" src={m.audioUrl} className="w-full" onPlay={() => m.status === 'NEW' && act(m, 'heard')} />
            <div className="flex flex-wrap gap-2">
              <CallBackButton number={m.fromNumber} label="Devolver llamada" compact />
              {m.status !== 'RETURNED' && (
                <button onClick={() => act(m, 'returned')} className="h-8 px-2 rounded-md border border-input text-xs inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ya lo devolví
                </button>
              )}
              {m.status !== 'ARCHIVED' && (
                <button onClick={() => act(m, 'archive')} className="h-8 px-2 rounded-md border border-input text-xs inline-flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5" /> Archivar
                </button>
              )}
              <Link to={`/voz/llamadas/${m.callId}`} className="h-8 px-2 rounded-md text-xs inline-flex items-center text-muted-foreground hover:text-foreground">
                Ver la llamada
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
