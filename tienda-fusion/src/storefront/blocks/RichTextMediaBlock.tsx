import React from 'react';
import { Link } from 'react-router-dom';
import { RichTextMediaBlockConfig } from '../../types/cms';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  block: RichTextMediaBlockConfig;
}

export default function RichTextMediaBlock({ block }: Props) {
  const isDark = block.bgStyle === 'dark' || block.bgStyle === 'gradient-dark';
  const isSlate50 = block.bgStyle === 'slate-50';

  let bgClass = 'bg-white';
  if (isSlate50) bgClass = 'bg-slate-50';
  if (isDark) bgClass = 'bg-slate-900 text-white';

  const isMediaRight = block.mediaPosition === 'right' || !block.mediaPosition;

  return (
    <section className={`py-16 md:py-24 ${bgClass} border-b border-slate-100 overflow-hidden`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center`}>
          {/* Content Column */}
          <div className={`space-y-6 ${isMediaRight ? 'order-1' : 'order-1 lg:order-2'}`}>
            {block.badge && (
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 inline-block">
                {block.badge}
              </span>
            )}

            {block.title && (
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {block.title}
              </h2>
            )}

            {block.subtitle && (
              <p className={`text-base font-semibold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {block.subtitle}
              </p>
            )}

            {block.contentHtml && (
              <div
                className={`prose prose-sm sm:prose-base max-w-none leading-relaxed ${
                  isDark ? 'prose-invert text-slate-300' : 'text-slate-600'
                }`}
                dangerouslySetInnerHTML={{ __html: block.contentHtml }}
              />
            )}

            {block.checklistItems && block.checklistItems.length > 0 && (
              <ul className="space-y-3 pt-2">
                {block.checklistItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={14} className="text-teal-600" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {block.ctaButtonText && block.ctaButtonLink && (
              <div className="pt-4">
                {block.ctaButtonLink.startsWith('http') ? (
                  <a
                    href={block.ctaButtonLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-teal-500/20"
                  >
                    <span>{block.ctaButtonText}</span>
                    <ArrowRight size={16} />
                  </a>
                ) : (
                  <Link
                    to={block.ctaButtonLink}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-teal-500/20"
                  >
                    <span>{block.ctaButtonText}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Media Column */}
          <div className={`${isMediaRight ? 'order-2' : 'order-2 lg:order-1'}`}>
            <div className="relative group">
              <div className="absolute -inset-4 bg-teal-500/10 rounded-[36px] blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-xl bg-slate-900 aspect-4/3 sm:aspect-16/10">
                <img
                  src={block.mediaUrl || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop'}
                  alt={block.title || 'Foto de producción'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
