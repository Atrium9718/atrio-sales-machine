import React, { useState, useMemo } from 'react';
import { FaqAccordionBlockConfig } from '../../types/cms';
import { ChevronDown, Search, HelpCircle, MessageCircle, ArrowRight } from 'lucide-react';

interface Props {
  block: FaqAccordionBlockConfig;
}

export default function FaqAccordionBlock({ block }: Props) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isDark = block.bgStyle === 'dark' || block.bgStyle === 'gradient-dark';
  const isSlate50 = block.bgStyle === 'slate-50';

  let bgClass = 'bg-white';
  if (isSlate50) bgClass = 'bg-slate-50';
  if (isDark) bgClass = 'bg-slate-900 text-white';

  const toggleAccordion = (id: string) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    block.items?.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [block.items]);

  // Filtered FAQ items
  const filteredItems = useMemo(() => {
    return (block.items || []).filter(item => {
      const matchSearch = searchQuery.trim() === '' || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [block.items, searchQuery, selectedCategory]);

  return (
    <section className={`py-16 md:py-24 ${bgClass} border-b border-slate-100`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          {block.badge && (
            <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3 inline-block">
              {block.badge}
            </span>
          )}
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {block.title || 'Preguntas Frecuentes'}
          </h2>
          {block.subtitle && (
            <p className={`mt-3 text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {block.subtitle}
            </p>
          )}
        </div>

        {/* Search input if enabled */}
        {block.enableSearch && (
          <div className="relative mb-8 max-w-xl mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en preguntas frecuentes (ej: CMYK, envíos, formatos)..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs"
            />
          </div>
        )}

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredItems.map(item => {
            const isOpen = !!openIds[item.id];
            return (
              <div
                key={item.id}
                className={`border rounded-2xl transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-white dark:bg-slate-800 border-teal-300 shadow-md ring-1 ring-teal-500/20'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-sm sm:text-base focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={18} className="text-teal-600 shrink-0" />
                    <span>{item.question}</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-teal-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-500">
                No se encontraron preguntas con el criterio "{searchQuery}".
              </p>
            </div>
          )}
        </div>

        {/* Contact Prompt Footer */}
        {block.contactPromptText && (
          <div className="mt-10 p-6 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <MessageCircle size={20} />
              </div>
              <p className="text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">
                {block.contactPromptText}
              </p>
            </div>
            <a
              href="https://wa.me/573243917169"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shrink-0 shadow-xs"
            >
              <span>Escribir por WhatsApp</span>
              <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
