import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Timer, MessageSquare, RefreshCw, CircleCheck, CircleAlert } from 'lucide-react';
import { useSoftphone } from '../../../apps/web/src/features/voice/sip/SoftphoneContext';
import { CallBackButton } from './CallBackButton';
import { type CallListItem, callOutcome, counterpart, formatDuration, formatPhone, formatTime, TONE_CLASS, voiceApi } from './callFormat';

interface Summary {
  total: number;
  inbound: number;
  outbound: number;
  internal: number;
  answered: number;
  missed: number;
  voicemail: number;
  inProgress: number;
  answerRate: number | null;
  avgWaitSeconds: number | null;
  avgTalkSeconds: number | null;
  totalTalkSeconds: number;
  byHour: { hour: number; inbound: number; outbound: number; missed: number }[];
}

interface VoiceStatus {
  asterisk: { connected: boolean };
  counts: { extensions: number; numbers: number; trunks: number };
  trunk: { name: string; sipHost: string; configured: boolean };
  businessHours: { isOpen: boolean; currentTimeBogota: string; isHolidayToday: boolean; holidayTodayName?: string };
}

const SOFTPHONE_LABEL: Record<string, string> = {
  REGISTERED: 'Conectado: puedes recibir y hacer llamadas',
  MIRROR_MODE: 'Conectado en otra pestaña',
  CONNECTING: 'Conectando…',
  REGISTRATION_FAILED: 'No se pudo conectar tu teléfono',
  DISCONNECTED: 'Desconectado',
};

function Kpi({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone?: 'bad' }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {icon}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : ''}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CircleCheck className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> : <CircleAlert className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />}
      <span>{children}</span>
    </li>
  );
}

export function VozDashboardPage() {
  const navigate = useNavigate();
  const { state: softphoneState } = useSoftphone();
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [recent, setRecent] = React.useState<CallListItem[]>([]);
  const [pending, setPending] = React.useState<CallListItem[]>([]);
  const [status, setStatus] = React.useState<VoiceStatus | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [s, st] = await Promise.allSettled([
      voiceApi<{ summary: Summary; recent: CallListItem[]; pendingCallbacks: CallListItem[] }>('/api/voice/calls/summary'),
      voiceApi<VoiceStatus>('/api/voice/status'),
    ]);
    if (s.status === 'fulfilled') {
      setSummary(s.value.summary);
      setRecent(s.value.recent);
      setPending(s.value.pendingCallbacks);
      setError('');
    } else setError(s.reason?.message || 'No se pudieron cargar las llamadas');
    if (st.status === 'fulfilled') setStatus(st.value);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const maxHour = Math.max(1, ...(summary?.byHour ?? []).map((h) => h.inbound + h.outbound));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="w-6 h-6 text-primary" /> Panel de voz
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Llamadas de hoy (hora de Bogotá). Se actualiza cada 30 segundos.</p>
        </div>
        <button onClick={load} className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="Llamadas hoy" value={String(summary.total)} hint={`${summary.inbound} entrantes · ${summary.outbound} salientes`} icon={<Phone className="w-4 h-4" />} />
          <Kpi label="Contestadas" value={summary.answerRate == null ? '—' : `${summary.answerRate}%`} hint="de las entrantes terminadas" icon={<PhoneIncoming className="w-4 h-4" />} />
          <Kpi label="Perdidas" value={String(summary.missed)} hint={summary.voicemail ? `${summary.voicemail} dejaron mensaje` : 'sin mensajes de voz'} icon={<PhoneMissed className="w-4 h-4" />} tone={summary.missed ? 'bad' : undefined} />
          <Kpi label="Espera promedio" value={summary.avgWaitSeconds == null ? '—' : formatDuration(summary.avgWaitSeconds)} hint="antes de que contesten" icon={<Timer className="w-4 h-4" />} />
          <Kpi label="Conversación promedio" value={summary.avgTalkSeconds == null ? '—' : formatDuration(summary.avgTalkSeconds)} hint={`${formatDuration(summary.totalTalkSeconds)} en total`} icon={<MessageSquare className="w-4 h-4" />} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Por devolver</h2>
            <span className="text-xs text-muted-foreground">Perdidas de los últimos 3 días que nadie ha devuelto</span>
          </div>
          <ul className="divide-y divide-border">
            {pending.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/voz/llamadas/${c.id}`)}>
                <div className="flex items-center gap-3 min-w-0">
                  <PhoneMissed className="w-4 h-4 text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium tabular-nums">{formatPhone(c.fromNumber)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.customerName || 'Sin cliente asociado'} · {formatTime(c.startedAt)}
                    </div>
                  </div>
                </div>
                <CallBackButton number={c.fromNumber} compact />
              </li>
            ))}
            {pending.length === 0 && <li className="px-6 py-8 text-center text-sm text-muted-foreground">No hay llamadas perdidas por devolver.</li>}
          </ul>
        </section>

        <section className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold">Estado</h2>
          <ul className="space-y-2">
            <StatusLine ok={softphoneState === 'REGISTERED' || softphoneState === 'MIRROR_MODE'}>Tu teléfono: {SOFTPHONE_LABEL[softphoneState] || softphoneState}</StatusLine>
            {status && (
              <>
                <StatusLine ok={status.asterisk.connected}>{status.asterisk.connected ? 'Central telefónica en línea' : 'La central telefónica no responde'}</StatusLine>
                <StatusLine ok={status.trunk.configured}>{status.trunk.configured ? `Línea del operador: ${status.trunk.name}` : 'Falta configurar la línea del operador'}</StatusLine>
                <StatusLine ok={status.businessHours.isOpen}>
                  {status.businessHours.isHolidayToday
                    ? `Festivo: ${status.businessHours.holidayTodayName}`
                    : status.businessHours.isOpen
                      ? `En horario de atención (${status.businessHours.currentTimeBogota})`
                      : `Fuera de horario (${status.businessHours.currentTimeBogota})`}
                </StatusLine>
                <li className="text-xs text-muted-foreground pt-1">
                  {status.counts.extensions} extensiones · {status.counts.numbers} números
                </li>
              </>
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="bg-card border border-border rounded-xl shadow-sm p-4">
          <h2 className="font-semibold mb-3">Llamadas por hora</h2>
          {summary && summary.byHour.length ? (
            <ul className="space-y-1.5">
              {summary.byHour.map((h) => (
                <li key={h.hour} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-muted-foreground tabular-nums">{String(h.hour).padStart(2, '0')}:00</span>
                  <div className="flex-1 h-3 flex rounded-sm overflow-hidden bg-muted" title={`${h.inbound} entrantes, ${h.outbound} salientes, ${h.missed} perdidas`}>
                    <div className="bg-emerald-500" style={{ width: `${((h.inbound - h.missed) / maxHour) * 100}%` }} />
                    <div className="bg-rose-500" style={{ width: `${(h.missed / maxHour) * 100}%` }} />
                    <div className="bg-sky-500" style={{ width: `${(h.outbound / maxHour) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right tabular-nums">{h.inbound + h.outbound}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay llamadas hoy.</p>
          )}
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Contestadas</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Perdidas</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Salientes</span>
          </div>
        </section>

        <section className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Últimas llamadas</h2>
            <Link to="/voz/llamadas" className="text-sm text-primary hover:underline">
              Ver historial
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((c) => {
              const outcome = callOutcome(c);
              return (
                <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/voz/llamadas/${c.id}`)}>
                  <div className="flex items-center gap-3 min-w-0">
                    {c.direction === 'OUTBOUND' ? <PhoneOutgoing className="w-4 h-4 text-sky-600 shrink-0" /> : <PhoneIncoming className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium tabular-nums">{formatPhone(counterpart(c))}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.customerName || 'Sin cliente asociado'} · {c.handledByName || 'sin asesor'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground tabular-nums">{formatTime(c.startedAt)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${TONE_CLASS[outcome.tone]}`}>{outcome.label}</span>
                  </div>
                </li>
              );
            })}
            {recent.length === 0 && <li className="px-6 py-8 text-center text-sm text-muted-foreground">Aún no hay llamadas hoy.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
export default VozDashboardPage;
