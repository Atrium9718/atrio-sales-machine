import React, { useState, useEffect } from 'react';
import { X, Search, User, FileText, Phone, Mail, Building } from 'lucide-react';
import { addCustomer, searchCustomers } from '@/lib/customerService';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function ClientFormModal({ onClose, onSaved }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    doc: '',
    sector: '',
    email: '',
    phone: '',
    type: 'ACTIVE',
    temp: 'WARM'
  });

  // Debounced search
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(searchTerm);
        setSuggestions(results);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectSuggestion = (client: any) => {
    setFormData({
      name: client.name || '',
      doc: client.nit || client.doc || '',
      sector: client.sector || '',
      email: client.email || '',
      phone: client.phone || client.phone1 || '',
      type: client.type || 'ACTIVE',
      temp: client.temp || 'WARM'
    });
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await addCustomer({
        name: formData.name,
        nit: formData.doc,
        doc: formData.doc,
        sector: formData.sector,
        email: formData.email,
        phone: formData.phone,
        phone1: formData.phone,
        type: formData.type,
        temp: formData.temp,
      });
      onSaved();
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar el cliente: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border shadow-lg rounded-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Nuevo Cliente
          </h2>
          <button onClick={onClose} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Autocomplete Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-1">
              Buscar en Base de Datos Importada
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Digita el nombre o NIT para autocompletar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary pl-9"
              />
              {searching && (
                <div className="absolute right-3 top-2.5 h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              )}
            </div>
            
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex flex-col border-b border-border last:border-0"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-muted-foreground">NIT/Doc: {s.doc} - {s.sector}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><User className="w-3 h-3"/> Nombre / Razón Social</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><FileText className="w-3 h-3"/> NIT / Documento</label>
                <input
                  type="text"
                  value={formData.doc}
                  onChange={(e) => setFormData({...formData, doc: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Building className="w-3 h-3"/> Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Mail className="w-3 h-3"/> Correo</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!formData.name || loading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
            Guardar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}
