import React from 'react';
import { Link } from 'react-router-dom';
import { HeroBannerBlockConfig } from '../../types/cms';
import { ShieldCheck, Truck, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  block: HeroBannerBlockConfig;
}

export default function HeroBannerBlock({ block }: Props) {
  const isDark = block.bgStyle === 'dark' || block.bgStyle === 'gradient-dark' || !block.bgStyle;
  const isTealGradient = block.bgStyle === 'gradient-teal';

  let bgClasses = 'bg-stone-950 text-white';
  if (block.bgStyle === 'white') bgClasses = 'bg-[#faf8f5] text-slate-900 border-b border-stone-200';
  if (block.bgStyle === 'slate-50') bgClasses = 'bg-stone-100 text-slate-900 border-b border-stone-200';
  if (block.bgStyle === 'gradient-dark') bgClasses = 'bg-gradient-to-br from-stone-950 via-slate-900 to-amber-950 text-white';
  if (isTealGradient) bgClasses = 'bg-gradient-to-br from-teal-950 via-slate-900 to-stone-950 text-white';

  const heightClasses = {
    compact: 'py-12 md:py-16',
    standard: 'py-16 md:py-24',
    large: 'py-20 md:py-32',
  }[block.height || 'standard'];

  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center mx-auto',
    right: 'text-right items-end ml-auto',
  }[block.alignment || 'left'];

  return (
    <section className={`relative overflow-hidden ${bgClasses} ${heightClasses}`}>
      {/* Background Image with Overlay */}
      {block.backgroundImageUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={block.backgroundImageUrl}
            alt={block.headline || 'Banner'}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-slate-950/85 to-stone-950/60 backdrop-blur-[1px]" />
        </div>
      )}

      {/* Decorative ambient gradient */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl flex flex-col ${alignClasses}`}>
          {/* Badge */}
          {block.badgeText && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-wide uppercase mb-5 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400" />
              <span>{block.badgeText}</span>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4 text-balance text-white">
            {block.headline}
          </h1>

          {/* Subheadline */}
          {block.subheadline && (
            <p className={`text-base sm:text-lg lg:text-xl font-medium leading-relaxed mb-8 max-w-2xl text-balance ${
              isDark || isTealGradient ? 'text-stone-200' : 'text-stone-600'
            }`}>
              {block.subheadline}
            </p>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5">
            {block.ctaText && block.ctaLink && (
              block.ctaLink.startsWith('http') ? (
                <a
                  href={block.ctaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 hover:translate-y-[-1px]"
                >
                  <span>{block.ctaText}</span>
                  <ArrowRight size={16} />
                </a>
              ) : (
                <Link
                  to={block.ctaLink}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 hover:translate-y-[-1px]"
                >
                  <span>{block.ctaText}</span>
                  <ArrowRight size={16} />
                </Link>
              )
            )}

            {block.secondaryCtaText && block.secondaryCtaLink && (
              block.secondaryCtaLink.startsWith('http') ? (
                <a
                  href={block.secondaryCtaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-sm transition-all backdrop-blur-md"
                >
                  {block.secondaryCtaText}
                </a>
              ) : (
                <Link
                  to={block.secondaryCtaLink}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-sm transition-all backdrop-blur-md"
                >
                  {block.secondaryCtaText}
                </Link>
              )
            )}
          </div>

          {/* Trust Badges */}
          {block.showTrustBadges && (
            <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-stone-300 font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-400" />
                <span>300 DPI CTP Garantizado</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-amber-400" />
                <span>Despachos a Toda Colombia</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span>Entrega Rápida 24/48 Horas</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
