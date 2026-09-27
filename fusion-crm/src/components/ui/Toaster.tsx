import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { subscribeNotify, type NotifyItem } from '../../lib/notify';

const STYLES: Record<NotifyItem['kind'], { icon: React.ElementType; className: string; ms: number }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300', ms: 4000 },
  error: { icon: AlertCircle, className: 'border-rose-500/40 text-rose-700 dark:text-rose-300', ms: 8000 },
  info: { icon: Info, className: 'border-primary/30 text-primary', ms: 5000 },
};

/** Muestra los avisos de notify() en la esquina superior derecha, sin bloquear la pantalla. */
export function Toaster() {
  const [items, setItems] = useState<NotifyItem[]>([]);

  useEffect(
    () =>
      subscribeNotify((item) => {
        setItems((prev) => [...prev.slice(-3), item]);
        window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), STYLES[item.kind].ms);
      }),
    []
  );

  const dismiss = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div
      className="fixed top-16 right-3 left-3 sm:left-auto sm:right-4 z-[100] flex flex-col items-stretch sm:items-end gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {items.map((item) => {
        const { icon: Icon, className } = STYLES[item.kind];
        return (
          <div
            key={item.id}
            className={`pointer-events-auto w-full sm:w-96 flex items-start gap-2.5 rounded-xl border bg-card shadow-lg px-3.5 py-3 animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
          >
            <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-foreground whitespace-pre-line break-words">{item.message}</p>
            <button
              onClick={() => dismiss(item.id)}
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
