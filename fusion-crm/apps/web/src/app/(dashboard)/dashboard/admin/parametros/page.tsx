import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, AlertTriangle, Shield, Download, Upload, Info } from 'lucide-react';

export default function ParametrosPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  
  // Categorize by domain
  const domains = ['COMMERCIAL', 'AI', 'ORGANIZATION', 'PRODUCTION', 'INVENTORY', 'SYSTEM'];
  const [activeDomain, setActiveDomain] = useState('COMMERCIAL');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleValueChange = (key: string, value: any) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) return;
    
    // Prepare payload
    const updates = Object.entries(changes).map(([key, value]) => {
      const def = settings.find(s => s.key === key);
      return {
        key,
        value,
        reason: def?.dangerLevel === 'DANGEROUS' ? prompt(`Motivo para cambiar ${def.label}:`) : undefined
      };
    });

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Configuración actualizada con éxito.');
      setChanges({});
      // Refresh
      const newData = await fetch('/api/settings').then(r => r.json());
      setSettings(newData);
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = (key: string) => {
    const updated = { ...changes };
    delete updated[key];
    setChanges(updated);
  };

  if (loading) return <div className="p-8">Cargando catálogo de configuración...</div>;

  const currentDomainSettings = settings.filter(s => s.domain === activeDomain);
  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold">Parámetros del Sistema</h1>
          <p className="text-muted-foreground">Catálogo fuertemente tipado de configuración.</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded bg-secondary/50 text-sm hover:bg-secondary">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded bg-secondary/50 text-sm hover:bg-secondary">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : `Guardar Cambios (${Object.keys(changes).length})`}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation */}
        <aside className="w-64 border-r border-border bg-muted/20 overflow-y-auto">
          <nav className="p-4 flex flex-col gap-1">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Dominios</div>
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setActiveDomain(d)}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${activeDomain === d ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
              >
                {d}
              </button>
            ))}
            
            <div className="mt-8 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Herramientas</div>
            <a href="/dashboard/admin/flags" className="text-left px-3 py-2 rounded text-sm hover:bg-muted block text-foreground">Banderas (Feature Flags)</a>
            <a href="/dashboard/admin/auditoria?tipo=configuracion" className="text-left px-3 py-2 rounded text-sm hover:bg-muted block text-foreground">Auditoría y Reversiones</a>
          </nav>
        </aside>

        {/* Setting Editor */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-8">
            {currentDomainSettings.length === 0 && (
              <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                No hay configuraciones definidas para este dominio.
              </div>
            )}
            
            {currentDomainSettings.map(setting => {
              const currentValue = changes[setting.key] !== undefined ? changes[setting.key] : setting.value;
              const isModified = changes[setting.key] !== undefined;
              
              return (
                <div key={setting.key} className={`border rounded-lg p-5 ${isModified ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{setting.label}</h3>
                        {setting.isSensitive && <Shield className="w-4 h-4 text-orange-500" aria-label="Valor sensible (Oculto en logs)" />}
                        {setting.dangerLevel === 'CAUTION' && <AlertTriangle className="w-4 h-4 text-yellow-500" aria-label="Requiere precaución" />}
                        {setting.dangerLevel === 'DANGEROUS' && <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Peligroso. Requerirá motivo." />}
                        {setting.isOverridden && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold tracking-wider">Anulado en BD</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{setting.key}</span>
                        <span>• Permiso requerido: <code>{setting.requiredPermission}</code></span>
                      </div>
                    </div>
                    {isModified && (
                      <button 
                        onClick={() => handleRevert(setting.key)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Deshacer edición
                      </button>
                    )}
                  </div>
                  
                  {/* Inputs based on type */}
                  <div className="mt-4">
                    {setting.valueType === 'BOOLEAN' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={currentValue}
                          onChange={(e) => handleValueChange(setting.key, e.target.checked)}
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{currentValue ? 'Activado' : 'Desactivado'}</span>
                      </label>
                    )}
                    
                    {setting.valueType === 'NUMBER' && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={currentValue}
                          onChange={(e) => handleValueChange(setting.key, Number(e.target.value))}
                          className="px-3 py-2 border border-border rounded bg-background text-sm w-32"
                        />
                        {setting.unit && <span className="text-sm text-muted-foreground">{setting.unit}</span>}
                      </div>
                    )}
                    
                    {setting.valueType === 'ENUM' && setting.enumOptions && (
                      <select
                        value={currentValue}
                        onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        className="px-3 py-2 border border-border rounded bg-background text-sm min-w-[200px]"
                      >
                        {setting.enumOptions.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    
                    
                    {setting.valueType === 'STRING' && (
                      <input 
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        className="px-3 py-2 border border-border rounded bg-background text-sm w-full max-w-lg"
                      />
                    )}
                    {setting.valueType === 'JSON' && (
                      <textarea
                        value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
                        onChange={(e) => {
                           try {
                             // just string for now, will be parsed on save
                             handleValueChange(setting.key, e.target.value);
                           } catch(err) {}
                        }}
                        className="px-3 py-2 border border-border rounded bg-background text-sm w-full font-mono h-32"
                      />
                    )}
                    {setting.helpText && (
                      <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary pl-2">{setting.helpText}</div>
                    )}

                    {setting.valueType === 'COLOR' && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={currentValue}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input 
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                          className="px-3 py-2 border border-border rounded bg-background text-sm w-32 font-mono uppercase"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
