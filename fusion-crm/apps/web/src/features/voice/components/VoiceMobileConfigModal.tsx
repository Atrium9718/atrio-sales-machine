import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  QrCode,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  PhoneForwarded,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';
import { voiceRpc } from '../sip/rpc';

export interface VoiceMobileConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceMobileConfigModal: React.FC<VoiceMobileConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<any | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Estados de desvío móvil
  const [mobileNumber, setMobileNumber] = useState('');
  const [ringStrategy, setRingStrategy] = useState<'BROWSER_ONLY' | 'SIMULTANEOUS' | 'BROWSER_THEN_MOBILE'>('BROWSER_THEN_MOBILE');
  const [isSavingForwarding, setIsSavingForwarding] = useState(false);
  const [forwardingSaved, setForwardingSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      voiceRpc.mobile.getConfig().then((cfg) => {
        setConfig(cfg);
        if (cfg?.mobileNumber) setMobileNumber(cfg.mobileNumber);
        if (cfg?.ringStrategy) setRingStrategy(cfg.ringStrategy);
      });
      setRevealedPassword(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevealPassword = async () => {
    setIsRevealing(true);
    try {
      const data = await voiceRpc.mobile.revealPassword();
      setRevealedPassword(data.password);
    } catch (err) {
      console.error('Error al revelar contraseña SIP:', err);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveForwarding = async () => {
    setIsSavingForwarding(true);
    try {
      await voiceRpc.mobile.updateForwarding(mobileNumber, ringStrategy);
      setForwardingSaved(true);
      setTimeout(() => setForwardingSaved(false), 2500);
    } catch (err) {
      console.error('Error al guardar desvío móvil', err);
    } finally {
      setIsSavingForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-[480px] max-w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-sm text-foreground">Telefonía en el Celular</h3>
              <p className="text-[11px] text-muted-foreground">
                Configuración para Zoiper / Linphone y Desvío Móvil Inteligente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Opción 1: App SIP en el Celular (Zoiper / Linphone / Groundwire) */}
          <div className="bg-muted/30 border border-border/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-primary" />
                <span>Softphone Móvil (Zoiper / Linphone)</span>
              </span>
              <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                Extensión #{config?.extension || '101'}
              </span>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Descarga Zoiper o Linphone en tu celular (iOS / Android) y escanea o ingresa los siguientes datos:
            </p>

            {/* Parámetros SIP */}
            <div className="space-y-1.5 font-mono text-[11px] bg-card p-3 rounded-xl border border-border">
              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground font-sans">Dominio / PBX:</span>
                <div className="flex items-center gap-1">
                  <span className="text-foreground">{config?.sipDomain || 'pbx.fusioncg.com'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(config?.sipDomain || 'pbx.fusioncg.com', 'domain')}
                    className="p-1 hover:text-primary"
                  >
                    {copiedField === 'domain' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground font-sans">Usuario / Cuenta:</span>
                <div className="flex items-center gap-1">
                  <span className="text-foreground">{config?.sipUsername || 'ext_101'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(config?.sipUsername || 'ext_101', 'user')}
                    className="p-1 hover:text-primary"
                  >
                    {copiedField === 'user' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground font-sans">Transporte SIP:</span>
                <span className="text-foreground font-bold text-primary">TLS / WSS (Puerto 5061)</span>
              </div>

              {/* Contraseña SIP revelable bajo demanda */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground font-sans">Contraseña:</span>
                <div className="flex items-center gap-2">
                  {revealedPassword ? (
                    <>
                      <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {revealedPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(revealedPassword, 'pass')}
                        className="p-1 hover:text-primary"
                      >
                        {copiedField === 'pass' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRevealPassword}
                      disabled={isRevealing}
                      className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium flex items-center gap-1 text-foreground transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isRevealing ? 'Descifrando...' : 'Revelar Contraseña'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>La revelación de contraseñas SIP se audita con fecha, IP y usuario en el servidor.</span>
            </div>
          </div>

          {/* Opción 2: Desvío Inteligente a Línea Celular (GSM) */}
          <div className="bg-muted/30 border border-border/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <PhoneForwarded className="w-4 h-4 text-emerald-500" />
                <span>Desvío Móvil Inteligente (Sin App)</span>
              </span>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Si no tienes internet o estás fuera de la oficina, Asterisk desviará tus llamadas a tu número de celular personal:
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-foreground block">
                Número de teléfono celular (Colombia):
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+57 310 555 9876"
                className="w-full text-xs p-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono text-foreground"
              />
            </div>

            {/* Estrategia de timbrado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground block">
                Estrategia de timbrado:
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'BROWSER_THEN_MOBILE',
                    title: 'Navegador primero (15s), luego celular',
                    desc: 'Timbra 15s en el CRM web. Si no contestas, timbra inmediatamente a tu celular.',
                  },
                  {
                    id: 'SIMULTANEOUS',
                    title: 'Simultáneo (Navegador y Celular al tiempo)',
                    desc: 'Timbran ambos a la vez. Donde primero contestes toma la llamada.',
                  },
                  {
                    id: 'BROWSER_ONLY',
                    title: 'Solo Navegador (Sin desvío celular)',
                    desc: 'No enviar llamadas a la línea móvil bajo ninguna circunstancia.',
                  },
                ].map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      ringStrategy === s.id
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-card hover:bg-muted/50 border-border text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ringStrategy"
                      checked={ringStrategy === s.id}
                      onChange={() => setRingStrategy(s.id as any)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-foreground">{s.title}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Aviso de seguridad anti-buzón DTMF 1 */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Protección Anti-Buzón Móvil</span>
              </div>
              <p className="text-[10px] opacity-90">
                Al desviar la llamada a tu celular, Asterisk reproducirá: <em>"Llamada de Fusion CRM para [Cliente]. Presione 1 para contestar"</em>. Si tu celular está apagado o entra a la casilla de correo de tu operador celular (Claro/Tigo/Movistar), la llamada NO se cobrará ni se cortará; volverá a la cola del CRM.
              </p>
            </div>

            {/* Botón de guardar desvío */}
            <div className="flex items-center justify-between pt-1">
              {forwardingSaved ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Configuración guardada</span>
                </span>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={handleSaveForwarding}
                disabled={isSavingForwarding}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors"
              >
                {isSavingForwarding ? 'Guardando...' : 'Guardar Desvío'}
              </button>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
