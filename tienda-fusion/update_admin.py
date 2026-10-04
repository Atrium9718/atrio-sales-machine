import os

ADMIN_LAYOUT = """
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, FileText, ShoppingCart, Settings, LogOut, ArrowLeft, PackageSearch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-slate-50">
          <Link to="/" className="flex flex-col">
             <span className="text-2xl font-black text-slate-900 tracking-tighter">Fusión</span>
             <span className="text-[10px] font-extrabold text-teal-500 uppercase tracking-widest -mt-1">El Gestor</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
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
        <div className="p-4 border-t border-slate-100 space-y-1.5">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-teal-600 font-medium">
            <ArrowLeft size={20} className="text-slate-400" />
            Ir a la Tienda
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-red-500 hover:bg-red-50 font-medium">
            <LogOut size={20} className="text-red-400" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-6 md:px-10 justify-between sticky top-0 z-30">
          
          <h2 className="text-xl font-extrabold text-slate-900 hidden md:block tracking-tight">Panel de Control</h2>
          
          {/* Menú móvil header */}
          <div className="md:hidden flex items-center gap-3">
             <Link to="/" className="text-slate-500 hover:text-teal-600 bg-slate-100 p-2 rounded-full"><ArrowLeft size={18}/></Link>
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

CATALOG_PAGE = """
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';

export default function CatalogPage() {
  const products = [
    { id: 1, name: 'Tarjetas de Presentación Pro', category: 'Impresión Comercial', price: 85000, status: 'Activo', image: 'https://images.unsplash.com/photo-1589330694653-0608cb2142e2?auto=format&fit=crop&w=150&q=80' },
    { id: 2, name: 'Volantes Publicitarios Media Carta', category: 'Impresión Comercial', price: 240000, status: 'Activo', image: 'https://images.unsplash.com/photo-1588691500225-b77dc4a631f4?auto=format&fit=crop&w=150&q=80' },
    { id: 3, name: 'Pendón Publicitario 100x200cm', category: 'Gran Formato', price: 120000, status: 'Borrador', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=150&q=80' },
  ];

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Catálogo de Productos</h1>
          <p className="text-slate-500 font-medium mt-1">Administra tus productos, precios y matriz de atributos.</p>
        </div>
        <Link 
          to="/admin/catalog/new"
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20 font-bold"
        >
          <Plus size={20} /> Crear Producto
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar productos por nombre o ID..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-full border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-teal-500 transition-shadow outline-none text-slate-700 font-medium"
            />
         </div>
         <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white rounded-full shadow-sm ring-1 ring-slate-100 text-slate-600 hover:text-teal-600 font-bold hover:bg-slate-50 transition-colors">
            <Filter size={20} />
            Filtrar
         </button>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Precio Base</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{product.name}</div>
                        <div className="text-xs font-medium text-slate-400">ID: #{product.id.toString().padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {formatCOP(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-lg ${
                      product.status === 'Activo' 
                        ? 'bg-teal-50 text-teal-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link 
                        to={`/admin/catalog/${product.id}`}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </Link>
                      <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""

with open('src/admin/Layout.tsx', 'w') as f:
    f.write(ADMIN_LAYOUT)

with open('src/admin/catalog/CatalogPage.tsx', 'w') as f:
    f.write(CATALOG_PAGE)
