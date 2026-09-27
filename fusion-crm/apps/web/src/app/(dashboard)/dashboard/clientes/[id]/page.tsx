import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Tag, User, FileText, Package, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { PhoneLink } from "../../../../../../../../packages/ui/src/components/PhoneLink";
import { useFusionAuth } from "@/context/FusionAuthContext";

interface ProfileResponse {
  client: any;
  quotes: { id: string; number: string; status: string; date: string | null; total: number }[];
  projects: { id: string; number: string; name: string; stageName: string; delivered: boolean; dueDate: string | null; quoteNumber: string | null }[];
  stats: { wonValue: number; quotesCount: number; approvedCount: number; closeRate: number | null; openProjects: number; lastQuoteAt: string | null };
}

const TEMP: Record<string, { label: string; cls: string }> = {
  HOT: { label: "Caliente", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  WARM: { label: "Tibio", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  COLD: { label: "Frío", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  VIP: { label: "VIP", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};
const TYPE: Record<string, string> = { ACTIVE: "Activo", PROSPECT: "Prospecto", INACTIVE: "Inactivo" };

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canSeeModule } = useFusionAuth();
  const [data, setData] = React.useState<ProfileResponse | null>(null);
  const [error, setError] = React.useState("");
  const [calls, setCalls] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/clients/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) throw new Error(d.error || `Error ${r.status}`);
        setData(d);
      })
      .catch((err) => setError(err?.message || "No se pudo cargar el cliente"));
    // Llamadas del cliente (solo si la telefonía está activa y hay permiso)
    fetch(`/api/voice/calls?customerId=${encodeURIComponent(id)}&limit=10`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCalls(d?.success ? d.calls : null))
      .catch(() => setCalls(null));
  }, [id]);

  const back = (
    <Link to="/dashboard/clientes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
      <ArrowLeft className="w-4 h-4" /> Clientes
    </Link>
  );

  if (error) return <div className="space-y-4">{back}<div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">{error}</div></div>;
  if (!data) return <div className="space-y-4">{back}<div className="text-sm text-muted-foreground">Cargando…</div></div>;

  const c = data.client;
  const temp = TEMP[String(c.temp || "").toUpperCase()];
  const phones = [c.phone1, c.phone2, c.phone3, c.phone].filter((p, i, all) => p && all.indexOf(p) === i);
  const showMoney = canSeeModule("comercial");

  return (
    <div className="space-y-6">
      {back}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{c.name || c.tradeName || "Cliente"}</h1>
              {c.type && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">{TYPE[c.type] || c.type}</span>}
              {temp && <span className={`px-2 py-0.5 rounded text-xs font-semibold ${temp.cls}`}>{temp.label}</span>}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4">
              {c.nit && <span>NIT {c.nit}</span>}
              {c.code && <span>{c.code}</span>}
              {c.tradeName && c.tradeName !== c.name && <span>{c.tradeName}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/dashboard/cotizaciones?clientId=${encodeURIComponent(c.id)}&clientName=${encodeURIComponent(c.name || "")}`)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm shrink-0">
          Nueva cotización
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Valor aprobado" value={showMoney ? cop(data.stats.wonValue) : "—"} />
        <Stat label="Cotizaciones" value={`${data.stats.quotesCount}${data.stats.approvedCount ? ` · ${data.stats.approvedCount} aprobadas` : ""}`} />
        <Stat label="Tasa de cierre" value={data.stats.closeRate == null ? "—" : `${data.stats.closeRate}%`} />
        <Stat label="Pedidos en curso" value={String(data.stats.openProjects)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <section className="bg-card rounded-xl border border-border p-5 space-y-3 text-sm">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contacto</h2>
            {phones.length ? (
              phones.map((p: string) => (
                <div key={p} className="flex items-center gap-2">
                  <PhoneLink phone={p} name={c.name} customerId={c.id} />
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Sin teléfono registrado</div>
            )}
            {c.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="break-all">{c.email}</span>
              </div>
            )}
            {c.billingContact && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{c.billingContact} <span className="text-muted-foreground">(facturación)</span></span>
              </div>
            )}
            {c.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{c.address}</span>
              </div>
            )}
            {c.sector && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span>Sector: {c.sector}</span>
              </div>
            )}
          </section>

          {calls && (
            <section className="bg-card rounded-xl border border-border">
              <h2 className="p-4 border-b border-border font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PhoneCall className="w-4 h-4" /> Llamadas
              </h2>
              <ul className="divide-y divide-border text-sm">
                {calls.map((call) => (
                  <li key={call.id}>
                    <Link to={`/voz/llamadas/${call.id}`} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-muted/40">
                      <span className="flex items-center gap-2">
                        {call.missed ? <PhoneMissed className="w-4 h-4 text-rose-600" /> : call.direction === "OUTBOUND" ? <PhoneOutgoing className="w-4 h-4 text-sky-600" /> : <PhoneIncoming className="w-4 h-4 text-emerald-600" />}
                        {call.handledByName || (call.missed ? "Perdida" : "—")}
                      </span>
                      <span className="text-xs text-muted-foreground">{day(call.startedAt)}</span>
                    </Link>
                  </li>
                ))}
                {calls.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Sin llamadas registradas.</li>}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card rounded-xl border border-border">
            <h2 className="p-4 border-b border-border font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Cotizaciones
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-border">
                  {data.quotes.map((q) => (
                    <tr key={q.id} onClick={() => navigate(`/dashboard/cotizador?quoteId=${encodeURIComponent(q.id)}`)} className="hover:bg-muted/40 cursor-pointer">
                      <td className="px-4 py-2.5 font-medium">{q.number || "Sin número"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{q.status}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{day(q.date)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{showMoney ? cop(q.total) : ""}</td>
                    </tr>
                  ))}
                  {data.quotes.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground">Aún no tiene cotizaciones.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border">
            <h2 className="p-4 border-b border-border font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" /> Pedidos (OT)
            </h2>
            <ul className="divide-y divide-border text-sm">
              {data.projects.map((p) => (
                <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{p.number} · <span className="font-normal">{p.name}</span></div>
                    <div className="text-xs text-muted-foreground">{p.quoteNumber ? `Desde ${p.quoteNumber}` : ""}{p.dueDate ? ` · entrega ${day(p.dueDate)}` : ""}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${p.delivered ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>{p.stageName}</span>
                </li>
              ))}
              {data.projects.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Sin pedidos.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
