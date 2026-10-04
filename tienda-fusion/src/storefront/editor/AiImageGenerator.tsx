import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Plus,
  Layers,
  Check,
  AlertCircle,
  SlidersHorizontal,
  Download,
  Info,
  ChevronRight,
  Palette,
  Loader2,
  Tag,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

interface AiImageGeneratorProps {
  onInsertToCanvas: (imageUrl: string, isBackground?: boolean) => void;
  aiDesignsUsedCount?: number;
  onTrackAiDesignUsed?: (imageUrl: string) => void;
}

interface GeneratedAiImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  timestamp: number;
}

const STYLES = [
  { id: 'fotorealista', label: 'Fotografía 300 DPI', icon: '📸', desc: 'Realismo de estudio fotográfico publicitario' },
  { id: 'vector', label: 'Ilustración Vectorial', icon: '🎨', desc: 'Colores limpios y formas vectoriales para imprenta' },
  { id: 'minimalista', label: 'Minimalista & Moderno', icon: '✨', desc: 'Espacios limpios y fondos neutros ejecutivos' },
  { id: '3d_render', label: 'Render 3D Texturizado', icon: '💎', desc: 'Volumetría con brillos y sombras suaves' },
  { id: 'acuarela', label: 'Acuarela Artística', icon: '🖌️', desc: 'Texturas orgánicas y degradados suaves' },
  { id: 'retro_vintage', label: 'Retro Vintage', icon: '📻', desc: 'Estética clásica con texturas de grabado' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 (Cuadrado)', desc: 'Ideal para sellos, stickers o logos' },
  { id: '4:3', label: '4:3 (Estándar)', desc: 'Ideal para tarjetas o volantes horizontales' },
  { id: '3:4', label: '3:4 (Vertical)', desc: 'Ideal para pendones o volantes verticales' },
  { id: '16:9', label: '16:9 (Panorámico)', desc: 'Ideal para banners y cabeceras' },
];

const PRESETS = [
  {
    category: '☕ Gastronomía & Café',
    prompts: [
      'Fotografía publicitaria de taza de café espresso con arte latte de corazón sobre madera rústica, granos de café tostados dispersos, luz cálida de estudio 300 DPI',
      'Ilustración vectorial moderna de hamburguesa gourmet con queso derretido, lechuga y tomate, estilo flat design con fondo limpio',
      'Mockup de empaque de postre artesanal con fresas frescas y crema batida sobre fondo pastel neutro'
    ]
  },
  {
    category: '🩺 Salud, Odonto & Belleza',
    prompts: [
      'Fotografía estética de productos de spa: frasco de sérum de vidrio, orquídeas blancas y piedras de río zen sobre mármol blanco pulido',
      'Ilustración minimalista y moderna de silueta dental brillante con destellos turquesa y hojas botánicas sutiles',
      'Primer plano estilizado de manos cuidando una planta joven, concepto de salud y bienestar familiar'
    ]
  },
  {
    category: '🏢 Corporativo & Negocios',
    prompts: [
      'Ilustración 3D isométrica de gráficos financieros ascendentes en tonos verde esmeralda y azul cobalto con monedas doradas',
      'Patrón geométrico abstracto de lujo en líneas doradas finas sobre fondo azul marino profundo para tarjeta de presentación',
      'Mockup fotográfico de apretón de manos ejecutivo en edificio corporativo moderno con ventanales de cristal'
    ]
  },
  {
    category: '🎉 Eventos, Fiestas & Bodas',
    prompts: [
      'Corona botánica elegante en acuarela con ramas de eucalipto, rosas blancas y detalles en pan de oro para invitación',
      'Composición festiva de confeti dorado y globos metálicos flotando sobre fondo blanco perla brillante',
      'Fondo abstracto de ondas fluidas doradas y moradas con destellos luminosos para boletas y entradas VIP'
    ]
  }
];

export default function AiImageGenerator({ 
  onInsertToCanvas, 
  aiDesignsUsedCount = 0, 
  onTrackAiDesignUsed 
}: AiImageGeneratorProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('fotorealista');
  const [selectedAspect, setSelectedAspect] = useState<string>('4:3');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedAiImage[]>([]);
  const [activeTabPreset, setActiveTabPreset] = useState<number>(0);
  const [statusStep, setStatusStep] = useState<string>('');
  const [insertedSuccessMessage, setInsertedSuccessMessage] = useState<string | null>(null);

  const handleGenerate = async (customPrompt?: string) => {
    const textToGenerate = (customPrompt || prompt).trim();
    if (!textToGenerate) {
      setErrorMsg('Por favor escribe una descripción de lo que deseas generar.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setInsertedSuccessMessage(null);
    setStatusStep('Conectando con el motor Gemini AI...');

    const stepTimer1 = setTimeout(() => {
      setStatusStep('Modelando y sintetizando gráficos...');
    }, 1800);

    const stepTimer2 = setTimeout(() => {
      setStatusStep('Aplicando texturas y definición para imprenta...');
    }, 4000);

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToGenerate,
          aspectRatio: selectedAspect,
          style: selectedStyle,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.imageUrl) {
        setCurrentImage(data.imageUrl);
        const newEntry: GeneratedAiImage = {
          id: String(Date.now()),
          url: data.imageUrl,
          prompt: textToGenerate,
          style: selectedStyle,
          aspectRatio: selectedAspect,
          timestamp: Date.now(),
        };
        setHistory((prev) => [newEntry, ...prev.slice(0, 7)]);
      } else {
        throw new Error('No se recibió la imagen generada.');
      }
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setErrorMsg(err.message || 'Ocurrió un error al generar la imagen. Intenta con una descripción diferente.');
    } finally {
      setIsGenerating(false);
      setStatusStep('');
    }
  };

  const handleInsert = (imgUrl: string, isBg: boolean = false) => {
    onInsertToCanvas(imgUrl, isBg);
    if (onTrackAiDesignUsed) {
      onTrackAiDesignUsed(imgUrl);
    }
    setInsertedSuccessMessage(
      isBg 
        ? '¡Imagen asignada como fondo! Incluye costo de diseño IA ($20.000 COP al checkout).' 
        : '¡Elemento insertado en el lienzo! Incluye costo de diseño IA ($20.000 COP al checkout).'
    );
    setTimeout(() => setInsertedSuccessMessage(null), 5000);
  };

  const handleDownload = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `diseno-gemini-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Header & Monetization Badge */}
      <div className="border-b border-slate-800 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">Generador de Imágenes IA</h3>
              <p className="text-[11px] text-slate-400">Crea fotos, logos e ilustraciones a medida para tu impreso.</p>
            </div>
          </div>
        </div>

        {/* Pricing notice badge: 20.000 COP per design */}
        <div className="bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-indigo-500/15 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Tag size={13} />
            </div>
            <div>
              <span className="text-[11px] font-black text-amber-300 block leading-tight">
                Tarifa de Diseño IA: $20.000 COP
              </span>
              <span className="text-[10px] text-slate-300 leading-tight">
                Genera vistas previas y al ordenar se añade la tarifa del diseño exclusivo
              </span>
            </div>
          </div>
          {aiDesignsUsedCount > 0 && (
            <span className="bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-sm">
              {aiDesignsUsedCount} en diseño
            </span>
          )}
        </div>
      </div>

      {/* Prompt Input Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Wand2 size={13} className="text-teal-400" />
            <span>Describe lo que quieres crear:</span>
          </label>
          {prompt && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Logotipo minimalista de odontología con una muela estilizada en gradiente turquesa brillante y fondo oscuro..."
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-none font-medium"
          />
        </div>
      </div>

      {/* Style Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <Palette size={13} className="text-teal-400" />
          <span>Estilo Visual:</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStyle(st.id)}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedStyle === st.id
                  ? 'bg-teal-500/20 border-teal-500 text-white shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{st.icon}</span>
                <span className="text-xs font-bold leading-tight truncate">{st.label}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{st.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-teal-400" />
          <span>Proporción de Imagen:</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.id}
              type="button"
              onClick={() => setSelectedAspect(ar.id)}
              className={`py-1.5 px-2 rounded-xl text-center border text-[11px] font-bold transition-all ${
                selectedAspect === ar.id
                  ? 'bg-teal-500 text-white border-teal-400 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {ar.id}
            </button>
          ))}
        </div>
      </div>

      {/* Inspiration Presets by Industry */}
      <div className="space-y-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Ideas Rápidas por Categoría:
          </span>
          <div className="flex gap-1">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTabPreset(idx)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                  activeTabPreset === idx
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/80'
                }`}
              >
                {p.category.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          {PRESETS[activeTabPreset].prompts.map((pText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(pText);
                handleGenerate(pText);
              }}
              className="w-full text-left p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 hover:border-teal-500/40 border border-slate-700/40 text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between group"
            >
              <span className="truncate pr-2">{pText}</span>
              <ChevronRight size={12} className="text-slate-500 group-hover:text-teal-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-200">
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success notification when inserted */}
      {insertedSuccessMessage && (
        <div className="p-3 bg-teal-950/80 border border-teal-500/60 rounded-xl flex items-center gap-2 text-xs text-teal-200 animate-fadeIn">
          <Check size={16} className="text-teal-400 shrink-0" />
          <span className="font-semibold">{insertedSuccessMessage}</span>
        </div>
      )}

      {/* Main Generate Button */}
      <button
        type="button"
        onClick={() => handleGenerate()}
        disabled={isGenerating}
        className="w-full py-3.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin text-white" />
            <span>Generando Imagen con Gemini AI...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>Generar Imagen con IA</span>
          </>
        )}
      </button>

      {/* Generation Status Indicator */}
      {isGenerating && statusStep && (
        <div className="text-center py-2 px-3 bg-slate-950/70 border border-teal-500/30 rounded-xl animate-pulse">
          <p className="text-[11px] font-semibold text-teal-300">{statusStep}</p>
        </div>
      )}

      {/* Current Result Showcase */}
      {currentImage && (
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Check size={14} className="text-teal-400" />
              <span>Imagen Generada:</span>
            </span>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
              <span>Regenerar</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500/60 bg-slate-950 shadow-xl group">
            <img
              src={currentImage}
              alt="AI Generated"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-contain bg-slate-900/90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <span className="text-[10px] text-slate-300 line-clamp-2">{prompt}</span>
            </div>
          </div>

          {/* Quick Insertion Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInsert(currentImage, false)}
              className="py-2.5 px-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95"
            >
              <Plus size={14} />
              <span>Insertar al Lienzo</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsert(currentImage, true)}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
              title="Ajustar esta imagen como fondo del producto"
            >
              <Layers size={14} />
              <span>Poner de Fondo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleDownload(currentImage)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
          >
            <Download size={13} />
            <span>Descargar PNG de Alta Resolución</span>
          </button>
        </div>
      )}

      {/* History / Gallery of Generated Images */}
      {history.length > 1 && (
        <div className="pt-4 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Historial de la Sesión ({history.length})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500 bg-slate-900 transition-all cursor-pointer aspect-square"
                onClick={() => {
                  setCurrentImage(item.url);
                  setPrompt(item.prompt);
                }}
              >
                <img
                  src={item.url}
                  alt={item.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsert(item.url, false);
                    }}
                    className="p-1 bg-teal-500 text-white rounded-lg text-[9px] font-bold w-full text-center"
                  >
                    Insertar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
