
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, UploadCloud, PenTool, Info, Loader2, ChevronLeft, Minus, Plus, ShoppingCart, Sparkles, Image as ImageIcon, Award, ShieldCheck, HardDrive, Layers } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import ProductFinishSimulator3D from './components/ProductFinishSimulator3D';
import { getProductImageUrl, getProductGalleryImages } from '../lib/productImages';
import { getProductUnitConfig } from '../lib/productUnits';
import { B2B_TIER_CONFIG } from '../lib/b2bEngine';
import GoogleDrivePickerModal from '../components/GoogleDrivePickerModal';
import { DriveFile } from '../lib/googleDrive';


type QuoteResult = {
  subtotal_neto: number;
  iva_cop: number;
  total_cop: number;
  production_lead_time_days: number;
  weight_total_grams: number;
  desglose?: {
    base_price: number;
    pack_size?: number;
    packs_count?: number;
    quantity: number;
    unit_price_before_discount: number;
    discount_applied: {
      percentage: number;
      amount_saved: number;
    };
    applied_modifiers: any[];
  }
};

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, b2bProfile } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState<number>(1000);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'simulator3d' | 'photo'>('photo');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);

  const unitConfig = getProductUnitConfig(product);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/catalog/product/${slug}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const data = await res.json();
        
        data.imageUrl = getProductImageUrl(data);
        setProduct(data);
        
        const config = getProductUnitConfig(data);
        setQuantity(config.minQuantity);

        const defaultOptions: Record<string, number> = {};
        if (data.attributes) {
          data.attributes.forEach((attr: any) => {
            if (attr.values && attr.values.length > 0) {
              defaultOptions[attr.id] = attr.values[0].id;
            }
          });
        }
        setSelectedOptions(defaultOptions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProduct();
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setIsQuoting(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const attributesArray = Object.values(selectedOptions);
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            quantity: quantity,
            attributes: attributesArray,
          }),
        });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        setQuote(data);
      } catch (error) {
        console.error("Error API cotización, usando cálculo local:", error);
        // Fallback local robusto con prorrateo por baseQuantity
        const base = Number(product.basePrice) || 0;
        const baseQty = Math.max(1, Number(product.baseQuantity) || 1);
        let modifiersTotal = 0;
        let daysTotal = 2;
        const appliedModifiers: any[] = [];
        if (product.attributes) {
          product.attributes.forEach((attr: any) => {
            const selectedValId = selectedOptions[attr.id];
            const val = attr.values?.find((v: any) => v.id === selectedValId);
            if (val) {
              const priceMod = Number(val.priceModifier) || 0;
              modifiersTotal += priceMod;
              daysTotal += Number(val.daysModifier || val.leadTimeDaysModifier) || 0;
              appliedModifiers.push({
                attribute_name: attr.name,
                value_label: val.label || val.value || val.valueCode || 'Opción',
                price_modifier: priceMod,
                unit_price_modifier: priceMod / baseQty
              });
            }
          });
        }
        
        let discount = 0;
        if (quantity >= 1000 && quantity < 3000) discount = 0.05;
        else if (quantity >= 3000 && quantity < 5000) discount = 0.10;
        else if (quantity >= 5000 && quantity < 10000) discount = 0.15;
        else if (quantity >= 10000) discount = 0.22;
        
        const unitBase = base / baseQty;
        const unitModifiers = modifiersTotal / baseQty;
        const unitPriceBefore = unitBase + unitModifiers;
        const subtotalGross = unitPriceBefore * quantity;
        const discountAmount = subtotalGross * discount;
        const subtotal = Math.round(subtotalGross - discountAmount);
        const iva = Math.round(subtotal * 0.19);
        const total = subtotal + iva;
        
        setQuote({
          subtotal_neto: subtotal,
          iva_cop: iva,
          total_cop: total,
          production_lead_time_days: daysTotal,
          weight_total_grams: quantity * 5,
          desglose: {
            base_price: base,
            base_quantity: baseQty,
            unit_price: unitPriceBefore,
            quantity: quantity,
            unit_price_before_discount: unitPriceBefore,
            discount_applied: {
              percentage: discount * 100, // mismo formato que el servidor (porcentaje)
              amount_saved: Math.round(discountAmount),
            },
            applied_modifiers: appliedModifiers,
          }
        });
      } finally {
        setIsQuoting(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedOptions, quantity, product]);

  const handleOptionSelect = (attributeId: string, valueId: number) => {
    setSelectedOptions(prev => ({ ...prev, [attributeId]: valueId }));
  };

  
  const handleAddToCart = (fileOrMode: File | string | DriveFile) => {
    if (!product || !quote) return;
    
    let file: File | undefined = undefined;
    let driveFile: DriveFile | undefined = undefined;
    let designName: string = '';

    if (fileOrMode instanceof File) {
      file = fileOrMode;
      designName = file.name;
    } else if (typeof fileOrMode === 'object' && 'id' in fileOrMode) {
      driveFile = fileOrMode as DriveFile;
      designName = driveFile.name;
    } else {
      designName = fileOrMode;
    }

    // Generate options string
    const optionsStr = product.attributes.map((attr: any) => {
      const selectedId = selectedOptions[attr.id];
      const val = attr.values.find((v: any) => v.id === selectedId);
      return val ? (val.label || val.value || val.valueCode || 'Opción') : '';
    }).filter(Boolean).join(' • ');

    addToCart({
      productId: product.id,
      name: product.name,
      options: optionsStr,
      quantity: quantity,
      price: quote.subtotal_neto,
      image: product.imageUrl,
      design: designName,
      file: file,
      driveFile: driveFile,
      pricing: { kind: 'product', productId: product.id, quantity, attributes: Object.values(selectedOptions).map(Number) },
    });
    
    navigate('/carrito');
  };

  const handleSelectDriveFile = (driveFile: DriveFile) => {
    handleAddToCart(driveFile);
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAddToCart(file);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const step = unitConfig.step;
    const min = unitConfig.minQuantity;
    setQuantity(prev => Math.max(min, prev + delta));
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full">
          <p className="text-red-500 font-bold mb-4">{error || 'No encontrado'}</p>
          <button onClick={() => navigate(-1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-6 rounded-full font-semibold transition-colors">
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-40 md:pb-12">
      
      {/* HEADER MOBILE TRANSPARENTE CON BOTON DE REGRESO */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:hidden">
        <button onClick={() => navigate(-1)} className="bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-sm text-slate-800">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:flex lg:gap-12">
        
        {/* LADO IZQUIERDO: IMAGEN Y DETALLES */}
        <div className="lg:flex-1 min-w-0">
          {/* Header Desktop */}
          <div className="hidden md:flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="bg-white p-2.5 rounded-full shadow-xs text-slate-600 hover:text-teal-600 border border-slate-100 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <nav className="text-sm font-medium text-slate-500 truncate">
              <Link to="/" className="hover:text-teal-600">Inicio</Link> &rsaquo; 
              <Link to="/categoria/todas" className="hover:text-teal-600 ml-1">Catálogo</Link> &rsaquo; 
              <span className="text-slate-800 ml-1 font-bold">{product.name}</span>
            </nav>
          </div>

          {/* VIEW SWITCHER TABS (Simulator 3D vs Static Photo) */}
          <div className="flex items-center justify-between mb-3 px-2 md:px-0">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('simulator3d')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'simulator3d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={13} className="text-teal-400" />
                <span>Simulador 3D & Acabados</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('photo')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'photo'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon size={13} />
                <span>Foto de Catálogo</span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
              {viewMode === 'simulator3d' ? '🎮 Gira con el mouse o dedo' : '📷 Fotografía de muestra'}
            </span>
          </div>

          {/* MEDIA DISPLAY: 3D SIMULATOR OR STATIC PHOTO */}
          {(() => {
            const gallery = getProductGalleryImages(product);
            const currentImg = gallery[activePhotoIndex] || gallery[0] || product.imageUrl;

            return (
              <div className="mb-6">
                {viewMode === 'simulator3d' ? (
                  <ProductFinishSimulator3D 
                    productName={product.name}
                    defaultImageUrl={currentImg}
                    selectedAttributes={selectedOptions}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-100 md:rounded-[32px] overflow-hidden aspect-square md:aspect-[4/3] relative shadow-sm border border-slate-100">
                      <img 
                        src={currentImg} 
                        alt={`${product.name} - Vista ${activePhotoIndex + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <ImageIcon size={13} />
                        <span>{activePhotoIndex + 1} / {gallery.length}</span>
                      </div>
                    </div>

                    {/* MINIATURAS INTERACTIVAS */}
                    {gallery.length > 1 && (
                      <div className="flex items-center gap-3 overflow-x-auto pb-1">
                        {gallery.map((photoUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                              activePhotoIndex === idx
                                ? 'border-teal-500 ring-2 ring-teal-500/20 scale-102 shadow-sm'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={photoUrl}
                              alt={`Miniatura ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="px-4 py-6 md:px-0">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{product.name}</h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base leading-relaxed">{product.description}</p>
            
            {/* OPCIONES DE CONFIGURACIÓN (CHIPS/ROUNDED CARDS) */}
            <div className="mt-8 space-y-8">
              {product.attributes?.map((attribute: any) => (
                <section key={attribute.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{attribute.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {attribute.values.map((val: any) => {
                      const isSelected = selectedOptions[attribute.id] === val.id;
                      const labelText = val.label || val.value || val.valueCode || 'Opción';
                      const priceMod = Number(val.priceModifier);

                      return (
                        <label 
                          key={val.id}
                          className={`
                            relative flex cursor-pointer items-center rounded-2xl border px-4 py-3 shadow-xs transition-all duration-200
                            ${isSelected 
                               ? 'bg-teal-50 border-teal-500 text-teal-950 ring-2 ring-teal-500/20 font-medium' 
                               : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name={String(attribute.id)}
                            value={val.id}
                            checked={isSelected}
                            onChange={() => handleOptionSelect(attribute.id, val.id)}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                            </span>
                            <span className="text-sm font-semibold">{labelText}</span>
                            {priceMod !== 0 && !isNaN(priceMod) && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-200/60 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                                {priceMod > 0 ? `+${formatCOP(priceMod)}` : formatCOP(priceMod)}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* CONTROLES DE CANTIDAD */}
              <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Cantidad y Escala de Precios</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {unitConfig.quantityTiers && unitConfig.quantityTiers.length > 0 
                        ? 'Selecciona un paquete o personaliza tus unidades' 
                        : 'Disponible desde 1 unidad'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200/50">
                    {quantity.toLocaleString('es-CO')} {quantity === 1 ? 'unidad' : 'unidades'}
                  </span>
                </div>

                {/* Si el producto tiene escala de precios fijos configurada (ej. 100: $66k, 200: $92k, 500: $121k) */}
                {unitConfig.quantityTiers && unitConfig.quantityTiers.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {unitConfig.quantityTiers.map((tier, idx) => {
                      const isSelected = quantity === tier.quantity;
                      const unitRate = Math.round(tier.price / tier.quantity);
                      const isBestValue = idx === unitConfig.quantityTiers!.length - 1;
                      const isPopular = idx === 1 || (unitConfig.quantityTiers!.length >= 3 && idx === 2);

                      return (
                        <button
                          key={tier.quantity}
                          type="button"
                          onClick={() => setQuantity(tier.quantity)}
                          className={`
                            relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer
                            ${isSelected 
                              ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/25 shadow-sm' 
                              : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                            }
                          `}
                        >
                          {(tier.label || isPopular || isBestValue) && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {tier.label || (isBestValue ? 'Mejor Precio' : 'Más Pedido')}
                            </span>
                          )}
                          <div className="text-base font-black text-slate-900 leading-tight">
                            {tier.quantity.toLocaleString('es-CO')} <span className="text-xs font-semibold text-slate-500">unids.</span>
                          </div>
                          <div className="text-sm font-extrabold text-teal-700 mt-1">
                            {formatCOP(tier.price)}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                            {formatCOP(unitRate)} / u
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Botones de cantidades sugeridas tradicionales */
                  <div className="flex flex-wrap gap-2">
                    {unitConfig.presetQuantities.map((presetQty) => {
                      const isSelected = quantity === presetQty;
                      return (
                        <button
                          key={presetQty}
                          type="button"
                          onClick={() => setQuantity(presetQty)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs scale-102'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {presetQty.toLocaleString('es-CO')} {presetQty === 1 ? 'unid.' : 'unids.'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Ajuste fino con + y - e input directo */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5">
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange(-1)} 
                      disabled={quantity <= 1}
                      className="w-9 h-9 bg-white disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-700 shadow-xs hover:text-teal-600 transition-colors"
                      title="Restar 1 unidad"
                    >
                      <Minus size={16} />
                    </button>
                    
                    <input 
                      type="number" 
                      min="1"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuantity(isNaN(val) || val < 1 ? 1 : val);
                      }}
                      className="w-20 text-center font-extrabold text-base bg-white rounded-xl py-1.5 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />

                    <button 
                      type="button"
                      onClick={() => handleQuantityChange(1)} 
                      className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-700 shadow-xs hover:text-teal-600 transition-colors"
                      title="Sumar 1 unidad"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 10)}
                      className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 100)}
                      className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      +100
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: STICKY RESUMEN (Visible en Desktop, Oculto en Mobile donde se usa Bottom Bar) */}
        <div className="hidden lg:block w-full lg:w-[400px]">
          <div className="sticky top-24 bg-white rounded-[32px] shadow-lg border border-slate-100 overflow-hidden p-8">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Resumen de Orden</h2>
            
            {/* Panel Precios */}
            <div className="bg-slate-50 rounded-2xl p-6 relative overflow-hidden mb-6">
               {/* Capa Loading */}
               <div className={`absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center transition-opacity duration-300 ${isQuoting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}> 
                 <Loader2 className="animate-spin text-teal-500" size={24} />
               </div>
               
               <div className="space-y-3">
                 {quote?.desglose && (() => {
                   const baseQuantity = quote.desglose.base_quantity || (product?.baseQuantity ? Number(product.baseQuantity) : 1);
                   const unitBase = baseQuantity > 0 ? (Number(quote.desglose.base_price) / baseQuantity) : Number(quote.desglose.base_price);
                   const proratedBaseTotal = unitBase * quantity;

                   return (
                     <div className="pb-3 mb-3 border-b border-slate-100 space-y-2 text-xs text-slate-500">
                       <div className="flex justify-between items-start">
                         <div>
                           <span>Precio Base ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
                           {baseQuantity > 1 && (
                             <span className="text-[10px] text-teal-600 block font-medium">
                               Base: {formatCOP(quote.desglose.base_price)} / {baseQuantity.toLocaleString('es-CO')} u ({formatCOP(unitBase)}/u)
                             </span>
                           )}
                         </div>
                         <span className="font-semibold text-slate-700">{formatCOP(proratedBaseTotal)}</span>
                       </div>
                       {quote.desglose.applied_modifiers.map((mod: any, idx: number) => {
                         const unitMod = mod.unit_price_modifier !== undefined 
                           ? Number(mod.unit_price_modifier) 
                           : (Number(mod.price_modifier) / baseQuantity);
                         const modCost = unitMod * quantity;
                         if (modCost === 0) return null;
                         return (
                           <div key={idx} className="flex justify-between text-slate-500">
                             <span className="truncate pr-2">+ {mod.value_label}</span>
                             <span className="font-medium">{formatCOP(modCost)}</span>
                           </div>
                         );
                       })}
                       {quote.desglose.discount_applied && quote.desglose.discount_applied.percentage > 0 && (
                         <div className="flex justify-between text-teal-600 font-medium pt-1">
                           <span>Descuento Vol. ({Number(quote.desglose.discount_applied.percentage).toFixed(0)}%)</span>
                           <span>-{formatCOP(quote.desglose.discount_applied.amount_saved)}</span>
                         </div>
                       )}
                     </div>
                   );
                 })()}
                 <div className="flex justify-between text-sm text-slate-600 font-medium">
                   <span>Subtotal Neto</span>
                   <span className="font-bold text-slate-800">{quote ? formatCOP(quote.subtotal_neto) : '$0'}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-600 font-medium pb-4 border-b border-slate-200">
                   <span>IVA (19%)</span>
                   <span>{quote ? formatCOP(quote.iva_cop) : '$0'}</span>
                 </div>
                 {b2bProfile?.isVerifiedB2B && (
                   <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 my-2">
                     <div className="flex justify-between text-xs font-bold text-amber-900">
                       <span className="flex items-center gap-1">
                         <Award size={13} className="text-amber-600" />
                         <span>Beneficio {B2B_TIER_CONFIG[b2bProfile.tier]?.badge}:</span>
                       </span>
                       <span className="text-emerald-700 font-black">-{b2bProfile.discountPercentage}% OFF</span>
                     </div>
                   </div>
                 )}
                 <div className="flex justify-between items-end pt-2">
                   <span className="text-lg font-bold text-slate-900">Total</span>
                   <span className="text-3xl font-black text-teal-600 tracking-tight">
                     {quote ? formatCOP(quote.total_cop) : '$0'}
                   </span>
                 </div>
               </div>
            </div>

            {/* Info Envío */}
            <div className="flex items-start gap-3 mb-8 text-sm bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-slate-700">Producción Estimada</p>
                <p className="text-slate-500 font-medium mt-1">
                  {quote?.production_lead_time_days ? `${quote.production_lead_time_days} a ${quote.production_lead_time_days + 2} días hábiles` : 'Calculando...'}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              <Link 
                to={`/diseñador/${product.slug}`}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20 text-sm"
              >
                <PenTool size={18} />
                Diseñar Online
              </Link>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-slate-900/20 text-xs sm:text-sm"
                  disabled={isQuoting}
                >
                  <UploadCloud size={17} />
                  Subir Archivo Local
                </button>

                <button 
                  type="button"
                  onClick={() => setIsDriveModalOpen(true)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 border border-slate-300 shadow-xs hover:shadow transition-all active:scale-95 text-xs sm:text-sm"
                  disabled={isQuoting}
                >
                  <svg viewBox="0 0 87.3 78" className="w-4 h-4 shrink-0">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                  <span>Desde Google Drive</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button 
                  onClick={() => handleAddToCart("Subir diseño luego")}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                  disabled={isQuoting}
                >
                  Subir luego
                </button>
                <button 
                  onClick={() => handleAddToCart("Contratar Diseño")}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                  disabled={isQuoting}
                >
                  Contratar Diseño
                </button>
              </div>

              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.ai,.psd,.jpg,.png" onChange={handleFileUpload} />
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Formatos aceptados: PDF, AI, PSD, JPG, PNG o carpetas en Google Drive (300 DPI recomendados)
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL GOOGLE DRIVE */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSelectFile={handleSelectDriveFile}
        title={`Adjuntar archivo para ${product.name}`}
      />

      {/* MOBILE FIXED BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.06)] rounded-t-[32px] z-50">
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <div className="flex flex-col relative w-full">
              <div className={`transition-opacity duration-200 ${isQuoting ? 'opacity-30' : 'opacity-100'}`}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal: {quote ? formatCOP(quote.subtotal_neto) : '$0'}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">+ IVA: {quote ? formatCOP(quote.iva_cop) : '$0'}</span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-[12px] font-bold text-slate-900 mb-1">Total:</span>
                    <span className="text-2xl font-black text-teal-600 tracking-tight leading-none">
                      {quote ? formatCOP(quote.total_cop) : '$0'}
                    </span>
                  </div>
                </div>
              </div>
              {isQuoting && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-teal-500" size={16} />}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1.5">
            <Link 
              to={`/diseñador/${product.slug}`}
              className="bg-teal-500 text-white p-2.5 rounded-xl font-bold shadow-xs flex flex-col items-center justify-center gap-1 hover:bg-teal-600 active:scale-95 transition-all"
            >
              <PenTool size={16} />
              <span className="text-[9px] whitespace-nowrap">Diseñar</span>
            </Link>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 hover:bg-slate-800 active:scale-95 transition-all"
            >
               <UploadCloud size={16} />
               <span className="text-[9px] whitespace-nowrap">Subir PDF</span>
            </button>
            <button 
              onClick={() => setIsDriveModalOpen(true)}
              className="bg-white border border-slate-200 text-slate-800 p-2.5 rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 hover:bg-slate-50 active:scale-95 transition-all"
            >
               <HardDrive size={16} className="text-blue-600" />
               <span className="text-[9px] whitespace-nowrap">Drive</span>
            </button>
            <button 
              onClick={() => handleAddToCart("Subir diseño luego")}
              className="bg-slate-100 text-slate-700 p-2.5 rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 hover:bg-slate-200 active:scale-95 transition-all"
            >
               <ShoppingCart size={16} />
               <span className="text-[9px] whitespace-nowrap">Al Carrito</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
