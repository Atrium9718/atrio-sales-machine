import React, { useState, useEffect, CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Printer, 
  Star, 
  TrendingUp, 
  Package, 
  Box, 
  PenTool, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  Ruler, 
  ChevronLeft,
  Percent,
  Flame,
  Truck,
  CheckCircle2,
  Zap,
  Tag,
  Palette,
  Calculator,
  Sliders,
  Award
} from 'lucide-react';
import ProductCard from './components/ProductCard';

export default function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Quick Express Calculator state
  const [quickProduct, setQuickProduct] = useState<'tarjetas' | 'volantes' | 'libros' | 'cajas' | 'stickers'>('tarjetas');
  const [quickQty, setQuickQty] = useState<number>(1000);
  const [quickFinish, setQuickFinish] = useState<'mate_uv' | 'soft_touch' | 'earthpact' | 'brillo_total'>('mate_uv');

  const loadHomeData = async () => {
    try {
      const [catsRes, bannersRes, prodsRes, templRes] = await Promise.all([
        fetch('/api/catalog/categories'),
        fetch('/api/catalog/banners'),
        fetch('/api/catalog/category/todas'),
        fetch('/api/catalog/templates')
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (bannersRes.ok) setBanners(await bannersRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
      if (templRes.ok) setTemplates(await templRes.json());
    } catch (e) {
      console.error("Error loading home data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();

    const handleBannerUpdate = () => {
      loadHomeData();
    };

    window.addEventListener('banners-updated', handleBannerUpdate);
    window.addEventListener('storage', handleBannerUpdate);

    return () => {
      window.removeEventListener('banners-updated', handleBannerUpdate);
      window.removeEventListener('storage', handleBannerUpdate);
    };
  }, []);

  const defaultBanners = [
    {
      id: 1,
      title: 'Impresión Litográfica de Alta Definición',
      subtitle: 'Colores vibrantes en CTP 300 DPI, papeles prémium y verificación técnica de pre-prensa antes de imprimir.',
      tag: '🔥 50% OFF en Tu Primer Pedido',
      bgType: 'IMAGE',
      desktopImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
      linkUrl: '/categoria/papeleria-comercial',
      ctaText: 'Cotizar Papelería',
      animationType: 'fade'
    },
    {
      id: 2,
      title: 'Cotizador Editorial de Libros & Revistas',
      subtitle: 'Calcula lomo milimétrico, pliegos, encuadernación PUR o tapa dura con cotización instantánea.',
      tag: '📚 Módulo Editorial W2P',
      bgType: 'IMAGE',
      desktopImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
      linkUrl: '/cotizador-libros',
      ctaText: 'Cotizar Libros & Revistas',
      animationType: 'slide'
    },
    {
      id: 3,
      title: 'Cajas & Empaques con Foil y Soft Touch',
      subtitle: 'Cartulinas ecológicas EarthPact de caña de azúcar, estampado metalizado y troqueles a la medida.',
      tag: '✨ Acabados de Lujo',
      bgType: 'IMAGE',
      desktopImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
      linkUrl: '/categoria/empaques-cajas',
      ctaText: 'Ver Empaques',
      animationType: 'zoom'
    }
  ];

  const activeDbBanners = banners.filter(b => b.active !== false && b.isActive !== false);
  const heroBanners = activeDbBanners.filter(b => (!b.placement || b.placement === 'hero') && !b.isPopup);
  const bannerList = heroBanners.length > 0 ? heroBanners : (banners.length === 0 ? defaultBanners : []);
  const partnerBanner = activeDbBanners.find(b => (b.placement === 'partner' || b.tag?.toLowerCase().includes('atrio') || b.tag?.toLowerCase().includes('aliado') || b.title?.toLowerCase().includes('digital')) && !b.isPopup);

  // Auto-play parallax banner slider
  useEffect(() => {
    if (bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % bannerList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [bannerList.length]);

  const categoryIcons: Record<string, any> = {
    'papeleria-comercial': Printer,
    'publicidad-volantes': TrendingUp,
    'gran-formato': Star,
    'etiquetas-adhesivos': Sparkles,
    'empaques-cajas': Package,
    'editorial-merchandising': Box,
  };

  const categoryColors = [
    'from-amber-500/10 to-amber-500/20 text-amber-800 border-amber-200/80 group-hover:bg-amber-500 group-hover:text-slate-950',
    'from-teal-500/10 to-teal-500/20 text-teal-800 border-teal-200/80 group-hover:bg-teal-500 group-hover:text-white',
    'from-rose-500/10 to-rose-500/20 text-rose-800 border-rose-200/80 group-hover:bg-rose-500 group-hover:text-white',
    'from-indigo-500/10 to-indigo-500/20 text-indigo-800 border-indigo-200/80 group-hover:bg-indigo-500 group-hover:text-white',
    'from-emerald-500/10 to-emerald-500/20 text-emerald-800 border-emerald-200/80 group-hover:bg-emerald-500 group-hover:text-white',
    'from-violet-500/10 to-violet-500/20 text-violet-800 border-violet-200/80 group-hover:bg-violet-500 group-hover:text-white',
  ];

  // Quick Express Calculator calculation logic
  const quickEstimates: Record<string, { basePrice: number; slug: string; name: string }> = {
    tarjetas: { basePrice: 65000, slug: 'tarjetas-estandar', name: 'Tarjetas de Presentación' },
    volantes: { basePrice: 95000, slug: 'volantes-cuarto-carta', name: 'Volantes 1/4 Carta (4x4)' },
    libros: { basePrice: 850000, slug: 'cotizador-libros', name: 'Libro Editorial Cosido' },
    cajas: { basePrice: 380000, slug: 'cajas-personalizadas', name: 'Cajas con Acabado Prémium' },
    stickers: { basePrice: 55000, slug: 'adhesivos-troquelados', name: 'Stickers & Etiquetas Adhesivas' },
  };

  const getQuickTotal = () => {
    const item = quickEstimates[quickProduct];
    const qtyMultiplier = quickQty === 1000 ? 1 : quickQty === 2500 ? 2.1 : quickQty === 5000 ? 3.8 : 6.5;
    const finishMultiplier = quickFinish === 'soft_touch' ? 1.35 : quickFinish === 'earthpact' ? 1.15 : quickFinish === 'brillo_total' ? 1.05 : 1.2;
    const total = Math.round(item.basePrice * qtyMultiplier * finishMultiplier);
    return total;
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleQuickGo = () => {
    const item = quickEstimates[quickProduct];
    if (quickProduct === 'libros') {
      navigate('/cotizador-libros');
    } else {
      navigate(`/producto/${item.slug}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center bg-[#faf8f5]">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-xs font-bold mt-4">Cargando catálogo litográfico...</p>
      </div>
    );
  }

  // Filter products
  const explicitFeatured = products.filter(p => Boolean(p.isFeatured));
  const featuredProducts = explicitFeatured.length > 0 ? explicitFeatured.slice(0, 8) : products.slice(0, 4);

  const explicitPromos = products.filter(p => Boolean(p.isPromo || (p.discountPercentage && p.discountPercentage > 0)));
  const promoProducts = explicitPromos.length > 0 ? explicitPromos.slice(0, 8) : (products.length > 4 ? products.slice(4, 8) : products.slice(0, 4));

  return (
    <div className="bg-[#faf8f5] min-h-screen text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      
      {/* 0. LIVE FACTORY PULSE & QUICK SHORTCUTS BAR */}
      <div className="bg-stone-900 text-stone-300 border-b border-amber-500/20 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold">Planta Litográfica en Vivo:</span>
            <span className="text-amber-300 hidden sm:inline">CTP 300 DPI Activo</span>
            <span className="text-stone-400 hidden md:inline">• Despachos diarios a toda Colombia</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <Link to="/cotizador-libros" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
              <BookOpen size={12} />
              <span>Cotizador de Libros</span>
            </Link>
            <span className="text-stone-600">|</span>
            <Link to="/diseñador/tarjetas-estandar" className="text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1">
              <PenTool size={12} />
              <span>Diseñador Online</span>
            </Link>
            <span className="text-stone-600">|</span>
            <a href="https://wa.me/573110000000" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              💬 Asesoría WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-12 sm:space-y-16">
        
        {/* 1. HERO SHOWCASE WITH PARALLAX CAROUSEL + INSTANT EXPRESS CALCULATOR */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Hero Slider (8 cols) */}
          <div className="lg:col-span-8 rounded-3xl sm:rounded-[36px] overflow-hidden bg-slate-950 text-white shadow-2xl relative min-h-[380px] sm:min-h-[460px] flex items-center group border border-amber-500/20">
            {bannerList.map((banner, idx) => {
              const isActive = idx === activeBannerIdx;
              const bgImg = banner.desktopImageUrl || banner.imageUrl;
              const bgType = banner.bgType || (bgImg ? 'IMAGE' : 'GRADIENT');
              const animType = banner.animationType || 'fade';
              const overlayOp = banner.overlayOpacity != null ? Number(banner.overlayOpacity) / 100 : 0.65;
              const extraCfg = banner.extraConfig || {};

              let animClass = 'transition-all duration-1000 ease-out';
              if (isActive) {
                if (animType === 'slide') animClass += ' opacity-100 translate-x-0';
                else if (animType === 'zoom') animClass += ' opacity-100 scale-100';
                else animClass += ' opacity-100 scale-100';
              } else {
                animClass += ' opacity-0 scale-105 pointer-events-none';
              }

              const containerBgStyle: React.CSSProperties = bgType === 'GRADIENT'
                ? { backgroundImage: `linear-gradient(135deg, ${banner.gradientFrom || '#090d16'}, ${banner.gradientTo || '#042f2e'})` }
                : bgType === 'COLOR'
                ? { backgroundColor: banner.bgColor || '#090d16' }
                : { backgroundColor: '#090d16' };

              return (
                <div
                  key={banner.id || idx}
                  className={`absolute inset-0 flex items-center ${
                    isActive ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                  style={containerBgStyle}
                >
                  {/* Background Image */}
                  {bgType === 'IMAGE' && (bgImg || banner.mobileImageUrl) && (
                    <img 
                      src={bgImg || banner.mobileImageUrl} 
                      alt={banner.title}
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover ${animClass}`}
                    />
                  )}

                  {/* Dark warm vignette overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(9,13,22,0.92) 0%, rgba(20,24,33,0.75) 50%, rgba(180,83,9,0.3) 100%)',
                      opacity: overlayOp
                    }}
                  />
                  
                  {/* Content Container */}
                  <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-xl">
                    {banner.tag && (
                      <span 
                        style={{
                          backgroundColor: extraCfg.tagBgColor || 'rgba(245, 158, 11, 0.2)',
                          color: extraCfg.tagTextColor || '#fcd34d',
                          borderColor: extraCfg.tagBorderColor || 'rgba(245, 158, 11, 0.4)'
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black mb-4 uppercase tracking-wider border shadow-xs backdrop-blur-md"
                      >
                        <Sparkles size={13} className="text-amber-400" />
                        {banner.tag}
                      </span>
                    )}

                    <h1 
                      style={{ color: banner.textColor || '#ffffff' }}
                      className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-3"
                    >
                      {banner.title}
                    </h1>

                    <p 
                      style={{ color: banner.textColor ? `${banner.textColor}dd` : '#e7e5e4' }}
                      className="text-xs sm:text-base mb-6 font-medium leading-relaxed max-w-lg"
                    >
                      {banner.subtitle || 'Personaliza tus productos en tiempo real, cotiza automáticamente por volumen y descarga archivos listos para imprenta.'}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Link 
                        to={banner.linkUrl || banner.link || "/categoria/todas"}
                        style={extraCfg.ctaBgColor ? {
                          backgroundColor: extraCfg.ctaBgColor,
                          color: extraCfg.ctaTextColor || '#0f172a'
                        } : undefined}
                        className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 text-xs sm:text-sm font-black rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition-all active:scale-95"
                      >
                        <span>{banner.ctaText || 'Explorar Catálogo'}</span>
                        <ArrowRight size={16} />
                      </Link>
                      
                      {extraCfg.showSecondaryBtn !== false && (
                        <Link 
                          to={extraCfg.secondaryBtnUrl || "/diseñador/tarjetas-estandar"}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold rounded-2xl backdrop-blur-md transition-all"
                        >
                          <PenTool size={15} className="text-amber-300" />
                          <span>{extraCfg.secondaryBtnText || 'Diseñar Online'}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slider Controls */}
            {bannerList.length > 1 && (
              <>
                <button
                  onClick={() => setActiveBannerIdx((prev) => (prev - 1 + bannerList.length) % bannerList.length)}
                  aria-label="Anterior"
                  className="absolute left-3 z-20 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setActiveBannerIdx((prev) => (prev + 1) % bannerList.length)}
                  aria-label="Siguiente"
                  className="absolute right-3 z-20 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
                >
                  <ChevronRight size={18} />
                </button>
                
                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {bannerList.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveBannerIdx(i)}
                      aria-label={`Banner ${i + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === activeBannerIdx ? 'w-8 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Express Calculator Widget (4 cols) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-white to-stone-50 rounded-3xl sm:rounded-[36px] p-6 sm:p-7 border border-stone-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-950 leading-none">Cotizador Express</h3>
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Cálculo Instantáneo</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                  En Vivo
                </span>
              </div>

              {/* Step 1: Product Selector */}
              <div className="space-y-1.5 mb-3.5">
                <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <span>1. ¿Qué deseas imprimir?</span>
                </label>
                <select
                  value={quickProduct}
                  onChange={(e) => setQuickProduct(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="tarjetas">Tarjetas de Presentación (9x5 cm)</option>
                  <option value="volantes">Volantes Publicitarios 1/4 Carta</option>
                  <option value="libros">Libros & Revistas (Editorial)</option>
                  <option value="cajas">Cajas & Empaques Personalizados</option>
                  <option value="stickers">Stickers Adhesivos con Troquel</option>
                </select>
              </div>

              {/* Step 2: Quantity Selector */}
              <div className="space-y-1.5 mb-3.5">
                <label className="text-[11px] font-bold text-stone-600 flex items-center justify-between">
                  <span>2. Cantidad / Tiraje</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Mayor volumen = Menor precio unitario</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1000, 2500, 5000, 10000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuickQty(qty)}
                      className={`py-1.5 px-1 rounded-xl text-center text-xs font-black transition-all ${
                        quickQty === qty
                          ? 'bg-amber-500 text-slate-950 shadow-xs border border-amber-400'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {qty.toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Finish Selector */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[11px] font-bold text-stone-600">
                  3. Acabado & Sustrato
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'mate_uv', label: 'Mate + Brillo UV', desc: 'Prémium' },
                    { id: 'soft_touch', label: 'Plast. Soft Touch', desc: 'Tacto Seda' },
                    { id: 'earthpact', label: 'Papel EarthPact', desc: '100% Caña' },
                    { id: 'brillo_total', label: 'Brillo UV Total', desc: 'Económico' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setQuickFinish(f.id as any)}
                      className={`p-2 rounded-xl text-left text-xs font-bold transition-all border ${
                        quickFinish === f.id
                          ? 'bg-amber-50 border-amber-400 text-amber-950'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div className="leading-tight">{f.label}</div>
                      <span className="text-[9px] font-medium text-stone-400">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Preview & Action */}
            <div className="pt-3 border-t border-stone-200 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold block">Total Estimado Litografía:</span>
                  <div className="text-2xl font-black text-slate-950 tracking-tight">
                    {formatCOP(getQuickTotal())}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  IVA & Pre-prensa Inc.
                </span>
              </div>

              <button
                type="button"
                onClick={handleQuickGo}
                className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-950/20 active:scale-98"
              >
                <span>Configurar Producto Completo</span>
                <ArrowRight size={15} className="text-amber-400" />
              </button>
            </div>
          </div>

        </section>

        {/* 2. CATEGORÍAS VIBRANTES & MODERNAS */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700 block mb-1">
                Catálogo W2P Especializado
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Categorías de Impresión
              </h2>
            </div>
            <Link 
              to="/categoria/todas" 
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200/80 transition-all w-fit"
            >
              <span>Explorar todas ({categories.length || 6})</span>
              <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {categories.map((cat: any, i) => {
              const Icon = categoryIcons[cat.slug] || Printer;
              const colorClass = categoryColors[i % categoryColors.length];
              
              return (
                <Link 
                  key={cat.id || i} 
                  to={`/categoria/${cat.slug}`} 
                  className="group bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 hover:border-amber-400/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.15)] transition-all flex flex-col items-center text-center"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 border bg-gradient-to-br ${colorClass}`}>
                    <Icon size={26} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-stone-400 font-bold mt-1">
                    Ver productos
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. MUNDO DE ACABADOS PRÉMIUM, SUSTRATOS & PAPELES (TEXTURAS TÁCTILES) */}
        <section className="bg-gradient-to-br from-slate-950 via-stone-900 to-slate-950 rounded-[36px] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-amber-500/30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-8 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30 uppercase tracking-wider mb-3">
              <Sparkles size={13} className="text-amber-400" />
              Artesanía Litográfica de Alta Gama
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Mundo de Sustratos & Acabados de Lujo
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
              Transforma una simple pieza gráfica en una experiencia multisensorial. En Fusión Gráfica dominamos los acabados de mayor prestigio en la industria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {[
              {
                title: 'Estampado Foil Oro & Plata',
                tag: 'Metalizado Radiante',
                desc: 'Transferencia térmica de película metalizada que aporta reflejos de lujo inigualables en logos y títulos.',
                border: 'hover:border-amber-400',
                badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              },
              {
                title: 'Brillo UV Sectorizado',
                tag: 'Contraste Táctil',
                desc: 'Barniz brillante de alta densidad aplicado selectivamente sobre plastificado mate para resaltar detalles clave.',
                border: 'hover:border-teal-400',
                badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
              },
              {
                title: 'Papel Ecológico EarthPact',
                tag: '100% Fibra de Caña',
                desc: 'Sustrato biodegradable libre de químicos blanqueadores, textura natural con un mensaje de sostenibilidad real.',
                border: 'hover:border-emerald-400',
                badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              },
              {
                title: 'Plastificado Soft Touch',
                tag: 'Tacto de Seda Aterciopelado',
                desc: 'Película mate de textura ultrasuave que confiere máxima elegancia y resistencia al roce en portadas y empaques.',
                border: 'hover:border-rose-400',
                badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              },
              {
                title: 'Troquel Especial & Empaques',
                tag: 'Corte Láser & Matriz',
                desc: 'Formas curvas personalizadas, solapas, ventanas con visor de acetato y sistemas de cierre automontables.',
                border: 'hover:border-indigo-400',
                badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              },
              {
                title: 'Encuadernación PUR & Tapa Dura',
                tag: 'Alta Resistencia Editorial',
                desc: 'Costura al hilo con adhesivo de poliuretano reactivo indeformable y cartón prensado de 2.5 mm forrado.',
                border: 'hover:border-amber-300',
                badgeBg: 'bg-amber-400/20 text-amber-200 border-amber-400/30'
              }
            ].map((finish, i) => (
              <div
                key={i}
                className={`bg-slate-900/90 rounded-2xl p-5 border border-slate-800 ${finish.border} transition-all duration-300 hover:-translate-y-1 shadow-lg group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${finish.badgeBg}`}>
                    {finish.tag}
                  </span>
                  <CheckCircle2 size={16} className="text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-extrabold text-white text-base mb-1.5 group-hover:text-amber-300 transition-colors">
                  {finish.title}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed font-medium">
                  {finish.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <p className="text-xs text-stone-400 font-medium">
              💡 ¿Tienes una solicitud especial de muestras físicas o papel importado? Contáctanos para asesoría personalizada.
            </p>
            <a
              href="https://wa.me/573110000000?text=Hola,%20quisiera%20solicitar%20un%20muestrario%20de%20papeles%20y%20acabados"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shrink-0"
            >
              Pedir Muestrario de Papeles
            </a>
          </div>
        </section>

        {/* 4. PRODUCTOS DESTACADOS */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Star size={20} className="text-amber-500 fill-amber-500" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Productos Más Solicitados
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
                La mejor relación calidad-precio elegida por agencias, pymes y creadores
              </p>
            </div>
            <Link 
              to="/categoria/todas" 
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200/80 transition-all w-fit"
            >
              <span>Ver todos ({products.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* 5. EDITORIAL SHOWCASE (LIBROS, REVISTAS & AGENDAS) */}
        <section className="bg-gradient-to-br from-stone-900 via-slate-900 to-amber-950 rounded-[36px] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-amber-500/30">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/30 uppercase tracking-wider">
                <BookOpen size={13} />
                Calculadora Editorial Especializada
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Cotizador de Libros, Cuadernos, Agendas & Revistas
              </h2>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed font-medium">
                Calcula instantáneamente el calibre y grosor exacto del lomo, encuadernación cosida al hilo o rústica PUR, papel ecológico o propalcote, y acabados especiales como Reserva UV y Foil Oro.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-amber-200 font-medium">
                <span className="flex items-center gap-1"><Ruler size={13} /> Cálculo Milimétrico de Lomo</span>
                <span>•</span>
                <span>Encuadernación PUR & Tapa Dura</span>
                <span>•</span>
                <span>Imposición de Pliegos Offset</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                to="/cotizador-libros"
                className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-98 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5"
              >
                <span>Cotizar Libros & Revistas Ahora</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. PRODUCTOS EN PROMOCIÓN / OFERTAS POR TIRAJES */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-rose-500 fill-rose-500 animate-pulse" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Promociones & Descuentos por Escala
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
                Aprovecha precios de escala mayorista con chequeo de pre-prensa incluido
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 w-fit">
              <Percent size={13} />
              Descuentos Activos
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {promoProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* 7. CANVAS ONLINE DESIGNER SHOWCASE */}
        <section className="bg-gradient-to-br from-stone-900 via-slate-900 to-stone-900 rounded-[36px] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-amber-500/20">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black border border-teal-500/30 uppercase tracking-wider mb-2">
                <PenTool size={13} />
                Editor Interactivo Online
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Diseña Directamente en Tu Navegador</h2>
              <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-xl font-medium">
                Sin necesidad de instalar Illustrator o Photoshop. Carga plantillas profesionales con guías de corte, sangría de 2mm y resolución litográfica de 300 DPI.
              </p>
            </div>
            <Link
              to="/diseñador/tarjetas-estandar"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20 shrink-0"
            >
              <span>Abrir Lienzo en Blanco</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {[
              {
                title: 'Estudio Minimalista',
                type: 'Tarjeta de Presentación (90x50 mm)',
                tag: 'Minimal',
                slug: 'tarjetas-estandar',
                color: 'from-amber-500/20 to-stone-800/80',
                preview: 'Fondo marfil cálido, tipografía limpia, elegante división tipográfica.',
              },
              {
                title: 'Corporativo Ejecutivo',
                type: 'Tarjeta Ejecutiva (90x50 mm)',
                tag: 'Ejecutivo',
                slug: 'tarjetas-estandar',
                color: 'from-slate-700/60 to-slate-900/90',
                preview: 'Banda superior azul marino, iconos de contacto vectoriales y QR.',
              },
              {
                title: 'Dark Luxury Gold',
                type: 'Tarjeta Prémium (90x50 mm)',
                tag: 'De Lujo',
                slug: 'tarjetas-estandar',
                color: 'from-amber-600/30 to-amber-950/80',
                preview: 'Fondo negro profundo con acentos y divisores dorados reflectivos.',
              },
              {
                title: 'Eco Botánico & Orgánico',
                type: 'Tarjeta / Volante EarthPact',
                tag: 'Ecológico',
                slug: 'tarjetas-estandar',
                color: 'from-emerald-600/20 to-stone-900/90',
                preview: 'Textura orgánica de caña, sellos biodegradables y tonalidades tierra.',
              },
            ].map((tmpl, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700/80 hover:border-amber-400 rounded-3xl p-4.5 flex flex-col justify-between transition-all group hover:-translate-y-1 shadow-lg"
              >
                <div>
                  <div className={`h-28 rounded-2xl bg-gradient-to-br ${tmpl.color} border border-slate-700/60 p-3.5 flex flex-col justify-between mb-3 shadow-inner`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-950/80 text-amber-300 border border-amber-500/30">
                        {tmpl.tag}
                      </span>
                      <ShieldCheck size={16} className="text-amber-400" />
                    </div>
                    <p className="text-[11px] text-stone-200 line-clamp-2 leading-relaxed font-medium">
                      {tmpl.preview}
                    </p>
                  </div>
                  <h3 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {tmpl.title}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">{tmpl.type}</p>
                </div>

                <Link
                  to={`/diseñador/${tmpl.slug}`}
                  className="mt-4 w-full py-2.5 px-3 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-stone-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                >
                  <PenTool size={13} />
                  <span>Personalizar Diseño</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 8. HUMAN SOCIAL PROOF & TESTIMONIALS */}
        <section className="bg-white rounded-[36px] p-6 sm:p-10 border border-stone-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700 block mb-1">
              Confianza Litográfica Comprobada
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Lo Que Dicen Quienes Ya Imprimen con Fusión
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
              Agencias de diseño, editoriales, restaurantes y marcas en toda Colombia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "El cotizador editorial de libros nos ahorró días de cálculos de lomo y presupuesto. Las 1.500 copias llegaron con costura perfecta y colores impecables.",
                author: "Camila Restrepo",
                role: "Directora Editorial",
                city: "Bogotá, D.C.",
                stars: 5
              },
              {
                quote: "Pedimos 5.000 cajas con plastificado Soft Touch y estampado foil para nuestra línea de cosmética. El acabado al tacto es sencillamente espectacular.",
                author: "Esteban Henao",
                role: "Gerente de Marca",
                city: "Medellín, Antioquia",
                stars: 5
              },
              {
                quote: "La atención por WhatsApp y la validación de archivos en pre-prensa nos evitaron un error de sangría grave. Excelente servicio y entrega puntual.",
                author: "Marcela Domínguez",
                role: "Agencia Creativa",
                city: "Cali, Valle",
                stars: 5
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-stone-50 rounded-3xl p-6 border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed italic mb-4">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900">{t.author}</h3>
                    <p className="text-[11px] text-stone-400 font-medium">{t.role}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                    {t.city}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. BENEFICIOS Y GARANTÍAS W2P */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl shrink-0 border border-amber-100">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">Pre-Prensa Garantizada</h4>
              <p className="text-xs text-stone-500 mt-1 font-medium">Revisión técnica de resolución, sangría y modo CMYK antes de imprimir.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl shrink-0 border border-teal-100">
              <TrendingUp size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">Escala de Tiraje</h4>
              <p className="text-xs text-stone-500 mt-1 font-medium">Descuentos automáticos por escala y pliegos compartidos.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl shrink-0 border border-rose-100">
              <Layers size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">Acabados de Lujo</h4>
              <p className="text-xs text-stone-500 mt-1 font-medium">Plastificado mate, brillo UV sectorizado, foil oro y troqueles.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0 border border-emerald-100">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">Despacho Nacional</h4>
              <p className="text-xs text-stone-500 mt-1 font-medium">Envíos rápidos y seguros con guía de rastreo a toda Colombia.</p>
            </div>
          </div>
        </section>

        {/* 10. PARTNER BANNER - ALIANZA ESTRATÉGICA (Managed from Banners Module) */}
        {partnerBanner && (
          <section id="partner-banner-section">
            <div 
              className="rounded-[36px] p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-indigo-900/50 shadow-2xl transition-all"
              style={{
                background: partnerBanner.gradientFrom && partnerBanner.gradientTo
                  ? `linear-gradient(135deg, ${partnerBanner.gradientFrom}, ${partnerBanner.gradientTo})`
                  : partnerBanner.bgColor
                  ? partnerBanner.bgColor
                  : 'linear-gradient(135deg, #090d16, #1e1b4b)'
              }}
            >
              {(partnerBanner.desktopImageUrl || partnerBanner.imageUrl) ? (
                <img
                  src={partnerBanner.desktopImageUrl || partnerBanner.imageUrl}
                  alt={partnerBanner.title || 'Aliado Estratégico'}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
                />
              ) : null}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
              
              <div className="relative z-10 max-w-2xl text-center md:text-left">
                {partnerBanner.tag && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-4 border border-indigo-500/30 shadow-xs">
                    <ShieldCheck size={14} /> {partnerBanner.tag}
                  </span>
                )}
                <h2 
                  style={{ color: partnerBanner.textColor || '#ffffff' }}
                  className="text-2xl sm:text-3xl font-black mb-4 leading-tight"
                >
                  {partnerBanner.title}
                </h2>
                {partnerBanner.subtitle && (
                  <p className="text-indigo-100/80 text-sm sm:text-base leading-relaxed mb-6 max-w-xl font-medium">
                    {partnerBanner.subtitle}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                  <a 
                    href={partnerBanner.linkUrl || partnerBanner.link || 'https://www.atrioagencia.com'} 
                    target={partnerBanner.linkUrl?.startsWith('http') ? '_blank' : '_self'} 
                    rel="noreferrer"
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <span>{partnerBanner.ctaText || 'Visitar Sitio'}</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>

              <div className="relative z-10 w-full md:w-auto flex flex-col items-center gap-4">
                <a 
                  href={partnerBanner.linkUrl || partnerBanner.link || 'https://www.atrioagencia.com'} 
                  target={partnerBanner.linkUrl?.startsWith('http') ? '_blank' : '_self'} 
                  rel="noreferrer" 
                  className="block group"
                >
                  <div className="w-56 h-36 bg-white/5 border border-white/15 backdrop-blur-md rounded-3xl flex items-center justify-center p-5 hover:bg-white/10 transition-colors shadow-inner">
                    {(partnerBanner.desktopImageUrl || partnerBanner.imageUrl) ? (
                      <img 
                        src={partnerBanner.desktopImageUrl || partnerBanner.imageUrl} 
                        alt="Logo Aliado" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-white text-sm font-black uppercase tracking-widest block mb-1 group-hover:text-amber-300 transition-colors">
                          {partnerBanner.title?.slice(0, 20) || 'ALIADO'}
                        </span>
                        <span className="text-indigo-300/80 text-xs block font-medium">Alianza Estratégica</span>
                      </div>
                    )}
                  </div>
                </a>
                {partnerBanner.linkUrl && (
                  <a 
                    href={partnerBanner.linkUrl} 
                    target={partnerBanner.linkUrl?.startsWith('http') ? '_blank' : '_self'} 
                    rel="noreferrer" 
                    className="text-indigo-300 hover:text-white font-bold text-xs tracking-wide transition-colors"
                  >
                    {partnerBanner.linkUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
