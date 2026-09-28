import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { CallBackButton } from './CallBackButton';
import {
  type CallListItem,
  callOutcome,
  counterpart,
  DIRECTION_LABEL,
  formatDateTime,
  formatDuration,
  formatPhone,
  TONE_CLASS,
  voiceApi,
} from './callFormat';

type Filter = '' | 'missed' | 'answered';

const DirectionIcon = ({ c }: { c: CallListItem }) => {
  if (c.missed) return <PhoneMissed className="w-4 h-4 text-rose-600" aria-label="Perdida" />;
  if (c.direction === 'OUTBOUND') return <PhoneOutgoing className="w-4 h-4 text-sky-600" aria-label="Saliente" />;
  if (c.direction === 'INTERNAL') return <ArrowLeftRight className="w-4 h-4 text-muted-foreground" aria-label="Interna" />;
  return <PhoneIncoming className="w-4 h-4 text-emerald-600" aria-label="Entrante" />;
};

export function VozLlamadasPage() {
  const navigate = useNavigate();
  const [calls, setCalls] = React.useState<CallListItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [direction, setDirection] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('');
  const [q, setQ] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [from, setFrom] = React.useState('');

  const buildUrl = React.useCallback(
    (cursor?: string) => {
      const p = new URLSearchParams({ limit: '50' });
      if (direction) p.set('direction', direction);
      if (filter) p.set('filter', filter);
      if (query) p.set('q', query);
      if (from) p.set('from', new Date(`${from}T00:00:00-05:00`).toISOString());
      if (cursor) p.set('cursor', cursor);
      return `/api/voice/calls?${p.toString()}`;
    },
    [direction, filter, query, from]
  );

  const load = React.useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const data = await voiceApi<{ calls: CallListItem[]; nextCursor: string | null }>(buildUrl(cursor));
        setCalls((prev) => (cursor ? [...prev, ...data.calls] : data.calls));
        setNextCursor(data.nextCursor);
        setError('');
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    },
    [buildUrl]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  // Búsqueda por número con una pausa corta al escribir
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(q.replace(/[^\d+]/g, '')), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-primary" /> Historial de llamadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Entrantes, salientes e internas registradas por la central. Hora de Bogotá.</p>
        </div>
        <button onClick={() => load()} className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="voz-buscar-numero"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número (ej. 300 123)"
              inputMode="tel"
              className="w-full h-10 pl-9 pr-3 bg-background border border-input rounded-md text-sm"
            />
          </div>
          <select id="voz-direccion" value={direction} onChange={(e) => setDirection(e.target.value)} className="h-10 px-3 bg-background border border-input rounded-md text-sm">
            <option value="">Todas las direcciones</option>
            <option value="INBOUND">Entrantes</option>
            <option value="OUTBOUND">Salientes</option>
            <option value="INTERNAL">Internas</option>
          </select>
          <div className="flex rounded-md border border-input overflow-hidden text-sm" role="group" aria-label="Resultado">
            {([
              ['', 'Todas'],
              ['answered', 'Contestadas'],
              ['missed', 'Perdidas'],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key || 'todas'}
                onClick={() => setFilter(key)}
                className={`h-10 px-3 font-medium ${filter === key ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="text-sm flex items-center gap-2 text-muted-foreground">
            Desde
            <input id="voz-desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 px-2 bg-background border border-input rounded-md text-sm text-foreground" />
          </label>
        </div>

        {error ? (
          <div className="px-6 py-10 text-center text-muted-foreground">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Número / cliente</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Atendió</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Espera</th>
                  <th className="px-4 py-3 text-right">Conversación</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.map((c) => {
                  const outcome = callOutcome(c);
                  const other = counterpart(c);
                  return (
                    <tr key={c.id} onClick={() => navigate(`/voz/llamadas/${c.id}`)} className="hover:bg-muted/40 cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DirectionIcon c={c} />
                          <div>
                            <div className="font-medium tabular-nums">{formatPhone(other)}</div>
                            <div className="text-xs text-muted-foreground">{c.customerName || 'Sin cliente asociado'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{DIRECTION_LABEL[c.direction]}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TONE_CLASS[outcome.tone]}`}>{outcome.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.handledByName || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(c.startedAt)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.direction === 'INBOUND' ? formatDuration(c.waitSeconds) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.talkSeconds ? formatDuration(c.talkSeconds) : '—'}</td>
                      <td className="px-4 py-3 text-right">{c.direction !== 'INTERNAL' && <CallBackButton number={other} label={c.missed ? 'Devolver' : 'Llamar'} compact />}</td>
                    </tr>
                  );
                })}
                {!loading && calls.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                      No hay llamadas con estos filtros. Las llamadas aparecen aquí apenas la central las registra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor && !error && (
          <div className="p-4 border-t border-border text-center">
            <button onClick={() => load(nextCursor)} disabled={loading} className="h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted">
              {loading ? 'Cargando…' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default VozLlamadasPage;
