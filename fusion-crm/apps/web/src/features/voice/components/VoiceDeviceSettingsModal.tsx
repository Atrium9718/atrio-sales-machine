import React, { useState, useEffect } from 'react';
import {
  Settings2,
  Mic,
  Volume2,
  Bell,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { deviceManager, MediaDeviceInfoItem } from '../sip/deviceManager';
import { callSounds } from '../../../../../../src/utils/callSounds';

export interface VoiceDeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceDeviceSettingsModal: React.FC<VoiceDeviceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfoItem[]>([]);
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [selectedRingtone, setSelectedRingtone] = useState('default');

  const [micLevel, setMicLevel] = useState(0);
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [testCountdown, setTestCountdown] = useState(3);
  const [playbackTestFn, setPlaybackTestFn] = useState<(() => void) | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      deviceManager.stopLevelMeter();
      return;
    }

    loadDevices();
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      // Solicitar acceso temporal si aún no se tiene permiso para que enumerateDevices liste los nombres
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setPermissionBlocked(false);
    } catch {
      setPermissionBlocked(true);
    }

    const { audioInputs: inputs, audioOutputs: outputs } = await deviceManager.getDevices();
    setAudioInputs(inputs);
    setAudioOutputs(outputs);

    const curMic = deviceManager.getSelectedMicId();
    const curSpeaker = deviceManager.getSelectedSpeakerId();
    const curRingtone = deviceManager.getSelectedRingtoneId();

    setSelectedMic(curMic);
    setSelectedSpeaker(curSpeaker);
    setSelectedRingtone(curRingtone);

    // Iniciar medidor de nivel en vivo
    startMeter(curMic);
  };

  const startMeter = (micId: string) => {
    deviceManager
      .startLevelMeter(micId, (level) => {
        setMicLevel(level);
      })
      .catch(() => {
        setPermissionBlocked(true);
      });
  };

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    deviceManager.setSelectedMicId(deviceId);
    startMeter(deviceId);
  };

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    deviceManager.setSelectedSpeakerId(deviceId);
  };

  const handleRingtoneChange = (deviceId: string) => {
    setSelectedRingtone(deviceId);
    deviceManager.setSelectedRingtoneId(deviceId);
  };

  const handleTestSpeaker = () => {
    deviceManager.playTestSpeaker(selectedSpeaker);
  };

  const handleTestRingtone = () => {
    callSounds.playConnectedChime();
  };

  const handleStartMicTest = async () => {
    setIsRecordingTest(true);
    setPlaybackTestFn(null);
    try {
      const result = await deviceManager.testMicrophoneRecording(selectedMic, (remaining) => {
        setTestCountdown(remaining);
      });
      setIsRecordingTest(false);
      setPlaybackTestFn(() => result.playAudio);
      // Reproducir inmediatamente
      result.playAudio();
    } catch (err) {
      setIsRecordingTest(false);
      console.error('Error durante prueba de grabación', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-[460px] max-w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-sm text-foreground">Dispositivos y Audio</h3>
              <p className="text-[11px] text-muted-foreground">Configuración de micrófono, altavoces y timbre</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guía en caso de permiso bloqueado */}
        {permissionBlocked && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20 text-xs text-foreground space-y-2">
            <div className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>El navegador ha bloqueado el acceso al micrófono</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Para usar el softphone de Fusion CRM, debe permitir el micrófono en los ajustes de su navegador.
            </p>
            <button
              type="button"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ver cómo desbloquear en Chrome, Edge y Firefox</span>
            </button>

            {showTroubleshoot && (
              <div className="bg-background/80 p-3 rounded-xl border border-border text-[11px] space-y-1.5 mt-2">
                <div><strong>En Google Chrome y Microsoft Edge:</strong> Haz clic en el ícono de candado o controles a la izquierda de la barra de URL (dirección web) → Activa el interruptor <em>Micrófono</em> → Recarga la página.</div>
                <div><strong>En Mozilla Firefox:</strong> Haz clic en el ícono de micrófono tachado en la barra de URL → Borra el bloqueo 'Bloqueado temporalmente' y recarga.</div>
              </div>
            )}
          </div>
        )}

        {/* Formulario de dispositivos */}
        <div className="p-5 space-y-4 text-xs">
          {/* 1. Micrófono */}
          <div className="space-y-2">
            <label className="font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-primary" />
                <span>Micrófono de Entrada</span>
              </span>
              <button
                type="button"
                onClick={loadDevices}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-normal"
                title="Actualizar lista de dispositivos"
              >
                <RefreshCw className="w-3 h-3" /> Detectar
              </button>
            </label>

            <select
              value={selectedMic}
              onChange={(e) => handleMicChange(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              {audioInputs.length === 0 && <option value="default">Micrófono por defecto del sistema</option>}
              {audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Medidor VU-Meter en tiempo real */}
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Nivel de audio en vivo:</span>
                <span className="font-mono font-bold text-foreground">{micLevel}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    micLevel > 75 ? 'bg-amber-500' : micLevel > 20 ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  }`}
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            {/* Botón de grabación y escucha de prueba */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleStartMicTest}
                disabled={isRecordingTest}
                className="w-full py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center justify-center gap-2 border border-border transition-colors"
              >
                {isRecordingTest ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Grabando voz ({testCountdown}s)... Habla ahora</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-primary" />
                    <span>Grabar y escuchar prueba (3s)</span>
                  </>
                )}
              </button>

              {playbackTestFn && !isRecordingTest && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Prueba completada</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => playbackTestFn()}
                    className="underline hover:opacity-80 font-bold"
                  >
                    Volver a escuchar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-border my-2" />

          {/* 2. Altavoces de llamada */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-primary" />
              <span>Altavoces (Audio de llamada)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSpeaker}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                className="flex-1 p-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {audioOutputs.length === 0 && <option value="default">Altavoces por defecto del sistema</option>}
                {audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTestSpeaker}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border"
                title="Probar sonido de altavoces"
              >
                Probar
              </button>
            </div>
          </div>

          {/* 3. Dispositivo de timbre */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary" />
              <span>Dispositivo de Timbre</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedRingtone}
                onChange={(e) => handleRingtoneChange(e.target.value)}
                className="flex-1 p-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {audioOutputs.length === 0 && <option value="default">Altavoces por defecto del sistema</option>}
                {audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTestRingtone}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border"
                title="Probar timbre de llamada"
              >
                Timbre
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
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
