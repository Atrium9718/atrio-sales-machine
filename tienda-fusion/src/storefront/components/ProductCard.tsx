import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../../lib/productImages';
import { getProductUnitConfig } from '../../lib/productUnits';

export type ProductDetails = {
  id: string | number;
  name: string;
  slug: string;
  categoryName?: string;
  categorySlug?: string;
  basePrice: number;
  originalBasePrice?: number;
  baseQuantity?: number;
  imageUrl?: string;
  isFeatured?: boolean;
  isPromo?: boolean;
  discountPercentage?: number;
  promoBadge?: string;
};

interface ProductCardProps {
  product: ProductDetails;
  key?: string | number;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => getProductImageUrl(product));
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const unitConfig = getProductUnitConfig(product);

  // Synchronize when product data changes
  useEffect(() => {
    setImgSrc(getProductImageUrl(product));
    setHasError(false);
  }, [product.imageUrl, product.slug, product.name, product.categorySlug]);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = getProductImageUrl({ ...product, imageUrl: undefined });
      if (fallback !== imgSrc) {
        setImgSrc(fallback);
      } else {
        setImgSrc(DEFAULT_PRODUCT_IMAGE);
      }
    }
  };

  const hasDiscount = Boolean(
    (product.originalBasePrice && product.originalBasePrice > Number(product.basePrice)) ||
    (product.isPromo && product.discountPercentage && product.discountPercentage > 0)
  );

  return (
    <div className="group bg-white rounded-3xl overflow-hidden p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-stone-200/90 hover:border-teal-400/60 hover:shadow-[0_12px_30px_-8px_rgba(196,241,66,0.15)] transition-all duration-300 relative flex flex-col h-full">
      {/* Image Container with Ambient Background */}
      <Link to={`/producto/${product.slug}`} className="block relative aspect-square rounded-2xl overflow-hidden bg-stone-100 mb-3.5">
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-108"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
          {product.isPromo && (
            <span className="bg-gradient-to-r from-rose-500 to-teal-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <Flame size={11} className="fill-white animate-pulse" />
              <span>{product.promoBadge || (product.discountPercentage ? `${product.discountPercentage}% OFF` : 'OFERTA')}</span>
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-teal-300">
              <Star size={10} className="fill-slate-950" />
              <span>DESTACADO</span>
            </span>
          )}
        </div>

        {/* Category Pill */}
        {product.categoryName && (
          <span className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-stone-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full z-10 border border-white/10">
            {product.categoryName}
          </span>
        )}
        
        {/* Heart Favorite Button */}
        <button 
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md shadow-sm transition-all z-20 ${
            isLiked 
              ? 'bg-rose-50 text-rose-500 border border-rose-200' 
              : 'bg-white/90 text-stone-400 hover:text-rose-500 hover:bg-white'
          }`}
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          aria-label="Guardar en favoritos"
        >
          <Heart size={15} className={isLiked ? "fill-rose-500" : ""} />
        </button>
      </Link>

      {/* Content Container */}
      <div className="px-1.5 flex flex-col flex-1 pb-1">
        <Link to={`/producto/${product.slug}`} className="block flex-1 group/title">
          <h3 className="text-[15px] font-extrabold text-slate-900 leading-snug mb-1 group-hover/title:text-teal-700 transition-colors line-clamp-2">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} className={i < 4 ? "fill-orange-400 text-orange-400" : "fill-stone-200 text-stone-200"} />
            ))}
            <span className="text-[10px] text-stone-400 font-bold ml-1">4.9 • 300 DPI</span>
          </div>
        </Link>
                
        {/* Price & Action Section */}
        <div className="flex items-end justify-between mt-auto pt-2.5 border-t border-stone-100">
          <div>
            <div className="flex items-center gap-1.5 -mb-0.5">
              <span className="text-[10px] font-bold text-stone-400">Desde</span>
              {hasDiscount && product.originalBasePrice && (
                <span className="text-[11px] font-bold text-stone-400 line-through">
                  {formatCOP(product.originalBasePrice)}
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-1">
              <p className={`text-base sm:text-lg font-black tracking-tight ${product.isPromo ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatCOP(Number(product.basePrice))}
              </p>
              <span className="text-[10px] font-extrabold text-teal-700">
                {product.baseQuantity && product.baseQuantity > 1
                  ? `/ ${product.baseQuantity.toLocaleString('es-CO')} u.`
                  : '/ u.'}
              </span>
            </div>
            {product.baseQuantity && product.baseQuantity > 1 && (
              <span className="text-[10px] text-stone-400 font-semibold block -mt-0.5">
                ({formatCOP(Number(product.basePrice) / product.baseQuantity)} / unidad)
              </span>
            )}
          </div>
          
          <Link 
            to={`/producto/${product.slug}`}
            className="bg-teal-500 hover:bg-teal-600 active:scale-95 text-slate-950 p-2.5 rounded-2xl shadow-sm transition-all shrink-0 font-black flex items-center justify-center border border-teal-400"
            title="Configurar y Cotizar"
          >
            <ShoppingCart size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
