import React, { useEffect, useState } from 'react';
import { Blocks, CheckCircle2, XCircle, MinusCircle, PlayCircle, Loader2, Info } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
  settings: { key: string; present: boolean; hint?: string }[];
  testable: boolean;
}

interface TestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
}

export default function IntegracionesPage() {
  const [items, setItems] = useState<Integration[] | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ops/integrations')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setItems(d.integrations))
      .catch(() => setError('No se pudo consultar la configuración.'));
  }, []);

  const test = async (id: string) => {
    setTesting(id);
    try {
      const r = await fetch(`/api/ops/integrations/${id}/test`, { method: 'POST' }).then((x) => x.json());
      setResults((prev) => ({ ...prev, [id]: r }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [id]: { ok: false, latencyMs: 0, message: err?.message || 'Error' } }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Blocks className="text-primary" /> Integraciones y credenciales
        </h1>
        <p className="text-muted-foreground mt-1">Qué está conectado en el servidor. Las credenciales nunca se muestran completas.</p>
      </div>

      {error && <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(items ?? []).map((i) => {
          const r = results[i.id];
          return (
            <div key={i.id} className={`bg-card border rounded-lg p-4 space-y-3 ${r && !r.ok ? 'border-destructive/40' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {i.configured ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <MinusCircle className="w-4 h-4 text-muted-foreground" />}
                    {i.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{i.purpose}</p>
                </div>
                {i.testable && i.configured && (
                  <button onClick={() => test(i.id)} disabled={testing === i.id} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50">
                    {testing === i.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />} Probar
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {i.settings.map((s) => (
                  <div key={s.key} className="flex justify-between gap-3 text-xs">
                    <code className="text-muted-foreground">{s.key}</code>
                    <span className={s.present ? 'font-mono' : 'text-muted-foreground italic'}>{s.present ? s.hint ?? 'definida' : 'sin definir'}</span>
                  </div>
                ))}
              </div>
              {r && (
                <div className={`text-xs rounded-md p-2 flex items-start gap-2 ${r.ok ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
                  {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>
                    {r.message}
                    {r.ok ? ` (${r.latencyMs} ms)` : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0" />
        Las credenciales se cambian en el archivo .env del servidor y se aplican al reiniciar la aplicación (docker compose up -d). Los pasos para Meta y WhatsApp están en DEPLOY.md → Canales.
      </p>
    </div>
  );
}
