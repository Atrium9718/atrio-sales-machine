import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, PhoneCall, Save, User } from 'lucide-react';
import { CallBackButton } from './CallBackButton';
import { notify } from '../../lib/notify';
import {
  type CallListItem,
  callOutcome,
  counterpart,
  DIRECTION_LABEL,
  EVENT_LABEL,
  formatDateTime,
  formatDuration,
  formatPhone,
  formatTime,
  HANGUP_BY_LABEL,
  TONE_CLASS,
  voiceApi,
} from './callFormat';

interface CallDetail extends CallListItem {
  events: { id: string; at: string; type: string; actorUserId: string | null; payload: any }[];
}

export function VozLlamadaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = React.useState<CallDetail | null>(null);
  const [error, setError] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    voiceApi<{ call: CallDetail }>(`/api/voice/calls/${encodeURIComponent(id)}`)
      .then((d) => {
        setCall(d.call);
        setNotes(d.call.notes || '');
      })
      .catch((err) => setError(err?.message || 'No se pudo cargar la llamada'));
  }, [id]);

  const saveNotes = async () => {
    if (!call) return;
    setSaving(true);
    try {
      await voiceApi(`/api/voice/calls/${encodeURIComponent(call.id)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      notify('Notas guardadas', 'success');
    } catch (err: any) {
      notify(err?.message || 'No se pudieron guardar las notas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <Link to="/voz/llamadas" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
      <ArrowLeft className="w-4 h-4" /> Historial de llamadas
    </Link>
  );

  if (error) return <div className="p-6 max-w-4xl mx-auto space-y-4">{back}<div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">{error}</div></div>;
  if (!call) return <div className="p-6 max-w-4xl mx-auto space-y-4">{back}<div className="text-sm text-muted-foreground">Cargando…</div></div>;

  const outcome = callOutcome(call);
  const other = counterpart(call);
  const facts: [string, string][] = [
    ['Dirección', DIRECTION_LABEL[call.direction]],
    ['Empezó', formatDateTime(call.startedAt)],
    ['Contestada', call.answeredAt ? formatTime(call.answeredAt) : 'No'],
    ['Espera', call.direction === 'INBOUND' ? formatDuration(call.waitSeconds) : '—'],
    ['Conversación', formatDuration(call.talkSeconds)],
    ['Duración total', formatDuration(call.totalSeconds)],
    ['Colgó', call.hangupBy ? HANGUP_BY_LABEL[call.hangupBy] || '—' : '—'],
    ['Número de la empresa', formatPhone(call.direction === 'OUTBOUND' ? call.fromNumber : call.toNumber)],
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {back}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tabular-nums">{formatPhone(other)}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TONE_CLASS[outcome.tone]}`}>{outcome.label}</span>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {call.customerId ? (
                <Link to={`/dashboard/clientes/${call.customerId}`} className="text-foreground underline underline-offset-2">
                  {call.customerName || 'Ver cliente'}
                </Link>
              ) : (
                'Sin cliente asociado'
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {call.handledByName || 'Nadie la atendió'}
            </span>
          </div>
        </div>
        {call.direction !== 'INTERNAL' && <CallBackButton number={other} label={call.missed ? 'Devolver llamada' : 'Llamar de nuevo'} />}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-2 bg-card border border-border rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Datos</h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {facts.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums text-right whitespace-nowrap">{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>

        <section className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Línea de tiempo</h2>
          {call.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">La central no registró pasos para esta llamada.</p>
          ) : (
            <ol className="space-y-3">
              {call.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground tabular-nums flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {formatTime(e.at)}
                  </span>
                  <span>{EVENT_LABEL[e.type] || e.type}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-3">
        <label htmlFor="voz-notas" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Notas de la llamada
        </label>
        <textarea
          id="voz-notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Qué pidió el cliente, compromisos, próximo paso…"
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
        />
        <div className="flex justify-end">
          <button onClick={saveNotes} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar notas'}
          </button>
        </div>
      </section>
    </div>
  );
}
export default VozLlamadaDetallePage;
