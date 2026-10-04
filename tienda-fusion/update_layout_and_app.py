import os

# 1. Update App.tsx
with open('src/App.tsx', 'r') as f:
    app_content = f.read()

app_content = app_content.replace(
    '<Route path="catalog" index element={<CatalogPage />} />',
    '<Route index element={<Navigate to="catalog" replace />} />\n            <Route path="catalog" element={<CatalogPage />} />'
)

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

# 2. Update Layout.tsx
with open('src/admin/Layout.tsx', 'r') as f:
    layout_content = f.read()

NEW_LAYOUT = """
import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, FileText, ShoppingCart, Settings, LogOut, ArrowLeft, PackageSearch, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // TODO: Validate ADMIN or DISENADOR_OPERADOR role specifically
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  const navItems = [
    { name: 'Catálogo', path: '/admin/catalog', icon: PackageSearch },
    { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
    { name: 'Plantillas', path: '/admin/templates', icon: FileText },
    { name: 'Pedidos', path: '/admin/orders', icon: ShoppingCart },
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
          
          <div className="flex items-center gap-4">
             <span className="text-sm font-bold text-slate-700 hidden sm:block bg-slate-100 px-4 py-2 rounded-full">{user.email}</span>
             {user.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
              ) : (
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold border-2 border-white shadow-sm">
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
"""
with open('src/admin/Layout.tsx', 'w') as f:
    f.write(NEW_LAYOUT)
