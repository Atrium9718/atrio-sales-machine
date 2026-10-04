import React, { useState } from 'react';
import { CmsBlock, CmsBlockType, ValuePropItem, FaqItem, TestimonialItem, PrepressSpecItem } from '../../types/cms';
import MediaPickerModal from '../media/MediaPickerModal';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  Layout, 
  HelpCircle, 
  Quote, 
  CheckCircle2, 
  FileCode, 
  Phone, 
  Calculator, 
  Layers 
} from 'lucide-react';

interface Props {
  block: CmsBlock;
  onSave: (updatedBlock: CmsBlock) => void;
  onClose: () => void;
}

export default function CmsBlockEditorModal({ block, onSave, onClose }: Props) {
  const [formData, setFormData] = useState<any>(JSON.parse(JSON.stringify(block)));
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Helper for Value Prop items
  const addValuePropItem = () => {
    const newItem: ValuePropItem = {
      id: `vp-${Date.now()}`,
      icon: 'ShieldCheck',
      title: 'Nuevo Beneficio',
      description: 'Descripción breve de la ventaja litográfica.',
      highlightBadge: 'Garantía',
    };
    handleChange('items', [...(formData.items || []), newItem]);
  };

  const updateValuePropItem = (index: number, field: string, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], [field]: value };
    handleChange('items', items);
  };

  const removeValuePropItem = (index: number) => {
    const items = [...(formData.items || [])].filter((_, i) => i !== index);
    handleChange('items', items);
  };

  // Helper for FAQ items
  const addFaqItem = () => {
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      question: '¿Pregunta frecuente de ejemplo?',
      answer: 'Respuesta detallada con información clara para el cliente.',
      category: 'General',
    };
    handleChange('items', [...(formData.items || []), newItem]);
  };

  const updateFaqItem = (index: number, field: string, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], [field]: value };
    handleChange('items', items);
  };

  const removeFaqItem = (index: number) => {
    const items = [...(formData.items || [])].filter((_, i) => i !== index);
    handleChange('items', items);
  };

  // Helper for Testimonial items
  const addTestimonialItem = () => {
    const newItem: TestimonialItem = {
      id: `test-${Date.now()}`,
      author: 'Nombre del Cliente',
      role: 'Cargo',
      company: 'Empresa / Marca',
      quote: 'Excelente calidad en la impresión y acabados de lujo.',
      rating: 5,
      city: 'Manizales, Colombia',
    };
    handleChange('items', [...(formData.items || []), newItem]);
  };

  const updateTestimonialItem = (index: number, field: string, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], [field]: value };
    handleChange('items', items);
  };

  const removeTestimonialItem = (index: number) => {
    const items = [...(formData.items || [])].filter((_, i) => i !== index);
    handleChange('items', items);
  };

  // Helper for Prepress specs
  const addPrepressSpec = () => {
    const newSpec: PrepressSpecItem = {
      id: `spec-${Date.now()}`,
      title: 'Nueva Especificación Técnica',
      specification: 'Parámetro técnico requerido',
      importance: 'RECOMENDADO',
      detail: 'Detalle de por qué es importante para la calidad en prensa.',
    };
    handleChange('specs', [...(formData.specs || []), newSpec]);
  };

  const updatePrepressSpec = (index: number, field: string, value: any) => {
    const specs = [...(formData.specs || [])];
    specs[index] = { ...specs[index], [field]: value };
    handleChange('specs', specs);
  };

  const removePrepressSpec = (index: number) => {
    const specs = [...(formData.specs || [])].filter((_, i) => i !== index);
    handleChange('specs', specs);
  };

  // Helper for Partner services
  const addPartnerService = () => {
    const services = [...(formData.services || []), { title: 'Nuevo Servicio', desc: 'Descripción del servicio digital.' }];
    handleChange('services', services);
  };

  const updatePartnerService = (index: number, field: string, value: any) => {
    const services = [...(formData.services || [])];
    services[index] = { ...services[index], [field]: value };
    handleChange('services', services);
  };

  const removePartnerService = (index: number) => {
    const services = [...(formData.services || [])].filter((_, i) => i !== index);
    handleChange('services', services);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                {formData.type}
              </span>
              <h3 className="text-lg font-black text-slate-900">Configurar Bloque</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personaliza los textos, imágenes, enlaces y disposición visual de este bloque.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form id="block-editor-form" onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* General Block Appearance Settings */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Estilos Generales del Bloque
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título de Sección</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Título principal de la sección"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Bajada</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="Texto complementario"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Insignia / Badge Superior</label>
                <input
                  type="text"
                  value={formData.badge || ''}
                  onChange={(e) => handleChange('badge', e.target.value)}
                  placeholder="Ej: CALIDAD 300 DPI"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estilo de Fondo</label>
                <select
                  value={formData.bgStyle || 'white'}
                  onChange={(e) => handleChange('bgStyle', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="white">Blanco Limpio</option>
                  <option value="slate-50">Gris Suave (Slate 50)</option>
                  <option value="dark">Oscuro Premium (Slate 900)</option>
                  <option value="gradient-teal">Degradado Esmeralda / Teal</option>
                  <option value="gradient-dark">Degradado Oscuro Nocturno</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isEnabledBlock"
                  checked={formData.isEnabled !== false}
                  onChange={(e) => handleChange('isEnabled', e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="isEnabledBlock" className="font-bold text-slate-800 cursor-pointer">
                  Bloque Activo y Visible en la Tienda
                </label>
              </div>
            </div>
          </div>

          {/* Specific Fields by Block Type */}

          {/* 1. HERO BANNER */}
          {formData.type === 'HERO_BANNER' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Contenido del Hero Banner</h4>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titular Principal (Headline) *</label>
                <input
                  type="text"
                  required
                  value={formData.headline || ''}
                  onChange={(e) => handleChange('headline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo Descriptivo</label>
                <textarea
                  rows={2}
                  value={formData.subheadline || ''}
                  onChange={(e) => handleChange('subheadline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto Botón Principal (CTA)</label>
                  <input
                    type="text"
                    value={formData.ctaText || ''}
                    onChange={(e) => handleChange('ctaText', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Enlace Botón Principal (URL)</label>
                  <input
                    type="text"
                    value={formData.ctaLink || ''}
                    onChange={(e) => handleChange('ctaLink', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto Botón Secundario</label>
                  <input
                    type="text"
                    value={formData.secondaryCtaText || ''}
                    onChange={(e) => handleChange('secondaryCtaText', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Enlace Botón Secundario (URL)</label>
                  <input
                    type="text"
                    value={formData.secondaryCtaLink || ''}
                    onChange={(e) => handleChange('secondaryCtaLink', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">URL Imagen de Fondo (Opcional)</label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('backgroundImageUrl')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    Biblioteca & IA
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.backgroundImageUrl || ''}
                    onChange={(e) => handleChange('backgroundImageUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  {formData.backgroundImageUrl && (
                    <img src={formData.backgroundImageUrl} alt="" className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alineación de Texto</label>
                  <select
                    value={formData.alignment || 'left'}
                    onChange={(e) => handleChange('alignment', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centrado</option>
                    <option value="right">Derecha</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Altura del Hero</label>
                  <select
                    value={formData.height || 'standard'}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="compact">Compacto</option>
                    <option value="standard">Estándar</option>
                    <option value="large">Grande / Impactante</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. CATEGORY GRID */}
          {formData.type === 'CATEGORY_GRID' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Configuración de Rejilla de Categorías</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Columnas</label>
                  <select
                    value={formData.columns || 4}
                    onChange={(e) => handleChange('columns', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value={2}>2 Columnas</option>
                    <option value={3}>3 Columnas</option>
                    <option value={4}>4 Columnas</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="showBadgeCategory"
                    checked={formData.showBadge !== false}
                    onChange={(e) => handleChange('showBadge', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="showBadgeCategory" className="font-bold text-slate-800 cursor-pointer">
                    Mostrar Insignias (TOP VENTAS, PRO, etc.)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. VALUE PROPOSITION */}
          {formData.type === 'VALUE_PROPOSITION' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-slate-900">Tarjetas de Ventajas & Propuesta de Valor</h4>
                <button
                  type="button"
                  onClick={addValuePropItem}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Añadir Ventaja</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items?.map((item: ValuePropItem, idx: number) => (
                  <div key={item.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Tarjeta #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeValuePropItem(idx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Ícono</label>
                        <select
                          value={item.icon}
                          onChange={(e) => updateValuePropItem(idx, 'icon', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="ShieldCheck">Escudo de Calidad (ShieldCheck)</option>
                          <option value="Truck">Camión de Despachos (Truck)</option>
                          <option value="Award">Premio / Certificación (Award)</option>
                          <option value="Zap">Rayo / Velocidad (Zap)</option>
                          <option value="Clock">Reloj / Tiempos (Clock)</option>
                          <option value="Printer">Prensa Litográfica (Printer)</option>
                          <option value="Sparkles">Destellos / Lujo (Sparkles)</option>
                          <option value="Layers">Capas / Acabados (Layers)</option>
                          <option value="DollarSign">Ahorro / B2B (DollarSign)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Título</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateValuePropItem(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Insignia / Tag</label>
                        <input
                          type="text"
                          value={item.highlightBadge || ''}
                          onChange={(e) => updateValuePropItem(idx, 'highlightBadge', e.target.value)}
                          placeholder="Ej: Garantía CTP"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 text-[11px] mb-1">Descripción</label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateValuePropItem(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. RICH TEXT MEDIA */}
          {formData.type === 'RICH_TEXT_MEDIA' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Contenido Editorial & Multimedia</h4>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">URL de Imagen / Video</label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('mediaUrl')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    Biblioteca & IA
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.mediaUrl || ''}
                    onChange={(e) => handleChange('mediaUrl', e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  {formData.mediaUrl && (
                    <img src={formData.mediaUrl} alt="" className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Posición de la Imagen</label>
                  <select
                    value={formData.mediaPosition || 'right'}
                    onChange={(e) => handleChange('mediaPosition', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="right">A la Derecha</option>
                    <option value="left">A la Izquierda</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto Botón Acción</label>
                  <input
                    type="text"
                    value={formData.ctaButtonText || ''}
                    onChange={(e) => handleChange('ctaButtonText', e.target.value)}
                    placeholder="Ej: Ver Tecnología"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contenido HTML / Párrafos</label>
                <textarea
                  rows={4}
                  value={formData.contentHtml || ''}
                  onChange={(e) => handleChange('contentHtml', e.target.value)}
                  placeholder="<p>Texto con formato...</p>"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* 5. FAQ ACCORDION */}
          {formData.type === 'FAQ_ACCORDION' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-slate-900">Preguntas & Respuestas Frecuentes</h4>
                <button
                  type="button"
                  onClick={addFaqItem}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Añadir Pregunta</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items?.map((item: FaqItem, idx: number) => (
                  <div key={item.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Pregunta #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFaqItem(idx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Pregunta</label>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateFaqItem(idx, 'question', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Categoría</label>
                        <input
                          type="text"
                          value={item.category || ''}
                          onChange={(e) => updateFaqItem(idx, 'category', e.target.value)}
                          placeholder="Ej: Archivos, Envíos"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 text-[11px] mb-1">Respuesta</label>
                      <textarea
                        rows={2}
                        value={item.answer}
                        onChange={(e) => updateFaqItem(idx, 'answer', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. TESTIMONIALS */}
          {formData.type === 'TESTIMONIALS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-slate-900">Reseñas de Clientes Litográficos</h4>
                <button
                  type="button"
                  onClick={addTestimonialItem}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Añadir Testimonio</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items?.map((item: TestimonialItem, idx: number) => (
                  <div key={item.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Testimonio #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeTestimonialItem(idx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Nombre Autor</label>
                        <input
                          type="text"
                          value={item.author}
                          onChange={(e) => updateTestimonialItem(idx, 'author', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Empresa / Cargo</label>
                        <input
                          type="text"
                          value={item.company}
                          onChange={(e) => updateTestimonialItem(idx, 'company', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Ciudad</label>
                        <input
                          type="text"
                          value={item.city || ''}
                          onChange={(e) => updateTestimonialItem(idx, 'city', e.target.value)}
                          placeholder="Ej: Bogotá D.C."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 text-[11px] mb-1">Cita / Reseña</label>
                      <textarea
                        rows={2}
                        value={item.quote}
                        onChange={(e) => updateTestimonialItem(idx, 'quote', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. TECH SPECS PREPRESS */}
          {formData.type === 'TECH_SPECS_PREPRESS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-slate-900">Parámetros Técnicos de Pre-Prensa</h4>
                <button
                  type="button"
                  onClick={addPrepressSpec}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Añadir Parámetro</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.specs?.map((spec: PrepressSpecItem, idx: number) => (
                  <div key={spec.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Especificación #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePrepressSpec(idx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Título de la Regla</label>
                        <input
                          type="text"
                          value={spec.title}
                          onChange={(e) => updatePrepressSpec(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Parámetro / Regla</label>
                        <input
                          type="text"
                          value={spec.specification}
                          onChange={(e) => updatePrepressSpec(idx, 'specification', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 text-[11px] mb-1">Nivel de Importancia</label>
                        <select
                          value={spec.importance}
                          onChange={(e) => updatePrepressSpec(idx, 'importance', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="CRITICO">CRÍTICO (Rojo)</option>
                          <option value="RECOMENDADO">RECOMENDADO (Ámbar)</option>
                          <option value="ESTANDAR">ESTÁNDAR (Teal)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 text-[11px] mb-1">Detalle Técnico</label>
                      <textarea
                        rows={2}
                        value={spec.detail}
                        onChange={(e) => updatePrepressSpec(idx, 'detail', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. PARTNER SHOWCASE */}
          {formData.type === 'PARTNER_SHOWCASE' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Alianza Atrio Agencia S.A.S</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre Aliado</label>
                  <input
                    type="text"
                    value={formData.partnerName || ''}
                    onChange={(e) => handleChange('partnerName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Eslogan Aliado</label>
                  <input
                    type="text"
                    value={formData.partnerTagline || ''}
                    onChange={(e) => handleChange('partnerTagline', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <h5 className="font-bold text-slate-800 text-xs">Lista de Servicios Complementarios</h5>
                <button
                  type="button"
                  onClick={addPartnerService}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Añadir</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.services?.map((serv: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={serv.title}
                        onChange={(e) => updatePartnerService(idx, 'title', e.target.value)}
                        placeholder="Título servicio"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={serv.desc}
                        onChange={(e) => updatePartnerService(idx, 'desc', e.target.value)}
                        placeholder="Descripción"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePartnerService(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. EMBEDDED QUOTER CTA */}
          {formData.type === 'EMBEDDED_QUOTER_CTA' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Configuración del Llamado a Cotizador</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Cotizador</label>
                  <select
                    value={formData.quoterType || 'libros'}
                    onChange={(e) => handleChange('quoterType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="libros">Libros & Revistas (PRO)</option>
                    <option value="papeleria">Papelería Comercial</option>
                    <option value="empaques">Empaques & Cajas</option>
                    <option value="general">Cotizador General B2B</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto del Botón</label>
                  <input
                    type="text"
                    value={formData.buttonText || ''}
                    onChange={(e) => handleChange('buttonText', e.target.value)}
                    placeholder="Ej: Abrir Cotizador de Libros"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Enlace del Botón (Ruta)</label>
                <input
                  type="text"
                  value={formData.buttonLink || '/cotizador-libros'}
                  onChange={(e) => handleChange('buttonLink', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* 10. CONTACT MAP FORM */}
          {formData.type === 'CONTACT_MAP_FORM' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Información de Contacto y Formulario</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dirección de la Sede</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / PBX</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número WhatsApp (sin signos)</label>
                  <input
                    type="text"
                    value={formData.whatsappNumber || ''}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    placeholder="573243917169"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo de Cotizaciones</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 11. CUSTOM HTML */}
          {formData.type === 'CUSTOM_HTML' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 border-b pb-2">Código HTML Personalizado</h4>
              <div>
                <label className="block font-bold text-slate-700 mb-1">HTML</label>
                <textarea
                  rows={8}
                  value={formData.rawHtml || ''}
                  onChange={(e) => handleChange('rawHtml', e.target.value)}
                  placeholder="<div>...</div>"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="block-editor-form"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Save size={16} />
            <span>Guardar Bloque</span>
          </button>
        </div>
      </div>

      {/* Embedded Media Picker */}
      <MediaPickerModal
        isOpen={Boolean(mediaPickerTarget)}
        onClose={() => setMediaPickerTarget(null)}
        title="Seleccionar o Generar Imagen para el Bloque"
        onSelect={(url) => {
          if (mediaPickerTarget) {
            handleChange(mediaPickerTarget, url);
            setMediaPickerTarget(null);
          }
        }}
      />
    </div>
  );
}
