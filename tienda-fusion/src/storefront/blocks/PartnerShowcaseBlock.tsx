import React from 'react';
import { Link } from 'react-router-dom';
import { PartnerShowcaseBlockConfig } from '../../types/cms';
import { Sparkles, ArrowRight, CheckCircle2, Globe } from 'lucide-react';

interface Props {
  block: PartnerShowcaseBlockConfig;
}

export default function PartnerShowcaseBlock({ block }: Props) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Info */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-black tracking-wide uppercase backdrop-blur-md">
              <Sparkles size={14} className="text-teal-400" />
              <span>Alianza Estratégica Digital</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
              {block.partnerName || 'Atrio Agencia S.A.S'}
            </h2>

            <p className="text-lg font-bold text-teal-400">
              {block.partnerTagline || 'Aliado Estratégico en Transformación Digital & Publicidad 360°'}
            </p>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              {block.description || 'Potenciamos la presencia de tu marca conectando la mejor producción gráfica impresa con estrategias digitales de alto rendimiento.'}
            </p>

            {block.ctaText && block.ctaLink && (
              <div className="pt-2">
                {block.ctaLink.startsWith('http') ? (
                  <a
                    href={block.ctaLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg hover:shadow-teal-500/25"
                  >
                    <span>{block.ctaText}</span>
                    <ArrowRight size={16} />
                  </a>
                ) : (
                  <Link
                    to={block.ctaLink}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg hover:shadow-teal-500/25"
                  >
                    <span>{block.ctaText}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Services Box */}
          <div className="lg:col-span-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-black text-teal-300 uppercase tracking-wider mb-2">
                Servicios Complementarios Disponibles
              </h3>

              <div className="space-y-4">
                {block.services?.map((serv, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/40 transition-colors">
                    <h4 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                      <span>{serv.title}</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed pl-6">
                      {serv.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
