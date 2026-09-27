import * as React from 'react';
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useFusionAuth } from '@/context/FusionAuthContext';
import { inboxApi, type ChannelStatus, type OmnichannelConfig } from './api';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const AUTO_INTENTS = [
  { key: 'estado_pedido', label: 'Estado de pedidos' },
  { key: 'cotizacion', label: 'Cotizaciones' },
  { key: 'saludo', label: 'Saludos' },
  { key: 'otro', label: 'Otras consultas' },
];

const MODES: { key: OmnichannelConfig['aiMode']; title: string; text: string }[] = [
  { key: 'off', title: 'Apagada', text: 'La IA no responde; todo lo atiende tu equipo.' },
  { key: 'suggest', title: 'Sugerencia (recomendado al empezar)', text: 'La IA escribe la respuesta y una persona la aprueba o corrige con un clic.' },
  { key: 'auto', title: 'Automática', text: 'La IA responde sola. Tu equipo solo ve lo que ella pasa a una persona.' },
];

export function AiConfigPanel() {
  const { currentUser } = useFusionAuth();
  // Mismo criterio que el servidor (rol del usuario con el que se está trabajando)
  const canEdit = ['admin', 'super_admin'].includes(currentUser?.roleKey || '');
  const [config, setConfig] = React.useState<OmnichannelConfig | null>(null);
  const [channels, setChannels] = React.useState<ChannelStatus | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    inboxApi
      .config()
      .then((d) => {
        setConfig(d.config);
        setChannels(d.channels);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  if (!config) return <div className="p-8 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Cargando…</div>;

  const set = <K extends keyof OmnichannelConfig>(key: K, value: OmnichannelConfig[K]) => setConfig({ ...config, [key]: value });

  const save = async () => {
    setSaving(true);
    try {
      setConfig(await inboxApi.saveConfig(config));
      notify('Configuración guardada', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const status = (ok: boolean | undefined, label: string) => (
    <div className="flex items-center gap-1.5 text-xs">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" />} {label}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-4 pb-8">
      <section className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-sm">Canales conectados</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {status(channels?.whatsapp, 'WhatsApp')}
          {status(channels?.messenger, 'Messenger')}
          {status(channels?.instagram, 'Instagram')}
          {status(true, 'Chat web')}
          {status(channels?.webhookSecret, 'Firma de Meta')}
          {status(channels?.ai, 'IA (Gemini)')}
        </div>
        <p className="text-[11px] text-muted-foreground">Los canales se conectan en el servidor (archivo .env). La guía paso a paso está en DEPLOY.md → Canales.</p>
      </section>

      <fieldset disabled={!canEdit} className="space-y-4">
        {!canEdit && <p className="text-xs text-amber-700 dark:text-amber-300">Solo un administrador puede cambiar esta configuración.</p>}

        <section className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-sm">¿Cómo atiende la IA?</h3>
          {MODES.map((m) => (
            <label key={m.key} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${config.aiMode === m.key ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <input type="radio" name="aiMode" checked={config.aiMode === m.key} onChange={() => set('aiMode', m.key)} className="mt-1" />
              <span>
                <span className="block text-sm font-semibold">{m.title}</span>
                <span className="block text-xs text-muted-foreground">{m.text}</span>
              </span>
            </label>
          ))}
          {config.aiMode === 'auto' && (
            <div className="pt-1">
              <div className="text-xs font-semibold mb-1">Temas que responde sola (sin marcar ninguno = todos):</div>
              <div className="flex flex-wrap gap-2">
                {AUTO_INTENTS.map((i) => (
                  <label key={i.key} className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-2 py-1">
                    <input
                      type="checkbox"
                      checked={config.autoIntents.includes(i.key)}
                      onChange={(e) => set('autoIntents', e.target.checked ? [...config.autoIntents, i.key] : config.autoIntents.filter((k) => k !== i.key))}
                    />
                    {i.label}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Los demás temas quedan como sugerencia para aprobar.</p>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm">Negocio y horario de atención humana</h3>
          <label className="block text-xs font-semibold">
            Nombre que usa la IA
            <input value={config.businessName} onChange={(e) => set('businessName', e.target.value)} className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm font-normal" />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={config.businessHours.days.includes(i)}
                  onChange={(e) =>
                    set('businessHours', { ...config.businessHours, days: e.target.checked ? [...config.businessHours.days, i].sort() : config.businessHours.days.filter((x) => x !== i) })
                  }
                />
                {d}
              </label>
            ))}
            <span className="ml-2">de</span>
            <input type="time" value={config.businessHours.start} onChange={(e) => set('businessHours', { ...config.businessHours, start: e.target.value })} className="bg-background border border-border rounded px-1.5 py-0.5" />
            <span>a</span>
            <input type="time" value={config.businessHours.end} onChange={(e) => set('businessHours', { ...config.businessHours, end: e.target.value })} className="bg-background border border-border rounded px-1.5 py-0.5" />
          </div>
          <p className="text-[11px] text-muted-foreground">Fuera de este horario la IA sigue atendiendo; si algo necesita a una persona, avisa que responderán en el próximo horario.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm">Lo que la IA debe saber</h3>
          <textarea
            value={config.knowledge}
            onChange={(e) => set('knowledge', e.target.value)}
            rows={10}
            placeholder={'Ejemplos:\n- Dirección: Calle 10 # 20-30, Medellín. Horario: lunes a viernes 8 a 6, sábados 8 a 12.\n- Tiempos habituales: tarjetas 2 días hábiles, volantes 3 días, cajas 8 a 12 días.\n- Pagos: 50% de anticipo y 50% contra entrega. No trabajamos contraentrega sin anticipo.\n- Hacemos domicilios en el área metropolitana; a otras ciudades por transportadora.\n- Los archivos se reciben en PDF o AI con fuentes convertidas a curvas.'}
            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
          />
          <label className="block text-xs font-semibold">
            Lo que la IA nunca debe decir o prometer
            <textarea value={config.forbidden} onChange={(e) => set('forbidden', e.target.value)} rows={3} className="mt-1 w-full bg-background border border-border rounded-lg p-2.5 text-sm font-normal" />
          </label>
        </section>

        {canEdit && (
          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          </div>
        )}
      </fieldset>
    </div>
  );
}
