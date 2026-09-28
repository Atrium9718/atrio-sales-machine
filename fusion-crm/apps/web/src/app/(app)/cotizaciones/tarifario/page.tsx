import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, Layers, Scissors, Sparkles, Settings, History, Plus, Trash2, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useFusionAuth } from '@/context/FusionAuthContext';

type Snapshot = Record<string, any>;
interface VersionMeta {
  id: string;
  code: string;
  name: string;
  validFrom: string;
  isActive: boolean;
  note?: string;
  createdBy?: string;
}

type TabKey = 'general' | 'papeles' | 'digital' | 'litho' | 'acabados' | 'cortes' | 'historial';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'papeles', label: 'Papeles', icon: FileSpreadsheet },
  { key: 'digital', label: 'Impresión digital', icon: Printer },
  { key: 'litho', label: 'Litografía', icon: Layers },
  { key: 'acabados', label: 'Acabados', icon: Sparkles },
  { key: 'general', label: 'Parámetros', icon: Settings },
  { key: 'cortes', label: 'Cortes y tintas', icon: Scissors },
  { key: 'historial', label: 'Versiones', icon: History },
];

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  width?: string;
}

const FINISH_MODES = ['PER_RUN', 'MINIMUM', 'PER_THOUSAND', 'PER_LOOP', 'PER_LINEAR_CM', 'PER_CM2', 'BOTH_FACES', 'ONE_FACE_OF_TWO_PRINTED', 'NONE'];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function EditableTable({ rows, columns, editable, onChange, newRow }: { rows: any[]; columns: Column[]; editable: boolean; onChange: (rows: any[]) => void; newRow: () => any }) {
  const cell = 'w-full px-2 py-1.5 border border-transparent hover:border-input focus:border-primary rounded bg-transparent text-sm outline-none';
  const update = (i: number, key: string, value: any) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <div className="border border-border rounded-xl bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 ${c.type === 'number' ? 'text-right' : 'text-left'}`} style={{ width: c.width }}>
                {c.label}
              </th>
            ))}
            {editable && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50">
              {columns.map((c) => (
                <td key={c.key} className="px-1 py-0.5">
                  {!editable ? (
                    <span className={`block px-2 py-1.5 ${c.type === 'number' ? 'text-right font-mono' : ''}`}>{c.type === 'number' ? Number(r[c.key] ?? 0).toLocaleString('es-CO') : r[c.key]}</span>
                  ) : c.type === 'select' ? (
                    <select value={r[c.key] ?? ''} onChange={(e) => update(i, c.key, e.target.value)} className={cell}>
                      {c.options!.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={c.type === 'number' ? 'number' : 'text'}
                      min={c.type === 'number' ? 0 : undefined}
                      step="any"
                      value={r[c.key] ?? ''}
                      onChange={(e) => update(i, c.key, c.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
                      className={`${cell} ${c.type === 'number' ? 'text-right font-mono' : ''}`}
                    />
                  )}
                </td>
              ))}
              {editable && (
                <td className="px-1">
                  <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-destructive rounded" aria-label="Quitar fila">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button onClick={() => onChange([...rows, newRow()])} className="m-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-md">
          <Plus className="w-3.5 h-3.5" /> Agregar fila
        </button>
      )}
    </div>
  );
}

export default function TarifarioProduccionPage() {
  const { currentUser, isSuperAdmin } = useFusionAuth();
  const canEdit = isSuperAdmin || ['admin', 'super_admin', 'gerencia', 'gerente_general'].includes(currentUser?.roleKey ?? '');
  const [tab, setTab] = useState<TabKey>('papeles');
  const [original, setOriginal] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<Snapshot | null>(null);
  const [version, setVersion] = useState<VersionMeta | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [paperFilter, setPaperFilter] = useState('');

  const load = async () => {
    try {
      const [snap, vers] = await Promise.all([fetch('/api/tariff/snapshot').then((r) => r.json()), fetch('/api/tariff/versions').then((r) => r.json())]);
      setOriginal(snap.snapshot);
      setDraft(clone(snap.snapshot));
      setVersion(snap.version);
      setVersions(vers.versions ?? []);
    } catch {
      notify('No se pudo cargar el tarifario.', 'error');
    }
  };
  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(() => !!draft && JSON.stringify(draft) !== JSON.stringify(original), [draft, original]);
  const set = (key: string, value: any) => setDraft((d) => ({ ...d!, [key]: value }));

  const publish = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tariff/versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot: draft, note }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      notify(`Tarifario actualizado: ${data.version.code}. Las cotizaciones nuevas usan estos precios.`, 'success');
      setNote('');
      await load();
    } catch (err: any) {
      notify(`No se pudo guardar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: string) => {
    if (!confirm('¿Volver a esta versión del tarifario? Las cotizaciones nuevas usarán sus precios.')) return;
    const res = await fetch(`/api/tariff/versions/${encodeURIComponent(id)}/activate`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return notify(data.error || 'No se pudo cambiar la versión.', 'error');
    notify('Versión restablecida.', 'success');
    load();
  };

  if (!draft) return <div className="p-8 text-sm text-muted-foreground">Cargando tarifario…</div>;

  const papers: any[] = draft.papers ?? [];
  const filteredPaperIdx = papers.map((p, i) => ({ p, i })).filter(({ p }) => !paperFilter || String(p.name).toLowerCase().includes(paperFilter.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" /> Tarifario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vigente: <b>{version?.name}</b> ({version?.code}){version?.createdBy ? ` · ${version.createdBy}` : ''}. Es la base de precios del asistente de cotización.
          </p>
        </div>
        {canEdit && dirty && (
          <div className="flex flex-wrap items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Qué cambió? (ej. alza de papel)" className="px-3 py-2 border border-input rounded-md text-sm bg-background w-64" />
            <button onClick={() => setDraft(clone(original))} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-md">
              <RotateCcw className="w-4 h-4" /> Descartar
            </button>
            <button onClick={publish} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Publicar nueva versión'}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">Solo lectura: los cambios los hace gerencia o un administrador.</div>
      )}
      {canEdit && dirty && (
        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Hay cambios sin publicar. Las cotizaciones ya hechas conservan los precios de su versión.
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-bold border-b-2 whitespace-nowrap ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'papeles' && (
        <div className="space-y-3">
          <input value={paperFilter} onChange={(e) => setPaperFilter(e.target.value)} placeholder="Filtrar papeles…" className="px-3 py-2 border border-input rounded-md text-sm bg-background w-full max-w-xs" />
          <EditableTable
            rows={filteredPaperIdx.map(({ p }) => p)}
            editable={canEdit}
            columns={[
              { key: 'name', label: 'Papel' },
              { key: 'sheetFormat', label: 'Pliego', type: 'select', options: ['S70X100', 'S60X90'], width: '140px' },
              { key: 'pricePerSheet', label: 'Precio por pliego', type: 'number', width: '180px' },
            ]}
            newRow={() => ({ name: '', sheetFormat: 'S70X100', pricePerSheet: 0 })}
            onChange={(rows) => {
              // Reincorpora las filas filtradas en su posición original
              const kept = papers.filter((_, i) => !filteredPaperIdx.some((f) => f.i === i));
              set('papers', paperFilter ? [...kept, ...rows] : rows);
            }}
          />
        </div>
      )}

      {tab === 'digital' && (
        <div className="space-y-4">
          <EditableTable
            rows={draft.digitalFormats ?? []}
            editable={canEdit}
            columns={[
              { key: 'formatName', label: 'Formato' },
              { key: 'widthCm', label: 'Ancho cm', type: 'number' },
              { key: 'heightCm', label: 'Alto cm', type: 'number' },
              { key: 'price1x0', label: '1x0', type: 'number' },
              { key: 'price4x0', label: '4x0', type: 'number' },
              { key: 'price4x4', label: '4x4', type: 'number' },
              { key: 'laminationUnitPrice', label: 'Plastificado', type: 'number' },
            ]}
            newRow={() => ({ formatName: '', widthCm: 0, heightCm: 0, price4x0: 0, volumeTiers: [] })}
            onChange={(rows) => set('digitalFormats', rows)}
          />
          <h3 className="font-bold text-sm">Escalas por volumen</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(draft.digitalFormats ?? []).map((f: any, i: number) => (
              <div key={i}>
                <div className="text-xs font-bold text-muted-foreground mb-1">{f.formatName || `Formato ${i + 1}`}</div>
                <EditableTable
                  rows={f.volumeTiers ?? []}
                  editable={canEdit}
                  columns={[
                    { key: 'minSheets', label: 'Desde (pliegos)', type: 'number' },
                    { key: 'maxSheets', label: 'Hasta', type: 'number' },
                    { key: 'unitPrice', label: 'Precio unitario', type: 'number' },
                  ]}
                  newRow={() => ({ minSheets: 0, maxSheets: null, unitPrice: 0 })}
                  onChange={(rows) => set('digitalFormats', draft.digitalFormats.map((x: any, j: number) => (j === i ? { ...x, volumeTiers: rows } : x)))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'litho' && (
        <EditableTable
          rows={draft.lithoFormats ?? []}
          editable={canEdit}
          columns={[
            { key: 'plateFormatName', label: 'Formato de plancha' },
            { key: 'plateUnitPrice', label: 'Precio plancha', type: 'number' },
            { key: 'pressPricePerThousand', label: 'Tiraje por millar', type: 'number' },
            { key: 'printAreaWidthCm', label: 'Área ancho cm', type: 'number' },
            { key: 'printAreaHeightCm', label: 'Área alto cm', type: 'number' },
          ]}
          newRow={() => ({ plateFormatName: '', plateUnitPrice: 0, pressPricePerThousand: 0 })}
          onChange={(rows) => set('lithoFormats', rows)}
        />
      )}

      {tab === 'acabados' && (
        <EditableTable
          rows={draft.finishings ?? []}
          editable={canEdit}
          columns={[
            { key: 'service', label: 'Código', width: '160px' },
            { key: 'label', label: 'Nombre' },
            { key: 'mode', label: 'Cómo se cobra', type: 'select', options: FINISH_MODES, width: '220px' },
            { key: 'price', label: 'Precio', type: 'number' },
            { key: 'minimumCharge', label: 'Mínimo', type: 'number' },
            { key: 'pricePerM2', label: 'Por m²', type: 'number' },
          ]}
          newRow={() => ({ service: '', label: '', mode: 'PER_RUN', price: 0 })}
          onChange={(rows) => set('finishings', rows)}
        />
      )}

      {tab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ['bleedCm', 'Sangrado (cm)'],
            ['gripMarginCm', 'Pinza (cm)'],
            ['defaultWastageSheets', 'Desperdicio por tiraje (pliegos)'],
            ['defaultLithoMarginPercent', 'Margen litografía (0,30 = 30%)'],
            ['laminationMinCharge', 'Plastificado: cobro mínimo'],
            ['laminationPricePerM2', 'Plastificado: precio por m²'],
            ['peerDiscountPerMeter', 'Descuento a colegas por metro'],
          ].map(([key, label]) => (
            <div key={key} className="bg-card border border-border rounded-xl p-4">
              <label className="text-xs font-bold text-muted-foreground">{label}</label>
              <input
                type="number"
                step="any"
                min={0}
                disabled={!canEdit}
                value={draft[key] ?? ''}
                onChange={(e) => set(key, e.target.value === '' ? undefined : Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm bg-background font-mono disabled:opacity-70"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'cortes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-sm mb-2">Cortes del pliego</h3>
            <div className="border border-border rounded-xl bg-card divide-y divide-border text-sm">
              {(draft.sheetCuts ?? []).map((c: any) => (
                <div key={c.code} className="px-4 py-2 flex justify-between gap-3">
                  <span className="font-mono font-bold">{c.code}</span>
                  <span className="text-muted-foreground text-xs">
                    ÷{c.divisor} · {(c.sizes ?? []).map((s: any) => `${s.sheetFormat === 'S70X100' ? '70x100' : '60x90'}: ${s.widthCm}×${s.heightCm}`).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2">Juegos de tintas</h3>
            <EditableTable
              rows={draft.inkSets ?? []}
              editable={canEdit}
              columns={[
                { key: 'code', label: 'Tintas' },
                { key: 'plates', label: 'Planchas', type: 'number' },
              ]}
              newRow={() => ({ code: '', plates: 1 })}
              onChange={(rows) => set('inkSets', rows)}
            />
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="border border-border rounded-xl bg-card divide-y divide-border">
          {versions.map((v) => (
            <div key={v.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold">
                  {v.name} <span className="font-mono text-xs text-muted-foreground">{v.code}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(v.validFrom).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                  {v.createdBy ? ` · ${v.createdBy}` : ''}
                  {v.note ? ` · ${v.note}` : ''}
                </div>
              </div>
              {v.isActive ? (
                <span className="text-xs font-bold px-2 py-1 rounded bg-success/15 text-success">Vigente</span>
              ) : (
                canEdit && (
                  <button onClick={() => activate(v.id)} className="text-xs font-bold px-3 py-1.5 rounded border border-border hover:bg-muted">
                    Volver a esta versión
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
