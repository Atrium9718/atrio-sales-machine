import React, { useState, useEffect } from 'react';
import { SeoMetadataItem, SeoCheckResult, SeoTargetType } from '../../types/media';
import MediaPickerModal from '../media/MediaPickerModal';
import {
  Globe,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Share2,
  ExternalLink,
  Save,
  RefreshCw,
  Eye,
  Copy,
  Layers,
  Smartphone,
  Monitor,
  Code,
  Image as ImageIcon,
  Check,
  Tag,
  ShieldCheck,
  Loader2,
  FileText,
  Package,
  HelpCircle
} from 'lucide-react';

export default function SeoManagerPage() {
  const [seoItems, setSeoItems] = useState<SeoMetadataItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>('seo-home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview Mode
  const [previewTab, setPreviewTab] = useState<'google' | 'social' | 'schema'>('google');
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Media Picker Modal for OG Image
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // New Keyword input
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const activeItem = seoItems.find(i => i.id === activeItemId) || seoItems[0] || null;

  useEffect(() => {
    fetchSeoData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSeoData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seo');
      if (res.ok) {
        const data = await res.json();
        setSeoItems(data);
        if (data.length > 0 && !activeItemId) {
          setActiveItemId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching SEO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof SeoMetadataItem, value: any) => {
    if (!activeItem) return;
    const updated = { ...activeItem, [field]: value };
    setSeoItems(prev => prev.map(item => item.id === activeItem.id ? updated : item));
  };

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newKeywordInput.trim() || !activeItem) return;

    const clean = newKeywordInput.trim().toLowerCase();
    if (!activeItem.keywords.includes(clean)) {
      handleFieldChange('keywords', [...activeItem.keywords, clean]);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    if (!activeItem) return;
    handleFieldChange('keywords', activeItem.keywords.filter(k => k !== kwToRemove));
  };

  const handleSaveSeo = async () => {
    if (!activeItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/seo/${activeItem.targetType}/${activeItem.targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeItem),
      });

      if (res.ok) {
        const data = await res.json();
        setSeoItems(prev => prev.map(item => item.id === activeItem.id ? data.item : item));
        showToast('¡Metadatos SEO y Open Graph guardados exitosamente!');
      }
    } catch (err) {
      console.error('Error saving SEO:', err);
      showToast('Error al guardar configuración SEO');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAiSeo = async () => {
    if (!activeItem) return;
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/seo-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle: activeItem.pageTitle || activeItem.targetName,
          pageType: activeItem.targetType,
          contentSummary: activeItem.metaDescription || activeItem.pageTitle,
          currentKeywords: activeItem.keywords,
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        const updated = {
          ...activeItem,
          metaTitle: aiData.metaTitle || activeItem.metaTitle,
          metaDescription: aiData.metaDescription || activeItem.metaDescription,
          keywords: aiData.keywords || activeItem.keywords,
          ogTitle: aiData.ogTitle || activeItem.ogTitle,
          ogDescription: aiData.ogDescription || activeItem.ogDescription,
          jsonLdSchema: aiData.schemaJson || activeItem.jsonLdSchema,
        };

        setSeoItems(prev => prev.map(i => i.id === activeItem.id ? updated : i));
        showToast('¡Metadatos optimizados por Gemini IA!');
      }
    } catch (err) {
      console.error('Error generating AI SEO:', err);
      showToast('Error generando sugerencias con IA');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Character length indicators
  const titleLength = activeItem?.metaTitle?.length || 0;
  const descLength = activeItem?.metaDescription?.length || 0;

  const getTitleStatus = () => {
    if (titleLength === 0) return { label: 'Sin definir', color: 'text-rose-600 bg-rose-50' };
    if (titleLength >= 50 && titleLength <= 60) return { label: 'Óptimo (50-60)', color: 'text-emerald-700 bg-emerald-50' };
    if (titleLength < 50) return { label: 'Corto', color: 'text-amber-700 bg-amber-50' };
    return { label: 'Excede límite', color: 'text-rose-700 bg-rose-50' };
  };

  const getDescStatus = () => {
    if (descLength === 0) return { label: 'Sin definir', color: 'text-rose-600 bg-rose-50' };
    if (descLength >= 120 && descLength <= 155) return { label: 'Óptimo (120-155)', color: 'text-emerald-700 bg-emerald-50' };
    if (descLength < 120) return { label: 'Corto', color: 'text-amber-700 bg-amber-50' };
    return { label: 'Excede límite', color: 'text-rose-700 bg-rose-50' };
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black tracking-wider uppercase backdrop-blur-xs">
              <Globe className="w-3.5 h-3.5" />
              SEO & Social Meta Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Control SEO, Open Graph & SERP en Tiempo Real
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Audita y configura individualmente los títulos para Google, meta descripciones persuasivas, tarjetas para compartir en WhatsApp/Facebook e indexación estructurada con Schema.org.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateAiSeo}
              disabled={generatingAi || !activeItem}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generatingAi ? 'Optimizando con IA...' : 'Auto-Generar con Gemini IA'}
            </button>
            <button
              onClick={handleSaveSeo}
              disabled={saving || !activeItem}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar SEO'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: 3 Columns (Selector Sidebar | Edit Form | Live Previews & Audit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Page & Target Selector Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
              Páginas & Secciones del Sitio
            </p>

            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {seoItems.map(item => {
                const isSelected = activeItemId === item.id;
                const score = item.seoScore || 85;
                const scoreColor = score >= 90 ? 'text-emerald-600 bg-emerald-50' : score >= 70 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemId(item.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 ring-offset-2'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold truncate">{item.targetName}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        /{item.slug || 'inicio'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${scoreColor}`}>
                      {score}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Meta Configuration Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {activeItem ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Metadatos de la Página</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeItem.targetName}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-bold uppercase">
                  {activeItem.targetType}
                </span>
              </div>

              {/* Meta Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Meta Título (Google Title Tag) *</label>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${getTitleStatus().color}`}>
                    {titleLength}/60 caracteres ({getTitleStatus().label})
                  </span>
                </div>
                <input
                  type="text"
                  value={activeItem.metaTitle}
                  onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
                  placeholder="Ej: Imprenta Litográfica y Cajas Plegadizas | Fusión Gráfica"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Meta Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Meta Descripción *</label>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${getDescStatus().color}`}>
                    {descLength}/155 caracteres ({getDescStatus().label})
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={activeItem.metaDescription}
                  onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
                  placeholder="Resumen persuasivo con beneficios y llamada a la acción para aumentar clics..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* URL Slug & Canonical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-[11px] font-mono text-slate-500">
                      /
                    </span>
                    <input
                      type="text"
                      value={activeItem.slug}
                      onChange={(e) => handleFieldChange('slug', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Robots Directiva</label>
                  <select
                    value={activeItem.robots}
                    onChange={(e) => handleFieldChange('robots', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="index, follow">index, follow (Recomendado)</option>
                    <option value="noindex, follow">noindex, follow (Ocultar de Google)</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
              </div>

              {/* Open Graph Image */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Imagen Open Graph (WhatsApp / Redes)</label>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Elegir de Medios
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {activeItem.ogImage ? (
                      <img src={activeItem.ogImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <input
                    type="url"
                    value={activeItem.ogImage}
                    onChange={(e) => handleFieldChange('ogImage', e.target.value)}
                    placeholder="https://... (1200x630px recomendado)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                  />
                </div>
              </div>

              {/* Keywords Tag Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">Palabras Clave de Enfoque</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="Escribe una palabra clave y pulsa Enter..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs whitespace-nowrap"
                  >
                    Agregar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeItem.keywords.map(kw => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-slate-400 hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              Selecciona una página del listado izquierdo para configurar su SEO.
            </div>
          )}
        </div>

        {/* Column 3: Live Previews & Audit Checklist (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* SEO Health Score Card */}
          {activeItem && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Salud & Auditoría SEO</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  activeItem.seoScore >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {activeItem.seoScore}/100 Puntos
                </span>
              </div>

              {/* Checks list */}
              <div className="space-y-2">
                {activeItem.checks && activeItem.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : check.severity === 'error' ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 leading-tight">{check.label}</p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Previews Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Vistas Previas en Vivo</h3>
              
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setPreviewTab('google')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === 'google' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Google
                </button>
                <button
                  onClick={() => setPreviewTab('social')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === 'social' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Social
                </button>
                <button
                  onClick={() => setPreviewTab('schema')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === 'schema' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Schema
                </button>
              </div>
            </div>

            {/* PREVIEW: GOOGLE SERP */}
            {previewTab === 'google' && activeItem && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Simulación Google SERP</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSerpDevice('desktop')}
                      className={`p-1 rounded ${serpDevice === 'desktop' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'}`}
                      title="Vista Desktop"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSerpDevice('mobile')}
                      className={`p-1 rounded ${serpDevice === 'mobile' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'}`}
                      title="Vista Móvil"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-sans">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black">
                      F
                    </div>
                    <span className="font-bold text-slate-800">Fusión Gráfica</span>
                    <span className="text-slate-400">https://fusiongrafica.com.co › {activeItem.slug || 'inicio'}</span>
                  </div>
                  <h4 className="text-sm font-medium text-blue-800 hover:underline cursor-pointer leading-snug line-clamp-1">
                    {activeItem.metaTitle || activeItem.pageTitle}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {activeItem.metaDescription || 'No se ha configurado descripción para este snippet de búsqueda.'}
                  </p>
                </div>
              </div>
            )}

            {/* PREVIEW: SOCIAL MEDIA OPEN GRAPH */}
            {previewTab === 'social' && activeItem && (
              <div className="space-y-3">
                <span className="text-[11px] text-slate-400 block">Tarjeta Open Graph (WhatsApp / Facebook)</span>
                
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="aspect-[1.91/1] bg-slate-200 relative overflow-hidden">
                    {activeItem.ogImage ? (
                      <img src={activeItem.ogImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                        Sin imagen Open Graph
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">FUSIONGRAFICA.COM.CO</p>
                    <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                      {activeItem.ogTitle || activeItem.metaTitle}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {activeItem.ogDescription || activeItem.metaDescription}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW: SCHEMA JSON-LD */}
            {previewTab === 'schema' && activeItem && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">JSON-LD Structured Data</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeItem.jsonLdSchema);
                      showToast('JSON-LD copiado al portapapeles');
                    }}
                    className="text-xs font-bold text-teal-700 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copiar Código
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-300 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                  {activeItem.jsonLdSchema || '{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}'}
                </pre>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Universal Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        title="Seleccionar Imagen Open Graph"
        onSelect={(url) => {
          handleFieldChange('ogImage', url);
          showToast('Imagen Open Graph actualizada');
        }}
      />

    </div>
  );
}
