import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle, RefreshCcw, MessageCircle, Globe, Instagram, Facebook, Bot, ShieldCheck, Bell } from 'lucide-react';

interface ChannelHealth {
  channel: string;
  configured: boolean;
  level: 'ok' | 'warning' | 'error' | 'off';
  summary: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  inbound7d: number;
  outbound7d: number;
  failed7d: number;
  deliveredRate: number | null;
  lastError: string | null;
}

interface HealthResponse {
  channels: ChannelHealth[];
  checks: { ai: boolean; webhookSignature: boolean; webhookVerifyToken: boolean; notices: { pending: number; failed: number } };
}

const CHANNEL_INFO: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  whatsapp: { name: 'WhatsApp', icon: MessageCircle },
  messenger: { name: 'Messenger', icon: Facebook },
  instagram: { name: 'Instagram', icon: Instagram },
  webchat: { name: 'Chat de la página web', icon: Globe },
};

const LEVEL = {
  ok: { icon: CheckCircle2, cls: 'text-success', border: 'border-success/30' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600', border: 'border-amber-500/30' },
  error: { icon: XCircle, cls: 'text-destructive', border: 'border-destructive/40' },
  off: { icon: MinusCircle, cls: 'text-muted-foreground', border: 'border-border' },
};

const ago = (iso: string | null) => {
  if (!iso) return 'nunca';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
};

export default function SaludCanalesPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/omnichannel/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('No se pudo consultar el estado de los canales.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const Check = ({ ok, label, hint }: { ok: boolean; label: string; hint: string }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      {ok ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{ok ? 'Configurado' : hint}</div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Salud de canales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calculado con los mensajes reales de los últimos 7 días. Se actualiza cada minuto.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm font-bold hover:bg-muted">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.channels.map((c) => {
              const info = CHANNEL_INFO[c.channel] ?? { name: c.channel, icon: MessageCircle };
              const lv = LEVEL[c.level];
              return (
                <div key={c.channel} className={`bg-card border ${lv.border} rounded-xl p-5 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <info.icon className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-bold">{info.name}</h3>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold ${lv.cls}`}>
                      <lv.icon className="w-4 h-4" /> {c.summary}
                    </span>
                  </div>
                  {c.configured ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="font-black text-lg">{c.inbound7d}</div>
                          <div className="text-[11px] text-muted-foreground">recibidos</div>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="font-black text-lg">{c.outbound7d}</div>
                          <div className="text-[11px] text-muted-foreground">enviados</div>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="font-black text-lg">{c.deliveredRate === null ? '—' : `${Math.round(c.deliveredRate * 100)}%`}</div>
                          <div className="text-[11px] text-muted-foreground">entregados</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3">
                        Último recibido {ago(c.lastInboundAt)} · último enviado {ago(c.lastOutboundAt)}
                      </div>
                      {c.lastError && <div className="text-xs text-destructive mt-2 bg-destructive/5 rounded p-2">Último error: {c.lastError}</div>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Falta conectarlo. Los pasos están en DEPLOY.md, sección «Canales».</p>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <h2 className="font-bold mb-3">Configuración</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Check ok={data.checks.ai} label="Agentes de IA" hint="Falta GEMINI_API_KEY: nadie responde automáticamente" />
              <Check ok={data.checks.webhookSignature} label="Firma de Meta" hint="Falta META_APP_SECRET: no se aceptan mensajes de Meta" />
              <Check ok={data.checks.webhookVerifyToken} label="Token de verificación" hint="Falta META_WEBHOOK_VERIFY_TOKEN" />
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                <Bell className={`w-5 h-5 shrink-0 ${data.checks.notices.failed ? 'text-destructive' : 'text-success'}`} />
                <div>
                  <div className="font-bold text-sm">Avisos de etapa</div>
                  <div className="text-xs text-muted-foreground">
                    {data.checks.notices.pending} en cola · {data.checks.notices.failed} fallidos
                    {data.checks.notices.failed ? ' (reintenta en Bandeja → Avisos)' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> <Bot className="w-4 h-4" /> Un canal pasa a rojo cuando falla más del 20% de los envíos de la semana.
          </p>
        </>
      )}
    </div>
  );
}
