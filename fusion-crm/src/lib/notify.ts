/**
 * Avisos no bloqueantes (reemplazan a window.alert). Se pueden llamar desde cualquier
 * parte, incluso fuera de React: el componente <Toaster /> los muestra.
 */
export type NotifyKind = 'success' | 'error' | 'info';

export interface NotifyItem {
  id: number;
  message: string;
  kind: NotifyKind;
}

type Listener = (item: NotifyItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

const ERROR_HINTS = /error|no se pudo|fall[óo]|inconveniente|insuficiente|restringido|supera|inv[aá]lid|denegad/i;
const SUCCESS_HINTS = /[ée]xito|exitosamente|guardad[oa]|cread[oa]|marcada|enviad[oa]|actualizad[oa]|registrad[oa]/i;

/** Deduce el tipo de aviso a partir del texto cuando no se indica. */
export function inferKind(message: string): NotifyKind {
  if (ERROR_HINTS.test(message)) return 'error';
  if (SUCCESS_HINTS.test(message)) return 'success';
  return 'info';
}

export function notify(message: unknown, kind?: NotifyKind): void {
  const text = typeof message === 'string' ? message : message instanceof Error ? message.message : String(message ?? '');
  if (!text) return;
  const item: NotifyItem = { id: nextId++, message: text, kind: kind ?? inferKind(text) };
  if (listeners.size === 0) {
    // Sin <Toaster /> montado (p. ej. en pruebas): no se pierde el mensaje
    console.info(`[aviso:${item.kind}] ${text}`);
    return;
  }
  listeners.forEach((l) => l(item));
}

export function subscribeNotify(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
