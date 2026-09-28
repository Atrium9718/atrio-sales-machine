import { QuickActionsDock } from './components/QuickActionsDock';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { NewOpportunityModal } from './components/NewOpportunityModal';
import { Link2, Network, Beaker, LayoutDashboard, MessageCircle, Plus, Users, TrendingUp, Calendar, FileText, Menu, X, Play, Package, Activity, DollarSign, Settings, Shield, ShieldAlert, FileCheck, Building, Database, Hash, Target, KeyRound, Blocks, DatabaseBackup, Wrench, Send, History , Bot, Home as HomeIcon, Megaphone, MessageSquare, PhoneCall, Sparkles, Calculator, Store } from 'lucide-react';

import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { useGlobalCalls } from './hooks/useGlobalCalls';
import { getPostLoginRedirect } from './lib/authRedirect';
import { can, FusionModuleKey } from '../packages/core/src/auth/permissions';
import { useVoiceStatus } from './hooks/useVoiceStatus';
import { FusionAuthProvider, useFusionAuth } from './context/FusionAuthContext';
import { UserPersonaSwitcher, ImpersonationBanner } from './components/auth/UserPersonaSwitcher';


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


// Páginas cargadas bajo demanda: cada módulo se descarga solo cuando se abre.
const HomePage = React.lazy(() => import('./pages/colaboracion/HomePage').then((m) => ({ default: m.HomePage })));
const AdminHomeLayoutPage = React.lazy(() => import('./pages/colaboracion/AdminHomeLayoutPage').then((m) => ({ default: m.AdminHomeLayoutPage })));
const AnunciosPage = React.lazy(() => import('./pages/colaboracion/AnunciosPage').then((m) => ({ default: m.AnunciosPage })));
const AnuncioNuevoPage = React.lazy(() => import('./pages/colaboracion/AnuncioNuevoPage').then((m) => ({ default: m.AnuncioNuevoPage })));
const AnuncioDetallePage = React.lazy(() => import('./pages/colaboracion/AnuncioDetallePage').then((m) => ({ default: m.AnuncioDetallePage })));
const AnuncioLecturasPage = React.lazy(() => import('./pages/colaboracion/AnuncioLecturasPage').then((m) => ({ default: m.AnuncioLecturasPage })));
const ChatPage = React.lazy(() => import('./pages/colaboracion/ChatPage').then((m) => ({ default: m.ChatPage })));
const LlamadaRoomPage = React.lazy(() => import('./pages/colaboracion/LlamadaRoomPage').then((m) => ({ default: m.LlamadaRoomPage })));
const MiRendimientoPage = React.lazy(() => import('./pages/colaboracion/MiRendimientoPage').then((m) => ({ default: m.MiRendimientoPage })));
const EquipoRendimientoPage = React.lazy(() => import('./pages/colaboracion/EquipoRendimientoPage').then((m) => ({ default: m.EquipoRendimientoPage })));
const MetasPage = React.lazy(() => import('./pages/colaboracion/MetasPage').then((m) => ({ default: m.MetasPage })));
const VozDashboardPage = React.lazy(() => import('./pages/voz/VozDashboardPage').then((m) => ({ default: m.VozDashboardPage })));
const VozLlamadasPage = React.lazy(() => import('./pages/voz/VozLlamadasPage').then((m) => ({ default: m.VozLlamadasPage })));
const VozLlamadaDetallePage = React.lazy(() => import('./pages/voz/VozLlamadaDetallePage').then((m) => ({ default: m.VozLlamadaDetallePage })));
const VozColasPage = React.lazy(() => import('./pages/voz/VozColasPage').then((m) => ({ default: m.VozColasPage })));
const VozBuzonPage = React.lazy(() => import('./pages/voz/VozBuzonPage').then((m) => ({ default: m.VozBuzonPage })));
const VozIvrPage = React.lazy(() => import('./pages/voz/VozIvrPage').then((m) => ({ default: m.VozIvrPage })));
const VozIvrEditorPage = React.lazy(() => import('./pages/voz/VozIvrEditorPage').then((m) => ({ default: m.VozIvrEditorPage })));
const VozLocucionesPage = React.lazy(() => import('./pages/voz/VozLocucionesPage').then((m) => ({ default: m.VozLocucionesPage })));
const VozConfiguracionPage = React.lazy(() => import('./pages/voz/VozConfiguracionPage').then((m) => ({ default: m.VozConfiguracionPage })));

const TarifarioProduccionPage = React.lazy(() => import('../apps/web/src/app/(app)/cotizaciones/tarifario/page'));
const ClientesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/page'));
const ClientesImportarPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/importar/page'));
const ClienteProfilePage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/clientes/[id]/page'));
const OportunidadesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/oportunidades/page'));
const CotizacionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/cotizaciones/page.tsx'));
const CatalogoPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/catalogo/page'));
const AgendaComercialPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/comercial/agenda/page'));
const ComercialDashboardPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/comercial/page"));
const PrecotizacionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/comercial/precotizaciones/page'));
const KioskPage = React.lazy(() => import('../apps/web/src/app/kiosko/[token]/page'));
const KioskSettingsPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/kiosko/page'));
const ClientPortalPage = React.lazy(() => import('../apps/web/src/app/portal/[token]/page'));
const PortalClientesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/portal-clientes/page'));
const CostosOmnicanalPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/costos-omnicanal/page'));

const OrganizacionPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/organizacion/page'));
const ComercialParamsPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/comercial/page'));
const MaestrosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/maestros/page'));
const CalendarioPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/calendario/page'));
const NumeracionPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/numeracion/page'));

const IntegracionesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/integraciones/page'));
const SaludPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/salud/page'));
const RespaldosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/respaldos/page'));
const OutboxPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/outbox/page'));
const MantenimientoPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/mantenimiento/page'));

const PlantillasPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/admin/plantillas/page"));

const UsuariosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/usuarios/page'));
const RolesPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/roles/page'));
const SeguridadPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/seguridad/page'));
const RevisionAccesosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/revision-accesos/page'));

const ParametrosPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/parametros/page'));
const FlagsPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/flags/page'));
const AuditoriaConfigPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/admin/auditoria/page'));

import { Phone } from 'lucide-react';
const MetaConfigPage = React.lazy(() => import('./app/(dashboard)/dashboard/canales-config/meta/page'));

const PreferenciasPage = React.lazy(() => import('../apps/web/src/app/preferencias/[token]/page'));
const HabeasDataPage = React.lazy(() => import('../apps/web/src/app/habeas-data/page'));

const InboxPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/inbox/page'));
const ProduccionKanbanPage = React.lazy(() => import("../apps/web/src/app/(dashboard)/dashboard/produccion/page"));
const RentabilidadRealPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/produccion/costos/page'));
const InventarioDashboardPage = React.lazy(() => import('../apps/web/src/app/(dashboard)/dashboard/inventario/page'));

import { ClientRequestToasts, useNewClientRequestsCount } from './components/portal/ClientRequestAlerts';
import { InboxAttentionNotifier, useInboxAttentionCount } from './components/omnichannel/InboxAttention';

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
    'Inicio': true,
    'Comercial': true,
    'Producción': true,
    'Comunicaciones': true,
    'Voz y Telefonía': true,
    'Equipo': true,
    'Administración': false,
    'En construcción': false,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const voiceStatus = useVoiceStatus();
  const { canSeeModule, isSuperAdmin, currentUser } = useFusionAuth();
  const isAdmin = isSuperAdmin || currentUser?.roleKey === 'admin' || currentUser?.roleKey === 'super_admin';
  const newClientRequests = useNewClientRequestsCount(canSeeModule('comercial'));
  const inboxAttention = useInboxAttentionCount(canSeeModule('comunicaciones'));
  const itemBadges: Record<string, number> = { '/dashboard/portal-clientes': newClientRequests, '/dashboard/inbox': inboxAttention };
  const permissions = isSuperAdmin ? ['*'] : ((window as any).__FUSION_USER_PERMISSIONS__ || ['*']);
  const hasVoiceUse = isSuperAdmin || can(permissions, 'voice:use');
  const canManageVoice = isSuperAdmin || can(permissions, 'voice:manage_all');

  type NavItem = {
    name: string;
    path: string;
    icon: any;
    permission?: string;
    /** Módulo que controla la visibilidad (por defecto, el del grupo). */
    moduleKey?: FusionModuleKey;
    sensitiveModuleKey?: FusionModuleKey;
    isSuperAdminExclusive?: boolean;
  };
  const group = (title: string, moduleKey: FusionModuleKey, items: NavItem[]) => ({
    title,
    moduleKey,
    isOpen: openGroups[title] ?? true,
    setIsOpen: () => toggleGroup(title),
    items,
  });

  // Menú en 6 grupos por tarea. Las pantallas que aún no funcionan con datos reales van a
  // "En construcción", que solo ven los administradores.
  const navGroups = [
    group('Inicio', 'equipo', [
      { name: 'Inicio', path: '/', icon: HomeIcon, permission: 'home:read' },
      { name: 'Anuncios', path: '/anuncios', icon: Megaphone, permission: 'announcement:read' },
      { name: 'Chat del equipo', path: '/chat', icon: MessageSquare, permission: 'chat:read' },
    ]),
    group('Comercial', 'comercial', [
      { name: 'Dashboard comercial', path: '/dashboard/comercial/dashboard', icon: LayoutDashboard },
      { name: 'Clientes', path: '/dashboard/clientes', icon: Users },
      { name: 'Pipeline', path: '/dashboard/oportunidades', icon: TrendingUp },
      { name: 'Agenda', path: '/dashboard/comercial/agenda', icon: Calendar },
      { name: 'Precotizaciones IA', path: '/dashboard/comercial/precotizaciones', icon: Sparkles },
      { name: 'Cotizador', path: '/dashboard/cotizador', icon: FileText },
      { name: 'Cotizaciones', path: '/dashboard/comercial/cotizaciones', icon: FileText },
      { name: 'Portal de clientes', path: '/dashboard/portal-clientes', icon: Link2 },
      { name: 'Kiosco de pedidos', path: '/dashboard/kiosko', icon: Store },
      { name: 'Catálogo de productos', path: '/dashboard/catalogo', icon: Package },
      { name: 'Tarifario', path: '/cotizaciones/tarifario', icon: Calculator, permission: 'tariff:read' },
    ]),
    group('Producción', 'produccion', [
      { name: 'Tablero de producción', path: '/dashboard/produccion', icon: Play },
      { name: 'Inventario', path: '/dashboard/inventario', icon: Package },
      { name: 'Rentabilidad por orden', path: '/dashboard/produccion/costos', icon: DollarSign, sensitiveModuleKey: 'costos' },
    ]),
    group('Comunicaciones', 'comunicaciones', [
      { name: 'Bandeja de entrada', path: '/dashboard/inbox', icon: MessageCircle },
      { name: 'Salud de canales', path: '/dashboard/canales-config/meta', icon: Activity },
      { name: 'Costos de IA y mensajería', path: '/dashboard/costos-omnicanal', icon: DollarSign, sensitiveModuleKey: 'costos' },
    ]),
    ...(hasVoiceUse && voiceStatus.enabled ? [
      group('Voz y Telefonía', 'voz', [
        // Supervisión, informes, agente de IA y campañas: fases 2 y 3 (aún no existen)
        { name: 'Panel de Voz', path: '/voz', icon: Phone, permission: 'voice:use' },
        { name: 'Historial de Llamadas', path: '/voz/llamadas', icon: PhoneCall, permission: 'voice:use' },
        { name: 'Colas', path: '/voz/colas', icon: Users, permission: 'voice:use' },
        { name: 'Buzón de Voz', path: '/voz/buzon', icon: MessageSquare, permission: 'voice:use' },
        { name: 'Menús de opciones', path: '/voz/ivr', icon: Network, permission: 'voice:use' },
        { name: 'Locuciones', path: '/voz/locuciones', icon: FileText, permission: 'voice:use' },
      ]),
    ] : []),
    group('Equipo', 'equipo', [
      { name: 'Mi rendimiento', path: '/mi-rendimiento', icon: TrendingUp, permission: 'performance:read_own' },
      { name: 'Rendimiento del equipo', path: '/equipo/rendimiento', icon: Users, permission: 'performance:read_team' },
      { name: 'Metas y objetivos', path: '/metas', icon: Target, permission: 'goal:read' },
      { name: 'Empleados', path: '/dashboard/admin/usuarios', icon: Users, moduleKey: 'auditoria' },
      { name: 'Roles y permisos', path: '/dashboard/admin/roles', icon: Shield, moduleKey: 'auditoria' },
    ]),
    group('Administración', 'configuracion', [
      { name: 'Identidad de la empresa', path: '/dashboard/admin/organizacion', icon: Building },
      { name: 'Parámetros generales', path: '/dashboard/admin/parametros', icon: Settings },
      { name: 'Temperatura comercial', path: '/dashboard/admin/comercial', icon: Target },
      { name: 'Maestros y catálogos', path: '/dashboard/admin/maestros', icon: Database },
      { name: 'Plantillas', path: '/dashboard/admin/plantillas', icon: FileText },
      ...(canManageVoice && voiceStatus.enabled ? [{ name: 'Telefonía y troncales', path: '/configuracion/voz', icon: PhoneCall, permission: 'voice:manage_all' }] : []),
      { name: 'Registro de actividad', path: '/dashboard/admin/auditoria', icon: History, moduleKey: 'auditoria' },
      { name: 'Respaldos', path: '/dashboard/admin/respaldos', icon: DatabaseBackup, moduleKey: 'sistema' },
      { name: 'Salud del sistema', path: '/dashboard/admin/salud', icon: Activity, moduleKey: 'sistema' },
      { name: 'Integraciones', path: '/dashboard/admin/integraciones', icon: Blocks, moduleKey: 'sistema' },
      { name: 'Eventos del sistema', path: '/dashboard/admin/outbox', icon: Send, moduleKey: 'sistema' },
      { name: 'Mantenimiento', path: '/dashboard/admin/mantenimiento', icon: Wrench, moduleKey: 'sistema' },
      { name: 'Numeración', path: '/dashboard/admin/numeracion', icon: Hash, moduleKey: 'sistema' },
      { name: 'Calendario laboral', path: '/dashboard/admin/calendario', icon: Calendar, moduleKey: 'sistema' },
      { name: 'Política de seguridad', path: '/dashboard/admin/seguridad', icon: ShieldAlert, moduleKey: 'sistema' },
      { name: 'Revisión de accesos', path: '/dashboard/admin/revision-accesos', icon: FileCheck, moduleKey: 'sistema' },
    ]),
    ...(isAdmin ? [
      group('En construcción', 'configuracion', [
        ...(!voiceStatus.enabled ? [{ name: 'Voz y telefonía', path: '/voz', icon: Phone }] : []),
      ]),
    ] : []),
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
            .map((group, groupIdx) => {
              const visibleItems = group.items.filter((item) => {
                if (isSuperAdmin) return true;
                if (!canSeeModule(item.moduleKey ?? group.moduleKey)) return false;
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
                    <span>{group.title}</span>
                    {group.title === 'En construcción' && (
                      <span className="normal-case font-medium tracking-normal text-[10px] text-amber-600">solo admin</span>
                    )}
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
  // En el chat interno los botones flotantes tapaban la caja de mensaje: ahí se ocultan
  // y la página ocupa todo el alto disponible.
  const isChatRoute = /^(\/dashboard)?\/chat(\/|$)/.test(location.pathname);
  // En la bandeja el botón flotante tapaba el botón de enviar
  const hidesQuickActions = isChatRoute || /^\/dashboard\/inbox(\/|$)/.test(location.pathname);

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

        <div className={isChatRoute ? 'flex-1 min-h-0 overflow-hidden md:p-4 pb-16 md:pb-4' : 'flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6'}>
          <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">Cargando sección...</div>}>
            {children}
          </React.Suspense>
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
        {isSuperAdmin && !hidesQuickActions && (
          <QuickActionsDock onNewOpportunity={() => setIsNewModalOpen(true)} />
        )}
        {isSuperAdmin && <ClientRequestToasts />}
        <InboxAttentionNotifier />

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
            <Route path="/kiosko/:token" element={<KioskPage />} />
            <Route path="/kiosko" element={<Navigate to="/dashboard/kiosko" replace />} />
            <Route path="/kiosko-planta" element={<Navigate to="/" replace />} />
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
          <Route path="/voz/agente-ia" element={<Navigate to="/voz" replace />} />
          <Route path="/voz/campanas" element={<Navigate to="/voz" replace />} />
          <Route path="/voz/supervision" element={<Navigate to="/voz" replace />} />
          <Route path="/voz/informes" element={<Navigate to="/voz" replace />} />
          <Route path="/configuracion/voz" element={<DashboardLayout><VozConfiguracionPage /></DashboardLayout>} />
          <Route path="/interventoria" element={<Navigate to="/dashboard/admin/salud" replace />} />
          
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
                    <Route path="voz/agente-ia" element={<Navigate to="/voz" replace />} />
                    <Route path="voz/campanas" element={<Navigate to="/voz" replace />} />
                    <Route path="voz/supervision" element={<Navigate to="/voz" replace />} />
                    <Route path="voz/informes" element={<Navigate to="/voz" replace />} />
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
                    <Route path="identidades" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="portal-clientes" element={<PortalClientesPage />} />
                    <Route path="kiosko" element={<KioskSettingsPage />} />
                    <Route path="clientes/importar" element={<ClientesImportarPage />} />
                    <Route path="clientes/:id" element={<ClienteProfilePage />} />
                    <Route path="oportunidades" element={<OportunidadesPage />} />
                    <Route path="cotizaciones" element={<CotizacionesPage />} />
                    <Route path="cotizaciones/tarifario" element={<TarifarioProduccionPage />} />
                    <Route path="catalogo" element={<CatalogoPage />} />
                    <Route path="vea" element={<Navigate to="/dashboard" replace />} />
                    <Route path="produccion" element={<ProduccionKanbanPage />} />
                    <Route path="produccion/costos" element={<RentabilidadRealPage />} />
                    <Route path="produccion/capacidad" element={<Navigate to="/dashboard/produccion" replace />} />
                    <Route path="costos-omnicanal" element={<CostosOmnicanalPage />} />
                    <Route path="inventario" element={<InventarioDashboardPage />} />
                    <Route path="inventario/abastecimiento" element={<Navigate to="/dashboard/inventario" replace />} />
                    <Route path="ia/arquitectura" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="ia/testing" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="agentes" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="admin/ia" element={<Navigate to="/dashboard/costos-omnicanal" replace />} />
                    <Route path="agentes/propuestas" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="compliance" element={<Navigate to="/dashboard/admin/salud" replace />} />
                    <Route path="canales-config/chat-web" element={<Navigate to="/dashboard/canales-config/meta" replace />} />
                    <Route path="canales-config/meta" element={<MetaConfigPage />} />
                    <Route path="simulator" element={<Navigate to="/dashboard/inbox" replace />} />
                    
                    <Route path="admin/organizacion" element={<OrganizacionPage />} />
                    <Route path="admin/maestros" element={<MaestrosPage />} />
                    <Route path="admin/numeracion" element={<NumeracionPage />} />
                    <Route path="admin/calendario" element={<CalendarioPage />} />
                    <Route path="admin/plantillas" element={<PlantillasPage />} />
                    <Route path="admin/usuarios" element={<UsuariosPage />} />
                    <Route path="admin/roles" element={<RolesPage />} />
                    <Route path="admin/seguridad" element={<SeguridadPage />} />
                    <Route path="admin/revision-accesos" element={<RevisionAccesosPage />} />
                    <Route path="admin/secretos" element={<Navigate to="/dashboard/admin/integraciones" replace />} />
                    <Route path="admin/integraciones" element={<IntegracionesPage />} />
                    <Route path="admin/salud" element={<SaludPage />} />
                    <Route path="admin/respaldos" element={<RespaldosPage />} />
                    <Route path="admin/outbox" element={<OutboxPage />} />
                    <Route path="admin/mantenimiento" element={<MantenimientoPage />} />
                    <Route path="admin/comercial" element={<ComercialParamsPage />} />
                    <Route path="admin/parametros" element={<ParametrosPage />} />
                    <Route path="admin/flags" element={<FlagsPage />} />
                    <Route path="admin/auditoria" element={<AuditoriaConfigPage />} />
                    <Route path="admin/semantica" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="admin/contexto" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="admin/ia/mejora" element={<Navigate to="/dashboard/inbox" replace />} />
                    <Route path="admin/interventoria" element={<Navigate to="/dashboard/admin/salud" replace />} />
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
