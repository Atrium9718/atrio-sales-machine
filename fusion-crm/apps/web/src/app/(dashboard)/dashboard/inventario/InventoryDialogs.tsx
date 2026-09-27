import React, { useMemo, useState } from 'react';
import { X, Scissors } from 'lucide-react';
import { notify } from '@/lib/notify';
import { inventoryApi, type InventoryCatalog, type InventoryItem } from '../../../../lib/inventoryStore';
import { SHEET_FORMAT_LABEL, piecesPerSheet, type SheetFormat } from '../../../../../../../packages/core/src/inventory/stock';

export const money = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;
const input = 'w-full px-3 py-2 border border-input rounded-md text-sm bg-background';
const CATEGORIES = ['Tinta', 'Plancha', 'Vinilo y adhesivo', 'Acrílico', 'Empaque', 'Químico', 'Repuesto', 'Insumo', 'Otro'];

function Dialog({ title, onClose, children, onSubmit, busy, submitLabel }: { title: string; onClose: () => void; children: React.ReactNode; onSubmit: () => void; busy: boolean; submitLabel: string }) {
  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-muted/20 shrink-0">
          <h2 className="font-bold text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:bg-muted p-2 rounded-md" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">{children}</div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-bold rounded-md">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md disabled:opacity-50">
            {busy ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block space-y-1">
    <span className="text-xs font-bold text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
  </label>
);

async function run(setBusy: (b: boolean) => void, fn: () => Promise<unknown>, ok: string, done: () => void) {
  setBusy(true);
  try {
    await fn();
    notify(ok, 'success');
    done();
  } catch (err: any) {
    notify(err.message, 'error');
  } finally {
    setBusy(false);
  }
}

/** Crear o editar un material. El papel se elige del tarifario: papel, pliego y corte. */
export function MaterialDialog({ item, catalog, onClose }: { item?: InventoryItem; catalog: InventoryCatalog | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'PAPER' | 'SUPPLY'>(item?.kind ?? 'PAPER');
  const papers = catalog?.papers ?? [];
  const [paper, setPaper] = useState(item?.paper?.name ?? papers[0]?.name ?? '');
  const formats = papers.find((p) => p.name === paper)?.sheetFormats ?? ['S70X100'];
  const [sheetFormat, setSheetFormat] = useState<SheetFormat>(item?.paper?.sheetFormat ?? formats[0] ?? 'S70X100');
  const [cutCode, setCutCode] = useState(item?.paper?.cutCode ?? '.1');
  const [f, setF] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Tinta',
    unit: item?.unit ?? 'unidad',
    minStock: item?.minStock ?? 0,
    location: item?.location ?? '',
    notes: item?.notes ?? '',
    initialQuantity: 0,
    initialCost: 0,
    active: item?.active !== false,
  });
  const cut = catalog?.cuts.find((c) => c.code === cutCode);
  const tariffPrice = papers.find((p) => p.name === paper)?.prices?.[sheetFormat] ?? 0;
  const suggestedCost = cut ? Math.round((tariffPrice / cut.divisor) * 100) / 100 : tariffPrice;

  const save = () =>
    run(
      setBusy,
      () =>
        inventoryApi.saveItem({
          id: item?.id,
          ...(kind === 'PAPER' ? { paper: { name: paper, sheetFormat, cutCode } } : { name: f.name, category: f.category, unit: f.unit }),
          minStock: f.minStock,
          location: f.location,
          notes: f.notes,
          active: f.active,
          initialQuantity: item ? undefined : f.initialQuantity,
          initialCost: item ? undefined : f.initialCost || (kind === 'PAPER' ? suggestedCost : 0),
        }),
      item ? 'Material actualizado' : 'Material creado',
      onClose,
    );

  return (
    <Dialog title={item ? `Editar ${item.name}` : 'Nuevo material'} onClose={onClose} onSubmit={save} busy={busy} submitLabel="Guardar">
      {!item && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['PAPER', 'Papel', 'Pliegos o cortes, del tarifario'],
              ['SUPPLY', 'Otro insumo', 'Tintas, planchas, vinilos…'],
            ] as const
          ).map(([k, label, hint]) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`p-2 rounded-lg border text-left ${kind === k ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
              <div className="text-sm font-bold">{label}</div>
              <div className="text-[11px] text-muted-foreground">{hint}</div>
            </button>
          ))}
        </div>
      )}
      {kind === 'PAPER' ? (
        <>
          <Field label="Papel">
            <select value={paper} disabled={!!item} onChange={(e) => setPaper(e.target.value)} className={input}>
              {papers.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pliego">
              <select value={sheetFormat} disabled={!!item} onChange={(e) => setSheetFormat(e.target.value as SheetFormat)} className={input}>
                {formats.map((fm) => (
                  <option key={fm} value={fm}>
                    {SHEET_FORMAT_LABEL[fm]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Se guarda como">
              <select value={cutCode} disabled={!!item} onChange={(e) => setCutCode(e.target.value)} className={input}>
                {(catalog?.cuts ?? []).map((c) => {
                  const size = c.sizes.find((s) => s.sheetFormat === sheetFormat);
                  return (
                    <option key={c.code} value={c.code}>
                      {c.divisor === 1 ? 'Pliego entero' : `${c.code.replace('.', '')} (${size?.widthCm}×${size?.heightCm} cm)`}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">Normalmente se crea el pliego entero; los cortes se crean solos al cortar en guillotina.</p>
        </>
      ) : (
        <>
          <Field label="Nombre">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} required placeholder="Ej: Tinta proceso cyan, Plancha CTP 1/4, Vinilo blanco brillante" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={input}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidad">
              <input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={input} list="units" required />
              <datalist id="units">
                {['unidad', 'kg', 'g', 'litro', 'metro', 'm²', 'rollo', 'caja', 'plancha'].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock mínimo" hint="Avisa cuando baja de aquí">
          <input type="number" min={0} step="any" value={f.minStock} onChange={(e) => setF({ ...f, minStock: Number(e.target.value) })} className={input} />
        </Field>
        <Field label="Ubicación">
          <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={input} placeholder="Ej: Bodega 1, estante B" />
        </Field>
      </div>
      {!item && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <Field label="Existencia actual" hint="Lo que hay hoy en bodega (saldo inicial)">
            <input type="number" min={0} step="any" value={f.initialQuantity} onChange={(e) => setF({ ...f, initialQuantity: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Costo por unidad" hint={kind === 'PAPER' && suggestedCost ? `Tarifario: ${money(suggestedCost)}` : undefined}>
            <input type="number" min={0} step="any" value={f.initialCost || ''} placeholder={kind === 'PAPER' ? String(suggestedCost) : '0'} onChange={(e) => setF({ ...f, initialCost: Number(e.target.value) })} className={input} />
          </Field>
        </div>
      )}
      <Field label="Notas">
        <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={input} />
      </Field>
      {item && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo (desmárcalo si ya no se usa; el kárdex se conserva)
        </label>
      )}
    </Dialog>
  );
}

/** Entrada por compra. */
export function PurchaseDialog({ items, preselect, onClose }: { items: InventoryItem[]; preselect?: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ itemId: preselect ?? '', quantity: 0, unitCost: items.find((i) => i.id === preselect)?.lastCost ?? 0, supplier: '', document: '', note: '' });
  const item = items.find((i) => i.id === f.itemId);
  return (
    <Dialog
      title="Ingresar compra"
      onClose={onClose}
      busy={busy}
      submitLabel="Ingresar"
      onSubmit={() => (item ? run(setBusy, () => inventoryApi.receive({ ...f, type: 'PURCHASE_IN' }), `Entraron ${f.quantity} ${item.unit} de ${item.name}`, onClose) : notify('Elige el material', 'error'))}
    >
      <Field label="Material">
        <select value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value, unitCost: items.find((i) => i.id === e.target.value)?.lastCost ?? 0 })} className={input} required>
          <option value="">Selecciona…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Cantidad ${item ? `(${item.unit})` : ''}`}>
          <input type="number" min={0.01} step="any" value={f.quantity || ''} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} className={input} required />
        </Field>
        <Field label="Costo por unidad" hint={item ? `Promedio actual ${money(item.unitCost)}` : undefined}>
          <input type="number" min={0} step="any" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: Number(e.target.value) })} className={input} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor">
          <input value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} className={input} />
        </Field>
        <Field label="Factura / remisión">
          <input value={f.document} onChange={(e) => setF({ ...f, document: e.target.value })} className={input} />
        </Field>
      </div>
      {item && f.quantity > 0 && (
        <p className="text-sm bg-primary/5 border border-primary/20 rounded p-2">
          Total {money(f.quantity * f.unitCost)} · quedan {item.available + f.quantity} {item.unit}
        </p>
      )}
    </Dialog>
  );
}

/** Salida sin OT: merma, daño o uso interno. */
export function WriteOffDialog({ items, preselect, onClose }: { items: InventoryItem[]; preselect?: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ itemId: preselect ?? '', quantity: 0, note: '' });
  const item = items.find((i) => i.id === f.itemId);
  return (
    <Dialog
      title="Registrar merma o daño"
      onClose={onClose}
      busy={busy}
      submitLabel="Descontar"
      onSubmit={() => (f.note.trim() ? run(setBusy, () => inventoryApi.issue({ ...f, type: 'DAMAGE_OUT' }), 'Merma registrada', onClose) : notify('Escribe el motivo', 'error'))}
    >
      <Field label="Material">
        <select value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })} className={input} required>
          <option value="">Selecciona…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — {i.available} {i.unit}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`Cantidad ${item ? `(${item.unit}, máximo ${item.available})` : ''}`}>
        <input type="number" min={0.01} max={item?.available} step="any" value={f.quantity || ''} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} className={input} required />
      </Field>
      <Field label="Motivo" hint="Si es para una OT, regístralo desde Producción → Materiales">
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={input} placeholder="Ej: humedad, golpe en bodega, prueba de color" />
      </Field>
    </Dialog>
  );
}

/** Corte en guillotina: pliegos (o cortes) a un corte más pequeño del mismo papel. */
export function CutDialog({ items, catalog, preselect, onClose }: { items: InventoryItem[]; catalog: InventoryCatalog | null; preselect?: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const papers = items.filter((i) => i.paper && i.available > 0);
  const [sourceId, setSourceId] = useState(preselect && papers.some((p) => p.id === preselect) ? preselect : papers[0]?.id ?? '');
  const source = papers.find((p) => p.id === sourceId);
  const targets = useMemo(
    () =>
      (catalog?.cuts ?? [])
        .map((c) => {
          const size = c.sizes.find((s) => s.sheetFormat === source?.paper?.sheetFormat);
          const spec = source?.paper && size ? { ...source.paper, cutCode: c.code, divisor: c.divisor, widthCm: size.widthCm, heightCm: size.heightCm } : null;
          return spec && source?.paper ? { code: c.code, per: piecesPerSheet(source.paper, spec), size } : null;
        })
        .filter((t): t is NonNullable<typeof t> => !!t && t.per > 0),
    [catalog, source],
  );
  const [targetCode, setTargetCode] = useState('');
  const target = targets.find((t) => t.code === targetCode) ?? targets[0];
  const [sheets, setSheets] = useState(0);
  const [waste, setWaste] = useState(0);
  const produced = target ? sheets * target.per - waste : 0;
  const pieceCost = produced > 0 && source ? (sheets * source.unitCost) / produced : 0;

  return (
    <Dialog
      title="Cortar papel"
      onClose={onClose}
      busy={busy}
      submitLabel="Registrar corte"
      onSubmit={() =>
        source && target
          ? run(setBusy, () => inventoryApi.transform({ sourceId: source.id, targetCutCode: target.code, sheets, wastePieces: waste }), `Cortados ${sheets} → ${produced} hojas ${target.code.replace('.', '')}`, onClose)
          : notify('Elige el papel y el corte', 'error')
      }
    >
      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay papel con existencias para cortar.</p>
      ) : (
        <>
          <Field label="Papel a cortar">
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={input}>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.available} {p.unit}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cortar en">
            <select value={target?.code ?? ''} onChange={(e) => setTargetCode(e.target.value)} className={input}>
              {targets.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code.replace('.', '')} de {SHEET_FORMAT_LABEL[source!.paper!.sheetFormat]} ({t.size?.widthCm}×{t.size?.heightCm} cm) · {t.per} por hoja
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Hojas a cortar (${source?.unit})`}>
              <input type="number" min={1} max={source?.available} step={1} value={sheets || ''} onChange={(e) => setSheets(Math.floor(Number(e.target.value)))} className={input} required />
            </Field>
            <Field label="Desperdicio (piezas)" hint="Hojas malas al cortar">
              <input type="number" min={0} step={1} value={waste || ''} onChange={(e) => setWaste(Math.floor(Number(e.target.value)))} className={input} />
            </Field>
          </div>
          {target && sheets > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm flex gap-3 items-start">
              <Scissors className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                {sheets} × {target.per} = <b>{sheets * target.per}</b> piezas{waste ? ` − ${waste} de desperdicio` : ''} → entran <b>{produced}</b> hojas de {target.code.replace('.', '')}.
                <br />
                Costo por hoja cortada: <b>{money(pieceCost)}</b> (el desperdicio queda incluido).
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
