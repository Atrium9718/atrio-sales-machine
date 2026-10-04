import os

PRODUCT_PAGE_CODE = """
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, UploadCloud, PenTool, Info, Loader2, ChevronLeft, Minus, Plus, ShoppingCart } from 'lucide-react';

type QuoteResult = {
  subtotal_neto: number;
  iva_cop: number;
  total_cop: number;
  production_lead_time_days: number;
  weight_total_grams: number;
};

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState<number>(1000);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/catalog/product/${slug}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const data = await res.json();
        
        data.imageUrl = data.imageUrl || 'https://images.unsplash.com/photo-1589330694653-0608cb2142e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
        setProduct(data);
        
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
        console.error("Error API cotización, usando mock:", error);
        // Fallback
        const base = Number(product.basePrice) || 0;
        let modifiersTotal = 0;
        let daysTotal = 2;
        if (product.attributes) {
          product.attributes.forEach((attr: any) => {
            const selectedValId = selectedOptions[attr.id];
            const val = attr.values?.find((v: any) => v.id === selectedValId);
            if (val) {
              modifiersTotal += Number(val.priceModifier) || 0;
              daysTotal += Number(val.leadTimeDaysModifier) || 0;
            }
          });
        }
        
        let discount = 0;
        if (quantity >= 3000 && quantity < 5000) discount = 0.05;
        if (quantity >= 5000 && quantity < 10000) discount = 0.10;
        if (quantity >= 10000) discount = 0.15;
        
        const unitPrice = (base + modifiersTotal) * (1 - discount);
        const subtotal = Math.round(unitPrice * quantity);
        const iva = Math.round(subtotal * 0.19);
        const total = subtotal + iva;
        
        setQuote({
          subtotal_neto: subtotal,
          iva_cop: iva,
          total_cop: total,
          production_lead_time_days: daysTotal,
          weight_total_grams: quantity * 5,
        });
      } finally {
        setIsQuoting(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedOptions, quantity, product]);

  const handleOptionSelect = (attributeId: string, valueId: number) => {
    setSelectedOptions(prev => ({ ...prev, [attributeId]: valueId }));
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(100, prev + delta));
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
    <div className="bg-slate-50 min-h-screen pb-32 md:pb-12">
      
      {/* HEADER MOBILE TRANSPARENTE CON BOTON DE REGRESO */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:hidden">
        <button onClick={() => navigate(-1)} className="bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-sm text-slate-800">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto md:px-8 md:py-8 lg:flex lg:gap-12">
        
        {/* LADO IZQUIERDO: IMAGEN Y DETALLES */}
        <div className="lg:flex-1">
          {/* Header Desktop */}
          <div className="hidden md:flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="bg-white p-2.5 rounded-full shadow-sm text-slate-600 hover:text-teal-600 border border-slate-100">
              <ChevronLeft size={20} />
            </button>
            <nav className="text-sm font-medium text-slate-500">
              <Link to="/" className="hover:text-teal-600">Inicio</Link> &rsaquo; 
              <Link to="/categoria/todas" className="hover:text-teal-600 ml-1">Catálogo</Link> &rsaquo; 
              <span className="text-slate-800 ml-1">{product.name}</span>
            </nav>
          </div>

          {/* IMAGEN DEL PRODUCTO (Rounded modern) */}
          <div className="bg-slate-100 md:rounded-[32px] overflow-hidden aspect-square md:aspect-[4/3] relative">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

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
                      return (
                        <label 
                          key={val.id}
                          className={`
                            relative flex cursor-pointer rounded-2xl border px-4 py-3 shadow-sm transition-all duration-200
                            ${isSelected 
                               ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500' 
                               : 'bg-white border-slate-200 hover:border-teal-300 text-slate-600 hover:bg-slate-50'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name={attribute.id}
                            value={val.id}
                            checked={isSelected}
                            onChange={() => handleOptionSelect(attribute.id, val.id)}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{val.label}</span>
                            {Number(val.priceModifier) > 0 && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-200/50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                                +{formatCOP(Number(val.priceModifier))}
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
              <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Unidades (Cantidad)</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 bg-slate-100 rounded-full p-1.5">
                    <button onClick={() => handleQuantityChange(-100)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-sm hover:text-teal-600 transition-colors">
                      <Minus size={18} />
                    </button>
                    <span className="font-extrabold text-lg w-16 text-center">{quantity}</span>
                    <button onClick={() => handleQuantityChange(100)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-sm hover:text-teal-600 transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-medium text-right max-w-[120px]">
                    Descuentos automáticos aplicados en volumen.
                  </span>
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
                 <div className="flex justify-between text-sm text-slate-500 font-medium">
                   <span>Subtotal Neto</span>
                   <span>{quote ? formatCOP(quote.subtotal_neto) : '$0'}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-500 font-medium pb-4 border-b border-slate-200">
                   <span>IVA (19%)</span>
                   <span>{quote ? formatCOP(quote.iva_cop) : '$0'}</span>
                 </div>
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
            <div className="space-y-4">
              <Link 
                to={`/diseñador/${product.id}`}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20"
              >
                <PenTool size={20} />
                Diseñar Online
              </Link>
              <button 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-slate-900/20"
                disabled={isQuoting}
              >
                <UploadCloud size={20} />
                Subir PDF y Pagar
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE FIXED BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.06)] rounded-t-[32px] z-50">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div className="flex flex-col relative">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Precio Total</span>
            <div className={`transition-opacity duration-200 ${isQuoting ? 'opacity-30' : 'opacity-100'}`}>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {quote ? formatCOP(quote.total_cop) : '$0'}
              </span>
            </div>
            {isQuoting && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-teal-500" size={16} />}
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to={`/diseñador/${product.id}`}
              className="bg-teal-500 text-white px-5 py-3.5 rounded-full font-bold shadow-md shadow-teal-500/30 flex items-center gap-2"
            >
              <PenTool size={18} />
              <span className="hidden sm:inline">Diseñar</span>
            </Link>
            <button className="bg-slate-900 text-white p-3.5 rounded-full shadow-md shadow-slate-900/20">
               <UploadCloud size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
"""

CANVAS_EDITOR_CODE = """
"use client";
import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Type, Image as ImageIcon, Trash2, Save, ArrowLeft, Loader2, Download, MousePointer2, Square, Circle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function CanvasEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Dimensiones (9x5 cm a 300 DPI)
  const MM_TO_PX = 11.811; 
  const trimWidth = 90 * MM_TO_PX; 
  const trimHeight = 50 * MM_TO_PX;
  const bleed = 2 * MM_TO_PX;
  const safety = 3 * MM_TO_PX;
  const canvasWidth = trimWidth + (bleed * 2);
  const canvasHeight = trimHeight + (bleed * 2);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });
    
    fabricRef.current = canvas;

    const bleedRect = new fabric.Rect({
      left: 0, top: 0,
      width: canvasWidth, height: canvasHeight,
      fill: 'transparent',
      stroke: 'rgba(20, 184, 166, 0.4)', // Teal 500
      strokeWidth: 4,
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    const trimRect = new fabric.Rect({
      left: bleed, top: bleed,
      width: trimWidth, height: trimHeight,
      fill: 'transparent',
      stroke: 'rgba(239, 68, 68, 0.6)',
      strokeWidth: 4,
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    const safetyRect = new fabric.Rect({
      left: bleed + safety, top: bleed + safety,
      width: trimWidth - (safety * 2), height: trimHeight - (safety * 2),
      fill: 'transparent',
      stroke: 'rgba(20, 184, 166, 0.8)', // Teal 500
      strokeWidth: 4,
      strokeDashArray: [15, 10],
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    canvas.add(bleedRect, trimRect, safetyRect);

    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const outerWidth = containerRef.current.clientWidth - 40;
      const outerHeight = containerRef.current.clientHeight - 40;
      const scale = Math.min(outerWidth / canvasWidth, outerHeight / canvasHeight, 1);
      
      const wrapper = document.querySelector('.canvas-container') as HTMLElement;
      if (wrapper) {
        wrapper.style.transform = `scale(${scale})`;
        wrapper.style.transformOrigin = 'center center';
      }
    };

    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);

    canvas.on('selection:created', (e) => setActiveObject(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => setActiveObject(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setActiveObject(null));

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.dispose();
    };
  }, [canvasWidth, canvasHeight]);

  const addText = () => {
    if (!fabricRef.current) return;
    const text = new fabric.IText('Doble click para editar', {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      fontFamily: 'sans-serif',
      fontSize: 48,
      fill: '#1e293b',
      originX: 'center',
      originY: 'center',
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
  };

  const deleteObject = () => {
    if (!fabricRef.current || !activeObject) return;
    fabricRef.current.remove(activeObject);
    fabricRef.current.discardActiveObject();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const objects = canvas.getObjects();
      const guides = objects.filter(obj => obj.name === 'prep-guide');
      guides.forEach(g => g.set('visible', false));
      canvas.renderAll();

      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1 
      });

      guides.forEach(g => g.set('visible', true));
      canvas.renderAll();

      const link = document.createElement('a');
      link.download = 'diseno-listo-para-impresion.png';
      link.href = dataURL;
      link.click();
      
      setTimeout(() => {
        alert("¡Diseño guardado exitosamente!");
      }, 500);

    } catch (e) {
      console.error(e);
      alert("Error al exportar.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      
      {/* TOOLBAR SUPERIOR (Fusión Aesthetic) */}
      <header className="h-16 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="hidden sm:block">
            <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">Editor Canvas</h1>
            <p className="text-xs font-semibold text-slate-400">Tarjetas de Presentación (9x5 cm)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeObject && (
            <button 
              onClick={deleteObject}
              className="p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors mr-2 shadow-sm"
              title="Eliminar elemento"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2.5 px-6 rounded-full flex items-center gap-2 shadow-md shadow-teal-500/20 transition-transform active:scale-95 disabled:opacity-70"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span className="hidden sm:inline">Finalizar</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* HERRAMIENTAS LATERALES (Desktop) / INFERIOR (Mobile) */}
        <aside className="md:w-24 bg-white border-r border-slate-100 flex md:flex-col items-center py-4 px-2 gap-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 overflow-x-auto md:overflow-y-auto">
           <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors w-16 md:w-full shrink-0">
             <MousePointer2 size={24} />
             <span className="text-[10px] font-bold">Mover</span>
           </button>
           <button onClick={addText} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-slate-500 hover:text-teal-600 hover:bg-slate-50 transition-colors w-16 md:w-full shrink-0">
             <Type size={24} />
             <span className="text-[10px] font-bold">Texto</span>
           </button>
           <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-slate-500 hover:text-teal-600 hover:bg-slate-50 transition-colors w-16 md:w-full shrink-0">
             <ImageIcon size={24} />
             <span className="text-[10px] font-bold">Imagen</span>
           </button>
           <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-slate-500 hover:text-teal-600 hover:bg-slate-50 transition-colors w-16 md:w-full shrink-0">
             <Square size={24} />
             <span className="text-[10px] font-bold">Formas</span>
           </button>
        </aside>

        {/* ÁREA DE TRABAJO (Canvas) */}
        <main 
          ref={containerRef} 
          className="flex-1 bg-slate-100/50 overflow-hidden flex items-center justify-center relative p-8"
        >
          {/* Sombra suave alrededor del canvas */}
          <div className="shadow-[0_20px_60px_rgba(0,0,0,0.08)] bg-white rounded-sm overflow-hidden border border-slate-200">
            <canvas ref={canvasRef} />
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-500 flex items-center gap-3">
             <div className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-red-400 block rounded-sm"></span> Corte</div>
             <div className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-teal-500 block rounded-sm"></span> Seguro</div>
          </div>
        </main>
      </div>

    </div>
  );
}
"""

with open('src/storefront/ProductPage.tsx', 'w') as f:
    f.write(PRODUCT_PAGE_CODE)

with open('src/storefront/editor/CanvasEditor.tsx', 'w') as f:
    f.write(CANVAS_EDITOR_CODE)
