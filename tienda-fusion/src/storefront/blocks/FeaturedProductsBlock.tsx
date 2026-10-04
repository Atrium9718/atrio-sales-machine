import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FeaturedProductsBlockConfig } from '../../types/cms';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  block: FeaturedProductsBlockConfig;
}

export default function FeaturedProductsBlock({ block }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const url = block.categoryFilter && block.categoryFilter !== 'all'
          ? `/api/catalog/category/${block.categoryFilter}`
          : '/api/catalog/category/todas';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (e) {
        console.error('Error fetching featured products for CMS block:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [block.categoryFilter]);

  const limit = block.limit || 8;
  const displayedProducts = products.slice(0, limit);

  return (
    <section className="py-16 md:py-20 bg-slate-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            {block.badge && (
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3 inline-block">
                {block.badge}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {block.title || 'Productos Destacados'}
            </h2>
            {block.subtitle && (
              <p className="mt-2 text-sm sm:text-base text-slate-500 font-medium">
                {block.subtitle}
              </p>
            )}
          </div>

          <Link
            to={block.viewAllUrl || '/categoria/todas'}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-4 py-2.5 rounded-full transition-all shadow-xs shrink-0 self-start md:self-auto"
          >
            <span>{block.viewAllLinkText || 'Ver todo el catálogo'}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-slate-100 animate-pulse h-80 flex flex-col justify-between">
                <div className="w-full h-40 bg-slate-200 rounded-2xl mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
