export function computeDeliverySemaphore(input: {
  dueDate: Date | null, completedAt: Date | null, now: Date
}): { color: 'GREEN' | 'YELLOW' | 'RED' | 'NONE', label: string } {
  if (input.completedAt) return { color: 'GREEN', label: 'A tiempo' };
  if (!input.dueDate) return { color: 'NONE', label: '' };
  
  const due = input.dueDate.getTime();
  const now = input.now.getTime();
  const diffHours = (due - now) / 3600000;
  
  if (diffHours < 0) return { color: 'RED', label: 'Vencido' };
  if (diffHours < 48) return { color: 'YELLOW', label: 'Próximo' };
  return { color: 'GREEN', label: 'A tiempo' };
}
