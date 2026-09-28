import * as React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  Globe,
  Hand,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import {
  CHANNEL_LABEL,
  INTENT_LABEL,
  MODE_LABEL,
  inboxApi,
  timeAgo,
  type Conversation,
  type ConversationMessage,
  type ConversationSummary,
  type InboxStats,
} from './api';

const FILTERS = [
  { key: 'needsHuman', label: 'Necesitan persona' },
  { key: 'approval', label: 'Por aprobar' },
  { key: 'open', label: 'Abiertas' },
  { key: 'resolved', label: 'Resueltas' },
] as const;

function ChannelIcon({ channel, className = 'w-3.5 h-3.5' }: { channel: string; className?: string }) {
  if (channel === 'whatsapp') return <MessageCircle className={`${className} text-emerald-500`} />;
  if (channel === 'instagram') return <Instagram className={`${className} text-pink-500`} />;
  if (channel === 'messenger') return <MessageSquare className={`${className} text-blue-500`} />;
  if (channel === 'webchat') return <Globe className={`${className} text-indigo-500`} />;
  return <Sparkles className={`${className} text-amber-500`} />;
}

function StatusTicks({ m }: { m: ConversationMessage }) {
  if (m.status === 'failed') return <span title={m.error || 'No enviado'} className="text-rose-500 font-bold">!</span>;
  if (m.status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-sky-500" aria-label="Leído" />;
  if (m.status === 'delivered') return <CheckCheck className="w-3.5 h-3.5" aria-label="Entregado" />;
  if (m.status === 'sent') return <Check className="w-3.5 h-3.5" aria-label="Enviado" />;
  return null;
}

/** Ventana de 24 h de WhatsApp/Meta para escribir texto libre. */
function windowClosed(conv: Conversation): boolean {
  if (!['whatsapp', 'messenger', 'instagram'].includes(conv.channel)) return false;
  return !conv.lastInboundAt || Date.now() - new Date(conv.lastInboundAt).getTime() > 24 * 60 * 60 * 1000;
}

function MessageBubble({ m }: { m: ConversationMessage }) {
  const mine = m.direction === 'out';
  if (m.status === 'suggested') return null; // se muestra aparte, con acciones
  const who = m.author === 'customer' ? null : m.author === 'ai' ? `IA${m.aiAgent ? ` · ${m.aiAgent}` : ''}${m.agentName ? ` · aprobó ${m.agentName}` : ''}` : m.agentName || 'Equipo';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
          m.status === 'discarded'
            ? 'bg-muted/50 text-muted-foreground line-through'
            : mine
            ? m.author === 'ai'
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm'
        }`}
      >
        {who && (
          <div className="text-[10px] font-semibold opacity-80 mb-0.5 flex items-center gap-1">
            {m.author === 'ai' ? <Bot className="w-3 h-3" /> : <UserRound className="w-3 h-3" />} {who}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{m.text}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${mine ? 'opacity-80' : 'text-muted-foreground'}`}>
          {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          {mine && <StatusTicks m={m} />}
        </div>
        {m.status === 'failed' && <p className="text-[11px] mt-1 font-medium text-rose-200">No se envió: {m.error}</p>}
      </div>
    </div>
  );
}

function SuggestionCard({ conv, m, onDone }: { conv: Conversation; m: ConversationMessage; onDone: (c: Conversation) => void }) {
  const [text, setText] = React.useState(m.text);
  const [busy, setBusy] = React.useState(false);
  const run = async (fn: () => Promise<Conversation>, ok: string) => {
    setBusy(true);
    try {
      onDone(await fn());
      notify(ok, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-2 border-dashed border-indigo-400/60 bg-indigo-500/5 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
        <Sparkles className="w-3.5 h-3.5" /> Respuesta sugerida por la IA{m.aiAgent ? ` (${m.aiAgent})` : ''}: revísala antes de enviar
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(8, Math.max(2, text.split('\n').length + 1))}
        className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => inboxApi.discard(conv.id, m.id), 'Sugerencia descartada')}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          disabled={busy || !text.trim()}
          onClick={() => run(() => inboxApi.approve(conv.id, m.id, text !== m.text ? text : undefined), 'Respuesta enviada')}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {text !== m.text ? 'Enviar corregida' : 'Aprobar y enviar'}
        </button>
      </div>
    </div>
  );
}

function ConversationDetail({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const [conv, setConv] = React.useState<Conversation | null>(null);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    try {
      const c = await inboxApi.get(id);
      setConv(c);
      if (c.unread > 0) inboxApi.action(id, 'read').then(onChanged).catch(() => undefined);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  }, [id, onChanged]);

  React.useEffect(() => {
    setConv(null);
    load();
  }, [load]);

  React.useEffect(() => {
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail?.conversationId === id) load();
    };
    window.addEventListener('fusion_omnichannel_updated', onUpdate);
    return () => window.removeEventListener('fusion_omnichannel_updated', onUpdate);
  }, [id, load]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages.length]);

  const apply = async (fn: () => Promise<Conversation>, ok?: string) => {
    setBusy(true);
    try {
      setConv(await fn());
      onChanged();
      if (ok) notify(ok, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!conv) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…</div>;
  }

  const suggestions = conv.messages.filter((m) => m.status === 'suggested');
  const closed = windowClosed(conv);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
      <div className="px-3 sm:px-4 py-2.5 border-b border-border bg-card flex items-center gap-2 flex-wrap">
        <button onClick={onBack} className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ChannelIcon channel={conv.channel} className="w-5 h-5" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate flex items-center gap-1.5">
            {conv.contactName}
            {conv.verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded" title={`Verificado por ${conv.verifiedBy === 'phone' ? 'número registrado' : 'NIT + pedido'}`}>
                <ShieldCheck className="w-3 h-3" /> {conv.clientName}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {CHANNEL_LABEL[conv.channel]} · {MODE_LABEL[conv.mode]}
            {conv.assigneeName ? ` (${conv.assigneeName})` : ''}
            {conv.lastIntent ? ` · ${INTENT_LABEL[conv.lastIntent] || conv.lastIntent}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {conv.mode !== 'human' ? (
            <button disabled={busy} onClick={() => apply(() => inboxApi.action(conv.id, 'take-over'), 'Tomaste la conversación')} className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted flex items-center gap-1">
              <Hand className="w-3.5 h-3.5" /> Tomar control
            </button>
          ) : (
            <button disabled={busy} onClick={() => apply(() => inboxApi.action(conv.id, 'return-to-ai'), 'La IA vuelve a atender')} className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Devolver a la IA
            </button>
          )}
          {conv.status === 'open' && (
            <button disabled={busy} onClick={() => apply(() => inboxApi.action(conv.id, 'resolve'), 'Conversación resuelta')} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
            </button>
          )}
        </div>
      </div>

      {conv.needsHuman && conv.handoffReason && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <span><b>Necesita una persona:</b> {conv.handoffReason}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {conv.messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aún no hay mensajes.</p>}
        {conv.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {suggestions.map((m) => (
          <SuggestionCard key={m.id} conv={conv} m={m} onDone={(c) => { setConv(c); onChanged(); }} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border bg-card p-2 sm:p-3">
        {closed ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Pasaron más de 24 h desde el último mensaje del cliente: {CHANNEL_LABEL[conv.channel]} no permite escribirle texto libre hasta que vuelva a escribir.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              const t = text;
              setText('');
              apply(() => inboxApi.reply(conv.id, t));
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                }
              }}
              rows={1}
              placeholder={conv.mode === 'human' ? 'Escribe tu respuesta…' : 'Escribe para responder tú (tomarás el control)…'}
              className="flex-1 resize-none bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
            />
            <button disabled={busy || !text.trim()} className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40" aria-label="Enviar">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatsStrip({ stats }: { stats: InboxStats | null }) {
  if (!stats) return null;
  const items = [
    { label: 'Resueltas por la IA (30 días)', value: stats.aiResolvedPercent === null ? '—' : `${stats.aiResolvedPercent}%`, tone: 'text-indigo-600 dark:text-indigo-300' },
    { label: 'Necesitan persona', value: stats.needsHuman, tone: stats.needsHuman ? 'text-amber-600' : '' },
    { label: 'Por aprobar', value: stats.awaitingApproval, tone: stats.awaitingApproval ? 'text-indigo-600' : '' },
    { label: 'Conversaciones (30 días)', value: stats.conversations, tone: '' },
    { label: 'Envíos fallidos', value: stats.failedMessages, tone: stats.failedMessages ? 'text-rose-600' : '' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {items.map((i) => (
        <div key={i.label} className="bg-card border border-border rounded-xl px-3 py-2">
          <div className={`text-lg font-black ${i.tone}`}>{i.value}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">{i.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ConversationsPanel() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]['key']>('open');
  const [items, setItems] = React.useState<ConversationSummary[]>([]);
  const [counts, setCounts] = React.useState<{ needsHuman: number; approval: number }>({ needsHuman: 0, approval: 0 });
  const [stats, setStats] = React.useState<InboxStats | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [list, s] = await Promise.all([inboxApi.list(filter), inboxApi.stats()]);
      setItems(list);
      setStats(s);
      setCounts({ needsHuman: s.needsHuman, approval: s.awaitingApproval });
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
    const timer = window.setInterval(refresh, 20000);
    const onUpdate = () => refresh();
    window.addEventListener('fusion_omnichannel_updated', onUpdate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('fusion_omnichannel_updated', onUpdate);
    };
  }, [refresh]);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <StatsStrip stats={stats} />
      <div className="flex-1 min-h-[420px] flex bg-card border border-border rounded-xl overflow-hidden">
        <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-border flex-col shrink-0`}>
          <div className="p-2 border-b border-border flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const n = f.key === 'needsHuman' ? counts.needsHuman : f.key === 'approval' ? counts.approval : 0;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${filter === f.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  {f.label}
                  {n > 0 && <span className={`px-1.5 rounded-full text-[10px] ${filter === f.key ? 'bg-white/25' : f.key === 'needsHuman' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Cargando…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {filter === 'needsHuman' ? '🎉 Nada pendiente: la IA está atendiendo todo.' : 'No hay conversaciones aquí.'}
              </div>
            ) : (
              items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-muted/40 ${selected === c.id ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={c.channel} />
                    <span className="font-semibold text-sm truncate flex-1">{c.contactName}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.lastMessage?.author === 'ai' && <Bot className="w-3 h-3 text-indigo-500 shrink-0" />}
                    <p className="text-xs text-muted-foreground truncate flex-1">{c.lastMessage?.text || '—'}</p>
                    {c.unread > 0 && <span className="px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{c.unread}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.needsHuman && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">Necesita persona</span>}
                    {c.awaitingApproval && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">Por aprobar</span>}
                    {c.verified && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{c.clientName}</span>}
                    {c.lastIntent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{INTENT_LABEL[c.lastIntent] || c.lastIntent}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        {selected ? (
          <ConversationDetail id={selected} onBack={() => setSelected(null)} onChanged={refresh} />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-sm text-muted-foreground p-6 text-center">
            <div>
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Elige una conversación. Arriba aparecen primero las que necesitan a una persona.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
