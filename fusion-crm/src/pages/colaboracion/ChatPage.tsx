/**
 * Página Principal de Chat Interno en Tiempo Real (Etapa 15.5)
 * Implementa Server-Sent Events, Canales Públicos, Privados, Directos y de Entidad,
 * Autocompletado (@menciones, #entidades, /respuestas_guardadas), Reacciones, Hilos,
 * Pines, Presencia en vivo y Límite Duro de Privacidad con doble confirmación legal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { initAuth, googleSignIn, getAccessToken } from '../../lib/firebase';
import { getOrCreateFolder, uploadFileToDrive } from '../../lib/drive';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFusionAuth } from '../../context/FusionAuthContext';
import {
  Loader2,
  MessageSquare,
  Hash,
  Users,
  Briefcase,
  FolderKanban,
  FileText,
  Search,
  Plus,
  Send,
  Smile,
  Paperclip,
  Pin,
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  X,
  Radio,
  FileCode,
  Sparkles,
  PhoneOff,
  AtSign,
  ArrowLeft,
  Check,
  Megaphone,
} from 'lucide-react';

interface Channel {
  id: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT' | 'ENTITY';
  name: string;
  topic?: string;
  description?: string;
  isArchived: boolean;
  isReadOnly: boolean;
  unreadCount?: number;
  unreadMentionCount?: number;
  lastMessage?: any;
  entityType?: string;
  entityId?: string;
  directKey?: string;
  members?: any[];
}

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  body: string;
  bodyPlain: string;
  renderedHtml?: string;
  createdAt: string;
  editedAt?: string;
  deletedById?: string;
  isPinned?: boolean;
  threadReplyCount?: number;
  parentMessageId?: string | null;
  attachments?: any[];
  reactions?: { emoji: string; count: number; users: string[]; userReacted?: boolean }[];
  mentionedUserIds?: string[];
  mentionsEveryone?: boolean;
  linkedEntityType?: string;
  linkedEntityId?: string;
}

interface SavedReply {
  id: string;
  shortcut: string;
  title: string;
  body: string;
}

interface UserPresence {
  userId: string;
  userName?: string;
  userRole?: string;
  userArea?: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'IN_CALL' | 'OFFLINE';
  customStatusEmoji?: string;
  customStatusText?: string;
  lastActiveAt?: string;
}

export const ChatPage: React.FC = () => {
  const { currentUser, employees } = useFusionAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Canal seleccionado por query param o default
  const channelParam = searchParams.get('channelId');
  const targetUserParam = searchParams.get('targetUserId');

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('chn-general');
  const [mobileChatView, setMobileChatView] = useState<'sidebar' | 'chat'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estado del compositor
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  useEffect(() => {
    initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
  }, []);

  // Estados de hilos
  const [activeThreadParent, setActiveThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadInputText, setThreadInputText] = useState<string>('');

  // Estados de escritura (typing indicator)
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Autocompletados (@, #, /)
  const [autocompleteMode, setAutocompleteMode] = useState<'NONE' | 'MENTIONS' | 'ENTITIES' | 'COMMANDS'>('NONE');
  const [autocompleteFilter, setAutocompleteFilter] = useState<string>('');
  const [autocompleteEntities, setAutocompleteEntities] = useState<any[]>([]);

  // Búsqueda en vivo (sin tildes)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Modales
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newChannelType, setNewChannelType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [newChannelTopic, setNewChannelTopic] = useState<string>('');

  // Modal de Presencia / Estado personalizado
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState<boolean>(false);
  const [myCustomEmoji, setMyCustomEmoji] = useState<string>('💬');
  const [myCustomText, setMyCustomText] = useState<string>('En jornada laboral');
  const [myStatus, setMyStatus] = useState<'ONLINE' | 'AWAY' | 'BUSY'>('ONLINE');

  // Modal de Exportación con LÍMITE DURO DE PRIVACIDAD
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [legalReason, setLegalReason] = useState<string>('');
  const [legalDoubleConfirmed, setLegalDoubleConfirmed] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<any | null>(null);

  // Vista rápida de entidad vinculada (#COT / #PRJ / #CLI)
  const [selectedEntityPreview, setSelectedEntityPreview] = useState<any | null>(null);

  // Referencias para auto-scroll y timers
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserId = currentUser?.id || 'emp-03';
  const currentUserName = currentUser?.name || 'Administrador';

  // --------------------------------------------------------------------------
  // CARGA INICIAL Y CANALES
  // --------------------------------------------------------------------------

  const loadChannels = async () => {
    try {
      const res = await fetch('/api/chat/channels', {
        headers: { 'x-user-id': currentUserId },
      });
      const data = await res.json();
      if (data.channels) {
        setChannels(data.channels);

        // Si hay targetUserId, buscar o crear canal directo
        if (targetUserParam) {
          const direct = data.channels.find(
            (c: Channel) => c.type === 'DIRECT' && c.members?.some((m: any) => m.userId === targetUserParam)
          );
          if (direct) {
            setActiveChannelId(direct.id);
          } else {
            createDirectChannel(targetUserParam);
          }
        } else if (channelParam && data.channels.some((c: Channel) => c.id === channelParam)) {
          setActiveChannelId(channelParam);
        } else if (data.channels.length > 0 && !activeChannelId) {
          setActiveChannelId(data.channels[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando canales de chat:', err);
    }
  };

  const loadPresences = async () => {
    try {
      const res = await fetch('/api/chat/presence');
      const data = await res.json();
      if (data.presences) {
        const map: Record<string, UserPresence> = {};
        data.presences.forEach((p: UserPresence) => {
          map[p.userId] = p;
        });
        setPresences(map);
      }
    } catch (err) {
      console.error('Error cargando presencias:', err);
    }
  };

  const loadSavedReplies = async () => {
    try {
      const res = await fetch('/api/chat/saved-replies');
      const data = await res.json();
      if (data.replies) {
        setSavedReplies(data.replies);
      }
    } catch (err) {
      console.error('Error cargando respuestas guardadas:', err);
    }
  };

  const loadEntities = async (query = '') => {
    try {
      const res = await fetch(`/api/chat/entities/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.entities) {
        setAutocompleteEntities(data.entities);
      }
    } catch (err) {
      console.error('Error cargando lookup de entidades:', err);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        headers: { 'x-user-id': currentUserId },
      });
      if (res.status === 403) {
        setMessages([]);
        alert('Acceso restringido: no eres miembro de esta conversación privada.');
        return;
      }
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      if (data.pins) {
        setPinnedMessages(data.pins);
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // CONEXIÓN SSE UNIFICADA (TIEMPO REAL)
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadChannels();
    loadPresences();
    loadSavedReplies();
    loadEntities();

    // Iniciar SSE
    const sseUrl = `/api/realtime/stream?userId=${currentUserId}&organizationId=org-1`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('chat:message', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const newMsg = data.message;
        if (newMsg.channelId === activeChannelId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        // Actualizar último mensaje en lista de canales
        setChannels((prev) =>
          prev.map((c) =>
            c.id === newMsg.channelId
              ? {
                  ...c,
                  lastMessage: newMsg,
                  unreadCount: c.id !== activeChannelId ? (c.unreadCount || 0) + 1 : 0,
                }
              : c
          )
        );
      } catch (err) {
        console.error('Error procesando evento chat:message', err);
      }
    });

    eventSource.addEventListener('chat:reaction', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
        );
      } catch (err) {
        console.error('Error procesando evento chat:reaction', err);
      }
    });

    eventSource.addEventListener('chat:pin', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
        );
        if (data.pins) {
          setPinnedMessages(data.pins);
        }
      } catch (err) {
        console.error('Error procesando evento chat:pin', err);
      }
    });

    eventSource.addEventListener('chat:typing', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.channelId === activeChannelId && data.userId !== currentUserId) {
          setTypingUsers((prev) => {
            const next = { ...prev };
            if (data.isTyping) {
              next[data.userId] = data.userName;
            } else {
              delete next[data.userId];
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Error procesando evento chat:typing', err);
      }
    });

    eventSource.addEventListener('presence:update', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const p = data.presence;
        if (p) {
          setPresences((prev) => ({ ...prev, [p.userId]: p }));
        }
      } catch (err) {
        console.error('Error procesando presencia SSE', err);
      }
    });

    // Heartbeat de presencia cada 45 segundos
    const heartbeatInterval = setInterval(() => {
      fetch('/api/chat/presence/heartbeat', {
        method: 'POST',
        headers: { 'x-user-id': currentUserId },
      }).catch(() => {});
    }, 45000);

    return () => {
      eventSource.close();
      clearInterval(heartbeatInterval);
    };
  }, [activeChannelId]);

  // Cargar mensajes cuando cambia el canal activo
  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);
      // Limpiar indicador de escritura del canal anterior
      setTypingUsers({});
      setActiveThreadParent(null);
      setThreadReplies([]);
    }
  }, [activeChannelId]);

  // Auto-scroll al final al recibir mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // --------------------------------------------------------------------------
  // MANEJADORES DE ACCIONES
  // --------------------------------------------------------------------------

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setMobileChatView('chat');
    setSearchParams({ channelId });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    // Detección de disparadores (/ , @ , #)
    const cursor = e.target.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursor);
    const lastWord = textBeforeCursor.split(/\s/).pop() || '';

    if (lastWord.startsWith('/')) {
      setAutocompleteMode('COMMANDS');
      setAutocompleteFilter(lastWord.substring(1).toLowerCase());
    } else if (lastWord.startsWith('@')) {
      setAutocompleteMode('MENTIONS');
      setAutocompleteFilter(lastWord.substring(1).toLowerCase());
    } else if (lastWord.startsWith('#')) {
      setAutocompleteMode('ENTITIES');
      setAutocompleteFilter(lastWord.substring(1).toLowerCase());
      loadEntities(lastWord.substring(1));
    } else {
      setAutocompleteMode('NONE');
    }

    // Emitir indicador de escritura con rebote
    if (!typingTimeoutRef.current) {
      fetch('/api/realtime/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-name': currentUserName },
        body: JSON.stringify({ channelId: activeChannelId, isTyping: true }),
      }).catch(() => {});
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/realtime/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-name': currentUserName },
        body: JSON.stringify({ channelId: activeChannelId, isTyping: false }),
      }).catch(() => {});
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const insertAutocomplete = (insertion: string, mode: 'COMMANDS' | 'MENTIONS' | 'ENTITIES') => {
    const words = inputText.split(' ');
    words.pop(); // remover el token disparador

    let newText = '';
    if (mode === 'COMMANDS') {
      // Reemplazo completo si es un shortcut
      newText = insertion;
    } else {
      newText = words.length > 0 ? `${words.join(' ')} ${insertion} ` : `${insertion} `;
    }

    setInputText(newText);
    setAutocompleteMode('NONE');
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && pendingAttachments.length === 0) || isSending) return;

    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const textToSend = inputText;
    const attsToSend = [...pendingAttachments];

    setInputText('');
    setPendingAttachments([]);
    setAutocompleteMode('NONE');
    setIsSending(true);

    try {
      const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'x-user-name': currentUserName,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          body: textToSend,
          clientMessageId,
          attachments: attsToSend,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      // Restaurar texto si falló
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (data.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId, 'x-user-name': currentUserName },
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned: data.isPinned } : m))
      );
      // Refrescar lista de pines
      loadMessages(activeChannelId);
    } catch (err) {
      console.error('Error alternando pin:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('¿Deseas eliminar este mensaje?')) return;
    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUserId, 'x-user-role': 'admin' },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body: '[Mensaje eliminado por el usuario]', bodyPlain: '[Mensaje eliminado]' }
            : m
        )
      );
    } catch (err) {
      console.error('Error eliminando mensaje:', err);
    }
  };

  // Subida de adjunto con validación de tipo y tamaño
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 25 * 1024 * 1024) {
      alert('El archivo supera el límite máximo permitido de 25 MB.');
      return;
    }
    
    let token = await getAccessToken();
    if (!token) {
      try {
        await googleSignIn();
        token = await getAccessToken();
      } catch (err) {
        alert('Necesitas conectar Google Drive para subir archivos.');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgressMsg('Preparando Google Drive...');
    try {
      if (!token) throw new Error("No token");
      const rootFolderId = await getOrCreateFolder(token, 'App Uploads');
      const chatFolderId = await getOrCreateFolder(token, 'Chat', rootFolderId);
      
      setUploadProgressMsg('Subiendo archivo...');
      const driveFile = await uploadFileToDrive(token, file, chatFolderId);

      const newAtt = {
        id: driveFile.id,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        url: `https://drive.google.com/file/d/${driveFile.id}/view`,
      };
      
      setPendingAttachments((prev) => [...prev, newAtt]);
    } catch (err: any) {
      console.error('Error subiendo adjunto:', err);
      alert('Error subiendo a Drive: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Crear canal directo con usuario
  const createDirectChannel = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ type: 'DIRECT', targetUserId }),
      });
      const data = await res.json();
      if (data.channel) {
        setChannels((prev) => {
          if (prev.some((c) => c.id === data.channel.id)) return prev;
          return [...prev, data.channel];
        });
        setActiveChannelId(data.channel.id);
        setSearchParams({ channelId: data.channel.id });
      }
    } catch (err) {
      console.error('Error creando canal directo:', err);
    }
  };

  // Crear nuevo canal público / privado
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({
          name: newChannelName,
          type: newChannelType,
          topic: newChannelTopic,
        }),
      });
      const data = await res.json();
      if (data.channel) {
        setChannels((prev) => [...prev, data.channel]);
        setActiveChannelId(data.channel.id);
        setIsNewChannelModalOpen(false);
        setNewChannelName('');
        setNewChannelTopic('');
      }
    } catch (err) {
      console.error('Error creando canal:', err);
    }
  };

  // Actualizar estado personalizado de presencia
  const handleSavePresence = async () => {
    try {
      const res = await fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({
          status: myStatus,
          customStatusEmoji: myCustomEmoji,
          customStatusText: myCustomText,
        }),
      });
      const data = await res.json();
      if (data.presence) {
        setPresences((prev) => ({ ...prev, [currentUserId]: data.presence }));
        setIsPresenceModalOpen(false);
      }
    } catch (err) {
      console.error('Error actualizando presencia:', err);
    }
  };

  // Búsqueda insensible a tildes (Spanish accent-insensitive)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/chat/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Error buscando mensajes:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // EXPORTACIÓN CON LÍMITE DURO DE PRIVACIDAD
  const handleExportChannel = async () => {
    setExportError(null);
    try {
      const res = await fetch(`/api/chat/export/${activeChannelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          legalConfirmation: legalDoubleConfirmed,
          legalReason,
        }),
      });

      const data = await res.json();
      if (res.status === 403) {
        setExportError(data.error);
        return;
      }

      setExportSuccess(data);
    } catch (err) {
      console.error('Error exportando canal:', err);
      setExportError('Fallo inesperado al procesar la exportación');
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Helper de icono por tipo de canal
  const getChannelIcon = (type: string, name: string) => {
    if (name.includes('📢')) return <Megaphone className="w-4 h-4 text-amber-500" />;
    switch (type) {
      case 'PUBLIC':
        return <Hash className="w-4 h-4 text-primary" />;
      case 'PRIVATE':
        return <ShieldAlert className="w-4 h-4 text-indigo-500" />;
      case 'DIRECT':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'ENTITY':
        return <FolderKanban className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Helper para dot de presencia
  const renderPresenceDot = (userId: string) => {
    const p = presences[userId];
    const status = p?.status || 'OFFLINE';
    let color = 'bg-slate-400';
    if (status === 'ONLINE') color = 'bg-emerald-500 ring-2 ring-emerald-500/20';
    if (status === 'AWAY') color = 'bg-amber-500 ring-2 ring-amber-500/20';
    if (status === 'BUSY' || status === 'IN_CALL') color = 'bg-rose-500 ring-2 ring-rose-500/20';
    return <span className={`w-2 h-2 rounded-full ${color}`} />;
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* ==================================================================== */}
      {/* BARRA LATERAL: CANALES, DIRECTOS Y PRESENCIA                        */}
      {/* ==================================================================== */}
      <div className={`${mobileChatView === 'sidebar' ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-border flex-col bg-muted/20 shrink-0`}>
        {/* Header Lateral y Búsqueda */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-foreground">Chat de Equipo</span>
            </div>
            <button
              onClick={() => setIsNewChannelModalOpen(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Crear nuevo canal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Buscador Full-text */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en mensajes (sin tildes)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Panel de Resultados de Búsqueda si está activo */}
        {searchResults !== null ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-muted-foreground">
              <span>{searchResults.length} resultados encontrados</span>
              <button
                onClick={() => setSearchResults(null)}
                className="text-primary hover:underline"
              >
                Cerrar
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron coincidencias para &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    setActiveChannelId(res.channelId);
                    setSearchResults(null);
                  }}
                  className="p-2 rounded-lg bg-card border border-border hover:border-primary/40 cursor-pointer space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold text-primary">{res.channelName}</span>
                    <span>{new Date(res.createdAt).toLocaleDateString('es-CO')}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium">
                    <span className="text-muted-foreground">{res.authorName}: </span>
                    {res.bodyPlain}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Lista Clasificada de Canales */
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* CANALES PÚBLICOS */}
            <div>
              <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Canales Públicos</span>
                <span className="text-[9px] font-normal">
                  {channels.filter((c) => c.type === 'PUBLIC').length}
                </span>
              </div>
              <div className="space-y-0.5">
                {channels
                  .filter((c) => c.type === 'PUBLIC')
                  .map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeChannelId === ch.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getChannelIcon(ch.type, ch.name)}
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {ch.unreadCount && ch.unreadCount > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-amber-950">
                          {ch.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  ))}
              </div>
            </div>

            {/* CANALES DE ENTIDAD (Cotizaciones / Proyectos / Clientes) */}
            <div>
              <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Cotizaciones y Proyectos</span>
                <span className="text-[9px] font-normal">
                  {channels.filter((c) => c.type === 'ENTITY').length}
                </span>
              </div>
              <div className="space-y-0.5">
                {channels
                  .filter((c) => c.type === 'ENTITY')
                  .map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeChannelId === ch.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getChannelIcon(ch.type, ch.name)}
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* MENSAJES DIRECTOS */}
            <div>
              <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Mensajes Directos</span>
                <span className="text-[9px] font-normal">
                  {channels.filter((c) => c.type === 'DIRECT').length}
                </span>
              </div>
              <div className="space-y-0.5">
                {channels
                  .filter((c) => c.type === 'DIRECT')
                  .map((ch) => {
                    const otherMember = ch.members?.find((m) => m.userId !== currentUserId);
                    const targetId = otherMember?.userId || '';
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleSelectChannel(ch.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeChannelId === ch.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative shrink-0">
                            {renderPresenceDot(targetId)}
                          </div>
                          <span className="truncate">{ch.name}</span>
                        </div>
                        {ch.unreadCount && ch.unreadCount > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-amber-950">
                            {ch.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Lateral: Mi Estado de Presencia */}
        <div className="p-2.5 border-t border-border bg-card">
          <button
            onClick={() => setIsPresenceModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {currentUserName.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{currentUserName}</p>
                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  <span>{presences[currentUserId]?.customStatusEmoji || '💬'}</span>
                  <span>{presences[currentUserId]?.customStatusText || 'En línea'}</span>
                </p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CUERPO PRINCIPAL DEL CHAT                                           */}
      {/* ==================================================================== */}
      <div className={`${mobileChatView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-background`}>
        {/* Header del Canal Activo */}
        <div className="h-14 border-b border-border px-3 sm:px-4 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileChatView('sidebar')}
              className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors shrink-0"
              title="Volver a la lista de canales"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {activeChannel && getChannelIcon(activeChannel.type, activeChannel.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">
                  {activeChannel?.name || 'Canal de Conversación'}
                </h2>
                {activeChannel?.isReadOnly && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Solo lectura
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {activeChannel?.topic || activeChannel?.description || 'Canal colaborativo de Fusion ERP'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón de Exportar (Aplica Límite Duro de Privacidad en DMs) */}
            <button
              onClick={() => {
                setExportError(null);
                setExportSuccess(null);
                setLegalDoubleConfirmed(false);
                setLegalReason('');
                setIsExportModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              title="Exportar conversación para archivo o auditoría"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Barra de Mensajes Fijados si existen */}
        {pinnedMessages.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold">Fijado:</span>
              <span className="truncate">
                {pinnedMessages[pinnedMessages.length - 1].message?.bodyPlain || 'Mensaje de importancia fijado'}
              </span>
            </div>
            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-mono shrink-0 ml-2">
              {pinnedMessages.length} fijado{pinnedMessages.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* FEED DE MENSAJES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Cargando historial del canal...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Inicio de la conversación</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Sé el primero en enviar un mensaje a este canal. Puedes usar @menciones, #cotizaciones o /respuestas.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.authorId === currentUserId;
              const hasAttachments = msg.attachments && msg.attachments.length > 0;

              return (
                <div
                  key={msg.id}
                  className={`group relative flex items-start gap-3 p-2 rounded-xl transition-all ${
                    msg.isPinned
                      ? 'bg-amber-500/5 border border-amber-500/20'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {msg.authorName.charAt(0)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{msg.authorName}</span>
                      {msg.authorRole && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">
                          {msg.authorRole}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.editedAt && (
                        <span className="text-[9px] text-muted-foreground italic">(editado)</span>
                      )}
                      {msg.isPinned && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Pin className="w-3 h-3" /> Fijado
                        </span>
                      )}
                    </div>

                    {/* Cuerpo del Mensaje con Markdown renderizado */}
                    <div className="text-xs text-foreground leading-relaxed break-words">
                      {msg.deletedById ? (
                        <span className="italic text-muted-foreground">{msg.bodyPlain}</span>
                      ) : (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-xs"
                          dangerouslySetInnerHTML={{
                            __html: msg.renderedHtml || msg.body,
                          }}
                        />
                      )}
                    </div>

                    {/* Tarjeta de Entidad vinculada si existe (#COT / #PRJ) */}
                    {msg.linkedEntityType && msg.linkedEntityId && (
                      <div
                        onClick={() =>
                          setSelectedEntityPreview({
                            type: msg.linkedEntityType,
                            id: msg.linkedEntityId,
                          })
                        }
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-semibold hover:bg-primary/10 cursor-pointer transition-colors mt-1"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>
                          {msg.linkedEntityType === 'QUOTE'
                            ? 'Cotización'
                            : msg.linkedEntityType === 'PRODUCTION_PROJECT'
                            ? 'Proyecto'
                            : 'Cliente'}{' '}
                          #{msg.linkedEntityId}
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </div>
                    )}

                    {/* Adjuntos */}
                    {hasAttachments && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.attachments!.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border text-xs text-foreground hover:bg-muted/80 transition-colors"
                          >
                            <FileCode className="w-4 h-4 text-primary" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[180px]">{att.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {(att.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Reacciones */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {msg.reactions.map((r, rIdx) => (
                          <button
                            key={rIdx}
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                              r.userReacted
                                ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                                : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Barra de Acciones Flotante al Hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 bg-card border border-border rounded-lg shadow-sm flex items-center p-0.5 gap-0.5 transition-opacity">
                    <button
                      onClick={() => handleToggleReaction(msg.id, '👍')}
                      className="p-1 rounded hover:bg-muted text-xs"
                      title="Me gusta"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, '🚀')}
                      className="p-1 rounded hover:bg-muted text-xs"
                      title="Cohete"
                    >
                      🚀
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, '❤️')}
                      className="p-1 rounded hover:bg-muted text-xs"
                      title="Corazón"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleTogglePin(msg.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500"
                      title={msg.isPinned ? 'Desfijar' : 'Fijar mensaje'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    {isMine && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-500"
                        title="Eliminar mensaje"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Indicador de Escritura en Vivo */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2 py-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-200" />
              </div>
              <span>
                {Object.values(typingUsers).join(', ')} está{Object.keys(typingUsers).length > 1 ? 'n' : ''} escribiendo...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ==================================================================== */}
        {/* COMPOSITOR DE MENSAJES Y AUTOCOMPLETADO                             */}
        {/* ==================================================================== */}
        <div className="p-3 border-t border-border bg-card relative">
          {/* Overlay de Autocompletado */}
          {autocompleteMode !== 'NONE' && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-card border border-border rounded-xl shadow-lg p-2 max-h-56 overflow-y-auto space-y-1 z-30">
              {autocompleteMode === 'COMMANDS' && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                    Respuestas Rápidas Guardadas
                  </div>
                  {savedReplies
                    .filter((r) => r.shortcut.toLowerCase().includes(autocompleteFilter))
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => insertAutocomplete(r.body, 'COMMANDS')}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-primary mr-2">{r.shortcut}</span>
                          <span className="font-medium text-foreground">{r.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {r.body}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {autocompleteMode === 'MENTIONS' && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                    Mencionar Colaborador
                  </div>
                  {[
                    ...employees.map(emp => ({
                      id: emp.id,
                      name: emp.name.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                      display: `${emp.name} (${emp.jobTitle || emp.roleName})`
                    })),
                    { id: 'todos', name: 'todos', display: 'Notificar a todos en el canal' },
                  ]
                    .filter((u) => u.name.toLowerCase().includes(autocompleteFilter) || u.display.toLowerCase().includes(autocompleteFilter))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => insertAutocomplete(`@${u.name}`, 'MENTIONS')}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left text-xs"
                      >
                        <AtSign className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold text-foreground">@{u.name}</span>
                        <span className="text-muted-foreground text-[11px]">— {u.display}</span>
                      </button>
                    ))}
                </div>
              )}

              {autocompleteMode === 'ENTITIES' && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                    Vincular Cotización, Proyecto o Cliente
                  </div>
                  {autocompleteEntities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => insertAutocomplete(`#${ent.code}`, 'ENTITIES')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-primary" />
                        <div>
                          <span className="font-bold text-primary mr-2">#{ent.code}</span>
                          <span className="text-foreground">{ent.title}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ent.subtitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de adjuntos en cola */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted border border-border text-xs text-foreground"
                >
                  <Paperclip className="w-3 h-3 text-primary" />
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Área de Entrada */}
          <div className="flex items-end gap-2 bg-muted/30 border border-border rounded-xl p-2 focus-within:border-primary/60 transition-colors">
            {/* Botón de Adjuntos */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Adjuntar archivo o imagen (máx 25 MB)"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            {isUploading && <span className="text-[10px] text-blue-500 absolute -top-4 left-2">{uploadProgressMsg}</span>}

            {/* Input de texto multilínea */}
            <textarea
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Escribe un mensaje en ${activeChannel?.name || 'el canal'} (Usa / para atajos, @ para personas, # para proyectos)...`}
              className="flex-1 bg-transparent border-0 resize-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32 py-1.5"
            />

            {/* Botón de Envío */}
            <button
              onClick={handleSendMessage}
              disabled={(!inputText.trim() && pendingAttachments.length === 0) || isSending}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
              title="Enviar mensaje (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: LÍMITE DURO DE PRIVACIDAD EN EXPORTACIÓN                      */}
      {/* ==================================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border-2 border-rose-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-foreground">
                  Límite Duro de Privacidad y Confidencialidad
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ley Estatutaria 1581 de 2012 · Secreto de las Comunicaciones
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-900 dark:text-rose-200 leading-relaxed space-y-2">
              <p className="font-semibold">
                ⚠️ Ninguna pantalla de administración permite espiar ni exportar conversaciones privadas sin justa causa judicial o legal formal.
              </p>
              <p>
                La exportación generará una <strong>trazabilidad inmutable en AuditLog</strong> y <strong>notificará de inmediato a todos los participantes</strong> de la conversación.
              </p>
            </div>

            {exportError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300">
                {exportError}
              </div>
            )}

            {exportSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Exportación procesada satisfactoriamente
                </p>
                <p>Total de mensajes extraídos: {exportSuccess.messageCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  Se ha registrado el evento en AuditLog y se notificó a los titulares.
                </p>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full mt-2 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Justificación Legal o Radicado Judicial (Mínimo 15 caracteres):
                  </label>
                  <textarea
                    rows={2}
                    value={legalReason}
                    onChange={(e) => setLegalReason(e.target.value)}
                    placeholder="Ejemplo: Requerimiento radicado fiscalía 2026-901 o proceso disciplinario formal..."
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalDoubleConfirmed}
                    onChange={(e) => setLegalDoubleConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs text-foreground leading-snug">
                    Confirmo bajo gravedad de juramento que cuento con la autorización legal requerida y acepto que los involucrados sean notificados.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExportChannel}
                    disabled={!legalDoubleConfirmed || legalReason.trim().length < 15}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
                  >
                    Ejecutar Exportación Auditada
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ESTADO PERSONALIZADO Y PRESENCIA                              */}
      {/* ==================================================================== */}
      {isPresenceModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Definir mi Estado</h3>
              <button onClick={() => setIsPresenceModalOpen(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Selector de Status */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Disponibilidad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ONLINE', label: 'En línea', color: 'text-emerald-500' },
                    { id: 'AWAY', label: 'Ausente', color: 'text-amber-500' },
                    { id: 'BUSY', label: 'Ocupado', color: 'text-rose-500' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setMyStatus(s.id as any)}
                      className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        myStatus === s.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className={s.color}>●</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji y Texto */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mensaje de Estado Personalizado
                </label>
                <div className="flex gap-2">
                  <select
                    value={myCustomEmoji}
                    onChange={(e) => setMyCustomEmoji(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 text-base focus:outline-none"
                  >
                    <option value="💬">💬</option>
                    <option value="🔧">🔧</option>
                    <option value="☕">☕</option>
                    <option value="⚡">⚡</option>
                    <option value="📞">📞</option>
                    <option value="🎯">🎯</option>
                  </select>
                  <input
                    type="text"
                    value={myCustomText}
                    onChange={(e) => setMyCustomText(e.target.value)}
                    placeholder="¿En qué estás trabajando?"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsPresenceModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePresence}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                >
                  Guardar Estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CREAR CANAL                                                  */}
      {/* ==================================================================== */}
      {isNewChannelModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Crear Nuevo Canal</h3>
              <button onClick={() => setIsNewChannelModalOpen(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nombre del Canal
                </label>
                <input
                  type="text"
                  placeholder="ej: control-calidad o acrilicos-uv"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Tipo de Canal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewChannelType('PUBLIC')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      newChannelType === 'PUBLIC'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" /> Público
                  </button>
                  <button
                    onClick={() => setNewChannelType('PRIVATE')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      newChannelType === 'PRIVATE'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Privado
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Tema o Propósito
                </label>
                <input
                  type="text"
                  placeholder="Descripción breve del canal"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsNewChannelModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40"
                >
                  Crear Canal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DRAWER: VISTA RÁPIDA DE ENTIDAD VINCULADA (#COT / #PRJ)             */}
      {/* ==================================================================== */}
      {selectedEntityPreview && (
        <div className="fixed inset-y-0 right-0 w-80 bg-card border-l border-border shadow-2xl z-40 p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-bold text-xs text-foreground">
                  Ficha de #{selectedEntityPreview.id}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {selectedEntityPreview.type === 'QUOTE' ? 'Cotización Comercial' : 'Proyecto Operativo'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEntityPreview(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Estado</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                ● En Producción / Negociación
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Cliente</span>
              <p className="font-bold text-foreground">Bancolombia S.A.</p>
              <p className="text-[11px] text-muted-foreground">NIT: 890.903.938-8</p>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Alcance</span>
              <p className="text-foreground">
                Señalética corporativa Torre Norte, corte acrílico 5mm e impresión UV directa.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <button
              onClick={() => {
                navigate(
                  selectedEntityPreview.type === 'QUOTE'
                    ? `/dashboard/cotizador`
                    : `/dashboard/produccion`
                );
              }}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Registro en ERP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
