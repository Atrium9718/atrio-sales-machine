import * as React from 'react';
import { BellRing, CheckCircle2, Clock, Loader2, RotateCcw, SkipForward, XCircle } from 'lucide-react';
import { notify } from '@/lib/notify';
import { inboxApi, timeAgo, type StageNotice } from './api';

const STATUS: Record<StageNotice['status'], { label: string; icon: React.ElementType; className: string }> = {
  sent: { label: 'Enviado', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-500/10' },
  scheduled: { label: 'En cola', icon: Clock, className: 'text-amber-700 dark:text-amber-300 bg-amber-500/10' },
  failed: { label: 'Falló', icon: XCircle, className: 'text-rose-600 bg-rose-500/10' },
  skipped: { label: 'No se envió', icon: SkipForward, className: 'text-muted-foreground bg-muted' },
};

/** Historial de avisos automáticos al cliente por cambio de etapa. */
export function NoticesPanel() {
  const [items, setItems] = React.useState<StageNotice[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    inboxApi.notices().then(setItems).catch((err) => notify(err.message, 'error'));
  }, []);

  React.useEffect(() => {
    load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, [load]);

  const retry = async (id: string) => {
    setBusy(id);
    try {
      const n = await inboxApi.retryNotice(id);
      notify(n.status === 'sent' ? 'Aviso enviado' : `No se pudo enviar: ${n.reason}`, n.status === 'sent' ? 'success' : 'error');
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!items) return <div className="p-8 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Cargando…</div>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <BellRing className="w-4 h-4 text-primary" />
        <div>
          <div className="font-bold text-sm">Avisos de cambio de etapa</div>
          <div className="text-[11px] text-muted-foreground">Se envían por WhatsApp cuando un pedido avanza en producción. Se activan en Configuración de la IA.</div>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Todavía no hay avisos. Aparecerán cuando un pedido cambie de etapa (si los avisos están activados).</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((n) => {
            const st = STATUS[n.status];
            return (
              <div key={n.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${st.className}`}>
                  <st.icon className="w-3.5 h-3.5" /> {st.label}
                </span>
                <span className="font-semibold">{n.orderNumber}</span>
                <span className="text-muted-foreground">→ {n.stageLabel}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[220px]">{n.clientName}{n.phone ? ` · +${n.phone}` : ''}</span>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {n.status === 'scheduled' && new Date(n.dueAt) > new Date() ? `sale ${new Date(n.dueAt).toLocaleString('es-CO', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : timeAgo(n.sentAt || n.createdAt)}
                  {n.mode && ` · ${n.mode === 'template' ? 'plantilla' : 'texto'}`}
                </span>
                {(n.status === 'failed' || n.status === 'scheduled') && n.attempts > 0 && (
                  <button disabled={busy === n.id} onClick={() => retry(n.id)} className="px-2 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-muted flex items-center gap-1">
                    {busy === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Reintentar
                  </button>
                )}
                {n.reason && <p className="basis-full text-[11px] text-muted-foreground">{n.reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
