import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles, 
  Check, 
  X, 
  Layers, 
  Package, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  RefreshCw, 
  ArrowUpDown, 
  Search, 
  Tag, 
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  FolderPlus,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  active: boolean;
  displayOrder: number;
  description?: string;
  icon?: string;
  productCount?: number;
}

const PRESET_ICONS = [
  '📦', '📇', '📄', '🏷️', '🎁', '👕', '📚', '🖼️', 
  '🏢', '🚀', '💎', '🎨', '🛍️', '✉️', '📐', '🏷️',
  '🔖', '🖨️', '📁', '⭐', '🔥', '💼', '📌', '📦'
];

const PRESET_CATEGORIES_SUGGESTIONS = [
  { name: 'Empaques & Cajas Plegadizas', icon: '📦', description: 'Empaques de cartón maule, microcorrugado y cajas personalizadas con acabados premium.' },
  { name: 'Etiquetas & Adhesivos en Rollo', icon: '🏷️', description: 'Stickers troquelados, vinilos adhesivos y rollos para etiquetado automático.' },
  { name: 'Papelería Comercial & Corporativa', icon: '📇', description: 'Tarjetas personales, hojas membretadas, sobres, carpetas corporativas y talonarios.' },
  { name: 'Gran Formato & Avisos Publicitarios', icon: '🖼️', description: 'Pendones, banners, vinilos para vitrinas, acrílicos y señalización comercial.' },
  { name: 'Editorial, Libros & Catálogos', icon: '📚', description: 'Revistas, catálogos grapados, folletos plegables y libros con lomo cuadrado.' },
  { name: 'Merchandising & Artículos Publicitarios', icon: '🎁', description: 'Mugs, esferos, bolsas ecológicas, termos y regalos promocionales empresariales.' }
];

export default function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  
  // Create / Edit Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    parentId: number | null;
    active: boolean;
    displayOrder: number;
    description: string;
    icon: string;
  }>({
    name: '',
    slug: '',
    parentId: null,
    active: true,
    displayOrder: 1,
    description: '',
    icon: '📦',
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<number | ''>('');
  const [deleting, setDeleting] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { token } = useAuth();

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const activeToken = await getFreshToken();
      const res = await fetch('/api/admin/catalog/categories', {
        headers: {
          'Authorization': `Bearer ${activeToken || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        showNotification('error', 'No se pudieron cargar las categorías.');
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      showNotification('error', 'Error al consultar categorías en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Open Create Modal
  const handleOpenCreate = (preset?: { name: string; icon: string; description: string }) => {
    const nextOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.displayOrder || 0)) + 1 
      : 1;

    if (preset) {
      const slug = preset.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      setFormData({
        name: preset.name,
        slug,
        parentId: null,
        active: true,
        displayOrder: nextOrder,
        description: preset.description,
        icon: preset.icon,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        parentId: null,
        active: true,
        displayOrder: nextOrder,
        description: '',
        icon: '📦',
      });
    }
    setEditingCategory(null);
    setModalMode('create');
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || null,
      active: cat.active ?? true,
      displayOrder: cat.displayOrder ?? 0,
      description: cat.description || '',
      icon: cat.icon || '📁',
    });
    setModalMode('edit');
  };

  // Name change auto-generates slug
  const handleNameChange = (val: string) => {
    const slug = val.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    setFormData(prev => ({
      ...prev,
      name: val,
      slug: modalMode === 'create' ? slug : prev.slug
    }));
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('error', 'Por favor ingresa un nombre para la categoría.');
      return;
    }

    setSaving(true);
    try {
      const activeToken = await getFreshToken();
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/catalog/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken || ''}`
          },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          showNotification('success', `Categoría "${formData.name}" creada con éxito.`);
          setModalMode(null);
          fetchCategories();
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al crear la categoría.');
        }
      } else if (modalMode === 'edit' && editingCategory) {
        const res = await fetch(`/api/admin/catalog/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken || ''}`
          },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          showNotification('success', `Categoría "${formData.name}" actualizada con éxito.`);
          setModalMode(null);
          fetchCategories();
        } else {
          const err = await res.json();
          showNotification('error', err.message || 'Error al actualizar la categoría.');
        }
      }
    } catch (err: any) {
      console.error('Error saving category:', err);
      showNotification('error', 'Error al comunicarse con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (cat: CategoryItem) => {
    setTogglingId(cat.id);
    try {
      const activeToken = await getFreshToken();
      const newStatus = !cat.active;
      const res = await fetch(`/api/admin/catalog/categories/${cat.id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`
        },
        body: JSON.stringify({ active: newStatus })
      });

      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: newStatus } : c));
        showNotification('success', `Categoría ${newStatus ? 'activada' : 'desactivada'} en catálogo.`);
      } else {
        showNotification('error', 'No se pudo cambiar el estado.');
      }
    } catch (err) {
      showNotification('error', 'Error al actualizar estado.');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`
        },
        body: JSON.stringify({
          reassignToCategoryId: reassignCategoryId || undefined
        })
      });

      if (res.ok) {
        showNotification('success', `Categoría "${categoryToDelete.name}" eliminada.`);
        setCategoryToDelete(null);
        setReassignCategoryId('');
        fetchCategories();
      } else {
        const err = await res.json();
        showNotification('error', err.message || 'Error al eliminar categoría.');
      }
    } catch (err) {
      showNotification('error', 'Error al eliminar categoría.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.active) ||
      (statusFilter === 'inactive' && !c.active);

    return matchesSearch && matchesStatus;
  });

  const totalProductsAcrossCats = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
  const activeCategoriesCount = categories.filter(c => c.active).length;
  const topCategory = [...categories].sort((a, b) => (b.productCount || 0) - (a.productCount || 0))[0];

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-bold animate-in fade-in slide-in-from-bottom-5 ${
          notification.type === 'success' 
            ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20' 
            : 'bg-red-900 text-white border-red-700 shadow-red-950/20'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-red-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <FolderTree size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Gestión de Categorías de Catálogo
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold">
                {categories.length} Categorías
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Estructura las familias de productos para la navegación web, el cotizador en tiempo real y la matriz de precios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/25 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <FolderTree size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Categorías</span>
            <span className="text-2xl font-black text-slate-900">{categories.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Eye size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Activas en Tienda</span>
            <span className="text-2xl font-black text-emerald-600">{activeCategoriesCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Productos Vinculados</span>
            <span className="text-2xl font-black text-blue-600">{totalProductsAcrossCats}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Líder en Referencias</span>
            <span className="text-sm font-black text-slate-900 truncate max-w-[150px] block" title={topCategory?.name || 'N/A'}>
              {topCategory?.icon} {topCategory?.name || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Plantillas / Sugerencias Rápidas para el Sector Gráfico */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 rounded-[28px] text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Sugerencias</span>
              <h3 className="text-sm font-bold text-white">Categorías Predeterminadas de Imprenta & Litografía</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en cualquiera para crearla al instante con su nombre, icono y descripción estándar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_CATEGORIES_SUGGESTIONS.map((preset, idx) => {
            const alreadyExists = categories.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
            return (
              <div 
                key={idx}
                className="bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">{preset.icon}</span>
                    {alreadyExists ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} /> Existente
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-teal-300 group-hover:text-teal-200">
                        + Añadir
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-white group-hover:text-teal-300 transition-colors leading-snug">
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenCreate(preset)}
                    className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <span>{alreadyExists ? 'Configurar / Duplicar' : 'Crear esta categoría'}</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, slug o descripción..." 
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-xs sm:text-sm text-slate-700 shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-xs sm:text-sm text-slate-700 shadow-sm cursor-pointer"
          >
            <option value="all">Todas las Categorías ({categories.length})</option>
            <option value="active">Solo Activas ({categories.filter(c => c.active).length})</option>
            <option value="inactive">Solo Ocultas / Inactivas ({categories.filter(c => !c.active).length})</option>
          </select>
        </div>
      </div>

      {/* Categories Table / List */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw size={32} className="animate-spin text-teal-600" />
            <span className="text-xs font-bold text-slate-500">Cargando categorías...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <FolderTree size={28} />
            </div>
            <p className="text-sm font-bold text-slate-700">No se encontraron categorías</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Crea tu primera categoría para organizar los productos.'}
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="mt-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Crear Categoría</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Orden / Icono</th>
                  <th className="py-4 px-6">Nombre de Categoría</th>
                  <th className="py-4 px-6">Slug URL</th>
                  <th className="py-4 px-6">Descripción</th>
                  <th className="py-4 px-6 text-center">Productos</th>
                  <th className="py-4 px-6 text-center">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                    
                    {/* Display Order + Icon */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center">
                          {cat.displayOrder ?? 0}
                        </span>
                        <span className="text-2xl p-1 bg-slate-50 border border-slate-200/60 rounded-xl">
                          {cat.icon || '📁'}
                        </span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block group-hover:text-teal-700 transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          ID: #{cat.id}
                        </span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-600 font-mono text-[11px] px-2.5 py-1 rounded-lg border border-slate-200/80">
                        /{cat.slug}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-slate-500 line-clamp-2 text-xs font-normal">
                        {cat.description || <span className="italic text-slate-300">Sin descripción</span>}
                      </p>
                    </td>

                    {/* Product count */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                        (cat.productCount || 0) > 0
                          ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Package size={12} />
                        {cat.productCount || 0}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(cat)}
                        disabled={togglingId === cat.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                          cat.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {togglingId === cat.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : cat.active ? (
                          <Eye size={12} className="text-emerald-600" />
                        ) : (
                          <EyeOff size={12} className="text-slate-400" />
                        )}
                        <span>{cat.active ? 'Activa' : 'Oculta'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                          title="Editar Categoría"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar Categoría"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL CREAR / EDITAR CATEGORÍA */}
      {/* ========================================================================= */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-400 flex items-center justify-center">
                  <FolderTree size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {modalMode === 'create' ? 'Nueva Categoría de Catálogo' : 'Editar Categoría'}
                  </h3>
                  <p className="text-xs text-slate-300">Configura el nombre, icono y visibilidad de la categoría.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveCategory} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Empaques & Cajas Plegadizas"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Slug URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Slug URL (Identificador web)
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-400 text-xs font-mono px-3 py-2.5 rounded-l-xl">
                    /categoria/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="empaques-cajas-plegadizas"
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-r-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Icon / Emoji Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Icono o Emoji Representativo
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="📦"
                    className="w-16 text-center text-xl p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <span className="text-xs text-slate-500">Selecciona un icono rápido o escribe tu emoji preferido:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80 max-h-24 overflow-y-auto">
                  {PRESET_ICONS.map((iconEmoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconEmoji })}
                      className={`text-lg p-1.5 rounded-lg transition-all ${
                        formData.icon === iconEmoji 
                          ? 'bg-teal-500 text-white shadow-sm scale-110' 
                          : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {iconEmoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Comercial (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explica qué tipo de productos incluye esta categoría para guiar a los clientes en la tienda..."
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Display Order & Active status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Orden de Visualización
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Número menor aparece primero en el menú.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visibilidad en Tienda
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                      formData.active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>{formData.active ? 'Visible y Activa' : 'Oculta / Borrador'}</span>
                    {formData.active ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-teal-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{modalMode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* ========================================================================= */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">¿Eliminar categoría?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Estás a punto de eliminar la categoría <strong className="text-slate-900">"{categoryToDelete.name}"</strong>.
                </p>
              </div>
            </div>

            {(categoryToDelete.productCount || 0) > 0 && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <AlertCircle size={16} />
                  <span>Esta categoría tiene {categoryToDelete.productCount} producto(s) asignados</span>
                </div>
                <p className="text-amber-700 text-[11px]">
                  Selecciona a qué categoría deseas reasignar estos productos para no dejarlos huérfanos:
                </p>
                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(Number(e.target.value) || '')}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs font-bold text-slate-800"
                >
                  <option value="">Reasignar a categoría por defecto...</option>
                  {categories.filter(c => c.id !== categoryToDelete.id).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCategoryToDelete(null);
                  setReassignCategoryId('');
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Sí, Eliminar</span>
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
