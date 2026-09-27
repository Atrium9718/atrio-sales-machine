import * as React from 'react';
import { Mic, Pencil, Plus, Square, Trash2, Upload, Volume2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { formatDuration, voiceApi } from './callFormat';
import { blobToBase64, toAsteriskWav } from './asteriskAudio';

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  category: string;
  text: string | null;
  durationSeconds: number;
  hasAudio: boolean;
  version: number;
  updatedAt: string;
}

export const PROMPT_CATEGORY: Record<string, string> = {
  GREETING: 'Bienvenida',
  MENU: 'Menú de opciones',
  QUEUE: 'Cola de espera',
  VOICEMAIL: 'Buzón',
  ANNOUNCEMENT: 'Aviso',
  CLOSED: 'Fuera de horario',
  LEGAL: 'Aviso legal (grabación)',
  ERROR: 'Error',
};

const input = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function PromptForm({ initial, onClose, onSaved }: { initial: Partial<Prompt>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(initial.name ?? '');
  const [category, setCategory] = React.useState(initial.category ?? 'GREETING');
  const [text, setText] = React.useState(initial.text ?? '');
  const [audio, setAudio] = React.useState<{ wav: Blob; seconds: number; source: string } | null>(null);
  const [recording, setRecording] = React.useState<MediaRecorder | null>(null);
  const [busy, setBusy] = React.useState(false);
  const previewUrl = React.useMemo(() => (audio ? URL.createObjectURL(audio.wav) : null), [audio]);
  React.useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  const convert = async (blob: Blob, source: string) => {
    setBusy(true);
    try {
      setAudio({ ...(await toAsteriskWav(blob)), source });
    } catch (err: any) {
      notify(err?.message || 'No se pudo convertir el audio', 'error');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(null);
        convert(new Blob(chunks, { type: rec.mimeType }), 'RECORDED_BROWSER');
      };
      rec.start();
      setRecording(rec);
    } catch {
      notify('No se pudo usar el micrófono. Revisa el permiso del navegador.', 'error');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await voiceApi('/api/voice/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initial.id,
          name,
          category,
          text,
          ...(audio ? { audioBase64: await blobToBase64(audio.wav), source: audio.source } : {}),
        }),
      });
      notify('Locución guardada', 'success');
      onSaved();
    } catch (err: any) {
      notify(err?.message || 'No se pudo guardar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">{initial.id ? 'Editar locución' : 'Nueva locución'}</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Nombre</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bienvenida principal" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Para qué es</span>
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(PROMPT_CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Guion (lo que dice)</span>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Gracias por llamar a Fusión Comunicación Gráfica. Para ventas marque 1; para una persona, marque 0."
            required
          />
        </label>

        <div className="space-y-2">
          <div className="text-sm font-medium">Audio {initial.id && !audio && <span className="font-normal text-muted-foreground">(deja el actual si no cambias nada)</span>}</div>
          <div className="flex flex-wrap gap-2">
            {recording ? (
              <button type="button" onClick={() => recording.stop()} className="h-9 px-3 rounded-md bg-rose-600 text-white text-sm inline-flex items-center gap-1.5">
                <Square className="w-4 h-4" /> Detener grabación
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={startRecording} className="h-9 px-3 rounded-md border border-input text-sm inline-flex items-center gap-1.5">
                <Mic className="w-4 h-4" /> Grabar con el micrófono
              </button>
            )}
            <label className="h-9 px-3 rounded-md border border-input text-sm inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4" /> Subir archivo
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && convert(e.target.files[0], 'UPLOADED')} />
            </label>
          </div>
          {busy && <p className="text-xs text-muted-foreground">Preparando el audio…</p>}
          {audio && previewUrl && (
            <div className="space-y-1">
              <audio controls src={previewUrl} className="w-full" />
              <p className="text-xs text-muted-foreground">{formatDuration(Math.round(audio.seconds))} · convertido a calidad de teléfono (8 kHz), sin silencios al inicio y al final.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm">Cancelar</button>
          <button disabled={busy || !!recording} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Guardar</button>
        </div>
      </form>
    </div>
  );
}

export function VozLocucionesPage() {
  const [prompts, setPrompts] = React.useState<Prompt[] | null>(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Partial<Prompt> | null>(null);
  const [q, setQ] = React.useState('');

  const load = React.useCallback(() => {
    voiceApi<{ data: Prompt[] }>('/api/voice/prompts')
      .then((d) => {
        setPrompts(d.data);
        setError('');
      })
      .catch((err) => setError(err?.message || 'No se pudieron cargar las locuciones'));
  }, []);
  React.useEffect(load, [load]);

  const remove = async (p: Prompt) => {
    if (!window.confirm(`¿Borrar "${p.name}"?`)) return;
    try {
      await voiceApi(`/api/voice/prompts/${p.id}`, { method: 'DELETE' });
      notify('Locución borrada', 'success');
      load();
    } catch (err: any) {
      notify(err?.message || 'No se pudo borrar', 'error');
    }
  };

  const filtered = (prompts ?? []).filter((p) => !q || `${p.name} ${p.text ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-primary" /> Locuciones
          </h1>
          <p className="text-sm text-muted-foreground">Los audios que oyen quienes llaman: bienvenida, menú, espera, buzón. Úsalos en los menús de opciones y en las colas.</p>
        </div>
        <button onClick={() => setEditing({})} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Nueva locución
        </button>
      </div>

      <input className={`${input} max-w-sm`} placeholder="Buscar por nombre o guion" value={q} onChange={(e) => setQ(e.target.value)} />

      {error && <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">{error}</div>}
      {prompts && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {prompts.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay locuciones. Graba la bienvenida con el micrófono o sube un audio.'}
        </div>
      )}

      <ul className="grid md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <li key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {PROMPT_CATEGORY[p.category] ?? p.category} · {formatDuration(Math.round(p.durationSeconds))} · versión {p.version}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(p)} className="h-8 px-2 rounded-md border border-input" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(p)} className="h-8 px-2 rounded-md border border-input text-rose-600" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {p.text && <p className="text-sm text-muted-foreground italic">“{p.text}”</p>}
            {p.hasAudio ? (
              <audio controls preload="none" src={`/api/voice/prompts/${p.id}/audio?v=${p.version}`} className="w-full" />
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">El archivo de audio no está en el servidor: vuelve a subirlo.</p>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <PromptForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
