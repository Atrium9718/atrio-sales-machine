import * as React from 'react';
import { Coffee, Pencil, PhoneCall, Plus, Power, RefreshCw, Trash2, UserCheck, Users } from 'lucide-react';
import { notify } from '../../lib/notify';
import { formatDuration, formatPhone, voiceApi } from './callFormat';

type Strategy = 'RINGALL' | 'ROUND_ROBIN' | 'LEAST_RECENT' | 'FEWEST_CALLS' | 'LONGEST_IDLE' | 'SKILL_BASED';
type Overflow = 'VOICEMAIL' | 'ANOTHER_QUEUE' | 'EXTERNAL_NUMBER' | 'AI_AGENT' | 'HANGUP_WITH_MESSAGE';
type AgentStatus = 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';

interface Member {
  userId: string;
  name: string;
  extension: string | null;
  penalty: number;
  skills: string[];
  isActive: boolean;
}
interface Waiting {
  callId: string;
  fromNumber: string;
  callerName: string | null;
  waitSeconds: number;
  position: number;
}
interface Queue {
  id: string;
  name: string;
  extension: string | null;
  strategy: Strategy;
  ringSeconds: number;
  wrapUpSeconds: number;
  maxWaitSeconds: number;
  maxCallers: number;
  announcePositionEverySeconds: number;
  announceHoldTime: boolean;
  musicOnHold: string;
  greetingPromptId: string | null;
  periodicPromptId: string | null;
  overflowTarget: Overflow;
  overflowTargetId: string | null;
  isActive: boolean;
  members: Member[];
  waiting: Waiting[];
  waitingCallsCount: number;
  longestWaitSeconds: number;
  agentsAvailableCount: number;
  agentsOnCallCount: number;
  answeredToday: number;
  abandonedToday: number;
  serviceLevelPercentage: number | null;
}
interface Agent {
  userId: string;
  name: string;
  extension: string;
  status: AgentStatus;
  reason: string | null;
  timeInStateSeconds: number;
  callsHandledToday: number;
  queues: string[];
}
interface Prompt {
  id: string;
  name: string;
}

export const STRATEGY_LABEL: Record<Strategy, string> = {
  RINGALL: 'Timbran todos a la vez',
  ROUND_ROBIN: 'Por turnos',
  LEAST_RECENT: 'Quien lleva más rato sin atender',
  FEWEST_CALLS: 'Quien lleva menos llamadas hoy',
  LONGEST_IDLE: 'Quien lleva más tiempo libre',
  SKILL_BASED: 'Por habilidades',
};
export const OVERFLOW_LABEL: Record<Overflow, string> = {
  VOICEMAIL: 'Buzón de voz',
  ANOTHER_QUEUE: 'Otra cola',
  EXTERNAL_NUMBER: 'Un número externo (celular)',
  AI_AGENT: 'Agente de IA (por ahora, buzón)',
  HANGUP_WITH_MESSAGE: 'Despedirse y dejar tarea de devolver',
};
const STATUS: Record<AgentStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  ON_CALL: { label: 'En llamada', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  WRAP_UP: { label: 'Respiro', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300' },
  BREAK: { label: 'En pausa', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  OFFLINE: { label: 'Desconectado', cls: 'bg-muted text-muted-foreground' },
};

const emptyQueue = (): Queue => ({
  id: '',
  name: '',
  extension: null,
  strategy: 'ROUND_ROBIN',
  ringSeconds: 20,
  wrapUpSeconds: 10,
  maxWaitSeconds: 180,
  maxCallers: 15,
  announcePositionEverySeconds: 45,
  announceHoldTime: true,
  musicOnHold: 'default',
  greetingPromptId: null,
  periodicPromptId: null,
  overflowTarget: 'VOICEMAIL',
  overflowTargetId: null,
  isActive: true,
  members: [],
  waiting: [],
  waitingCallsCount: 0,
  longestWaitSeconds: 0,
  agentsAvailableCount: 0,
  agentsOnCallCount: 0,
  answeredToday: 0,
  abandonedToday: 0,
  serviceLevelPercentage: null,
});

const input = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function QueueForm({ initial, agents, prompts, queues, onClose, onSaved }: { initial: Queue; agents: Agent[]; prompts: Prompt[]; queues: Queue[]; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = React.useState<Queue>(initial);
  const [saving, setSaving] = React.useState(false);
  const set = (patch: Partial<Queue>) => setQ((prev) => ({ ...prev, ...patch }));
  const memberOf = (userId: string) => q.members.find((m) => m.userId === userId);
  const toggle = (a: Agent) =>
    set({
      members: memberOf(a.userId)
        ? q.members.filter((m) => m.userId !== a.userId)
        : [...q.members, { userId: a.userId, name: a.name, extension: a.extension, penalty: 0, skills: [], isActive: true }],
    });
  const patchMember = (userId: string, patch: Partial<Member>) => set({ members: q.members.map((m) => (m.userId === userId ? { ...m, ...patch } : m)) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await voiceApi('/api/voice/queues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
      notify(`Cola "${q.name}" guardada`, 'success');
      onSaved();
    } catch (err: any) {
      notify(err?.message || 'No se pudo guardar la cola', 'error');
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof Queue) => ({ value: String(q[key] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: Number(e.target.value) } as any) });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl p-6 space-y-5">
        <h2 className="text-lg font-semibold">{q.id ? `Editar cola "${initial.name}"` : 'Nueva cola'}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre">
            <input className={input} value={q.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ventas" required />
          </Field>
          <Field label="Cómo se reparten las llamadas">
            <select className={input} value={q.strategy} onChange={(e) => set({ strategy: e.target.value as Strategy })}>
              {Object.entries(STRATEGY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Segundos timbrando a cada asesor">
            <input type="number" min={5} max={120} className={input} {...num('ringSeconds')} />
          </Field>
          <Field label="Respiro después de colgar (segundos)" hint="Tiempo para anotar antes de recibir otra llamada.">
            <input type="number" min={0} max={300} className={input} {...num('wrapUpSeconds')} />
          </Field>
          <Field label="Espera máxima (segundos)" hint="Si nadie atiende en este tiempo, se desborda.">
            <input type="number" min={15} max={3600} className={input} {...num('maxWaitSeconds')} />
          </Field>
          <Field label="Máximo de personas esperando">
            <input type="number" min={1} max={100} className={input} {...num('maxCallers')} />
          </Field>
          <Field label="Decir la posición cada (segundos)">
            <input type="number" min={15} max={600} className={input} {...num('announcePositionEverySeconds')} />
          </Field>
          <Field label="Bienvenida al entrar a la cola">
            <select className={input} value={q.greetingPromptId ?? ''} onChange={(e) => set({ greetingPromptId: e.target.value || null })}>
              <option value="">Sin bienvenida</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Mensaje mientras espera" hint="Se oye con la posición (p. ej. «marque 9 para dejar un mensaje»).">
            <select className={input} value={q.periodicPromptId ?? ''} onChange={(e) => set({ periodicPromptId: e.target.value || null })}>
              <option value="">Ninguno</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Si nadie atiende a tiempo">
            <select className={input} value={q.overflowTarget} onChange={(e) => set({ overflowTarget: e.target.value as Overflow, overflowTargetId: null })}>
              {Object.entries(OVERFLOW_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          {q.overflowTarget === 'ANOTHER_QUEUE' && (
            <Field label="Cola de desborde">
              <select className={input} value={q.overflowTargetId ?? ''} onChange={(e) => set({ overflowTargetId: e.target.value || null })} required>
                <option value="">Elige…</option>
                {queues.filter((o) => o.id !== q.id).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
          )}
          {q.overflowTarget === 'EXTERNAL_NUMBER' && (
            <Field label="Número de desborde">
              <input className={input} value={q.overflowTargetId ?? ''} onChange={(e) => set({ overflowTargetId: e.target.value })} placeholder="310 555 1234" required />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm pt-6">
            <input type="checkbox" checked={q.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
            Cola activa
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-sm">Asesores de la cola</h3>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie tiene extensión todavía. Créalas en Configuración de voz → Extensiones.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg">
              {agents.map((a) => {
                const m = memberOf(a.userId);
                return (
                  <li key={a.userId} className="px-3 py-2 flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2 min-w-[12rem] flex-1">
                      <input type="checkbox" checked={!!m} onChange={() => toggle(a)} />
                      {a.name} <span className="text-muted-foreground">({a.extension})</span>
                    </label>
                    {m && (
                      <>
                        <label className="flex items-center gap-1 text-xs" title="Menor número = le timbra primero">
                          Prioridad
                          <select className="h-8 rounded-md border border-input bg-background px-1" value={m.penalty} onChange={(e) => patchMember(a.userId, { penalty: Number(e.target.value) })}>
                            {[0, 1, 2, 3].map((n) => (
                              <option key={n} value={n}>{n === 0 ? 'Primero' : `Nivel ${n + 1}`}</option>
                            ))}
                          </select>
                        </label>
                        {q.strategy === 'SKILL_BASED' && (
                          <input
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs w-44"
                            placeholder="habilidades: ventas, troqueles"
                            value={m.skills.join(', ')}
                            onChange={(e) => patchMember(a.userId, { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm">Cancelar</button>
          <button disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function VozColasPage() {
  const [queues, setQueues] = React.useState<Queue[] | null>(null);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Queue | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [q, a] = await Promise.all([voiceApi<{ queues: Queue[] }>('/api/voice/queues'), voiceApi<{ agents: Agent[] }>('/api/voice/agents')]);
      setQueues(q.queues);
      setAgents(a.agents);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las colas');
    }
  }, []);

  React.useEffect(() => {
    load();
    voiceApi<{ data: Prompt[] }>('/api/voice/prompts').then((d) => setPrompts(d.data)).catch(() => {});
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const setStatus = async (a: Agent, status: AgentStatus) => {
    try {
      await voiceApi('/api/voice/agents/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: a.userId, status, reason: status === 'BREAK' ? 'Pausa' : undefined }) });
      load();
    } catch (err: any) {
      notify(err?.message || 'No se pudo cambiar el estado', 'error');
    }
  };

  const remove = async (q: Queue) => {
    if (!window.confirm(`¿Borrar la cola "${q.name}"?`)) return;
    try {
      await voiceApi(`/api/voice/queues/${q.id}`, { method: 'DELETE' });
      notify('Cola borrada', 'success');
      load();
    } catch (err: any) {
      notify(err?.message || 'No se pudo borrar', 'error');
    }
  };

  const waitingTotal = queues?.reduce((s, q) => s + q.waitingCallsCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Colas de atención
          </h1>
          <p className="text-sm text-muted-foreground">
            Quién espera, qué asesores están disponibles y cómo se reparten las llamadas. Quien espera puede marcar 9 para dejar un mensaje.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 rounded-md border border-input text-sm inline-flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => setEditing(emptyQueue())} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nueva cola
          </button>
        </div>
      </div>

      {error && <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">{error}</div>}

      {queues && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Esperando ahora', String(waitingTotal)],
              ['Asesores disponibles', String(agents.filter((a) => a.status === 'AVAILABLE').length)],
              ['En llamada', String(agents.filter((a) => a.status === 'ON_CALL').length)],
              ['Atendidas hoy en colas', String(queues.reduce((s, q) => s + q.answeredToday, 0))],
            ].map(([label, value]) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {queues.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                  Aún no hay colas. Crea una, agrega a los asesores y luego apunta un número o una opción del menú a ella.
                </div>
              )}
              {queues.map((q) => (
                <section key={q.id} className={`bg-card border border-border rounded-xl ${q.isActive ? '' : 'opacity-60'}`}>
                  <div className="p-4 border-b border-border flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold flex items-center gap-2">
                        {q.name}
                        {!q.isActive && <span className="text-xs font-normal text-muted-foreground">(inactiva)</span>}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {STRATEGY_LABEL[q.strategy]} · espera máx. {Math.round(q.maxWaitSeconds / 60)} min · luego {OVERFLOW_LABEL[q.overflowTarget].toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(q)} className="h-8 px-2 rounded-md border border-input text-xs inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button onClick={() => remove(q)} className="h-8 px-2 rounded-md border border-input text-xs text-rose-600" title="Borrar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Esperando</div><div className="font-semibold tabular-nums">{q.waitingCallsCount}{q.waitingCallsCount ? ` · máx. ${formatDuration(q.longestWaitSeconds)}` : ''}</div></div>
                    <div><div className="text-xs text-muted-foreground">Disponibles</div><div className="font-semibold tabular-nums">{q.agentsAvailableCount} de {q.members.filter((m) => m.isActive).length}</div></div>
                    <div><div className="text-xs text-muted-foreground">Atendidas / abandonadas hoy</div><div className="font-semibold tabular-nums">{q.answeredToday} / {q.abandonedToday}</div></div>
                    <div><div className="text-xs text-muted-foreground">Atendidas en 20 s</div><div className="font-semibold tabular-nums">{q.serviceLevelPercentage == null ? '—' : `${q.serviceLevelPercentage}%`}</div></div>
                  </div>
                  {q.waiting.length > 0 && (
                    <ul className="border-t border-border divide-y divide-border text-sm">
                      {q.waiting.map((w) => (
                        <li key={w.callId} className="px-4 py-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4 text-amber-600" />
                            <span className="font-medium">{w.position}.</span> {w.callerName || formatPhone(w.fromNumber)}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{formatDuration(w.waitSeconds)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.members.length === 0 && <p className="px-4 pb-4 text-xs text-amber-700 dark:text-amber-400">Sin asesores: las llamadas pasan directo al desborde.</p>}
                </section>
              ))}
            </div>

            <section className="bg-card border border-border rounded-xl h-fit">
              <h2 className="p-4 border-b border-border font-semibold text-sm">Asesores</h2>
              <ul className="divide-y divide-border text-sm">
                {agents.map((a) => (
                  <li key={a.userId} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.name} <span className="text-muted-foreground font-normal">({a.extension})</span></span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.reason ? `${a.reason} · ` : ''}hace {formatDuration(a.timeInStateSeconds)} · {a.callsHandledToday} atendidas hoy
                      {a.queues.length ? ` · ${a.queues.join(', ')}` : ''}
                    </div>
                    <div className="flex gap-1">
                      {a.status !== 'AVAILABLE' && a.status !== 'ON_CALL' && (
                        <button onClick={() => setStatus(a, 'AVAILABLE')} className="h-7 px-2 rounded border border-input text-xs inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Disponible</button>
                      )}
                      {a.status === 'AVAILABLE' && (
                        <button onClick={() => setStatus(a, 'BREAK')} className="h-7 px-2 rounded border border-input text-xs inline-flex items-center gap-1"><Coffee className="w-3.5 h-3.5" /> Pausa</button>
                      )}
                      {a.status !== 'OFFLINE' && a.status !== 'ON_CALL' && (
                        <button onClick={() => setStatus(a, 'OFFLINE')} className="h-7 px-2 rounded border border-input text-xs inline-flex items-center gap-1"><Power className="w-3.5 h-3.5" /> Desconectar</button>
                      )}
                    </div>
                  </li>
                ))}
                {agents.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Nadie tiene extensión todavía.</li>}
              </ul>
            </section>
          </div>
        </>
      )}

      {editing && queues && (
        <QueueForm
          initial={editing}
          agents={agents}
          prompts={prompts}
          queues={queues}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
