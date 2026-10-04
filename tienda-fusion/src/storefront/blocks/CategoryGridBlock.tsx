import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryGridBlockConfig } from '../../types/cms';
import { ArrowRight, BookOpen, Layers, Package, Sparkles, Box, FileText } from 'lucide-react';

interface Props {
  block: CategoryGridBlockConfig;
}

export default function CategoryGridBlock({ block }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/catalog/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error('Error fetching categories for CMS block:', e);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const defaultCategories = [
    {
      id: 'papeleria-comercial',
      name: 'Papelería Comercial',
      slug: 'papeleria-comercial',
      description: 'Tarjetas de presentación, volantes, membretes, talonarios y carpetas corporativas.',
      icon: 'FileText',
      badge: 'TOP VENTAS',
      productCount: 18,
    },
    {
      id: 'libros-revistas',
      name: 'Libros & Revistas',
      slug: 'cotizador-libros',
      description: 'Publicaciones editoriales con cálculo de lomo milimétrico, costura al hilo y tapa dura.',
      icon: 'BookOpen',
      badge: 'PRO EDITORIAL',
      productCount: 12,
      isDirectRoute: true,
    },
    {
      id: 'empaques-cajas',
      name: 'Empaques & Cajas',
      slug: 'empaques-cajas',
      description: 'Cajas plegadizas, fajas para alimentos, bolsas de papel kraft y empaques de lujo.',
      icon: 'Box',
      badge: 'SUSTRATO FSC',
      productCount: 14,
    },
    {
      id: 'gran-formato',
      name: 'Gran Formato & Pendones',
      slug: 'gran-formato',
      description: 'Banners en lona banner 13oz, vinilos adhesivos, microperforados y backing para eventos.',
      icon: 'Layers',
      badge: 'ALTA DEFINICIÓN',
      productCount: 9,
    },
    {
      id: 'etiquetas-adhesivas',
      name: 'Etiquetas & Stickers',
      slug: 'etiquetas-adhesivas',
      description: 'En pliegos y rollo troquelado: vinilo brillante, mate, transparente y papel kraft.',
      icon: 'Sparkles',
      badge: 'CORTE DIGITAL',
      productCount: 11,
    },
    {
      id: 'material-promocional',
      name: 'Promocionales & Merch',
      slug: 'material-promocional',
      description: 'Mugs sublimados, agendas corporativas, esferos y botones publicitarios.',
      icon: 'Package',
      badge: 'EMPRESAS',
      productCount: 8,
    },
  ];

  const displayList = categories.length > 0 ? categories : defaultCategories;
  const colCount = block.columns || 4;

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[colCount];

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={24} className="text-amber-600 group-hover:text-white" />;
      case 'Box': return <Box size={24} className="text-amber-600 group-hover:text-white" />;
      case 'Layers': return <Layers size={24} className="text-amber-600 group-hover:text-white" />;
      case 'Sparkles': return <Sparkles size={24} className="text-amber-600 group-hover:text-white" />;
      case 'Package': return <Package size={24} className="text-amber-600 group-hover:text-white" />;
      default: return <FileText size={24} className="text-amber-600 group-hover:text-white" />;
    }
  };

  return (
    <section className="py-16 md:py-20 bg-[#faf8f5] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(block.title || block.subtitle) && (
          <div className="text-center max-w-3xl mx-auto mb-12">
            {block.badge && (
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200 mb-3 inline-block">
                {block.badge}
              </span>
            )}
            {block.title && (
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight">
                {block.title}
              </h2>
            )}
            {block.subtitle && (
              <p className="mt-3 text-sm sm:text-base text-stone-600 font-medium">
                {block.subtitle}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${gridColsClass} gap-6`}>
          {displayList.map((cat: any) => {
            const destination = cat.isDirectRoute || cat.slug === 'cotizador-libros' 
              ? '/cotizador-libros' 
              : `/categoria/${cat.slug}`;

            return (
              <Link
                key={cat.id || cat.slug}
                to={destination}
                className="group relative bg-white hover:bg-[#fcfbf9] p-6 sm:p-7 rounded-3xl border border-stone-200/80 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-amber-600 text-amber-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                      {getIcon(cat.icon)}
                    </div>
                    {cat.badge && block.showBadge !== false && (
                      <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-stone-900 group-hover:text-amber-700 transition-colors mb-2">
                    {cat.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
                    {cat.description || 'Configuración a la medida con papeles ecológicos y acabados especiales.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
                  <span>{cat.productCount ? `${cat.productCount} productos` : 'Cotizar en línea'}</span>
                  <div className="w-7 h-7 rounded-full bg-amber-50 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-1">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
