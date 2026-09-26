import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, AlertCircle, RefreshCcw, LogOut } from 'lucide-react';

interface GoogleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSettingsModal({ isOpen, onClose }: GoogleSettingsModalProps) {
  if (!isOpen) return null;

  const [isConnected, setIsConnected] = useState(true); // Mock connected state
  const [syncDirection, setSyncDirection] = useState('BOTH');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const handleDisconnect = () => {
    if (confirm("¿Estás seguro de que deseas desconectar tu cuenta de Google? Tus citas actuales seguirán existiendo en el CRM, pero la sincronización se detendrá.")) {
      setIsConnected(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/10">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Configuración Google Calendar
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isConnected ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">Conecta tu Calendario</h3>
              <p className="text-sm text-muted-foreground px-4">
                Sincroniza tus citas del CRM con tu Google Calendar, genera enlaces de Google Meet automáticamente y calcula huecos comunes con tu equipo usando tu disponibilidad real (FreeBusy).
              </p>
              <button 
                onClick={() => setIsConnected(true)} 
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-colors shadow-sm"
              >
                Conectar con Google
              </button>
            </div>
          ) : (
            <>
              {/* Status Header */}
              <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-emerald-500/5">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    Conectado a Google <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">andres@empresa.com</p>
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3 h-3" /> Desconectar
                </button>
              </div>

              {/* Sync Direction */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground block">Dirección de Sincronización</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input 
                      type="radio" 
                      name="syncDir" 
                      value="BOTH" 
                      checked={syncDirection === 'BOTH'}
                      onChange={() => setSyncDirection('BOTH')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="text-sm font-bold">Doble Vía (Recomendado)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Los cambios en el CRM se reflejan en Google, y los cambios en Google (ej. desde el celular) se reflejan en el CRM.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input 
                      type="radio" 
                      name="syncDir" 
                      value="TO_GOOGLE" 
                      checked={syncDirection === 'TO_GOOGLE'}
                      onChange={() => setSyncDirection('TO_GOOGLE')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="text-sm font-bold">Solo hacia Google</div>
                      <div className="text-xs text-muted-foreground mt-0.5">El CRM exporta las citas a tu Google Calendar, pero ignora los cambios que hagas allá.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Diagnostics & Manual Sync */}
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Última sincronización completa:</span>
                  <span className="font-bold">Hace 5 minutos</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Estado del Webhook (Push):</span>
                  <span className="font-bold text-emerald-500">Activo</span>
                </div>
                
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSyncing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
                </button>
              </div>

              {/* Notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Solo se sincronizarán los eventos creados o administrados a través de esta plataforma. Tu calendario personal o eventos no relacionados se mantendrán privados.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
