import React, { useState, useEffect } from 'react';
import BannerForm from './BannerForm';
import PopupsTab from './PopupsTab';
import BannerAiGeneratorModal from './BannerAiGeneratorModal';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  Sparkles, 
  Layers, 
  Gift, 
  Eye, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal,
  Monitor,
  Smartphone,
  Check,
  RefreshCw,
  Zap,
  ArrowRight,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ANIMATION_OPTIONS, READY_BANNER_TEMPLATES } from './bannerPresets';

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'banners' | 'popups' | 'templates'>('banners');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [placementFilter, setPlacementFilter] = useState<string>('ALL');
  const [previewingBanner, setPreviewingBanner] = useState<any | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  
  // Custom non-blocking Delete Modal State
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { token } = useAuth();

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const notifyStorefrontUpdate = () => {
    try {
      window.dispatchEvent(new CustomEvent('banners-updated'));
      localStorage.setItem('last_banner_update', Date.now().toString());
    } catch (e) {
      console.error('Error dispatching banners-updated:', e);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  const fetchBanners = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/admin/banners', { headers });
      if (res.ok) {
        const data = await res.json();
        const formatted = (data || []).map((b: any) => ({
          ...b,
          startDate: b.startDate ? b.startDate.split('T')[0] : '',
          endDate: b.endDate ? b.endDate.split('T')[0] : ''
        }));
        setBanners(formatted);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      const isEdit = Boolean(editingBanner?.id);
      const url = isEdit ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = isEdit ? 'PUT' : 'POST';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(data)
      });

      if (res.ok) {
        await fetchBanners();
        notifyStorefrontUpdate();
        setIsFormOpen(false);
        setEditingBanner(null);
        showToast(isEdit ? 'Banner actualizado exitosamente' : 'Banner creado y publicado');
      } else {
        let errMessage = 'Error al guardar el banner';
        try {
          const errData = await res.json();
          errMessage = errData.message || errData.error || errMessage;
        } catch {
          const errText = await res.text();
          if (errText) errMessage = errText;
        }
        showToast(errMessage, 'error');
      }
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      showToast('Error de conexión al guardar el banner', 'error');
    }
  };

  const openDeleteModal = (banner: any) => {
    setDeleteConfirmBanner(banner);
  };

  const executeDelete = async () => {
    if (!deleteConfirmBanner) return;
    const bannerId = deleteConfirmBanner.id;
    setIsDeleting(true);

    // Optimistic UI update
    setBanners(prev => prev.filter(b => b.id !== bannerId));

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        notifyStorefrontUpdate();
        showToast('Banner eliminado correctamente');
        setDeleteConfirmBanner(null);
      } else {
        // Revert on error
        await fetchBanners();
        showToast('No se pudo eliminar el banner en el servidor', 'error');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      await fetchBanners();
      showToast('Error de red al eliminar el banner', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmBanner(null);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    setActionLoadingId(id);
    // Optimistic UI update
    setBanners(prev => prev.map(b => b.id === id ? { ...b, active, isActive: active } : b));
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/admin/banners/${id}/toggle`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ active })
      });

      if (res.ok) {
        notifyStorefrontUpdate();
        showToast(active ? 'Banner activado' : 'Banner pausado');
      } else {
        // Revert
        setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !active, isActive: !active } : b));
        showToast('Error al cambiar estado del banner', 'error');
      }
    } catch (e) {
      console.error(e);
      setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !active, isActive: !active } : b));
      showToast('Error de conexión', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    setActionLoadingId(id);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/admin/banners/${id}/duplicate`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        await fetchBanners();
        notifyStorefrontUpdate();
        showToast('Banner duplicado como borrador');
      } else {
        showToast('Error al duplicar el banner', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de red al duplicar', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Re-ordering logic that safely handles filtered lists
  const handleMoveOrder = async (bannerId: number, direction: 'up' | 'down') => {
    const list = [...standardBanners];
    const currentIndex = list.findIndex(b => b.id === bannerId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const currentBanner = list[currentIndex];
    const targetBanner = list[targetIndex];

    // Swap in the displayed list
    list[currentIndex] = targetBanner;
    list[targetIndex] = currentBanner;

    // Build new full list with updated orders
    const updatedFullBanners = banners.map(b => {
      const foundInList = list.findIndex(item => item.id === b.id);
      if (foundInList !== -1) {
        return { ...b, displayOrder: foundInList + 1 };
      }
      return b;
    });

    setBanners(updatedFullBanners);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bannerIds: list.map(b => b.id)
        })
      });
      notifyStorefrontUpdate();
      showToast('Orden actualizado');
    } catch (e) {
      console.error('Error updating order:', e);
    }
  };

  // Filtered standard banners
  const standardBanners = banners.filter(b => {
    if (b.isPopup || b.placement === 'popup_modal') return false;
    if (placementFilter === 'ALL') return true;
    return b.placement === placementFilter;
  });

  const heroBannersCount = banners.filter(b => b.placement === 'hero' && b.active).length;
  const partnerBannersCount = banners.filter(b => b.placement === 'partner' && b.active).length;
  const popupsCount = banners.filter(b => (b.isPopup || b.placement === 'popup_modal') && b.active).length;

  const getPlacementBadge = (placement: string) => {
    switch (placement) {
      case 'partner':
        return <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-black uppercase">🤝 Aliado Atrio</span>;
      case 'top_bar':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">📌 Barra Superior</span>;
      case 'category':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">📁 Catálogo</span>;
      case 'floating':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">📍 Flotante</span>;
      case 'hero':
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200 text-[10px] font-black uppercase">🌟 Hero Portada</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
        <span className="text-sm font-bold text-slate-700">Cargando Módulo de Banners & Marketing Visual...</span>
        <span className="text-xs text-slate-400 mt-1">Optimizando capas y fotografía litográfica</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 relative">

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 ${
          toastMessage.type === 'success'
            ? 'bg-slate-900 text-white border-teal-500/50 shadow-teal-500/10'
            : 'bg-rose-900 text-white border-rose-500/50'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}
      
      {/* 1. Header & KPI Metrics */}
      <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-xs font-black text-teal-300 uppercase tracking-wider">
                Módulo de Marketing Visual & Banners W2P
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestión de Banners, Alianzas & Popups
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1 max-w-2xl">
              Diseña y personaliza carruseles de alta fidelidad, banners de aliados estratégicos (Atrio Agencia), barras de avisos y ventanas emergentes con IA Gemini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-750 text-teal-300 px-4 py-3 rounded-full text-xs font-black flex items-center gap-2 border border-teal-500/30 transition-transform active:scale-95 cursor-pointer shadow-sm"
            >
              <Sparkles size={15} className="text-teal-400" />
              <span>Estudio IA Gemini</span>
            </button>

            <button 
              type="button"
              onClick={() => { setEditingBanner(null); setIsFormOpen(true); }}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 rounded-full text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Crear Nuevo Banner</span>
            </button>
          </div>

        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Banners</span>
            <span className="text-xl font-black text-white font-mono">{banners.length}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">Hero Home Activos</span>
            <span className="text-xl font-black text-teal-300 font-mono">{heroBannersCount}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">Aliados (Atrio)</span>
            <span className="text-xl font-black text-indigo-300 font-mono">{partnerBannersCount}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Popups Activos</span>
            <span className="text-xl font-black text-amber-300 font-mono">{popupsCount}</span>
          </div>
        </div>

      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('banners'); setIsFormOpen(false); }}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'banners' && !isFormOpen
              ? 'bg-teal-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={16} />
          <span>Banners del Sitio ({banners.filter(b => !b.isPopup && b.placement !== 'popup_modal').length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('popups'); setIsFormOpen(false); }}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'popups' && !isFormOpen
              ? 'bg-teal-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Gift size={16} />
          <span>Ventanas Emergentes & Cupones ({banners.filter(b => b.isPopup || b.placement === 'popup_modal').length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('templates'); setIsFormOpen(false); }}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'templates' && !isFormOpen
              ? 'bg-teal-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap size={16} className="text-amber-500" />
          <span>Plantillas de Imprenta & Alianzas ({READY_BANNER_TEMPLATES.length})</span>
        </button>
      </div>

      {/* 3. CONDITIONAL VIEW: CREATE / EDIT FORM */}
      {isFormOpen ? (
        <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-black uppercase">
                  {editingBanner ? 'Modo Edición' : 'Nuevo Banner'}
                </span>
                <span className="text-xs font-bold text-slate-400">Canva Studio W2P</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                {editingBanner ? `Editando: ${editingBanner.title}` : 'Diseñar Nuevo Banner o Promoción'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingBanner(null); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              ← Volver al Listado
            </button>
          </div>

          <BannerForm 
            initialData={editingBanner}
            onCancel={() => { setIsFormOpen(false); setEditingBanner(null); }}
            onSubmit={handleSave}
          />
        </div>
      ) : (
        <>
          {/* TAB 1: BANNERS LIST */}
          {activeTab === 'banners' && (
            <div className="space-y-4">
              
              {/* Filter Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Filtrar por Ubicación:</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'hero', label: 'Hero Portada' },
                    { id: 'partner', label: 'Aliado Atrio' },
                    { id: 'top_bar', label: 'Barra Superior' },
                    { id: 'category', label: 'Catálogo' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPlacementFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        placementFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banners Grid / List */}
              <div className="bg-white rounded-[28px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3.5 px-4 text-xs font-black text-slate-500 uppercase tracking-wider w-20">Orden</th>
                        <th className="py-3.5 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Visual & Capa</th>
                        <th className="py-3.5 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Titular & Destino</th>
                        <th className="py-3.5 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Ubicación</th>
                        <th className="py-3.5 px-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="py-3.5 px-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {standardBanners.map((banner, index) => {
                        const isAct = banner.active ?? true;
                        const animLabel = ANIMATION_OPTIONS.find(a => a.value === banner.animationType)?.label || banner.animationType || 'Fade';
                        const hasMobile = Boolean(banner.mobileImageUrl);
                        const isRowBusy = actionLoadingId === banner.id;
                        
                        return (
                          <tr key={banner.id} className="hover:bg-slate-50/80 transition-colors group">
                            
                            {/* Order Controls */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-slate-700 w-5">
                                  #{index + 1}
                                </span>
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOrder(banner.id, 'up')}
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-20 cursor-pointer transition-colors"
                                    title="Subir prioridad"
                                  >
                                    <ArrowUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOrder(banner.id, 'down')}
                                    disabled={index === standardBanners.length - 1}
                                    className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-20 cursor-pointer transition-colors"
                                    title="Bajar prioridad"
                                  >
                                    <ArrowDown size={12} />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Visual Thumbnail */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div
                                className="h-16 w-32 rounded-xl overflow-hidden shadow-xs border border-slate-200 relative flex items-center justify-center cursor-pointer group/thumb"
                                onClick={() => setPreviewingBanner(banner)}
                                style={{
                                  backgroundColor: banner.bgColor || '#0f172a',
                                  backgroundImage: banner.bgType === 'GRADIENT' ? `linear-gradient(135deg, ${banner.gradientFrom || '#042f2e'}, ${banner.gradientTo || '#0f766e'})` : undefined
                                }}
                              >
                                {banner.bgType !== 'GRADIENT' && banner.bgType !== 'COLOR' && banner.desktopImageUrl ? (
                                  <img className="h-full w-full object-cover" src={banner.desktopImageUrl} alt={banner.title} />
                                ) : (
                                  <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-slate-950/60">
                                    {banner.bgType === 'GRADIENT' ? 'Degradado' : 'Color Sólido'}
                                  </span>
                                )}

                                {/* Overlay preview badge */}
                                <div className="absolute top-1 right-1 flex gap-0.5">
                                  {hasMobile && (
                                    <span className="p-0.5 bg-amber-500 text-slate-950 rounded text-[9px]" title="Tiene versión adaptada para Celular">
                                      <Smartphone size={10} />
                                    </span>
                                  )}
                                </div>

                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white gap-1">
                                  <Eye size={16} />
                                  <span className="text-[10px] font-bold">Ver</span>
                                </div>
                              </div>
                            </td>

                            {/* Headline & Details */}
                            <td className="py-4 px-4 max-w-xs">
                              <div className="flex items-center gap-1.5 mb-1">
                                {banner.tag && (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black uppercase truncate max-w-[160px]">
                                    {banner.tag}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  Anim: {animLabel.split(' ')[0]}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{banner.title || 'Sin Título'}</div>
                              <div className="text-[11px] font-medium text-slate-500 line-clamp-1">{banner.subtitle || 'Sin subtítulo'}</div>
                              <div className="text-[10px] text-teal-700 font-mono mt-0.5 truncate">
                                🔗 {banner.linkUrl || banner.link || '/'}
                              </div>
                            </td>

                            {/* Placement */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {getPlacementBadge(banner.placement)}
                            </td>

                            {/* Active Switch */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggle(banner.id, !isAct)}
                                disabled={isRowBusy}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                  isAct ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {isRowBusy ? (
                                  <Loader2 size={14} className="animate-spin text-slate-500" />
                                ) : isAct ? (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                  <XCircle size={14} className="text-slate-400" />
                                )}
                                <span>{isAct ? 'Activo' : 'Pausado'}</span>
                              </button>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  type="button"
                                  onClick={() => setPreviewingBanner(banner)}
                                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Previsualizar en Vivo"
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDuplicate(banner.id)}
                                  disabled={isRowBusy}
                                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Duplicar Banner"
                                >
                                  <Copy size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => { setEditingBanner(banner); setIsFormOpen(true); }}
                                  className="text-slate-400 hover:text-teal-700 p-2 rounded-xl hover:bg-teal-50 transition-colors cursor-pointer"
                                  title="Editar Banner"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => openDeleteModal(banner)}
                                  className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Eliminar Banner"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {standardBanners.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-sm font-bold">No hay banners en esta categoría.</p>
                    <button
                      type="button"
                      onClick={() => setPlacementFilter('ALL')}
                      className="mt-2 text-xs text-teal-600 font-bold underline cursor-pointer"
                    >
                      Mostrar todos los banners
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POPUPS */}
          {activeTab === 'popups' && (
            <PopupsTab
              banners={banners}
              onOpenCreate={() => {
                setEditingBanner({
                  placement: 'popup_modal',
                  isPopup: true,
                  title: '¡15% OFF en tu Primer Pedido!',
                  subtitle: 'Aplica para libros, revistas, empaques y papelería comercial litográfica.',
                  tag: 'Cupón de Bienvenida',
                  ctaText: 'Aprovechar Descuento',
                  bgType: 'GRADIENT',
                  gradientFrom: '#042f2e',
                  gradientTo: '#0f766e',
                  popupConfig: {
                    trigger: 'delay',
                    delaySeconds: 4,
                    couponCode: 'FUSION15',
                    discountValue: '15% OFF',
                    showOncePerSession: true,
                    confetti: true
                  }
                });
                setIsFormOpen(true);
              }}
              onEdit={(b) => { setEditingBanner(b); setIsFormOpen(true); }}
              onDelete={(p) => openDeleteModal(p)}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* TAB 3: READY TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-xs">
                <h3 className="text-lg font-black text-slate-900 mb-1">
                  Catálogo de Plantillas Litográficas & Alianzas Estratégicas
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Haz clic en "Usar Plantilla" para abrir el editor con imágenes 300 DPI, colores corporativos y textos optimizados.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {READY_BANNER_TEMPLATES.map((tpl) => (
                    <div key={tpl.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div
                          className="h-36 relative overflow-hidden flex items-center justify-center text-white"
                          style={{
                            backgroundColor: tpl.bgColor,
                            backgroundImage: tpl.bgType === 'GRADIENT' ? `linear-gradient(135deg, ${tpl.gradientFrom}, ${tpl.gradientTo})` : undefined
                          }}
                        >
                          {tpl.desktopImageUrl && (
                            <img src={tpl.desktopImageUrl} alt={tpl.name} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-slate-950/50" />
                          <div className="absolute bottom-3 left-4 right-4 z-10">
                            <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 text-[9px] font-black uppercase">
                              {tpl.category}
                            </span>
                            <h4 className="text-sm font-black text-white truncate mt-1">{tpl.title}</h4>
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">{tpl.description}</p>
                          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                            <span>Ubicación: <strong className="text-slate-800">{tpl.placement}</strong></span>
                            <span>•</span>
                            <span>Anim: <strong className="text-slate-800">{tpl.animationType}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBanner(tpl);
                            setIsFormOpen(true);
                          }}
                          className="w-full py-2.5 bg-slate-900 hover:bg-teal-500 hover:text-slate-950 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Usar Esta Plantilla</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. FULL-SCREEN LIVE BANNER PREVIEW MODAL */}
      {previewingBanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[32px] max-w-4xl w-full p-6 text-white shadow-2xl border border-slate-800 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-teal-400" />
                <h3 className="font-black text-sm">Vista Previa: {previewingBanner.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      previewDevice === 'desktop' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor size={13} />
                    <span>Desktop (16:9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      previewDevice === 'mobile' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={13} />
                    <span>Celular (9:16)</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingBanner(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex justify-center py-4">
              <div
                className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 min-h-[280px] flex items-center ${
                  previewDevice === 'desktop' ? 'w-full min-h-[320px]' : 'w-[320px] min-h-[400px] border-4 border-slate-700'
                }`}
                style={{
                  backgroundColor: previewingBanner.bgColor || '#0f172a',
                  backgroundImage: previewingBanner.bgType === 'GRADIENT'
                    ? `linear-gradient(135deg, ${previewingBanner.gradientFrom || '#042f2e'}, ${previewingBanner.gradientTo || '#0f766e'})`
                    : undefined
                }}
              >
                {(previewingBanner.desktopImageUrl || previewingBanner.mobileImageUrl) && (
                  <img
                    src={
                      previewDevice === 'mobile' && previewingBanner.mobileImageUrl
                        ? previewingBanner.mobileImageUrl
                        : (previewingBanner.desktopImageUrl || previewingBanner.mobileImageUrl)
                    }
                    alt={previewingBanner.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: previewingBanner.extraConfig?.overlayType === 'VIGNETTE'
                      ? 'linear-gradient(90deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.65) 45%, transparent 100%)'
                      : `linear-gradient(${previewingBanner.extraConfig?.overlayDirection || '135deg'}, ${previewingBanner.gradientFrom || '#042f2e'}, ${previewingBanner.gradientTo || '#0f766e'})`,
                    opacity: Number(previewingBanner.overlayOpacity || 50) / 100
                  }}
                />

                <div className="relative z-10 p-8 w-full max-w-xl">
                  {previewingBanner.tag && (
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2"
                      style={{
                        backgroundColor: previewingBanner.extraConfig?.tagBgColor || '#14b8a6',
                        color: previewingBanner.extraConfig?.tagTextColor || '#022c22'
                      }}
                    >
                      {previewingBanner.tag}
                    </span>
                  )}
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-2 leading-tight">
                    {previewingBanner.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 mb-4 line-clamp-3">
                    {previewingBanner.subtitle}
                  </p>
                  <span
                    className="inline-flex items-center px-5 py-2.5 rounded-full font-black text-xs shadow-md"
                    style={{
                      backgroundColor: previewingBanner.extraConfig?.ctaBgColor || '#14b8a6',
                      color: previewingBanner.extraConfig?.ctaTextColor || '#022c22'
                    }}
                  >
                    {previewingBanner.ctaText || 'Ver Más'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const b = previewingBanner;
                  setPreviewingBanner(null);
                  setEditingBanner(b);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Edit size={14} />
                <span>Editar Este Banner</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. DEDICATED DELETE CONFIRMATION MODAL (Non-blocking & iFrame safe) */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  ¿Eliminar este banner?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Esta acción eliminará el elemento de la tienda de forma permanente.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div 
                className="w-16 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center"
                style={{
                  backgroundImage: deleteConfirmBanner.bgType === 'GRADIENT' ? `linear-gradient(135deg, ${deleteConfirmBanner.gradientFrom || '#042f2e'}, ${deleteConfirmBanner.gradientTo || '#0f766e'})` : undefined
                }}
              >
                {deleteConfirmBanner.desktopImageUrl ? (
                  <img src={deleteConfirmBanner.desktopImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-white uppercase">{deleteConfirmBanner.placement}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                  {deleteConfirmBanner.placement}
                </span>
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {deleteConfirmBanner.title || 'Sin Título'}
                </h4>
                <span className="text-[10px] text-slate-400 truncate block">
                  ID: #{deleteConfirmBanner.id}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmBanner(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-rose-600/20 transition-transform active:scale-95 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Sí, Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. AI GENERATOR MODAL */}
      <BannerAiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={(data) => {
          setEditingBanner({
            title: data.title || 'Impresión Litográfica de Alta Precisión',
            subtitle: data.subtitle || 'Tecnología Offset y Digital a 300 DPI.',
            tag: data.tag || 'Web-To-Print',
            ctaText: data.ctaText || 'Cotizar Ahora',
            bgType: 'IMAGE',
            desktopImageUrl: data.imageUrl,
            placement: 'hero',
            animationType: 'fade',
            active: true
          });
          setIsFormOpen(true);
        }}
      />

    </div>
  );
}
