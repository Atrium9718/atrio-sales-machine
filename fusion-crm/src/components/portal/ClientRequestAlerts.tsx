import * as React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Paperclip, X } from 'lucide-react';

/**
 * Avisos del portal del cliente para el equipo: contador de solicitudes nuevas (menú) y
 * notificación emergente cuando un cliente envía una solicitud (evento SSE
 * CLIENT_REQUEST_CREATED, reenviado por RealtimeSyncProvider).
 */

export const CLIENT_REQUESTS_UPDATED_EVENT = 'fusion_client_requests_updated';
const CLIENT_REQUEST_CREATED_EVENT = 'fusion_client_request_created';
const TOAST_DURATION_MS = 12_000;

export function notifyClientRequestsChanged() {
  window.dispatchEvent(new Event(CLIENT_REQUESTS_UPDATED_EVENT));
}

/** Número de solicitudes con estado "Nueva"; se actualiza con los eventos en tiempo real. */
export function useNewClientRequestsCount(enabled = true): number {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/client-portal/requests/summary');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(Number(data.newCount) || 0);
      } catch {
        // Sin conexión: se conserva el último valor
      }
    };
    load();
    window.addEventListener(CLIENT_REQUESTS_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CLIENT_REQUESTS_UPDATED_EVENT, load);
    };
  }, [enabled]);

  return count;
}

interface ToastItem {
  requestId: string;
  clientName: string;
  preview: string;
  attachmentCount: number;
}

export function ClientRequestToasts() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.requestId !== id));
  }, []);

  React.useEffect(() => {
    const onCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastItem | undefined;
      if (!detail?.requestId) return;
      setToasts((list) => [detail, ...list.filter((t) => t.requestId !== detail.requestId)].slice(0, 3));
      window.setTimeout(() => dismiss(detail.requestId), TOAST_DURATION_MS);
    };
    window.addEventListener(CLIENT_REQUEST_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(CLIENT_REQUEST_CREATED_EVENT, onCreated);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.requestId} className="bg-card border border-border rounded-xl shadow-lg p-4 flex gap-3" role="status">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Inbox className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Nueva solicitud de {t.clientName}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 break-words">{t.preview}</p>
            {t.attachmentCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {t.attachmentCount} adjunto(s)
              </p>
            )}
            <Link
              to="/dashboard/portal-clientes"
              onClick={() => dismiss(t.requestId)}
              className="inline-block text-xs font-semibold text-primary hover:underline pt-0.5"
            >
              Ver solicitud →
            </Link>
          </div>
          <button onClick={() => dismiss(t.requestId)} className="p-1 h-fit rounded text-muted-foreground hover:bg-muted" aria-label="Cerrar aviso">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
