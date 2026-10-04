import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Wand2, 
  X, 
  Check, 
  Image as ImageIcon, 
  Loader2, 
  RefreshCw, 
  LayoutGrid, 
  Palette, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Package, 
  Layers, 
  Sliders, 
  Tag, 
  Lightbulb, 
  ChevronRight,
  Zap,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  AI_PROMPT_PRESETS, 
  CURATED_BANNER_IMAGES, 
  GRAPHIC_PRODUCTS_CATALOG, 
  AiPromptPreset, 
  BannerPresetImage, 
  GraphicProductOption 
} from './bannerPresets';

interface BannerAiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetField?: 'desktop' | 'mobile';
  initialAspectRatio?: string;
  onApply: (data: {
    imageUrl: string;
    title?: string;
    subtitle?: string;
    tag?: string;
    ctaText?: string;
    targetField?: 'desktop' | 'mobile';
  }) => void;
}

const FINISHING_STYLES = [
  { id: 'foil_dorado', label: '✨ Foil Dorado & Soft Touch', desc: 'Estampado metalizado brillante y textura mate suave' },
  { id: 'uv_reserva', label: '💎 Barniz UV Reserva Brillante', desc: 'Brillo sectorizado de alto contraste sobre fondo mate' },
  { id: 'kraft_eco', label: '🌿 Papel Kraft & Ecológico', desc: 'Sustratos sostenibles de caña EarthPact y tonos tierra' },
  { id: 'offset_cmyk', label: '🏭 Offset Industrial 300 DPI', desc: 'Prensa litográfica, fidelidad de color y precisión de registro' },
  { id: 'estudio_macro', label: '📸 Fotografía Macro de Estudio', desc: 'Enfoque cerrado con iluminación de softbox y pedestal limpio' },
  { id: 'mockup_isometrico', label: '📐 Mockup Isométrico 3D', desc: 'Vista en perspectiva moderna con sombras suaves y profundidad' },
  { id: 'digital_atrio', label: '🚀 Agencia Digital & Branding', desc: 'Ambiente tecnológico de marketing y analíticas de crecimiento' }
];

export default function BannerAiGeneratorModal({ 
  isOpen, 
  onClose, 
  onApply, 
  targetField = 'desktop',
  initialAspectRatio
}: BannerAiGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'product_ai' | 'custom_prompt' | 'gallery'>('product_ai');
  
  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState<GraphicProductOption>(GRAPHIC_PRODUCTS_CATALOG[0]);
  const [customProductName, setCustomProductName] = useState('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [selectedFinishing, setSelectedFinishing] = useState(FINISHING_STYLES[0].label);
  const [promoOffer, setPromoOffer] = useState('Descuento especial por volumen y despacho nacional');
  
  // Manual / prompt studio state
  const [selectedPreset, setSelectedPreset] = useState<AiPromptPreset>(AI_PROMPT_PRESETS[0]);
  const [customPrompt, setCustomPrompt] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultPromptEn);
  const [spanishExplanation, setSpanishExplanation] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultHeadline);
  
  // Layout & target
  const [currentField, setCurrentField] = useState<'desktop' | 'mobile'>(targetField);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio || (targetField === 'mobile' ? '9:16' : '16:9'));
  
  // Copy fields
  const [title, setTitle] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultHeadline);
  const [subtitle, setSubtitle] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultSubtitle);
  const [tag, setTag] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultTag);
  const [ctaText, setCtaText] = useState(GRAPHIC_PRODUCTS_CATALOG[0].defaultCta);
  const [finishingHighlights, setFinishingHighlights] = useState<string[]>(['Offset 300 DPI', 'Acabados Especiales']);
  
  // Visual result state
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    targetField === 'mobile'
      ? 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop'
  );
  const [fallbackUrl, setFallbackUrl] = useState<string>(
    targetField === 'mobile'
      ? 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop'
  );
  const [variations, setVariations] = useState<string[]>([]);
  const [imageMeta, setImageMeta] = useState<{ source?: string; isAi?: boolean; note?: string } | null>({
    source: 'Catálogo Litográfico HD',
    isAi: false,
    note: targetField === 'mobile' ? 'Fotografía vertical optimizada para Smartphone.' : 'Fotografía panorámica para pantallas desktop.'
  });
  
  // Loading & statuses
  const [isPromptEngineering, setIsPromptEngineering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageRendering, setIsImageRendering] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentField(targetField);
      setAspectRatio(initialAspectRatio || (targetField === 'mobile' ? '9:16' : '16:9'));
    }
  }, [isOpen, targetField, initialAspectRatio]);

  if (!isOpen) return null;

  // Handle product selection from catalog
  const handleSelectProduct = (prod: GraphicProductOption) => {
    setSelectedProduct(prod);
    setIsCustomProduct(false);
    setCustomPrompt(prod.defaultPromptEn);
    setTitle(prod.defaultHeadline);
    setSubtitle(prod.defaultSubtitle);
    setTag(prod.defaultTag);
    setCtaText(prod.defaultCta);
    setSpanishExplanation(prod.defaultSubtitle);
    setError(null);
  };

  // Generate hyper-targeted prompt using AI based on product
  const handleGeneratePromptForProduct = async () => {
    setIsPromptEngineering(true);
    setError(null);
    const prodName = isCustomProduct ? customProductName.trim() || 'Producto Litográfico' : selectedProduct.name;
    const catName = isCustomProduct ? 'Litografía e Impresión' : selectedProduct.category;

    try {
      const res = await fetch('/api/ai/generate-product-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: prodName,
          category: catName,
          finishingStyle: selectedFinishing,
          aspectRatio: aspectRatio,
          offerOrPromo: promoOffer
        })
      });

      if (!res.ok) {
        throw new Error('No se pudo generar el prompt con el servicio de IA');
      }

      const data = await res.json();
      if (data && data.englishPrompt) {
        setCustomPrompt(data.englishPrompt);
        if (data.headline) setTitle(data.headline);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.tag) setTag(data.tag);
        if (data.ctaText) setCtaText(data.ctaText);
        if (data.spanishDescription) setSpanishExplanation(data.spanishDescription);
        if (Array.isArray(data.finishingHighlights)) setFinishingHighlights(data.finishingHighlights);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con el asistente de prompts.');
    } finally {
      setIsPromptEngineering(false);
    }
  };

  // Generate image using AI
  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setIsImageRendering(true);
    setError(null);

    const promptToUse = customPrompt.trim() || selectedProduct.defaultPromptEn;

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          aspectRatio: aspectRatio,
          style: 'fotorealista',
          productContext: isCustomProduct ? customProductName : selectedProduct.name
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'No se pudo generar la imagen con el servicio');
      }

      const data = await res.json();
      if (data && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        if (data.fallbackUrl) setFallbackUrl(data.fallbackUrl);
        if (Array.isArray(data.variations)) setVariations(data.variations);
        setImageMeta({
          source: data.source || 'Motor IA Gemini Imagen & Flux HD',
          isAi: true,
          note: data.note || 'Renderizado con IA fotorrealista para artes gráficas.'
        });
      } else {
        throw new Error('No se recibió una imagen válida del servidor.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al generar con IA. Puedes seleccionar una fotografía del catálogo HD.');
      setIsImageRendering(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectGalleryImage = (img: BannerPresetImage) => {
    setIsImageRendering(true);
    setGeneratedImageUrl(img.url);
    setFallbackUrl(img.url);
    setImageMeta({
      source: `Catálogo HD: ${img.name}`,
      isAi: false,
      note: 'Fotografía 300 DPI de alta fidelidad litográfica.'
    });
    setTag(img.category);
    setTitle(img.name);
    setSubtitle(img.description);
    setError(null);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(customPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApplyToBanner = (overrideField?: 'desktop' | 'mobile') => {
    if (!generatedImageUrl) return;
    onApply({
      imageUrl: generatedImageUrl,
      title,
      subtitle,
      tag,
      ctaText,
      targetField: overrideField || currentField
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${
              currentField === 'mobile' 
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-teal-50 border-teal-100 text-teal-600'
            }`}>
              {currentField === 'mobile' ? <Smartphone size={20} /> : <Wand2 size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  Estudio Creativo IA • Motor Gemini Imagen & Flux HD
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  currentField === 'mobile'
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-teal-100 text-teal-900 border border-teal-200'
                }`}>
                  {currentField === 'mobile' ? '📱 Modo Celular (9:16)' : '🖥️ Modo Desktop (16:9)'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Generador de imágenes y copys comerciales adaptados automáticamente al producto gráfico y sus acabados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('product_ai')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'product_ai'
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Package size={15} />
            <span>1. Generar Prompt según Producto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom_prompt')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'custom_prompt'
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Sliders size={15} />
            <span>2. Editor de Prompt & Parámetros</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={15} />
            <span>3. Galería Litográfica HD ({CURATED_BANNER_IMAGES.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Product Selection / Prompting */}
          <div className="lg:col-span-7 space-y-4">

            {activeTab === 'product_ai' && (
              <div className="space-y-4">
                
                {/* Product Catalog Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Selecciona un Producto de Artes Gráficas
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomProduct(!isCustomProduct)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-800 cursor-pointer"
                    >
                      {isCustomProduct ? '← Ver Catálogo Predefinido' : '+ Escribir Producto Personalizado'}
                    </button>
                  </div>

                  {isCustomProduct ? (
                    <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-2">
                      <label className="text-[11px] font-black text-teal-900 uppercase">
                        Nombre del Producto / Servicio Personalizado:
                      </label>
                      <input
                        type="text"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Ej: Cajas para Hamburguesas con Barniz Grasa, Agendas Ejecutivas..."
                        className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {GRAPHIC_PRODUCTS_CATALOG.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          className={`p-2.5 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col justify-between ${
                            selectedProduct.id === prod.id && !isCustomProduct
                              ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-500/20'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[10px] text-teal-600 font-extrabold uppercase line-clamp-1">{prod.category}</span>
                            {selectedProduct.id === prod.id && !isCustomProduct && (
                              <CheckCircle2 size={13} className="text-teal-600 shrink-0 ml-1" />
                            )}
                          </div>
                          <div className="line-clamp-2 leading-tight text-[11px] text-slate-900">{prod.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Finishing & Style Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Acabado / Estilo Visual
                    </label>
                    <select
                      value={selectedFinishing}
                      onChange={(e) => setSelectedFinishing(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      {FINISHING_STYLES.map((st) => (
                        <option key={st.id} value={st.label}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Proporción / Formato
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => {
                        setAspectRatio(e.target.value);
                        if (e.target.value === '9:16') setCurrentField('mobile');
                        else setCurrentField('desktop');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      <option value="16:9">🖥️ 16:9 (Horizontal / Banner Desktop)</option>
                      <option value="9:16">📱 9:16 (Vertical / Smartphone Celular)</option>
                      <option value="1:1">⬛ 1:1 (Cuadrado / Popup / Catálogo)</option>
                      <option value="4:3">🖼️ 4:3 (Rectangular Estándar)</option>
                      <option value="3:2">📷 3:2 (Fotografía Clásica)</option>
                    </select>
                  </div>
                </div>

                {/* Action button to generate prompt with AI */}
                <div className="p-3.5 bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl text-white flex items-center justify-between gap-3 shadow-md">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-teal-300">
                      <Sparkles size={15} />
                      <span>Motor de Prompt Engineering con Gemini</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Genera el prompt de estudio y titulares adaptados a {isCustomProduct ? customProductName || 'este producto' : selectedProduct.name}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePromptForProduct}
                    disabled={isPromptEngineering}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    {isPromptEngineering ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={14} />
                        <span>Crear Prompt IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Prompt Preview & Quick Generate Button */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb size={13} className="text-amber-500" />
                      Prompt Generado para el Modelo de Imagen:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="text-[11px] text-teal-600 font-bold hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPrompt ? 'Copiado' : 'Copiar Prompt'}</span>
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed line-clamp-3">
                    {customPrompt}
                  </p>
                  
                  <div className="pt-1 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 line-clamp-1 italic">
                      {spanishExplanation}
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGenerating || !customPrompt.trim()}
                      className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-teal-400" />
                          <span>Generando Imagen...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} className="text-teal-400" />
                          <span>✨ Generar Imagen con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'custom_prompt' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Presets Gráficos Rápidos
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AI_PROMPT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(preset);
                          setCustomPrompt(preset.prompt);
                          setTag(preset.recommendedTag);
                          setCtaText(preset.recommendedCta);
                        }}
                        className={`p-2.5 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          selectedPreset.id === preset.id
                            ? 'border-teal-500 bg-teal-50/70 text-teal-900 ring-2 ring-teal-500/20'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-[10px] text-teal-600 font-extrabold uppercase mb-1">{preset.category}</div>
                        <div className="line-clamp-2 leading-tight">{preset.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Prompt Textual Personalizado (Inglés o Español)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Describe los acabados, ángulo de cámara, producto e iluminación..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Proporción
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
                    >
                      <option value="9:16">📱 9:16 (Vertical Smartphone / Celular)</option>
                      <option value="16:9">🖥️ 16:9 (Horizontal Banner Desktop)</option>
                      <option value="1:1">⬛ 1:1 (Cuadrado / Popups)</option>
                      <option value="4:5">📸 4:5 (Vertical Comercial)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGenerating || !customPrompt.trim()}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-teal-400" />
                          <span>Generando con IA...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={15} className="text-teal-400" />
                          <span>Generar Imagen con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Fotografía de Catálogo Litográfico HD (300 DPI)
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {CURATED_BANNER_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => handleSelectGalleryImage(img)}
                      className={`group relative text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        generatedImageUrl === img.url
                          ? 'border-teal-500 ring-2 ring-teal-500/30'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="h-24 bg-slate-100 relative overflow-hidden">
                        <img
                          src={img.thumbnail}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-white text-[9px] font-black uppercase">
                          {img.category}
                        </span>
                        {generatedImageUrl === img.url && (
                          <div className="absolute inset-0 bg-teal-950/40 flex items-center justify-center text-teal-300">
                            <CheckCircle2 size={24} />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{img.name}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{img.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Copywriting / Titulares */}
            <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal-600" />
                  Textos y Titulares para el Banner
                </span>
                <button
                  type="button"
                  onClick={handleGeneratePromptForProduct}
                  disabled={isPromptEngineering}
                  className="text-teal-700 hover:text-teal-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isPromptEngineering ? 'animate-spin' : ''} />
                  <span>{isPromptEngineering ? 'Creando...' : 'Re-generar textos'}</span>
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título impactante"
                  className="w-full bg-white border border-teal-200/60 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subtítulo descriptivo"
                  className="w-full bg-white border border-teal-200/60 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Etiqueta / Badge"
                    className="w-full bg-white border border-teal-200/60 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Texto botón CTA"
                    className="w-full bg-white border border-teal-200/60 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso del Generador:</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: High Fidelity Preview & Direct Apply */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Vista Previa del Banner
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentField('desktop');
                      setAspectRatio('16:9');
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                      currentField === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentField('mobile');
                      setAspectRatio('9:16');
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                      currentField === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Móvil
                  </button>
                </div>
              </div>

              {/* Preview Canvas Container */}
              <div className={`bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner group flex flex-col justify-between p-5 text-white transition-all ${
                currentField === 'mobile' ? 'aspect-[9/14] max-h-[380px] max-w-[260px] mx-auto' : 'min-h-[260px]'
              }`}>
                {generatedImageUrl ? (
                  <>
                    <img
                      src={generatedImageUrl}
                      alt="Resultado Creativo"
                      onLoad={() => setIsImageRendering(false)}
                      onError={() => {
                        setIsImageRendering(false);
                        if (fallbackUrl && generatedImageUrl !== fallbackUrl) {
                          setGeneratedImageUrl(fallbackUrl);
                        }
                      }}
                      className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${
                        isImageRendering ? 'opacity-30 blur-xs' : 'opacity-65 blur-none'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    
                    {isImageRendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs z-20">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={26} className="animate-spin text-teal-400" />
                          <span className="text-xs font-black text-teal-200">Renderizando con IA...</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-2">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400">Genera una imagen con IA</p>
                  </div>
                )}

                {/* Tag */}
                <div className="relative z-10">
                  {tag && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2 shadow-sm">
                      {tag}
                    </span>
                  )}
                </div>

                {/* Text Overlay */}
                <div className="relative z-10 space-y-1.5 mt-auto">
                  <h4 className={`font-black leading-tight drop-shadow-sm ${currentField === 'mobile' ? 'text-sm' : 'text-base'}`}>
                    {title}
                  </h4>
                  <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed font-medium">
                    {subtitle}
                  </p>
                  <div className="pt-1.5">
                    <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-teal-500 text-slate-950 font-black text-xs shadow-md shadow-teal-500/30">
                      {ctaText || 'Explorar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variations selector */}
              {variations.length > 1 && (
                <div className="mt-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                    Variaciones Rápidas (1 Clic para alternar):
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {variations.map((vUrl, vIdx) => (
                      <button
                        key={vIdx}
                        type="button"
                        onClick={() => {
                          setIsImageRendering(true);
                          setGeneratedImageUrl(vUrl);
                        }}
                        className={`h-12 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          generatedImageUrl === vUrl ? 'border-teal-500 ring-2 ring-teal-500/40' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={vUrl} alt={`Variación ${vIdx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyToBanner('desktop')}
                  disabled={!generatedImageUrl || isGenerating}
                  className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Monitor size={14} className="text-teal-400" />
                  <span>Aplicar a Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyToBanner('mobile')}
                  disabled={!generatedImageUrl || isGenerating}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone size={14} className="text-amber-200" />
                  <span>Aplicar a Celular</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyToBanner()}
                  disabled={!generatedImageUrl || isGenerating || isImageRendering}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Aplicar a este Banner</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
