import * as React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Ban, Check, Copy, ExternalLink, Monitor, Paperclip, Plus, RefreshCw, Save, ShoppingBag, Store } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useFusionAuth } from '@/context/FusionAuthContext';
import { catalogCollection, type CatalogProduct } from '@/lib/catalogStore';

/**
 * Configuración del kiosco de pedidos: qué productos se ofrecen, qué se le pide al cliente,
 * los equipos (tablets) donde está abierto y los pedidos que han llegado.
 */

interface KioskConfig {
  enabled: boolean;
  title: string;
  welcomeText: string;
  productIds: string[];
  allowCustomRequest: boolean;
  showPrices: boolean;
  allowFiles: boolean;
  requireEmail: boolean;
  askNit: boolean;
  thankYouText: string;
  idleSeconds: number;
  updatedAt: string | null;
  updatedByName: string | null;
}

interface KioskDevice {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  createdByName: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
  orderCount: number;
}

interface KioskOrder {
  id: string;
  number: string;
  status: string;
  clientName: string;
  clientPhone: string;
  deviceName: string;
  summary: string;
  total: number;
  attachments: { name: string; size: number }[];
  createdAt: string;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60';

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';

const kioskUrl = (token: string) => `${window.location.origin}/kiosko/${token}`;

export default function KioskSettingsPage() {
  const { currentUser, isSuperAdmin } = useFusionAuth();
  const canEdit = isSuperAdmin || currentUser?.roleKey === 'admin' || currentUser?.roleKey === 'super_admin';
  const [config, setConfig] = React.useState<KioskConfig | null>(null);
  const [devices, setDevices] = React.useState<KioskDevice[]>([]);
  const [orders, setOrders] = React.useState<KioskOrder[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState('');
  const [copiedId, setCopiedId] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const [c, d, o] = await Promise.all(['/api/kiosk/config', '/api/kiosk/devices', '/api/kiosk/orders'].map((u) => fetch(u).then((r) => r.json())));
      if (!c.success) throw new Error(c.error || 'No se pudo cargar la configuración');
      setConfig(c.config);
      setDevices(d.devices || []);
      setOrders(o.orders || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  React.useEffect(() => {
    load();
    catalogCollection.hydrate().then((list) => setProducts(list.filter((p) => p.active !== false))).catch(() => {});
  }, [load]);

  React.useEffect(() => {
    const onOrder = () => load();
    window.addEventListener('fusion_kiosk_order_created', onOrder);
    return () => window.removeEventListener('fusion_kiosk_order_created', onOrder);
  }, [load]);

  const set = <K extends keyof KioskConfig>(key: K, value: KioskConfig[K]) => setConfig((c) => (c ? { ...c, [key]: value } : c));

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/kiosk/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setConfig(data.config);
      notify('Configuración del kiosco guardada', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const createDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kiosk/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: deviceName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el equipo');
      setDeviceName('');
      setDevices((list) => [data.device, ...list]);
      notify('Equipo creado: abre su enlace en la tablet del kiosco', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const revoke = async (device: KioskDevice) => {
    if (!window.confirm(`¿Desactivar "${device.name}"? Su enlace dejará de funcionar.`)) return;
    const res = await fetch(`/api/kiosk/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
    if (res.ok) load();
    else notify('No se pudo desactivar el equipo', 'error');
  };

  const copy = async (device: KioskDevice) => {
    await navigator.clipboard.writeText(kioskUrl(device.token));
    setCopiedId(device.id);
    window.setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleProduct = (id: string) => {
    if (!config) return;
    const base = config.productIds.length ? config.productIds : products.map((p) => p.id);
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    // Todos marcados = lista vacía (así los productos nuevos del catálogo aparecen solos)
    set('productIds', next.length === products.length ? [] : next);
  };

  const activeDevices = devices.filter((d) => !d.revokedAt);
  const allProducts = !config?.productIds.length;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Kiosco de pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Una pantalla sin menú para una tablet en el punto de venta: el cliente elige productos, deja sus datos y el pedido llega como pre-cotización.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</p>
      )}
      {!canEdit && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">Solo un administrador puede cambiar la configuración o los equipos.</p>
      )}

      {/* Equipos */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Equipos del kiosco</h2>
        <p className="text-xs text-muted-foreground">
          Crea un equipo por cada tablet o computador del kiosco y abre su enlace en ese dispositivo (idealmente en pantalla completa). El enlace no pide contraseña: si una tablet se pierde, desactívala aquí.
        </p>
        {canEdit && (
          <form onSubmit={createDevice} className="flex flex-col sm:flex-row gap-2">
            <input required minLength={2} maxLength={80} value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder='Nombre del equipo, ej. "Mostrador principal"' className={inputClass} />
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
              <Plus className="w-4 h-4" /> Crear equipo
            </button>
          </form>
        )}
        {activeDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay equipos. Crea uno para obtener el enlace del kiosco.</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-xl">
            {activeDevices.map((d) => (
              <li key={d.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Último uso: {formatDateTime(d.lastSeenAt)} · {d.orderCount || 0} pedidos
                  </p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{kioskUrl(d.token)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => copy(d)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
                    {copiedId === d.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />} {copiedId === d.id ? 'Copiado' : 'Copiar'}
                  </button>
                  <a href={kioskUrl(d.token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
                    <ExternalLink className="w-4 h-4" /> Abrir
                  </a>
                  {canEdit && (
                    <button onClick={() => revoke(d)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-danger hover:bg-danger/10">
                      <Ban className="w-4 h-4" /> Desactivar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Configuración */}
      {config && (
        <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">Qué ve el cliente</h2>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" disabled={!canEdit} checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4 accent-primary" />
              Recibir pedidos {config.enabled ? '(activo)' : '(en pausa)'}
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Título</span>
              <input disabled={!canEdit} maxLength={80} value={config.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Volver al inicio tras (segundos sin uso)</span>
              <input disabled={!canEdit} type="number" min={30} max={600} value={config.idleSeconds} onChange={(e) => set('idleSeconds', Number(e.target.value))} className={inputClass} />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Mensaje de bienvenida</span>
              <textarea disabled={!canEdit} rows={2} maxLength={400} value={config.welcomeText} onChange={(e) => set('welcomeText', e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Mensaje al terminar el pedido</span>
              <textarea disabled={!canEdit} rows={2} maxLength={400} value={config.thankYouText} onChange={(e) => set('thankYouText', e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {([
              ['showPrices', 'Mostrar precios del catálogo y valor estimado'],
              ['allowCustomRequest', 'Permitir pedir "Otro producto" que no esté en el catálogo'],
              ['allowFiles', 'Permitir adjuntar diseños o referencias'],
              ['askNit', 'Pedir NIT o cédula (opcional para el cliente)'],
              ['requireEmail', 'Correo obligatorio'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-foreground rounded-lg border border-border px-3 py-2">
                <input type="checkbox" disabled={!canEdit} checked={config[key]} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4 accent-primary" />
                {label}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Productos que se ofrecen</h3>
              <span className="text-xs text-muted-foreground">
                {allProducts ? 'Todos los productos activos del catálogo' : `${config.productIds.length} de ${products.length} productos`}
                {' · '}
                <Link to="/dashboard/catalogo" className="text-primary hover:underline">Editar catálogo</Link>
              </span>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">El catálogo está vacío. Agrega productos en Comercial → Catálogo de productos (con categoría y precio si quieres mostrarlo).</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-foreground rounded-lg border border-border px-3 py-2">
                    <input type="checkbox" disabled={!canEdit} checked={allProducts || config.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 accent-primary" />
                    <span className="flex-1 min-w-0 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{p.category || 'Otros'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {config.updatedAt ? `Guardado ${formatDateTime(config.updatedAt)}${config.updatedByName ? ` por ${config.updatedByName}` : ''}` : 'Con los valores de fábrica'}
            </p>
            {canEdit && (
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Pedidos */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> Pedidos recibidos</h2>
          <Link to="/dashboard/comercial/precotizaciones" className="text-xs text-primary hover:underline">Ver en pre-cotizaciones</Link>
        </div>
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Todavía no hay pedidos del kiosco.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="p-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{o.number} · {o.clientName}</p>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{o.status === 'Borrador' ? 'Por revisar' : o.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)} · {o.deviceName} · {o.clientPhone}</p>
                <p className="text-sm text-foreground break-words">{o.summary}</p>
                {o.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {o.attachments.map((a, i) => (
                      <a key={i} href={`/api/kiosk/orders/${encodeURIComponent(o.id)}/attachments/${i}`} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted">
                        <Paperclip className="w-3 h-3" /> {a.name}
                      </a>
                    ))}
                  </div>
                )}
                <Link to={`/dashboard/cotizador?quoteId=${encodeURIComponent(o.id)}`} className="inline-block text-xs font-semibold text-primary hover:underline">
                  Abrir y cotizar →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
