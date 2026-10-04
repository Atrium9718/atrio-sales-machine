import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Check,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  Palette,
  Loader2,
  Camera,
  X
} from 'lucide-react';

interface AdminProductAiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  productName?: string;
  categoryName?: string;
}

const PRODUCT_PHOTO_PRESETS = [
  {
    category: '💼 Papelería Corporativa',
    items: [
      {
        label: 'Tarjetas de Presentación de Lujo',
        prompt: 'Mockup fotográfico publicitario de tarjetas de presentación apiladas sobre base de concreto pulido y madera nogal, acabado mate con detalles holográficos, iluminación de estudio suave, 300 DPI ultra detallado'
      },
      {
        label: 'Hojas Membretadas & Carpeta',
        prompt: 'Fotografía comercial de papelería corporativa completa: hoja membretada, sobre cerrado y carpeta ejecutiva en ángulo cenital con sombras suaves'
      },
      {
        label: 'Carnets de PVC & Lanyard',
        prompt: 'Fotografía de producto de carnet de identificación en PVC con cinta lanyard textil corporativa, enfoque nítido de alta gama'
      }
    ]
  },
  {
    category: '📦 Empaques & Cajas',
    items: [
      {
        label: 'Caja Plegadiza Premium',
        prompt: 'Mockup 3D publicitario de caja de empaque plegadiza personalizada de lujo, fondo de estudio minimalista en tonos neutros, iluminación cenital suave'
      },
      {
        label: 'Bolsa de Papel Kraft / Boutique',
        prompt: 'Fotografía de producto de bolsa de papel kraft comercial con asas de cordón trenzado, logotipo estampado en foil dorado, fondo limpio'
      },
      {
        label: 'Etiquetas Adhesivas en Rollo',
        prompt: 'Rollo de etiquetas adhesivas troqueladas de alta calidad para botellas o productos artesanales, iluminación lateral elegante'
      }
    ]
  },
  {
    category: '📢 Gran Formato & Publicidad',
    items: [
      {
        label: 'Pendón Roll-up Ejecutivo',
        prompt: 'Fotografía de pendón publicitario roll-up en base de aluminio anodizado brillante, ubicado en lobby corporativo moderno y luminoso'
      },
      {
        label: 'Afiches & Posters en Pared',
        prompt: 'Póster publicitario enmarcado en marco delgado negro sobre pared de galería iluminada con focos cálidos'
      },
      {
        label: 'Vinilo Adhesivo Vitrina',
        prompt: 'Vitrina comercial de tienda moderna con gráfica en vinilo adhesivo de corte de alta definición y diseño vanguardista'
      }
    ]
  },
  {
    category: '📖 Libros, Catálogos & Cuadernos',
    items: [
      {
        label: 'Catálogo / Revista Abierta',
        prompt: 'Fotografía cenital de revista o catálogo corporativo abierto mostrando páginas interiores a todo color sobre mesa de roble'
      },
      {
        label: 'Cuaderno Argollado Tapa Dura',
        prompt: 'Mockup publicitario de libreta o cuaderno tapa dura con anillado doble O metálico y elástico de cierre, plano detalle'
      }
    ]
  }
];

const STYLES = [
  { id: 'fotorealista', label: 'Fotografía Publicitaria', icon: '📸', desc: 'Estudio profesional, iluminación comercial 300 DPI' },
  { id: '3d_render', label: 'Mockup 3D de Estudio', icon: '💎', desc: 'Render volumétrico ultra nítido con sombras suaves' },
  { id: 'vector', label: 'Ilustración Vectorial', icon: '🎨', desc: 'Gráfico plano limpio para catálogo o icono' },
  { id: 'logo_emblema', label: 'Emblema / Isotipo', icon: '✨', desc: 'Símbolo gráfico aislado sobre fondo neutro' }
];

const ASPECT_RATIOS = [
  { id: '4:3', label: '4:3 (Recomendado Catálogo)', desc: 'Ideal para ficha de producto' },
  { id: '1:1', label: '1:1 (Cuadrado)', desc: 'Tiendas online y miniaturas' },
  { id: '16:9', label: '16:9 (Banner)', desc: 'Cabeceras panorámicas' }
];

export default function AdminProductAiImageModal({
  isOpen,
  onClose,
  onSelectImage,
  productName = '',
  categoryName = ''
}: AdminProductAiImageModalProps) {
  const initialPrompt = productName
    ? `Fotografía comercial publicitaria de ${productName} para imprenta gráfica, iluminación de estudio suave, fondo neutro minimalista de alta gama, 300 DPI`
    : '';

  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<string>('fotorealista');
  const [selectedAspect, setSelectedAspect] = useState<string>('4:3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).trim();
    if (!text) {
      setErrorMsg('Ingresa una descripción para la imagen.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          aspectRatio: selectedAspect,
          style: selectedStyle
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error del servidor: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setHistory(prev => [data.imageUrl, ...prev.slice(0, 5)]);
      } else {
        throw new Error('No se recibió la imagen generada.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar la imagen con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = (imgUrl: string) => {
    onSelectImage(imgUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-[32px] max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6 my-auto">
        
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Generador de Mockups & Fotos de Producto (IA)
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Crea fotos publicitarias de catálogo con Gemini AI para <span className="text-teal-600 font-bold">{productName || 'tu producto'}</span>
            </p>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wand2 size={14} className="text-teal-500" />
              Descripción visual del producto:
            </span>
            {productName && (
              <button
                type="button"
                onClick={() => setPrompt(`Fotografía publicitaria de ${productName}, acabado comercial de alta calidad, iluminación de estudio suave, fondo neutro moderno, 300 DPI`)}
                className="text-[11px] text-teal-600 hover:underline font-bold"
              >
                Restaurar sugerencia
              </button>
            )}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Mockup fotográfico de catálogo para talonarios numerados y membretados, encuadernación encolada con papel autocopia, fondo de mesa ejecutiva..."
            rows={3}
            className="w-full rounded-2xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3.5 text-sm text-slate-800 placeholder-slate-400 font-medium"
          />
        </div>

        {/* Preset suggestions */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Ideas de Fotografía de Producto:
            </span>
            <div className="flex gap-1 overflow-x-auto">
              {PRODUCT_PHOTO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveCategoryTab(idx)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                    activeCategoryTab === idx
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {p.category.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRODUCT_PHOTO_PRESETS[activeCategoryTab].items.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(item.prompt)}
                className="text-left px-3 py-2 bg-white hover:bg-teal-50 hover:border-teal-300 border border-slate-200/80 rounded-xl text-xs text-slate-700 hover:text-teal-900 transition-all flex items-center justify-between group"
              >
                <span className="font-semibold truncate pr-2">{item.label}</span>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-teal-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Style & Aspect Ratio Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette size={14} className="text-teal-500" />
              Estilo Visual:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStyle(st.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedStyle === st.id
                      ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-slate-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{st.icon}</span>
                    <span className="text-xs">{st.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-teal-500" />
              Proporción (Aspect Ratio):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setSelectedAspect(ar.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedAspect === ar.id
                      ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {ar.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">No se pudo generar la imagen:</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Generate action */}
        <button
          type="button"
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-full shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Generando Fotografía de Producto con Gemini AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generar Foto de Producto con IA</span>
            </>
          )}
        </button>

        {/* Generated Image Result */}
        {generatedImage && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Check size={16} className="text-teal-500" />
                Resultado Generado:
              </span>
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
              >
                <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                <span>Volver a Generar</span>
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500 shadow-md bg-slate-100 max-h-72 flex items-center justify-center">
              <img
                src={generatedImage}
                alt="AI Generated Product Mockup"
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-72 object-contain"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleApply(generatedImage)}
                className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full font-bold text-sm shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Check size={18} />
                <span>Asignar como Foto Principal del Producto</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
