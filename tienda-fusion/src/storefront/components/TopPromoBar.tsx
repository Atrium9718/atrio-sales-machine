import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useCms } from '../../contexts/CmsContext';

export default function TopPromoBar() {
  const { config } = useCms();
  const [topBanner, setTopBanner] = useState<any | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const loadTopBar = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog/banners?placement=top_bar');
      if (res.ok) {
        const banners = await res.json();
        const active = Array.isArray(banners) ? banners.find((b: any) => (b.active !== false && b.isActive !== false && b.placement === 'top_bar')) : null;
        setTopBanner(active || null);
      }
    } catch (e) {
      console.error('Error loading top promo bar:', e);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTopBar();

    const handleUpdate = () => {
      loadTopBar();
    };

    window.addEventListener('banners-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('banners-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadTopBar]);

  if (dismissed || !hasLoaded) return null;

  // If there is an active top_bar banner from the banners module, use it
  // Otherwise, only fallback to CMS config if specifically enabled AND no banner exists
  let promoData: any = null;

  if (topBanner) {
    const extra = topBanner.extraConfig || {};
    promoData = {
      title: topBanner.title,
      subtitle: topBanner.subtitle,
      tag: topBanner.tag,
      linkUrl: topBanner.linkUrl || topBanner.link,
      ctaText: topBanner.ctaText || 'Ver Más',
      bgType: topBanner.bgType || 'GRADIENT',
      bgColor: topBanner.bgColor || '#0f766e',
      gradientFrom: topBanner.gradientFrom || '#042f2e',
      gradientTo: topBanner.gradientTo || '#0f766e',
      textColor: topBanner.textColor || '#ffffff',
      tagBgColor: extra.tagBgColor || '#2dd4bf',
      tagTextColor: extra.tagTextColor || '#022c22',
      desktopImageUrl: topBanner.desktopImageUrl || topBanner.imageUrl,
    };
  } else if (config?.topBar?.customEnabled || (config?.topBar?.enabled && config?.topBar?.text && !topBanner)) {
    // Only use CMS if explicitly configured with text
    promoData = {
      title: config.topBar.text,
      subtitle: config.topBar.highlightText,
      tag: config.topBar.badgeTag,
      linkUrl: config.topBar.linkUrl,
      ctaText: config.topBar.linkText || 'Ver Más',
      bgType: config.topBar.bgType || 'GRADIENT',
      bgColor: config.topBar.bgColor || '#0f766e',
      gradientFrom: config.topBar.gradientFrom || '#042f2e',
      gradientTo: config.topBar.gradientTo || '#0f766e',
      textColor: config.topBar.textColor || '#ffffff',
      tagBgColor: '#2dd4bf',
      tagTextColor: '#022c22',
    };
  }

  if (!promoData || !promoData.title) return null;

  // La franja usa siempre los colores de marca (negro + lima); solo se respeta una imagen de fondo
  const bgStyle: React.CSSProperties = promoData.bgType === 'IMAGE' && promoData.desktopImageUrl
    ? {
        backgroundImage: `url(${promoData.desktopImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : { backgroundColor: '#0b0b0b' };

  return (
    <div
      id="top-promo-bar"
      style={{ ...bgStyle, color: '#ffffff' }}
      className="text-xs py-2 px-3 sm:px-4 relative z-30 transition-all border-b border-white/10 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden mx-auto">
          {promoData.tag && (
            <span
              className="px-2.5 py-0.5 rounded-md bg-teal-400 text-slate-950 text-[10px] font-bold uppercase tracking-wider shrink-0"
            >
              {promoData.tag}
            </span>
          )}
          <span className="font-bold truncate text-[11px] sm:text-xs">
            {promoData.title}
          </span>
          {promoData.subtitle && (
            <span className="hidden md:inline opacity-80 text-[11px] font-medium truncate">
              — {promoData.subtitle}
            </span>
          )}
          {promoData.linkUrl && (
            <Link
              to={promoData.linkUrl}
              className="inline-flex items-center gap-1 font-black text-teal-400 hover:text-teal-300 underline underline-offset-2 ml-1.5 text-[11px] shrink-0 transition-colors"
            >
              <span>{promoData.ctaText || 'Ver Más'}</span>
              <ArrowRight size={11} />
            </Link>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 p-1 rounded-full hover:bg-white/10 transition-all shrink-0 cursor-pointer"
          aria-label="Cerrar barra promocional"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
