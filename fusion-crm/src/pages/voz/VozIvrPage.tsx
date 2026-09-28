import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Network, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { formatDateTime, formatPhone, voiceApi } from './callFormat';

interface FlowItem {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  isLive: boolean;
  hasPendingChanges: boolean;
  publishedAt: string | null;
  nodeCount: number;
  numbers: string[];
  updatedAt: string;
}

const input = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

export function VozIvrPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = React.useState<FlowItem[] | null>(null);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const load = React.useCallback(() => {
    voiceApi<{ data: FlowItem[] }>('/api/voice/ivr-flows')
      .then((d) => {
        setFlows(d.data);
        setError('');
      })
      .catch((err) => setError(err?.message || 'No se pudieron cargar los menús'));
  }, []);
  React.useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const d = await voiceApi<{ data: { id: string } }>('/api/voice/ivr-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      navigate(`/voz/ivr/${d.data.id}`);
    } catch (err: any) {
      notify(err?.message || 'No se pudo crear el menú', 'error');
    }
  };

  const remove = async (f: FlowItem) => {
    if (!window.confirm(`¿Borrar el menú "${f.name}"?`)) return;
    try {
      await voiceApi(`/api/voice/ivr-flows/${f.id}`, { method: 'DELETE' });
      notify('Menú borrado', 'success');
      load();
    } catch (err: any) {
      notify(err?.message || 'No se pudo borrar', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" /> Menús de opciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Lo que oye quien llama y a dónde va según lo que marque: bienvenida, horario, «marque 1 para ventas», colas, extensiones y buzón.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 rounded-md border border-input text-sm inline-flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => setCreating(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nuevo menú
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 text-sm">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Antes de publicar, el sistema revisa el menú</p>
          <p className="text-muted-foreground">
            En todo menú el 0 debe llevar a una persona, y antes de conectar con alguien debe sonar el aviso de que la llamada se graba (Ley 1581).
            Si falta algo, no deja publicar y dice qué corregir. Los cambios se guardan como borrador: las llamadas siguen usando la versión publicada hasta que publiques.
          </p>
        </div>
      </div>

      {error && <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">{error}</div>}
      {flows && flows.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Aún no hay menús. Crea uno, arma los pasos, publícalo y luego apunta el número de la empresa a él en la configuración de voz.
        </div>
      )}

      <ul className="grid md:grid-cols-2 gap-4">
        {flows?.map((f) => (
          <li key={f.id} className="bg-card border border-border rounded-xl flex flex-col">
            <div className="p-4 space-y-2 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{f.name}</div>
                  {f.description && <div className="text-sm text-muted-foreground">{f.description}</div>}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                    f.isLive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {f.isLive ? `En uso · versión ${f.version}` : 'Sin publicar'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>{f.numbers.length ? `Número: ${f.numbers.map(formatPhone).join(', ')}` : 'Ningún número entra a este menú todavía'}</div>
                <div>
                  {f.nodeCount} pasos
                  {f.publishedAt ? ` · publicado ${formatDateTime(f.publishedAt)}` : ''}
                </div>
                {f.hasPendingChanges && <div className="text-amber-700 dark:text-amber-400">Tiene cambios sin publicar</div>}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
              <button onClick={() => remove(f)} className="h-8 px-2 rounded-md border border-input text-rose-600" title="Borrar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => navigate(`/voz/ivr/${f.id}`)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5">
                Abrir editor <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nuevo menú de opciones</h2>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Menú principal" required autoFocus />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Para qué es (opcional)</span>
              <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lo que oye quien llama al fijo" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="h-9 px-4 rounded-md border border-input text-sm">Cancelar</button>
              <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Crear y abrir</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
