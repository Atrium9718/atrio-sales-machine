import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, AlertCircle, PackageX } from 'lucide-react';

export type StockFilterType = 'todos' | 'ok' | 'bajo' | 'critico' | 'sin_stock';

export interface StockCounts {
  todos: number;
  ok: number;
  bajo: number;
  critico: number;
  sin_stock: number;
}

interface StockFilterBarProps {
  tabKey: string;
  counts: StockCounts;
  onFilterChange: (filter: StockFilterType) => void;
}

export function StockFilterBar({ tabKey, counts, onFilterChange }: StockFilterBarProps) {
  const [activeFilter, setActiveFilter] = useState<StockFilterType>('todos');

  useEffect(() => {
    const saved = localStorage.getItem(`inv_filter_${tabKey}`) as StockFilterType;
    if (saved && ['todos', 'ok', 'bajo', 'critico', 'sin_stock'].includes(saved)) {
      setActiveFilter(saved);
      onFilterChange(saved);
    } else {
      onFilterChange('todos');
    }
  }, [tabKey, onFilterChange]);

  const handleFilter = (filter: StockFilterType) => {
    setActiveFilter(filter);
    localStorage.setItem(`inv_filter_${tabKey}`, filter);
    onFilterChange(filter);
  };

  const getButtonClass = (filter: StockFilterType, activeColor: string) => {
    const isActive = activeFilter === filter;
    return `flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
      isActive 
        ? `${activeColor} border-transparent` 
        : 'bg-background text-muted-foreground border-border hover:bg-muted'
    }`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={() => handleFilter('todos')} 
        className={getButtonClass('todos', 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100')}
      >
        <ClipboardList className="w-4 h-4" /> Todos ({counts.todos})
      </button>
      <button 
        onClick={() => handleFilter('ok')} 
        className={getButtonClass('ok', 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')}
      >
        <CheckCircle2 className="w-4 h-4" /> OK ({counts.ok})
      </button>
      <button 
        onClick={() => handleFilter('bajo')} 
        className={getButtonClass('bajo', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')}
      >
        <AlertTriangle className="w-4 h-4" /> Bajo ({counts.bajo})
      </button>
      <button 
        onClick={() => handleFilter('critico')} 
        className={getButtonClass('critico', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400')}
      >
        <AlertCircle className="w-4 h-4" /> Crítico ({counts.critico})
      </button>
      <button 
        onClick={() => handleFilter('sin_stock')} 
        className={getButtonClass('sin_stock', 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300')}
      >
        <PackageX className="w-4 h-4" /> Sin stock ({counts.sin_stock})
      </button>
    </div>
  );
}

export function applyStockFilter<T extends { stock: number; minimo: number }>(items: T[], filter: StockFilterType): T[] {
  switch (filter) {
    case 'ok': return items.filter(i => i.stock > i.minimo);
    case 'bajo': return items.filter(i => i.stock <= i.minimo && i.stock > (i.minimo * 0.25));
    case 'critico': return items.filter(i => i.stock <= (i.minimo * 0.25) && i.stock > 0);
    case 'sin_stock': return items.filter(i => i.stock === 0);
    default: return items;
  }
}

export function getStockCounts<T extends { stock: number; minimo: number }>(items: T[]): StockCounts {
  return {
    todos: items.length,
    ok: items.filter(i => i.stock > i.minimo).length,
    bajo: items.filter(i => i.stock <= i.minimo && i.stock > (i.minimo * 0.25)).length,
    critico: items.filter(i => i.stock <= (i.minimo * 0.25) && i.stock > 0).length,
    sin_stock: items.filter(i => i.stock === 0).length,
  };
}
