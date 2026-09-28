import React, { useEffect, useState } from 'react';
import { Hash, Save, Info } from 'lucide-react';
import { notify } from '@/lib/notify';
import { formatQuoteNumber, orderNumberFor, type NumberingConfig } from '../../../../../../../../packages/core/src/numbering/numbering';

interface Status {
  config: NumberingConfig;
  last: number;
  existingMax: number;
  next: string;
  meta?: { updatedAt?: string; updatedBy?: string };
}

export default function NumeracionPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<NumberingConfig | null>(null);
  const [lastIssued, setLastIssued] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = (s: Status) => {
    setStatus(s);
    setConfig(s.config);
    setLastIssued(String(s.last));
  };

  useEffect(() => {
    fetch('/api/admin/numbering')
      .then((r) => r.json())
      .then((d) => (d.success ? apply(d) : notify(d.error || 'No se pudo cargar la numeración', 'error')))
      .catch(() => notify('No se pudo cargar la numeración', 'error'));
  }, []);

  if (!status || !config) return <div className="p-8 text-muted-foreground">Cargando numeración…</div>;

  const q = config.quote;
  const year = new Date().getFullYear();
  const lastNumber = Number(lastIssued) || 0;
  const preview = formatQuoteNumber(q, Math.max(lastNumber, status.existingMax) + 1, year);
  const setQuote = (patch: Partial<NumberingConfig['quote']>) => setConfig({ ...config, quote: { ...q, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/numbering', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, lastIssued: lastNumber !== status.last ? lastNumber : undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      apply(data);
      notify('Numeración guardada', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const input = 'mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm';

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="text-primary" /> Numeración
          </h1>
          <p className="text-muted-foreground mt-1">Consecutivos de cotizaciones y órdenes de trabajo. Los números los asigna el servidor, nunca se repiten.</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="border border-border bg-card rounded-lg p-5 space-y-4">
          <h3 className="font-bold text-lg">Cotizaciones</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Prefijo
              <input value={q.prefix} onChange={(e) => setQuote({ prefix: e.target.value.toUpperCase() })} className={`${input} font-mono uppercase`} maxLength={10} />
            </label>
            <label className="text-sm font-medium">
              Año en el número
              <select value={q.yearFormat} onChange={(e) => setQuote({ yearFormat: e.target.value as any, resetYearly: e.target.value === 'NONE' ? false : q.resetYearly })} className={input}>
                <option value="NONE">Sin año</option>
                <option value="YY">Dos dígitos ({String(year).slice(-2)})</option>
                <option value="YYYY">Cuatro dígitos ({year})</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Cifras del consecutivo
              <input type="number" min={1} max={10} value={q.padding} onChange={(e) => setQuote({ padding: Number(e.target.value) || 1 })} className={input} />
            </label>
            <label className={`text-sm font-medium flex items-center gap-2 mt-6 ${q.yearFormat === 'NONE' ? 'opacity-50' : ''}`}>
              <input type="checkbox" checked={q.resetYearly} disabled={q.yearFormat === 'NONE'} onChange={(e) => setQuote({ resetYearly: e.target.checked })} />
              Volver a 1 cada año
            </label>
          </div>
          <label className="text-sm font-medium block pt-3 border-t border-border">
            Último número emitido
            <input type="number" min={status.existingMax} value={lastIssued} onChange={(e) => setLastIssued(e.target.value)} className={`${input} font-mono`} />
            <span className="text-xs text-muted-foreground font-normal">
              {status.existingMax > 0
                ? `La cotización más alta existente es la ${formatQuoteNumber(q, status.existingMax, year)}; no se puede bajar de ahí.`
                : 'Si vienes de otro sistema, pon aquí el último número que usaste para continuar la serie.'}
            </span>
          </label>
          <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Próxima cotización</div>
            <div className="font-mono text-lg font-bold text-primary">{preview}</div>
          </div>
        </div>

        <div className="border border-border bg-card rounded-lg p-5 space-y-4">
          <h3 className="font-bold text-lg">Órdenes de trabajo (OT)</h3>
          <p className="text-sm text-muted-foreground">La OT lleva el mismo número de la cotización aprobada, con su propio prefijo: así se sabe de qué cotización viene.</p>
          <label className="text-sm font-medium block">
            Prefijo
            <input value={config.order.prefix} onChange={(e) => setConfig({ ...config, order: { prefix: e.target.value.toUpperCase() } })} className={`${input} font-mono uppercase`} maxLength={10} />
          </label>
          <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">La cotización {preview} generará la</div>
            <div className="font-mono text-lg font-bold text-primary">{orderNumberFor(preview, config)}</div>
          </div>
          <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded text-xs flex gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <p>Los cambios aplican a los documentos nuevos. Las cotizaciones y OT ya creadas conservan su número.</p>
          </div>
        </div>
      </div>
      {status.meta?.updatedAt && (
        <p className="text-xs text-muted-foreground">
          Último cambio: {new Date(status.meta.updatedAt).toLocaleString('es-CO')} por {status.meta.updatedBy}
        </p>
      )}
    </div>
  );
}
