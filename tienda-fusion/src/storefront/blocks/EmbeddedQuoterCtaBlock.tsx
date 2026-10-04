import React from 'react';
import { Link } from 'react-router-dom';
import { EmbeddedQuoterCtaBlockConfig } from '../../types/cms';
import { Calculator, CheckCircle2, ArrowRight, BookOpen, Layers } from 'lucide-react';

interface Props {
  block: EmbeddedQuoterCtaBlockConfig;
}

export default function EmbeddedQuoterCtaBlock({ block }: Props) {
  const getIcon = () => {
    switch (block.quoterType) {
      case 'libros': return <BookOpen size={28} className="text-teal-900" />;
      case 'empaques': return <Layers size={28} className="text-teal-900" />;
      default: return <Calculator size={28} className="text-teal-900" />;
    }
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 text-white relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 md:p-12 lg:p-14 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                  {getIcon()}
                </div>
                {block.highlightText && (
                  <span className="text-xs font-black tracking-widest uppercase bg-teal-400/20 text-teal-200 border border-teal-400/30 px-3 py-1 rounded-full">
                    {block.highlightText}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                {block.title || 'Cotizador Editorial Automatizado'}
              </h2>

              {block.subtitle && (
                <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed max-w-2xl">
                  {block.subtitle}
                </p>
              )}

              {block.featureBullets && block.featureBullets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {block.featureBullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-teal-50">
                      <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center pt-4 lg:pt-0">
              <Link
                to={block.buttonLink || '/cotizador-libros'}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-teal-50 text-teal-950 font-black rounded-2xl text-sm transition-all shadow-xl hover:shadow-white/20 flex items-center justify-center gap-3 hover:scale-[1.02]"
              >
                <span>{block.buttonText || 'Abrir Cotizador'}</span>
                <ArrowRight size={18} className="text-teal-700" />
              </Link>
              <p className="text-[11px] text-teal-200 font-medium mt-3 text-center lg:text-right">
                Cálculo instantáneo sin registro previo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
