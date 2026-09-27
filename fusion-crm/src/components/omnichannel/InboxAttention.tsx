import * as React from 'react';
import { notify } from '../../lib/notify';

/**
 * Lo único que la bandeja le pide al equipo: conversaciones que necesitan a una persona y
 * respuestas de la IA por aprobar. Contador del menú y aviso cuando un caso pasa a persona.
 */
const UPDATED_EVENT = 'fusion_omnichannel_updated';

export function useInboxAttentionCount(enabled = true): number {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/omnichannel/stats');
        if (!res.ok) return;
        const { stats } = await res.json();
        if (!cancelled) setCount((Number(stats?.needsHuman) || 0) + (Number(stats?.awaitingApproval) || 0));
      } catch {
        // Sin conexión: se conserva el último valor
      }
    };
    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener(UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(UPDATED_EVENT, load);
    };
  }, [enabled]);
  return count;
}

/** Aviso cuando una conversación pasa a una persona (una vez por motivo y conversación). */
export function InboxAttentionNotifier() {
  const seen = React.useRef(new Set<string>());
  React.useEffect(() => {
    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.needsHuman || !d.handoffReason) return;
      const key = `${d.conversationId}:${d.handoffReason}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      if (window.location.pathname.startsWith('/dashboard/inbox')) return; // ya la están viendo
      notify(`${d.contactName || 'Un cliente'} necesita a una persona (${d.handoffReason}). Revisa la Bandeja de entrada.`, 'info');
    };
    window.addEventListener(UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATED_EVENT, onUpdate);
  }, []);
  return null;
}
