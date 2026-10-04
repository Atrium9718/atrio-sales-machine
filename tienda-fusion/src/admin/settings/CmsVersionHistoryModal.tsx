import React, { useState, useEffect } from 'react';
import { CmsPage, CmsPageVersionSnapshot, CmsBlock } from '../../types/cms';
import {
  History,
  RotateCcw,
  Plus,
  Clock,
  User,
  Tag,
  CheckCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  X,
  Eye,
  Calendar
} from 'lucide-react';

interface Props {
  page: CmsPage;
  currentUser: { name: string; email: string; role?: string };
  canManageVersions: boolean;
  canPublish: boolean;
  onClose: () => void;
  onVersionRestored: (updatedPage: CmsPage) => void;
}

export default function CmsVersionHistoryModal({
  page,
  currentUser,
  canManageVersions,
  canPublish,
  onClose,
  onVersionRestored,
}: Props) {
  const [versions, setVersions] = useState<CmsPageVersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CmsPageVersionSnapshot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [autoPublishRollback, setAutoPublishRollback] = useState(false);

  // Manual snapshot form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchVersions();
  }, [page.id]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/pages/${page.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        if (data.length > 0) {
          setSelectedSnapshot(data[0]);
        }
      }
    } catch (e) {
      console.warn('Error fetching versions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManualSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !newNote.trim()) return;

    setCreatingSnapshot(true);
    try {
      const res = await fetch(`/api/cms/pages/${page.id}/versions/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionTag: newTag,
          changeNote: newNote,
          user: currentUser,
        }),
      });

      if (res.ok) {
        const snap = await res.json();
        setVersions(prev => [snap, ...prev]);
        setSelectedSnapshot(snap);
        setShowCreateForm(false);
        setNewTag('');
        setNewNote('');
        showFeedback('¡Snapshot manual creado exitosamente!');
      }
    } catch (err) {
      console.error('Error creating snapshot:', err);
      showFeedback('Error al crear snapshot');
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!canManageVersions) {
      alert('No tienes permisos para restaurar versiones (cms:manage_versions requerido).');
      return;
    }

    const confirmMsg = autoPublishRollback
      ? `¿Estás seguro de restaurar esta versión y PUBLICARLA INMEDIATAMENTE en producción?`
      : `¿Estás seguro de restaurar esta versión como BORRADOR de trabajo para continuar editando?`;

    if (!window.confirm(confirmMsg)) return;

    setRestoring(true);
    try {
      const res = await fetch(`/api/cms/pages/${page.id}/versions/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          autoPublish: autoPublishRollback && canPublish,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback('¡Versión restaurada con éxito!');
        onVersionRestored(data.page);
        setTimeout(() => onClose(), 600);
      } else {
        alert('Error al restaurar la versión.');
      }
    } catch (err) {
      console.error('Error restoring version:', err);
      alert('Ocurrió un error en el proceso de restauración.');
    } finally {
      setRestoring(false);
    }
  };

  // Compute difference summary between selected snapshot and current page
  const currentBlockIds = new Set((page.blocks || []).map(b => b.id));
  const snapBlockIds = new Set((selectedSnapshot?.blocks || []).map(b => b.id));
  
  const blocksInSnapNotCurrent = (selectedSnapshot?.blocks || []).filter(b => !currentBlockIds.has(b.id));
  const blocksInCurrentNotSnap = (page.blocks || []).filter(b => !snapBlockIds.has(b.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Historial de Versiones & Snapshots
                </h2>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
                  {page.title} ({page.slug})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoría de revisiones, puntos de restauración y rollback seguro con trazabilidad total.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageVersions && (
              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Nuevo Snapshot Manual</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {toast && (
          <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 text-xs text-teal-800 font-bold flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle size={14} className="text-teal-600" />
            <span>{toast}</span>
          </div>
        )}

        {/* Create Snapshot Drawer Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateManualSnapshot} className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Etiqueta / Hito de Versión
              </label>
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="ej: v2.1 - Campaña Día del Padre"
                required
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Nota de Cambio / Motivo del Guardado
              </label>
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="ej: Rediseño de bloques promocionales y nuevos precios litográficos"
                required
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={creatingSnapshot}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                {creatingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <SaveIcon />}
                <span>Guardar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Timeline List */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Línea de Tiempo ({versions.length} revisiones)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Más reciente primero</span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 size={24} className="text-teal-600 animate-spin mb-2" />
                <p className="text-xs">Cargando snapshots...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 p-4">
                <History size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-700">No hay versiones registradas aún</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Se crearán automáticamente al publicar.</p>
              </div>
            ) : (
              versions.map((snap, idx) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                const isPublished = snap.status === 'PUBLISHED';
                const isManual = snap.status === 'MANUAL_SNAPSHOT';

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500/30'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isManual
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPublished ? 'Publicado' : isManual ? 'Manual' : 'Borrador'}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {snap.versionTag || `Versión #${snap.versionNumber}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-2 font-medium">
                      {snap.changeNote || 'Sin notas de cambio registradas.'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-slate-500 truncate max-w-[170px]">
                        <User size={10} />
                        <span className="truncate">{snap.authorName || snap.authorEmail}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-slate-600">
                        <Layers size={10} />
                        <span>{snap.blocksCount || snap.blocks?.length || 0} bloques</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Snapshot Inspector & Diff */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col bg-white">
            {selectedSnapshot ? (
              <div className="space-y-5">
                {/* Selected Version Overview */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-slate-900">
                          {selectedSnapshot.versionTag || `Versión #${selectedSnapshot.versionNumber}`}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedSnapshot.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedSnapshot.status === 'MANUAL_SNAPSHOT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {selectedSnapshot.status === 'PUBLISHED' ? 'Versión de Producción' : 'Copia de Seguridad'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        {selectedSnapshot.changeNote}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <p className="font-bold text-slate-700 flex items-center justify-end gap-1">
                        <Calendar size={11} />
                        {new Date(selectedSnapshot.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(selectedSnapshot.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Bloques</span>
                      <span className="text-sm font-black text-slate-800">{selectedSnapshot.blocks?.length || 0}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Autor</span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {selectedSnapshot.authorName?.split(' ')[0] || 'Admin'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Meta SEO</span>
                      <span className="text-xs font-bold text-teal-700 truncate block">
                        {selectedSnapshot.metaTitle ? 'Configurado' : 'Estándar'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blocks Breakdown in this snapshot */}
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-teal-600" />
                    <span>Estructura de Bloques en este Snapshot</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(selectedSnapshot.blocks || []).map((b, i) => (
                      <div
                        key={b.id || i}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 font-mono text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-bold text-slate-700 capitalize">
                            {b.type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {b.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rollback Action Panel */}
                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-teal-700" />
                      <span className="text-xs font-black text-teal-950 uppercase tracking-wider">
                        Restauración Segura (Rollback)
                      </span>
                    </div>
                    <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded font-bold">
                      Copia previa garantizada
                    </span>
                  </div>

                  <p className="text-xs text-teal-900 mb-3">
                    Al restaurar esta versión, el sistema creará automáticamente un snapshot de respaldo del estado actual para garantizar que nunca se pierda trabajo.
                  </p>

                  <div className="flex items-center gap-2 mb-3 bg-white p-2.5 rounded-lg border border-teal-200">
                    <input
                      type="checkbox"
                      id="autoPublishCheck"
                      checked={autoPublishRollback}
                      disabled={!canPublish}
                      onChange={e => setAutoPublishRollback(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <label htmlFor="autoPublishCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Publicar inmediatamente a Producción (Reemplazar versión en vivo)
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={restoring || !canManageVersions}
                    onClick={() => handleRestoreSnapshot(selectedSnapshot.id)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {restoring ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Restaurando versión...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} />
                        <span>
                          {autoPublishRollback
                            ? `Restaurar y Desplegar en Vivo (${selectedSnapshot.versionTag || `v${selectedSnapshot.versionNumber}`})`
                            : `Restaurar como Borrador de Trabajo`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText size={32} className="mb-2 opacity-40" />
                <p className="text-xs font-bold text-slate-600">Selecciona un snapshot de la línea de tiempo</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-teal-600" />
            <span>Permiso de gobierno: <strong>{canManageVersions ? 'Autorizado (Rollback activo)' : 'Solo Lectura'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );
}
