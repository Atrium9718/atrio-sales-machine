
import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, FileText, ShoppingCart, Settings, LogOut, ArrowLeft, PackageSearch, Menu, X, Layers, Calculator, Building2, Megaphone, Users, ShieldCheck, UserCheck, Receipt, DollarSign, Wallet, Globe, Sparkles, Search, Download } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useRbac } from '../hooks/useRbac';

export default function AdminLayout() {
  const location = useLocation();
  const { user, isAdmin, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentRole, switchSimulatedRole } = useRbac();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only allow logged in ADMIN users
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  const navItems = [
    { name: 'Resumen', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Taller & Pedidos', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Imposición CTP', path: '/admin/imposition', icon: Layers },
    { name: 'Catálogo & Parámetros', path: '/admin/catalog', icon: PackageSearch },
    { name: 'Motor de Precios', path: '/admin/pricing-rules', icon: Calculator },
    { name: 'Cuentas B2B', path: '/admin/b2b', icon: Building2 },
    { name: 'Finanzas & Pagos', path: '/admin/finance', icon: Wallet },
    { name: 'Marketing Omnicanal', path: '/admin/marketing', icon: Megaphone },
    { name: 'Biblioteca & IA Studio', path: '/admin/media', icon: Sparkles },
    { name: 'Control SEO & Meta', path: '/admin/seo', icon: Search },
    { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
    { name: 'CMS & Marca Global', path: '/admin/settings?tab=cms', icon: Globe },
    { name: 'Plantillas', path: '/admin/templates', icon: FileText },
    { name: 'Usuarios & Roles', path: '/admin/users', icon: Users },
    { name: 'Configuración', path: '/admin/settings', icon: Settings },
  ];


  const SidebarContent = () => (
    <>
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50 shrink-0">
        <Link to="/" className="flex flex-col">
           <span className="text-2xl font-black text-slate-900 tracking-tighter">Fusión</span>
           <span className="text-[10px] font-extrabold text-teal-500 uppercase tracking-widest -mt-1">El Gestor</span>
        </Link>
        {/* Close button for mobile */}
        <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
           <X size={24} />
        </button>
      </div>
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600 font-medium'
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-slate-400"} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100 space-y-1.5 shrink-0">
        <a
          href="/api/download-zip"
          download="fusion-grafica-w2p-v2.0.zip"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs shadow-xs border border-emerald-200/60"
          title="Descargar código fuente y configuración (.ZIP)"
        >
          <Download size={18} className="text-emerald-600" />
          <span>Descargar Proyecto (.ZIP)</span>
        </a>
        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-teal-600 font-medium">
          <ArrowLeft size={20} className="text-slate-400" />
          Ir a la Tienda
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-red-500 hover:bg-red-50 font-medium">
          <LogOut size={20} className="text-red-400" />
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col fixed inset-y-0 z-10">
        <SidebarContent />
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <aside className="w-72 bg-white flex flex-col relative shadow-2xl h-full">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-4 md:px-10 justify-between sticky top-0 z-30">
          
          <h2 className="text-xl font-extrabold text-slate-900 hidden md:block tracking-tight">Panel de Control</h2>
          
          {/* Menú móvil header */}
          <div className="md:hidden flex items-center gap-3">
             <button onClick={() => setMobileMenuOpen(true)} className="text-slate-500 hover:text-teal-600 bg-slate-100 p-2 rounded-full">
               <Menu size={20}/>
             </button>
             <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 tracking-tighter">Fusión</span>
                <span className="text-[8px] font-extrabold text-teal-500 uppercase tracking-widest -mt-1">El Gestor</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Descargar ZIP botón */}
             <a
               href="/api/download-zip"
               download="fusion-grafica-w2p-v2.0.zip"
               className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all transform active:scale-95"
               title="Descargar paquete completo del proyecto en formato .ZIP"
             >
               <Download size={14} />
               <span className="hidden sm:inline">Descargar .ZIP</span>
             </a>

             {/* QUICK ROLE IMPERSONATOR FOR RBAC GOVERNANCE SIMULATION */}
             <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
               <UserCheck size={14} className="text-teal-600" />
               <span className="text-[11px] font-bold text-slate-500">Rol Activo:</span>
               <select
                 value={currentRole}
                 onChange={(e) => switchSimulatedRole(e.target.value as any)}
                 className="bg-white border-0 rounded-full px-2.5 py-0.5 text-xs font-black text-slate-900 cursor-pointer shadow-xs focus:ring-1 focus:ring-teal-500"
               >
                 <option value="SUPER_ADMIN">👑 Super Administrador</option>
                 <option value="CONTENT_DESIGNER">🎨 Diseñador Contenido / Mktg</option>
                 <option value="CATALOG_PRICING_MANAGER">📦 Gestor Catálogo & Precios</option>
                 <option value="ADMIN">🛡️ Administrador General</option>
                 <option value="PRINTER_OPERATOR">🖨️ Impresor / Taller (CTP)</option>
                 <option value="LOGISTICS_DISPATCH">🚚 Logística & Despachos</option>
               </select>
             </div>

             <span className="text-xs font-bold text-slate-700 hidden sm:block bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/60">
               {user.email}
             </span>
             {user.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
              ) : (
                <div className="w-9 h-9 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-xs">
                  {user.displayName?.[0] || 'A'}
                </div>
              )}
          </div>
        </header>

        <div className="p-4 md:p-10 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
