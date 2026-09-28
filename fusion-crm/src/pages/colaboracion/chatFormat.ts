// Utilidades puras del chat interno (sin dependencias de Firebase, se pueden probar aislado).

/** Etiqueta del separador de día: "Hoy", "Ayer" o la fecha. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  const label = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Mensajes seguidos del mismo autor (menos de 5 min) se muestran sin repetir nombre ni avatar. */
export function isContinuation(prev: { authorId: string; createdAt: string } | undefined, msg: { authorId: string; createdAt: string }): boolean {
  if (!prev || prev.authorId !== msg.authorId) return false;
  const gap = new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap >= 0 && gap < 5 * 60_000 && new Date(prev.createdAt).toDateString() === new Date(msg.createdAt).toDateString();
}
