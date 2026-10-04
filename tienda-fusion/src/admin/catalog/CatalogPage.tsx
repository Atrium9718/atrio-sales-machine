import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Copy, 
  Sliders, 
  Sparkles, 
  Package, 
  Check, 
  X, 
  Layers, 
  ExternalLink,
  DollarSign,
  Boxes,
  CheckCircle2,
  RefreshCw,
  Bookmark,
  Rocket,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Star,
  Flame,
  Percent,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';
import { getProductImageUrl } from '../../lib/productImages';
import MasterParametersTab from './MasterParametersTab';
import IndustryTemplatesTab from './IndustryTemplatesTab';
import CategoriesTab from './CategoriesTab';
import { FolderTree } from 'lucide-react';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'catalog'; // 'catalog' | 'categories' | 'parameters' | 'templates'

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'templates' | 'featured' | 'promos'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [quickEditingId, setQuickEditingId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Promo quick modal
  const [promoModalProduct, setPromoModalProduct] = useState<{
    id: number;
    name: string;
    basePrice: number;
    isPromo: boolean;
    isFeatured: boolean;
    discountPercentage: number;
    promoBadge: string;
    promoDescription: string;
  } | null>(null);
  const [promoSaving, setPromoSaving] = useState(false);

  const [quickForm, setQuickForm] = useState<{
    basePrice: number;
    baseQuantity: number;
    minQuantity: number;
    setupFee: number;
  }>({
    basePrice: 0,
    baseQuantity: 1,
    minQuantity: 1,
    setupFee: 0,
  });

  const { token, loading: authLoading } = useAuth();

  const getFreshToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(false);
      } catch (e) {
        console.warn('Error refreshing token:', e);
      }
    }
    return token;
  };

  const fetchProducts = async (retryCount = 0) => {
    try {
      setLoading(true);
      setFetchError(null);
      const activeToken = await getFreshToken();
      if (!activeToken) {
        setLoading(false);
        return;
      }

      const [prodRes, catRes] = await Promise.all([
        fetch('/api/admin/catalog/products', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        }),
        fetch('/api/admin/catalog/categories', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        })
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data);
      } else if (prodRes.status === 401 || prodRes.status === 403) {
        setFetchError('Se requiere iniciar sesión con permisos de administrador para ver el catálogo.');
      }

      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
      }
    } catch (error: any) {
      console.warn('Error fetching catalog data:', error?.message || error);
      if (retryCount < 2) {
        setTimeout(() => {
          fetchProducts(retryCount + 1);
        }, 1200);
        return;
      }
      setFetchError('No se pudo conectar con el catálogo. Haz clic en "Reintentar" para cargar nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [token, authLoading]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleToggleStatus = async (id: number, currentActive: boolean) => {
    setTogglingId(id);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/product/${id}/quick-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: !currentActive ? 'Producto publicado en la tienda con éxito.' : 'Producto cambiado a borrador / plantilla.'
        });
        await fetchProducts();
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.message || 'Error al cambiar estado del producto.' });
      }
    } catch (error) {
      console.error('Error actualizando estado del producto:', error);
      setNotification({ type: 'error', message: 'Error de conexión al actualizar estado.' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (id: number, currentFeatured: boolean) => {
    setTogglingFeaturedId(id);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/product/${id}/quick-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ isFeatured: !currentFeatured })
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: !currentFeatured 
            ? '⭐ Producto añadido a "Productos Destacados" en el inicio de la tienda.' 
            : 'Producto removido de destacados.'
        });
        await fetchProducts();
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.message || 'Error al actualizar destacado.' });
      }
    } catch (error) {
      console.error('Error al actualizar destacado:', error);
      setNotification({ type: 'error', message: 'Error de conexión al actualizar destacado.' });
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const handleOpenPromoModal = (product: any) => {
    const isPromo = Boolean(product.isPromo ?? product.extraConfig?.isPromo ?? (product.discountPercentage > 0));
    const discountPercentage = Number(product.discountPercentage ?? product.extraConfig?.discountPercentage ?? 15);
    const promoBadge = product.promoBadge || product.extraConfig?.promoBadge || `${discountPercentage}% OFF`;
    const promoDescription = product.promoDescription || product.extraConfig?.promoDescription || '';

    setPromoModalProduct({
      id: product.id,
      name: product.name,
      basePrice: Number(product.basePrice) || 0,
      isPromo,
      isFeatured: Boolean(product.isFeatured ?? product.extraConfig?.isFeatured),
      discountPercentage,
      promoBadge,
      promoDescription
    });
  };

  const handleSavePromoModal = async () => {
    if (!promoModalProduct) return;
    setPromoSaving(true);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/product/${promoModalProduct.id}/quick-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          isPromo: promoModalProduct.isPromo,
          discountPercentage: promoModalProduct.isPromo ? Number(promoModalProduct.discountPercentage || 0) : 0,
          promoBadge: promoModalProduct.isPromo ? promoModalProduct.promoBadge : '',
          promoDescription: promoModalProduct.isPromo ? promoModalProduct.promoDescription : ''
        })
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: promoModalProduct.isPromo 
            ? `🔥 Promoción activada para "${promoModalProduct.name}" con ${promoModalProduct.discountPercentage}% de descuento.` 
            : `Promoción desactivada para "${promoModalProduct.name}".`
        });
        setPromoModalProduct(null);
        await fetchProducts();
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.message || 'Error al guardar promoción.' });
      }
    } catch (error) {
      console.error('Error guardando promoción:', error);
      setNotification({ type: 'error', message: 'Error de conexión al guardar promoción.' });
    } finally {
      setPromoSaving(false);
    }
  };

  const handleDuplicate = async (id: number, name: string) => {
    setDuplicatingId(id);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/product/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const cloned = await res.json();
        setNotification({
          type: 'success',
          message: `Producto duplicado exitosamente: "${cloned.name || (name + ' (Copia)')}". Se han clonado todas sus variables y reglas.`
        });
        await fetchProducts();
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: `No se pudo duplicar el producto: ${err.message || 'Error desconocido.'}` });
      }
    } catch (error) {
      console.error('Error duplicando producto:', error);
      setNotification({ type: 'error', message: 'Error de conexión al duplicar el producto.' });
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleQuickSave = async (id: number) => {
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/product/${id}/quick-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(quickForm)
      });
      if (res.ok) {
        setQuickEditingId(null);
        setNotification({ type: 'success', message: 'Precios actualizados rápidamente.' });
        await fetchProducts();
      }
    } catch (error) {
      console.error('Error en guardado rápido:', error);
      setNotification({ type: 'error', message: 'Error al actualizar precios.' });
    }
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const activeToken = await getFreshToken();
      const response = await fetch(`/api/admin/catalog/product/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (response.ok) {
        setNotification({ type: 'success', message: `Producto "${productToDelete.name}" eliminado definitivamente.` });
        setProductToDelete(null);
        await fetchProducts();
      } else {
        const err = await response.json();
        setNotification({ type: 'error', message: `No se pudo eliminar: ${err.message || 'Error en el servidor.'}` });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setNotification({ type: 'error', message: 'Error de conexión al eliminar el producto.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  const publishedCount = products.filter(p => p.isActive !== false).length;
  const templatesCount = products.filter(p => p.isActive === false).length;
  const featuredCount = products.filter(p => Boolean(p.isFeatured ?? p.extraConfig?.isFeatured)).length;
  const promoCount = products.filter(p => Boolean(p.isPromo ?? p.extraConfig?.isPromo ?? (p.discountPercentage > 0))).length;

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toString().includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    let matchesStatus = true;
    if (statusFilter === 'published') {
      matchesStatus = product.isActive !== false;
    } else if (statusFilter === 'templates') {
      matchesStatus = product.isActive === false;
    } else if (statusFilter === 'featured') {
      matchesStatus = Boolean(product.isFeatured ?? product.extraConfig?.isFeatured);
    } else if (statusFilter === 'promos') {
      matchesStatus = Boolean(product.isPromo ?? product.extraConfig?.isPromo ?? (product.discountPercentage > 0));
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Parámetros & Catálogo</h1>
          <p className="text-slate-500 font-medium mt-1">
            Gestiona productos, mínimos de pedido, matriz de variables y biblioteca de insumos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/admin/catalog/new"
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20 font-bold text-sm"
          >
            <Plus size={18} /> Crear Producto / Plantilla
          </Link>
        </div>
      </div>

      {/* Toast Feedback Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Ítems</span>
            <span className="text-2xl font-black text-slate-900">{products.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Rocket size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Publicados Tienda</span>
            <span className="text-2xl font-black text-emerald-700">{publishedCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star size={24} className="fill-amber-500 text-amber-500" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Destacados Inicio</span>
            <span className="text-2xl font-black text-amber-600">{featuredCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Flame size={24} className="fill-rose-500 text-rose-500" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">En Promoción</span>
            <span className="text-2xl font-black text-rose-600">{promoCount}</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-slate-200/60 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1 w-full max-w-3xl">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'catalog' })}
          className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={17} className={activeTab === 'catalog' ? 'text-teal-600' : ''} />
          <span>Catálogo ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'categories' })}
          className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderTree size={17} className={activeTab === 'categories' ? 'text-teal-600' : ''} />
          <span>Categorías ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'parameters' })}
          className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'parameters'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={17} className={activeTab === 'parameters' ? 'text-teal-600' : ''} />
          <span>Variables</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'templates' })}
          className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles size={17} className={activeTab === 'templates' ? 'text-teal-600' : ''} />
          <span>Plantillas</span>
        </button>
      </div>

      {/* Tab 1: Product Catalog Table */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, categoría o ID..." 
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              >
                <option value="all">Todas las Categorías</option>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button 
                onClick={fetchProducts}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 text-slate-600 hover:text-teal-600 shadow-sm"
                title="Recargar"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Status Sub-Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar por:</span>
            
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>

            <button
              onClick={() => setStatusFilter('published')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Rocket size={13} />
              Publicados ({publishedCount})
            </button>

            <button
              onClick={() => setStatusFilter('featured')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                statusFilter === 'featured'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Star size={13} className="fill-current" />
              ⭐ Destacados en Inicio ({featuredCount})
            </button>

            <button
              onClick={() => setStatusFilter('promos')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                statusFilter === 'promos'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <Flame size={13} className="fill-current" />
              🔥 En Promoción ({promoCount})
            </button>

            <button
              onClick={() => setStatusFilter('templates')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                statusFilter === 'templates'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              <Bookmark size={13} />
              Borradores ({templatesCount})
            </button>
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-teal-600" />
                  <span className="font-semibold text-sm">Cargando catálogo industrial...</span>
                </div>
              ) : fetchError ? (
                <div className="p-12 text-center text-slate-600 flex flex-col items-center justify-center gap-3">
                  <AlertCircle size={28} className="text-amber-500" />
                  <p className="font-semibold text-sm max-w-md">{fetchError}</p>
                  <button
                    onClick={() => fetchProducts(0)}
                    className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw size={14} /> Reintentar Carga
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Producto & ID</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Categoría</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Estado en Tienda</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Vitrina & Ofertas</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Precio & Prorrateo</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Mínimo / Paso</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Variables</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                          No se encontraron productos con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : filteredProducts.map((product) => {
                      const isQuickEditing = quickEditingId === product.id;
                      const isPublished = product.isActive !== false;
                      const isToggling = togglingId === product.id;
                      const isFeatured = Boolean(product.isFeatured ?? product.extraConfig?.isFeatured);
                      const isPromo = Boolean(product.isPromo ?? product.extraConfig?.isPromo ?? (product.discountPercentage > 0));
                      const discountPct = Number(product.discountPercentage ?? product.extraConfig?.discountPercentage ?? 0);
                      const promoBadge = product.promoBadge || product.extraConfig?.promoBadge || (discountPct ? `${discountPct}% OFF` : 'OFERTA');

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/60 transition-colors group">
                          {/* Name & Photo */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4 min-w-[220px]">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                                <img 
                                  src={getProductImageUrl(product)} 
                                  alt={product.name} 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80';
                                  }}
                                  className="w-full h-full object-cover" 
                                />
                                {isPromo && (
                                  <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 shadow-xs" title="En Promoción">
                                    <Flame size={9} className="fill-white" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link 
                                  to={`/admin/catalog/${product.id}`}
                                  className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors block truncate max-w-[240px]"
                                  title={product.name}
                                >
                                  {product.name}
                                </Link>
                                <div className="text-[11px] font-mono text-slate-400">
                                  ID: #{product.id.toString().padStart(4, '0')} • /{product.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                            <span className="bg-slate-100 px-3 py-1 rounded-xl text-slate-700 font-semibold text-xs inline-block">
                              {product.category}
                            </span>
                          </td>

                          {/* Status & 1-Click Toggle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(product.id, isPublished)}
                              disabled={isToggling}
                              className={`group/btn inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                                isPublished
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                              } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                              title={isPublished ? 'Clic para pausar y guardar como plantilla' : 'Clic para publicar de inmediato en tienda'}
                            >
                              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
                              {isPublished ? (
                                <>
                                  <Rocket size={13} className="text-emerald-600" />
                                  <span>Publicado</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark size={13} className="text-indigo-600" />
                                  <span>Plantilla</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Vitrina & Ofertas (Featured & Promo) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {/* 1-Click Destacado Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleFeatured(product.id, isFeatured)}
                                disabled={togglingFeaturedId === product.id}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                                  isFeatured
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                }`}
                                title={isFeatured ? 'Quitar de destacados en la Home' : 'Mostrar en sección "⭐ Productos Destacados" en la Home'}
                              >
                                <Star size={12} className={isFeatured ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                                <span>{isFeatured ? 'Destacado' : 'Destacar'}</span>
                              </button>

                              {/* Open Promo Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenPromoModal(product)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                                  isPromo
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                }`}
                                title="Configurar descuento promocional y badge de oferta"
                              >
                                <Flame size={12} className={isPromo ? "fill-rose-500 text-rose-500 animate-pulse" : "text-slate-400"} />
                                <span>
                                  {isPromo
                                    ? (discountPct ? `${discountPct}% OFF` : 'OFERTA')
                                    : '+ Descuento'}
                                </span>
                              </button>
                            </div>
                          </td>

                          {/* Price & Pack Base */}
                          <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap">
                            {isQuickEditing ? (
                              <div className="space-y-1 bg-amber-50 p-2 rounded-xl border border-amber-200">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-slate-400 font-bold">$ Base:</span>
                                  <input 
                                    type="number"
                                    value={quickForm.basePrice}
                                    onChange={(e) => setQuickForm({ ...quickForm, basePrice: Number(e.target.value) })}
                                    className="w-24 px-2 py-0.5 bg-white border border-slate-300 rounded font-bold text-teal-700 text-xs"
                                  />
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-slate-400 font-bold">Cant. Base:</span>
                                  <input 
                                    type="number"
                                    value={quickForm.baseQuantity}
                                    onChange={(e) => setQuickForm({ ...quickForm, baseQuantity: Number(e.target.value) })}
                                    className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded font-bold text-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-slate-900">{formatCOP(product.basePrice)}</span>
                                  {isPromo && discountPct > 0 && product.originalBasePrice && (
                                    <span className="text-[10px] line-through text-slate-400 font-medium">
                                      {formatCOP(product.originalBasePrice)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-teal-600 font-bold">
                                  {product.baseQuantity && product.baseQuantity > 1
                                    ? `x${product.baseQuantity.toLocaleString('es-CO')} u (${formatCOP(product.basePrice / product.baseQuantity)}/u)`
                                    : 'x1 unidad'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Minimum & Step */}
                          <td className="px-6 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                            {isQuickEditing ? (
                              <div className="space-y-1 bg-amber-50 p-2 rounded-xl border border-amber-200">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-slate-400">Mín:</span>
                                  <input 
                                    type="number"
                                    value={quickForm.minQuantity}
                                    onChange={(e) => setQuickForm({ ...quickForm, minQuantity: Number(e.target.value) })}
                                    className="w-16 px-2 py-0.5 bg-white border border-slate-300 rounded font-bold text-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                                  Mín: {(product.minQuantity || 1).toLocaleString('es-CO')} u
                                </span>
                                {product.setupFee > 0 && (
                                  <span className="block text-[10px] text-amber-700 mt-1 font-medium whitespace-nowrap">
                                    + {formatCOP(product.setupFee)} Montaje
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Variables Count */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">
                              <Sliders size={12} />
                              {product.attributesCount || 'Variables'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isQuickEditing ? (
                                <>
                                  <button
                                    onClick={() => handleQuickSave(product.id)}
                                    className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-sm"
                                    title="Guardar Cambios Rápidos"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setQuickEditingId(null)}
                                    className="p-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
                                    title="Cancelar"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Link to Live Storefront (if published) */}
                                  {isPublished ? (
                                    <Link
                                      to={`/producto/${product.slug}`}
                                      target="_blank"
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                      title="Ver en Tienda Pública"
                                    >
                                      <ExternalLink size={17} />
                                    </Link>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(product.id, false)}
                                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                      title="Publicar en Tienda"
                                    >
                                      <Rocket size={17} />
                                    </button>
                                  )}

                                  {/* Duplicate / Clone Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('Duplicando producto:', product.id);
                                      handleDuplicate(product.id, product.name);
                                    }}
                                    disabled={duplicatingId === product.id}
                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                                    title="Duplicar / Clonar Producto con Variables"
                                  >
                                    <Copy size={17} className={duplicatingId === product.id ? "animate-spin" : ""} />
                                  </button>

                                  {/* Edit Full Matrix Button */}
                                  <Link 
                                    to={`/admin/catalog/${product.id}`}
                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                                    title="Configurar Matriz de Variables"
                                  >
                                    <Edit size={17} />
                                  </Link>

                                  {/* Delete Button */}
                                  <button 
                                    type="button"
                                    onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" 
                                    title="Eliminar del Catálogo"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Product Categories Management */}
      {activeTab === 'categories' && (
        <CategoriesTab />
      )}

      {/* Tab 3: Master Parameters Bank */}
      {activeTab === 'parameters' && (
        <MasterParametersTab />
      )}

      {/* Tab 4: Industry Templates */}
      {activeTab === 'templates' && (
        <IndustryTemplatesTab />
      )}

      {/* Modal de Configuración Rápida de Promoción / Oferta */}
      {promoModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <Flame size={24} className="fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Configurar Oferta & Descuento</h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                    {promoModalProduct.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromoModalProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Promo Switch Toggle */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 text-sm block">Activar en "🔥 Ofertas & Promociones"</span>
                <span className="text-xs text-slate-500 font-medium">Se destacará en el carrusel de promociones de la portada.</span>
              </div>
              <button
                type="button"
                onClick={() => setPromoModalProduct({
                  ...promoModalProduct,
                  isPromo: !promoModalProduct.isPromo
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  promoModalProduct.isPromo ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    promoModalProduct.isPromo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {promoModalProduct.isPromo ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Preset Descuentos */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Porcentaje de Descuento
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {[5, 10, 15, 20, 25, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPromoModalProduct({
                          ...promoModalProduct,
                          discountPercentage: pct,
                          promoBadge: promoModalProduct.promoBadge || `${pct}% OFF`
                        })}
                        className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                          promoModalProduct.discountPercentage === pct
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={promoModalProduct.discountPercentage || ''}
                      onChange={(e) => setPromoModalProduct({
                        ...promoModalProduct,
                        discountPercentage: Number(e.target.value)
                      })}
                      placeholder="Ej: 15"
                      className="w-full pl-4 pr-12 py-3 bg-white rounded-xl border border-slate-200 font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">%</span>
                  </div>
                </div>

                {/* Price Preview Card */}
                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Precio con Descuento</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-black text-rose-900">
                        {formatCOP(Math.round(promoModalProduct.basePrice * (1 - (promoModalProduct.discountPercentage || 0) / 100)))}
                      </span>
                      <span className="text-xs line-through text-slate-400 font-medium">
                        {formatCOP(promoModalProduct.basePrice)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 bg-rose-500 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
                      <Percent size={12} /> -{promoModalProduct.discountPercentage || 0}%
                    </span>
                  </div>
                </div>

                {/* Badge Label & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Texto del Distintivo (Badge)
                    </label>
                    <input
                      type="text"
                      value={promoModalProduct.promoBadge}
                      onChange={(e) => setPromoModalProduct({
                        ...promoModalProduct,
                        promoBadge: e.target.value
                      })}
                      placeholder="Ej: 15% OFF, LIQUIDACIÓN"
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Detalle / Motivo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={promoModalProduct.promoDescription}
                      onChange={(e) => setPromoModalProduct({
                        ...promoModalProduct,
                        promoDescription: e.target.value
                      })}
                      placeholder="Ej: Por tiempo limitado"
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium border border-dashed border-slate-200">
                Al guardar con la oferta desactivada, el producto volverá a su precio estándar regular y no aparecerá en el carrusel de promociones.
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPromoModalProduct(null)}
                disabled={promoSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePromoModal}
                disabled={promoSaving}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-500/20 flex items-center gap-2"
              >
                {promoSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Flame size={14} className="fill-white" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">¿Eliminar producto?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Estás a punto de eliminar <strong className="text-slate-900">"{productToDelete.name}"</strong> del catálogo. Se eliminarán sus variables configuradas, plantillas y escalas de precios asociadas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Sí, Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
