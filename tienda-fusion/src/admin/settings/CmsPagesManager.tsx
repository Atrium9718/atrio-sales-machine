import React, { useState, useEffect } from 'react';
import { CmsPage, CmsBlock, CmsBlockType, CmsPageStatus } from '../../types/cms';
import { INITIAL_CMS_PAGES } from '../../types/cms-default-pages';
import CmsBlockEditorModal from './CmsBlockEditorModal';
import CmsVersionHistoryModal from './CmsVersionHistoryModal';
import CmsLivePreviewModal from './CmsLivePreviewModal';
import { useRbac } from '../../hooks/useRbac';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Search,
  BookOpen,
  Layout,
  HelpCircle,
  Quote,
  Zap,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Calculator,
  Globe,
  History,
  RotateCcw,
  Rocket,
  Clock,
  User,
  Tag,
  AlertTriangle,
  X
} from 'lucide-react';

export default function CmsPagesManager() {
  const { user } = useAuth();
  const {
    currentRole,
    roleName,
    isSuperAdmin,
    canPublishCms,
    canEditCmsDraft,
    canManageVersions,
    canDeleteCms
  } = useRbac();

  const currentUser = {
    name: user?.displayName || (isSuperAdmin ? 'Super Administrador' : 'Diseñador Editorial'),
    email: user?.email || 'admin@fusiongrafica.com.co',
    role: currentRole
  };

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'CHANGES' | 'SYSTEM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [editingBlock, setEditingBlock] = useState<CmsBlock | null>(null);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [showPageSettingsModal, setShowPageSettingsModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Publish form
  const [publishVersionTag, setPublishVersionTag] = useState('');
  const [publishChangeNote, setPublishChangeNote] = useState('');

  const [generatingAiSeo, setGeneratingAiSeo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Page State
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageTemplate, setNewPageTemplate] = useState('BLANK');

  const activePage = pages.find(p => p.id === activePageId) || null;

  useEffect(() => {
    fetchPages();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      } else {
        setPages(INITIAL_CMS_PAGES);
      }
    } catch (err) {
      console.warn('Could not fetch pages from API, using defaults:', err);
      setPages(INITIAL_CMS_PAGES);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activePage) return;
    if (!canEditCmsDraft) {
      alert('No tienes permisos para editar borradores de páginas CMS (cms:edit_draft requerido).');
      return;
    }

    setSavingDraft(true);
    try {
      const res = await fetch(`/api/cms/pages/${activePage.id}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: activePage.blocks,
          user: currentUser,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        showToast('Borrador guardado exitosamente');
      } else {
        // Local state update
        const updated: CmsPage = {
          ...activePage,
          status: 'CHANGES_IN_DRAFT',
          hasUnpublishedChanges: true,
          updatedAt: new Date().toISOString(),
          lastDraftSavedAt: new Date().toISOString(),
          lastDraftSavedBy: currentUser.email,
        };
        setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
        showToast('Borrador guardado localmente');
      }
    } catch {
      showToast('Borrador guardado localmente');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleOpenPublishModal = () => {
    if (!canPublishCms) {
      alert(`Permiso denegado: Tu rol actual (${roleName}) no tiene autorización para publicar en producción (cms:publish requerido).`);
      return;
    }
    const nextVer = (activePage?.currentVersion || 1) + (activePage?.hasUnpublishedChanges ? 1 : 0);
    setPublishVersionTag(`v${nextVer}.0 - ${activePage?.title}`);
    setPublishChangeNote('Actualización de bloques de contenido y ajustes visuales para producción.');
    setShowPublishModal(true);
  };

  const handlePublishPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/cms/pages/${activePage.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          versionTag: publishVersionTag,
          changeNote: publishChangeNote,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        setShowPublishModal(false);
        showToast('🎉 ¡Página publicada en vivo en producción con snapshot generado!');
      } else {
        // Fallback local update
        const updated: CmsPage = {
          ...activePage,
          status: 'PUBLISHED',
          isPublished: true,
          hasUnpublishedChanges: false,
          publishedBlocks: JSON.parse(JSON.stringify(activePage.blocks)),
          currentVersion: (activePage.currentVersion || 1) + 1,
          lastPublishedAt: new Date().toISOString(),
          lastPublishedBy: currentUser.email,
        };
        setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
        setShowPublishModal(false);
        showToast('Página marcada como publicada en vivo');
      }
    } catch (err) {
      console.error('Error publishing page:', err);
      showToast('Error al publicar la página');
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!activePage) return;
    if (!activePage.hasUnpublishedChanges) {
      showToast('No hay cambios pendientes en el borrador');
      return;
    }

    if (!confirm('¿Estás seguro de descartar todos los cambios del borrador y volver a la última versión publicada? Se perderán las modificaciones no publicadas.')) {
      return;
    }

    setDiscarding(true);
    try {
      const res = await fetch(`/api/cms/pages/${activePage.id}/discard-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        showToast('Borrador descartado. Restaurada versión en vivo.');
      } else {
        if (activePage.publishedBlocks && activePage.publishedBlocks.length > 0) {
          const updated: CmsPage = {
            ...activePage,
            blocks: JSON.parse(JSON.stringify(activePage.publishedBlocks)),
            status: 'PUBLISHED',
            hasUnpublishedChanges: false,
          };
          setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
          showToast('Borrador descartado localmente');
        }
      }
    } catch {
      showToast('Error al descartar borrador');
    } finally {
      setDiscarding(false);
    }
  };

  const handleGenerateAiSeoForPage = async () => {
    if (!activePage) return;
    setGeneratingAiSeo(true);
    try {
      const res = await fetch('/api/ai/seo-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle: activePage.title,
          pageType: activePage.isSystemPage ? 'SYSTEM_PAGE' : 'CUSTOM_LANDING',
          contentSummary: activePage.metaDescription || activePage.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated: CmsPage = {
          ...activePage,
          metaTitle: data.metaTitle || activePage.metaTitle,
          metaDescription: data.metaDescription || activePage.metaDescription,
          hasUnpublishedChanges: true,
        };
        setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
        showToast('¡Metadatos SEO generados con Gemini IA!');
      }
    } catch (err) {
      console.error('Error generating AI SEO:', err);
      showToast('Error al generar con IA');
    } finally {
      setGeneratingAiSeo(false);
    }
  };

  const handleCreateNewPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    let initialBlocks: CmsBlock[] = [];
    const now = new Date().toISOString();

    if (newPageTemplate === 'LANDING') {
      initialBlocks = [
        {
          id: `blk-${Date.now()}-1`,
          type: 'HERO_BANNER',
          displayOrder: 1,
          isEnabled: true,
          badgeText: 'CAMPAÑA LITOGRÁFICA 2026',
          headline: newPageTitle,
          subheadline: 'Impresión litográfica de alta resolución con acabados especiales y despachos directos.',
          ctaText: 'Ver Cotizadores Online',
          ctaLink: '/cotizador-libros',
          bgStyle: 'gradient-teal',
          height: 'large',
          showTrustBadges: true,
        },
        {
          id: `blk-${Date.now()}-2`,
          type: 'VALUE_PROPOSITION',
          displayOrder: 2,
          isEnabled: true,
          title: 'Garantía Litográfica Fusión Gráfica',
          subtitle: 'Directo de nuestra planta a tu negocio',
          columns: 3,
          items: [
            { id: 'v1', icon: 'ShieldCheck', title: 'Calidad 300 DPI CTP', description: 'Planchas térmicas directas a máquina.' },
            { id: 'v2', icon: 'Clock', title: 'Entregas Express', description: 'Cumplimiento estricto para eventos y campañas.' },
            { id: 'v3', icon: 'Truck', title: 'Despachos Nacionales', description: 'Envíos asegurados a todo el territorio nacional.' },
          ],
        },
        {
          id: `blk-${Date.now()}-3`,
          type: 'EMBEDDED_QUOTER_CTA',
          displayOrder: 3,
          isEnabled: true,
          title: 'Calcula tu Presupuesto al Instante',
          quoterType: 'libros',
          buttonText: 'Abrir Cotizador',
          buttonLink: '/cotizador-libros',
          featureBullets: [
            'Cálculo milimétrico por pliegos de papel',
            'Formatos estándar y a la medida',
            'Escalas de descuento por tiraje'
          ],
        }
      ];
    }

    const cleanSlug = (newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^\//, '');

    const newPage: CmsPage = {
      id: `page-${Date.now()}`,
      slug: cleanSlug,
      title: newPageTitle,
      description: 'Página personalizada',
      isSystemPage: false,
      isPublished: false,
      status: 'DRAFT',
      hasUnpublishedChanges: true,
      currentVersion: 1,
      metaTitle: `${newPageTitle} | Fusión Gráfica`,
      metaDescription: `Información de ${newPageTitle} en Fusión Gráfica.`,
      blocks: initialBlocks,
      publishedBlocks: [],
      createdAt: now,
      updatedAt: now,
      lastDraftSavedAt: now,
      lastDraftSavedBy: currentUser.email,
    };

    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageData: newPage, user: currentUser }),
      });
      if (res.ok) {
        const created = await res.json();
        setPages(prev => [...prev, created]);
        setActivePageId(created.id);
      } else {
        setPages(prev => [...prev, newPage]);
        setActivePageId(newPage.id);
      }
    } catch {
      setPages(prev => [...prev, newPage]);
      setActivePageId(newPage.id);
    }

    setShowNewPageModal(false);
    setNewPageTitle('');
    setNewPageSlug('');
    showToast('Nueva página creada en modo Borrador');
  };

  const handleDuplicatePage = async (page: CmsPage) => {
    try {
      const res = await fetch(`/api/cms/pages/${page.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser }),
      });
      if (res.ok) {
        const duplicated = await res.json();
        setPages(prev => [...prev, duplicated]);
        showToast(`Página duplicada como "${duplicated.title}" (Borrador)`);
      }
    } catch {
      showToast('Error al duplicar la página');
    }
  };

  const handleDeletePage = async (page: CmsPage) => {
    if (page.isSystemPage) {
      alert('Las páginas del sistema son requeridas y no pueden ser eliminadas.');
      return;
    }
    if (!canDeleteCms) {
      alert(`Permiso denegado: El rol ${roleName} no tiene permiso para eliminar páginas (cms:delete requerido).`);
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar permanentemente la página "${page.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await fetch(`/api/cms/pages/${page.id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }

    setPages(prev => prev.filter(p => p.id !== page.id));
    if (activePageId === page.id) setActivePageId(null);
    showToast('Página eliminada');
  };

  // Block manipulations
  const moveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;

    blocks.forEach((b, i) => { b.displayOrder = i + 1; });

    const updatedPage: CmsPage = {
      ...activePage,
      blocks,
      hasUnpublishedChanges: true,
      status: 'CHANGES_IN_DRAFT',
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
  };

  const deleteBlock = (blockId: string) => {
    if (!activePage) return;
    if (!confirm('¿Deseas eliminar este bloque del borrador?')) return;
    const blocks = activePage.blocks.filter(b => b.id !== blockId);
    blocks.forEach((b, i) => { b.displayOrder = i + 1; });
    const updatedPage: CmsPage = {
      ...activePage,
      blocks,
      hasUnpublishedChanges: true,
      status: 'CHANGES_IN_DRAFT',
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
    showToast('Bloque eliminado del borrador');
  };

  const duplicateBlock = (block: CmsBlock) => {
    if (!activePage) return;
    const newBlock: CmsBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      displayOrder: activePage.blocks.length + 1,
    };
    const blocks = [...activePage.blocks, newBlock];
    const updatedPage: CmsPage = {
      ...activePage,
      blocks,
      hasUnpublishedChanges: true,
      status: 'CHANGES_IN_DRAFT',
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
    showToast('Bloque duplicado en borrador');
  };

  const toggleBlockStatus = (blockId: string) => {
    if (!activePage) return;
    const blocks = activePage.blocks.map(b => b.id === blockId ? { ...b, isEnabled: b.isEnabled === false } : b);
    const updatedPage: CmsPage = {
      ...activePage,
      blocks,
      hasUnpublishedChanges: true,
      status: 'CHANGES_IN_DRAFT',
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
  };

  const handleAddNewBlock = (type: CmsBlockType) => {
    if (!activePage) return;
    const order = activePage.blocks.length + 1;
    const newId = `blk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    let newBlock: CmsBlock;

    switch (type) {
      case 'HERO_BANNER':
        newBlock = {
          id: newId,
          type: 'HERO_BANNER',
          displayOrder: order,
          isEnabled: true,
          headline: 'Nuevo Titular de Portada',
          subheadline: 'Subtítulo persuasivo con los diferenciales de nuestra planta litográfica.',
          ctaText: 'Explorar Catálogo',
          ctaLink: '/categoria/todas',
          bgStyle: 'white',
          alignment: 'left',
        };
        break;
      case 'CATEGORY_GRID':
        newBlock = {
          id: newId,
          type: 'CATEGORY_GRID',
          displayOrder: order,
          isEnabled: true,
          title: 'Nuestras Líneas de Producción',
          subtitle: 'Explora nuestras categorías litográficas',
          columns: 4,
        };
        break;
      case 'FEATURED_PRODUCTS':
        newBlock = {
          id: newId,
          type: 'FEATURED_PRODUCTS',
          displayOrder: order,
          isEnabled: true,
          title: 'Productos Destacados',
          subtitle: 'Los más solicitados por agencias y empresas',
          categoryFilter: 'all',
          limit: 8,
        };
        break;
      case 'VALUE_PROPOSITION':
        newBlock = {
          id: newId,
          type: 'VALUE_PROPOSITION',
          displayOrder: order,
          isEnabled: true,
          title: 'Ventajas Litográficas Fusión',
          subtitle: 'Por qué confiar tus impresiones a nuestro taller',
          columns: 3,
          items: [
            { id: 'v1', icon: 'ShieldCheck', title: 'Garantía CTP 300 DPI', description: 'Planchas térmicas de máxima definición.' },
            { id: 'v2', icon: 'Zap', title: 'Tiempos Récord', description: 'Despachos prioritarios en 24/48 horas.' },
            { id: 'v3', icon: 'DollarSign', title: 'Tarifas Directas de Fábrica', description: 'Escalas de descuento por tiraje comercial.' },
          ],
        };
        break;
      case 'RICH_TEXT_MEDIA':
        newBlock = {
          id: newId,
          type: 'RICH_TEXT_MEDIA',
          displayOrder: order,
          isEnabled: true,
          title: 'Tecnología e Infraestructura',
          subtitle: 'Capacidad instalada para grandes volúmenes',
          contentHtml: '<p>Contamos con prensas offset de pliego entero y medio pliego, barnizadoras UV y tren de encuadernación automáticos.</p>',
          mediaType: 'image',
          mediaPosition: 'right',
          mediaUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop',
        };
        break;
      case 'FAQ_ACCORDION':
        newBlock = {
          id: newId,
          type: 'FAQ_ACCORDION',
          displayOrder: order,
          isEnabled: true,
          title: 'Preguntas Frecuentes',
          items: [
            { id: 'f1', question: '¿Cómo debo enviar mis archivos para impresión?', answer: 'Recomendamos PDF en CMYK a 300 DPI con 3mm de sangrado perimetral.' },
            { id: 'f2', question: '¿Hacen despachos a nivel nacional?', answer: 'Sí, enviamos a todo Colombia con seguimiento y seguro de carga.' },
          ],
        };
        break;
      case 'TESTIMONIALS':
        newBlock = {
          id: newId,
          type: 'TESTIMONIALS',
          displayOrder: order,
          isEnabled: true,
          title: 'Lo que dicen nuestros clientes B2B',
          items: [
            { id: 't1', author: 'Carlos Mendoza', role: 'Director de Compras', company: 'Grupo Editorial Andino', quote: 'La fidelidad del color y la puntualidad en los catálogos ha sido excepcional.', rating: 5, city: 'Bogotá' },
          ],
        };
        break;
      case 'TECH_SPECS_PREPRESS':
        newBlock = {
          id: newId,
          type: 'TECH_SPECS_PREPRESS',
          displayOrder: order,
          isEnabled: true,
          title: 'Guía Técnica de Pre-Prensa',
          specs: [
            { id: 'p1', title: 'Resolución Óptima', specification: '300 DPI mínimos', importance: 'CRITICO', detail: 'Evita pixelado en la impresión final.' },
          ],
        };
        break;
      case 'PARTNER_SHOWCASE':
        newBlock = {
          id: newId,
          type: 'PARTNER_SHOWCASE',
          displayOrder: order,
          isEnabled: true,
          partnerName: 'Atrio Agencia S.A.S',
          partnerTagline: 'Aliado Estratégico en Transformación Digital',
          description: 'Soluciones complementarias de diseño, branding y marketing 360°.',
          services: [
            { title: 'Branding & Identidad', desc: 'Logos, manuales de marca y empaques.' },
            { title: 'Diseño Editorial', desc: 'Diagramación de revistas, libros y catálogos.' }
          ],
        };
        break;
      case 'EMBEDDED_QUOTER_CTA':
        newBlock = {
          id: newId,
          type: 'EMBEDDED_QUOTER_CTA',
          displayOrder: order,
          isEnabled: true,
          title: 'Cotiza tus Libros & Revistas',
          quoterType: 'libros',
          buttonText: 'Abrir Cotizador Online',
          buttonLink: '/cotizador-libros',
          featureBullets: [
            'Precios en tiempo real según pliegos',
            'Formatos y tipos de papel personalizables',
            'Exportación inmediata a orden o PDF'
          ],
        };
        break;
      case 'CONTACT_MAP_FORM':
        newBlock = {
          id: newId,
          type: 'CONTACT_MAP_FORM',
          displayOrder: order,
          isEnabled: true,
          title: 'Contáctanos',
          address: 'Calle 19 # 20-30, Centro, Manizales',
          phone: '+57 (6) 884-5566',
          whatsappNumber: '+573114589231',
          email: 'ventas@fusiongrafica.com.co',
          scheduleText: 'Lunes a Viernes 8:00 AM - 6:00 PM | Sábados 8:00 AM - 1:00 PM',
          showForm: true,
          showMap: true,
        };
        break;
      default:
        newBlock = {
          id: newId,
          type: 'CUSTOM_HTML',
          displayOrder: order,
          isEnabled: true,
          title: 'Bloque Personalizado',
          rawHtml: '<div class="p-8 text-center bg-teal-50 rounded-2xl"><h3 class="font-black text-teal-900">Bloque HTML</h3></div>',
        };
    }

    const blocks = [...activePage.blocks, newBlock];
    const updatedPage: CmsPage = {
      ...activePage,
      blocks,
      hasUnpublishedChanges: true,
      status: 'CHANGES_IN_DRAFT',
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
    setShowAddBlockModal(false);
    setEditingBlock(newBlock);
  };

  const getBlockTypeLabel = (type: CmsBlockType) => {
    switch (type) {
      case 'HERO_BANNER': return 'Hero Banner / Portada';
      case 'CATEGORY_GRID': return 'Rejilla de Categorías';
      case 'FEATURED_PRODUCTS': return 'Productos Destacados';
      case 'VALUE_PROPOSITION': return 'Ventajas Competitivas';
      case 'RICH_TEXT_MEDIA': return 'Texto Editorial + Foto';
      case 'FAQ_ACCORDION': return 'Preguntas Frecuentes';
      case 'TESTIMONIALS': return 'Reseñas de Clientes';
      case 'TECH_SPECS_PREPRESS': return 'Guía de Pre-Prensa';
      case 'PARTNER_SHOWCASE': return 'Alianza Atrio Agencia';
      case 'EMBEDDED_QUOTER_CTA': return 'Llamado a Cotizador';
      case 'CONTACT_MAP_FORM': return 'Contacto y Mapa';
      case 'CUSTOM_HTML': return 'Código HTML';
      default: return type;
    }
  };

  const getBlockIcon = (type: CmsBlockType) => {
    switch (type) {
      case 'HERO_BANNER': return <Sparkles size={16} className="text-teal-600" />;
      case 'CATEGORY_GRID': return <Layout size={16} className="text-indigo-600" />;
      case 'FEATURED_PRODUCTS': return <Layers size={16} className="text-blue-600" />;
      case 'VALUE_PROPOSITION': return <ShieldCheck size={16} className="text-emerald-600" />;
      case 'RICH_TEXT_MEDIA': return <FileText size={16} className="text-purple-600" />;
      case 'FAQ_ACCORDION': return <HelpCircle size={16} className="text-amber-600" />;
      case 'TESTIMONIALS': return <Quote size={16} className="text-rose-600" />;
      case 'TECH_SPECS_PREPRESS': return <BookOpen size={16} className="text-sky-600" />;
      case 'PARTNER_SHOWCASE': return <Zap size={16} className="text-orange-600" />;
      case 'EMBEDDED_QUOTER_CTA': return <Calculator size={16} className="text-teal-600" />;
      case 'CONTACT_MAP_FORM': return <Phone size={16} className="text-teal-600" />;
      default: return <FileText size={16} className="text-slate-600" />;
    }
  };

  const getPageStatusBadge = (page: CmsPage) => {
    const isLive = page.status === 'PUBLISHED' || (!page.status && page.isPublished);
    const hasChanges = page.hasUnpublishedChanges || page.status === 'CHANGES_IN_DRAFT';

    if (hasChanges) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Borrador con Cambios</span>
        </span>
      );
    }
    if (isLive) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Publicada en Vivo</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        Borrador Inactivo
      </span>
    );
  };

  const filteredPages = pages.filter(p => {
    const matchSearch = searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (filterTab === 'PUBLISHED') return p.isPublished && !p.hasUnpublishedChanges;
    if (filterTab === 'CHANGES') return p.hasUnpublishedChanges;
    if (filterTab === 'DRAFT') return !p.isPublished;
    if (filterTab === 'SYSTEM') return p.isSystemPage;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle size={16} className="text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* RBAC Governance Status Banner */}
      <aside aria-label="Permisos de gobierno" className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white">Gobierno & Flujo de Publicación (Fase 4):</span>
              <span className="bg-teal-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase">
                {roleName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {canPublishCms
                ? '✅ Autorizado para diseñar, editar borradores y PUBLICAR directamente a producción.'
                : '🎨 Modo Edición de Borradores activo. La publicación final requiere aprobación de Administrador.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            Snapshots Automáticos: <strong>Activos</strong>
          </span>
          <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            Rollback: <strong>{canManageVersions ? 'Habilitado' : 'Solo Lectura'}</strong>
          </span>
        </div>
      </aside>

      {/* Main View Switcher */}
      {!activePage ? (
        // PAGES LIST VIEW
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">
                  Fase 4 CMS
                </span>
                <span className="text-xs font-bold text-slate-400">· Control de Publicación & Snapshots</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Páginas del Sitio Web & Landings
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Edita en modo Borrador con previsualización en vivo, auditoría de versiones y control de publicación seguro.
              </p>
            </div>

            {canEditCmsDraft && (
              <button
                onClick={() => setShowNewPageModal(true)}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-teal-500/20 shrink-0"
              >
                <Plus size={16} />
                <span>+ Nueva Página / Landing</span>
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  filterTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todas ({pages.length})
              </button>
              <button
                onClick={() => setFilterTab('CHANGES')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  filterTab === 'CHANGES' ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Con Cambios ({pages.filter(p => p.hasUnpublishedChanges).length})
              </button>
              <button
                onClick={() => setFilterTab('PUBLISHED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  filterTab === 'PUBLISHED' ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Publicadas en Vivo ({pages.filter(p => p.isPublished && !p.hasUnpublishedChanges).length})
              </button>
              <button
                onClick={() => setFilterTab('SYSTEM')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  filterTab === 'SYSTEM' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Sistema ({pages.filter(p => p.isSystemPage).length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título o ruta..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map(page => {
              const liveUrl = page.slug === 'home' ? '/' : `/${page.slug}`;

              return (
                <div
                  key={page.id}
                  className="bg-white rounded-3xl p-6 border border-slate-100 hover:border-teal-200 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        page.isSystemPage ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {page.isSystemPage ? 'Página de Sistema' : 'Landing Personalizada'}
                      </span>

                      {getPageStatusBadge(page)}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-1">
                      {page.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50/70 px-2.5 py-1 rounded-lg">
                        {page.slug === 'home' ? '/' : `/${page.slug}`}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        v{page.currentVersion || 1}.0
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {page.description || 'Página con estructura modular de bloques litográficos.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-t border-slate-100 pt-3 mb-4">
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        {page.blocks?.length || 0} bloques
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock size={12} />
                        {page.lastPublishedAt ? `Pub: ${new Date(page.lastPublishedAt).toLocaleDateString()}` : 'Sin publicar'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActivePageId(page.id)}
                        className="w-full py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit size={14} />
                        <span>Abrir Editor</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <a
                          href={`${liveUrl}?preview=draft`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200 transition-colors"
                          title="Previsualizar borrador"
                        >
                          <Eye size={13} />
                          <span>Previa</span>
                        </a>

                        <button
                          onClick={() => handleDuplicatePage(page)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors"
                          title="Duplicar Página"
                        >
                          <Copy size={14} />
                        </button>

                        {!page.isSystemPage && canDeleteCms && (
                          <button
                            onClick={() => handleDeletePage(page)}
                            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl border border-rose-100 transition-colors"
                            title="Eliminar Página"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ACTIVE PAGE WORKFLOW & BLOCK EDITOR
        <div className="space-y-6">
          {/* Top Governance Control Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActivePageId(null)}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  {getPageStatusBadge(activePage)}
                  <span className="text-xs font-mono font-bold text-slate-400">
                    /{activePage.slug}
                  </span>
                  <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Versión {activePage.currentVersion || 1}.0
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {activePage.title}
                </h2>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Live Preview Simulator */}
              <button
                type="button"
                onClick={() => setShowLivePreviewModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Eye size={14} className="text-teal-600" />
                <span>Simulador en Vivo</span>
              </button>

              {/* Version History & Snapshots */}
              <button
                type="button"
                onClick={() => setShowVersionHistoryModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <History size={14} className="text-purple-600" />
                <span>Historial & Rollback</span>
              </button>

              {/* Page Settings & SEO */}
              <button
                type="button"
                onClick={() => setShowPageSettingsModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Settings size={14} className="text-slate-600" />
                <span>SEO</span>
              </button>

              {/* Discard Draft Changes */}
              {activePage.hasUnpublishedChanges && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  disabled={discarding}
                  className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-amber-200 transition-colors"
                  title="Descartar cambios del borrador"
                >
                  <RotateCcw size={14} />
                  <span>Descartar Borrador</span>
                </button>
              )}

              {/* Save Draft */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || !canEditCmsDraft}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Guardar Borrador</span>
              </button>

              {/* Publish to Production */}
              <button
                type="button"
                onClick={handleOpenPublishModal}
                disabled={!canPublishCms}
                className={`px-5 py-2.5 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md ${
                  canPublishCms
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white cursor-pointer shadow-teal-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={canPublishCms ? 'Publicar cambios a producción' : 'Requiere rol con permiso de publicación'}
              >
                <Rocket size={14} />
                <span>Publicar en Vivo</span>
              </button>
            </div>
          </div>

          {/* Blocks List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Estructura de Bloques en Borrador ({activePage.blocks?.length || 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Los cambios realizados aquí se mantienen en modo borrador hasta que hagas clic en "Publicar en Vivo".
                </p>
              </div>

              {canEditCmsDraft && (
                <button
                  onClick={() => setShowAddBlockModal(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus size={15} />
                  <span>+ Añadir Bloque</span>
                </button>
              )}
            </div>

            {/* Block Stack Cards */}
            <div className="space-y-3">
              {activePage.blocks?.map((block, index) => (
                <div
                  key={block.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    block.isEnabled === false
                      ? 'border-slate-200 bg-slate-50/70 opacity-60'
                      : 'border-slate-200 hover:border-teal-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveBlock(index, 'UP')}
                        disabled={index === 0 || !canEditCmsDraft}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                        title="Subir Bloque"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => moveBlock(index, 'DOWN')}
                        disabled={index === activePage.blocks.length - 1 || !canEditCmsDraft}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                        title="Bajar Bloque"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Block Icon & Type info */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      {getBlockIcon(block.type)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {getBlockTypeLabel(block.type)}
                        </h4>
                        {block.badgeText && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                            {block.badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                        {block.headline || block.title || block.partnerName || 'Sin titular'}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Toggles */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => toggleBlockStatus(block.id)}
                      disabled={!canEditCmsDraft}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        block.isEnabled !== false
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {block.isEnabled !== false ? 'Activo' : 'Oculto'}
                    </button>

                    <button
                      onClick={() => setEditingBlock(block)}
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Edit size={13} />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => duplicateBlock(block)}
                      disabled={!canEditCmsDraft}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors"
                      title="Duplicar Bloque"
                    >
                      <Copy size={14} />
                    </button>

                    {canEditCmsDraft && (
                      <button
                        onClick={() => deleteBlock(block.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-colors"
                        title="Eliminar Bloque"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(!activePage.blocks || activePage.blocks.length === 0) && (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                  <Layers size={36} className="text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-black text-slate-800">Esta página no tiene bloques en borrador</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Comienza añadiendo un Hero Banner, rejilla de categorías o catálogo de productos litográficos.
                  </p>
                  <button
                    onClick={() => setShowAddBlockModal(true)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                  >
                    + Añadir Primer Bloque
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Live Device Preview Simulator */}
      {showLivePreviewModal && activePage && (
        <CmsLivePreviewModal
          page={activePage}
          canPublish={canPublishCms}
          onClose={() => setShowLivePreviewModal(false)}
          onPublish={handleOpenPublishModal}
        />
      )}

      {/* MODAL: Version History & Snapshots Rollback */}
      {showVersionHistoryModal && activePage && (
        <CmsVersionHistoryModal
          page={activePage}
          currentUser={currentUser}
          canManageVersions={canManageVersions}
          canPublish={canPublishCms}
          onClose={() => setShowVersionHistoryModal(false)}
          onVersionRestored={(restored) => {
            setPages(prev => prev.map(p => p.id === restored.id ? restored : p));
          }}
        />
      )}

      {/* MODAL: Publish to Production Dialog */}
      {showPublishModal && activePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <Rocket size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Publicar a Producción</h3>
                  <p className="text-xs text-slate-500">{activePage.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishPage} className="space-y-4 text-xs">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-emerald-950">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={15} className="text-emerald-700" />
                  <span>Despliegue Inmediato a Clientes</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Esta acción actualizará la versión pública de la página en la tienda online y guardará una copia de seguridad en el historial de revisiones.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Etiqueta de la Versión / Hito *
                </label>
                <input
                  type="text"
                  required
                  value={publishVersionTag}
                  onChange={(e) => setPublishVersionTag(e.target.value)}
                  placeholder="ej: v2.0 - Campaña de Verano"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Registro de Cambios (Changelog Audit) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={publishChangeNote}
                  onChange={(e) => setPublishChangeNote(e.target.value)}
                  placeholder="Describe brevemente las modificaciones realizadas en los bloques o textos..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600 text-[11px]">
                <span>Autor del Despliegue:</span>
                <span className="font-bold text-slate-900">{currentUser.name} ({currentUser.email})</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                  <span>Confirmar & Desplegar en Vivo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Block Selector */}
      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Seleccionar Tipo de Bloque</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Elige un componente para insertar en el borrador de la página.
                </p>
              </div>
              <button
                onClick={() => setShowAddBlockModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { type: 'HERO_BANNER' as CmsBlockType, title: 'Hero Banner / Portada', desc: 'Gran titular de impacto, fondo con imagen/color y botones CTA.' },
                { type: 'CATEGORY_GRID' as CmsBlockType, title: 'Rejilla de Categorías', desc: 'Tarjetas con iconos y enlaces directos a las líneas de catálogo.' },
                { type: 'FEATURED_PRODUCTS' as CmsBlockType, title: 'Productos Destacados', desc: 'Listado dinámico de productos conectados con el cotizador.' },
                { type: 'VALUE_PROPOSITION' as CmsBlockType, title: 'Ventajas Litográficas', desc: 'Tarjetas de beneficios (300 DPI, CTP, despachos nacionales).' },
                { type: 'RICH_TEXT_MEDIA' as CmsBlockType, title: 'Texto Editorial + Foto', desc: 'Disposición a 2 columnas con texto, viñetas y fotografía de planta.' },
                { type: 'FAQ_ACCORDION' as CmsBlockType, title: 'Preguntas Frecuentes', desc: 'Acordeón desplegable interactivo con buscador instantáneo.' },
                { type: 'TESTIMONIALS' as CmsBlockType, title: 'Reseñas de Clientes', desc: 'Calificaciones con 5 estrellas, citas y empresas que confían.' },
                { type: 'TECH_SPECS_PREPRESS' as CmsBlockType, title: 'Guía Técnica Pre-Prensa', desc: 'Parámetros críticos de color CMYK, sangrado y fuentes.' },
                { type: 'PARTNER_SHOWCASE' as CmsBlockType, title: 'Alianza Atrio Agencia', desc: 'Módulo de soluciones de marketing digital 360 y branding.' },
                { type: 'EMBEDDED_QUOTER_CTA' as CmsBlockType, title: 'Llamado a Cotizador', desc: 'Acceso directo con cálculo milimétrico para libros o empaques.' },
                { type: 'CONTACT_MAP_FORM' as CmsBlockType, title: 'Contacto & WhatsApp', desc: 'Sede física, horarios, PBX y formulario comercial directo.' },
                { type: 'CUSTOM_HTML' as CmsBlockType, title: 'Código HTML / Embebido', desc: 'Para insertar widgets externos, iframes o scripts específicos.' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleAddNewBlock(item.type)}
                  className="text-left p-4 rounded-2xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/40 transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getBlockIcon(item.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-700">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Block Content Editor */}
      {editingBlock && (
        <CmsBlockEditorModal
          block={editingBlock}
          onSave={(updatedBlock) => {
            if (!activePage) return;
            const blocks = activePage.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b);
            const updatedPage: CmsPage = {
              ...activePage,
              blocks,
              hasUnpublishedChanges: true,
              status: 'CHANGES_IN_DRAFT',
            };
            setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
            setEditingBlock(null);
            showToast('Bloque actualizado en borrador');
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}

      {/* MODAL: Create New Page */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-black text-slate-900">Crear Nueva Página / Landing</h3>
              <button
                onClick={() => setShowNewPageModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewPage} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Página *</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder="Ej: Campaña Papelería Corporativa"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ruta / URL Slug *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-mono text-slate-500">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    placeholder="papeleria-corporativa"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-r-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Plantilla Inicial</label>
                <select
                  value={newPageTemplate}
                  onChange={(e) => setNewPageTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="BLANK">Página en Blanco</option>
                  <option value="LANDING">Landing Comercial (Hero + Beneficios + Cotizador)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPageModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                >
                  Crear Página en Borrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Page Settings (SEO & Meta) */}
      {showPageSettingsModal && activePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Ajustes de Página & SEO</h3>
                <p className="text-xs text-slate-500 font-medium">{activePage.title}</p>
              </div>
              <button
                onClick={() => setShowPageSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Asistente Gemini SEO
                  </h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Genera automáticamente meta títulos y descripciones optimizadas para Google.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiSeoForPage}
                  disabled={generatingAiSeo}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                >
                  {generatingAiSeo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{generatingAiSeo ? 'Generando...' : 'Optimizar con IA'}</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Título de la Página</label>
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => {
                    const updated: CmsPage = {
                      ...activePage,
                      title: e.target.value,
                      hasUnpublishedChanges: true,
                    };
                    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slug / URL</label>
                <input
                  type="text"
                  disabled={activePage.isSystemPage}
                  value={activePage.slug}
                  onChange={(e) => {
                    const updated: CmsPage = {
                      ...activePage,
                      slug: e.target.value,
                      hasUnpublishedChanges: true,
                    };
                    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Meta Título (Google Title Tag)</label>
                <input
                  type="text"
                  value={activePage.metaTitle || ''}
                  onChange={(e) => {
                    const updated: CmsPage = {
                      ...activePage,
                      metaTitle: e.target.value,
                      hasUnpublishedChanges: true,
                    };
                    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
                  }}
                  placeholder="Título para buscadores de Google"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Meta Descripción (Snippet Google)</label>
                <textarea
                  rows={3}
                  value={activePage.metaDescription || ''}
                  onChange={(e) => {
                    const updated: CmsPage = {
                      ...activePage,
                      metaDescription: e.target.value,
                      hasUnpublishedChanges: true,
                    };
                    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
                  }}
                  placeholder="Descripción resumida para los resultados de búsqueda..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* SERP Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Vista Previa SERP Google
                </span>
                <p className="text-xs font-bold text-blue-800 line-clamp-1">
                  {activePage.metaTitle || activePage.title}
                </p>
                <p className="text-[11px] font-mono text-slate-400">
                  https://fusiongrafica.com.co/{activePage.slug}
                </p>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {activePage.metaDescription || 'No se ha configurado descripción para este snippet.'}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPageSettingsModal(false)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
