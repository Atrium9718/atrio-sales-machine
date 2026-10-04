import React, { useState } from 'react';
import { 
  Palette, 
  Menu as MenuIcon, 
  Megaphone, 
  Globe, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  Eye,
  Sliders,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  FileText,
  Layout
} from 'lucide-react';
import { useCms } from '../../contexts/CmsContext';
import { NavigationMenuItem, FooterColumnConfig } from '../../types/cms';
import CmsPagesManager from './CmsPagesManager';

export default function CmsAdminManager() {
  const { config, reloadConfig, updateConfig, isLoading } = useCms();
  const [mainMode, setMainMode] = useState<'pages' | 'global'>('pages');
  const [activeSection, setActiveSection] = useState<'branding' | 'navigation' | 'announcements' | 'footer'>('branding');
  const [formState, setFormState] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  // Sync state if config reloaded
  React.useEffect(() => {
    setFormState(config);
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const success = await updateConfig(formState);
      if (success) {
        setFeedback({ type: 'success', message: '¡Configuración del CMS y Marca actualizada en vivo en todo el portal!' });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: 'Ocurrió un error al guardar los ajustes.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Error de conexión: ' + e.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Nav helpers
  const handleAddNavItem = () => {
    const newItem: NavigationMenuItem = {
      id: 'nav-' + Date.now(),
      label: 'Nuevo Enlace',
      url: '/',
      type: 'link',
      displayOrder: formState.headerNav.length + 1,
      active: true,
    };
    setFormState({
      ...formState,
      headerNav: [...formState.headerNav, newItem],
    });
  };

  const handleRemoveNavItem = (id: string) => {
    setFormState({
      ...formState,
      headerNav: formState.headerNav.filter(item => item.id !== id),
    });
  };

  const handleMoveNavItem = (index: number, direction: 'up' | 'down') => {
    const items = [...formState.headerNav];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    // reindex displayOrder
    items.forEach((it, idx) => {
      it.displayOrder = idx + 1;
    });

    setFormState({
      ...formState,
      headerNav: items,
    });
  };

  const handleUpdateNavItem = (id: string, updates: Partial<NavigationMenuItem>) => {
    setFormState({
      ...formState,
      headerNav: formState.headerNav.map(item => item.id === id ? { ...item, ...updates } : item),
    });
  };

  // Footer helpers
  const handleAddFooterLink = (colId: string) => {
    setFormState({
      ...formState,
      footerColumns: formState.footerColumns.map(col => {
        if (col.id === colId) {
          return {
            ...col,
            links: [
              ...col.links,
              { id: 'f-link-' + Date.now(), label: 'Nuevo Enlace', url: '/' }
            ]
          };
        }
        return col;
      })
    });
  };

  const handleRemoveFooterLink = (colId: string, linkId: string) => {
    setFormState({
      ...formState,
      footerColumns: formState.footerColumns.map(col => {
        if (col.id === colId) {
          return {
            ...col,
            links: col.links.filter(l => l.id !== linkId)
          };
        }
        return col;
      })
    });
  };

  const handleUpdateFooterLink = (colId: string, linkId: string, updates: any) => {
    setFormState({
      ...formState,
      footerColumns: formState.footerColumns.map(col => {
        if (col.id === colId) {
          return {
            ...col,
            links: col.links.map(l => l.id === linkId ? { ...l, ...updates } : l)
          };
        }
        return col;
      })
    });
  };

  const handleUpdateFooterColTitle = (colId: string, title: string) => {
    setFormState({
      ...formState,
      footerColumns: formState.footerColumns.map(col => col.id === colId ? { ...col, title } : col)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Module Selector (Phase 1 vs Phase 2) */}
      <div className="bg-slate-900 text-white p-2 rounded-2xl flex items-center gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setMainMode('pages')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all ${
            mainMode === 'pages'
              ? 'bg-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>📄 Gestor de Páginas & Bloques (Visual Page Builder)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMode('global')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all ${
            mainMode === 'global'
              ? 'bg-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders size={16} />
          <span>🎨 Marca, Cabecera, Cintillo & Pie de Página (Global)</span>
        </button>
      </div>

      {mainMode === 'pages' ? (
        <CmsPagesManager />
      ) : (
        <div className="space-y-6">
          {/* Header CMS Sub-Manager */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
                <Sliders size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">CMS & Gestor Global de Marca</h2>
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                    Control Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Personaliza identidad visual, logotipo, navegación, cintillo superior y enlaces del pie de página sin tocar código.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={reloadConfig}
                disabled={isLoading || isSaving}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Recargar configuración"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin text-teal-600' : ''} />
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Guardar y Publicar CMS</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alerta de Feedback */}
          {feedback && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 animate-scale-in ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-rose-600 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Selector de Sección CMS */}
          <div className="flex gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection('branding')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSection === 'branding' 
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Palette size={16} className={activeSection === 'branding' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Identidad de Marca & Contacto</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('navigation')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSection === 'navigation' 
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <MenuIcon size={16} className={activeSection === 'navigation' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Menú de Cabecera (Header)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('announcements')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSection === 'announcements' 
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Megaphone size={16} className={activeSection === 'announcements' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Cintillo & Barra Superior</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('footer')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSection === 'footer' 
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Globe size={16} className={activeSection === 'footer' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Pie de Página (Footer)</span>
            </button>
          </div>

      {/* 1. SECCIÓN: IDENTIDAD DE MARCA Y CONTACTO */}
      {activeSection === 'branding' && (
        <div className="space-y-6 animate-scale-in">
          {/* Card: Textos y Nombres */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Palette size={18} className="text-teal-600" />
              <span>Nombres y Logotipos de la Empresa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre Principal de la Empresa</label>
                <input
                  type="text"
                  value={formState.branding.siteName}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, siteName: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Ej: Fusión Comunicación Gráfica"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Eslogan / Subtítulo Corto</label>
                <input
                  type="text"
                  value={formState.branding.siteTagline}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, siteTagline: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Ej: Gráfica W2P"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">URL de Logotipo (Fondo Claro / Navbar)</label>
                <input
                  type="text"
                  value={formState.branding.logoLightUrl}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, logoLightUrl: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="https://ejemplo.com/logo-principal.png (Opcional - usa icono por defecto si está vacío)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Distintivo de Calidad (Garantía)</label>
                <input
                  type="text"
                  value={formState.branding.guaranteeBadgeText}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, guaranteeBadgeText: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Ej: Calidad Garantizada 300 DPI CTP"
                />
              </div>
            </div>

            {/* Selector de Colores Institucionales */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                Paleta de Colores de la Marca
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Color Primario</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formState.branding.primaryColor}</span>
                  </div>
                  <input
                    type="color"
                    value={formState.branding.primaryColor}
                    onChange={(e) => setFormState({
                      ...formState,
                      branding: { ...formState.branding, primaryColor: e.target.value }
                    })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Color Secundario / Fondo</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formState.branding.secondaryColor}</span>
                  </div>
                  <input
                    type="color"
                    value={formState.branding.secondaryColor}
                    onChange={(e) => setFormState({
                      ...formState,
                      branding: { ...formState.branding, secondaryColor: e.target.value }
                    })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Color de Acento / Promociones</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formState.branding.accentColor}</span>
                  </div>
                  <input
                    type="color"
                    value={formState.branding.accentColor}
                    onChange={(e) => setFormState({
                      ...formState,
                      branding: { ...formState.branding, accentColor: e.target.value }
                    })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Datos de Contacto y Ubicación */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Phone size={18} className="text-teal-600" />
              <span>Datos de Contacto, Atención y Despachos</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono PBX / Fijo</label>
                <input
                  type="text"
                  value={formState.branding.phone}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, phone: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="+57 324 3917169"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Número de WhatsApp (Sin signos ni espacios)</label>
                <input
                  type="text"
                  value={formState.branding.whatsapp}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, whatsapp: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="573243917169"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico Comercial</label>
                <input
                  type="email"
                  value={formState.branding.email}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, email: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="comercial@fusioncg.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Dirección Litográfica Principal</label>
                <input
                  type="text"
                  value={formState.branding.address}
                  onChange={(e) => setFormState({
                    ...formState,
                    branding: { ...formState.branding, address: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Cra. 22 #24 - 47, Centro"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ciudad y Departamento</label>
                <input
                  type="text"
                  value={`${formState.branding.city}, ${formState.branding.department}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setFormState({
                      ...formState,
                      branding: {
                        ...formState.branding,
                        city: parts[0]?.trim() || '',
                        department: parts[1]?.trim() || formState.branding.department,
                      }
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Manizales, Caldas"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: MENÚ DE CABECERA (HEADER NAV BUILDER) */}
      {activeSection === 'navigation' && (
        <div className="space-y-6 animate-scale-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Constructor de Menú Principal (Navbar)</h3>
                <p className="text-xs text-slate-500">Agrega, reordena y personaliza los enlaces visibles en la cabecera y el cajón móvil.</p>
              </div>
              <button
                type="button"
                onClick={handleAddNavItem}
                className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus size={15} />
                <span>Agregar Enlace</span>
              </button>
            </div>

            <div className="space-y-3">
              {formState.headerNav.map((item, idx) => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.active ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Botones de mover */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveNavItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 border border-slate-200 shadow-2xs"
                        title="Subir posición"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveNavItem(idx, 'down')}
                        disabled={idx === formState.headerNav.length - 1}
                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 border border-slate-200 shadow-2xs"
                        title="Bajar posición"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Texto del Enlace</label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleUpdateNavItem(item.id, { label: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Ruta / Destino (URL)</label>
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateNavItem(item.id, { url: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-500 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Insignia / Badge</label>
                          <input
                            type="text"
                            value={item.badge || ''}
                            onChange={(e) => handleUpdateNavItem(item.id, { 
                              badge: e.target.value,
                              type: e.target.value ? 'highlight_badge' : 'link'
                            })}
                            placeholder="Ej: PRO, DTO, NUEVO"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-teal-700 outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleUpdateNavItem(item.id, { active: !item.active })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        item.active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.active ? 'Activo' : 'Pausado'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveNavItem(item.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Eliminar elemento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: CINTILLO Y BARRA SUPERIOR (ANNOUNCEMENT TOP BAR) */}
      {activeSection === 'announcements' && (
        <div className="space-y-6 animate-scale-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Cintillo Superior de Avisos & Envíos</h3>
                <p className="text-xs text-slate-500">Muestra promociones, avisos de despacho o estados de entrega en la barra superior del portal.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Estado de la Barra:</span>
                <button
                  type="button"
                  onClick={() => setFormState({
                    ...formState,
                    topBar: { ...formState.topBar, enabled: !formState.topBar.enabled }
                  })}
                  className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                    formState.topBar.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </button>
              </div>
            </div>

            {/* Vista Previa en Vivo */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Simulación en Vivo de la Barra</span>
              <div 
                className="py-2.5 px-4 rounded-2xl flex items-center justify-between text-xs font-medium shadow-xs transition-all"
                style={{
                  backgroundColor: formState.topBar.bgType === 'COLOR' ? formState.topBar.bgColor : undefined,
                  backgroundImage: formState.topBar.bgType === 'GRADIENT' 
                    ? `linear-gradient(90deg, ${formState.topBar.gradientFrom}, ${formState.topBar.gradientTo})` 
                    : undefined,
                  color: formState.topBar.textColor
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  {formState.topBar.badgeTag && (
                    <span className="bg-teal-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      {formState.topBar.badgeTag}
                    </span>
                  )}
                  <span className="truncate">{formState.topBar.text}</span>
                </div>

                {formState.topBar.linkText && (
                  <span className="text-teal-300 font-bold underline shrink-0 text-[11px] ml-2">
                    {formState.topBar.linkText} →
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Texto del Aviso</label>
                <input
                  type="text"
                  value={formState.topBar.text}
                  onChange={(e) => setFormState({
                    ...formState,
                    topBar: { ...formState.topBar, text: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Envíos nacionales a toda Colombia | Impresión Litográfica y Gran Formato"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Etiqueta de Destacado (Tag)</label>
                <input
                  type="text"
                  value={formState.topBar.badgeTag || ''}
                  onChange={(e) => setFormState({
                    ...formState,
                    topBar: { ...formState.topBar, badgeTag: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Ej: ENVÍO NACIONAL, 50% OFF"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Texto del Botón / Enlace</label>
                <input
                  type="text"
                  value={formState.topBar.linkText || ''}
                  onChange={(e) => setFormState({
                    ...formState,
                    topBar: { ...formState.topBar, linkText: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="Rastrear Pedido"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ruta del Enlace</label>
                <input
                  type="text"
                  value={formState.topBar.linkUrl || ''}
                  onChange={(e) => setFormState({
                    ...formState,
                    topBar: { ...formState.topBar, linkUrl: e.target.value }
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-mono"
                  placeholder="/rastreo"
                />
              </div>
            </div>

            {/* Estilo de Fondo */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                Estilo de Color de la Barra
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de Fondo</label>
                  <select
                    value={formState.topBar.bgType}
                    onChange={(e: any) => setFormState({
                      ...formState,
                      topBar: { ...formState.topBar, bgType: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:bg-white outline-none"
                  >
                    <option value="COLOR">Color Sólido</option>
                    <option value="GRADIENT">Degradado Lineal</option>
                  </select>
                </div>

                {formState.topBar.bgType === 'COLOR' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Color de Fondo</label>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={formState.topBar.bgColor}
                        onChange={(e) => setFormState({
                          ...formState,
                          topBar: { ...formState.topBar, bgColor: e.target.value }
                        })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold text-slate-700">{formState.topBar.bgColor}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Degradado Desde</label>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="color"
                          value={formState.topBar.gradientFrom}
                          onChange={(e) => setFormState({
                            ...formState,
                            topBar: { ...formState.topBar, gradientFrom: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700">{formState.topBar.gradientFrom}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Degradado Hasta</label>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="color"
                          value={formState.topBar.gradientTo}
                          onChange={(e) => setFormState({
                            ...formState,
                            topBar: { ...formState.topBar, gradientTo: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700">{formState.topBar.gradientTo}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN: COLUMNAS DEL FOOTER */}
      {activeSection === 'footer' && (
        <div className="space-y-6 animate-scale-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900">Gestor de Enlaces del Pie de Página (Footer)</h3>
              <p className="text-xs text-slate-500">Configura los títulos de las columnas y la lista de accesos directos visibles en el pie de página de la tienda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {formState.footerColumns.map((col) => (
                <div key={col.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Título de la Columna</label>
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => handleUpdateFooterColTitle(col.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">Enlaces ({col.links.length})</span>
                      <button
                        type="button"
                        onClick={() => handleAddFooterLink(col.id)}
                        className="text-teal-600 hover:text-teal-800 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span>Agregar</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {col.links.map((link) => (
                        <div key={link.id} className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={link.label}
                              onChange={(e) => handleUpdateFooterLink(col.id, link.id, { label: e.target.value })}
                              className="w-full text-xs font-bold text-slate-800 bg-transparent border-0 outline-none"
                              placeholder="Nombre del enlace"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFooterLink(col.id, link.id)}
                              className="text-rose-400 hover:text-rose-600 p-1"
                              title="Borrar enlace"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => handleUpdateFooterLink(col.id, link.id, { url: e.target.value })}
                            className="w-full text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 outline-none font-mono"
                            placeholder="/categoria/papeleria"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

