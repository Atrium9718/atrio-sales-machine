/**
 * Tablero Principal de Anuncios y Muro de Reconocimientos (Etapa 15.4 — Bloque B)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Pin,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  HeartHandshake,
  Award,
  ArrowRight,
  ShieldCheck,
  Send,
  X,
  Users,
} from 'lucide-react';
import { useFusionAuth } from '../../context/FusionAuthContext';
import { SHOUTOUT_VALUES, ShoutoutValueKey } from '../../../packages/core/src/announcements/types';

export const AnunciosPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, employees } = useFusionAuth();

  const tabParam = searchParams.get('tab') || 'todos';
  const [activeTab, setActiveTab] = useState<'todos' | 'pendientes' | 'reconocimientos'>(
    tabParam === 'reconocimientos' ? 'reconocimientos' : tabParam === 'pendientes' ? 'pendientes' : 'todos'
  );

  // Estados de datos
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modal de Reconocimiento
  const [isShoutoutModalOpen, setIsShoutoutModalOpen] = useState<boolean>(false);
  const [shoutoutToUserId, setShoutoutToUserId] = useState<string>('');
  const [shoutoutValue, setShoutoutValue] = useState<ShoutoutValueKey>('equipo');
  const [shoutoutMessage, setShoutoutMessage] = useState<string>('');
  const [submittingShoutout, setSubmittingShoutout] = useState<boolean>(false);

  // Cargar Empleados
  // Cargar Anuncios
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements', {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Cargar Reconocimientos
  const loadShoutouts = async () => {
    try {
      const res = await fetch('/api/announcements/shoutouts');
      const data = await res.json();
      if (data.success) {
        setShoutouts(data.shoutouts || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadShoutouts();
    if (employees.length > 0 && !shoutoutToUserId) {
      setShoutoutToUserId(employees[0].id);
    }
  }, [employees, currentUser]);

  const handleTabChange = (tab: 'todos' | 'pendientes' | 'reconocimientos') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Crear Reconocimiento
  const handleCreateShoutout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shoutoutMessage.trim()) return;

    try {
      setSubmittingShoutout(true);
      const res = await fetch('/api/announcements/shoutouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
        body: JSON.stringify({
          toUserIds: [shoutoutToUserId],
          valueKey: shoutoutValue,
          message: shoutoutMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsShoutoutModalOpen(false);
        setShoutoutMessage('');
        loadShoutouts();
      }
    } catch {
      // ignore
    } finally {
      setSubmittingShoutout(false);
    }
  };

  // Filtrar Anuncios
  const unconfirmedCount = announcements.filter(
    (a) => a.requiresAcknowledgement && (!a.myReceipt || !a.myReceipt.acknowledgedAt)
  ).length;

  const filteredAnnouncements = announcements.filter((a) => {
    if (activeTab === 'pendientes') {
      if (!a.requiresAcknowledgement || (a.myReceipt && a.myReceipt.acknowledgedAt)) return false;
    }
    if (selectedPriority !== 'ALL' && a.priority !== selectedPriority) return false;
    if (selectedType !== 'ALL' && a.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tablero de Dirección y Comunicados
            </h1>
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Directivas organizacionales, políticas, avisos operativos y muro de reconocimientos entre colaboradores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsShoutoutModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Reconocer Colega
          </button>

          <Link
            to="/anuncios/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Redactar Anuncio
          </Link>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center justify-between border-b border-border pb-px">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTabChange('todos')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'todos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Todos los Comunicados
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground font-mono">
              {announcements.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('pendientes')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pendientes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Mis Pendientes de Acuse
            {unconfirmedCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                {unconfirmedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('reconocimientos')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'reconocimientos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Muro de Reconocimientos
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground font-mono">
              {shoutouts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Contenido según Pestaña */}
      {activeTab === 'reconocimientos' ? (
        /* Muro de Reconocimientos (Shoutouts) */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Cultura de Gratitud y Reconocimiento:</strong> Celebramos el compromiso, calidad e iniciativa del equipo en cada turno.
              </span>
            </div>
            <button
              onClick={() => setIsShoutoutModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
            >
              Publicar Agradecimiento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shoutouts.map((sho) => {
              const meta = sho.valueMeta || SHOUTOUT_VALUES[sho.valueKey as ShoutoutValueKey] || SHOUTOUT_VALUES.equipo;
              return (
                <div
                  key={sho.id}
                  className="bg-card border border-border rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <span>{sho.fromUserName}</span>
                        <span className="text-muted-foreground font-normal text-[11px]">para</span>
                        <span className="text-primary">{sho.toUserNames.join(', ')}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(sho.createdAt).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                      {meta.label}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/90 italic bg-muted/30 p-3 rounded-lg border-l-3 border-primary leading-relaxed">
                    &ldquo;{sho.message}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="text-[10px] capitalize">Valores: {meta.description}</span>
                    <button
                      onClick={() => alert('¡Reacción enviada al compañero!')}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                    >
                      👏 Felicitaciones
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Lista de Anuncios y Directivas */
        <div className="space-y-4">
          {/* Filtros de Búsqueda */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-2xs">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, contenido o autor..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground font-semibold"
              >
                <option value="ALL">Todas las Prioridades</option>
                <option value="URGENT">Urgente</option>
                <option value="IMPORTANT">Importante</option>
                <option value="NORMAL">Normal</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground font-semibold"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="DIRECTIVE">Directiva</option>
                <option value="ANNOUNCEMENT">Comunicado</option>
                <option value="ALERT">Alerta</option>
                <option value="RECOGNITION">Reconocimiento</option>
                <option value="POLICY">Política</option>
              </select>
            </div>
          </div>

          {/* Grilla de Anuncios */}
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Cargando tablero...
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl p-8 space-y-2">
              <Megaphone className="w-8 h-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-bold text-foreground">No se encontraron comunicados</p>
              <p className="text-xs text-muted-foreground">
                Ajusta los filtros de búsqueda o redacta un nuevo anuncio para el equipo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAnnouncements.map((ann) => {
                const isConfirmed = ann.myReceipt?.acknowledgedAt;
                return (
                  <div
                    key={ann.id}
                    onClick={() => navigate(`/anuncios/${ann.id}`)}
                    className="bg-card border border-border rounded-xl p-5 shadow-2xs hover:border-primary/50 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ann.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                              <Pin className="w-3 h-3" />
                              Fijado
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ann.priority === 'URGENT'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : ann.priority === 'IMPORTANT'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {ann.priority === 'URGENT' ? 'Urgente' : ann.priority === 'IMPORTANT' ? 'Importante' : 'Normal'}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            {ann.type}
                          </span>
                        </div>

                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {ann.publishedAt
                            ? new Date(ann.publishedAt).toLocaleDateString('es-CO', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground hover:text-primary transition-colors leading-snug">
                        {ann.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ann.summary}
                      </p>
                    </div>

                    {/* Footer y Estado de Confirmación */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {ann.requiresAcknowledgement && (
                          isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Requiere tu acuse
                            </span>
                          )
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          De: {ann.authorName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        {ann.commentsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ann.commentsCount}
                          </span>
                        )}
                        <span className="text-primary font-semibold flex items-center gap-0.5 hover:underline">
                          Abrir <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Reconocimiento a Colega */}
      {isShoutoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">Reconocer a un Compañero</h3>
              </div>
              <button
                onClick={() => setIsShoutoutModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Expresa tu gratitud públicamente por el esfuerzo, calidad o compañerismo en los proyectos diarios.
            </p>

            <form onSubmit={handleCreateShoutout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Compañero a felicitar
                </label>
                <select
                  value={shoutoutToUserId}
                  onChange={(e) => setShoutoutToUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.jobTitle || emp.roleName})
                    </option>
                  ))}
                  {employees.length === 0 && (
                    <option value="">Cargando colaboradores...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Valor destacado
                </label>
                <select
                  value={shoutoutValue}
                  onChange={(e) => setShoutoutValue(e.target.value as ShoutoutValueKey)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground font-semibold"
                >
                  {Object.entries(SHOUTOUT_VALUES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} — {v.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Mensaje de agradecimiento
                </label>
                <textarea
                  rows={3}
                  value={shoutoutMessage}
                  onChange={(e) => setShoutoutMessage(e.target.value)}
                  placeholder="Ej. Gracias por la disposición y precisión para sacar el pedido urgente de gran formato sin reprocesos..."
                  className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsShoutoutModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingShoutout || !shoutoutMessage.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingShoutout ? 'Publicando...' : 'Publicar Reconocimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
