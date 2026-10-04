import React, { useState } from 'react';
import { CmsPage, CmsBlock } from '../../types/cms';
import DynamicBlockRenderer from '../../storefront/blocks/DynamicBlockRenderer';
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  ExternalLink,
  Rocket,
  Layers,
  Sparkles,
  CheckCircle,
  Eye,
  RotateCw,
  Maximize2
} from 'lucide-react';

interface Props {
  page: CmsPage;
  canPublish: boolean;
  onClose: () => void;
  onPublish: () => void;
}

export default function CmsLivePreviewModal({
  page,
  canPublish,
  onClose,
  onPublish,
}: Props) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  const blocksToDisplay = viewMode === 'DRAFT'
    ? (page.blocks || [])
    : (page.publishedBlocks && page.publishedBlocks.length > 0 ? page.publishedBlocks : page.blocks || []);

  const sortedBlocks = [...blocksToDisplay].sort((a, b) => a.displayOrder - b.displayOrder);

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] max-w-[375px]';
      case 'tablet':
        return 'w-[768px] max-w-[768px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md animate-fade-in">
      
      {/* Top Floating Control Bar */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 text-white shrink-0 z-20">
        
        {/* Left: Page identity */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
            <Eye size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-white">
                Simulador de Previsualización en Vivo
              </h2>
              <span className="bg-slate-800 text-teal-400 font-mono text-[11px] px-2 py-0.5 rounded font-bold border border-slate-700">
                /{page.slug}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualiza en tiempo real cómo interactúan los clientes en cualquier pantalla antes de publicar.
            </p>
          </div>
        </div>

        {/* Center: Device & Mode Switchers */}
        <div className="flex items-center gap-4">
          
          {/* Draft vs Published Toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('DRAFT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'DRAFT'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-900 inline-block"></span>
              <span>Ver Borrador Actual ({page.blocks?.length || 0})</span>
            </button>
            <button
              onClick={() => setViewMode('PUBLISHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'PUBLISHED'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-900 inline-block"></span>
              <span>En Vivo en Tienda ({page.publishedBlocks?.length || page.blocks?.length || 0})</span>
            </button>
          </div>

          {/* Device viewport selectors */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setDevice('desktop')}
              title="Vista de Escritorio (100% ancho)"
              className={`p-1.5 rounded-lg transition-all ${
                device === 'desktop'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              title="Vista de Tableta (768px)"
              className={`p-1.5 rounded-lg transition-all ${
                device === 'tablet'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet size={16} />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              title="Vista Móvil (375px)"
              className={`p-1.5 rounded-lg transition-all ${
                device === 'mobile'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={16} />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href={`/page/${page.slug}?preview=draft`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <span>Abrir en Pestaña</span>
            <ExternalLink size={13} />
          </a>

          {canPublish && (
            <button
              onClick={() => {
                onClose();
                onPublish();
              }}
              className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md"
            >
              <Rocket size={14} />
              <span>Publicar en Vivo</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Preview Viewport Arena */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center bg-slate-950/60">
        <div
          className={`bg-white rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden border border-slate-300 min-h-[85vh] relative ${getContainerWidth()}`}
        >
          {/* Top Device Header Bar simulation for Mobile & Tablet */}
          {device !== 'desktop' && (
            <div className="bg-slate-900 text-slate-400 text-[10px] py-1.5 px-4 flex items-center justify-between border-b border-slate-800 select-none">
              <span className="font-mono">9:41</span>
              <span className="font-bold text-slate-300">
                fusiongrafica.com.co/{page.slug}
              </span>
              <span className="flex items-center gap-1 font-mono">100% 🔋</span>
            </div>
          )}

          {/* Mode Banner inside simulator */}
          {viewMode === 'DRAFT' && (
            <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-black tracking-wide border-b border-amber-600 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse"></span>
              <span>PREVISUALIZANDO BORRADOR DE TRABAJO (Cambios no desplegados aún)</span>
            </div>
          )}

          {/* Render All Blocks */}
          <div className="w-full">
            {sortedBlocks.length === 0 ? (
              <div className="py-24 text-center text-slate-400 p-8">
                <Layers size={40} className="mx-auto mb-3 opacity-40 text-teal-600" />
                <h3 className="text-base font-bold text-slate-700 mb-1">Página sin bloques</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Agrega componentes desde el panel de edición para comenzar a diseñar el contenido visual.
                </p>
              </div>
            ) : (
              sortedBlocks.map(block => (
                <DynamicBlockRenderer key={block.id} block={block} />
              ))
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
