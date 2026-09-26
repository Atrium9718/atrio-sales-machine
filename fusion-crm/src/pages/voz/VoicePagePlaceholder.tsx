import * as React from 'react';
import { Link } from 'react-router-dom';
import { Phone, PhoneCall, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, Layers, FileText, ArrowRight, Settings, Radio } from 'lucide-react';
import { can } from '../../../packages/core/src/auth/permissions';
import { useVoiceStatus } from '../../hooks/useVoiceStatus';

export interface VoicePagePlaceholderProps {
  id?: string;
  title: string;
  subtitle: string;
  stageName: string; // e.g. "Sub-Etapa 17.2"
  requiredPermission: string; // e.g. "voice:use"
  models: string[]; // e.g. ["VoiceCall", "VoiceRecording"]
  events?: string[]; // e.g. ["voz.llamada_entrante"]
  description: string;
  badge?: string;
}

export const VoicePagePlaceholder: React.FC<VoicePagePlaceholderProps> = ({
  id = 'voice-page-placeholder',
  title,
  subtitle,
  stageName,
  requiredPermission,
  models,
  events = [],
  description,
  badge = 'En Construcción',
}) => {
  const voiceStatus = useVoiceStatus();
  const userPermissions = (window as any).__FUSION_USER_PERMISSIONS__ || ['*'];
  const hasPermission = can(userPermissions, requiredPermission);

  if (!hasPermission) {
    return (
      <div id={id} className="p-6 max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
          <p className="text-sm text-muted-foreground">
            Su rol no cuenta con el permiso requerido (<code className="font-mono text-destructive">{requiredPermission}</code>) para acceder a este módulo de voz.
          </p>
          <div className="pt-2">
            <Link
              to="/voz"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Volver al panel de voz <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <Link to="/voz" className="hover:text-foreground">Telefonía y Voz</Link>
            <ChevronRight className="w-3 h-3" />
            <span>{stageName}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {badge}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {voiceStatus.enabled ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Asterisk ARI Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span>Servidor Inactivo (Solo Esquema)</span>
            </div>
          )}
          <Link
            to="/configuracion/voz"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium hover:bg-muted text-foreground transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuración</span>
          </Link>
        </div>
      </div>

      {/* Banner de Estado */}
      {!voiceStatus.loading && !voiceStatus.enabled && (
        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Entorno sin servidor de telefonía activo</p>
            <p>
              El esquema de base de datos, permisos tipados y eventos ya están instalados (Etapa 17.1).
              Para interactuar con llamadas reales, configure las variables <code className="font-mono text-primary">ASTERISK_ARI_*</code> en el entorno.
            </p>
          </div>
        </div>
      )}

      {/* Tarjeta de Estado y Construcción (Empty State) */}
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <PhoneCall className="w-7 h-7" />
        </div>

        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Módulo en Fase de Cimiento ({stageName})
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Modelos y Eventos Relacionados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          <div className="bg-muted/40 border border-border/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="w-4 h-4 text-primary" />
              <span>Modelos de Datos Activos</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {models.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-background border border-border font-mono text-xs text-primary">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-muted/40 border border-border/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span>Eventos del Catálogo</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {events.length > 0 ? (
                events.map((e) => (
                  <span key={e} className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] text-muted-foreground">
                    {e}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Eventos generales del cimiento</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/voz"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
          >
            Panel General
          </Link>
          <Link
            to="/voz/llamadas"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ver Registro de Llamadas
          </Link>
        </div>
      </div>
    </div>
  );
};
