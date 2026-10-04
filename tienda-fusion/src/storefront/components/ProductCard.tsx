import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Printer, Megaphone, Image as ImageIcon, Tag, Package, BookOpen } from 'lucide-react';
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
  const [showPlaceholder, setShowPlaceholder] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const unitConfig = getProductUnitConfig(product);

  // Synchronize when product data changes
  useEffect(() => {
    setImgSrc(getProductImageUrl(product));
    setHasError(false);
    setShowPlaceholder(false);
  }, [product.imageUrl, product.slug, product.name, product.categorySlug]);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // 1er fallo: imagen de respaldo por tipo de producto; 2º fallo: ícono de la categoría
  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = getProductImageUrl({ ...product, imageUrl: undefined });
      if (fallback !== imgSrc) {
        setImgSrc(fallback);
        return;
      }
    }
    setShowPlaceholder(true);
  };

  const slugText = `${product.categorySlug || ''} ${product.slug} ${product.name}`.toLowerCase();
  const PlaceholderIcon = slugText.includes('caja') || slugText.includes('empaque') ? Package
    : slugText.includes('etiqueta') || slugText.includes('sticker') ? Tag
    : slugText.includes('pendon') || slugText.includes('banner') || slugText.includes('formato') ? ImageIcon
    : slugText.includes('volante') || slugText.includes('publicidad') ? Megaphone
    : slugText.includes('libro') || slugText.includes('separador') || slugText.includes('editorial') ? BookOpen
    : Printer;

  const hasDiscount = Boolean(
    (product.originalBasePrice && product.originalBasePrice > Number(product.basePrice)) ||
    (product.isPromo && product.discountPercentage && product.discountPercentage > 0)
  );

  const badge = product.isPromo
    ? (product.promoBadge || (product.discountPercentage ? `-${product.discountPercentage}%` : 'Oferta'))
    : product.isFeatured ? 'Destacado' : null;

  return (
    <div className="group relative flex flex-col h-full bg-white rounded-[20px] cut-tr-bl cut-md p-2.5 sm:p-3 transition-transform duration-300 hover:-translate-y-1">
      {/* Imagen con el mismo corte diagonal */}
      <Link to={`/producto/${product.slug}`} className="block relative aspect-square rounded-[14px] cut-tr-bl cut-md overflow-hidden bg-[#e9eaec]">
        {showPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center" aria-label={product.name} role="img">
            <span className="relative inline-flex w-20 h-20">
              <PlaceholderIcon size={80} strokeWidth={0} fill="#c4f142" className="absolute left-[5px] top-[6px]" />
              <PlaceholderIcon size={80} strokeWidth={1.3} className="relative text-slate-950" />
            </span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {badge && (
          <span className={`absolute top-3 left-3 z-20 text-[12px] font-semibold px-3 py-1 rounded-md cut-br cut-sm ${product.isPromo ? 'bg-red-500 text-white' : 'bg-teal-400 text-slate-950'}`}>
            {badge}
          </span>
        )}

        <button
          className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isLiked ? 'bg-white text-red-500' : 'bg-white/90 text-slate-700 hover:text-red-500'
          }`}
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          aria-label="Guardar en favoritos"
        >
          <Heart size={16} className={isLiked ? 'fill-red-500' : ''} />
        </button>
      </Link>

      {/* Contenido */}
      <div className="px-2 pt-4 pb-2 flex flex-col flex-1">
        {product.categoryName && (
          <span className="text-xs text-slate-500 mb-1">{product.categoryName}</span>
        )}
        <Link to={`/producto/${product.slug}`} className="block flex-1">
          <h3 className="text-base sm:text-lg font-medium text-slate-950 leading-snug line-clamp-2 group-hover:underline decoration-teal-400 decoration-2 underline-offset-4">
            {product.name}
          </h3>
          <div className="flex items-center gap-0.5 mt-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className={i < 4 ? 'fill-orange-500 text-orange-500' : 'fill-orange-200 text-orange-200'} />
            ))}
            <span className="text-xs text-slate-500 ml-1">(4.9)</span>
          </div>
        </Link>

        <div className="flex items-end justify-between gap-2 mt-4">
          <div>
            {hasDiscount && product.originalBasePrice && (
              <span className="block text-xs text-slate-400 line-through">{formatCOP(product.originalBasePrice)}</span>
            )}
            <div className="flex items-baseline gap-1">
              <span className={`text-lg sm:text-xl font-semibold tracking-tight ${product.isPromo ? 'text-red-500' : 'text-slate-950'}`}>
                {formatCOP(Number(product.basePrice))}
              </span>
              <span className="text-xs text-slate-500">
                {product.baseQuantity && product.baseQuantity > 1 ? `/ ${product.baseQuantity.toLocaleString('es-CO')} u.` : '/ u.'}
              </span>
            </div>
          </div>

          <Link
            to={`/producto/${product.slug}`}
            className="w-11 h-11 rounded-full bg-teal-400 hover:bg-slate-950 text-slate-950 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Configurar y cotizar"
            aria-label={`Configurar ${product.name}`}
          >
            <ShoppingCart size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
