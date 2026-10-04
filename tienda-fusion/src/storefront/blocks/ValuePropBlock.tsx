import React from 'react';
import { ValuePropBlockConfig } from '../../types/cms';
import { ShieldCheck, Zap, Truck, Award, Clock, Printer, Sparkles, Layers, DollarSign } from 'lucide-react';

interface Props {
  block: ValuePropBlockConfig;
}

export default function ValuePropBlock({ block }: Props) {
  const getIcon = (iconName: string) => {
    const props = { size: 24, className: 'text-teal-600' };
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Truck': return <Truck {...props} />;
      case 'Award': return <Award {...props} />;
      case 'Clock': return <Clock {...props} />;
      case 'Printer': return <Printer {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Layers': return <Layers {...props} />;
      case 'DollarSign': return <DollarSign {...props} />;
      default: return <ShieldCheck {...props} />;
    }
  };

  const isDark = block.bgStyle === 'dark' || block.bgStyle === 'gradient-dark';
  const isSlate50 = block.bgStyle === 'slate-50';

  let bgClass = 'bg-white';
  if (isSlate50) bgClass = 'bg-slate-50';
  if (isDark) bgClass = 'bg-slate-900 text-white';

  const colCount = block.columns || 4;
  const gridColsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[colCount];

  return (
    <section className={`py-16 md:py-20 ${bgClass} border-b border-slate-100`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(block.title || block.subtitle) && (
          <div className="text-center max-w-3xl mx-auto mb-12">
            {block.badge && (
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3 inline-block">
                {block.badge}
              </span>
            )}
            {block.title && (
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {block.title}
              </h2>
            )}
            {block.subtitle && (
              <p className={`mt-3 text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {block.subtitle}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${gridColsClass} gap-6`}>
          {block.items?.map((item) => (
            <div
              key={item.id}
              className={`p-6 sm:p-7 rounded-3xl border transition-all ${
                isDark
                  ? 'bg-slate-800/60 border-slate-700/60 hover:border-teal-500/50'
                  : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-500/5'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-xs">
                  {getIcon(item.icon)}
                </div>
                {item.highlightBadge && (
                  <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-teal-100/70 text-teal-800">
                    {item.highlightBadge}
                  </span>
                )}
              </div>

              <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {item.title}
              </h3>

              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
