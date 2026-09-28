import * as React from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Maximize, Minus, Paperclip, Plus, RotateCcw, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import {
  CLIENT_ATTACHMENT_EXTENSIONS,
  MAX_CLIENT_ATTACHMENTS,
  MAX_CLIENT_ATTACHMENT_BYTES,
} from '../../../../../../packages/core/src/portal/attachments';

/**
 * Kiosco de pedidos: pantalla completa, sin menú ni sesión, para una tablet o un equipo en el
 * mostrador. El cliente elige productos, deja sus datos y el pedido llega al CRM como
 * pre-cotización. Tras un rato sin uso vuelve al inicio y borra lo digitado.
 */

interface KioskProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  size: string;
  price: number | null;
}

interface KioskView {
  enabled: boolean;
  company: { name: string; logoUrl: string };
  config?: {
    title: string;
    welcomeText: string;
    allowCustomRequest: boolean;
    showPrices: boolean;
    allowFiles: boolean;
    requireEmail: boolean;
    askNit: boolean;
    thankYouText: string;
    idleSeconds: number;
  };
  products?: KioskProduct[];
}

interface CartLine {
  key: string;
  productId: string | null;
  name: string;
  quantity: number;
  notes: string;
  unitPrice: number | null;
}

type Step = 'products' | 'details' | 'done';

const EMPTY_CUSTOMER = { name: '', phone: '', email: '', company: '', nit: '', desiredDate: '' };
const QUICK_QUANTITIES = [1, 10, 50, 100, 500, 1000];
const DONE_RESET_MS = 25_000;

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

export default function KioskPage() {
  const { token = '' } = useParams();
  const [view, setView] = React.useState<KioskView | null>(null);
  const [loadError, setLoadError] = React.useState('');
  const [step, setStep] = React.useState<Step>('products');
  const [category, setCategory] = React.useState('');
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [editing, setEditing] = React.useState<CartLine | null>(null);
  const [customer, setCustomer] = React.useState(EMPTY_CUSTOMER);
  const [files, setFiles] = React.useState<File[]>([]);
  const [consent, setConsent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<{ number: string; total: number | null } | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/kiosk-public/${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el kiosco');
      setView(data);
      setLoadError('');
    } catch (err: any) {
      setLoadError(err.message);
    }
  }, [token]);

  React.useEffect(() => {
    load();
    // Recarga el catálogo cada 10 minutos por si cambian productos o configuración
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  const reset = React.useCallback(() => {
    setStep('products');
    setCart([]);
    setEditing(null);
    setCustomer(EMPTY_CUSTOMER);
    setFiles([]);
    setConsent(false);
    setError('');
    setResult(null);
    setCategory('');
  }, []);

  // Sin uso durante un rato: vuelve al inicio y borra los datos del cliente anterior
  const idleMs = (view?.config?.idleSeconds ?? 90) * 1000;
  const dirty = step !== 'products' || cart.length > 0 || editing !== null;
  React.useEffect(() => {
    if (!dirty || step === 'done') return;
    let timer = window.setTimeout(reset, idleMs);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, idleMs);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [dirty, step, idleMs, reset]);

  React.useEffect(() => {
    if (step !== 'done') return;
    const id = window.setTimeout(reset, DONE_RESET_MS);
    return () => window.clearTimeout(id);
  }, [step, reset]);

  const products = view?.products ?? [];
  const categories = React.useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);
  const activeCategory = category && categories.includes(category) ? category : categories[0] || '';
  const visible = products.filter((p) => p.category === activeCategory);
  const config = view?.config;
  const estimated = cart.reduce((s, l) => s + (l.unitPrice ? l.unitPrice * l.quantity : 0), 0);

  const saveLine = (line: CartLine) => {
    setCart((list) => (list.some((l) => l.key === line.key) ? list.map((l) => (l.key === line.key ? line : l)) : [...list, line]));
    setEditing(null);
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const tooBig = picked.find((f) => f.size > MAX_CLIENT_ATTACHMENT_BYTES);
    if (tooBig) return setError(`"${tooBig.name}" supera ${MAX_CLIENT_ATTACHMENT_BYTES / (1024 * 1024)} MB.`);
    const next = [...files, ...picked];
    if (next.length > MAX_CLIENT_ATTACHMENTS) return setError(`Máximo ${MAX_CLIENT_ATTACHMENTS} archivos.`);
    setError('');
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return setError('Para enviar el pedido debes aceptar el tratamiento de tus datos.');
    setSending(true);
    setError('');
    try {
      const attachments = await Promise.all(files.map(async (f) => ({ name: f.name, dataBase64: await readAsBase64(f) })));
      const res = await fetch(`/api/kiosk-public/${encodeURIComponent(token)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((l) => (l.productId ? { productId: l.productId, quantity: l.quantity, notes: l.notes } : { description: l.name, quantity: l.quantity, notes: l.notes })),
          customer: { name: customer.name, phone: customer.phone, email: customer.email, company: customer.company, nit: customer.nit },
          desiredDate: customer.desiredDate,
          consent: true,
          attachments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el pedido');
      setResult({ number: data.number, total: data.total });
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (loadError && !view) {
    return (
      <Screen>
        <div className="m-auto max-w-md text-center space-y-4 p-8">
          <AlertCircle className="w-14 h-14 text-destructive mx-auto" />
          <p className="text-2xl font-bold text-foreground">{loadError}</p>
          <button onClick={load} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Reintentar</button>
        </div>
      </Screen>
    );
  }
  if (!view) {
    return (
      <Screen>
        <div className="m-auto w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-label="Cargando" />
      </Screen>
    );
  }
  if (!view.enabled || !config) {
    return (
      <Screen>
        <div className="m-auto text-center space-y-3 p-8">
          <Brand company={view.company} large />
          <p className="text-2xl font-semibold text-foreground">En este momento no estamos recibiendo pedidos aquí.</p>
          <p className="text-lg text-muted-foreground">Pide ayuda en el mostrador.</p>
        </div>
      </Screen>
    );
  }

  if (step === 'done' && result) {
    return (
      <Screen>
        <div className="m-auto max-w-2xl text-center space-y-6 p-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-14 h-14 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-black text-foreground">¡Pedido enviado!</h1>
          <p className="text-xl text-muted-foreground">
            Tu número de pedido es <strong className="text-foreground">{result.number}</strong>.
          </p>
          {result.total !== null && result.total > 0 && (
            <p className="text-lg text-muted-foreground">Valor estimado: <strong className="text-foreground">{money(result.total)}</strong> (IVA incluido), sujeto a confirmación.</p>
          )}
          <p className="text-lg text-foreground">{config.thankYouText}</p>
          <button onClick={reset} className="px-10 py-5 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold active:scale-95 transition-transform">
            Hacer otro pedido
          </button>
        </div>
      </Screen>
    );
  }

  const inputClass = 'w-full px-4 py-4 rounded-xl border border-input bg-background text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  return (
    <Screen>
      <header className="h-20 shrink-0 bg-card border-b border-border flex items-center justify-between gap-4 px-4 sm:px-8">
        <Brand company={view.company} />
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={reset} className="flex items-center gap-2 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted font-medium">
              <RotateCcw className="w-5 h-5" /> <span className="hidden sm:inline">Empezar de nuevo</span>
            </button>
          )}
          <button onClick={goFullscreen} className="p-3 rounded-xl text-muted-foreground hover:bg-muted" aria-label="Pantalla completa">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </header>

      {step === 'products' ? (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground">{config.title}</h1>
              <p className="text-lg text-muted-foreground mt-2 max-w-3xl">{config.welcomeText}</p>
            </div>

            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`shrink-0 px-5 py-3 rounded-full text-base font-semibold border transition-colors ${c === activeCategory ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEditing({ key: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, quantity: 100, notes: '', unitPrice: p.price })}
                  className="text-left bg-card border-2 border-border rounded-2xl p-5 hover:border-primary active:scale-[0.98] transition-all shadow-sm flex flex-col gap-2 min-h-[140px]"
                >
                  <span className="text-xl font-bold text-foreground">{p.name}</span>
                  {p.size && <span className="text-sm text-muted-foreground">{p.size}</span>}
                  {p.description && <span className="text-sm text-muted-foreground line-clamp-3">{p.description}</span>}
                  <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                    {p.price !== null ? (
                      <span className="text-base font-semibold text-foreground">{money(p.price)} <span className="text-xs font-normal text-muted-foreground">c/u + IVA</span></span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Precio según cantidad</span>
                    )}
                    <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-5 h-5" /></span>
                  </span>
                </button>
              ))}
              {config.allowCustomRequest && (
                <button
                  onClick={() => setEditing({ key: `custom-${Date.now()}`, productId: null, name: '', quantity: 1, notes: '', unitPrice: null })}
                  className="text-left bg-muted/40 border-2 border-dashed border-border rounded-2xl p-5 hover:border-primary active:scale-[0.98] transition-all flex flex-col gap-2 min-h-[140px]"
                >
                  <Sparkles className="w-7 h-7 text-primary" />
                  <span className="text-xl font-bold text-foreground">Otro producto</span>
                  <span className="text-sm text-muted-foreground">Cuéntanos qué necesitas y te lo cotizamos.</span>
                </button>
              )}
            </div>
            {products.length === 0 && !config.allowCustomRequest && (
              <p className="text-lg text-muted-foreground">Aún no hay productos disponibles. Pide ayuda en el mostrador.</p>
            )}
          </main>

          <aside className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col max-h-[45vh] lg:max-h-none">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Tu pedido</h2>
              <span className="ml-auto text-sm text-muted-foreground">{cart.length} {cart.length === 1 ? 'producto' : 'productos'}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Toca un producto para agregarlo.</p>
              ) : (
                cart.map((l) => (
                  <div key={l.key} className="rounded-xl border border-border p-3 flex gap-3 items-start">
                    <button onClick={() => setEditing(l)} className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-foreground truncate">{l.name}</p>
                      <p className="text-sm text-muted-foreground">{l.quantity.toLocaleString('es-CO')} {l.notes ? `· ${l.notes}` : ''}</p>
                      {l.unitPrice ? <p className="text-sm text-foreground">{money(l.unitPrice * l.quantity)} + IVA</p> : null}
                    </button>
                    <button onClick={() => setCart((list) => list.filter((x) => x.key !== l.key))} className="p-2 rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Quitar ${l.name}`}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border space-y-3">
              {config.showPrices && estimated > 0 && (
                <p className="flex justify-between text-base"><span className="text-muted-foreground">Estimado (antes de IVA)</span><strong className="text-foreground">{money(estimated)}</strong></p>
              )}
              <button
                disabled={cart.length === 0}
                onClick={() => setStep('details')}
                className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                Continuar
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8">
          <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
            <button type="button" onClick={() => setStep('products')} className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
              <ArrowLeft className="w-5 h-5" /> Volver a los productos
            </button>
            <h1 className="text-3xl font-black text-foreground">Tus datos</h1>
            <p className="text-lg text-muted-foreground -mt-4">Los usamos para confirmarte el valor y avisarte cuando tu pedido esté listo.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre completo *">
                <input required minLength={3} maxLength={120} autoComplete="off" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Celular *">
                <input required type="tel" inputMode="tel" maxLength={30} autoComplete="off" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className={inputClass} />
              </Field>
              <Field label={config.requireEmail ? 'Correo *' : 'Correo (opcional)'}>
                <input type="email" required={config.requireEmail} maxLength={120} autoComplete="off" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Empresa (opcional)">
                <input maxLength={160} autoComplete="off" value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} className={inputClass} />
              </Field>
              {config.askNit && (
                <Field label="NIT o cédula (opcional)">
                  <input maxLength={30} inputMode="numeric" autoComplete="off" value={customer.nit} onChange={(e) => setCustomer({ ...customer, nit: e.target.value })} className={inputClass} />
                </Field>
              )}
              <Field label="¿Para cuándo lo necesitas? (opcional)">
                <input type="date" value={customer.desiredDate} onChange={(e) => setCustomer({ ...customer, desiredDate: e.target.value })} className={inputClass} />
              </Field>
            </div>

            {config.allowFiles && (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-foreground">Archivos (opcional)</p>
                <p className="text-sm text-muted-foreground">Tu diseño o una referencia: PDF, AI, EPS, PNG, JPG o TIFF. Máximo {MAX_CLIENT_ATTACHMENTS} de {MAX_CLIENT_ATTACHMENT_BYTES / (1024 * 1024)} MB.</p>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="p-2 rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Quitar ${f.name}`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {files.length < MAX_CLIENT_ATTACHMENTS && (
                  <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-foreground font-medium cursor-pointer hover:bg-muted">
                    <Paperclip className="w-5 h-5" /> Adjuntar archivo
                    <input type="file" multiple accept={CLIENT_ATTACHMENT_EXTENSIONS.join(',')} onChange={pickFiles} className="hidden" />
                  </label>
                )}
              </div>
            )}

            <label className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-6 h-6 accent-primary" />
              <span className="text-base text-foreground">
                Autorizo a {view.company.name || 'la empresa'} a usar mis datos para atender este pedido y contactarme sobre él, conforme a la Ley 1581 de 2012 (habeas data).
              </span>
            </label>

            {error && (
              <p className="flex items-center gap-2 text-destructive text-base font-medium" role="alert"><AlertCircle className="w-5 h-5" /> {error}</p>
            )}

            <button type="submit" disabled={sending} className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform">
              {sending ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </form>
        </main>
      )}

      {editing && (
        <LineEditor line={editing} allowCustom={editing.productId === null} onCancel={() => setEditing(null)} onSave={saveLine} />
      )}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 bg-background text-foreground flex flex-col select-none overflow-hidden">{children}</div>;
}

function Brand({ company, large }: { company: { name: string; logoUrl: string }; large?: boolean }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${large ? 'justify-center mb-4' : ''}`}>
      {company.logoUrl ? (
        <img src={company.logoUrl} alt={company.name} className={large ? 'h-16 object-contain' : 'h-10 max-w-[180px] object-contain'} />
      ) : (
        <span className={`font-black text-foreground truncate ${large ? 'text-3xl' : 'text-xl'}`}>{company.name}</span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-base font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function LineEditor({ line, allowCustom, onCancel, onSave }: { line: CartLine; allowCustom: boolean; onCancel: () => void; onSave: (l: CartLine) => void }) {
  const [draft, setDraft] = React.useState(line);
  const valid = draft.quantity >= 1 && (!allowCustom || draft.name.trim().length >= 3);
  const setQty = (q: number) => setDraft({ ...draft, quantity: Math.max(1, Math.min(10_000_000, Math.round(q) || 1)) });
  const field = 'w-full px-4 py-4 rounded-xl border border-input bg-background text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-card w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">{allowCustom ? '¿Qué necesitas?' : draft.name}</h2>
          <button onClick={onCancel} className="p-2 rounded-xl text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X className="w-6 h-6" /></button>
        </div>
        {allowCustom && (
          <input autoFocus maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej: stickers redondos de 5 cm" className={field} />
        )}
        <div className="space-y-3">
          <p className="text-base font-medium text-foreground">Cantidad</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQty(draft.quantity - 1)} className="w-14 h-14 rounded-xl border border-border flex items-center justify-center hover:bg-muted" aria-label="Menos"><Minus className="w-6 h-6" /></button>
            <input type="number" inputMode="numeric" min={1} value={draft.quantity} onChange={(e) => setQty(Number(e.target.value))} className={`${field} text-center text-2xl font-bold`} />
            <button type="button" onClick={() => setQty(draft.quantity + 1)} className="w-14 h-14 rounded-xl border border-border flex items-center justify-center hover:bg-muted" aria-label="Más"><Plus className="w-6 h-6" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUANTITIES.map((q) => (
              <button key={q} type="button" onClick={() => setQty(q)} className={`px-4 py-2.5 rounded-full border text-base font-semibold ${draft.quantity === q ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                {q.toLocaleString('es-CO')}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-base font-medium text-foreground">Detalles (opcional)</span>
          <textarea rows={3} maxLength={400} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Tamaño, colores, acabados, texto…" className={field} />
        </label>
        {draft.unitPrice ? (
          <p className="text-lg text-foreground">Estimado: <strong>{money(draft.unitPrice * draft.quantity)}</strong> <span className="text-sm text-muted-foreground">+ IVA</span></p>
        ) : null}
        <button disabled={!valid} onClick={() => onSave({ ...draft, name: draft.name.trim() })} className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold disabled:opacity-40">
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}
