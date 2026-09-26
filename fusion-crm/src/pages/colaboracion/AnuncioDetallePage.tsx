/**
 * Detalle, Lectura y Confirmación de Anuncio (Etapa 15.4 — Bloque B)
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Pin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Share2,
  MessageSquare,
  Send,
  BarChart3,
  Trash2,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import { useFusionAuth } from '../../context/FusionAuthContext';

export const AnuncioDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useFusionAuth();

  const [announcement, setAnnouncement] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Comentarios y Reacciones
  const [commentText, setCommentText] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [acknowledging, setAcknowledging] = useState<boolean>(false);
  const [acknowledgeSuccess, setAcknowledgeSuccess] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/announcements/${id}`, {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se encontró el comunicado');
      }
      setAnnouncement(data.announcement);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  // Confirmar lectura formal (Acuse)
  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      setDismissError(null);
      const res = await fetch(`/api/announcements/${id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al confirmar lectura');
      }

      setAcknowledgeSuccess(`Confirmación registrada formalmente a las ${new Date().toLocaleTimeString()} (IP: ${data.ip})`);
      fetchAnnouncement();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  // Reaccionar con emoji
  const handleToggleReaction = async (emoji: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAnnouncement();
      }
    } catch {
      // ignore
    }
  };

  // Agregar comentario
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/announcements/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentText('');
        fetchAnnouncement();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Descartar anuncio
  const handleDismiss = async () => {
    setDismissError(null);
    try {
      const res = await fetch(`/api/announcements/${id}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se puede descartar');
      }
      navigate('/anuncios');
    } catch (err: any) {
      setDismissError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground">Cargando comunicado...</p>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Error al cargar el comunicado</h2>
        <p className="text-xs text-muted-foreground">{error || 'El anuncio no existe o no tienes permisos de acceso.'}</p>
        <Link
          to="/anuncios"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero
        </Link>
      </div>
    );
  }

  const myReceipt = announcement.myReceipt;
  const isAcknowledged = !!myReceipt?.acknowledgedAt;
  const reactionsList = announcement.reactions || [];
  const emojisAvailable = ['👍', '🎉', '❤️', '👏', '🎯', '🔥'];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Navegación y Acciones Superiores */}
      <div className="flex items-center justify-between">
        <Link
          to="/anuncios"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero
        </Link>

        <div className="flex items-center gap-2">
          {/* Si es autor o supervisor: Botón a seguimiento de lecturas */}
          <Link
            to={`/anuncios/${announcement.id}/lecturas`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Panel de Lecturas
          </Link>

          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
            title="Descartar de mi bandeja principal"
          >
            Descartar
          </button>
        </div>
      </div>

      {dismissError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dismissError}</span>
        </div>
      )}

      {/* Banner de Confirmación Obligatoria (Acuse de Lectura) */}
      {announcement.requiresAcknowledgement && (
        <div
          className={`rounded-xl p-4 border transition-all ${
            isAcknowledged
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              {isAcknowledged ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {isAcknowledged
                    ? 'Confirmación de Lectura Registrada'
                    : 'Confirmación de Lectura Obligatoria'}
                </h4>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                  {isAcknowledged
                    ? `Acuse formal asentado el ${new Date(myReceipt.acknowledgedAt).toLocaleString('es-CO')} desde IP ${myReceipt.acknowledgedIp || '192.168.1.1'}.`
                    : 'Por disposición directiva, debes confirmar formalmente la lectura y comprensión de este comunicado antes de descartarlo.'}
                </p>
                {acknowledgeSuccess && (
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                    ✓ {acknowledgeSuccess}
                  </p>
                )}
              </div>
            </div>

            {!isAcknowledged && (
              <button
                type="button"
                disabled={acknowledging}
                onClick={handleAcknowledge}
                className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {acknowledging ? 'Registrando acuse...' : 'Entendido / Confirmar Lectura'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tarjeta Principal del Anuncio */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm space-y-6">
        {/* Metadatos y Encabezado */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            {announcement.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Pin className="w-3.5 h-3.5" />
                Fijado
              </span>
            )}
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                announcement.priority === 'URGENT'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : announcement.priority === 'IMPORTANT'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {announcement.priority === 'URGENT'
                ? 'Urgente'
                : announcement.priority === 'IMPORTANT'
                ? 'Importante'
                : 'General'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
              {announcement.type}
            </span>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-snug">
            {announcement.title}
          </h1>

          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {announcement.authorName.charAt(0)}
              </div>
              <span>{announcement.authorName}</span>
            </div>
            <span>·</span>
            <span>{announcement.authorRole}</span>
            <span>·</span>
            <span>{announcement.viewCount} lecturas registradas</span>
          </div>
        </div>

        {/* Cuerpo del Anuncio (Markdown Formateado) */}
        <div className="prose prose-base dark:prose-invert max-w-none text-foreground/90 space-y-4 leading-relaxed">
          {announcement.body.split('\n\n').map((paragraph: string, idx: number) => {
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl font-bold text-foreground mt-6 mb-2">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('> ')) {
              return (
                <blockquote
                  key={idx}
                  className="border-l-4 border-primary pl-4 py-2.5 italic bg-primary/5 rounded-r-lg text-foreground font-medium my-4"
                >
                  {paragraph.replace('> ', '')}
                </blockquote>
              );
            }
            if (paragraph.match(/^\d+\.\s/)) {
              const lines = paragraph.split('\n');
              return (
                <ol key={idx} className="list-decimal list-inside space-y-1 my-2">
                  {lines.map((li, lIdx) => (
                    <li key={lIdx} className="text-foreground/90">
                      {li.replace(/^\d+\.\s/, '')}
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <p key={idx} className="text-sm leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Documentos Adjuntos */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="pt-6 border-t border-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Documentos Adjuntos ({announcement.attachments.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {announcement.attachments.map((att: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(att.size / 1024).toFixed(0)} KB · {att.mimeType || 'Documento'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Descargando archivo adjunto: ${att.name}`)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    title="Descargar archivo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Reacciones con Emojis */}
        {announcement.allowsReactions && (
          <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Reaccionar:</span>
              {emojisAvailable.map((emoji) => {
                const count = reactionsList.filter((r: any) => r.emoji === emoji).length;
                const reactedByMe = reactionsList.some(
                  (r: any) => r.emoji === emoji && r.userId === (currentUser?.id || 'emp-03')
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(emoji)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                      reactedByMe
                        ? 'bg-primary/15 border-primary text-primary scale-105'
                        : count > 0
                        ? 'bg-muted border-border text-foreground hover:bg-muted/80'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[11px]">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{reactionsList.length} reacciones en total</span>
            </div>
          </div>
        )}
      </div>

      {/* Hilo de Comentarios */}
      {announcement.allowsComments && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Comentarios y Preguntas ({announcement.comments?.length || 0})
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Respuestas visibles para la audiencia del comunicado
            </span>
          </div>

          {/* Formulario de Nuevo Comentario */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario o consulta sobre este anuncio..."
              className="flex-1 px-3.5 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Enviar
            </button>
          </form>

          {/* Lista de Comentarios */}
          <div className="space-y-3 pt-2">
            {(announcement.comments || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 italic">
                Aún no hay comentarios. Sé el primero en participar.
              </p>
            ) : (
              announcement.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="p-3.5 rounded-lg bg-muted/30 border border-border/70 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{comment.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString('es-CO', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{comment.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
