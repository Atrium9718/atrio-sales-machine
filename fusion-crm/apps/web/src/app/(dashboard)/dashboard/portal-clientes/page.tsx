import * as React from 'react';
import { Link2, Copy, Check, Ban, Inbox, MessageCircle, RefreshCw, AlertCircle, Paperclip } from 'lucide-react';
import { CLIENT_REQUESTS_UPDATED_EVENT, notifyClientRequestsChanged } from '../../../../../../../src/components/portal/ClientRequestAlerts';

/**
 * Gestión del portal del cliente: generar/revocar enlaces privados y atender las
 * solicitudes que los clientes envían desde su portal.
 */

type RequestStatus = 'NEW' | 'IN_REVIEW' | 'QUOTED' | 'CLOSED';

interface PortalLink {
  id: string;
  clientName: string;
  clientNit: string;
  createdAt: string;
  createdByName: string;
  revokedAt: string | null;
  lastAccessAt: string | null;
}

interface ClientRequest {
  id: string;
  clientName: string;
  clientNit: string;
  description: string;
  quantity: number | null;
  desiredDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  attachments?: { name: string; size: number; contentType: string }[];
  status: RequestStatus;
  response: string | null;
  createdAt: string;
}

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: 'NEW', label: 'Nueva' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'QUOTED', label: 'Cotizada' },
  { value: 'CLOSED', label: 'Cerrada' },
];

const formatDateTime = (v: string | null) =>
  v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body as T;
}

function RequestRow({ request, onSaved }: { request: ClientRequest; onSaved: () => void }) {
  const [status, setStatus] = React.useState<RequestStatus>(request.status);
  const [response, setResponse] = React.useState(request.response || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const dirty = status !== request.status || response !== (request.response || '');

  const save = async () => {
    setIsSaving(true);
    try {
      await api(`/api/client-portal/requests/${encodeURIComponent(request.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response }),
      });
      notifyClientRequestsChanged();
      onSaved();
    } catch (err: any) {
      alert(`No se pudo guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{request.clientName}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(request.createdAt)}
            {request.contactName ? ` · ${request.contactName}` : ''}
            {request.contactPhone ? ` · ${request.contactPhone}` : ''}
          </p>
        </div>
        {request.status === 'NEW' && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Nueva</span>
        )}
      </div>
      <p className="text-sm text-foreground whitespace-pre-line break-words">{request.description}</p>
      <p className="text-xs text-muted-foreground">
        {request.quantity ? `Cantidad: ${request.quantity.toLocaleString('es-CO')}` : 'Sin cantidad'}
        {request.desiredDate ? ` · Para: ${request.desiredDate}` : ''}
      </p>
      {request.attachments && request.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {request.attachments.map((a, i) => (
            <li key={i}>
              <a
                href={`/api/client-portal/requests/${encodeURIComponent(request.id)}/attachments/${i}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted"
              >
                <Paperclip className="w-3 h-3" /> {a.name}
                <span className="text-muted-foreground">({(a.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2 items-start">
        <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} className={inputClass}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          maxLength={2000}
          placeholder="Respuesta visible para el cliente (opcional)"
          className={inputClass}
        />
        <button
          onClick={save}
          disabled={!dirty || isSaving}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </li>
  );
}

export default function PortalClientesPage() {
  const [clients, setClients] = React.useState<{ name: string; nit: string }[]>([]);
  const [links, setLinks] = React.useState<PortalLink[]>([]);
  const [requests, setRequests] = React.useState<ClientRequest[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [clientName, setClientName] = React.useState('');
  const [clientNit, setClientNit] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newLink, setNewLink] = React.useState<{ url: string; clientName: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [c, l, r] = await Promise.all([
        api<{ clients: { name: string; nit: string }[] }>('/api/client-portal/clients'),
        api<{ links: PortalLink[] }>('/api/client-portal/links'),
        api<{ requests: ClientRequest[] }>('/api/client-portal/requests'),
      ]);
      setClients(c.clients);
      setLinks(l.links);
      setRequests(r.requests);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  React.useEffect(() => {
    load();
    // Se recarga cuando llega una solicitud nueva (tiempo real) o cambia alguna
    window.addEventListener(CLIENT_REQUESTS_UPDATED_EVENT, load);
    return () => window.removeEventListener(CLIENT_REQUESTS_UPDATED_EVENT, load);
  }, [load]);

  const onClientNameChange = (value: string) => {
    setClientName(value);
    const known = clients.find((c) => c.name === value);
    if (known) setClientNit(known.nit);
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCopied(false);
    try {
      const res = await api<{ path: string; link: PortalLink }>('/api/client-portal/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientNit }),
      });
      setNewLink({ url: `${window.location.origin}${res.path}`, clientName: res.link.clientName });
      setClientName('');
      setClientNit('');
      load();
    } catch (err: any) {
      alert(`No se pudo crear el enlace: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const revoke = async (link: PortalLink) => {
    if (!window.confirm(`¿Revocar el enlace de ${link.clientName}? El cliente dejará de poder entrar con él.`)) return;
    try {
      await api(`/api/client-portal/links/${encodeURIComponent(link.id)}`, { method: 'DELETE' });
      load();
    } catch (err: any) {
      alert(`No se pudo revocar: ${err.message}`);
    }
  };

  const copy = async () => {
    if (!newLink) return;
    await navigator.clipboard.writeText(newLink.url);
    setCopied(true);
  };

  const activeLinks = links.filter((l) => !l.revokedAt);
  const openRequests = requests.filter((r) => r.status !== 'CLOSED');
  const closedRequests = requests.filter((r) => r.status === 'CLOSED');

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Portal de clientes</h1>
          <p className="text-sm text-muted-foreground">
            Cada cliente ve el avance de sus pedidos y envía nuevas solicitudes con un enlace privado.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" /> Generar enlace para un cliente
        </h2>
        <datalist id="portal-known-clients">
          {clients.map((c) => (
            <option key={`${c.name}-${c.nit}`} value={c.name}>
              {c.nit}
            </option>
          ))}
        </datalist>
        <form onSubmit={createLink} className="grid sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Cliente (como aparece en las cotizaciones)</span>
            <input
              list="portal-known-clients"
              required
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">NIT (recomendado)</span>
            <input value={clientNit} onChange={(e) => setClientNit(e.target.value)} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {isCreating ? 'Generando…' : 'Generar enlace'}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Con NIT, el portal muestra los pedidos cuyas cotizaciones tienen ese NIT. Sin NIT, los que coinciden exactamente con el nombre.
        </p>

        {newLink && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-900">Enlace para {newLink.clientName}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={newLink.url} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.target.select()} />
              <button
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola, aquí puedes ver el avance de tus pedidos y hacernos nuevas solicitudes: ${newLink.url}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <p className="text-xs text-emerald-900/80">
              Por seguridad este enlace no se puede volver a mostrar. Si se pierde, genera uno nuevo y revoca el anterior.
            </p>
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 p-5 pb-3">
          <Inbox className="w-4 h-4 text-primary" /> Solicitudes de clientes ({openRequests.length} abiertas)
        </h2>
        {openRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">No hay solicitudes abiertas.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {openRequests.map((r) => (
              <RequestRow key={`${r.id}-${r.status}-${r.response}`} request={r} onSaved={load} />
            ))}
          </ul>
        )}
        {closedRequests.length > 0 && (
          <details className="border-t border-border">
            <summary className="px-5 py-3 text-xs text-muted-foreground cursor-pointer">
              Ver {closedRequests.length} solicitud(es) cerrada(s)
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {closedRequests.map((r) => (
                <RequestRow key={`${r.id}-${r.status}-${r.response}`} request={r} onSaved={load} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <h2 className="text-sm font-bold text-foreground p-5 pb-3">Enlaces activos ({activeLinks.length})</h2>
        {activeLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">Todavía no hay enlaces.</p>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground text-left">
                <tr>
                  <th className="px-5 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">NIT</th>
                  <th className="px-3 py-2 font-medium">Creado</th>
                  <th className="px-3 py-2 font-medium">Último acceso</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeLinks.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5 font-medium text-foreground">{l.clientName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{l.clientNit || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(l.createdAt)}
                      {l.createdByName ? ` · ${l.createdByName}` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDateTime(l.lastAccessAt)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={() => revoke(l)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                      >
                        <Ban className="w-3.5 h-3.5" /> Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
