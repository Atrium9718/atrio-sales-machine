import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Sun, 
  Layers, 
  Upload, 
  CheckCircle2, 
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Folder,
  CreditCard,
  FileText,
  BookOpen,
  Tag,
  Box,
  Ruler,
  Eye,
  ArrowRight,
  Sliders,
  Check,
  ChevronDown
} from 'lucide-react';

export type FinishType = 'none' | 'sin_plastificar' | 'mate' | 'brillo' | 'uv_sectorizado';

export type ProductModelType = 'carpeta' | 'tarjeta' | 'volante' | 'triptico' | 'sticker' | 'caja';

export type ViewAngleType = 'frente' | 'dorso' | 'interior' | 'plano_tecnico';

interface ProductFinishSimulator3DProps {
  productName: string;
  defaultImageUrl: string;
  selectedAttributes?: Record<string, any>;
  hideModelSelector?: boolean;
  onFinishChange?: (finish: FinishType) => void;
  onModelChange?: (model: ProductModelType) => void;
}

interface ProductModelSpec {
  id: ProductModelType;
  name: string;
  icon: any;
  dimensionsClosed: string;
  dimensionsOpen: string;
  paperType: string;
  aspectRatio: number; // width / height
  hasInterior: boolean;
  description: string;
  technicalDetails: {
    closedMm: { w: number; h: number };
    openMm: { w: number; h: number };
    pocketMm?: { w: number; h: number };
    spineMm?: number;
    bleedMm: number;
    safetyMm: number;
  };
}

const PRODUCT_MODELS: Record<ProductModelType, ProductModelSpec> = {
  carpeta: {
    id: 'carpeta',
    name: 'Carpeta Corporativa con Bolsillo',
    icon: Folder,
    dimensionsClosed: '22.5 x 29.5 cm (Cerrada)',
    dimensionsOpen: '45.0 x 29.5 cm (Abierta)',
    paperType: 'Propalcote 300g / Maule Calibre 14',
    aspectRatio: 22.5 / 29.5, // Closed aspect ratio ~0.76
    hasInterior: true,
    description: 'Carpeta con solapa inferior porta-tarjeta, hendido central para lomo de 5mm y capacidad para hojas Carta/A4.',
    technicalDetails: {
      closedMm: { w: 225, h: 295 },
      openMm: { w: 450, h: 295 },
      pocketMm: { w: 210, h: 90 },
      spineMm: 5,
      bleedMm: 3,
      safetyMm: 5,
    }
  },
  tarjeta: {
    id: 'tarjeta',
    name: 'Tarjeta de Presentación',
    icon: CreditCard,
    dimensionsClosed: '9.0 x 5.5 cm',
    dimensionsOpen: '9.0 x 5.5 cm',
    paperType: 'Propalcote 350g Premium / Kraft 300g',
    aspectRatio: 9.0 / 5.5, // ~1.63
    hasInterior: false,
    description: 'Formato estándar 9x5.5cm con opción de esquinas rectas o redondeadas con troquel.',
    technicalDetails: {
      closedMm: { w: 90, h: 55 },
      openMm: { w: 90, h: 55 },
      bleedMm: 2,
      safetyMm: 3,
    }
  },
  volante: {
    id: 'volante',
    name: 'Volante Publicitario (Media Carta)',
    icon: FileText,
    dimensionsClosed: '14.0 x 21.5 cm',
    dimensionsOpen: '14.0 x 21.5 cm',
    paperType: 'Propalcote 115g / 150g Brillante',
    aspectRatio: 14.0 / 21.5, // ~0.65
    hasInterior: false,
    description: 'Volante impreso a todo color por una cara (Tiro) o ambas caras (Tiro y Retiro).',
    technicalDetails: {
      closedMm: { w: 140, h: 215 },
      openMm: { w: 140, h: 215 },
      bleedMm: 3,
      safetyMm: 4,
    }
  },
  triptico: {
    id: 'triptico',
    name: 'Folleto Plegable (Tríptico 3 Cuerpos)',
    icon: BookOpen,
    dimensionsClosed: '9.9 x 21.0 cm (Cerrado)',
    dimensionsOpen: '29.7 x 21.0 cm (Abierto)',
    paperType: 'Propalcote 150g / 200g Mate o Brillante',
    aspectRatio: 9.9 / 21.0, // ~0.47
    hasInterior: true,
    description: 'Tríptico con 2 hendidos y 6 caras de comunicación comercial (3 exteriores y 3 interiores).',
    technicalDetails: {
      closedMm: { w: 99, h: 210 },
      openMm: { w: 297, h: 210 },
      bleedMm: 3,
      safetyMm: 4,
    }
  },
  sticker: {
    id: 'sticker',
    name: 'Etiqueta Adhesiva / Sticker',
    icon: Tag,
    dimensionsClosed: '8.0 x 5.0 cm',
    dimensionsOpen: '8.0 x 5.0 cm',
    paperType: 'Vinilo Adhesivo / Papel Autoadhesivo Fasson',
    aspectRatio: 8.0 / 5.0, // ~1.6
    hasInterior: false,
    description: 'Etiqueta autoadhesiva con medio corte (kiss-cut) y soporte liner siliconado de fácil desprendimiento.',
    technicalDetails: {
      closedMm: { w: 80, h: 50 },
      openMm: { w: 80, h: 50 },
      bleedMm: 2,
      safetyMm: 2,
    }
  },
  caja: {
    id: 'caja',
    name: 'Caja Plegadiza de Empaque',
    icon: Box,
    dimensionsClosed: '10.0 x 15.0 x 5.0 cm',
    dimensionsOpen: 'Plano Troquelado 32 x 28 cm',
    paperType: 'Maule Calibre 16 / Foldcote 320g',
    aspectRatio: 10.0 / 15.0, // ~0.66
    hasInterior: true,
    description: 'Caja con cierre superior de solapas entrelazadas y pestañas laterales de pegue con cola fría.',
    technicalDetails: {
      closedMm: { w: 100, h: 150 },
      openMm: { w: 320, h: 280 },
      bleedMm: 3,
      safetyMm: 5,
    }
  }
};

export default function ProductFinishSimulator3D({
  productName,
  defaultImageUrl,
  selectedAttributes,
  hideModelSelector = true,
  onFinishChange,
  onModelChange,
}: ProductFinishSimulator3DProps) {
  // Detect Initial Model from Product Name
  const detectInitialModel = (): ProductModelType => {
    const nameLower = (productName || '').toLowerCase();
    if (nameLower.includes('carpeta') || nameLower.includes('folder') || nameLower.includes('portafolio') || nameLower.includes('presentador')) {
      return 'carpeta';
    }
    if (nameLower.includes('tarjeta') || nameLower.includes('visita') || nameLower.includes('card') || nameLower.includes('carnet') || nameLower.includes('presentación') || nameLower.includes('fideliz')) {
      return 'tarjeta';
    }
    if (nameLower.includes('triptico') || nameLower.includes('tríptico') || nameLower.includes('diptico') || nameLower.includes('díptico') || nameLower.includes('plegable') || nameLower.includes('folleto') || nameLower.includes('catálogo') || nameLower.includes('catalogo')) {
      return 'triptico';
    }
    if (nameLower.includes('sticker') || nameLower.includes('etiqueta') || nameLower.includes('adhesiv') || nameLower.includes('rótulo') || nameLower.includes('vinilo')) {
      return 'sticker';
    }
    if (nameLower.includes('caja') || nameLower.includes('empaque') || nameLower.includes('packaging') || nameLower.includes('estuche') || nameLower.includes('display')) {
      return 'caja';
    }
    if (nameLower.includes('volante') || nameLower.includes('flyer') || nameLower.includes('afiche') || nameLower.includes('poster') || nameLower.includes('póster') || nameLower.includes('hoja') || nameLower.includes('membret') || nameLower.includes('pendón') || nameLower.includes('banner')) {
      return 'volante';
    }
    return 'carpeta'; // Default high-demand versatile model
  };

  const [activeModel, setActiveModel] = useState<ProductModelType>(detectInitialModel());
  const [activeView, setActiveView] = useState<ViewAngleType>('frente');
  const [activeFinish, setActiveFinish] = useState<FinishType>('uv_sectorizado');
  const [customImage, setCustomImage] = useState<string | null>(null);
  
  // 3D Angle & Lighting
  const [rotateAngle, setRotateAngle] = useState({ x: 8, y: -12 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startAngleX: 8, startAngleY: -12 });
  const [isHovered, setIsHovered] = useState(false);
  const [lightIntensity, setLightIntensity] = useState(0.85);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [roundedCorners, setRoundedCorners] = useState(false);
  const [showTechnicalGuides, setShowTechnicalGuides] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [folderIsOpen, setFolderIsOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect finish from attributes if applicable
  useEffect(() => {
    if (selectedAttributes) {
      const attrValuesStr = JSON.stringify(selectedAttributes).toLowerCase();
      if (attrValuesStr.includes('uv') || attrValuesStr.includes('reserva') || attrValuesStr.includes('sectoriz')) {
        setActiveFinish('uv_sectorizado');
      } else if (attrValuesStr.includes('brillant') || attrValuesStr.includes('brillo')) {
        setActiveFinish('brillo');
      } else if (attrValuesStr.includes('mate') || attrValuesStr.includes('soft')) {
        setActiveFinish('mate');
      } else if (attrValuesStr.includes('sin_plast') || attrValuesStr.includes('sin plastificar')) {
        setActiveFinish('sin_plastificar');
      }
    }
  }, [selectedAttributes]);

  // Update Model if productName changes
  useEffect(() => {
    const detected = detectInitialModel();
    setActiveModel(detected);
  }, [productName]);

  // Handle Drag / Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startAngleX: rotateAngle.x,
      startAngleY: rotateAngle.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setRotateAngle({
        x: Math.max(-60, Math.min(60, dragStart.startAngleX - deltaY * 0.4)),
        y: dragStart.startAngleY + deltaX * 0.5,
      });
    } else if (!isAutoRotating && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle hover tilt when not dragging
      const hoverY = ((x - centerX) / centerX) * 15;
      const hoverX = -((y - centerY) / centerY) * 15;
      setRotateAngle(prev => ({
        x: prev.x * 0.8 + hoverX * 0.2,
        y: prev.y * 0.8 + hoverY * 0.2,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        startAngleX: rotateAngle.x,
        startAngleY: rotateAngle.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;
      setRotateAngle({
        x: Math.max(-60, Math.min(60, dragStart.startAngleX - deltaY * 0.4)),
        y: dragStart.startAngleY + deltaX * 0.5,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Auto rotation loop
  useEffect(() => {
    let animationFrameId: number;
    let angle = 0;
    if (isAutoRotating) {
      const loop = () => {
        angle += 0.015;
        setRotateAngle({
          x: Math.sin(angle * 0.8) * 12,
          y: Math.sin(angle) * 35,
        });
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoRotating]);

  // Set Camera Preset Views
  const setViewPreset = (view: ViewAngleType) => {
    setActiveView(view);
    setIsAutoRotating(false);
    if (view === 'frente') {
      setRotateAngle({ x: 8, y: -10 });
      setFolderIsOpen(false);
    } else if (view === 'dorso') {
      setRotateAngle({ x: 8, y: 170 });
      setFolderIsOpen(false);
    } else if (view === 'interior') {
      setRotateAngle({ x: 12, y: 0 });
      setFolderIsOpen(true);
    } else if (view === 'plano_tecnico') {
      setRotateAngle({ x: 0, y: 0 });
      setFolderIsOpen(true);
    }
  };

  const handleModelChange = (model: ProductModelType) => {
    setActiveModel(model);
    if (onModelChange) onModelChange(model);
    if (model === 'tarjeta') {
      setRoundedCorners(true);
    } else {
      setRoundedCorners(false);
    }
    setViewPreset('frente');
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImage(url);
    }
  };

  const selectFinish = (finish: FinishType) => {
    setActiveFinish(finish);
    if (onFinishChange) onFinishChange(finish);
  };

  const currentModelSpec = PRODUCT_MODELS[activeModel];
  const activeImage = customImage || defaultImageUrl;
  const ModelIcon = currentModelSpec.icon;

  return (
    <div className="bg-slate-900 text-white rounded-[32px] p-4 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP HEADER: SIMULADOR DEDICADO AL PRODUCTO */}
      <div className="relative z-10 border-b border-slate-800/80 pb-5 mb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-lg shadow-teal-500/20">
              <ModelIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                  Simulación 3D: {productName || currentModelSpec.name}
                </h3>
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-bold rounded-full">
                  Fidelidad 1:1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentModelSpec.description}
              </p>
            </div>
          </div>

          {/* Quick upload art button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
              title="Probar con mi propio diseño"
            >
              <Upload size={14} className="text-teal-400" />
              <span>{customImage ? 'Cambiar Arte' : 'Subir Mi Diseño'}</span>
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleCustomUpload} 
              className="hidden" 
            />
          </div>
        </div>

        {/* Solo mostrar selector multi-modelo si hideModelSelector es false */}
        {!hideModelSelector && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Selecciona la Forma del Producto a Simular:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(Object.keys(PRODUCT_MODELS) as ProductModelType[]).map((key) => {
                const item = PRODUCT_MODELS[key];
                const IconComp = item.icon;
                const isSelected = activeModel === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleModelChange(key)}
                    className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border-teal-400 text-white shadow-lg shadow-teal-500/20 ring-1 ring-teal-400'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconComp size={16} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
                      {isSelected && <Check size={12} className="text-teal-400 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block leading-tight">{item.name.split(' ')[0]} {item.name.split(' ')[1] || ''}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{item.dimensionsClosed}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BARRA DE ESPECIFICACIONES TÉCNICAS ESTRUCTURALES EXCLUSIVAS DEL PRODUCTO */}
        <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
              <Ruler size={16} className="shrink-0" />
            </div>
            <div>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                Dimensiones Reales: <span className="font-mono text-teal-300">{currentModelSpec.dimensionsClosed}</span>
              </span>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                {currentModelSpec.dimensionsOpen !== currentModelSpec.dimensionsClosed && (
                  <span>Abierto: <strong className="text-slate-300 font-mono">{currentModelSpec.dimensionsOpen}</strong></span>
                )}
                {currentModelSpec.technicalDetails.spineMm && (
                  <span>• Lomo: <strong className="text-slate-300 font-mono">{currentModelSpec.technicalDetails.spineMm} mm</strong></span>
                )}
                {currentModelSpec.technicalDetails.pocketMm && (
                  <span>• Bolsillo: <strong className="text-slate-300 font-mono">{currentModelSpec.technicalDetails.pocketMm.w / 10} x {currentModelSpec.technicalDetails.pocketMm.h / 10} cm</strong></span>
                )}
                <span>• Sangría: <strong className="text-rose-400 font-mono">+{currentModelSpec.technicalDetails.bleedMm} mm</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-teal-300 bg-teal-950/80 px-3 py-1.5 rounded-xl border border-teal-800/80 font-bold flex items-center gap-1.5">
              <span>📄</span>
              <span>{currentModelSpec.paperType}</span>
            </span>
          </div>
        </div>
      </div>

      {/* SUB-HEADER: CONTROLES DE VISTA 360° ("QUE SE VEA POR TODO LADO") */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
        
        {/* VISTAS MULTILADO RÁPIDAS ESPECÍFICAS DEL PRODUCTO */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-2xl border border-slate-700 overflow-x-auto max-w-full">
          <button
            onClick={() => setViewPreset('frente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'frente'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>{activeModel === 'carpeta' ? 'Frente / Tapa' : activeModel === 'tarjeta' || activeModel === 'volante' ? 'Tiro (Frente)' : 'Frente / Portada'}</span>
          </button>

          <button
            onClick={() => setViewPreset('dorso')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'dorso'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw size={13} />
            <span>{activeModel === 'carpeta' ? 'Dorso / Contraportada' : activeModel === 'tarjeta' || activeModel === 'volante' ? 'Retiro (Dorso)' : 'Reverso'}</span>
          </button>

          {currentModelSpec.hasInterior && (
            <button
              onClick={() => setViewPreset('interior')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeView === 'interior'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Folder size={13} />
              <span>{activeModel === 'carpeta' ? 'Interior & Bolsillo' : activeModel === 'triptico' ? 'Interior (6 Caras)' : 'Interior Estructural'}</span>
            </button>
          )}

          <button
            onClick={() => setViewPreset('plano_tecnico')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'plano_tecnico'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Ruler size={13} />
            <span>Plano & Troquel</span>
          </button>
        </div>

        {/* ACCIONES DE CÁMARA (GIRO 360, ZOOM, GUÍAS) */}
        <div className="flex items-center gap-2">
          {/* Toggle Guías de Cotas */}
          <button
            onClick={() => setShowTechnicalGuides(!showTechnicalGuides)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showTechnicalGuides
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Mostrar u ocultar cotas milimétricas"
          >
            <Ruler size={13} />
            <span>{showTechnicalGuides ? 'Cotas: ON' : 'Cotas: OFF'}</span>
          </button>

          {/* Toggle Giro 360 */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              isAutoRotating
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <RotateCw size={13} className={isAutoRotating ? 'animate-spin' : ''} />
            <span>{isAutoRotating ? 'Pausar Giro' : 'Giro 360°'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
              className="p-1.5 hover:text-teal-300 transition-colors text-slate-400"
              title="Alejar"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-300">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.15))}
              className="p-1.5 hover:text-teal-300 transition-colors text-slate-400"
              title="Acercar"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* 3D STAGE / VIEWPORT INTERACTIVO */}
      <div 
        className="w-full h-[360px] sm:h-[440px] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none perspective-[1400px] overflow-hidden rounded-3xl bg-radial from-slate-800/80 via-slate-900 to-slate-950 border border-slate-800"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsDragging(false); }}
      >
        {/* Stage Floor Pedestal & Sombra de Contacto 3D */}
        <div 
          className="absolute bottom-6 w-3/4 h-12 bg-black/60 rounded-full blur-2xl pointer-events-none transform scale-y-40 transition-transform duration-300"
          style={{
            transform: `scaleY(0.4) scale(${1 + Math.abs(rotateAngle.x) * 0.005}) rotateZ(${rotateAngle.y * 0.2}deg)`
          }}
        />

        {/* Dynamic Light Beam indicator */}
        <div 
          className="absolute top-0 w-full h-full pointer-events-none opacity-20 transition-opacity"
          style={{
            background: `radial-gradient(circle at ${50 + rotateAngle.y}% ${30 - rotateAngle.x}%, rgba(20, 184, 166, 0.4) 0%, transparent 70%)`
          }}
        />

        {/* ========================================================================= */}
        {/* 3D PRODUCT OBJECT CONTAINER */}
        {/* ========================================================================= */}
        <div
          ref={cardRef}
          style={{
            transform: `rotateX(${rotateAngle.x}deg) rotateY(${rotateAngle.y}deg) scale(${zoomLevel})`,
            transition: isDragging ? 'none' : isAutoRotating ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            transformStyle: 'preserve-3d',
          }}
          className="relative transition-all duration-300 flex items-center justify-center"
        >

          {/* ===================================================================== */}
          {/* CASO 1: CARPETA CORPORATIVA CON BOLSILLO TROQUELADO & INTERIOR */}
          {/* ===================================================================== */}
          {activeModel === 'carpeta' && (
            <div className="relative transform-style-3d">
              
              {/* VISTA 1A: CARPETA ABIERTA (INTERIOR CON BOLSILLO Y HOJAS) */}
              {(activeView === 'interior' || folderIsOpen) ? (
                <div className="w-[340px] sm:w-[460px] aspect-[45/29.5] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 relative overflow-hidden flex transform-style-3d">
                  
                  {/* CUERPO IZQUIERDO (Tapa Interna Izquierda) */}
                  <div className="w-1/2 h-full bg-slate-100 border-r border-slate-300 relative p-4 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-1.5 opacity-40">
                      <div className="w-12 h-12 rounded-lg bg-slate-300 mb-2"></div>
                      <div className="w-3/4 h-2 bg-slate-300 rounded"></div>
                      <div className="w-1/2 h-2 bg-slate-300 rounded"></div>
                      <div className="w-full h-1.5 bg-slate-200 rounded mt-4"></div>
                      <div className="w-5/6 h-1.5 bg-slate-200 rounded"></div>
                    </div>

                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      Cara Interior Izquierda (22.5 x 29.5 cm)
                    </div>
                  </div>

                  {/* LOMO CENTRAL CON 2 HENDIDOS (5mm) */}
                  <div className="w-2 h-full bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 border-x border-slate-400 relative flex items-center justify-center">
                    <div className="w-[1px] h-full bg-slate-400"></div>
                  </div>

                  {/* CUERPO DERECHO (Tapa Interna Derecha con Bolsillo Porta-Tarjetas) */}
                  <div className="w-1/2 h-full bg-slate-50 relative p-4 flex flex-col justify-between overflow-hidden">
                    
                    {/* Hojas membretadas insertadas en el bolsillo */}
                    <div className="w-5/6 h-4/5 bg-white border border-slate-200 rounded-sm shadow-md absolute top-4 left-4 p-3 transform -rotate-1 origin-bottom-left">
                      <div className="w-8 h-2 bg-teal-500 rounded-sm mb-2"></div>
                      <div className="space-y-1">
                        <div className="w-full h-1 bg-slate-200 rounded"></div>
                        <div className="w-4/5 h-1 bg-slate-200 rounded"></div>
                        <div className="w-full h-1 bg-slate-200 rounded"></div>
                      </div>
                    </div>

                    {/* SOLAPA / BOLSILLO INFERIOR TROQUELADO */}
                    <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-t-2 border-teal-500 p-3 flex flex-col justify-between shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-teal-400 uppercase tracking-wider">
                          Solapa Troquelada (21 x 9 cm)
                        </span>
                        <span className="text-[7px] text-slate-400">Bolsillo 300g</span>
                      </div>

                      {/* RANURA TROQUELADA PARA TARJETA DE PRESENTACIÓN */}
                      <div className="w-28 h-14 bg-white border border-slate-300 rounded-sm shadow-sm p-1.5 flex flex-col justify-between self-end transform rotate-1 mr-2 relative">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-teal-600"></div>
                          <span className="text-[6px] font-black text-slate-800">FUSIÓN GRÁFICA</span>
                        </div>
                        <span className="text-[5px] text-slate-500">Tarjeta 9.0 x 5.5 cm</span>
                        <div className="absolute -top-1 left-2 w-8 h-[2px] bg-slate-400 rounded-full"></div>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                /* VISTA 1B: CARPETA CERRADA (FRENTE O DORSO) */
                <div className={`w-[240px] sm:w-[280px] aspect-[22.5/29.5] bg-slate-800 rounded-r-xl rounded-l-xs shadow-2xl border border-slate-700 relative overflow-hidden`}>
                  
                  {/* Lomo izquierdo con hendido 3D */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 border-r border-slate-600 z-20 flex items-center justify-center">
                    <span className="text-[6px] text-slate-400 transform -rotate-90 tracking-widest font-mono">5MM</span>
                  </div>

                  {/* Artwork de la Tapa */}
                  <img 
                    src={activeImage} 
                    alt={productName} 
                    className="w-full h-full object-cover select-none pointer-events-none pl-3"
                  />

                  {/* OVERLAYS DE ACABADOS LITOGRÁFICOS */}
                  {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}
                </div>
              )}

            </div>
          )}

          {/* ===================================================================== */}
          {/* CASO 2: TARJETA DE PRESENTACIÓN 9x5.5 CM */}
          {/* ===================================================================== */}
          {activeModel === 'tarjeta' && (
            <div 
              className={`w-[290px] sm:w-[340px] aspect-[9/5.5] bg-slate-800 shadow-2xl border border-white/10 relative overflow-hidden transition-all ${
                roundedCorners ? 'rounded-2xl' : 'rounded-xs'
              }`}
            >
              <img 
                src={activeImage} 
                alt={productName} 
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* OVERLAYS DE ACABADOS LITOGRÁFICOS */}
              {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}

              {/* Dynamic Canto / Edge Thickness Simulation */}
              <div 
                className="absolute inset-0 pointer-events-none border border-white/20"
                style={{
                  boxShadow: `inset ${rotateAngle.y * 0.4}px ${-rotateAngle.x * 0.4}px 12px rgba(255,255,255,0.2)`
                }}
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* CASO 3: VOLANTE MEDIA CARTA */}
          {/* ===================================================================== */}
          {activeModel === 'volante' && (
            <div className="w-[230px] sm:w-[270px] aspect-[14/21.5] bg-slate-800 shadow-2xl border border-white/10 relative overflow-hidden rounded-xs">
              <img 
                src={activeImage} 
                alt={productName} 
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}
            </div>
          )}

          {/* ===================================================================== */}
          {/* CASO 4: TRÍPTICO 3 CUERPOS */}
          {/* ===================================================================== */}
          {activeModel === 'triptico' && (
            <div className="relative transform-style-3d">
              {activeView === 'interior' ? (
                /* Tríptico Desplegado (3 cuerpos de 9.9 x 21 cm) */
                <div className="w-[360px] sm:w-[480px] aspect-[29.7/21] bg-slate-100 rounded-sm shadow-2xl border border-slate-300 relative flex overflow-hidden">
                  <div className="w-1/3 h-full border-r border-dashed border-slate-400 p-3 flex flex-col justify-between bg-slate-50">
                    <span className="text-[8px] font-black text-slate-600">CUERPO 1 (9.9 x 21 cm)</span>
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-teal-500 rounded"></div>
                      <div className="w-4/5 h-1 bg-slate-300 rounded"></div>
                    </div>
                  </div>
                  <div className="w-1/3 h-full border-r border-dashed border-slate-400 p-3 flex flex-col justify-between bg-white">
                    <span className="text-[8px] font-black text-slate-600">CUERPO 2 (CENTRAL)</span>
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-300 rounded"></div>
                      <div className="w-3/4 h-1 bg-slate-300 rounded"></div>
                    </div>
                  </div>
                  <div className="w-1/3 h-full p-3 flex flex-col justify-between bg-slate-50">
                    <span className="text-[8px] font-black text-slate-600">CUERPO 3 (SOLAPA INT.)</span>
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-indigo-500 rounded"></div>
                      <div className="w-2/3 h-1 bg-slate-300 rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tríptico Plegado (Portada 9.9 x 21 cm) */
                <div className="w-[180px] sm:w-[220px] aspect-[9.9/21] bg-slate-800 shadow-2xl border border-white/10 relative overflow-hidden rounded-xs">
                  <img src={activeImage} alt={productName} className="w-full h-full object-cover" />
                  {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* CASO 5: STICKER / ETIQUETA ADHESIVA CON LINER */}
          {/* ===================================================================== */}
          {activeModel === 'sticker' && (
            <div className="relative p-3 bg-amber-50/20 border border-amber-200/30 rounded-xl">
              {/* Papel Liner siliconado de respaldo */}
              <div className="w-[270px] sm:w-[310px] aspect-[8/5] bg-white rounded-lg shadow-2xl p-2 relative overflow-hidden border border-slate-300">
                <div className="w-full h-full border border-dashed border-teal-500 rounded-md flex items-center justify-center p-3 relative bg-slate-900 text-white">
                  <img src={activeImage} alt={productName} className="w-full h-full object-cover rounded-xs" />
                  {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}
                </div>
                {/* Desprendimiento de medio corte (Kiss-cut peel effect) */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-100 border-l border-b border-amber-300 transform rotate-45 shadow-xs"></div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* CASO 6: CAJA DE EMPAQUE PLEGADIZA */}
          {/* ===================================================================== */}
          {activeModel === 'caja' && (
            <div className="w-[220px] sm:w-[260px] aspect-[10/15] bg-slate-900 shadow-2xl border border-slate-700 relative overflow-hidden rounded-sm">
              <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800 border-b border-slate-600 flex items-center justify-center text-[8px] font-black text-slate-300">
                TAPA SUPERIOR DE CIERRE
              </div>
              <img src={activeImage} alt={productName} className="w-full h-full object-cover pt-8" />
              {renderFinishOverlay(activeFinish, rotateAngle, lightIntensity)}
            </div>
          )}

          {/* ===================================================================== */}
          {/* OVERLAY TÉCNICO DE COTAS Y MEDIDAS (TOGGLEABLE) */}
          {/* ===================================================================== */}
          {showTechnicalGuides && (
            <div className="absolute inset-0 pointer-events-none z-30">
              
              {/* Cota Superior (Ancho) */}
              <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[10px] font-mono font-bold text-teal-400 px-1">
                <span className="text-slate-500">|</span>
                <div className="flex-1 flex items-center justify-center gap-1 border-b border-teal-400/60 pb-0.5 mx-1">
                  <span>&larr;</span>
                  <span className="bg-slate-950/90 px-2 py-0.5 rounded-full border border-teal-500/40 text-teal-300">
                    {activeView === 'interior' ? currentModelSpec.dimensionsOpen.split(' ')[0] : currentModelSpec.dimensionsClosed.split(' ')[0]} cm
                  </span>
                  <span>&rarr;</span>
                </div>
                <span className="text-slate-500">|</span>
              </div>

              {/* Cota Lateral (Alto) */}
              <div className="absolute top-0 bottom-0 -right-8 flex flex-col items-center justify-between text-[10px] font-mono font-bold text-teal-400 py-1">
                <span className="text-slate-500">&mdash;</span>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 border-r border-teal-400/60 pr-0.5 my-1">
                  <span>&uarr;</span>
                  <span className="bg-slate-950/90 px-1.5 py-0.5 rounded-full border border-teal-500/40 text-teal-300 transform -rotate-90 whitespace-nowrap">
                    {currentModelSpec.dimensionsClosed.split(' ')[2] || '29.5'} cm
                  </span>
                  <span>&darr;</span>
                </div>
                <span className="text-slate-500">&mdash;</span>
              </div>

              {/* Sangría / Bleed Line (Línea punteada exterior de seguridad) */}
              <div className="absolute -inset-2 border border-dashed border-rose-500/40 rounded-sm pointer-events-none">
                <span className="absolute top-0 right-1 text-[7px] text-rose-400/80 font-mono">
                  Sangría +{currentModelSpec.technicalDetails.bleedMm}mm
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Dynamic Angle Helper Badge */}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
          <span>Ángulo 3D: X: {Math.round(rotateAngle.x)}° | Y: {Math.round(rotateAngle.y)}°</span>
          <span className="text-teal-400 font-bold">| Arrastra libremente</span>
        </div>

        {/* View Indicator Badge */}
        <div className="absolute bottom-3 right-4 text-[10px] font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-800/80 flex items-center gap-1.5">
          <Eye size={12} />
          <span className="uppercase">Vista: {activeView}</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PANEL INFERIOR: SELECTOR DE ACABADOS ESPECIALES LITOGRÁFICOS */}
      {/* ========================================================================= */}
      <div className="mt-5 pt-5 border-t border-slate-800 relative z-10 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Layers size={15} className="text-teal-400" />
            <span>Selecciona el Acabado Especial a Simular:</span>
          </label>

          {/* Opciones adicionales según el modelo */}
          {activeModel === 'tarjeta' && (
            <button
              onClick={() => setRoundedCorners(!roundedCorners)}
              className="text-xs font-bold text-slate-300 hover:text-teal-300 transition-colors flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700"
            >
              <span>Troquel de Esquinas:</span>
              <strong className="text-teal-400">{roundedCorners ? 'Redondeadas (R4mm)' : 'Rectas'}</strong>
            </button>
          )}
        </div>

        {/* CHIPS DE ACABADOS LITOGRÁFICOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          
          {/* 1. Sin Plastificar / Natural */}
          <button
            onClick={() => selectFinish('sin_plastificar')}
            className={`p-3 rounded-2xl text-left border transition-all ${
              activeFinish === 'sin_plastificar'
                ? 'bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400"></span>
              {activeFinish === 'sin_plastificar' && <CheckCircle2 size={14} className="text-teal-400" />}
            </div>
            <p className="text-xs font-bold leading-tight">Sin Plastificar</p>
            <p className="text-[10px] text-slate-400">Papel natural directo</p>
          </button>

          {/* 2. Plastificado Mate */}
          <button
            onClick={() => selectFinish('mate')}
            className={`p-3 rounded-2xl text-left border transition-all ${
              activeFinish === 'mate'
                ? 'bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-300"></span>
              {activeFinish === 'mate' && <CheckCircle2 size={14} className="text-teal-400" />}
            </div>
            <p className="text-xs font-bold leading-tight">Plast. Mate</p>
            <p className="text-[10px] text-slate-400">Tacto sedoso anti-reflejo</p>
          </button>

          {/* 3. Plastificado Brillante */}
          <button
            onClick={() => selectFinish('brillo')}
            className={`p-3 rounded-2xl text-left border transition-all ${
              activeFinish === 'brillo'
                ? 'bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-300 border border-white shadow-xs"></span>
              {activeFinish === 'brillo' && <CheckCircle2 size={14} className="text-teal-400" />}
            </div>
            <p className="text-xs font-bold leading-tight">Plast. Brillante</p>
            <p className="text-[10px] text-slate-400">Realce de color y brillo</p>
          </button>

          {/* 4. Reserva UV Sectorizada */}
          <button
            onClick={() => selectFinish('uv_sectorizado')}
            className={`p-3 rounded-2xl text-left border transition-all ${
              activeFinish === 'uv_sectorizado'
                ? 'bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-600 to-white border border-teal-300"></span>
              {activeFinish === 'uv_sectorizado' && <CheckCircle2 size={14} className="text-teal-400" />}
            </div>
            <p className="text-xs font-bold leading-tight">Reserva UV</p>
            <p className="text-[10px] text-teal-300 font-semibold">Brillo selectivo alto relieve</p>
          </button>

        </div>

        {/* BARRA DE AJUSTE DE LUZ LUMÍNICA */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Sun size={15} className="text-amber-400 shrink-0" />
            <span>Foco Lumínico de Taller:</span>
            <input 
              type="range" 
              min="0.3" 
              max="1.2" 
              step="0.05"
              value={lightIntensity} 
              onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
              className="w-28 accent-teal-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>¿Requieres matriz de troquel especial para tu producto?</span>
            <a 
              href="https://wa.me/573115550199?text=Hola,%20quisiera%20asesoria%20sobre%20troquelado%20y%20acabados%20especiales" 
              target="_blank" 
              rel="noreferrer"
              className="text-teal-400 hover:underline font-bold"
            >
              Asesoría Técnica WhatsApp
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}

/** Helper function to render realistic lithographic finish overlays */
function renderFinishOverlay(finish: FinishType, rotateAngle: { x: number; y: number }, lightIntensity: number) {
  return (
    <>
      {/* 1. Plastificado Brillante */}
      {finish === 'brillo' && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-screen"
          style={{
            background: `linear-gradient(${115 + rotateAngle.y * 2}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,${0.7 * lightIntensity}) 50%, rgba(255,255,255,0.05) 70%, rgba(255,255,255,0) 100%)`,
            transform: `translateX(${rotateAngle.y * 3}px)`,
          }}
        />
      )}

      {/* 2. Plastificado Mate Soft-Touch */}
      {finish === 'mate' && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-soft-light"
          style={{
            background: `radial-gradient(circle at ${50 + rotateAngle.y}% ${50 - rotateAngle.x}%, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.2) 100%)`,
          }}
        />
      )}

      {/* 3. Reserva UV Sectorizada */}
      {finish === 'uv_sectorizado' && (
        <>
          <div className="absolute inset-0 bg-black/20 mix-blend-multiply pointer-events-none" />
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-150"
            style={{
              backgroundImage: `
                radial-gradient(circle at ${50 + rotateAngle.y * 1.5}% ${50 - rotateAngle.x * 1.5}%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 25%, transparent 60%),
                repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 12px, transparent 12px, transparent 24px)
              `,
              opacity: lightIntensity,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="border-2 border-white/50 px-5 py-2.5 rounded-xl backdrop-blur-[1px] shadow-lg"
              style={{
                background: `linear-gradient(${135 + rotateAngle.y * 2}deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.5) 100%)`,
                boxShadow: '0 4px 20px rgba(255,255,255,0.25), inset 0 1px 2px rgba(255,255,255,0.7)',
              }}
            >
              <span className="text-[11px] font-black tracking-widest text-white drop-shadow-md uppercase">
                RESERVA UV BRILLO ALTO
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
