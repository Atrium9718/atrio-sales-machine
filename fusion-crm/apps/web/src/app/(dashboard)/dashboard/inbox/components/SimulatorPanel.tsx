import * as React from 'react';
import { Bot, Loader2, RotateCcw, Send, ShieldCheck, UserRound, AlertTriangle, Sparkles } from 'lucide-react';
import { notify } from '@/lib/notify';
import { INTENT_LABEL, inboxApi, type Conversation } from './api';

const EXAMPLES = [
  '¿Cómo va mi pedido?',
  'Mi NIT es 900123456 y el pedido es la OT-1203',
  'Necesito cotizar 1000 volantes media carta a color',
  'Quiero hablar con un asesor',
];

/**
 * Prueba la atención de la IA con los datos reales (clientes, pedidos, conocimiento configurado)
 * sin enviar nada a ningún canal ni aparecer en la bandeja.
 */
export function SimulatorPanel() {
  const [session, setSession] = React.useState(() => `sim-${Date.now()}`);
  const [phone, setPhone] = React.useState('');
  const [text, setText] = React.useState('');
  const [conv, setConv] = React.useState<Conversation | null>(null);
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages.length]);

  const send = async (message: string) => {
    if (!message.trim()) return;
    setBusy(true);
    setText('');
    try {
      setConv(await inboxApi.simulate(message, session, phone || undefined));
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    await inboxApi.resetSimulator().catch(() => undefined);
    setSession(`sim-${Date.now()}`);
    setConv(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-3 h-full min-h-0">
      <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden min-h-[420px]">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Simulador de atención</div>
            <div className="text-[11px] text-muted-foreground">Usa los datos reales y la IA real, pero no envía nada ni aparece en la bandeja.</div>
          </div>
          <button onClick={reset} className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10">
          {!conv?.messages.length && (
            <div className="text-center text-sm text-muted-foreground py-8 space-y-3">
              <p>Escribe como si fueras un cliente. Prueba, por ejemplo:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => send(e)} className="px-3 py-1.5 rounded-full border border-border bg-card text-xs hover:border-primary">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          {conv?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.direction === 'out' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                <div className="text-[10px] font-semibold opacity-80 mb-0.5 flex items-center gap-1">
                  {m.direction === 'out' ? <><Bot className="w-3 h-3" /> IA · {m.aiAgent}</> : <><UserRound className="w-3 h-3" /> Cliente</>}
                </div>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está respondiendo…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="border-t border-border p-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe como cliente…"
            className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button disabled={busy || !text.trim()} className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40" aria-label="Enviar">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <label className="block text-xs font-bold">Simular WhatsApp desde el número</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={reset}
            placeholder="Ej. 3104459921 (opcional)"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">Si el número está registrado en un cliente, la IA lo reconoce sin pedirle datos.</p>
        </div>
        {conv && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-1.5 text-xs">
            <div className="font-bold">Lo que entendió la IA</div>
            <div>Intención: <b>{conv.lastIntent ? INTENT_LABEL[conv.lastIntent] || conv.lastIntent : '—'}</b></div>
            <div className="flex items-center gap-1">
              Cliente: {conv.verified ? <><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> <b>{conv.clientName}</b></> : <span className="text-muted-foreground">sin verificar</span>}
            </div>
            {conv.needsHuman && (
              <div className="flex items-start gap-1 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Pasaría a una persona: {conv.handoffReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
