import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Home as HomeIcon,
  Megaphone,
  MessageSquare,
  TrendingUp,
  Users,
  Target,
  PhoneCall,
  LayoutGrid,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface UnderConstructionProps {
  title: string;
  stage: string;
  substageName: string;
  icon: React.ElementType;
  description: string;
  capabilities: string[];
}

export const UnderConstructionCard: React.FC<UnderConstructionProps> = ({
  title,
  stage,
  substageName,
  icon: Icon,
  description,
  capabilities,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Clock className="w-3.5 h-3.5" />
          {stage} · {substageName}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Cimiento 15.1 Listo
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Cimientos List */}
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Cimiento preparado en Etapa 15.1:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-medium text-foreground"
              >
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            Estado: Esquema, Permisos, Eventos y Rutas integrados
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PÁGINAS DE CADA SUB-ETAPA
// ============================================================================

export const HomePage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Home Personal y Tablero de Control"
      stage="Etapa 15.2"
      substageName="Home y Widgets"
      icon={HomeIcon}
      description="Espacio de trabajo unificado con saludo personalizado, disposición dinámica de widgets, accesos directos fijados y métricas clave del día."
      capabilities={[
        'Modelos DashboardLayout y UserHomePreference activos',
        'Soporte de densidad cómoda y compacta',
        'Permiso de personalización home:customize',
        'Redirección post-login por defecto configurada en /',
      ]}
    />
  );
};

export const AnunciosPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Tablero de Anuncios y Comunicaciones"
      stage="Etapa 15.4"
      substageName="Tablero de Anuncios"
      icon={Megaphone}
      description="Publicación de directivas, comunicados oficiales, reconocimientos y políticas con acuse de recibo y lectura obligatoria."
      capabilities={[
        'Modelos Announcement, Audience, Receipt y Comments en Prisma',
        'Permisos announcement:read, create, publish, manage',
        'Eventos anuncio.publicado, leido, confirmado en catálogo',
        'Cron jobs announcements:publish y remind programados',
      ]}
    />
  );
};

export const AnuncioNuevoPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Redactar Nuevo Anuncio"
      stage="Etapa 15.4"
      substageName="Editor de Anuncios"
      icon={Megaphone}
      description="Creación de borradores, fijación de audiencias (roles, áreas o toda la empresa) y programación de fechas de publicación."
      capabilities={[
        'Esquema con soporte de markdown y adjuntos JsonB',
        'Control de permisos mediante announcement:create',
        'Configuración de confirmación obligatoria (acuses)',
        'Acción de reglas publicar_anuncio tipada',
      ]}
    />
  );
};

export const AnuncioDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <UnderConstructionCard
      title={`Detalle de Anuncio #${id || ''}`}
      stage="Etapa 15.4"
      substageName="Lectura y Confirmación"
      icon={Megaphone}
      description="Visualización completa de la directiva o comunicado, comentarios interactivos, reacciones y botón de confirmación de lectura."
      capabilities={[
        'Prueba legal de recepción con AnnouncementReceipt (IP y timestamp)',
        'Hilos de comentarios y menciones de usuarios',
        'Reacciones con emojis tipadas por usuario',
        'Evento anuncio.confirmado',
      ]}
    />
  );
};

export const AnuncioLecturasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <UnderConstructionCard
      title={`Registro de Lecturas y Acuses — Anuncio #${id || ''}`}
      stage="Etapa 15.4"
      substageName="Auditoría de Acuses"
      icon={Megaphone}
      description="Matriz de cumplimiento de lectura que audita exactamente qué usuarios leyeron, confirmaron o tienen pendiente el acuse del comunicado."
      capabilities={[
        'Tabla AnnouncementReceipt con deliveredAt, seenAt, acknowledgedAt',
        'Cálculo de porcentaje de lectura de la audiencia objetivo',
        'Trabajo programado announcements:remind activo',
        'Alerta de anuncio.sin_confirmar_vencido',
      ]}
    />
  );
};

export const ChatPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Chat Interno y Canales de Equipo"
      stage="Etapa 15.5"
      substageName="Canales y Mensajería"
      icon={MessageSquare}
      description="Mensajería instantánea en tiempo real por canales públicos, privados, directos y canales vinculados a proyectos u órdenes de producción."
      capabilities={[
        'Modelos ChatChannel, ChatMember, ChatMessage y ChatPin',
        'Índice de búsqueda full-text y soporte de hilos',
        'Permisos chat:read, send, manage_channels, export',
        'Eventos chat.canal_creado y chat.mensaje_enviado',
      ]}
    />
  );
};

export const ChatChannelPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  return (
    <UnderConstructionCard
      title={`Canal de Chat: ${channelId || ''}`}
      stage="Etapa 15.5"
      substageName="Conversación de Canal"
      icon={MessageSquare}
      description="Hilo en vivo de mensajes, intercambio de archivos adjuntos, respuestas en hilo y reacciones."
      capabilities={[
        'Idempotencia con clientMessageId',
        'Menciones @usuario y evento chat.mencion',
        'Mensajes fijados con ChatPin',
        'Respuestas guardadas rápidas (SavedReply)',
      ]}
    />
  );
};

export const MiRendimientoPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Mi Rendimiento y Cumplimiento de Tareas"
      stage="Etapa 15.3"
      substageName="Analítica Individual"
      icon={TrendingUp}
      description="Panel personal de métricas: tareas completadas a tiempo, días de retraso promedio, porcentaje de cumplimiento y metas asignadas."
      capabilities={[
        'Modelo TaskComplianceDaily poblado automáticamente',
        'Permiso performance:read_own',
        'Cálculo diario a las 4:30 AM (cron performance:task-compliance)',
        'Eventos de metas y cumplimiento en riesgo',
      ]}
    />
  );
};

export const EquipoRendimientoPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Rendimiento del Equipo y Utilización"
      stage="Etapa 15.3"
      substageName="Capacidad y Productividad de Área"
      icon={Users}
      description="Vista para supervisores y gerencia con horas disponibles, horas registradas, utilización de máquinas y ausencias justificadas."
      capabilities={[
        'Modelos CapacityDaily y EmployeeAbsence integrados',
        'Permiso performance:read_team y performance:read_all',
        'Cron performance:capacity diario a las 4:45 AM',
        'Detección automática de capacidad.subutilizada o sobrecargada',
      ]}
    />
  );
};

export const MetasPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Objetivos y Metas Estratégicas"
      stage="Etapa 15.3"
      substageName="Gestión de Metas"
      icon={Target}
      description="Definición y seguimiento de metas por organización, área, usuario o máquina con indicador de ritmo (paceStatus: Ahead, On Track, Behind)."
      capabilities={[
        'Modelos Goal y GoalProgress en Prisma con histórico',
        'Permisos goal:read y goal:manage',
        'Cron goals:rollup ejecutado cada hora',
        'Eventos meta.definida, actualizada, en_riesgo y cumplida',
      ]}
    />
  );
};

export const AdminHomeLayoutPage: React.FC = () => {
  return (
    <UnderConstructionCard
      title="Plantillas de Home por Rol"
      stage="Etapa 15.2"
      substageName="Disposición de Rol Predeterminada"
      icon={LayoutGrid}
      description="Configuración y diseño visual de los tableros predeterminados que verán los usuarios según su rol (comercial, producción, planta, gerencia)."
      capabilities={[
        'Modelo DashboardLayout con scope=ROLE',
        'Permiso home:manage_role_layouts',
        'Disposición serializada en JSONB con tamaños de widget',
        'Herencia: el layout de usuario sobrescribe la plantilla de rol',
      ]}
    />
  );
};

export const LlamadaRoomPage: React.FC = () => {
  const { roomName } = useParams<{ roomName: string }>();
  return (
    <UnderConstructionCard
      title={`Sala de Videollamada: ${roomName || ''}`}
      stage="Etapa 15.6"
      substageName="Salas de Conferencia"
      icon={PhoneCall}
      description="Sala WebRTC integrada con audio/video, compartición de pantalla, resumen automático y vinculación con tareas y proyectos."
      capabilities={[
        'Modelos CallSession, CallParticipant y CallInvitation',
        'Permisos call:start, call:join y call:record',
        'Eventos llamada.iniciada, contestada, finalizada y grabada',
        'Cron calls:cleanup cada 10 minutos',
      ]}
    />
  );
};
