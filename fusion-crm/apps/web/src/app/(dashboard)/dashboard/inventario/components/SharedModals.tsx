import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// === Delete With Justification Modal ===
interface DeleteWithJustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  itemName: string;
}

export function DeleteWithJustificationModal({ isOpen, onClose, onConfirm, itemName }: DeleteWithJustificationModalProps) {
  const [reason, setReason] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!reason.trim() || !accepted) return;
    setLoading(true);
    try {
      await onConfirm(reason);
      onClose();
      setReason('');
      setAccepted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-lg shadow-lg border border-border p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-6 h-6" /> Eliminar Registro
        </h2>
        
        <p className="text-sm text-muted-foreground mb-4">
          Estás a punto de eliminar <strong>{itemName}</strong>. Toda eliminación en inventario requiere justificación.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Motivo de eliminación *</label>
            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Justificación obligatoria..."
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm min-h-[100px] resize-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <label className="flex items-start gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={accepted} 
              onChange={e => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span className="text-xs text-muted-foreground leading-tight">
              Entiendo que esta acción generará un registro de auditoría permanente e inmutable en el sistema.
            </span>
          </label>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!reason.trim() || !accepted || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : null}
            Eliminar Definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}


// === Ajuste de Inventario Modal ===
interface AjusteInventarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  item: { id: string, name: string, currentStock: number, unit?: string };
  tipoInventario: 'papel' | 'insumo_maquina' | 'insumo_general';
}

export function AjusteInventarioModal({ isOpen, onClose, onConfirm, item, tipoInventario }: AjusteInventarioModalProps) {
  const [nuevaCantidad, setNuevaCantidad] = useState(item.currentStock.toString());
  const [motivo, setMotivo] = useState('Conteo físico');
  const [descripcion, setDescripcion] = useState('');
  const [docRef, setDocRef] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const diferencia = (parseFloat(nuevaCantidad) || 0) - item.currentStock;
  const isPositive = diferencia > 0;
  const isNegative = diferencia < 0;

  const handleConfirm = async () => {
    const cantidad = parseFloat(nuevaCantidad);
    if (isNaN(cantidad) || cantidad === item.currentStock) return;
    
    setLoading(true);
    try {
      await onConfirm({
        tipoInventario,
        itemId: item.id,
        cantidadNueva: cantidad,
        motivo,
        descripcion,
        documentoReferencia: docRef
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-lg shadow-lg border border-border p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          Ajuste de Existencias
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ajustando el stock para <strong>{item.name}</strong>
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-muted rounded-md border text-center">
            <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">Stock Actual</span>
            <span className="text-xl font-mono">{item.currentStock} {item.unit}</span>
          </div>
          <div className={`p-3 rounded-md border text-center ${isPositive ? 'bg-green-50 border-green-200 text-green-800' : isNegative ? 'bg-red-50 border-red-200 text-red-800' : 'bg-muted border-border'}`}>
            <span className="block text-xs uppercase font-bold mb-1 opacity-70">Diferencia</span>
            <span className="text-xl font-mono">
              {isPositive ? '+' : ''}{diferencia} {item.unit}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nueva cantidad real *</label>
              <input 
                type="number" 
                value={nuevaCantidad}
                onChange={e => setNuevaCantidad(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Motivo *</label>
              <select 
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option>Conteo físico</option>
                <option>Deterioro / Merma</option>
                <option>Error de registro anterior</option>
                <option>Material encontrado no registrado</option>
                <option>Obsolescencia</option>
                <option>Otro</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Documento de Referencia</label>
            <input 
              type="text" 
              value={docRef}
              onChange={e => setDocRef(e.target.value)}
              placeholder="Ej: Acta de conteo #123"
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción adicional</label>
            <textarea 
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Detalle opcional..."
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm h-20 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={diferencia === 0 || isNaN(parseFloat(nuevaCantidad)) || loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : null}
            Aplicar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
}
