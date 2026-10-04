import React from 'react';
import { TestimonialsBlockConfig } from '../../types/cms';
import { Star, Quote, Building2, MapPin, CheckCircle2 } from 'lucide-react';

interface Props {
  block: TestimonialsBlockConfig;
}

export default function TestimonialsBlock({ block }: Props) {
  const isDark = block.bgStyle === 'dark' || block.bgStyle === 'gradient-dark';
  const isSlate50 = block.bgStyle === 'slate-50';

  let bgClass = 'bg-white';
  if (isSlate50) bgClass = 'bg-slate-50';
  if (isDark) bgClass = 'bg-slate-900 text-white';

  return (
    <section className={`py-16 md:py-24 ${bgClass} border-b border-slate-100`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {block.badge && (
            <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3 inline-block">
              {block.badge}
            </span>
          )}
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {block.title || 'Lo Que Opinan Nuestros Clientes'}
          </h2>
          {block.subtitle && (
            <p className={`mt-3 text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {block.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {block.items?.map((item) => (
            <div
              key={item.id}
              className={`p-7 rounded-3xl border flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700/80'
                  : 'bg-white border-slate-100 shadow-sm hover:shadow-lg hover:border-teal-200'
              }`}
            >
              <div>
                {/* Rating stars & Quote icon */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-1">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote size={20} className="text-teal-500/40" />
                </div>

                {/* Quote Text */}
                <p className={`text-xs sm:text-sm leading-relaxed italic mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  "{item.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>{item.author}</span>
                    <CheckCircle2 size={14} className="text-teal-500" />
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {item.role} · <strong className="text-slate-600 dark:text-slate-300">{item.company}</strong>
                  </p>
                </div>

                {item.city && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-1 rounded-md">
                    <MapPin size={10} />
                    <span>{item.city.split(',')[0]}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
