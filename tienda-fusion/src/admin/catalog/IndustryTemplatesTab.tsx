import { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  FileText, 
  FolderCheck, 
  Flag, 
  Package, 
  Bookmark, 
  Tag, 
  ArrowRight, 
  CheckCircle2,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ProductPresetTemplate {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  description: string;
  icon: any;
  badge: string;
  basePrice: number;
  baseQuantity: number;
  minQuantity: number;
  quantityStep: number;
  setupFee: number;
  pricingMode: string;
  imageUrl: string;
  attributes: {
    attributeId: string;
    name: string;
    group?: string;
    values: {
      valueId: string;
      label: string;
      priceModifier: number;
      weightModifier: number;
      daysModifier: number;
    }[];
  }[];
}

export const INDUSTRY_PRESETS: ProductPresetTemplate[] = [
  {
    id: 'tarjetas-pro',
    name: 'Tarjetas de Presentación Corporativas',
    category: 'Tarjetas',
    categoryId: '1',
    description: 'Tarjetas estándar litográficas en propalcote 300g o materiales ecológicos con opciones de plastificado mate, brillante o reserva UV.',
    icon: Tag,
    badge: 'Más Popular',
    basePrice: 35000,
    baseQuantity: 100,
    minQuantity: 100,
    quantityStep: 100,
    setupFee: 0,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'TAMANO',
        name: 'Tamaño / Formato',
        group: 'Especificaciones',
        values: [
          { valueId: '9X5', label: '9 x 5 cm (Estándar)', priceModifier: 0, weightModifier: 2, daysModifier: 0 },
          { valueId: '9X55', label: '9 x 5.5 cm (Europeo)', priceModifier: 2000, weightModifier: 2, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'PROP_300', label: 'Propalcote 300g (Rígido)', priceModifier: 0, weightModifier: 3, daysModifier: 0 },
          { valueId: 'KRAFT_300', label: 'Kraft Ecológico 300g', priceModifier: 6000, weightModifier: 3, daysModifier: 0 },
          { valueId: 'OPALINA_250', label: 'Opalina Holandesa 250g', priceModifier: 8000, weightModifier: 3, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'TINTAS',
        name: 'Tintas de Impresión',
        group: 'Impresión',
        values: [
          { valueId: '4X0', label: 'Full Color 4x0 (Tiro / Una Cara)', priceModifier: 0, weightModifier: 0, daysModifier: 0 },
          { valueId: '4X4', label: 'Full Color 4x4 (Tiro y Retiro / Dos Caras)', priceModifier: 12000, weightModifier: 0, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'ACABADO',
        name: 'Acabado & Protección',
        group: 'Terminación',
        values: [
          { valueId: 'SIN_PLAST', label: 'Sin Plastificar', priceModifier: 0, weightModifier: 0, daysModifier: 0 },
          { valueId: 'PLAST_MATE', label: 'Plastificado Mate', priceModifier: 8000, weightModifier: 1, daysModifier: 1 },
          { valueId: 'PLAST_BRILL', label: 'Plastificado Brillante', priceModifier: 8000, weightModifier: 1, daysModifier: 1 },
          { valueId: 'RESERVA_UV', label: 'Plastificado Mate + Reserva UV Brillante', priceModifier: 24000, weightModifier: 1, daysModifier: 2 },
        ]
      },
      {
        attributeId: 'CORTE',
        name: 'Corte / Esquinas',
        group: 'Terminación',
        values: [
          { valueId: 'RECTAS', label: 'Esquinas Rectas', priceModifier: 0, weightModifier: 0, daysModifier: 0 },
          { valueId: 'REDONDEADAS', label: 'Esquinas Redondeadas (Troqueladas)', priceModifier: 5000, weightModifier: 0, daysModifier: 1 },
        ]
      }
    ]
  },
  {
    id: 'volantes-promo',
    name: 'Volantes Promocionales (Millar)',
    category: 'Material Publicitario',
    categoryId: '2',
    description: 'Volantes de alto impacto para campañas masivas o menús de restaurantes en papeles livianos o semirrígidos.',
    icon: FileText,
    badge: 'Alto Volumen',
    basePrice: 65000,
    baseQuantity: 1000,
    minQuantity: 500,
    quantityStep: 500,
    setupFee: 0,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'TAMANO',
        name: 'Tamaño / Formato',
        group: 'Especificaciones',
        values: [
          { valueId: 'MEDIA_CARTA', label: 'Media Carta (14 x 21.6 cm)', priceModifier: 0, weightModifier: 4, daysModifier: 0 },
          { valueId: 'CARTA', label: 'Carta Completa (21.6 x 27.9 cm)', priceModifier: 45000, weightModifier: 8, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'PROP_115', label: 'Propalcote 115g Brillante', priceModifier: 0, weightModifier: 3, daysModifier: 0 },
          { valueId: 'PROP_150', label: 'Propalcote 150g Premium', priceModifier: 15000, weightModifier: 4, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'TINTAS',
        name: 'Tintas de Impresión',
        group: 'Impresión',
        values: [
          { valueId: '4X0', label: 'Full Color 4x0 (Tiro / Una Cara)', priceModifier: 0, weightModifier: 0, daysModifier: 0 },
          { valueId: '4X4', label: 'Full Color 4x4 (Tiro y Retiro / Dos Caras)', priceModifier: 25000, weightModifier: 0, daysModifier: 0 },
        ]
      }
    ]
  },
  {
    id: 'pendon-rollup',
    name: 'Pendón Publicitario Roll-Up & Gran Formato',
    category: 'Gran Formato',
    categoryId: '3',
    description: 'Impresión de gran formato en lona banner de 13oz con tintas UV ecosolventes de alta durabilidad con o sin estructura retráctil.',
    icon: Flag,
    badge: 'Gran Formato',
    basePrice: 120000,
    baseQuantity: 1,
    minQuantity: 1,
    quantityStep: 1,
    setupFee: 0,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31727221eb?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'TAMANO',
        name: 'Tamaño / Formato',
        group: 'Especificaciones',
        values: [
          { valueId: '80X200', label: '80 x 200 cm (Estructura Roll-Up)', priceModifier: 0, weightModifier: 2000, daysModifier: 0 },
          { valueId: '100X200', label: '100 x 200 cm (Estructura Roll-Up)', priceModifier: 30000, weightModifier: 2500, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'BANNER_13', label: 'Lona Banner 13 oz Mate Alta Resolución', priceModifier: 0, weightModifier: 1000, daysModifier: 0 },
        ]
      }
    ]
  },
  {
    id: 'carpetas-corp',
    name: 'Carpetas Corporativas con Bolsillo',
    category: 'Material Corporativo',
    categoryId: '1',
    description: 'Carpetas de presentación con bolsillo troquelado interior y ranura para tarjeta de presentación comercial.',
    icon: FolderCheck,
    badge: 'Corporativo',
    basePrice: 145000,
    baseQuantity: 100,
    minQuantity: 50,
    quantityStep: 50,
    setupFee: 25000,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'TAMANO',
        name: 'Tamaño / Formato',
        group: 'Especificaciones',
        values: [
          { valueId: '22X30', label: '22 x 30 cm (Cerrada)', priceModifier: 0, weightModifier: 15, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'PROP_300', label: 'Propalcote 300g (Rígido)', priceModifier: 0, weightModifier: 20, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'ACABADO',
        name: 'Acabado & Protección',
        group: 'Terminación',
        values: [
          { valueId: 'PLAST_MATE', label: 'Plastificado Mate', priceModifier: 0, weightModifier: 2, daysModifier: 1 },
          { valueId: 'RESERVA_UV', label: 'Plastificado Mate + Reserva UV Brillante', priceModifier: 45000, weightModifier: 2, daysModifier: 2 },
        ]
      }
    ]
  },
  {
    id: 'etiquetas-adhesivas',
    name: 'Etiquetas y Stickers Adhesivos Troquelados',
    category: 'Etiquetas',
    categoryId: '4',
    description: 'Etiquetas en vinilo o papel adhesivo con corte troquelado en medio corte a la forma de tu logo.',
    icon: Sparkles,
    badge: 'Adhesivos',
    basePrice: 48000,
    baseQuantity: 1000,
    minQuantity: 100,
    quantityStep: 100,
    setupFee: 15000,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'TAMANO',
        name: 'Tamaño / Formato',
        group: 'Especificaciones',
        values: [
          { valueId: '5X5', label: '5 x 5 cm (Troquelada)', priceModifier: 0, weightModifier: 1, daysModifier: 0 },
          { valueId: '7X7', label: '7 x 7 cm (Cuadrada)', priceModifier: 15000, weightModifier: 2, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'VINILO_BLANCO', label: 'Vinilo Adhesivo Blanco Brillante', priceModifier: 0, weightModifier: 2, daysModifier: 0 },
          { valueId: 'VINILO_TRANS', label: 'Vinilo Adhesivo Transparente', priceModifier: 12000, weightModifier: 2, daysModifier: 0 },
        ]
      }
    ]
  },
  {
    id: 'cajas-empaque',
    name: 'Cajas de Empaque Plegadizas Personalizadas',
    category: 'Empaques',
    categoryId: '4',
    description: 'Cajas en cartulina Maule o Sulfito con troquelado y pegue lineal para productos cosméticos, farmacéuticos o alimentos.',
    icon: Package,
    badge: 'Packaging',
    basePrice: 150000,
    baseQuantity: 100,
    minQuantity: 100,
    quantityStep: 100,
    setupFee: 40000,
    pricingMode: 'prorated',
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    attributes: [
      {
        attributeId: 'MATERIAL',
        name: 'Material / Sustrato',
        group: 'Sustrato',
        values: [
          { valueId: 'MAULE_14', label: 'Cartulina Maule Calibre 14', priceModifier: 0, weightModifier: 30, daysModifier: 0 },
          { valueId: 'MAULE_18', label: 'Cartulina Maule Calibre 18 (Pesada)', priceModifier: 35000, weightModifier: 40, daysModifier: 0 },
        ]
      },
      {
        attributeId: 'ACABADO',
        name: 'Acabado & Protección',
        group: 'Terminación',
        values: [
          { valueId: 'PLAST_MATE', label: 'Plastificado Mate', priceModifier: 0, weightModifier: 2, daysModifier: 1 },
          { valueId: 'PLAST_BRILL', label: 'Plastificado Brillante', priceModifier: 0, weightModifier: 2, daysModifier: 1 },
        ]
      }
    ]
  }
];

export default function IndustryTemplatesTab({ onApplyTemplate }: { onApplyTemplate?: (template: ProductPresetTemplate) => void }) {
  const navigate = useNavigate();

  const handleUseTemplate = (template: ProductPresetTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
    } else {
      // Guardar plantilla en sessionStorage y navegar a /admin/catalog/new
      sessionStorage.setItem('pending_product_template', JSON.stringify(template));
      navigate('/admin/catalog/new');
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-teal-600" size={24} />
            <h2 className="text-xl font-extrabold text-slate-900">Plantillas Industriales de Imprenta</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Crea nuevos productos en segundos con 1 clic a partir de estructuras estándar pre-configuradas con sus variables y modificadores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INDUSTRY_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <div 
              key={preset.id}
              className="bg-white rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Image & Header */}
                <div className="h-44 relative bg-slate-100 overflow-hidden">
                  <img 
                    src={preset.imageUrl} 
                    alt={preset.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {preset.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-teal-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                    {preset.badge}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>

                  {/* Badges / Specs */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-slate-400 block font-medium">Precio Base</span>
                      <span className="font-extrabold text-slate-900">{formatCOP(preset.basePrice)}</span>
                      <span className="text-[10px] text-teal-600 block">/ {preset.baseQuantity.toLocaleString('es-CO')} unid.</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-slate-400 block font-medium">Mínimo Pedido</span>
                      <span className="font-extrabold text-slate-900">{preset.minQuantity.toLocaleString('es-CO')} u</span>
                      <span className="text-[10px] text-slate-500 block">Paso: +{preset.quantityStep}</span>
                    </div>
                  </div>

                  {/* Variables list preview */}
                  <div className="text-[11px] space-y-1">
                    <span className="text-slate-400 font-bold block">Variables Incluidas ({preset.attributes.length}):</span>
                    <div className="flex flex-wrap gap-1">
                      {preset.attributes.map(attr => (
                        <span key={attr.attributeId} className="bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-lg text-[10px]">
                          {attr.name} ({attr.values.length})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => handleUseTemplate(preset)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-transform active:scale-95"
                >
                  <Sparkles size={15} />
                  Usar Esta Plantilla
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
