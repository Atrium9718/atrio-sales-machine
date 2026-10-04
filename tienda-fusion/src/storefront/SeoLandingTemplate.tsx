import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, CheckCircle2, Star, Truck, ArrowRight, Printer, ShieldCheck, ShoppingBag, Target, Zap, Award, Clock } from 'lucide-react';
import ProductCard, { ProductDetails } from './components/ProductCard';
import { getProductImageUrl } from '../lib/productImages';

// Base de datos simulada de las landing pages
const SEO_DATABASE: Record<string, { keyword: string, city: string }> = {
  'litografia-manizales': { keyword: 'Litografía y Material Publicitario', city: 'Manizales, Caldas' },
  'impresion-libros-bogota': { keyword: 'Impresión de Libros y Revistas', city: 'Bogotá D.C.' },
  'cajas-plegadizas-pereira': { keyword: 'Fabricación de Cajas Plegadizas', city: 'Pereira, Risaralda' },
  'etiquetas-adhesivas-armenia': { keyword: 'Impresión de Etiquetas Adhesivas', city: 'Armenia, Quindío' },
  'impresion-revistas-medellin': { keyword: 'Impresión de Revistas Comerciales', city: 'Medellín, Antioquia' },
};

const ACCENT_DICT: Record<string, string> = {
  'bogota': 'Bogotá',
  'medellin': 'Medellín',
  'cali': 'Cali',
  'armenia': 'Armenia',
  'pereira': 'Pereira',
  'manizales': 'Manizales',
  'ibague': 'Ibagué',
  'quibdo': 'Quibdó',
  'popayan': 'Popayán',
  'tunja': 'Tunja',
  'cucuta': 'Cúcuta',
  'cartagena': 'Cartagena',
  'santa marta': 'Santa Marta',
  'monteria': 'Montería',
  'sincelejo': 'Sincelejo',
  'valledupar': 'Valledupar',
  'riohacha': 'Riohacha',
  'villavicencio': 'Villavicencio',
  'bucaramanga': 'Bucaramanga',
  'impresion': 'Impresión',
  'impresion de': 'Impresión de',
  'carton': 'Cartón',
  'plegadizas': 'Plegadizas',
  'catalogos': 'Catálogos',
  'fotografia': 'Fotografía',
  'plastificacion': 'Plastificación',
  'troquelado': 'Troquelado',
  'fabricacion': 'Fabricación',
  'bolivar': 'Bolívar',
  'atlantico': 'Atlántico',
  'choco': 'Chocó',
  'boyaca': 'Boyacá',
  'cordoba': 'Córdoba',
  'vaupes': 'Vaupés',
  'guainia': 'Guainía',
  'caqueta': 'Caquetá'
};

const capitalizeWords = (str: string) => {
  if (!str) return '';
  
  // First restore full string if possible
  const lowerStr = str.toLowerCase();
  
  return str.split(' ').map(word => {
    if (word.length <= 2 && word.toLowerCase() !== 'en') return word.toLowerCase();
    
    let w = word.toLowerCase();
    // Check if the word is in the dict
    if (ACCENT_DICT[w]) {
      return ACCENT_DICT[w];
    }
    
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
};

export default function SeoLandingTemplate() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ keyword: string, city: string } | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetails[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    let currentData = null;
    
    if (slug && SEO_DATABASE[slug]) {
      currentData = SEO_DATABASE[slug];
      setData(currentData);
    } else if (slug) {
      // Fallback para las nuevas generadas por IA
      const cleanSlug = slug.replace(/-/g, ' ');
      // Detectamos si el slug usa el nuevo formato con "-en-" o el antiguo
      const parts = cleanSlug.split(' en ');
      currentData = { 
        keyword: parts[0] ? capitalizeWords(parts[0]) : 'Servicios de Impresión', 
        city: parts[1] ? capitalizeWords(parts[1]) : 'Tu Ciudad'
      };
      setData(currentData);
    }

    // Fetch y filtro de productos
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await fetch('/api/catalog/category/todas');
        if (res.ok) {
          const apiData = await res.json();
          let allProducts: ProductDetails[] = (apiData.products || apiData || []).map((p: any) => ({
             ...p,
             imageUrl: getProductImageUrl(p)
          }));

          // Lógica de filtrado inteligente basado en la palabra clave SEO
          if (currentData) {
            const kw = currentData.keyword.toLowerCase();
            let filtered = allProducts;
            
            if (kw.includes('caja') || kw.includes('empaque') || kw.includes('plegadiz')) {
              filtered = allProducts.filter(p => p.name.toLowerCase().includes('caja') || p.categoryName?.toLowerCase().includes('empaque'));
            } else if (kw.includes('libro') || kw.includes('revista') || kw.includes('editorial')) {
              filtered = allProducts.filter(p => p.name.toLowerCase().includes('libro') || p.name.toLowerCase().includes('revista') || p.categoryName?.toLowerCase().includes('editorial'));
            } else if (kw.includes('etiqueta') || kw.includes('adhesivo') || kw.includes('sticker')) {
              filtered = allProducts.filter(p => p.name.toLowerCase().includes('etiqueta') || p.name.toLowerCase().includes('adhesivo') || p.categoryName?.toLowerCase().includes('etiqueta'));
            } else if (kw.includes('tarjeta') || kw.includes('presentación')) {
              filtered = allProducts.filter(p => p.name.toLowerCase().includes('tarjeta'));
            } else if (kw.includes('volante') || kw.includes('flyer')) {
              filtered = allProducts.filter(p => p.name.toLowerCase().includes('volante'));
            }
            
            // Si el filtro fue muy estricto y no hay productos, mostrar algunos destacados o los primeros 4
            if (filtered.length === 0) {
              filtered = allProducts.slice(0, 4);
            }
            
            setRelatedProducts(filtered.slice(0, 4)); // Mostrar máximo 4 productos relevantes
          }
        }
      } catch (error) {
        console.error("Error fetching related products", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [slug]);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold">Generando vista de la página...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-slate-900 text-white pt-24 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 font-bold text-xs px-4 py-2 rounded-full mb-6">
            <MapPin size={14} /> Servicio Especializado en {data.city}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Expertos en <span className="text-teal-400">{data.keyword}</span> <br/>para Empresas en {data.city}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Destaca frente a tu competencia con acabados premium y calidad garantizada. Obtén precios de fábrica, cotización online instantánea y envíos directos a cualquier zona de {data.city}.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#catalogo" className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] flex items-center justify-center gap-2">
              Cotizar {data.keyword} Ahora <ArrowRight size={20} />
            </a>
            <Link to="/categoria/todas" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2">
              Explorar Catálogo Completo
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
              <Award size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-3">Impresión Alta Gama</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Equipos de última tecnología para {data.keyword.toLowerCase()}. Aseguramos fidelidad de color, cortes precisos y acabados premium que elevan tu marca.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-3">Revisión Profesional</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Nuestro equipo audita tus archivos de {data.keyword.toLowerCase()} antes de imprimir, evitando errores costosos de márgenes, sangrado o resolución.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
              <Truck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-3">Cobertura en {data.city}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Entendemos la urgencia. Producimos rápido y enviamos tus pedidos empacados de forma segura directamente a tu puerta o negocio en {data.city}.
            </p>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              La forma más inteligente de imprimir en {data.city}
            </h2>
            <p className="text-lg text-slate-500">
              Olvídate de esperar días por una cotización. Nuestro modelo Web-to-Print simplifica todo el proceso de {data.keyword.toLowerCase()} en 3 simples pasos.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-100 z-0"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-3xl font-black text-slate-300 mb-6 shadow-sm">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cotiza al Instante</h3>
              <p className="text-slate-500 leading-relaxed">
                Selecciona las especificaciones de {data.keyword.toLowerCase()} en nuestra tienda online y obtén el precio exacto inmediatamente.
              </p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-teal-50 border-4 border-teal-100 rounded-full flex items-center justify-center text-teal-600 mb-6 shadow-sm">
                <Target size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Sube tu Diseño</h3>
              <p className="text-slate-500 leading-relaxed">
                Adjunta tu arte. Nuestro sistema y equipo técnico validarán que esté perfecto para impresión.
              </p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-3xl font-black text-slate-300 mb-6 shadow-sm">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Recibe y Disfruta</h3>
              <p className="text-slate-500 leading-relaxed">
                Fabricamos con los más altos estándares y entregamos directamente en {data.city} de forma rápida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED EXPLANATION */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-sm mb-4 bg-indigo-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={16} /> Especialistas en Producción a Escala
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
                Impulsa tu negocio con <span className="text-teal-600">{data.keyword}</span> de primer nivel
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Sabemos que la primera impresión de tu producto lo es todo. Por eso, hemos diseñado una infraestructura dedicada a producir <strong>{data.keyword.toLowerCase()}</strong> que no solo cumplan, sino que superen las expectativas de tu mercado en <strong>{data.city}</strong>.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3 text-slate-700">
                  <span className="text-teal-500 mt-0.5"><CheckCircle2 size={20} /></span>
                  <span><strong>Materiales Certificados:</strong> Utilizamos sustratos ecológicos y tintas de alta pigmentación para un acabado profesional que resiste el desgaste.</span>
                </li>
                <li className="flex gap-3 text-slate-700">
                  <span className="text-teal-500 mt-0.5"><CheckCircle2 size={20} /></span>
                  <span><strong>Acabados Especiales:</strong> Dale un toque premium con plastificado mate, brillo UV parcial, o troquelado preciso que destaque tu marca sobre la competencia.</span>
                </li>
                <li className="flex gap-3 text-slate-700">
                  <span className="text-teal-500 mt-0.5"><CheckCircle2 size={20} /></span>
                  <span><strong>Asesoría Técnica:</strong> ¿No estás seguro de los márgenes o resoluciones? Nuestro equipo en la nube revisa tu arte antes de procesarlo para evitar sorpresas desagradables.</span>
                </li>
              </ul>
              <a href="#catalogo" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-base transition-colors shadow-lg">
                Ver Opciones Disponibles <ArrowRight size={18} />
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-100 to-blue-50 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white p-2 rounded-3xl shadow-xl border border-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1586769852044-692d6e3703f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt={`Producción de ${data.keyword}`} 
                  className="rounded-2xl w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xs hidden sm:block">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">100%</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Calidad Garantizada</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RELATED PRODUCTS */}
      <section id="catalogo" className="py-20 bg-slate-50 relative z-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-teal-600 font-bold text-sm mb-3">
                <ShoppingBag size={16} /> Especialistas en tu producto
              </div>
              <h2 className="text-3xl font-black text-slate-900">
                Catálogo de {data.keyword} en {data.city}
              </h2>
            </div>
            <Link to="/categoria/todas" className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              Ver Catálogo Completo <ArrowRight size={16} />
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-12">Lo que dicen nuestros clientes en {data.city}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-left relative shadow-sm">
              <div className="flex text-amber-400 mb-4">
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
              </div>
              <p className="text-slate-700 font-medium mb-6 leading-relaxed">
                "Increíble la rapidez. Necesitábamos {data.keyword.toLowerCase()} urgentes para un evento corporativo aquí en {data.city} y llegaron en el tiempo prometido. La calidad del papel y los acabados son notablemente superiores a nuestra imprenta anterior."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-black">
                  CM
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Carlos Mendoza</h4>
                  <p className="text-xs text-slate-500">Director de Agencia Creativa, {data.city}</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-left relative shadow-sm">
              <div className="flex text-amber-400 mb-4">
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
                <Star size={20} fill="currentColor" />
              </div>
              <p className="text-slate-700 font-medium mb-6 leading-relaxed">
                "Desde que usamos su plataforma Web-to-Print, las cotizaciones son inmediatas. Antes esperábamos días por un precio, ahora tenemos el control total y los envíos siempre llegan protegidos."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black">
                  LR
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Laura Restrepo</h4>
                  <p className="text-xs text-slate-500">Gerente de Marketing Local</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 bg-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-teal-700 opacity-50 mix-blend-multiply"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-900/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            ¿Listo para producir {data.keyword.toLowerCase()} con calidad premium?
          </h2>
          <p className="text-teal-100 text-lg mb-10 max-w-2xl mx-auto">
            Únete a las cientos de empresas en {data.city} que ya confían en nuestra plataforma automatizada. Sin intermediarios, con cotización al instante y soporte dedicado.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#catalogo" className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-lg shadow-2xl transition-transform hover:-translate-y-1">
              Comenzar mi Pedido <ArrowRight size={24} />
            </a>
            <Link to="/contacto" className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold rounded-2xl text-lg transition-colors">
              Hablar con un Asesor
            </Link>
          </div>
          <p className="text-teal-200 text-sm mt-6 flex justify-center items-center gap-2 font-medium">
            <ShieldCheck size={16} /> Compra segura y protegida
          </p>
        </div>
      </section>
    </div>
  );
}
