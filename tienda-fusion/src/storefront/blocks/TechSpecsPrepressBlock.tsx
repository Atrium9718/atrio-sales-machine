import React from 'react';
import { Link } from 'react-router-dom';
import { TechSpecsPrepressBlockConfig } from '../../types/cms';
import { AlertCircle, CheckCircle, Info, FileCode, ArrowRight } from 'lucide-react';

interface Props {
  block: TechSpecsPrepressBlockConfig;
}

export default function TechSpecsPrepressBlock({ block }: Props) {
  const getBadgeColor = (importance: string) => {
    switch (importance) {
      case 'CRITICO':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RECOMENDADO':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'CRITICO':
        return <AlertCircle size={14} className="text-rose-600" />;
      case 'RECOMENDADO':
        return <Info size={14} className="text-amber-600" />;
      default:
        return <CheckCircle size={14} className="text-teal-600" />;
    }
  };

  return (
    <section className="py-16 md:py-24 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            {block.badge && (
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3 inline-block">
                {block.badge}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {block.title || 'Guía Técnica de Pre-Prensa'}
            </h2>
            {block.subtitle && (
              <p className="mt-3 text-sm sm:text-base text-slate-500 font-medium">
                {block.subtitle}
              </p>
            )}
          </div>

          {block.downloadGuideUrl && (
            <Link
              to={block.downloadGuideUrl}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-5 py-3 rounded-xl transition-all shadow-xs shrink-0 self-start md:self-auto"
            >
              <FileCode size={16} />
              <span>{block.downloadGuideText || 'Ver Guía de Archivos'}</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {block.specs?.map((spec) => (
            <div
              key={spec.id}
              className="p-6 sm:p-7 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-white transition-all group"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-sm font-black text-slate-900 group-hover:text-teal-600 transition-colors">
                  {spec.title}
                </span>
                <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getBadgeColor(spec.importance)}`}>
                  {getImportanceIcon(spec.importance)}
                  <span>{spec.importance}</span>
                </span>
              </div>

              <div className="p-3 bg-white group-hover:bg-teal-50/50 rounded-xl border border-slate-100 mb-3">
                <span className="text-xs font-mono font-bold text-teal-800">
                  {spec.specification}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {spec.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
