import React, { useState, useRef, useEffect } from 'react';

const formatCurrency = (val: number) =>
  `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface InlineEditCellProps {
  value: number;
  onSave: (val: number) => Promise<void>;
  type?: 'currency' | 'number';
}

export function InlineEditCell({ value, onSave, type = 'currency' }: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const num = parseFloat(tempValue);
    if (!isNaN(num) && num !== value) {
      setLoading(true);
      try {
        await onSave(num);
      } finally {
        setLoading(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
      setTempValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="w-24 px-2 py-1 text-sm border rounded bg-background"
        />
        {loading && <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />}
      </div>
    );
  }

  const displayValue = type === 'currency' 
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('es-CO').format(value);

  return (
    <div 
      onDoubleClick={() => { setTempValue(value.toString()); setIsEditing(true); }}
      className="cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
      title="Doble clic para editar"
    >
      {displayValue}
    </div>
  );
}
