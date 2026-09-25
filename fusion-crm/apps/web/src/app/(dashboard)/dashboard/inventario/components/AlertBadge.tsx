import React from 'react';
import { Bell } from 'lucide-react';

interface AlertBadgeProps {
  total: number;
  critical: number;
}

export function AlertBadge({ total, critical }: AlertBadgeProps) {
  if (total === 0) return null;

  const isCritical = critical > 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ml-2 ${
      isCritical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {isCritical ? <Bell className="w-3 h-3 fill-red-700" /> : <Bell className="w-3 h-3" />}
      {total}
    </span>
  );
}
