import * as React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, PackageCheck, Plus, Send, X, AlertCircle, CalendarDays, Inbox } from 'lucide-react';
import type { ClientProjectView } from '../../../../../../packages/core/src/portal/clientProgress';

/**
 * Portal del cliente: con su enlace privado, el cliente ve el avance de sus pedidos
 * y puede enviar nuevas solicitudes. No requiere cuenta.
 */

interface ClientRequestView {
  id: string;
  description: string;
  quantity: number | null;
  desiredDate: string | null;
  status: 'NEW' | 'IN_REVIEW' | 'QUOTED' | 'CLOSED';
  response: string | null;
  createdAt: string;
}

interface PortalData {
  client: { name: string };
  projects: ClientProjectView[];
  requests: ClientRequestView[];
}

const REQUEST_STATUS: Record<ClientRequestView['status'], { label: string; className: string }> = {
  NEW: { label: 'Recibida', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_REVIEW: { label: 'En revisión', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  QUOTED: { label: 'Cotizada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Cerrada', className: 'bg-muted text-muted-foreground border-border' },
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ProgressBar({ percent, delivered }: { percent: number; delivered: boolean }) {
  return (
    <div
      className="h-3 w-full rounded-full bg-muted overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Avance del pedido"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${delivered ? 'bg-success' : 'bg-primary'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: ClientProjectView }) {
  const due = formatDate(project.dueDate);
  return (
    <article className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">
            {project.number}
            {project.quoteNumber ? ` · Cotización ${project.quoteNumber}` : ''}
          </p>
          <h2 className="text-lg font-bold text-foreground mt-0.5 break-words">{project.name}</h2>
        </div>
        {project.isDelivered ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PackageCheck className="w-3.5 h-3.5" /> Entregado
          </span>
        ) : (
          due && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" /> Entrega estimada: {due}
            </span>
          )
        )}
      </header>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{project.currentStep.label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{project.percent}%</p>
        </div>
        <ProgressBar percent={project.percent} delivered={project.isDelivered} />
        {!project.isDelivered && <p className="text-sm text-muted-foreground">{project.currentStep.description}</p>}
      </div>

      <ol className="grid grid-cols-3 sm:grid-cols-6 gap-y-4 gap-x-2">
        {project.steps.map((step) => (
          <li key={step.key} className="flex flex-col items-center text-center gap-1.5">
            {step.status === 'done' ? (
              <CheckCircle2 className={`w-5 h-5 ${project.isDelivered ? 'text-success' : 'text-primary'}`} aria-hidden />
            ) : step.status === 'current' ? (
              <span className="relative flex w-5 h-5 items-center justify-center" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/30 animate-ping" />
                <span className="relative inline-flex w-3 h-3 rounded-full bg-primary" />
              </span>
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/40" aria-hidden />
            )}
            <span
              className={`text-[11px] leading-tight ${
                step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground font-semibold'
              }`}
            >
              {step.label}
              <span className="sr-only">
                {step.status === 'done' ? ' (completado)' : step.status === 'current' ? ' (en curso)' : ' (pendiente)'}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {project.items.length > 0 && (
        <ul className="border-t border-border pt-4 space-y-1.5">
          {project.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-foreground break-words min-w-0">{item.name}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{item.quantity.toLocaleString('es-CO')} uds</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function NewRequestForm({ token, onCreated, onCancel }: { token: string; onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = React.useState({ description: '', quantity: '', desiredDate: '', contactName: '', contactPhone: '' });
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          quantity: form.quantity ? Number(form.quantity) : null,
          desiredDate: form.desiredDate || null,
          contactName: form.contactName || null,
          contactPhone: form.contactPhone || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la solicitud');
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setIsSending(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">Nueva solicitud</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">¿Qué necesitas?</span>
        <textarea
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          value={form.description}
          onChange={update('description')}
          placeholder="Ej: 1.000 volantes media carta a color, papel propalcote, iguales al pedido anterior."
          className={inputClass}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Cantidad (opcional)</span>
          <input type="number" min={1} value={form.quantity} onChange={update('quantity')} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">¿Para cuándo? (opcional)</span>
          <input type="date" value={form.desiredDate} onChange={update('desiredDate')} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Tu nombre (opcional)</span>
          <input type="text" maxLength={120} value={form.contactName} onChange={update('contactName')} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Teléfono de contacto (opcional)</span>
          <input type="tel" maxLength={40} value={form.contactPhone} onChange={update('contactPhone')} className={inputClass} />
        </label>
      </div>

      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSending}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        <Send className="w-4 h-4" /> {isSending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  );
}

export default function ClientPortalPage() {
  const { token = '' } = useParams();
  const [data, setData] = React.useState<PortalData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'No se pudo cargar la información');
      setData(body);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-sm text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-foreground font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
  }

  const active = data.projects.filter((p) => !p.isDelivered);
  const delivered = data.projects.filter((p) => p.isDelivered);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary tracking-wide uppercase">Fusión Comunicación Gráfica</p>
            <h1 className="text-xl font-bold text-foreground mt-0.5">Hola, {data.client.name}</h1>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setNotice(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Nueva solicitud
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {notice}
          </div>
        )}

        {showForm && (
          <NewRequestForm
            token={token}
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              setNotice('Recibimos tu solicitud. Un asesor te contactará pronto.');
              load();
            }}
          />
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Pedidos en curso ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl px-5 py-8 text-center">
              No tienes pedidos en producción en este momento.
            </p>
          ) : (
            active.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </section>

        {data.requests.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" /> Mis solicitudes
            </h2>
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border">
              {data.requests.map((r) => (
                <li key={r.id} className="px-5 py-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${REQUEST_STATUS[r.status].className}`}>
                      {REQUEST_STATUS[r.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line break-words">{r.description}</p>
                  {r.response && (
                    <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
                      <span className="font-semibold text-foreground">Respuesta: </span>
                      {r.response}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {delivered.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-success" /> Entregados ({delivered.length})
            </h2>
            {delivered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
