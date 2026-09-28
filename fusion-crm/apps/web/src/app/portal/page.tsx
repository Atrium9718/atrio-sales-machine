import * as React from 'react';
import { AlertCircle, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

/**
 * Ingreso del cliente a su portal: escribe su cédula o NIT, recibe un código en el WhatsApp o
 * correo que la empresa tiene registrados y entra a ver sus pedidos y hacer nuevas solicitudes.
 */

interface Alternative {
  channel: 'whatsapp' | 'email';
  masked: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

export default function PortalLoginPage() {
  const [company, setCompany] = React.useState({ name: '', logoUrl: '' });
  const [document, setDocument] = React.useState('');
  const [code, setCode] = React.useState('');
  const [challenge, setChallenge] = React.useState<{ id: string; sentTo: string; alternatives: Alternative[] } | null>(null);
  const [alternatives, setAlternatives] = React.useState<Alternative[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch('/api/portal/acceso/identity').then((r) => r.json()).then(setCompany).catch(() => {});
  }, []);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`/api/portal/acceso/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  };

  const start = async (channel?: Alternative['channel']) => {
    setBusy(true);
    setError('');
    const { ok, body } = await post('start', { document, channel });
    setBusy(false);
    if (!ok) {
      setError(body.error || 'No se pudo enviar el código');
      setAlternatives(body.alternatives || []);
      return;
    }
    setChallenge({ id: body.challengeId, sentTo: body.sentTo, alternatives: body.alternatives || [] });
    setAlternatives([]);
    setCode('');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError('');
    const { ok, body } = await post('verify', { challengeId: challenge.id, code });
    if (ok && body.path) {
      window.location.href = body.path;
      return;
    }
    setBusy(false);
    setError(body.error || 'No se pudo validar el código');
    if (body.restart) setChallenge(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-14 mx-auto object-contain" />
          ) : (
            <p className="text-sm font-semibold text-primary tracking-wide uppercase">{company.name}</p>
          )}
          <h1 className="text-2xl font-bold text-foreground">Consulta tus pedidos</h1>
          <p className="text-sm text-muted-foreground">Mira cómo va tu pedido y haz nuevas solicitudes.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          {!challenge ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start();
              }}
              className="space-y-4"
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Cédula o NIT</span>
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Ej: 900123456"
                  className={inputClass}
                />
                <span className="text-xs text-muted-foreground">El mismo con el que te facturamos. Sin dígito de verificación también sirve.</span>
              </label>
              <button type="submit" disabled={busy || document.replace(/\D/g, '').length < 5} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {busy ? 'Enviando código…' : 'Enviarme un código'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <button type="button" onClick={() => { setChallenge(null); setError(''); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Cambiar documento
              </button>
              <p className="text-sm text-foreground flex items-start gap-2">
                <KeyRound className="w-4 h-4 mt-0.5 text-primary shrink-0" /> Te enviamos un código de 6 dígitos por {challenge.sentTo}. Vence en 10 minutos.
              </p>
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
              />
              <button type="submit" disabled={busy || code.length !== 6} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {busy ? 'Validando…' : 'Entrar'}
              </button>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <button type="button" disabled={busy} onClick={() => start()} className="text-primary hover:underline">Reenviar código</button>
                {challenge.alternatives.map((a) => (
                  <button key={a.channel} type="button" disabled={busy} onClick={() => start(a.channel)} className="text-primary hover:underline">
                    Enviarlo por {a.masked}
                  </button>
                ))}
              </div>
            </form>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-danger flex items-start gap-1.5" role="alert"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</p>
              {alternatives.map((a) => (
                <button key={a.channel} type="button" disabled={busy} onClick={() => start(a.channel)} className="text-sm text-primary hover:underline">
                  Enviarlo por {a.masked}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> El código solo llega al celular o correo que tenemos registrados. Si cambiaron, escríbenos.
        </p>
      </div>
    </div>
  );
}
