import React, { useState, useEffect } from 'react';
import FileOrUrlInput from './FileOrUrlInput';
import { 
  MediaAsset, 
  MediaFolder, 
  MediaFolderInfo, 
  AiCopyType, 
  AiToneStyle,
  GenerateCreativeCopyResult
} from '../../types/media';
import {
  Folder,
  Image as ImageIcon,
  UploadCloud,
  Search,
  Sparkles,
  Layers,
  FileText,
  BookOpen,
  Package,
  Shield,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Check,
  CheckCircle2,
  AlertCircle,
  Filter,
  Grid,
  List,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Download,
  FileCheck,
  Zap,
  Tag,
  Sliders,
  Type,
  Eye,
  Info,
  Loader2,
  Plus,
  X
} from 'lucide-react';

export default function MediaLibraryPage() {
  // Navigation & Sub-views
  const [mainTab, setMainTab] = useState<'library' | 'ai_copy' | 'ai_render' | 'textures'>('library');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data State
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folderStats, setFolderStats] = useState<MediaFolderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Asset for Inspector Modal
  const [inspectingAsset, setInspectingAsset] = useState<MediaAsset | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [convertingFormat, setConvertingFormat] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>('banners');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);

  // --------------------------------------------------------------------------
  // AI Copy Generator State
  // --------------------------------------------------------------------------
  const [copyType, setCopyType] = useState<AiCopyType>('HERO_HEADLINE');
  const [copyTone, setCopyTone] = useState<AiToneStyle>('LITHO_PROFESSIONAL');
  const [copyProduct, setCopyProduct] = useState('Cajas Plegadizas con Barniz UV');
  const [copyFeatures, setCopyFeatures] = useState('Cartón Calibre 18, Brillo UV Sectorizado, Troquel Personalizado, 300 DPI');
  const [copyAudience, setCopyAudience] = useState('Marcas Cosméticas, Farmacéuticas y Emprendedores');
  const [copyOffer, setCopyOffer] = useState('20% de descuento en tirajes superiores a 1,000 unidades');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<GenerateCreativeCopyResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // AI Product Render Engine State
  // --------------------------------------------------------------------------
  const [renderPreset, setRenderPreset] = useState<string>('CAJA_PLEGADIZA');
  const [renderPrompt, setRenderPrompt] = useState('Caja cosmética prémium en cartón blanco satinado con estampado de flores tropicales y logotipo en foil dorado metalizado, sobre podio de concreto minimalista');
  const [renderAspectRatio, setRenderAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16'>('1:1');
  const [renderFinishing, setRenderFinishing] = useState('FOIL_DORADO');
  const [renderFolder, setRenderFolder] = useState<MediaFolder>('empaques');
  const [generatingRender, setGeneratingRender] = useState(false);
  const [generatedRenderUrl, setGeneratedRenderUrl] = useState<string | null>(null);
  const [savingRenderToLibrary, setSavingRenderToLibrary] = useState(false);
  const [savedRenderSuccess, setSavedRenderSuccess] = useState(false);

  useEffect(() => {
    fetchMediaData();
  }, [selectedFolder, formatFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMediaData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolder !== 'all') params.append('folder', selectedFolder);
      if (formatFilter !== 'all') params.append('format', formatFilter);

      const [resAssets, resStats] = await Promise.all([
        fetch(`/api/media?${params.toString()}`),
        fetch('/api/media/folders'),
      ]);

      if (resAssets.ok) {
        const data = await resAssets.json();
        setAssets(data);
      }
      if (resStats.ok) {
        const stats = await resStats.json();
        setFolderStats(stats);
      }
    } catch (err) {
      console.warn('Error fetching media data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.altText.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const totalAssetsCount = assets.length;
  const totalSavedBytes = assets.reduce((sum, a) => sum + (a.originalSizeBytes - a.optimizedSizeBytes), 0);
  const totalSavedMb = (totalSavedBytes / (1024 * 1024)).toFixed(1);

  // Handle Manual Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    setUploading(true);
    try {
      const tagsArray = uploadTags
        ? uploadTags.split(',').map(t => t.trim()).filter(Boolean)
        : [uploadFolder, 'optimizada', 'webp'];

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim() || `Archivo ${uploadFolder}`,
          folder: uploadFolder,
          url: uploadUrl.trim(),
          altText: uploadAltText.trim(),
          tags: tagsArray,
          format: 'webp',
          originalSizeBytes: 2100000,
          dpi: 300,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast('Archivo optimizado y agregado a la biblioteca');
        setShowUploadModal(false);
        setUploadName('');
        setUploadUrl('');
        setUploadAltText('');
        setUploadTags('');
        fetchMediaData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.message || 'Error al guardar archivo');
      }
    } catch (err) {
      console.error('Error uploading asset:', err);
      showToast('Error al guardar archivo');
    } finally {
      setUploading(false);
    }
  };

  // Handle Format Conversion
  const handleConvertFormat = async (assetId: string, targetFormat: 'webp' | 'avif' | 'png') => {
    setConvertingFormat(true);
    try {
      const res = await fetch(`/api/media/${assetId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFormat }),
      });

      if (res.ok) {
        const result = await res.json();
        setInspectingAsset(result.asset);
        setAssets(prev => prev.map(a => a.id === assetId ? result.asset : a));
        showToast(`Convertido exitosamente a ${targetFormat.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Error converting format:', err);
    } finally {
      setConvertingFormat(false);
    }
  };

  // Handle Delete
  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este archivo multimedia?')) return;

    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== id));
        if (inspectingAsset?.id === id) setInspectingAsset(null);
        showToast('Archivo eliminado');
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, fieldId?: string) => {
    navigator.clipboard.writeText(text);
    if (fieldId) {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    showToast('Copiado al portapapeles');
  };

  // Handle AI Copy Generation
  const handleGenerateCopy = async () => {
    setGeneratingCopy(true);
    try {
      const res = await fetch('/api/ai/creative-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copyType,
          tone: copyTone,
          productOrTopic: copyProduct,
          specialFeatures: copyFeatures,
          targetAudience: copyAudience,
          offerOrPromo: copyOffer,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCopy(data);
        showToast('¡Copys generados exitosamente con Gemini IA!');
      }
    } catch (err) {
      console.error('Error generating creative copy:', err);
      showToast('Error generando copys con IA');
    } finally {
      setGeneratingCopy(false);
    }
  };

  // Handle AI Product Render Generation
  const handleGenerateRender = async () => {
    setGeneratingRender(true);
    setSavedRenderSuccess(false);
    try {
      const enrichedPrompt = `Fotografía de estudio publicitario prémium 300 DPI, render de producto litográfico ${renderPreset} con acabado ${renderFinishing}: ${renderPrompt}. Iluminación suave de estudio, nítido, ultra alta definición, grado comercial.`;

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enrichedPrompt,
          aspectRatio: renderAspectRatio,
          productContext: renderPreset,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedRenderUrl(data.imageUrl || data.fallbackUrl);
        showToast('¡Render fotorrealista generado!');
      }
    } catch (err) {
      console.error('Error generating render:', err);
      showToast('Error generando render con IA');
    } finally {
      setGeneratingRender(false);
    }
  };

  // Save generated render directly to Media Library
  const handleSaveRenderToLibrary = async () => {
    if (!generatedRenderUrl) return;

    setSavingRenderToLibrary(true);
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Render IA: ${renderPrompt.slice(0, 35)}...`,
          folder: renderFolder,
          url: generatedRenderUrl,
          altText: `Render fotorrealista 300 DPI de ${renderPreset} con acabado ${renderFinishing}`,
          tags: ['render-ia', renderFolder, '300-dpi', 'gemini-imagen', renderPreset.toLowerCase()],
          format: 'webp',
          isAiGenerated: true,
          aiPrompt: renderPrompt,
          originalSizeBytes: 2400000,
          dpi: 300,
        }),
      });

      if (res.ok) {
        setSavedRenderSuccess(true);
        showToast('¡Guardado exitosamente en la Biblioteca Multimedia en formato WebP!');
        fetchMediaData();
      }
    } catch (err) {
      console.error('Error saving render to library:', err);
    } finally {
      setSavingRenderToLibrary(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black tracking-wider uppercase backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Gestor Centralizado de Medios & IA Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Biblioteca Multimedia & Asistente Creativo Gemini
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Repositorio unificado con conversión automática a <strong className="text-teal-300">WebP y AVIF</strong> (ahorro de hasta 85% de peso), generación de copys persuasivos de alta conversión y renders fotorrealistas de producto a 300 DPI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Subir Archivo
            </button>
            <button
              onClick={() => setMainTab('ai_render')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 backdrop-blur-xs transition-all border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              Generar Render IA
            </button>
          </div>
        </div>

        {/* Global Compression Metrics Pill */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Archivos</span>
            <strong className="text-white text-base sm:text-lg font-black">{totalAssetsCount} medios</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Optimización WebP/AVIF</span>
            <strong className="text-emerald-400 text-base sm:text-lg font-black">Activa (Auto)</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Ancho de Banda Ahorrado</span>
            <strong className="text-teal-300 text-base sm:text-lg font-black">{totalSavedMb} MB (~82%)</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Calidad Litográfica</span>
            <strong className="text-white text-base sm:text-lg font-black">300 DPI CTP</strong>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-black">
        <button
          onClick={() => setMainTab('library')}
          className={`pb-3 px-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            mainTab === 'library'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Biblioteca Multimedia Unificada
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
            {filteredAssets.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('ai_copy')}
          className={`pb-3 px-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            mainTab === 'ai_copy'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Type className="w-4 h-4 text-purple-600" />
          Asistente de Copys & Textos IA
        </button>

        <button
          onClick={() => setMainTab('ai_render')}
          className={`pb-3 px-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            mainTab === 'ai_render'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          Renders de Producto & Mockups IA
        </button>

        <button
          onClick={() => setMainTab('textures')}
          className={`pb-3 px-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            mainTab === 'textures'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" />
          Texturas & Papeles Especiales
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* VIEW 1: UNIFIED MEDIA LIBRARY */}
      {/* -------------------------------------------------------------------- */}
      {mainTab === 'library' && (
        <div className="space-y-6">
          
          {/* Folders Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { id: 'all', name: 'Todos', icon: Folder, count: totalAssetsCount },
              { id: 'banners', name: 'Banners', icon: ImageIcon, count: assets.filter(a => a.folder === 'banners').length },
              { id: 'empaques', name: 'Empaques', icon: Package, count: assets.filter(a => a.folder === 'empaques').length },
              { id: 'papeleria', name: 'Papelería', icon: FileText, count: assets.filter(a => a.folder === 'papeleria').length },
              { id: 'editorial', name: 'Editorial', icon: BookOpen, count: assets.filter(a => a.folder === 'editorial').length },
              { id: 'logotipos', name: 'Logotipos', icon: Shield, count: assets.filter(a => a.folder === 'logotipos').length },
              { id: 'iconos', name: 'Iconos', icon: Sparkles, count: assets.filter(a => a.folder === 'iconos').length },
            ].map(f => {
              const Icon = f.icon;
              const isSelected = selectedFolder === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-600 ring-offset-2'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f.count}
                    </span>
                  </div>
                  <p className="text-xs font-bold truncate">{f.name}</p>
                </button>
              );
            })}
          </div>

          {/* Controls Bar: Search + Format Filter + View Mode */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar archivos por nombre o etiqueta..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Format Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600 w-full md:w-auto">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Formato:
              </span>
              {['all', 'webp', 'avif', 'png', 'jpg'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[11px] font-black transition-all ${
                    formatFilter === fmt
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {fmt === 'all' ? 'Todos' : fmt}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista en Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista en Lista Detallada"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid / List View Content */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <span className="text-xs font-bold">Cargando biblioteca multimedia optimizada...</span>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No se encontraron archivos en esta vista</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Sube un archivo nuevo o ajusta los filtros de búsqueda y carpetas.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Subir Imagen Ahora
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-teal-500 hover:shadow-lg transition-all group flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden cursor-pointer" onClick={() => setInspectingAsset(asset)}>
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.altText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Format & Savings Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950/80 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                        {asset.format}
                      </span>
                      {asset.savingsPercentage > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                          -{Math.round(asset.savingsPercentage)}% Peso
                        </span>
                      )}
                    </div>

                    {asset.isAiGenerated && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-teal-600/90 text-white text-[10px] font-black tracking-wider flex items-center gap-1 backdrop-blur-xs shadow-xs">
                        <Sparkles className="w-3 h-3" /> IA
                      </div>
                    )}

                    {/* Overlay Action Button */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingAsset(asset);
                        }}
                        className="p-2.5 rounded-xl bg-white text-slate-900 hover:bg-teal-50 hover:text-teal-700 shadow-md text-xs font-bold flex items-center gap-1.5"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Inspeccionar
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-black uppercase text-teal-700 mb-1">
                        <span>{asset.folder}</span>
                        <span className="text-slate-400 font-mono font-medium">{asset.dimensions.width}×{asset.dimensions.height}px</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight" title={asset.name}>
                        {asset.name}
                      </h4>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-slate-700">
                        {Math.round(asset.optimizedSizeBytes / 1024)} KB
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyText(asset.webpUrl || asset.url)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          title="Copiar URL WebP"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Vista Previa</th>
                    <th className="py-3 px-4">Nombre del Archivo</th>
                    <th className="py-3 px-4">Carpeta</th>
                    <th className="py-3 px-4">Dimensiones / DPI</th>
                    <th className="py-3 px-4">Formato / Peso</th>
                    <th className="py-3 px-4">Ahorro</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <div 
                          className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden cursor-pointer border border-slate-200"
                          onClick={() => setInspectingAsset(asset)}
                        >
                          <img src={asset.thumbnailUrl || asset.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-slate-900 truncate max-w-xs">{asset.name}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{asset.altText || 'Sin texto alternativo'}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] capitalize">
                          {asset.folder}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                        {asset.dimensions.width}×{asset.dimensions.height} ({asset.dpi || 300} DPI)
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold uppercase text-slate-800 mr-1.5">{asset.format}</span>
                        <span className="font-mono text-slate-500">({Math.round(asset.optimizedSizeBytes / 1024)} KB)</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          -{Math.round(asset.savingsPercentage)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInspectingAsset(asset)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyText(asset.webpUrl || asset.url)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                            title="Copiar URL"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* -------------------------------------------------------------------- */}
      {/* VIEW 2: AI COPY & CONTENT ASSISTANT */}
      {/* -------------------------------------------------------------------- */}
      {mainTab === 'ai_copy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Left Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Type className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-black text-slate-900">Configuración del Redactor IA</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Contenido</label>
                <select
                  value={copyType}
                  onChange={(e) => setCopyType(e.target.value as AiCopyType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="HERO_HEADLINE">Titulares de Banner & Hero (Alta Conversión)</option>
                  <option value="PRODUCT_DESCRIPTION">Descripción Técnica de Producto Litográfico</option>
                  <option value="PERSUASIVE_BULLETS">Puntos de Dolor & Beneficios Comerciales</option>
                  <option value="PREPRESS_TECH_NOTE">Guía & Ficha de Pre-Prensa Técnica (300 DPI)</option>
                  <option value="CALL_TO_ACTION">Llamadas a la Acción (CTAs Variados)</option>
                  <option value="VALUE_PROPOSITION">Propuesta de Valor Institucional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tono Publicitario</label>
                <select
                  value={copyTone}
                  onChange={(e) => setCopyTone(e.target.value as AiToneStyle)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="LITHO_PROFESSIONAL">Litográfico Profesional (300 DPI, CTP, Calibración)</option>
                  <option value="COMMERCIAL_URGENCY">Urgencia Comercial & Descuento de Fábrica</option>
                  <option value="B2B_CORPORATE">B2B Mayorista & Cuentas Corporativas</option>
                  <option value="CREATIVE_DESIGN">Creativo & Diseño de Vanguardia (Acabados Especiales)</option>
                  <option value="LUXURY_PREMIUM">Lujo & Exclusividad (Foil, Soft Touch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Producto o Tema Principal *</label>
                <input
                  type="text"
                  value={copyProduct}
                  onChange={(e) => setCopyProduct(e.target.value)}
                  placeholder="Ej: Cajas Plegadizas para Cosméticos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Acabados & Especificaciones Técnicas</label>
                <input
                  type="text"
                  value={copyFeatures}
                  onChange={(e) => setCopyFeatures(e.target.value)}
                  placeholder="Ej: Barniz UV Sectorizado, Estampado Foil, Propalcote 300g"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audiencia Objetivo</label>
                <input
                  type="text"
                  value={copyAudience}
                  onChange={(e) => setCopyAudience(e.target.value)}
                  placeholder="Ej: Emprendedores, Diseñadores, Directores de Compras"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Oferta o Gancho Comercial</label>
                <input
                  type="text"
                  value={copyOffer}
                  onChange={(e) => setCopyOffer(e.target.value)}
                  placeholder="Ej: 15% OFF en tirajes mayores a 500 uds"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <button
                onClick={handleGenerateCopy}
                disabled={generatingCopy || !copyProduct.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {generatingCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingCopy ? 'Redactando con Gemini IA...' : 'Generar Copys Persuasivos'}
              </button>
            </div>
          </div>

          {/* Results Right Column */}
          <div className="lg:col-span-7 space-y-4">
            {generatedCopy ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900">Resultado Generado por Gemini IA</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-black uppercase">
                    {copyTone}
                  </span>
                </div>

                {/* Headline Section */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titular Principal</span>
                    <button
                      onClick={() => handleCopyText(generatedCopy.headline, 'headline')}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      {copiedField === 'headline' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'headline' ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {generatedCopy.headline}
                  </h2>
                  {generatedCopy.subtitle && (
                    <p className="text-xs text-slate-600 font-medium pt-1">
                      {generatedCopy.subtitle}
                    </p>
                  )}
                </div>

                {/* Main Copy Section */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cuerpo del Texto (Copy Comercial)</span>
                    <button
                      onClick={() => handleCopyText(generatedCopy.mainCopy, 'mainCopy')}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      {copiedField === 'mainCopy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'mainCopy' ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {generatedCopy.mainCopy}
                  </p>
                </div>

                {/* Bullet Points */}
                {generatedCopy.bulletPoints && generatedCopy.bulletPoints.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Beneficios Clave & Especificaciones
                    </span>
                    <ul className="space-y-1.5">
                      {generatedCopy.bulletPoints.map((bp, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA & Tech Note Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase text-teal-800">Llamada a la Acción (CTA)</span>
                    <p className="text-xs font-black text-teal-900">{generatedCopy.ctaText}</p>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase text-teal-400">Guía Pre-Prensa 300 DPI</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">{generatedCopy.technicalNote}</p>
                  </div>
                </div>

                {/* Keywords Chips */}
                {generatedCopy.suggestedKeywords && (
                  <div>
                    <span className="text-[11px] font-black uppercase text-slate-400 block mb-2">Palabras Clave SEO Sugeridas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedCopy.suggestedKeywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-slate-800">Tu asistente creativo está listo</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Configura los parámetros a la izquierda y presiona "Generar Copys Persuasivos" para obtener redacciones litográficas de alta conversión.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* VIEW 3: AI PRODUCT RENDERS & MOCKUPS */}
      {/* -------------------------------------------------------------------- */}
      {mainTab === 'ai_render' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Left */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-black text-slate-900">Motor de Renders Fotorrealistas (300 DPI)</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preset de Producto</label>
                <select
                  value={renderPreset}
                  onChange={(e) => setRenderPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="CAJA_PLEGADIZA">Caja Plegadiza Cosmética / Farmacéutica</option>
                  <option value="TARJETA_FOIL">Tarjetas de Presentación con Estampado Foil</option>
                  <option value="LIBRO_EDITORIAL">Libro Tapa Blanda con Lomo Cuadrado</option>
                  <option value="BOLSA_KRAFT">Bolsa Boutique de Papel Kraft Ecológico</option>
                  <option value="FOLLETO_FLYER">Folleto Tríptico Publicitario en Mesa</option>
                  <option value="REVISTA_GRAPADA">Revista Editorial Grapada Full Color</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Acabado Litográfico Destacado</label>
                <select
                  value={renderFinishing}
                  onChange={(e) => setRenderFinishing(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="FOIL_DORADO">Foil Dorado Metalizado (Hot Stamping)</option>
                  <option value="BRILLO_UV">Brillo UV Sectorizado de Alto Relieve</option>
                  <option value="MATE_SOBRIO">Laminado Mate Soft Touch Antirrayón</option>
                  <option value="TROQUEL_ESPECIAL">Troquelado con Ventana Transparente</option>
                  <option value="KRAFT_ORGANICO">Papel Kraft Rústico Ecológico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relación de Aspecto (Aspect Ratio)</label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { id: '1:1', label: '1:1 Cuadrado' },
                    { id: '16:9', label: '16:9 Banner' },
                    { id: '4:3', label: '4:3 Catálogo' },
                    { id: '9:16', label: '9:16 Historia' },
                  ].map(ar => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => setRenderAspectRatio(ar.id as any)}
                      className={`py-2 rounded-xl border text-center transition-all ${
                        renderAspectRatio === ar.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prompt / Escena Detallada *</label>
                <textarea
                  rows={4}
                  value={renderPrompt}
                  onChange={(e) => setRenderPrompt(e.target.value)}
                  placeholder="Describe la composición, iluminación, textura del papel y colores..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guardar en Carpeta</label>
                <select
                  value={renderFolder}
                  onChange={(e) => setRenderFolder(e.target.value as MediaFolder)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="empaques">Empaques & Cajas</option>
                  <option value="banners">Banners & Portadas</option>
                  <option value="papeleria">Papelería Comercial</option>
                  <option value="editorial">Editorial & Libros</option>
                  <option value="general">General</option>
                </select>
              </div>

              <button
                onClick={handleGenerateRender}
                disabled={generatingRender || !renderPrompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {generatingRender ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingRender ? 'Renderizando Fotorrealismo 300 DPI...' : 'Generar Render con Gemini & Flux'}
              </button>
            </div>
          </div>

          {/* Render Preview Right */}
          <div className="lg:col-span-7 space-y-4">
            {generatedRenderUrl ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Render Fotorrealista Generado</h3>
                    <p className="text-xs text-slate-500">Resolución de impresión de alta gama a 300 DPI</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-black">
                    {renderAspectRatio}
                  </span>
                </div>

                {/* Image Container */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[480px]">
                  <img
                    src={generatedRenderUrl}
                    alt="Render generado por IA"
                    className="max-h-[480px] w-auto object-contain"
                  />
                </div>

                {/* Save to Library Action */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">¿Deseas agregar este render a tu Biblioteca?</p>
                    <p className="text-[11px] text-slate-500">Se convertirá automáticamente a formato ultraligero WebP para la web.</p>
                  </div>

                  <button
                    onClick={handleSaveRenderToLibrary}
                    disabled={savingRenderToLibrary || savedRenderSuccess}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                      savedRenderSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                    }`}
                  >
                    {savedRenderSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Download className="w-4 h-4" />}
                    {savedRenderSuccess ? '¡Guardado en Medios!' : savingRenderToLibrary ? 'Guardando...' : 'Guardar en Biblioteca'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-slate-800">Motor de Mockups y Renders</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Crea representaciones visuales realistas de tus productos litográficos para catálogos y banners sin necesidad de sesiones fotográficas costosas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* VIEW 4: TEXTURES & LITHO PAPERS */}
      {/* -------------------------------------------------------------------- */}
      {mainTab === 'textures' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
            <h3 className="text-base font-black text-slate-900">Catálogo de Texturas y Papeles Litográficos</h3>
            <p className="text-xs text-slate-500">
              Fondos de alta definición calibrados para maquetas de diseño, banners y páginas de producto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Papel Kraft Rústico Ecológico',
                desc: 'Textura orgánica de fibras recicladas para empaques sostenibles',
                url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=1200&auto=format&fit=crop',
                folder: 'general' as MediaFolder,
              },
              {
                title: 'Cartulina Kimberly Gofrada Telada',
                desc: 'Acabado texturizado prémium para papelería de bodas y diplomas',
                url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
                folder: 'papeleria' as MediaFolder,
              },
              {
                title: 'Propalcote Satinado Blanco Puro',
                desc: 'Reflectancia suave y superficie ultra lisa para catálogos full color',
                url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop',
                folder: 'editorial' as MediaFolder,
              },
              {
                title: 'Mármol Blanco con Vetas Doradas',
                desc: 'Fondo de lujo para cajas de cosméticos y joyería',
                url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
                folder: 'empaques' as MediaFolder,
              },
              {
                title: 'Gradiente Litográfico CMYK',
                desc: 'Fondo abstracto de gama cromática de pre-prensa',
                url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop',
                folder: 'banners' as MediaFolder,
              },
              {
                title: 'Foil Dorado Cepillado Metalizado',
                desc: 'Textura de brillo dorado reflectivo para detalles de lujo',
                url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
                folder: 'logotipos' as MediaFolder,
              },
            ].map((tex, idx) => (
              <div key={idx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden group shadow-xs">
                <div className="aspect-[16/9] bg-slate-100 overflow-hidden relative">
                  <img src={tex.url} alt={tex.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{tex.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tex.desc}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/media/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: tex.title,
                          folder: tex.folder,
                          url: tex.url,
                          altText: tex.desc,
                          tags: ['textura', 'papel', tex.folder],
                          format: 'webp',
                        }),
                      });
                      if (res.ok) {
                        showToast(`"${tex.title}" agregada a tu biblioteca`);
                        fetchMediaData();
                      }
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar a mi Biblioteca
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: ASSET INSPECTOR */}
      {/* -------------------------------------------------------------------- */}
      {inspectingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Inspección & Optimización de Imagen
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{inspectingAsset.id}</p>
              </div>
              <button
                onClick={() => setInspectingAsset(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Image Preview Container */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center max-h-72">
                <img
                  src={inspectingAsset.url}
                  alt={inspectingAsset.altText}
                  className="max-h-72 w-auto object-contain"
                />
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dimensiones</span>
                  <strong className="text-slate-800 font-mono font-bold">
                    {inspectingAsset.dimensions.width} × {inspectingAsset.dimensions.height} px
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Resolución DPI</span>
                  <strong className="text-slate-800 font-mono font-bold">{inspectingAsset.dpi || 300} DPI</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Peso Optimizado</span>
                  <strong className="text-emerald-700 font-mono font-bold">
                    {Math.round(inspectingAsset.optimizedSizeBytes / 1024)} KB
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Ahorro de Peso</span>
                  <strong className="text-teal-600 font-mono font-black">
                    -{Math.round(inspectingAsset.savingsPercentage)}%
                  </strong>
                </div>
              </div>

              {/* Format Switcher */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Convertir a Otro Formato Moderno:</span>
                <div className="flex items-center gap-2">
                  {(['webp', 'avif', 'png'] as const).map(fmt => (
                    <button
                      key={fmt}
                      disabled={convertingFormat || inspectingAsset.format === fmt}
                      onClick={() => handleConvertFormat(inspectingAsset.id, fmt)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                        inspectingAsset.format === fmt
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {fmt} {inspectingAsset.format === fmt && '✓ Activo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL & Direct Links */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">URL Pública Optimizada (WebP)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inspectingAsset.webpUrl || inspectingAsset.url}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                  />
                  <button
                    onClick={() => handleCopyText(inspectingAsset.webpUrl || inspectingAsset.url)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? '¡Copiado!' : 'Copiar URL'}
                  </button>
                </div>
              </div>

              {/* Metadata Edit Form */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre / Título del Recurso</label>
                  <input
                    type="text"
                    value={inspectingAsset.name}
                    onChange={(e) => setInspectingAsset({ ...inspectingAsset, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto Alternativo (Alt Text SEO)</label>
                  <input
                    type="text"
                    value={inspectingAsset.altText}
                    onChange={(e) => setInspectingAsset({ ...inspectingAsset, altText: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteAsset(inspectingAsset.id)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectingAsset(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/media/${inspectingAsset.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(inspectingAsset),
                      });
                      if (res.ok) {
                        showToast('Metadatos actualizados');
                        fetchMediaData();
                        setInspectingAsset(null);
                      }
                    }}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: MANUAL UPLOAD & OPTIMIZE */}
      {/* -------------------------------------------------------------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-black text-slate-900">Subir y Optimizar a WebP / AVIF</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre o Título del Archivo *</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ej: Banner Hero Promoción Cajas 2026"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Imagen o archivo *</label>
                <FileOrUrlInput
                  value={uploadUrl}
                  onChange={setUploadUrl}
                  onFileName={(n) => { if (!uploadName.trim()) setUploadName(n); }}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Carpeta de Destino</label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value as MediaFolder)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="banners">Banners & Portadas</option>
                  <option value="empaques">Empaques & Cajas</option>
                  <option value="papeleria">Papelería Comercial</option>
                  <option value="editorial">Editorial & Libros</option>
                  <option value="logotipos">Logotipos & Marcas</option>
                  <option value="iconos">Iconos & Sellos</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto Alternativo (Alt Text SEO)</label>
                <input
                  type="text"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  placeholder="Descripción concisa para accesibilidad y Google"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="offset, 300dpi, banner, cajas"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadUrl.trim()}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploading ? 'Optimizando...' : 'Optimizar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
