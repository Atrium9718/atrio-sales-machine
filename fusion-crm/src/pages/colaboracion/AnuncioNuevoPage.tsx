/**
 * Editor y Publicación de Anuncios de Dirección (Etapa 15.4 — Bloque A)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Megaphone,
  ArrowLeft,
  FileText,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  Pin,
  AlertTriangle,
  UploadCloud,
  X,
  Users,
  Building,
  Sparkles,
  Paperclip,
  CheckSquare,
  ShieldCheck,
  Send,
  Save,
} from 'lucide-react';
import { ANNOUNCEMENT_TEMPLATES } from '../../../packages/core/src/announcements/templates';
import { validateAttachment } from '../../../packages/core/src/announcements/mime-validation';
import { initAuth, googleSignIn, getAccessToken } from '../../lib/firebase';
import { getOrCreateFolder, uploadFileToDrive } from '../../lib/drive';
import { useFusionAuth } from '../../context/FusionAuthContext';

interface AudienceOption {
  targetType: 'EVERYONE' | 'ROLE' | 'AREA' | 'USER';
  roleId?: string;
  areaKey?: string;
  userId?: string;
}

export const AnuncioNuevoPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, employees: fusionEmployees } = useFusionAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string>('DIRECTIVE');
  const [priority, setPriority] = useState<string>('IMPORTANT');

  // Audiencia
  const [audienceType, setAudienceType] = useState<'EVERYONE' | 'AREA' | 'ROLE' | 'USER'>('EVERYONE');
  const [selectedArea, setSelectedArea] = useState<string>('planta');
  const [selectedRole, setSelectedRole] = useState<string>('produccion');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Conteo en vivo de audiencia
  const [recipientCount, setRecipientCount] = useState<number>(0);
  const [recipientUsers, setRecipientUsers] = useState<any[]>([]);

  // Publicación y Programación
  const [publishImmediately, setPublishImmediately] = useState<boolean>(true);
  const [publishAt, setPublishAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [pinnedUntil, setPinnedUntil] = useState<string>('');

  // Reglas y Privacidad
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState<boolean>(true);
  const [allowsComments, setAllowsComments] = useState<boolean>(true);
  const [allowsReactions, setAllowsReactions] = useState<boolean>(true);

  // Adjuntos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Editor Mode: 'edit' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  useEffect(() => {
    initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    if (fusionEmployees.length > 0 && !selectedUserId) {
      setSelectedUserId(fusionEmployees[0].id);
    }
  }, [fusionEmployees]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calcular audiencia en tiempo real
  const currentAudiences: AudienceOption[] =
    audienceType === 'EVERYONE'
      ? [{ targetType: 'EVERYONE' }]
      : audienceType === 'AREA'
      ? [{ targetType: 'AREA', areaKey: selectedArea }]
      : audienceType === 'ROLE'
      ? [{ targetType: 'ROLE', roleId: selectedRole }]
      : [{ targetType: 'USER', userId: selectedUserId }];

  useEffect(() => {
    fetch('/api/announcements/audience-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audiences: currentAudiences }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setRecipientCount(res.count);
          setRecipientUsers(res.users || []);
        }
      })
      .catch(() => {
        // Fallback local
        setRecipientCount(audienceType === 'EVERYONE' ? 9 : 3);
      });
  }, [audienceType, selectedArea, selectedRole, selectedUserId]);

  // Aplicar plantilla predefinida
  const handleApplyTemplate = (tplId: string) => {
    const tpl = ANNOUNCEMENT_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setTitle(tpl.defaultTitle);
    setBody(tpl.defaultBody);
    setType(tpl.type);
    setPriority(tpl.priority);
    setRequiresAcknowledgement(tpl.requiresAcknowledgement);
    setSummary(tpl.description);
  };

  // Subida de adjunto con validación MIME
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let token = await getAccessToken();
    if (!token) {
      setAttachmentError('Necesitas conectar tu cuenta de Google Drive primero.');
      return;
    }

    setUploadingFiles(true);
    try {
      setUploadProgressMsg('Preparando carpetas en Drive...');
      // Ensure Folders exist: App Uploads -> Anuncios
      const rootFolderId = await getOrCreateFolder(token, 'App Uploads');
      const anunciosFolderId = await getOrCreateFolder(token, 'Anuncios', rootFolderId);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateAttachment({
          name: file.name,
          size: file.size,
          mimeType: file.type,
        });

        if (!validation.isValid) {
          setAttachmentError(`El archivo "${file.name}" fue rechazado: ${validation.error}`);
          continue;
        }

        setUploadProgressMsg(`Subiendo ${file.name}...`);
        const driveFile = await uploadFileToDrive(token, file, anunciosFolderId);

        const newAtt = {
          name: file.name,
          size: file.size,
          mimeType: validation.sanitizedMime,
          url: `https://drive.google.com/file/d/${driveFile.id}/view`,
        };
        setAttachments((prev) => [...prev, newAtt]);
      }
    } catch (err: any) {
      console.error(err);
      setAttachmentError('Error al subir archivos a Drive: ' + err.message);
    } finally {
      setUploadingFiles(false);
      setUploadProgressMsg('');
      e.target.value = ''; // Reset input
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Enviar formulario (Publicar o Guardar Borrador)
  const handleSubmit = async (publishNow: boolean) => {
    setErrorMessage(null);
    if (!title.trim() || !body.trim()) {
      setErrorMessage('El título y el contenido del comunicado son obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        body: body.trim(),
        type,
        priority,
        audiences: currentAudiences,
        publishImmediately: publishNow,
        publishAt: !publishNow && publishAt ? new Date(publishAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isPinned,
        pinnedUntil: isPinned && pinnedUntil ? new Date(pinnedUntil).toISOString() : null,
        requiresAcknowledgement,
        allowsComments,
        allowsReactions,
        attachments,
      };

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el anuncio');
      }

      navigate('/anuncios');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al comunicarse con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/anuncios"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Redactar Anuncio de Dirección
            </h1>
          </div>
          <p className="text-xs text-muted-foreground ml-8">
            Emite directivas oficiales, políticas, reconocimientos y avisos urgentes con confirmación de lectura legal.
          </p>
        </div>

        {/* Acciones de Publicación */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Borrador
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(publishImmediately)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {publishImmediately ? 'Publicar Inmediatamente' : 'Programar Publicación'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Selector de Plantillas Rápidas */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Plantillas Corporativas Predefinidas
          </span>
          <span className="text-[11px] text-muted-foreground">
            Haz clic para cargar estructura recomendada
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors text-left"
            >
              {tpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (Editor y Contenido) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            {/* Título */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Título del Comunicado <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Directiva de Seguridad y Uso Obligatorio de EPP en Bahías de Corte"
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Resumen Corto */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Resumen Ejecutivo (se muestra en notificaciones y en la vista previa del Home)
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve extracto de 1 o 2 líneas..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Barra de Modo de Edición Markdown */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground">
                Cuerpo del Anuncio (Soporta Markdown)
              </span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === 'edit' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === 'split' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Dividido
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === 'preview' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Vista Previa
                </button>
              </div>
            </div>

            {/* Contenedor de Editor y/o Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={viewMode === 'edit' ? 'md:col-span-2' : ''}>
                  <textarea
                    rows={14}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Redacta el contenido en Markdown... Puedes usar encabezados (##), listas numeradas, negritas (**texto**), enlaces y citas (>)."
                    className="w-full p-3 rounded-lg bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed"
                  />
                </div>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={`p-4 rounded-lg bg-muted/30 border border-border/80 overflow-y-auto max-h-[360px] text-xs leading-relaxed space-y-2 ${viewMode === 'preview' ? 'md:col-span-2' : ''}`}>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b border-border/50">
                    Vista previa de lectura
                  </div>
                  {body ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      {body.split('\n\n').map((paragraph, i) => {
                        if (paragraph.startsWith('## ')) {
                          return <h3 key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{paragraph.replace('## ', '')}</h3>;
                        }
                        if (paragraph.startsWith('> ')) {
                          return (
                            <blockquote key={i} className="border-l-4 border-primary pl-3 italic bg-primary/5 p-2 rounded text-foreground/90 my-2">
                              {paragraph.replace('> ', '')}
                            </blockquote>
                          );
                        }
                        return <p key={i} className="text-foreground/80 leading-relaxed">{paragraph}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-center py-10">
                      Escribe en el editor para ver cómo lo leerán los colaboradores.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Subida de Adjuntos con MinIO y Validación MIME */}
            <div className="pt-3 border-t border-border space-y-2">
              <label className="block text-xs font-bold text-foreground">
                Documentos Adjuntos (SST, Manuales, Circulares)
              </label>
              <div className="flex items-center gap-3">
                {needsAuth ? (
                  <button type="button" onClick={async () => {
                    try {
                      await googleSignIn();
                      setNeedsAuth(false);
                    } catch (e) {
                      setAttachmentError('Error al autenticar con Google');
                    }
                  }} className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none bg-blue-600 text-white hover:bg-blue-700 h-8 px-3">
                    Conectar Google Drive
                  </button>
                ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-colors">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  <span>Cargar archivo</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.zip"
                  />
                </label>
                )}
                <span className="text-[11px] text-muted-foreground">
                  PDF, DOCX, XLSX, imágenes o ZIP (Máx 25 MB por archivo)
                </span>
              </div>
              {uploadingFiles && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {uploadProgressMsg}
                </p>
              )}

              {attachmentError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {attachmentError}
                </p>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground shadow-2xs"
                    >
                      <Paperclip className="w-3 h-3 text-primary" />
                      <span className="font-medium max-w-[200px] truncate">{att.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(att.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-muted-foreground hover:text-red-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha (Parámetros, Audiencia y Reglas) */}
        <div className="space-y-4">
          {/* Clasificación y Prioridad */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Clasificación y Urgencia
            </h3>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tipo de Comunicado
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DIRECTIVE">Directiva Obligatoria</option>
                <option value="ANNOUNCEMENT">Comunicado General</option>
                <option value="RECOGNITION">Reconocimiento / Shoutout</option>
                <option value="ALERT">Alerta Operativa</option>
                <option value="EVENT">Evento Corporativo</option>
                <option value="POLICY">Política Organizacional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nivel de Prioridad
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['NORMAL', 'IMPORTANT', 'URGENT'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                      priority === p
                        ? p === 'URGENT'
                          ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400'
                          : p === 'IMPORTANT'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/15 border-primary text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {p === 'URGENT' ? 'Urgente' : p === 'IMPORTANT' ? 'Importante' : 'Normal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gestión de Audiencia con Cálculo en Vivo */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Destinatarios
              </h3>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {recipientCount} personas
              </span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'EVERYONE', label: 'Toda la Empresa' },
                  { id: 'AREA', label: 'Por Área' },
                  { id: 'ROLE', label: 'Por Rol' },
                  { id: 'USER', label: 'Usuario Único' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setAudienceType(aud.id as any)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      audienceType === aud.id
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>

              {audienceType === 'AREA' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Seleccionar Área
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  >
                    <option value="planta">Planta y Operaciones</option>
                    <option value="ventas">Comercial y Ventas</option>
                    <option value="direccion">Dirección y Gerencia</option>
                    <option value="diseno">Diseño y Preprensa</option>
                  </select>
                </div>
              )}

              {audienceType === 'ROLE' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Seleccionar Rol
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  >
                    <option value="produccion">Jefatura de Producción</option>
                    <option value="planta">Operarios de Planta</option>
                    <option value="comercial">Equipo Comercial</option>
                    <option value="supervisor">Supervisores</option>
                    <option value="admin">Administradores</option>
                  </select>
                </div>
              )}

              {audienceType === 'USER' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Seleccionar Colaborador
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  >
                    {fusionEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.jobTitle || emp.roleName})
                      </option>
                    ))}
                    {fusionEmployees.length === 0 && (
                      <option value="">Cargando colaboradores...</option>
                    )}
                  </select>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                Este anuncio se entregará a <strong>{recipientCount}</strong> colaboradores activos. Al publicar, se creará exactamente un comprobante de lectura por persona.
              </p>
            </div>
          </div>

          {/* Confirmación Obligatoria y Reglas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Confirmación y Feedback
            </h3>

            {/* Acuse Obligatorio */}
            <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
              <input
                type="checkbox"
                checked={requiresAcknowledgement}
                onChange={(e) => setRequiresAcknowledgement(e.target.checked)}
                className="mt-0.5 rounded border-border text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Exigir confirmación obligatoria (Acuse Formal)
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                  El colaborador no podrá descartar el comunicado hasta pulsar "Entendido / Confirmar". Registra IP y timestamp legal.
                </span>
              </div>
            </label>

            {/* Fijar en el tablero */}
            <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <div className="w-full">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  Fijar en el encabezado del Tablero
                </span>
                {isPinned && (
                  <div className="mt-2">
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      Fijado hasta (opcional)
                    </label>
                    <input
                      type="date"
                      value={pinnedUntil}
                      onChange={(e) => setPinnedUntil(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-background border border-border text-xs"
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Toggles de interacción */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={allowsComments}
                  onChange={(e) => setAllowsComments(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span>Permitir comentarios</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={allowsReactions}
                  onChange={(e) => setAllowsReactions(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span>Reacciones (emojis)</span>
              </label>
            </div>
          </div>

          {/* Programación de Fechas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Programación
            </h3>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="rounded border-border text-primary"
              />
              <span>Publicar de inmediato al guardar</span>
            </label>

            {!publishImmediately && (
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-semibold text-foreground">
                  Fecha y hora programada
                </label>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                />
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Fecha de expiración / archivo automático (opcional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
