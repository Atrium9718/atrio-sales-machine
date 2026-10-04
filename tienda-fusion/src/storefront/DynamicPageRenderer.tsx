import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CmsPage } from '../types/cms';
import { INITIAL_CMS_PAGES } from '../types/cms-default-pages';
import DynamicBlockRenderer from './blocks/DynamicBlockRenderer';
import { ArrowLeft, Loader2, FileQuestion, Eye, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

interface Props {
  presetSlug?: string;
}

export default function DynamicPageRenderer({ presetSlug }: Props) {
  const params = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'draft' || searchParams.get('preview') === 'true';

  const slug = presetSlug || params.slug || 'home';

  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    async function loadPage() {
      setLoading(true);
      setError(false);

      try {
        const cleanSlug = slug.replace(/^\//, '').toLowerCase();
        const url = `/api/cms/pages/${cleanSlug}${isPreviewMode ? '?preview=draft' : ''}`;
        const res = await fetch(url);

        if (res.ok) {
          const data: CmsPage = await res.json();
          setPage(data);
          
          if (data.metaTitle) {
            document.title = isPreviewMode ? `[BORRADOR] ${data.metaTitle}` : data.metaTitle;
          }
        } else {
          // Fallback to local INITIAL_CMS_PAGES
          const fallback = INITIAL_CMS_PAGES.find(
            p => p.slug.toLowerCase() === cleanSlug || (cleanSlug === '' && p.slug === 'home')
          );
          if (fallback) {
            setPage(fallback);
            if (fallback.metaTitle) document.title = fallback.metaTitle;
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.warn('Error fetching CMS page, using fallback seed if available:', err);
        const cleanSlug = slug.replace(/^\//, '').toLowerCase();
        const fallback = INITIAL_CMS_PAGES.find(
          p => p.slug.toLowerCase() === cleanSlug || (cleanSlug === '' && p.slug === 'home')
        );
        if (fallback) {
          setPage(fallback);
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug, isPreviewMode]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 size={36} className="text-teal-600 animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500">Cargando página...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
          <FileQuestion size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Página no encontrada</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          La página solicitada "{slug}" no existe o aún no ha sido publicada por el equipo editorial.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Volver al inicio</span>
          </Link>
          <Link
            to="/admin/settings?tab=cms"
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            <Eye size={16} />
            <span>Abrir CMS Admin</span>
          </Link>
        </div>
      </div>
    );
  }

  // Choose blocks: if in preview mode or if no publishedBlocks set, show current blocks
  const blocksToRender = isPreviewMode
    ? (page.blocks || [])
    : (page.publishedBlocks && page.publishedBlocks.length > 0 ? page.publishedBlocks : page.blocks || []);

  // Sort blocks by displayOrder
  const sortedBlocks = [...blocksToRender].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="bg-white min-h-screen relative">
      {/* Interactive Draft Preview Banner */}
      {isPreviewMode && (
        <aside aria-label="Borrador en desarrollo" className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-600 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-900"></span>
            </span>
            <span className="tracking-wide">MODO VISTA PREVIA DE BORRADOR:</span>
            <span className="font-medium text-slate-900 bg-amber-400 px-2 py-0.5 rounded-md border border-amber-600/30">
              {page.title} (v{page.currentVersion || 1} Borrador)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('preview');
                setSearchParams(nextParams);
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-[11px]"
            >
              Ver Versión Pública en Vivo
            </button>
            <Link
              to="/admin/settings?tab=cms"
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1.5"
            >
              <span>Publicar en CMS</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </aside>
      )}

      {sortedBlocks.map(block => (
        <DynamicBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
