import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  UploadCloud, 
  Palette, 
  Sparkles, 
  Eye, 
  Calendar, 
  Type, 
  Play, 
  Smartphone, 
  Monitor, 
  Gift, 
  Check, 
  Copy, 
  RefreshCw, 
  Wand2, 
  Trash2, 
  Compass,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Maximize2
} from 'lucide-react';
import BannerAiGeneratorModal from './BannerAiGeneratorModal';
import { 
  CURATED_BANNER_IMAGES, 
  GRADIENT_PRESETS, 
  OVERLAY_GRADIENT_PRESETS, 
  OVERLAY_DIRECTIONS,
  ANIMATION_OPTIONS, 
  PLACEMENT_OPTIONS, 
  POPUP_TRIGGER_OPTIONS,
  QUICK_LINK_DESTINATIONS,
  READY_BANNER_TEMPLATES,
  ReadyBannerTemplate
} from './bannerPresets';

export interface BannerExtraConfig {
  textAlign?: 'left' | 'center' | 'right' | string;
  tagBgColor?: string;
  tagTextColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  overlayType?: 'GRADIENT' | 'COLOR' | 'VIGNETTE' | 'NONE' | string;
  overlayDirection?: string;
  [key: string]: any;
}

export interface BannerPopupConfig {
  trigger?: string;
  delaySeconds?: number;
  couponCode?: string;
  discountValue?: string;
  showOncePerSession?: boolean;
  modalSize?: string;
  confetti?: boolean;
  countdownHours?: number;
  [key: string]: any;
}

export interface BannerFormData {
  title: string;
  subtitle: string;
  tag: string;
  ctaText: string;
  placement: string;
  bgType: 'IMAGE' | 'GRADIENT' | 'COLOR' | string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  overlayOpacity: number;
  desktopImageUrl: string;
  mobileImageUrl: string;
  linkType: string;
  linkUrl: string;
  animationType: string;
  displayOrder: number;
  startDate: string;
  endDate: string;
  active: boolean;
  isPopup: boolean;
  popupConfig: BannerPopupConfig;
  extraConfig: BannerExtraConfig;
}

interface BannerFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
}

export default function BannerForm({ initialData, onSubmit, onCancel }: BannerFormProps) {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetField, setAiTargetField] = useState<'desktop' | 'mobile'>('desktop');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'top_bar' | 'popup'>('desktop');
  const [previewAnimationKey, setPreviewAnimationKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'content' | 'background' | 'placement' | 'popup'>('content');
  const [selectedGalleryModal, setSelectedGalleryModal] = useState<'desktop' | 'mobile' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, reset } = useForm<BannerFormData>({
    shouldUnregister: false,
    defaultValues: {
      title: 'Impresión Litográfica de Alta Definición 300 DPI',
      subtitle: 'Tecnología digital y offset con chequeo pre-prensa incluido y cotización automática por volumen.',
      tag: 'Calidad Litográfica Garantizada',
      ctaText: 'Explorar Catálogo',
      placement: 'hero',
      bgType: 'IMAGE',
      bgColor: '#0f172a',
      gradientFrom: '#042f2e',
      gradientTo: '#0f766e',
      textColor: '#ffffff',
      overlayOpacity: 55,
      desktopImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
      mobileImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
      linkType: 'CATEGORY',
      linkUrl: '/categoria/todas',
      animationType: 'fade',
      displayOrder: 0,
      startDate: '',
      endDate: '',
      active: true,
      isPopup: false,
      popupConfig: {
        trigger: 'delay',
        delaySeconds: 4,
        couponCode: 'FUSION2026',
        discountValue: '20% OFF',
        showOncePerSession: true,
        modalSize: 'md',
        confetti: true,
        countdownHours: 48,
      },
      extraConfig: {
        textAlign: 'left',
        tagBgColor: '#14b8a6',
        tagTextColor: '#022c22',
        ctaBgColor: '#14b8a6',
        ctaTextColor: '#022c22',
        overlayType: 'GRADIENT',
        overlayDirection: '135deg',
      }
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        startDate: initialData.startDate ? String(initialData.startDate).split('T')[0] : '',
        endDate: initialData.endDate ? String(initialData.endDate).split('T')[0] : '',
        overlayOpacity: initialData.overlayOpacity !== undefined ? Number(initialData.overlayOpacity) : 55,
        displayOrder: initialData.displayOrder !== undefined ? Number(initialData.displayOrder) : 0,
        desktopImageUrl: initialData.desktopImageUrl || initialData.imageUrl || '',
        mobileImageUrl: initialData.mobileImageUrl || '',
        gradientFrom: initialData.gradientFrom || '#042f2e',
        gradientTo: initialData.gradientTo || '#0f766e',
        extraConfig: {
          textAlign: 'left',
          tagBgColor: '#14b8a6',
          tagTextColor: '#022c22',
          ctaBgColor: '#14b8a6',
          ctaTextColor: '#022c22',
          overlayType: 'GRADIENT',
          overlayDirection: '135deg',
          ...(initialData.extraConfig || {})
        },
        popupConfig: {
          trigger: 'delay',
          delaySeconds: 4,
          couponCode: 'FUSION2026',
          discountValue: '20% OFF',
          showOncePerSession: true,
          modalSize: 'md',
          confetti: true,
          countdownHours: 48,
          ...(initialData.popupConfig || {})
        }
      });
      if (initialData.placement === 'popup_modal' || initialData.isPopup) {
        setPreviewDevice('popup');
      } else if (initialData.placement === 'top_bar') {
        setPreviewDevice('top_bar');
      }
    }
  }, [initialData, reset]);

  const bgType = watch('bgType');
  const placement = watch('placement');
  const desktopImageUrl = watch('desktopImageUrl');
  const mobileImageUrl = watch('mobileImageUrl');
  const bgColor = watch('bgColor');
  const gradientFrom = watch('gradientFrom');
  const gradientTo = watch('gradientTo');
  const textColor = watch('textColor');
  const overlayOpacity = watch('overlayOpacity');
  const title = watch('title');
  const subtitle = watch('subtitle');
  const tag = watch('tag');
  const ctaText = watch('ctaText');
  const animationType = watch('animationType');
  const isPopup = watch('isPopup') || placement === 'popup_modal';
  const popupConfig = watch('popupConfig') || {};
  const extraConfig = watch('extraConfig') || {};
  const active = watch('active');
  const linkUrl = watch('linkUrl');

  const overlayType = extraConfig.overlayType || 'GRADIENT';
  const overlayDirection = extraConfig.overlayDirection || '135deg';

  const updateExtraConfig = (patch: Partial<BannerExtraConfig>) => {
    setValue('extraConfig', { ...extraConfig, ...patch }, { shouldDirty: true });
  };

  const updatePopupConfig = (patch: Partial<BannerPopupConfig>) => {
    setValue('popupConfig', { ...popupConfig, ...patch }, { shouldDirty: true });
  };

  const handleApplyTemplate = (tpl: ReadyBannerTemplate) => {
    setValue('title', tpl.title, { shouldDirty: true });
    setValue('subtitle', tpl.subtitle, { shouldDirty: true });
    setValue('tag', tpl.tag, { shouldDirty: true });
    setValue('ctaText', tpl.ctaText, { shouldDirty: true });
    setValue('linkType', tpl.linkType, { shouldDirty: true });
    setValue('linkUrl', tpl.linkUrl, { shouldDirty: true });
    setValue('placement', tpl.placement, { shouldDirty: true });
    setValue('animationType', tpl.animationType, { shouldDirty: true });
    setValue('bgType', tpl.bgType, { shouldDirty: true });
    setValue('desktopImageUrl', tpl.desktopImageUrl, { shouldDirty: true });
    setValue('mobileImageUrl', tpl.mobileImageUrl, { shouldDirty: true });
    setValue('gradientFrom', tpl.gradientFrom, { shouldDirty: true });
    setValue('gradientTo', tpl.gradientTo, { shouldDirty: true });
    setValue('bgColor', tpl.bgColor, { shouldDirty: true });
    setValue('textColor', tpl.textColor, { shouldDirty: true });
    setValue('overlayOpacity', tpl.overlayOpacity, { shouldDirty: true });
    setValue('extraConfig', { ...extraConfig, ...tpl.extraConfig }, { shouldDirty: true });

    if (tpl.placement === 'top_bar') {
      setPreviewDevice('top_bar');
    } else if (tpl.placement === 'popup_modal') {
      setPreviewDevice('popup');
    } else {
      setPreviewDevice('desktop');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'desktopImageUrl' | 'mobileImageUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setValue(field, event.target.result as string, { shouldDirty: true, shouldValidate: true });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiApply = (aiData: {
    imageUrl: string;
    title?: string;
    subtitle?: string;
    tag?: string;
    ctaText?: string;
    targetField?: 'desktop' | 'mobile';
  }) => {
    const target = aiData.targetField || aiTargetField;
    setValue('bgType', 'IMAGE');
    if (target === 'mobile') {
      setValue('mobileImageUrl', aiData.imageUrl, { shouldDirty: true, shouldValidate: true });
      setPreviewDevice('mobile');
    } else {
      setValue('desktopImageUrl', aiData.imageUrl, { shouldDirty: true, shouldValidate: true });
      setPreviewDevice('desktop');
    }

    if (aiData.title && (!title || title.trim() === '')) setValue('title', aiData.title);
    if (aiData.subtitle && (!subtitle || subtitle.trim() === '')) setValue('subtitle', aiData.subtitle);
    if (aiData.tag && (!tag || tag.trim() === '')) setValue('tag', aiData.tag);
    if (aiData.ctaText && (!ctaText || ctaText.trim() === '')) setValue('ctaText', aiData.ctaText);
  };

  const triggerAnimationPreview = () => {
    setPreviewAnimationKey(prev => prev + 1);
  };

  // Compute live animation class
  const getAnimationClass = () => {
    switch (animationType) {
      case 'slide':
        return 'animate-in slide-in-from-left duration-700 ease-out';
      case 'zoom':
        return 'animate-in zoom-in-95 duration-700 ease-out';
      case 'kenburns':
        return 'scale-105 transition-transform duration-3000 ease-linear';
      case 'bounce':
        return 'animate-bounce duration-1000';
      case 'pulse':
        return 'animate-pulse duration-2000';
      case 'fade':
      default:
        return 'animate-in fade-in duration-700 ease-out';
    }
  };

  // Compute live overlay gradient
  const computeOverlayBackground = () => {
    if (overlayType === 'NONE') return 'transparent';
    if (overlayType === 'COLOR') return bgColor || '#0f172a';
    if (overlayType === 'VIGNETTE') {
      return 'linear-gradient(90deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.65) 45%, rgba(2,6,23,0.1) 80%, transparent 100%)';
    }
    if (overlayDirection === 'radial') {
      return `radial-gradient(circle at center, ${gradientFrom || '#042f2e'}, ${gradientTo || '#0f766e'})`;
    }
    return `linear-gradient(${overlayDirection || '135deg'}, ${gradientFrom || '#042f2e'}, ${gradientTo || '#0f766e'})`;
  };

  const onFormSubmit = async (data: BannerFormData) => {
    try {
      setIsSaving(true);
      const payload = {
        ...data,
        displayOrder: Number(data.displayOrder) || 0,
        overlayOpacity: Number(data.overlayOpacity) || 0,
        startDate: data.startDate && data.startDate.trim() !== '' ? data.startDate : null,
        endDate: data.endDate && data.endDate.trim() !== '' ? data.endDate : null,
      };
      await onSubmit(payload);
    } catch (e: any) {
      console.error('Error in onFormSubmit:', e);
      alert('Error al guardar: ' + (e?.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      
      {/* 1. Quick Ready Templates Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-400" />
            <span className="text-xs font-black uppercase tracking-wider text-teal-300">
              Plantillas Rápidas Litográficas (1 Clic para Cargar)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAiTargetField('desktop');
              setIsAiModalOpen(true);
            }}
            className="text-xs font-bold text-teal-300 hover:text-teal-100 flex items-center gap-1.5 cursor-pointer bg-teal-950/80 px-3 py-1 rounded-full border border-teal-500/30"
          >
            <Wand2 size={13} />
            <span>Generar con IA Gemini</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {READY_BANNER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Studio Grid (Controls on Left, Live Simulator on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-1 flex gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Type size={14} />
              <span>1. Textos & Botón</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('background')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'background'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Palette size={14} />
              <span>2. Imagen & Capas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('placement')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'placement'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass size={14} />
              <span>3. Ubicación & Fechas</span>
            </button>

            {(isPopup || placement === 'popup_modal') && (
              <button
                type="button"
                onClick={() => setActiveTab('popup')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'popup'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Gift size={14} />
                <span>4. Modal Popup</span>
              </button>
            )}
          </div>

          {/* TAB 1: CONTENT & BUTTONS */}
          {activeTab === 'content' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Type size={14} className="text-teal-600" />
                  Jerarquía de Textos & Llamado a la Acción
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Paso 1 de 3</span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Título Principal del Banner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title', { required: true })}
                  placeholder="Ej: Impresión Litográfica de Alta Definición 300 DPI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Subtítulo / Mensaje Promocional
                </label>
                <textarea
                  {...register('subtitle')}
                  rows={2}
                  placeholder="Ej: Tecnología digital y offset con chequeo pre-prensa incluido y cotización automática."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Badge & Tag styling */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Etiqueta / Badge Superior
                  </label>
                  <span className="text-[10px] text-slate-500">Opcional para destacar ofertas</span>
                </div>

                <input
                  type="text"
                  {...register('tag')}
                  placeholder="Ej: Oferta Especial • Aliado Atrio • 300 DPI"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Color Fondo Badge</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={extraConfig.tagBgColor || '#14b8a6'}
                        onChange={(e) => updateExtraConfig({ tagBgColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={extraConfig.tagBgColor || '#14b8a6'}
                        onChange={(e) => updateExtraConfig({ tagBgColor: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Color Texto Badge</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={extraConfig.tagTextColor || '#022c22'}
                        onChange={(e) => updateExtraConfig({ tagTextColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={extraConfig.tagTextColor || '#022c22'}
                        onChange={(e) => updateExtraConfig({ tagTextColor: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action Button */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Botón de Acción (CTA) & Enlace
                  </label>
                  <span className="text-[10px] text-slate-500">Destino del clic del cliente</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Texto del Botón</label>
                    <input
                      type="text"
                      {...register('ctaText')}
                      placeholder="Ej: Explorar Catálogo"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Destino Rápido</label>
                    <select
                      value={linkUrl}
                      onChange={(e) => setValue('linkUrl', e.target.value, { shouldDirty: true })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      {QUICK_LINK_DESTINATIONS.map((dst, i) => (
                        <option key={i} value={dst.value}>{dst.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">O escribe una URL / Enlace personalizado:</label>
                  <input
                    type="text"
                    {...register('linkUrl')}
                    placeholder="Ej: /categoria/papeleria o https://www.atrioagencia.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Color Fondo Botón</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={extraConfig.ctaBgColor || '#14b8a6'}
                        onChange={(e) => updateExtraConfig({ ctaBgColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={extraConfig.ctaBgColor || '#14b8a6'}
                        onChange={(e) => updateExtraConfig({ ctaBgColor: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Color Texto Botón</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={extraConfig.ctaTextColor || '#022c22'}
                        onChange={(e) => updateExtraConfig({ ctaTextColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={extraConfig.ctaTextColor || '#022c22'}
                        onChange={(e) => updateExtraConfig({ ctaTextColor: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Alineación Visual del Contenido
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'left', label: '⬅️ Izquierda' },
                    { id: 'center', label: '↔️ Centro' },
                    { id: 'right', label: '➡️ Derecha' },
                  ].map((align) => (
                    <button
                      key={align.id}
                      type="button"
                      onClick={() => updateExtraConfig({ textAlign: align.id as any })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (extraConfig.textAlign || 'left') === align.id
                          ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {align.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BACKGROUND, IMAGES & OVERLAYS */}
          {activeTab === 'background' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Palette size={14} className="text-teal-600" />
                  Fotografía Responsive & Motor de Degradados
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Paso 2 de 3</span>
              </div>

              {/* Background Type Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Tipo de Fondo Principal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'IMAGE', label: '🖼️ Fotografía HD', desc: 'Foto + Degradado' },
                    { id: 'GRADIENT', label: '🌈 Degradado Puro', desc: 'Gama Litográfica' },
                    { id: 'COLOR', label: '🎨 Color Sólido', desc: 'Tono plano limpio' },
                  ].map((bgOption) => (
                    <button
                      key={bgOption.id}
                      type="button"
                      onClick={() => setValue('bgType', bgOption.id, { shouldDirty: true })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bgType === bgOption.id
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-950'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-black">{bgOption.label}</div>
                      <div className="text-[10px] text-slate-500">{bgOption.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* IMAGE SELECTION & RESPONSIVE CONFIG */}
              {bgType === 'IMAGE' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  
                  {/* Desktop Image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Monitor size={14} className="text-teal-600" />
                        Imagen para Pantallas Desktop (16:9)
                      </label>
                      <span className="text-[10px] text-teal-700 font-bold">Recomendado: 2000 x 800 px</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        {...register('desktopImageUrl')}
                        placeholder="URL de la imagen panorámica..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                      <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                        <UploadCloud size={14} />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'desktopImageUrl')}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryModal('desktop')}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-teal-200"
                      >
                        <Palette size={12} />
                        <span>Elegir de Galería Litográfica HD</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAiTargetField('desktop');
                          setIsAiModalOpen(true);
                        }}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        <Wand2 size={12} className="text-teal-600" />
                        <span>Generar con IA (16:9)</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Image */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={14} className="text-amber-600" />
                        Imagen para Celular / Smartphone (Vertical 9:16)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (desktopImageUrl) {
                            setValue('mobileImageUrl', desktopImageUrl, { shouldDirty: true });
                          }
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        Usar la misma de escritorio
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        {...register('mobileImageUrl')}
                        placeholder="URL de imagen vertical (opcional)..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                      <label className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                        <UploadCloud size={14} />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'mobileImageUrl')}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryModal('mobile')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-200"
                      >
                        <Palette size={12} />
                        <span>Galería HD Móvil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAiTargetField('mobile');
                          setIsAiModalOpen(true);
                        }}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        <Wand2 size={12} className="text-amber-600" />
                        <span>Generar para Celular con IA (9:16)</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* OVERLAY & GRADIENT ENGINE */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-teal-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                      Superposición de Degradado & Legibilidad de Textos
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Opacidad: {overlayOpacity}%
                  </span>
                </div>

                {/* Overlay Mode */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'GRADIENT', label: '🌈 Degradado 2 Colores' },
                    { id: 'VIGNETTE', label: '🌘 Viñeta de Contraste' },
                    { id: 'COLOR', label: '🎨 Color Sólido' },
                    { id: 'NONE', label: '🚫 Sin Capa' },
                  ].map((ov) => (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => updateExtraConfig({ overlayType: ov.id as any })}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        overlayType === ov.id
                          ? 'bg-teal-500 text-slate-950 border-teal-400 ring-2 ring-teal-400/30 font-black'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {ov.label}
                    </button>
                  ))}
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                    <span>Intensidad de la Capa (Opacidad):</span>
                    <span className="font-mono text-teal-400">{overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    {...register('overlayOpacity')}
                    className="w-full accent-teal-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Gradient Direction */}
                {overlayType === 'GRADIENT' && (
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                      Dirección del Degradado
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {OVERLAY_DIRECTIONS.map((dir) => (
                        <button
                          key={dir.value}
                          type="button"
                          onClick={() => updateExtraConfig({ overlayDirection: dir.value })}
                          className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer ${
                            overlayDirection === dir.value
                              ? 'bg-teal-500/20 border-teal-400 text-teal-300 ring-1 ring-teal-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                          }`}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gradient Colors Swatches */}
                {(overlayType === 'GRADIENT' || bgType === 'GRADIENT') && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                      Presets Litográficos Recomendados:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {OVERLAY_GRADIENT_PRESETS.map((gp, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setValue('gradientFrom', gp.from, { shouldDirty: true });
                            setValue('gradientTo', gp.to, { shouldDirty: true });
                            updateExtraConfig({ overlayDirection: gp.direction });
                          }}
                          className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:border-slate-500 text-left transition-all cursor-pointer group"
                        >
                          <div
                            className="h-5 rounded-lg mb-1 border border-white/20"
                            style={{ backgroundImage: `linear-gradient(90deg, ${gp.from}, ${gp.to})` }}
                          />
                          <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-teal-300">
                            {gp.name}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Color Inicial (From)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={gradientFrom}
                            onChange={(e) => setValue('gradientFrom', e.target.value, { shouldDirty: true })}
                            className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            {...register('gradientFrom')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Color Final (To)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={gradientTo}
                            onChange={(e) => setValue('gradientTo', e.target.value, { shouldDirty: true })}
                            className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            {...register('gradientTo')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: PLACEMENT & ANIMATION & SCHEDULING */}
          {activeTab === 'placement' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Compass size={14} className="text-teal-600" />
                  Ubicación, Animación & Programación
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Paso 3 de 3</span>
              </div>

              {/* Placement */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Ubicación en la Tienda
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLACEMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setValue('placement', opt.value, { shouldDirty: true });
                        if (opt.value === 'popup_modal') {
                          setValue('isPopup', true);
                          setPreviewDevice('popup');
                        } else if (opt.value === 'top_bar') {
                          setPreviewDevice('top_bar');
                        } else {
                          setValue('isPopup', false);
                          setPreviewDevice('desktop');
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        placement === opt.value
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Type */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Efecto de Entrada Visual (Animación)
                  </label>
                  <button
                    type="button"
                    onClick={triggerAnimationPreview}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-teal-50 px-2 py-0.5 rounded-md"
                  >
                    <Play size={11} />
                    <span>Probar Animación</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANIMATION_OPTIONS.map((anim) => (
                    <button
                      key={anim.value}
                      type="button"
                      onClick={() => {
                        setValue('animationType', anim.value, { shouldDirty: true });
                        triggerAnimationPreview();
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        animationType === anim.value
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-black">{anim.label.split('(')[0]}</div>
                      <div className="text-[10px] text-slate-500">{anim.label.split('(')[1]?.replace(')', '') || ''}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Display Order */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-600" />
                    Fechas de Campaña & Prioridad
                  </span>
                  <span className="text-[10px] text-slate-500">Opcional para banners temporales</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      {...register('startDate')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Fecha de Fin</label>
                    <input
                      type="date"
                      {...register('endDate')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Orden de Visualización</label>
                    <input
                      type="number"
                      {...register('displayOrder')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                      placeholder="0, 1, 2..."
                    />
                  </div>
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Estado de Publicación</span>
                  <span className="text-[11px] text-slate-500">¿Deseas que este banner sea visible para los clientes inmediatamente?</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('active')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
              </div>

            </div>
          )}

          {/* TAB 4: POPUP & COUPONS */}
          {activeTab === 'popup' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Gift size={14} className="text-teal-600" />
                  Configuración de Ventana Emergente (Popup Promo)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Disparador de Activación
                  </label>
                  <select
                    value={popupConfig.trigger || 'delay'}
                    onChange={(e) => updatePopupConfig({ trigger: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {POPUP_TRIGGER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Retraso en Segundos
                  </label>
                  <input
                    type="number"
                    value={popupConfig.delaySeconds || 4}
                    onChange={(e) => updatePopupConfig({ delaySeconds: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/80 space-y-3">
                <span className="text-xs font-black text-teal-900 uppercase tracking-wider block">
                  Cupón & Descuento Copiable
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase mb-1">Código del Cupón</label>
                    <input
                      type="text"
                      value={popupConfig.couponCode || ''}
                      onChange={(e) => updatePopupConfig({ couponCode: e.target.value.toUpperCase() })}
                      placeholder="Ej: FUSION2026"
                      className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-teal-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase mb-1">Valor Visible (Badge)</label>
                    <input
                      type="text"
                      value={popupConfig.discountValue || ''}
                      onChange={(e) => updatePopupConfig({ discountValue: e.target.value })}
                      placeholder="Ej: 20% OFF o $50.000 COP"
                      className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs font-bold text-teal-950"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-teal-900">Efecto Confeti al Copiar Cupón</span>
                  <input
                    type="checkbox"
                    checked={popupConfig.confetti ?? true}
                    onChange={(e) => updatePopupConfig({ confetti: e.target.checked })}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Live Responsive Simulator (5 cols - Sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          
          <div className="bg-slate-950 text-white rounded-[28px] p-5 shadow-2xl border border-slate-800 space-y-4">
            
            {/* Simulator Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-teal-400" />
                <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                  Simulador en Vivo
                </span>
              </div>

              {/* Viewport Switcher */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista Pantalla Completa Desktop"
                >
                  <Monitor size={12} />
                  <span>Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista Celular Vertical"
                >
                  <Smartphone size={12} />
                  <span>Móvil</span>
                </button>

                <button
                  type="button"
                  onClick={triggerAnimationPreview}
                  className="px-2 py-1 text-slate-400 hover:text-teal-300 ml-1 rounded-lg transition-colors"
                  title="Reproducir animación de entrada"
                >
                  <Play size={12} />
                </button>
              </div>
            </div>

            {/* LIVE SIMULATION CANVAS */}
            <div className="flex justify-center items-center py-2 min-h-[300px]">
              
              {/* TOP BAR PREVIEW */}
              {previewDevice === 'top_bar' || placement === 'top_bar' ? (
                <div
                  className="w-full py-3 px-4 rounded-xl text-center text-white shadow-md relative overflow-hidden transition-all"
                  style={{
                    backgroundColor: bgColor || '#042f2e',
                    backgroundImage: bgType === 'GRADIENT' ? `linear-gradient(90deg, ${gradientFrom || '#042f2e'}, ${gradientTo || '#0f766e'})` : undefined
                  }}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                    {tag && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                        style={{
                          backgroundColor: extraConfig.tagBgColor || '#5eead4',
                          color: extraConfig.tagTextColor || '#042f2e'
                        }}
                      >
                        {tag}
                      </span>
                    )}
                    <span>{title}</span>
                    {ctaText && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs ml-1"
                        style={{
                          backgroundColor: extraConfig.ctaBgColor || '#ffffff',
                          color: extraConfig.ctaTextColor || '#042f2e'
                        }}
                      >
                        {ctaText}
                      </span>
                    )}
                  </div>
                </div>
              ) : previewDevice === 'popup' || isPopup || placement === 'popup_modal' ? (
                
                /* POPUP MODAL PREVIEW */
                <div className="w-full max-w-[340px] bg-white rounded-3xl overflow-hidden shadow-2xl text-slate-900 border border-slate-100">
                  <div className="h-32 relative bg-slate-950 overflow-hidden">
                    {bgType === 'IMAGE' && desktopImageUrl ? (
                      <img src={desktopImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundImage: `linear-gradient(135deg, ${gradientFrom || '#042f2e'}, ${gradientTo || '#0f766e'})` }}
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: computeOverlayBackground(), opacity: Number(overlayOpacity) / 100 }}
                    />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      {tag && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase mb-1"
                          style={{ backgroundColor: extraConfig.tagBgColor || '#14b8a6', color: extraConfig.tagTextColor || '#022c22' }}
                        >
                          {tag}
                        </span>
                      )}
                      <h4 className="text-sm font-black leading-tight truncate">{title}</h4>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 text-center">
                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{subtitle}</p>
                    {popupConfig.couponCode && (
                      <div className="p-2.5 bg-teal-50 border border-dashed border-teal-300 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-teal-950">{popupConfig.couponCode}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-500 text-white rounded-md">Copiar</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-xs font-black shadow-sm"
                      style={{ backgroundColor: extraConfig.ctaBgColor || '#14b8a6', color: extraConfig.ctaTextColor || '#022c22' }}
                    >
                      {ctaText || 'Reclamar'}
                    </button>
                  </div>
                </div>

              ) : (

                /* DESKTOP & MOBILE RESPONSIVE CANVAS */
                <div
                  key={previewAnimationKey}
                  className={`relative overflow-hidden shadow-2xl transition-all duration-300 flex items-center ${
                    previewDevice === 'mobile'
                      ? 'w-[280px] min-h-[380px] rounded-[32px] border-4 border-slate-800'
                      : 'w-full min-h-[260px] rounded-2xl border border-slate-800'
                  }`}
                  style={{
                    backgroundColor: bgColor || '#0f172a',
                    backgroundImage: bgType === 'GRADIENT'
                      ? `linear-gradient(${overlayDirection}, ${gradientFrom || '#042f2e'}, ${gradientTo || '#0f766e'})`
                      : undefined
                  }}
                >
                  {/* Background Image (Responsive Desktop vs Mobile) */}
                  {bgType === 'IMAGE' && (
                    <img
                      src={
                        previewDevice === 'mobile' && mobileImageUrl
                          ? mobileImageUrl
                          : (desktopImageUrl || mobileImageUrl || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop')
                      }
                      alt={title}
                      className={`absolute inset-0 w-full h-full object-cover ${getAnimationClass()}`}
                    />
                  )}

                  {/* Configurable Overlay Layer */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-500"
                    style={{
                      background: computeOverlayBackground(),
                      opacity: overlayType === 'NONE' ? 0 : Number(overlayOpacity) / 100
                    }}
                  />

                  {/* Banner Content */}
                  <div className={`relative z-10 p-5 md:p-6 w-full ${
                    extraConfig.textAlign === 'center' ? 'text-center mx-auto' : (extraConfig.textAlign === 'right' ? 'text-right ml-auto' : 'text-left')
                  }`}>
                    {tag && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black mb-2 uppercase tracking-wider shadow-xs"
                        style={{
                          backgroundColor: extraConfig.tagBgColor || '#14b8a6',
                          color: extraConfig.tagTextColor || '#022c22'
                        }}
                      >
                        <Sparkles size={10} />
                        {tag}
                      </span>
                    )}

                    <h3 className={`font-black text-white leading-tight drop-shadow-md mb-2 ${
                      previewDevice === 'mobile' ? 'text-lg' : 'text-xl md:text-2xl'
                    }`}>
                      {title}
                    </h3>

                    <p className={`text-slate-200 font-medium leading-relaxed drop-shadow-sm mb-4 line-clamp-3 ${
                      previewDevice === 'mobile' ? 'text-[11px]' : 'text-xs md:text-sm max-w-md'
                    } ${extraConfig.textAlign === 'center' ? 'mx-auto' : ''}`}>
                      {subtitle}
                    </p>

                    <div>
                      <span
                        className="inline-flex items-center px-4 py-2 rounded-full font-black text-xs shadow-md transition-transform active:scale-95"
                        style={{
                          backgroundColor: extraConfig.ctaBgColor || '#14b8a6',
                          color: extraConfig.ctaTextColor || '#022c22'
                        }}
                      >
                        <span>{ctaText || 'Explorar'}</span>
                        <ArrowRight size={12} className="ml-1.5" />
                      </span>
                    </div>
                  </div>

                </div>

              )}

            </div>

            {/* Technical Specs Footer */}
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="font-mono">
                {previewDevice === 'mobile' ? '📱 Formato Vertical (9:16)' : '🖥️ Formato Horizontal (16:9)'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {active ? '🟢 Activo' : '⚪ Pausado'}
              </span>
            </div>

          </div>

          {/* Action Buttons Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-teal-500/20 transition-transform active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Guardar y Publicar Banner</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* MODAL: Galería Litográfica HD */}
      {selectedGalleryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Galería de Fotografía Gráfica HD ({selectedGalleryModal === 'mobile' ? 'Formato Celular' : 'Formato Desktop'})
                </h3>
                <p className="text-xs text-slate-500">Selecciona una imagen de alta resolución litográfica de 300 DPI</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGalleryModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURATED_BANNER_IMAGES.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    if (selectedGalleryModal === 'mobile') {
                      setValue('mobileImageUrl', img.url, { shouldDirty: true });
                    } else {
                      setValue('desktopImageUrl', img.url, { shouldDirty: true });
                    }
                    setValue('bgType', 'IMAGE');
                    setSelectedGalleryModal(null);
                  }}
                  className="rounded-xl overflow-hidden border border-slate-200 hover:border-teal-500 hover:ring-2 hover:ring-teal-500/20 text-left transition-all group cursor-pointer"
                >
                  <div className="h-28 bg-slate-100 overflow-hidden relative">
                    <img src={img.thumbnail} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-950/80 text-white rounded text-[9px] font-black uppercase">
                      {img.category}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white">
                    <div className="text-xs font-bold text-slate-900 truncate">{img.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{img.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Creative Studio */}
      <BannerAiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        targetField={aiTargetField}
        initialAspectRatio={aiTargetField === 'mobile' ? '9:16' : '16:9'}
        onApply={handleAiApply}
      />

    </form>
  );
}
