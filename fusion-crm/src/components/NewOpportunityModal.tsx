import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, AlertTriangle, Search } from 'lucide-react';
import { searchCustomers } from '@/lib/customerService';

const TEMPLATES = [
  { id: 't1', name: 'Licenciamiento ERP', suggestedValue: 45000000, expectedCycleDays: 45 },
  { id: 't2', name: 'Consultoría Estratégica', suggestedValue: 12000000, expectedCycleDays: 20 },
  { id: 't3', name: 'Soporte Anual', suggestedValue: 8500000, expectedCycleDays: 15 },
];

const INITIAL_OPPS: any[] = [];

export function NewOpportunityModal({ onClose, onSave }: { onClose: () => void, onSave?: (opp: any) => void }) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientId, setClientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!client || client.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchCustomers(client);
        setSuggestions(results);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [client]);

  const selectSuggestion = (c: any) => {
    setClient(c.name);
    setClientId(c.id);
    setShowDropdown(false);
  };


  // Check duplicates on typing (debounced conceptually)
  useEffect(() => {
    if (title.length > 3 && client.length > 2) {
      const recent = INITIAL_OPPS.find(o => 
        o.clientName.toLowerCase() === client.toLowerCase() &&
        o.title.toLowerCase().includes(title.toLowerCase().substring(0,4))
      );
      if (recent) {
        setDuplicateWarning(recent);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [title, client]);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find(x => x.id === id);
    if (t && !amount) {
      setAmount(t.suggestedValue);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !client) return;
    
    const newOpp = {
      id: `OPP-0${Math.floor(400 + Math.random() * 500)}`,
      title,
      clientId: clientId || `c${Math.floor(Math.random() * 100)}`,
      clientName: client,
      stageId: 's1',
      amount: amount || 0,
      createdAt: new Date().toISOString()
    };
    if(onSave) onSave(newOpp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-lg font-black text-foreground">Crear Oportunidad Rápida</h2>
          <button onClick={onClose} className="text-muted-foreground hover:bg-muted p-1 rounded-md"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-4 flex-1 overflow-y-auto">
          
          {duplicateWarning && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700">Posible Duplicado Detectado</p>
                <p className="text-xs text-amber-700/80 mt-1">
                  Ya existe "{duplicateWarning.title}" para este cliente, creada hace poco. ¿Es la misma?
                </p>
                <button type="button" className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-md mt-2 hover:bg-amber-600 transition-colors">
                  Abrir existente
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Título de la Oportunidad *</label>
            <input 
              required autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Renovación Licencias 2026" 
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1 relative">
            <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
              Cliente * 
              <button type="button" onClick={() => setIsCreatingClient(!isCreatingClient)} className="text-primary hover:underline flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Nuevo
              </button>
            </label>
            <div className="relative">
              <input 
                required
                value={client} 
                onChange={e => { setClient(e.target.value); setClientId(''); }}
                onFocus={() => { if(client.length >= 3) setShowDropdown(true); }}
                placeholder="Digita nombre o NIT..." 
                className="w-full bg-background border border-input rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              {searching && <div className="absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />}
              
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map(s => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex flex-col border-b border-border last:border-0"
                    >
                      <span className="font-semibold text-foreground">{s.name}</span>
                      {s.tradeName && (
                        <span className="text-xs text-primary font-medium">Comercial: {s.tradeName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        NIT: {s.nit || s.doc || 'S/N'} {s.phone1 || s.phone ? `• Tel: ${s.phone1 || s.phone}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isCreatingClient && (
              <div className="p-3 bg-muted/30 border border-border rounded-md mt-2 text-xs space-y-2">
                 <p className="font-bold text-foreground">Crear Cliente Inline</p>
                 <input placeholder="NIT / Identificación" className="w-full bg-background border border-input rounded-md px-2 py-1" />
                 <input placeholder="Nombre del Contacto" className="w-full bg-background border border-input rounded-md px-2 py-1" />
                 <input placeholder="Email" type="email" className="w-full bg-background border border-input rounded-md px-2 py-1" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Producto (Plantilla)</label>
            <select 
              value={templateId} onChange={e => handleTemplateSelect(e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Seleccionar (Opcional)</option>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templateId && (
              <p className="text-[10px] text-muted-foreground mt-1">
                 Sugerencia histórica: Cierre estimado en {TEMPLATES.find(t=>t.id===templateId)?.expectedCycleDays} días.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Valor Estimado (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
              <input 
                type="number"
                value={amount} onChange={e => setAmount(Number(e.target.value))}
                placeholder="0" 
                className="w-full bg-background border border-input rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          
        </form>
        
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <button onClick={handleSave} type="button" disabled={!title || !client} className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            Crear Oportunidad
          </button>
        </div>
      </motion.div>
    </div>
  );
}
