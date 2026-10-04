import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, SlidersHorizontal, X, ArrowUpDown, Filter } from 'lucide-react';
import ProductCard, { ProductDetails } from './components/ProductCard';
import { getProductImageUrl } from '../lib/productImages';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [categoryName, setCategoryName] = useState<string>('Cargando...');
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');

  // Sync state with URL search param
  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery !== null && urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [searchParams]);

  const [categoryBanner, setCategoryBanner] = useState<any | null>(null);

  const fetchCategoryData = async () => {
    try {
      const [catsRes, productsRes, bannersRes] = await Promise.all([
        fetch('/api/catalog/categories'),
        fetch(`/api/catalog/category/${slug || 'todas'}`),
        fetch('/api/catalog/banners?placement=category')
      ]);

      if (catsRes.ok) {
        setCategories(await catsRes.json());
      }

      if (bannersRes.ok) {
        const bList = await bannersRes.json();
        if (Array.isArray(bList)) {
          const matching = bList.find((b: any) => 
            (b.active !== false && b.isActive !== false) &&
            (!b.targetCategory || b.targetCategory === slug || b.targetCategory === 'ALL' || slug === 'todas')
          );
          setCategoryBanner(matching || null);
        }
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        if (slug === 'todas' || !slug) {
          setCategoryName('Catálogo Completo');
          setProducts(data.map((p: any) => ({ 
            ...p, 
            imageUrl: getProductImageUrl(p)
          })));
        } else {
          setCategoryName(data.category?.name || 'Catálogo de Productos');
          setProducts((data.products || []).map((p: any) => ({ 
            ...p, 
            categoryName: data.category?.name,
            categorySlug: data.category?.slug,
            imageUrl: getProductImageUrl({ ...p, categorySlug: data.category?.slug, categoryName: data.category?.name })
          })));
        }
      }
    } catch (err) {
      console.error("Error fetching category products:", err);
    }
  };

  useEffect(() => {
    fetchCategoryData();
    window.scrollTo(0, 0);

    const handleUpdate = () => fetchCategoryData();
    window.addEventListener('banners-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('banners-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [slug]);

  // Fallback categories for chips if DB is empty
  const filterChips = categories.length > 0 ? categories : [
    { id: 1, name: 'Papelería Comercial', slug: 'papeleria-comercial' },
    { id: 2, name: 'Publicidad & Volantes', slug: 'publicidad-volantes' },
    { id: 3, name: 'Gran Formato', slug: 'gran-formato' },
    { id: 4, name: 'Etiquetas & Adhesivos', slug: 'etiquetas-adhesivos' },
    { id: 5, name: 'Empaques & Cajas', slug: 'empaques-cajas' },
  ];

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  // Filter and sort products
  let filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  if (sortBy === 'price-asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => Number(a.basePrice || 0) - Number(b.basePrice || 0));
  } else if (sortBy === 'price-desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => Number(b.basePrice || 0) - Number(a.basePrice || 0));
  } else if (sortBy === 'name') {
    filteredProducts = [...filteredProducts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-12">
      
      {/* 1. HEADER (Mobile optimized) */}
      <div className="bg-white sticky top-0 z-40 md:hidden pt-4 pb-3 px-4 flex items-center justify-between border-b border-slate-100 shadow-xs">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-bold text-slate-900 absolute left-1/2 -translate-x-1/2 truncate max-w-[200px]">
          {categoryName}
        </h1>
        <div className="w-8"></div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-slate-200 pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
               <ChevronLeft size={20} />
             </button>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">{categoryName}</h1>
               <p className="text-xs text-slate-500 mt-1">Explora opciones litográficas, acabados prémium y personalización en vivo</p>
             </div>
          </div>

          {/* Quick Stats */}
          <div className="text-right">
            <span className="text-xs font-bold px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* 2. CHIPS FILTER (Horizontal Scroll) */}
        <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-3 sm:pb-4 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <Link 
            to="/categoria/todas"
            className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full font-bold text-xs transition-all shrink-0 ${
              !slug || slug === 'todas' 
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500 hover:text-teal-600'
            }`}
          >
            Todos los Productos
          </Link>
          {filterChips.map((cat: any) => (
            <Link 
              key={cat.id}
              to={`/categoria/${cat.slug}`}
              className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full font-bold text-xs transition-all shrink-0 ${
                slug === cat.slug 
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500 hover:text-teal-600'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* 3. SEARCH & SORT BAR */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 mt-2">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nombre o especificación (ej: tarjetas, mate, 300g)..." 
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-xs sm:text-sm text-slate-700 placeholder-slate-400 transition-all outline-none font-medium shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2.5 sm:py-3 pl-3.5 sm:pl-4 pr-8 sm:pr-9 rounded-2xl shadow-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 cursor-pointer"
              >
                <option value="default">Ordenar: Destacados</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name">Alfabético: A - Z</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ArrowUpDown size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* Optional Category Promo Banner */}
        {categoryBanner && (
          <div 
            className="mb-8 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              background: categoryBanner.bgType === 'GRADIENT' && categoryBanner.gradientFrom && categoryBanner.gradientTo
                ? `linear-gradient(135deg, ${categoryBanner.gradientFrom}, ${categoryBanner.gradientTo})`
                : categoryBanner.bgColor || '#0f766e'
            }}
          >
            {categoryBanner.desktopImageUrl && (
              <img 
                src={categoryBanner.desktopImageUrl} 
                alt={categoryBanner.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
            )}
            <div className="relative z-10 max-w-xl text-center sm:text-left">
              {categoryBanner.tag && (
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                  {categoryBanner.tag}
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black">{categoryBanner.title}</h2>
              {categoryBanner.subtitle && (
                <p className="text-xs sm:text-sm text-white/80 mt-1">{categoryBanner.subtitle}</p>
              )}
            </div>
            {categoryBanner.linkUrl && (
              <Link
                to={categoryBanner.linkUrl}
                className="relative z-10 px-6 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 shrink-0"
              >
                {categoryBanner.ctaText || 'Ver Oferta'}
              </Link>
            )}
          </div>
        )}

        {/* 4. PRODUCT GRID */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs max-w-md mx-auto">
            <div className="w-14 sm:w-16 h-14 sm:h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">No encontramos productos coincidentes</h3>
            <p className="text-xs text-slate-500 mb-6">
              Intenta con otra palabra clave o explora todas las categorías disponibles.
            </p>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="px-5 sm:px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

