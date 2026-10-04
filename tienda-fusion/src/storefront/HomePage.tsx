import React, { useState, useEffect, useRef } from 'react';
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
  Award,
  Megaphone,
  Image as ImageIcon,
  Quote
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
  const categoriesRowRef = useRef<HTMLDivElement>(null);
  const featuredRowRef = useRef<HTMLDivElement>(null);
  const promoRowRef = useRef<HTMLDivElement>(null);

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
    'publicidad-volantes': Megaphone,
    'gran-formato': ImageIcon,
    'etiquetas-adhesivos': Tag,
    'empaques-cajas': Package,
    'editorial-merchandising': BookOpen,
  };

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
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-xs font-bold mt-4">Cargando catálogo litográfico...</p>
      </div>
    );
  }

  // Filter products
  const explicitFeatured = products.filter(p => Boolean(p.isFeatured));
  const featuredProducts = explicitFeatured.length > 0 ? explicitFeatured.slice(0, 8) : products.slice(0, 4);

  const explicitPromos = products.filter(p => Boolean(p.isPromo || (p.discountPercentage && p.discountPercentage > 0)));
  const promoProducts = explicitPromos.length > 0 ? explicitPromos.slice(0, 8) : (products.length > 4 ? products.slice(4, 8) : products.slice(0, 4));

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(260, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  // Ícono de línea negra con "sombra" lima desplazada, como los íconos de la referencia
  const LimeIcon = ({ Icon, size = 40 }: { Icon: any; size?: number }) => (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Icon size={size} strokeWidth={0} fill="#c4f142" className="absolute left-[3px] top-[4px]" />
      <Icon size={size} strokeWidth={1.6} className="relative text-slate-950" />
    </span>
  );

  // Flechas cuadradas (blanca = anterior, negra = siguiente)
  const RowArrows = ({ onPrev, onNext, dark = false }: { onPrev: () => void; onNext: () => void; dark?: boolean }) => (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Anterior"
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors ${dark ? 'bg-white/90 text-slate-950 hover:bg-white' : 'bg-white text-slate-950 hover:bg-stone-100'}`}
      >
        <ArrowRight size={18} className="rotate-180" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Siguiente"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
      >
        <ArrowRight size={18} />
      </button>
    </div>
  );

  const SectionHeader = ({ title, linkTo, linkLabel, onPrev, onNext }: { title: string; linkTo?: string; linkLabel?: string; onPrev?: () => void; onNext?: () => void }) => (
    <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-sm sm:text-base text-slate-700 hover:text-slate-950 inline-flex items-center gap-1.5">
            {linkLabel}
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
      {onPrev && onNext && <RowArrows onPrev={onPrev} onNext={onNext} />}
    </div>
  );

  return (
    <div className="min-h-screen text-slate-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-10 sm:pb-16 space-y-10 sm:space-y-14">

        {/* 1. HERO: banner principal (foto sobre gris) + tarjeta lima con cotizador express */}
        <section className="relative">
          <div className="absolute inset-0 bg-white rounded-[28px] sm:rounded-[36px] cut-tl cut-lg pointer-events-none" aria-hidden="true" />
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 p-3 sm:p-5">

            {/* Banner principal */}
            <div className="lg:col-span-8 relative min-h-[360px] sm:min-h-[460px] rounded-[22px] sm:rounded-[28px] cut-tl-br cut-lg overflow-hidden banner-gray-bg">
              {bannerList.map((banner, idx) => {
                const isActive = idx === activeBannerIdx;
                const bgImg = banner.desktopImageUrl || banner.imageUrl || banner.mobileImageUrl;
                const extraCfg = banner.extraConfig || {};
                return (
                  <div
                    key={banner.id || idx}
                    className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    style={banner.bgType === 'GRADIENT' ? { backgroundImage: `linear-gradient(110deg, ${banner.gradientFrom || '#6f757d'}, ${banner.gradientTo || '#eceef0'})` } : banner.bgType === 'COLOR' ? { backgroundColor: banner.bgColor || '#8d939b' } : undefined}
                  >
                    {bgImg && banner.bgType !== 'GRADIENT' && banner.bgType !== 'COLOR' && (
                      <>
                        <img
                          src={bgImg}
                          alt={banner.title}
                          referrerPolicy="no-referrer"
                          className={`absolute right-0 top-0 h-full w-full sm:w-[72%] object-cover [mask-image:linear-gradient(to_right,transparent_0%,black_45%)] transition-transform duration-[1200ms] ${isActive ? 'scale-100' : 'scale-105'}`}
                        />
                        {/* Velo gris para que el texto se lea sobre la foto */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#6f757d]/90 via-[#6f757d]/40 to-transparent" />
                      </>
                    )}

                    <div className="relative z-10 h-full flex flex-col justify-center p-7 sm:p-12 lg:p-16 max-w-xl">
                      {banner.tag && (
                        <span className="self-start bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
                          {banner.tag}
                        </span>
                      )}
                      <h1
                        style={{ color: banner.textColor || '#ffffff' }}
                        className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.08] mb-4"
                      >
                        {banner.title}
                      </h1>
                      <p
                        style={{ color: banner.textColor ? `${banner.textColor}dd` : 'rgba(255,255,255,0.9)' }}
                        className="text-sm sm:text-lg leading-relaxed mb-8 max-w-md"
                      >
                        {banner.subtitle || 'Personaliza tus productos, cotiza por volumen y recibe archivos listos para imprenta.'}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={banner.linkUrl || banner.link || '/categoria/todas'}
                          style={extraCfg.ctaBgColor ? { backgroundColor: extraCfg.ctaBgColor, color: extraCfg.ctaTextColor || '#ffffff' } : undefined}
                          className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-sm sm:text-base font-semibold rounded-xl transition-colors"
                        >
                          {banner.ctaText || 'Comprar ahora'}
                          <ArrowRight size={18} />
                        </Link>
                        {extraCfg.showSecondaryBtn !== false && (
                          <Link
                            to={extraCfg.secondaryBtnUrl || '/diseñador/tarjetas-estandar'}
                            className="inline-flex items-center gap-2 px-5 py-3.5 bg-white/90 hover:bg-white text-slate-950 text-sm sm:text-base font-semibold rounded-xl transition-colors"
                          >
                            <PenTool size={16} />
                            {extraCfg.secondaryBtnText || 'Diseñar online'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {bannerList.length > 1 && (
                <div className="absolute z-20 right-5 bottom-5 sm:right-8 sm:bottom-8 flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 mr-2">
                    {bannerList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveBannerIdx(i)}
                        aria-label={`Banner ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${i === activeBannerIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                  <RowArrows
                    onPrev={() => setActiveBannerIdx((prev) => (prev - 1 + bannerList.length) % bannerList.length)}
                    onNext={() => setActiveBannerIdx((prev) => (prev + 1) % bannerList.length)}
                    dark
                  />
                </div>
              )}
            </div>

            {/* Tarjeta lima: cotizador express */}
            <div className="lg:col-span-4 relative bg-teal-400 rounded-[22px] sm:rounded-[28px] cut-tr-bl cut-lg p-7 sm:p-9 flex flex-col">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.05] text-slate-950">
                Cotiza en segundos
              </h2>
              <p className="text-base sm:text-lg text-slate-900 mt-3 leading-snug">
                Elige qué imprimir y la cantidad. Te mostramos un estimado al instante.
              </p>

              <div className="mt-6 space-y-3">
                <select
                  value={quickProduct}
                  onChange={(e) => setQuickProduct(e.target.value as any)}
                  className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-950"
                  aria-label="Producto"
                >
                  <option value="tarjetas">Tarjetas de presentación</option>
                  <option value="volantes">Volantes publicitarios</option>
                  <option value="libros">Libros y revistas</option>
                  <option value="cajas">Cajas y empaques</option>
                  <option value="stickers">Stickers con troquel</option>
                </select>
                <div className="grid grid-cols-4 gap-1.5 bg-white/60 p-1.5 rounded-xl">
                  {[1000, 2500, 5000, 10000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuickQty(qty)}
                      className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${quickQty === qty ? 'bg-slate-950 text-white' : 'text-slate-900 hover:bg-white'}`}
                    >
                      {qty >= 1000 ? `${qty / 1000}K` : qty}
                    </button>
                  ))}
                </div>
                <select
                  value={quickFinish}
                  onChange={(e) => setQuickFinish(e.target.value as any)}
                  className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-950"
                  aria-label="Acabado"
                >
                  <option value="mate_uv">Mate + brillo UV</option>
                  <option value="soft_touch">Plastificado soft touch</option>
                  <option value="earthpact">Papel ecológico EarthPact</option>
                  <option value="brillo_total">Brillo UV total</option>
                </select>
              </div>

              <div className="mt-auto pt-6 flex items-end justify-between gap-3">
                <div>
                  <span className="block text-xs font-medium text-slate-800">Estimado desde</span>
                  <span className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">{formatCOP(getQuickTotal())}</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickGo}
                  className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
                >
                  Cotizar
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CATEGORÍAS */}
        <section>
          <SectionHeader
            title="Explora categorías"
            linkTo="/categoria/todas"
            linkLabel="Ver todas las categorías"
            onPrev={() => scrollRow(categoriesRowRef, -1)}
            onNext={() => scrollRow(categoriesRowRef, 1)}
          />
          <div ref={categoriesRowRef} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {categories.map((cat: any, i) => {
              const Icon = categoryIcons[cat.slug] || Printer;
              return (
                <Link
                  key={cat.id || i}
                  to={`/categoria/${cat.slug}`}
                  className="group snap-start shrink-0 w-[140px] sm:w-[180px] lg:w-[calc((100%-5*1rem)/6)] h-[170px] sm:h-[220px] bg-white rounded-[18px] cut-br cut-md flex flex-col items-center justify-center gap-5 hover:-translate-y-1 transition-transform"
                >
                  <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center group-hover:bg-[#f2f2f2] transition-colors">
                    <LimeIcon Icon={Icon} size={44} />
                  </span>
                  <span className="text-sm sm:text-base font-medium text-slate-900 text-center px-3 leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. PRODUCTOS MÁS SOLICITADOS */}
        <section>
          <SectionHeader
            title="Productos más solicitados"
            linkTo="/categoria/todas"
            linkLabel={`Ver todos (${products.length})`}
            onPrev={() => scrollRow(featuredRowRef, -1)}
            onNext={() => scrollRow(featuredRowRef, 1)}
          />
          <div ref={featuredRowRef} className="flex gap-4 sm:gap-6 overflow-x-auto snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {featuredProducts.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-[240px] sm:w-[300px] lg:w-[calc((100%-3*1.5rem)/4)]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>

        {/* 4. BANNER EDITORIAL (lima) */}
        <section className="relative bg-teal-400 rounded-[28px] sm:rounded-[36px] cut-tr-bl cut-lg overflow-hidden">
          <div className="grid md:grid-cols-2 items-center gap-6 p-8 sm:p-12 lg:p-16">
            <div>
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05] text-slate-950">
                Cotizador de libros, revistas y agendas
              </h2>
              <p className="text-base sm:text-lg text-slate-900 mt-4 max-w-md leading-relaxed">
                Calcula el lomo exacto, la encuadernación (cosida, PUR o tapa dura) y el papel. Precio al instante.
              </p>
              <Link
                to="/cotizador-libros"
                className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
              >
                Cotizar ahora
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative w-64 h-64 lg:w-72 lg:h-72">
                <span className="absolute inset-6 rounded-full bg-white/50" />
                <BookOpen size={200} strokeWidth={0} fill="#ffffff" className="absolute left-10 top-12 opacity-70" />
                <BookOpen size={200} strokeWidth={1.1} className="absolute left-8 top-10 text-slate-950" />
                <Ruler size={64} strokeWidth={1.4} className="absolute right-2 bottom-6 text-slate-950 rotate-12" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. ACABADOS Y SUSTRATOS (panel claro) */}
        <section className="relative">
          <div className="absolute inset-0 bg-white rounded-[28px] sm:rounded-[36px] cut-tl cut-lg pointer-events-none" aria-hidden="true" />
          <div className="relative p-6 sm:p-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
              <div className="max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Acabados y sustratos de lujo</h2>
                <p className="text-sm sm:text-base text-slate-600 mt-1.5">Convierte una pieza gráfica en una experiencia al tacto.</p>
              </div>
              <a
                href="https://wa.me/573110000000?text=Hola,%20quisiera%20solicitar%20un%20muestrario%20de%20papeles%20y%20acabados"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors w-fit"
              >
                Pedir muestrario
                <ArrowRight size={16} />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { title: 'Estampado foil oro y plata', tag: 'Metalizado', desc: 'Película metalizada que aporta reflejos de lujo en logos y títulos.', Icon: Sparkles },
                { title: 'Brillo UV sectorizado', tag: 'Contraste táctil', desc: 'Barniz brillante aplicado solo donde quieres resaltar.', Icon: Layers },
                { title: 'Papel ecológico EarthPact', tag: 'Fibra de caña', desc: 'Sustrato biodegradable con textura natural.', Icon: Award },
                { title: 'Plastificado soft touch', tag: 'Tacto de seda', desc: 'Acabado mate ultrasuave, elegante y resistente al roce.', Icon: Palette },
                { title: 'Troquel especial', tag: 'Corte a medida', desc: 'Formas, solapas, ventanas y cierres automontables.', Icon: Box },
                { title: 'Encuadernación PUR y tapa dura', tag: 'Editorial', desc: 'Costura al hilo y cartón prensado de 2,5 mm forrado.', Icon: BookOpen },
              ].map((f, i) => (
                <div key={i} className="bg-[#f2f2f2] rounded-[18px] cut-br cut-md p-5 sm:p-6 flex gap-4">
                  <span className="shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <LimeIcon Icon={f.Icon} size={26} />
                  </span>
                  <div>
                    <span className="inline-block bg-teal-400 text-slate-950 text-[11px] font-semibold px-2.5 py-0.5 rounded-md mb-2">{f.tag}</span>
                    <h3 className="text-base font-semibold text-slate-950">{f.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. PROMOCIONES */}
        <section>
          <SectionHeader
            title="Promociones por volumen"
            linkTo="/categoria/todas"
            linkLabel="Ver todo"
            onPrev={() => scrollRow(promoRowRef, -1)}
            onNext={() => scrollRow(promoRowRef, 1)}
          />
          <div ref={promoRowRef} className="flex gap-4 sm:gap-6 overflow-x-auto snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {promoProducts.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-[240px] sm:w-[300px] lg:w-[calc((100%-3*1.5rem)/4)]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>

        {/* 7. EDITOR ONLINE (banner gris) */}
        <section className="relative banner-gray-bg rounded-[28px] sm:rounded-[36px] cut-tl-br cut-lg overflow-hidden p-6 sm:p-10 lg:p-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-white">Diseña directamente en tu navegador</h2>
              <p className="text-white/90 text-sm sm:text-base mt-3 leading-relaxed">
                Sin Illustrator ni Photoshop: plantillas con guías de corte, sangría de 2 mm y resolución de 300 DPI.
              </p>
            </div>
            <Link
              to="/diseñador/tarjetas-estandar"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors w-fit"
            >
              Abrir el editor
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { title: 'Estudio minimalista', type: 'Tarjeta 90 × 50 mm', tag: 'Minimal' },
              { title: 'Corporativo ejecutivo', type: 'Tarjeta 90 × 50 mm', tag: 'Ejecutivo' },
              { title: 'Lujo oscuro', type: 'Tarjeta prémium', tag: 'De lujo' },
              { title: 'Eco botánico', type: 'Tarjeta o volante EarthPact', tag: 'Ecológico' },
            ].map((tmpl, idx) => (
              <Link
                key={idx}
                to="/diseñador/tarjetas-estandar"
                className="group bg-white rounded-[18px] cut-br cut-md p-4 hover:-translate-y-1 transition-transform"
              >
                <div className={`h-28 rounded-xl mb-4 flex items-end p-3 ${['bg-[#f2f2f2]', 'bg-slate-950', 'bg-[#1f1f1f]', 'bg-teal-100'][idx]}`}>
                  <span className="bg-teal-400 text-slate-950 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">{tmpl.tag}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-950">{tmpl.title}</h3>
                <p className="text-sm text-slate-500">{tmpl.type}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-950 group-hover:gap-2.5 transition-all">
                  Personalizar <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 8. TESTIMONIOS */}
        <section>
          <SectionHeader title="Lo que dicen nuestros clientes" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { quote: 'El cotizador de libros nos ahorró días de cálculos. Las 1.500 copias llegaron con costura perfecta y colores impecables.', author: 'Camila Restrepo', role: 'Directora editorial · Bogotá' },
              { quote: 'Pedimos 5.000 cajas con soft touch y foil para nuestra línea de cosmética. El acabado al tacto es espectacular.', author: 'Esteban Henao', role: 'Gerente de marca · Medellín' },
              { quote: 'La revisión de archivos en preprensa nos evitó un error de sangría grave. Excelente servicio y entrega puntual.', author: 'Marcela Domínguez', role: 'Agencia creativa · Cali' },
            ].map((t, idx) => (
              <div key={idx} className="bg-white rounded-[20px] cut-tr cut-md p-6 sm:p-7 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-orange-500 text-orange-500" />
                    ))}
                  </div>
                  <Quote size={28} className="text-teal-400 fill-teal-400" />
                </div>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed flex-1">“{t.quote}”</p>
                <div className="mt-5 pt-4 border-t border-stone-200">
                  <h3 className="text-sm font-semibold text-slate-950">{t.author}</h3>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. BENEFICIOS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { Icon: ShieldCheck, title: 'Preprensa garantizada', desc: 'Revisamos resolución, sangría y CMYK antes de imprimir.' },
            { Icon: Tag, title: 'Precio por volumen', desc: 'Descuentos automáticos por cantidad y pliegos compartidos.' },
            { Icon: Layers, title: 'Acabados de lujo', desc: 'Mate, brillo UV, foil y troqueles a la medida.' },
            { Icon: Truck, title: 'Envío nacional', desc: 'Despachos con guía de rastreo a toda Colombia.' },
          ].map(({ Icon, title, desc }, i) => (
            <div key={i} className="bg-white rounded-[18px] cut-br cut-sm p-5 sm:p-6 flex items-start gap-4">
              <span className="shrink-0 w-12 h-12 rounded-full bg-[#f2f2f2] flex items-center justify-center">
                <LimeIcon Icon={Icon} size={24} />
              </span>
              <div>
                <h4 className="text-base font-semibold text-slate-950">{title}</h4>
                <p className="text-sm text-slate-600 mt-1 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* 10. ALIADO ESTRATÉGICO (gestionado desde Banners) */}
        {partnerBanner && (
          <section id="partner-banner-section" className="relative">
            <div className="absolute inset-0 bg-white rounded-[28px] sm:rounded-[36px] cut-tr-bl cut-lg pointer-events-none" aria-hidden="true" />
            <div className="relative p-7 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl text-center md:text-left">
                {partnerBanner.tag && (
                  <span className="inline-block bg-teal-400 text-slate-950 text-xs font-semibold px-3 py-1 rounded-md mb-4">{partnerBanner.tag}</span>
                )}
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">{partnerBanner.title}</h2>
                {partnerBanner.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed max-w-xl">{partnerBanner.subtitle}</p>
                )}
                <a
                  href={partnerBanner.linkUrl || partnerBanner.link || 'https://www.atrioagencia.com'}
                  target={partnerBanner.linkUrl?.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {partnerBanner.ctaText || 'Visitar sitio'}
                  <ArrowRight size={16} />
                </a>
              </div>
              {(partnerBanner.desktopImageUrl || partnerBanner.imageUrl) && (
                <div className="w-56 h-36 bg-[#f2f2f2] rounded-[18px] cut-br cut-sm flex items-center justify-center p-5 shrink-0">
                  <img
                    src={partnerBanner.desktopImageUrl || partnerBanner.imageUrl}
                    alt={partnerBanner.title || 'Aliado estratégico'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
