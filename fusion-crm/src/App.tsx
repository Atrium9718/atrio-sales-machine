import ChatWidget from './components/ChatWidget';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { CallPanel } from './components/CallPanel';
import { AnimatePresence } from 'framer-motion';
import { NewOpportunityModal } from './components/NewOpportunityModal';
import { Link2, Network, Beaker, LayoutDashboard, MessageCircle, Plus, Users, TrendingUp, Calendar, FileText, Menu, X, Play, Package, Activity, DollarSign, Settings, Shield, ShieldAlert, FileCheck, Building, Database, Hash, Target, KeyRound, Blocks, DatabaseBackup, Wrench, Send, History , Bot, Home as HomeIcon, Megaphone, MessageSquare, PhoneCall, Sparkles, Calculator } from 'lucide-react';

import { HomePage } from './pages/colaboracion/HomePage';
import { AdminHomeLayoutPage } from './pages/colaboracion/AdminHomeLayoutPage';
import { AnunciosPage } from './pages/colaboracion/AnunciosPage';
import { AnuncioNuevoPage } from './pages/colaboracion/AnuncioNuevoPage';
import { AnuncioDetallePage } from './pages/colaboracion/AnuncioDetallePage';
import { AnuncioLecturasPage } from './pages/colaboracion/AnuncioLecturasPage';
import { ChatPage } from './pages/colaboracion/ChatPage';
import { LlamadaRoomPage } from './pages/colaboracion/LlamadaRoomPage';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { useGlobalCalls } from './hooks/useGlobalCalls';
import { MiRendimientoPage } from './pages/colaboracion/MiRendimientoPage';
import { EquipoRendimientoPage } from './pages/colaboracion/EquipoRendimientoPage';
import { MetasPage } from './pages/colaboracion/MetasPage';
import { getPostLoginRedirect } from './lib/authRedirect';
import { can, FusionModuleKey } from '../packages/core/src/auth/permissions';
import { useVoiceStatus } from './hooks/useVoiceStatus';
import { FusionAuthProvider, useFusionAuth } from './context/FusionAuthContext';
import { UserPersonaSwitcher, ImpersonationBanner } from './components/auth/UserPersonaSwitcher';

import { VozDashboardPage } from './pages/voz/VozDashboardPage';
import { VozLlamadasPage } from './pages/voz/VozLlamadasPage';
import { VozLlamadaDetallePage } from './pages/voz/VozLlamadaDetallePage';
import { VozColasPage } from './pages/voz/VozColasPage';
import { VozBuzonPage } from './pages/voz/VozBuzonPage';
import { VozIvrPage } from './pages/voz/VozIvrPage';
import { VozIvrEditorPage } from './pages/voz/VozIvrEditorPage';
import { VozLocucionesPage } from './pages/voz/VozLocucionesPage';
import { VozAgenteIaPage } from './pages/voz/VozAgenteIaPage';
import { VozCampanasPage } from './pages/voz/VozCampanasPage';
import { VozSupervisionPage } from './pages/voz/VozSupervisionPage';
import { VozInformesPage } from './pages/voz/VozInformesPage';
import { VozConfiguracionPage } from './pages/voz/VozConfiguracionPage';

import { SoftphoneProvider } from '../apps/web/src/features/voice/sip/SoftphoneContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { RealtimeSyncProvider } from './providers/RealtimeSyncProvider';
import {
  VoiceBar,
  VoiceIncomingCallModal,
  VoiceActiveCallPanel,
  VoiceDialerModal,
  VoiceDeviceSettingsModal,
  VoiceVoicemailDrawer,
  VoiceMobileConfigModal,
} from '../apps/web/src/features/voice/components';

import WebchatConfigPage from './app/(dashboard)/dashboard/canales-config/chat-web/page';
import SimulatorPage from './app/(dashboard)/dashboard/simulator/page';

const IdentidadesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/identidades/page'));
const TarifarioProduccionPage = React.lazy(() => import('../apps/web/src/app/(app)/cotizaciones/tarifario/page'));
const ClientesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/page'));
const ClientesImportarPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/importar/page'));
const ClienteProfilePage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/[id]/page'));
const OportunidadesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/oportunidades/page'));
const CotizacionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/cotizaciones/page.tsx'));
const CatalogoPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/catalogo/page'));
const VeaPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/vea/page'));
const AgendaComercialPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/comercial/agenda/page'));
const ComercialDashboardPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/comercial/page"));
const PrecotizacionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/comercial/precotizaciones/page'));
const ClientPortalPage = React.lazy(() => import('../apps/web/src/app/portal/[token]/page'));
const PortalClientesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/portal-clientes/page'));
const KioskPage = React.lazy(() => import('../apps/web/src/app/kiosko/page'));
const CostosOmnicanalPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/costos-omnicanal/page'));

const OrganizacionPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/organizacion/page'));
const ComercialParamsPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/comercial/page'));
const MaestrosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/maestros/page'));
const CalendarioPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/calendario/page'));
const NumeracionPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/numeracion/page'));

const SecretosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/secretos/page'));
const IntegracionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/integraciones/page'));
const SaludPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/salud/page'));
const RespaldosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/respaldos/page'));
const OutboxPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/outbox/page'));
const MantenimientoPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/mantenimiento/page'));

const PlantillasPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/admin/plantillas/page"));
const SemanticaPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/admin/semantica/page"));
const ContextoPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/admin/contexto/page"));
const MejoraContinuaPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/admin/ia/mejora/page"));

const UsuariosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/usuarios/page'));
const RolesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/roles/page'));
const SeguridadPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/seguridad/page'));
const RevisionAccesosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/revision-accesos/page'));

const ParametrosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/parametros/page'));
const FlagsPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/flags/page'));
const AuditoriaConfigPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/auditoria/page'));

const VoiceDashboardPage = React.lazy(() => import('./app/(dashboard)/dashboard/voice/page'));
import { Phone } from 'lucide-react';
const MetaConfigPage = React.lazy(() => import('./app/(dashboard)/dashboard/canales-config/meta/page'));

const ComplianceDashboard = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/compliance/page'));
const PreferenciasPage = React.lazy(() => import('../apps/web/src/app/preferencias/[token]/page'));
const HabeasDataPage = React.lazy(() => import('../apps/web/src/app/habeas-data/page'));

const InboxPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/inbox/page'));
const ProduccionKanbanPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/produccion/page"));
const CapacidadAgentePage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/produccion/capacidad/page"));
const RentabilidadRealPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/produccion/costos/page'));
const InventarioDashboardPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/inventario/page'));
const AbastecimientoAgentePage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/inventario/abastecimiento/page'));
const AgentesDashboardPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/agentes/page'));
const AdminIAPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/admin/ia/page'));
const PropuestasAgentesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/agentes/propuestas/page'));

const ArquitecturaIAPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/ia/arquitectura/page'));
const IATestingPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/ia/testing/page'));
const KioskoPlantaPage = React.lazy(() => import('../apps/web/src/app/kiosko-planta/page'));
import { InterventoriaPage } from './pages/admin/InterventoriaPage';
import { InterventorFloatingButton } from './components/interventoria/InterventorFloatingButton';
import { ClientRequestToasts, useNewClientRequestsCount } from './components/portal/ClientRequestAlerts';

function useCompanyIdentity() {
  const [identity, setIdentity] = React.useState<{ name: string; logoUrl?: string }>({
    name: 'Fusion CRM',
    logoUrl: ''
  });

  React.useEffect(() => {
    const loadIdentity = () => {
      try {
        const cached = localStorage.getItem('fusion_org_identity');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.logoUrl || parsed.name) {
            setIdentity({ name: parsed.name || 'Fusion CRM', logoUrl: parsed.logoUrl || '' });
          }
        }
      } catch (e) {}

      fetch('/api/settings/identity')
        .then(r => r.json())
        .then(data => {
          if (data && (data.name || data.logoUrl)) {
            setIdentity({ name: data.name || 'Fusion CRM', logoUrl: data.logoUrl || '' });
            localStorage.setItem('fusion_org_identity', JSON.stringify(data));
          }
        })
        .catch(() => {});
    };

    loadIdentity();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setIdentity({ name: e.detail.name || 'Fusion CRM', logoUrl: e.detail.logoUrl || '' });
      }
    };
    window.addEventListener('fusion_identity_updated', handleUpdate);
    return () => window.removeEventListener('fusion_identity_updated', handleUpdate);
  }, []);

  return identity;
}

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const location = useLocation();
  const identity = useCompanyIdentity();

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    'Equipo': true,
    'Comercial y CRM': true,
    'Producción e Inventario': true,
    'Comunicaciones': true,
    'Voz y Telefonía': true,
    'Configuración': true,
    'Administración de Agentes': true,
    'Auditoría y Seguridad': false,
    'IA y Sistemática': true,
    'Sistema y Operaciones': false,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const voiceStatus = useVoiceStatus();
  const { canSeeModule, isSuperAdmin } = useFusionAuth();
  const newClientRequests = useNewClientRequestsCount(canSeeModule('comercial'));
  const itemBadges: Record<string, number> = { '/dashboard/portal-clientes': newClientRequests };
  const permissions = isSuperAdmin ? ['*'] : ((window as any).__FUSION_USER_PERMISSIONS__ || ['*']);
  const hasVoiceUse = isSuperAdmin || can(permissions, 'voice:use');
  const canSupervise = isSuperAdmin || can(permissions, 'voice:supervise');
  const canManageVoice = isSuperAdmin || can(permissions, 'voice:manage_all');

  const navGroups: Array<{
    title: string;
    moduleKey: FusionModuleKey;
    isOpen: boolean;
    setIsOpen: () => void;
    items: Array<{ name: string; path: string; icon: any; permission?: string; sensitiveModuleKey?: FusionModuleKey; isSuperAdminExclusive?: boolean }>;
  }> = [
    {
      title: 'Equipo',
      moduleKey: 'equipo',
      isOpen: openGroups['Equipo'],
      setIsOpen: () => toggleGroup('Equipo'),
      items: [
        { name: 'Home', path: '/', icon: HomeIcon, permission: 'home:read' },
        { name: 'Anuncios', path: '/anuncios', icon: Megaphone, permission: 'announcement:read' },
        { name: 'Chat', path: '/chat', icon: MessageSquare, permission: 'chat:read' },
        { name: 'Mi rendimiento', path: '/mi-rendimiento', icon: TrendingUp, permission: 'performance:read_own' },
        { name: 'Rendimiento del equipo', path: '/equipo/rendimiento', icon: Users, permission: 'performance:read_team' },
        { name: 'Metas y Objetivos', path: '/metas', icon: Target, permission: 'goal:read' },
      ]
    },
    {
      title: 'Comercial y CRM',
      moduleKey: 'comercial',
      isOpen: openGroups['Comercial y CRM'],
      setIsOpen: () => toggleGroup('Comercial y CRM'),
      items: [
        { name: 'Dashboard Comercial', path: '/dashboard/comercial/dashboard', icon: LayoutDashboard },
        { name: 'Precotizaciones IA', path: '/dashboard/comercial/precotizaciones', icon: Sparkles },
        { name: 'Agenda', path: '/dashboard/comercial/agenda', icon: Calendar },
        { name: 'Identidades (Triage)', path: '/dashboard/identidades', icon: Users },
        { name: 'Clientes', path: '/dashboard/clientes', icon: Users },
        { name: 'Portal de clientes', path: '/dashboard/portal-clientes', icon: Link2 },
        { name: 'Pipeline y Oportunidades', path: '/dashboard/oportunidades', icon: TrendingUp },
        { name: 'Cotizador', path: '/dashboard/cotizador', icon: FileText },
        { name: 'Cotizaciones Históricas', path: '/dashboard/comercial/cotizaciones', icon: FileText },
        { name: 'Tarifario', path: '/cotizaciones/tarifario', icon: Calculator, permission: 'tariff:read' },
      ]
    },
    ...(hasVoiceUse && (voiceStatus.enabled || isSuperAdmin) ? [
      {
        title: 'Voz y Telefonía',
        moduleKey: 'voz' as FusionModuleKey,
        isOpen: openGroups['Voz y Telefonía'] ?? true,
        setIsOpen: () => toggleGroup('Voz y Telefonía'),
        items: [
          { name: 'Panel de Voz', path: '/voz', icon: Phone, permission: 'voice:use' },
          { name: 'Historial de Llamadas', path: '/voz/llamadas', icon: PhoneCall, permission: 'voice:use' },
          { name: 'Colas y Agentes', path: '/voz/colas', icon: Users, permission: 'voice:use' },
          { name: 'Buzón de Voz', path: '/voz/buzon', icon: MessageSquare, permission: 'voice:use' },
          { name: 'Flujos de IVR', path: '/voz/ivr', icon: Network, permission: 'voice:use' },
          { name: 'Biblioteca de Locuciones', path: '/voz/locuciones', icon: FileText, permission: 'voice:use' },
          { name: 'Agente de IA', path: '/voz/agente-ia', icon: Bot, permission: 'voice:use' },
          { name: 'Campañas Salientes', path: '/voz/campanas', icon: Megaphone, permission: 'voice:use' },
          ...(canSupervise ? [{ name: 'Supervisión en Vivo', path: '/voz/supervision', icon: Activity, permission: 'voice:supervise' }] : []),
          { name: 'Informes de Voz', path: '/voz/informes', icon: TrendingUp, permission: 'voice:use' },
        ]
      }
    ] : []),
    {
      title: 'Producción e Inventario',
      moduleKey: 'produccion',
      isOpen: openGroups['Producción e Inventario'],
      setIsOpen: () => toggleGroup('Producción e Inventario'),
      items: [
        { name: 'Dashboard de Producción', path: '/dashboard/produccion', icon: Play },
        { name: 'Rentabilidad y Costos', path: '/dashboard/produccion/costos', icon: DollarSign, sensitiveModuleKey: 'costos' },
        { name: 'Inventario', path: '/dashboard/inventario', icon: Package },
        { name: 'Catálogo de Productos', path: '/dashboard/catalogo', icon: Package },
        { name: 'Ritual V.E.A.', path: '/dashboard/vea', icon: Calendar },
      ]
    },
    {
      title: 'Comunicaciones',
      moduleKey: 'comunicaciones',
      isOpen: openGroups['Comunicaciones'],
      setIsOpen: () => toggleGroup('Comunicaciones'),
      items: [
        { name: 'Bandeja de Entrada', path: '/dashboard/inbox', icon: MessageCircle },
        { name: 'Salud de Canales', path: '/dashboard/canales-config/meta', icon: Activity },
        { name: 'Control de Costos', path: '/dashboard/costos-omnicanal', icon: DollarSign, sensitiveModuleKey: 'costos' },
        { name: 'Simulador', path: '/dashboard/simulator', icon: Settings },
      ]
    },
    {
      title: 'Configuración',
      moduleKey: 'configuracion',
      isOpen: openGroups['Configuración'],
      setIsOpen: () => toggleGroup('Configuración'),
      items: [
        { name: 'Identidad de Empresa', path: '/dashboard/admin/organizacion', icon: Building },
        ...(canManageVoice ? [{ name: 'Telefonía y Troncales', path: '/configuracion/voz', icon: PhoneCall, permission: 'voice:manage_all' }] : []),
        { name: 'Temperatura y Algoritmo', path: '/dashboard/admin/comercial', icon: Target },
        { name: 'Parámetros Globales', path: '/dashboard/admin/parametros', icon: Settings },
        { name: 'Maestros y Catálogos', path: '/dashboard/admin/maestros', icon: Database },
        { name: 'Numeración', path: '/dashboard/admin/numeracion', icon: Hash },
        { name: 'Calendario Laboral', path: '/dashboard/admin/calendario', icon: Calendar },
        { name: 'Plantillas', path: '/dashboard/admin/plantillas', icon: FileText },
      ]
    },
    {
      title: 'Auditoría y Seguridad',
      moduleKey: 'auditoria',
      isOpen: openGroups['Auditoría y Seguridad'],
      setIsOpen: () => toggleGroup('Auditoría y Seguridad'),
      items: [
        ...(isSuperAdmin ? [
          { name: 'Interventor del Sistema', path: '/dashboard/admin/interventoria', icon: Bot, isSuperAdminExclusive: true }
        ] : []),
        { name: 'Gestión de Empleados', path: '/dashboard/admin/usuarios', icon: Users },
        { name: 'Roles y Permisos', path: '/dashboard/admin/roles', icon: Shield },
        { name: 'Política de Seguridad', path: '/dashboard/admin/seguridad', icon: ShieldAlert },
        { name: 'Revisión de Accesos', path: '/dashboard/admin/revision-accesos', icon: FileCheck },
        { name: 'Cumplimiento', path: '/dashboard/compliance', icon: Shield },
        { name: 'Registro de Actividad', path: '/dashboard/admin/auditoria', icon: History },
      ]
    },
    {
      title: 'IA y Sistemática',
      moduleKey: 'ia',
      isOpen: openGroups['IA y Sistemática'],
      setIsOpen: () => toggleGroup('IA y Sistemática'),
      items: [
        { name: 'Arquitectura de Agentes', path: '/dashboard/ia/arquitectura', icon: Network },
        { name: 'Laboratorio de Pruebas', path: '/dashboard/ia/testing', icon: Beaker },
        { name: 'Diccionario Semántico', path: '/dashboard/admin/semantica', icon: FileText },
        { name: 'Fuentes de Contexto', path: '/dashboard/admin/contexto', icon: Database },
        { name: 'Mejora Continua', path: '/dashboard/admin/ia/mejora', icon: Activity },
        { name: 'Panel de Agentes', path: '/dashboard/agentes', icon: Bot },
        { name: 'Agente de Capacidad', path: '/dashboard/produccion/capacidad', icon: Bot },
        { name: 'Agente de Abastecimiento', path: '/dashboard/inventario/abastecimiento', icon: Bot },
      ]
    },
    {
      title: 'Sistema y Operaciones',
      moduleKey: 'sistema',
      isOpen: openGroups['Sistema y Operaciones'],
      setIsOpen: () => toggleGroup('Sistema y Operaciones'),
      items: [
        { name: 'Bóveda de Secretos', path: '/dashboard/admin/secretos', icon: KeyRound },
        { name: 'Integraciones', path: '/dashboard/admin/integraciones', icon: Blocks },
        { name: 'Eventos y Outbox', path: '/dashboard/admin/outbox', icon: Send },
        { name: 'Salud del Sistema', path: '/dashboard/admin/salud', icon: Activity },
        { name: 'Respaldos', path: '/dashboard/admin/respaldos', icon: DatabaseBackup },
        { name: 'Mantenimiento', path: '/dashboard/admin/mantenimiento', icon: Wrench },
      ]
    }
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          {identity.logoUrl ? (
            <div className="flex items-center gap-2 max-w-[190px] overflow-hidden">
              <img 
                src={identity.logoUrl} 
                alt={identity.name} 
                className="max-h-9 max-w-[170px] object-contain" 
              />
            </div>
          ) : (
            <div className="font-bold text-lg text-primary flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-xs font-bold">
                {identity.name ? identity.name.charAt(0).toUpperCase() : 'F'}
              </div>
              <span className="truncate">{identity.name || 'Fusion CRM'}</span>
            </div>
          )}
          <button onClick={() => setIsOpen(false)} className="md:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {navGroups
            .filter(group => isSuperAdmin || canSeeModule(group.moduleKey))
            .map((group, groupIdx) => {
              const visibleItems = group.items.filter((item: any) => {
                if (isSuperAdmin) return true;
                const passesPermission = !item.permission || can(permissions, item.permission);
                const passesSensitiveModule = !item.sensitiveModuleKey || canSeeModule(item.sensitiveModuleKey);
                return passesPermission && passesSensitiveModule;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={groupIdx}>
                  <button 
                    className="w-full flex items-center justify-between px-3 py-1 mb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    onClick={() => group.setIsOpen()}
                  >
                    {group.title}
                  </button>
                  
                  {group.isOpen && (
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const isGold = (item as any).isSuperAdminExclusive;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              isGold
                                ? isActive
                                  ? 'bg-amber-500/25 text-amber-700 font-bold border border-amber-500/40'
                                  : 'text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20'
                                : isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <item.icon className={`w-4 h-4 shrink-0 ${isGold ? 'text-amber-600' : ''}`} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            {isGold && (
                              <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-amber-950 rounded shadow-xs shrink-0">
                                SUPER
                              </span>
                            )}
                            {itemBadges[item.path] > 0 && (
                              <span
                                className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0"
                                aria-label={`${itemBadges[item.path]} nuevas`}
                              >
                                {itemBadges[item.path] > 99 ? '99+' : itemBadges[item.path]}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
          })}
        </nav>
      </aside>
    </>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useFusionAuth();
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [isDialerOpen, setIsDialerOpen] = React.useState(false);
  const [isVoicemailOpen, setIsVoicemailOpen] = React.useState(false);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = React.useState(false);
  const [isMobileConfigOpen, setIsMobileConfigOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsNewModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const identity = useCompanyIdentity();

  const mobileTabs = [
    { name: 'Inicio', path: '/dashboard', icon: HomeIcon },
    { name: 'Tareas', path: '/dashboard/comercial/agenda', icon: Calendar },
    { name: 'Anuncios', path: '/dashboard/anuncios', icon: Megaphone },
    { name: 'Chat', path: '/dashboard/chat', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* SIMULADOR DE ACCESOS Y PERSONA BANNER */}
        <ImpersonationBanner />

        {/* TOP HEADER BAR (Mobile & Desktop) */}
        <header className="h-14 border-b border-border bg-card/90 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-muted-foreground hover:text-foreground md:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              {identity.logoUrl ? (
                <img 
                  src={identity.logoUrl} 
                  alt={identity.name} 
                  className="max-h-8 max-w-[140px] object-contain" 
                />
              ) : (
                <div className="font-bold text-primary truncate text-sm">{identity.name || 'Fusion CRM'}</div>
              )}
            </div>
          </div>

          {/* Persona Switcher y Barra de Voz (VoiceBar - Etapa 17.4) */}
          <div className="flex items-center gap-2.5">
            <UserPersonaSwitcher />
            <VoiceBar
              onOpenDialer={() => setIsDialerOpen(true)}
              onOpenVoicemail={() => setIsVoicemailOpen(true)}
              onOpenDeviceSettings={() => setIsDeviceSettingsOpen(true)}
              onOpenMobileConfig={() => setIsMobileConfigOpen(true)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
        
        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40">
          {mobileTabs.map((t) => {
            const isActive = location.pathname === t.path || (t.path !== '/dashboard' && location.pathname.startsWith(t.path));
            const Icon = t.icon;
            return (
              <Link key={t.name} to={t.path} className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{t.name}</span>
              </Link>
            );
          })}
        </div>

        {/* FLOATING ACTION BUTTONS GLOBALLY (EXCLUSIVOS PARA SUPER ADMIN) */}
        {isSuperAdmin && (
          <>
            <button 
              onClick={() => setIsNewModalOpen(true)}
              className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-40 focus:outline-none focus:ring-4 focus:ring-primary/30 group"
              title="Nueva Oportunidad (Atajo: N)"
            >
              <Plus className="w-6 h-6" />
              <span className="absolute right-full mr-4 bg-foreground text-background text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block">
                Nueva Oportunidad (N)
              </span>
            </button>
            <ChatWidget />
            <InterventorFloatingButton />
            <ClientRequestToasts />
          </>
        )}

        {/* Modales y Paneles de Telefonía (Etapa 17.4) */}
        <VoiceIncomingCallModal />
        <VoiceActiveCallPanel />
        <VoiceDialerModal isOpen={isDialerOpen} onClose={() => setIsDialerOpen(false)} />
        <VoiceDeviceSettingsModal isOpen={isDeviceSettingsOpen} onClose={() => setIsDeviceSettingsOpen(false)} />
        <VoiceVoicemailDrawer isOpen={isVoicemailOpen} onClose={() => setIsVoicemailOpen(false)} />
        <VoiceMobileConfigModal isOpen={isMobileConfigOpen} onClose={() => setIsMobileConfigOpen(false)} />

        <AnimatePresence>
          {isNewModalOpen && (
            <NewOpportunityModal onClose={() => setIsNewModalOpen(false)} onSave={() => { /* emit global event or mutate global state */ setIsNewModalOpen(false); }} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function RootIndexRoute() {
  const destination = getPostLoginRedirect();
  if (destination !== '/') {
    return <Navigate to={destination} replace />;
  }
  return <HomePage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FusionAuthProvider>
        <RealtimeSyncProvider>
          <SoftphoneProvider>
            <BrowserRouter>
          <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-background text-primary font-bold">Cargando Sistema Fusion...</div>}>
            <Routes>
            {/* Public Routes outside dashboard layout */}
            <Route path="/portal/:token" element={<ClientPortalPage />} />
            <Route path="/kiosko" element={<KioskPage />} />
            <Route path="/kiosko-planta" element={<KioskoPlantaPage />} />
            <Route path="/preferencias/:token" element={<PreferenciasPage />} />
            <Route path="/habeas-data" element={<HabeasDataPage />} />
            <Route path="/empleados" element={<DashboardLayout><UsuariosPage /></DashboardLayout>} />
          
          {/* Rutas Principales de Equipo y Colaboración (Etapa 15.1) */}
          <Route path="/" element={<DashboardLayout><RootIndexRoute /></DashboardLayout>} />
          <Route path="/anuncios" element={<DashboardLayout><AnunciosPage /></DashboardLayout>} />
          <Route path="/anuncios/nuevo" element={<DashboardLayout><AnuncioNuevoPage /></DashboardLayout>} />
          <Route path="/anuncios/:id" element={<DashboardLayout><AnuncioDetallePage /></DashboardLayout>} />
          <Route path="/anuncios/:id/lecturas" element={<DashboardLayout><AnuncioLecturasPage /></DashboardLayout>} />
          <Route path="/chat" element={<DashboardLayout><ChatPage /></DashboardLayout>} />
          <Route path="/chat/:channelId" element={<DashboardLayout><ChatPage /></DashboardLayout>} />
          <Route path="/mi-rendimiento" element={<DashboardLayout><MiRendimientoPage /></DashboardLayout>} />
          <Route path="/equipo/rendimiento" element={<DashboardLayout><EquipoRendimientoPage /></DashboardLayout>} />
          <Route path="/metas" element={<DashboardLayout><MetasPage /></DashboardLayout>} />
          <Route path="/admin/home" element={<DashboardLayout><AdminHomeLayoutPage /></DashboardLayout>} />
          <Route path="/llamada/:roomName" element={<DashboardLayout><LlamadaRoomPage /></DashboardLayout>} />

          {/* Rutas directas de Comercial y Tarifario */}
          <Route path="/comercial" element={<DashboardLayout><ComercialDashboardPage /></DashboardLayout>} />
          <Route path="/comercial/dashboard" element={<DashboardLayout><ComercialDashboardPage /></DashboardLayout>} />
          <Route path="/comercial/precotizaciones" element={<DashboardLayout><PrecotizacionesPage /></DashboardLayout>} />
          <Route path="/comercial/agenda" element={<DashboardLayout><AgendaComercialPage /></DashboardLayout>} />
          <Route path="/comercial/cotizaciones" element={<DashboardLayout><CotizacionesPage defaultTab="history" /></DashboardLayout>} />
          <Route path="/cotizaciones/tarifario" element={<DashboardLayout><TarifarioProduccionPage /></DashboardLayout>} />
          <Route path="/tarifario" element={<DashboardLayout><TarifarioProduccionPage /></DashboardLayout>} />

          {/* Rutas directas de Administración, Roles y Usuarios */}
          <Route path="/roles" element={<DashboardLayout><RolesPage /></DashboardLayout>} />
          <Route path="/admin/roles" element={<DashboardLayout><RolesPage /></DashboardLayout>} />
          <Route path="/admin/usuarios" element={<DashboardLayout><UsuariosPage /></DashboardLayout>} />

          {/* Rutas de Telefonía y Voz (Etapa 17.1) */}
          <Route path="/voz" element={<DashboardLayout><VozDashboardPage /></DashboardLayout>} />
          <Route path="/voz/llamadas" element={<DashboardLayout><VozLlamadasPage /></DashboardLayout>} />
          <Route path="/voz/llamadas/:id" element={<DashboardLayout><VozLlamadaDetallePage /></DashboardLayout>} />
          <Route path="/voz/colas" element={<DashboardLayout><VozColasPage /></DashboardLayout>} />
          <Route path="/voz/buzon" element={<DashboardLayout><VozBuzonPage /></DashboardLayout>} />
          <Route path="/voz/ivr" element={<DashboardLayout><VozIvrPage /></DashboardLayout>} />
          <Route path="/voz/ivr/:id" element={<DashboardLayout><VozIvrEditorPage /></DashboardLayout>} />
          <Route path="/voz/locuciones" element={<DashboardLayout><VozLocucionesPage /></DashboardLayout>} />
          <Route path="/voz/agente-ia" element={<DashboardLayout><VozAgenteIaPage /></DashboardLayout>} />
          <Route path="/voz/campanas" element={<DashboardLayout><VozCampanasPage /></DashboardLayout>} />
          <Route path="/voz/supervision" element={<DashboardLayout><VozSupervisionPage /></DashboardLayout>} />
          <Route path="/voz/informes" element={<DashboardLayout><VozInformesPage /></DashboardLayout>} />
          <Route path="/configuracion/voz" element={<DashboardLayout><VozConfiguracionPage /></DashboardLayout>} />
          <Route path="/interventoria" element={<DashboardLayout><InterventoriaPage /></DashboardLayout>} />
          
          <Route
            path="/dashboard/*"
            element={
              <DashboardLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">Cargando sección...</div>}>
                  <Routes>
                    {/* Rutas de Voz como sub-rutas */}
                    <Route path="voz" element={<VozDashboardPage />} />
                    <Route path="voz/llamadas" element={<VozLlamadasPage />} />
                    <Route path="voz/llamadas/:id" element={<VozLlamadaDetallePage />} />
                    <Route path="voz/colas" element={<VozColasPage />} />
                    <Route path="voz/buzon" element={<VozBuzonPage />} />
                    <Route path="voz/ivr" element={<VozIvrPage />} />
                    <Route path="voz/ivr/:id" element={<VozIvrEditorPage />} />
                    <Route path="voz/locuciones" element={<VozLocucionesPage />} />
                    <Route path="voz/agente-ia" element={<VozAgenteIaPage />} />
                    <Route path="voz/campanas" element={<VozCampanasPage />} />
                    <Route path="voz/supervision" element={<VozSupervisionPage />} />
                    <Route path="voz/informes" element={<VozInformesPage />} />
                    <Route path="configuracion/voz" element={<VozConfiguracionPage />} />
                    {/* Rutas de colaboración como sub-rutas para retrocompatibilidad */}
                    <Route path="anuncios" element={<AnunciosPage />} />
                    <Route path="anuncios/nuevo" element={<AnuncioNuevoPage />} />
                    <Route path="anuncios/:id" element={<AnuncioDetallePage />} />
                    <Route path="anuncios/:id/lecturas" element={<AnuncioLecturasPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="chat/:channelId" element={<ChatPage />} />
                    <Route path="mi-rendimiento" element={<MiRendimientoPage />} />
                    <Route path="equipo/rendimiento" element={<EquipoRendimientoPage />} />
                    <Route path="metas" element={<MetasPage />} />
                    <Route path="admin/home" element={<AdminHomeLayoutPage />} />
                    <Route path="llamada/:roomName" element={<LlamadaRoomPage />} />

                    {/* Comercial Group */}
                    <Route path="comercial/dashboard" element={<ComercialDashboardPage />} />
                    <Route path="comercial/precotizaciones" element={<PrecotizacionesPage />} />
                    <Route path="comercial/agenda" element={<AgendaComercialPage />} />
                    <Route path="comercial/cotizaciones" element={<CotizacionesPage defaultTab="history" />} />
                    <Route path="comercial" element={<ComercialDashboardPage />} />
                    
                    {/* Cotizador maps to the existing page */}
                    <Route path="cotizador" element={<CotizacionesPage defaultTab="quote" />} />
                    
                    {/* Other existing routes */}
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="identidades" element={<IdentidadesPage />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="portal-clientes" element={<PortalClientesPage />} />
                    <Route path="clientes/importar" element={<ClientesImportarPage />} />
                    <Route path="clientes/:id" element={<ClienteProfilePage />} />
                    <Route path="oportunidades" element={<OportunidadesPage />} />
                    <Route path="cotizaciones" element={<CotizacionesPage />} />
                    <Route path="cotizaciones/tarifario" element={<TarifarioProduccionPage />} />
                    <Route path="catalogo" element={<CatalogoPage />} />
                    <Route path="vea" element={<VeaPage />} />
                    <Route path="produccion" element={<ProduccionKanbanPage />} />
                    <Route path="produccion/costos" element={<RentabilidadRealPage />} />
                    <Route path="produccion/capacidad" element={<CapacidadAgentePage />} />
                    <Route path="costos-omnicanal" element={<CostosOmnicanalPage />} />
                    <Route path="inventario" element={<InventarioDashboardPage />} />
                    <Route path="inventario/abastecimiento" element={<AbastecimientoAgentePage />} />
                    <Route path="ia/arquitectura" element={<ArquitecturaIAPage />} />
                    <Route path="ia/testing" element={<IATestingPage />} />
                    <Route path="agentes" element={<AgentesDashboardPage />} />
                    <Route path="admin/ia" element={<AdminIAPage />} />
                    <Route path="agentes/propuestas" element={<PropuestasAgentesPage />} />
                    <Route path="compliance" element={<ComplianceDashboard />} />
                    <Route path="canales-config/chat-web" element={<WebchatConfigPage />} />
                    <Route path="canales-config/meta" element={<MetaConfigPage />} />
                    <Route path="simulator" element={<SimulatorPage />} />
                    
                    <Route path="admin/organizacion" element={<OrganizacionPage />} />
                    <Route path="admin/maestros" element={<MaestrosPage />} />
                    <Route path="admin/numeracion" element={<NumeracionPage />} />
                    <Route path="admin/calendario" element={<CalendarioPage />} />
                    <Route path="admin/plantillas" element={<PlantillasPage />} />
                    <Route path="admin/usuarios" element={<UsuariosPage />} />
                    <Route path="admin/roles" element={<RolesPage />} />
                    <Route path="admin/seguridad" element={<SeguridadPage />} />
                    <Route path="admin/revision-accesos" element={<RevisionAccesosPage />} />
                    <Route path="admin/secretos" element={<SecretosPage />} />
                    <Route path="admin/integraciones" element={<IntegracionesPage />} />
                    <Route path="admin/salud" element={<SaludPage />} />
                    <Route path="admin/respaldos" element={<RespaldosPage />} />
                    <Route path="admin/outbox" element={<OutboxPage />} />
                    <Route path="admin/mantenimiento" element={<MantenimientoPage />} />
                    <Route path="admin/comercial" element={<ComercialParamsPage />} />
                    <Route path="admin/parametros" element={<ParametrosPage />} />
                    <Route path="admin/flags" element={<FlagsPage />} />
                    <Route path="admin/auditoria" element={<AuditoriaConfigPage />} />
                    <Route path="admin/semantica" element={<SemanticaPage />} />
                    <Route path="admin/contexto" element={<ContextoPage />} />
                    <Route path="admin/ia/mejora" element={<MejoraContinuaPage />} />
                    <Route path="admin/interventoria" element={<InterventoriaPage />} />
                  </Routes>
                </React.Suspense>
              </DashboardLayout>
            }
          />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </SoftphoneProvider>
</RealtimeSyncProvider>
</FusionAuthProvider>
</QueryClientProvider>
  );
}
