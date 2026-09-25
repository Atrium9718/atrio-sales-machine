import React, { useState, useEffect, useRef } from 'react';
import { addQuote } from '../../../../../lib/quotesStore';
import { 
  Send, Bot, RefreshCw, Sparkles, CheckCheck, User, 
  ArrowRightLeft, ShieldCheck, ChevronDown, ChevronUp, 
  Phone, Video, MoreVertical, MessageSquare, AlertCircle,
  Building2, HeartHandshake, Search, PhoneCall, FileText, ExternalLink,
  Mail, Hash, Database, Check, Layers
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  agentName?: string;
  agentId?: string;
  agentDomain?: string;
  timestamp: string;
  handoffInfo?: {
    targetAgentName: string;
    targetAgentId: string;
    reason: string;
    extractedContext: string;
  };
  customerCard?: {
    name: string;
    company: string;
    phone: string;
    matchedBy: string;
  };
  preQuoteData?: any;
}

interface AgentSummary {
  id: string;
  name: string;
  domain: string;
  description?: string;
  systemPrompt?: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  company: string;
  phone: string;
  phones?: string[];
  email?: string;
  emails?: string[];
  nit?: string;
  address?: string;
  city?: string;
  matchedBy?: string;
}

export default function IATestingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'system',
      content: '🟢 Simulación de WhatsApp iniciada. Los agentes consultan activamente la base de datos por nombres, empresas, teléfonos, correos y NIT para reconocer al cliente o responder consultas.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState('ag_01_valentina');
  const [activeAgentName, setActiveAgentName] = useState('Valentina');
  const [activeAgentDomain, setActiveAgentDomain] = useState('Comercial');
  const [transferredContext, setTransferredContext] = useState('');
  const [channel, setChannel] = useState('WhatsApp');

  // Identidad simulada del remitente (cliente que escribe)
  const [simulatedPhone, setSimulatedPhone] = useState('3112688275');
  const [simulatedName, setSimulatedName] = useState('Jorge Arbeláez');
  const [simulatedCompany, setSimulatedCompany] = useState('Litografía Arbeláez');
  const [simulatedEmail, setSimulatedEmail] = useState('jorge.arbelaez@graficas.com');
  const [simulatedNit, setSimulatedNit] = useState('');
  const [identifiedCustomer, setIdentifiedCustomer] = useState<CustomerProfile | null>(null);

  // Estados para el buscador interactivo de base de datos de clientes
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [dbSearchField, setDbSearchField] = useState<'all' | 'name' | 'company' | 'phone' | 'email' | 'nit'>('all');
  const [dbSearchResults, setDbSearchResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [hasSearchedDb, setHasSearchedDb] = useState(false);
  const [showDbSearchPanel, setShowDbSearchPanel] = useState(false);
  
  // Pre-cotizaciones generadas en esta sesión
  const [sessionPreQuotes, setSessionPreQuotes] = useState<any[]>([]);
  const [isGeneratingPreQuote, setIsGeneratingPreQuote] = useState(false);
  
  // Lista de agentes para selector y visualización
  const [availableAgents, setAvailableAgents] = useState<AgentSummary[]>([]);
  const [activeAgentFullData, setActiveAgentFullData] = useState<any>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  
  // Handoff logs
  const [handoffHistory, setHandoffHistory] = useState<Array<{
    from: string;
    to: string;
    context: string;
    time: string;
  }>>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Clientes predefinidos reales de la base de datos para pruebas rápidas
  const presetCustomers = [
    { 
      label: 'Don Jorge Arbeláez', 
      name: 'Jorge Arbeláez', 
      company: 'Litografía Arbeláez',
      phone: '3112688275', 
      email: 'jorge.arbelaez@graficas.com',
      nit: '71628192',
      note: 'Cliente recurrente (Bogotá)' 
    },
    { 
      label: 'Copidrogas (Rubén Valencia)', 
      name: 'Rubén Darío Valencia', 
      company: 'Copidrogas Pereira',
      phone: '8864400', 
      email: 'compras@copidrogas.com.co',
      nit: '860000000',
      note: 'Copidrogas Pereira' 
    },
    { 
      label: 'Tienda Pintuco (Gonzalo Zuluaga)', 
      name: 'Gonzalo Zuluaga Montes', 
      company: 'Tienda Pintuco Manizales',
      phone: '8821144', 
      email: 'tienda.manizales@pintuco.com',
      nit: '890900140',
      note: 'Tienda Pintuco' 
    },
    { 
      label: 'Laboratorios Baxter', 
      name: 'Dra. Mónica Cárdenas', 
      company: 'Laboratorios Baxter S.A.',
      phone: '3158901234', 
      email: 'compras@baxter.com.co',
      nit: '860012345',
      note: 'Farmacéutica' 
    },
    { 
      label: 'Luz Elena Sánchez', 
      name: 'Luz Elena Sánchez', 
      company: 'Comercial Sánchez & Cía',
      phone: '3024408532', 
      email: 'luz.sanchez@gmail.com',
      nit: '43512987',
      note: 'Cliente de Manizales' 
    },
    { 
      label: 'Cliente Nuevo (Sin registro)', 
      name: '', 
      company: '',
      phone: '3001234567', 
      email: '',
      nit: '',
      note: 'Primer contacto' 
    }
  ];

  // Cargar lista de agentes de la base de datos
  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableAgents(data);
          const current = data.find((a: any) => a.id === activeAgentId) || data.find((a: any) => a.id === 'ag_01_valentina');
          if (current) {
            setActiveAgentName(current.name);
            setActiveAgentDomain(current.domain || 'Comercial');
            setActiveAgentFullData(current);
          }
        }
      })
      .catch(err => console.error('Error loading agents list:', err));
  }, []);

  // Actualizar datos del agente activo seleccionado
  useEffect(() => {
    if (availableAgents.length > 0) {
      const found = availableAgents.find(a => a.id === activeAgentId);
      if (found) {
        setActiveAgentName(found.name);
        setActiveAgentDomain(found.domain);
        setActiveAgentFullData(found);
      }
    }
  }, [activeAgentId, availableAgents]);

  // Auto scroll al final del chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectPreset = (preset: typeof presetCustomers[0]) => {
    setSimulatedName(preset.name);
    setSimulatedCompany(preset.company || '');
    setSimulatedPhone(preset.phone);
    setSimulatedEmail(preset.email || '');
    setSimulatedNit(preset.nit || '');
    setIdentifiedCustomer(null);
    setMessages(prev => [
      ...prev,
      {
        id: 'sys-preset-' + Date.now(),
        sender: 'system',
        content: `👤 Remitente cambiado a: ${preset.label} (${preset.phone || 'Sin teléfono'}) • Empresa: ${preset.company || 'N/A'}. En el próximo mensaje el agente consultará la BD para reconocerlo.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSearchDb = async (customQuery?: string) => {
    const queryToUse = customQuery !== undefined ? customQuery : dbSearchTerm;
    if (!queryToUse && dbSearchField === 'all') return;
    setIsSearchingDb(true);
    setHasSearchedDb(true);
    try {
      const params = new URLSearchParams();
      if (dbSearchField === 'all') {
        params.append('q', queryToUse);
      } else {
        params.append(dbSearchField, queryToUse);
      }
      params.append('limit', '8');

      const res = await fetch(`/api/agents/customers/search?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setDbSearchResults(data.customers);
      } else {
        setDbSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching customers database:', err);
      setDbSearchResults([]);
    } finally {
      setIsSearchingDb(false);
    }
  };

  const handleApplyCustomerToSimulator = (customer: any) => {
    const phone = customer.primaryPhone || customer.phones?.[0] || '';
    const email = customer.primaryEmail || customer.emails?.[0] || '';
    setSimulatedName(customer.name || '');
    setSimulatedCompany(customer.company || '');
    setSimulatedPhone(phone);
    setSimulatedEmail(email);
    setSimulatedNit(customer.nit || '');
    setIdentifiedCustomer(null);
    setMessages(prev => [
      ...prev,
      {
        id: 'sys-load-' + Date.now(),
        sender: 'system',
        content: `👤 Cliente cargado desde BD: ${customer.name || 'Sin nombre'} (${customer.company || 'Empresa'}) • Tel: ${phone || 'N/A'} • Correo: ${email || 'N/A'}. En el próximo mensaje la IA lo reconocerá como cliente de la casa.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleAskAgentAboutCustomer = (customer: any) => {
    const queryTarget = customer.company || customer.name || customer.primaryPhone;
    const prompt = `¿Podrías verificar en la base de datos la información de contacto registrada de ${queryTarget}?`;
    handleSendMessage(prompt);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: userMsgTime
    };

    const newMessagesList = [...messages, newUserMessage];
    setMessages(newMessagesList);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Filtrar historial para Gemini (solo user y assistant)
      const chatHistory = newMessagesList
        .filter(m => m.sender === 'user' || m.sender === 'assistant')
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const res = await fetch('/api/agents/simulate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory.slice(0, -1),
          activeAgentId,
          channel,
          transferredContext,
          customerPhone: simulatedPhone,
          customerName: simulatedName,
          customerEmail: simulatedEmail,
          customerCompany: simulatedCompany,
          customerNit: simulatedNit,
          allowHandoff: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al comunicarse con el agente');
      }

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const incomingMsgs: ChatMessage[] = [];

      // Si se identificó el cliente en la base de datos
      if (data.customerIdentified) {
        setIdentifiedCustomer(data.customerIdentified);
      }

      // 1. Mensaje del agente actual
      if (data.reply) {
        incomingMsgs.push({
          id: 'agent-' + Date.now(),
          sender: 'assistant',
          content: data.reply,
          agentName: data.activeAgent?.name || activeAgentName,
          agentId: data.activeAgent?.id || activeAgentId,
          agentDomain: data.activeAgent?.domain || activeAgentDomain,
          timestamp: nowTime
        });
      }

      // 2. Si hubo handoff (transferencia entre agentes)
      if (data.handoff) {
        const handoff = data.handoff;
        const targetName = handoff.targetAgent?.name || handoff.targetAgentName || 'Agente Especializado';
        const targetId = handoff.targetAgent?.id || handoff.targetAgentId;
        const targetDomain = handoff.targetAgent?.domain || 'Cotizaciones';

        // Mensaje del sistema tipo WhatsApp indicando la transferencia
        incomingMsgs.push({
          id: 'handoff-' + Date.now(),
          sender: 'system',
          content: `🔄 Conversación transferida a ${targetName} (${targetDomain}).`,
          timestamp: nowTime,
          handoffInfo: {
            targetAgentName: targetName,
            targetAgentId: targetId,
            reason: handoff.reason,
            extractedContext: handoff.extractedContext
          }
        });

        // Respuesta inmediata del nuevo agente con el contexto cargado
        if (handoff.targetReply) {
          incomingMsgs.push({
            id: 'target-reply-' + Date.now(),
            sender: 'assistant',
            content: handoff.targetReply,
            agentName: targetName,
            agentId: targetId,
            agentDomain: targetDomain,
            timestamp: nowTime
          });
        }

        // Actualizar estado del agente activo al nuevo agente
        setActiveAgentId(targetId);
        setActiveAgentName(targetName);
        setActiveAgentDomain(targetDomain);

        // Guardar registro en el historial de handoffs
        setHandoffHistory(prev => [
          ...prev,
          {
            from: data.activeAgent?.name || activeAgentName,
            to: targetName,
            context: handoff.extractedContext,
            time: nowTime
          }
        ]);
      }

      if (data.updatedContext) {
        setTransferredContext(data.updatedContext);
      }

      // 3. Si el agente generó una Pre-cotización estructurada
      if (data.preQuote) {
        setSessionPreQuotes(prev => {
          if (!prev.some(p => p.id === data.preQuote.id)) {
            return [data.preQuote, ...prev];
          }
          return prev;
        });

        incomingMsgs.push({
          id: 'pre-quote-' + Date.now(),
          sender: 'assistant',
          content: `📑 He generado y guardado en el sistema la Pre-cotización ${data.preQuote.number} con los ítems, cantidades y especificaciones técnicas para que el equipo comercial la termine de costear y se la envíe.`,
          agentName: data.activeAgent?.name || activeAgentName,
          agentId: data.activeAgent?.id || activeAgentId,
          agentDomain: 'Cotizaciones',
          timestamp: nowTime,
          preQuoteData: data.preQuote
        });
      }

      setMessages(prev => [...prev, ...incomingMsgs]);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'system',
          content: `⚠️ Error en la simulación: ${err.message || 'No se pudo obtener respuesta del servidor'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generación manual a demanda de la Pre-cotización a partir de la conversación
  const handleGeneratePreQuote = async () => {
    const convoMessages = messages
      .filter(m => m.sender === 'user' || m.sender === 'assistant')
      .map(m => ({
        sender: m.sender,
        agentName: m.agentName,
        content: m.content
      }));

    if (convoMessages.length === 0) {
      alert('Debes tener al menos un mensaje en la conversación con requerimientos o cantidades para generar la pre-cotización.');
      return;
    }

    setIsGeneratingPreQuote(true);
    try {
      const res = await fetch('/api/quotes/generate-pre-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: convoMessages,
          customer: identifiedCustomer ? {
            id: identifiedCustomer.id,
            name: identifiedCustomer.name,
            company: identifiedCustomer.company,
            phone: identifiedCustomer.phone,
            email: identifiedCustomer.email
          } : {
            name: simulatedName || 'Cliente WhatsApp',
            phone: simulatedPhone || '3001234567'
          },
          channel
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo generar la pre-cotización');
      }

      if (data.preQuote) {
        setSessionPreQuotes(prev => {
          if (!prev.some(p => p.id === data.preQuote.id)) {
            return [data.preQuote, ...prev];
          }
          return prev;
        });

        // Guardar en el servidor y en la caché para verla al instante en el Cotizador
        addQuote(data.preQuote);

        setMessages(prev => [
          ...prev,
          {
            id: 'manual-pq-' + Date.now(),
            sender: 'assistant',
            agentName: 'Álvaro (Cotizaciones)',
            content: `📑 Pre-cotización ${data.preQuote.number} estructurada con éxito por la IA. Se registraron ${data.preQuote.items?.length || 0} ítem(s) con sus especificaciones técnicas para que el comercial ingrese precios y márgenes.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            preQuoteData: data.preQuote
          }
        ]);
      }
    } catch (err: any) {
      alert('Error generando pre-cotización con IA: ' + err.message);
    } finally {
      setIsGeneratingPreQuote(false);
    }
  };

  const handleReset = () => {
    setActiveAgentId('ag_01_valentina');
    setActiveAgentName('Valentina');
    setActiveAgentDomain('Comercial');
    setTransferredContext('');
    setIdentifiedCustomer(null);
    setHandoffHistory([]);
    setMessages([
      {
        id: 'init-' + Date.now(),
        sender: 'system',
        content: '🟢 Conversación reiniciada. Se reestablece el canal de WhatsApp con Valentina (Comercial).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    "Hola, necesito unas cajas de cartón para enviar unos productos, ¿cuánto me valen?",
    "Buenas tardes, quiero cotizar 1.000 empaques para café tostado, ¿qué material me recomiendan?",
    "¿Por qué me sale más barata una caja si pido 2.500 unidades en vez de 500?",
    "Para Copidrogas: requerimos 2.000 cajas corrugadas de 30x20x15 cm en Kraft onda C neutras para 5 kg con entrega en Pereira.",
    "¿Podrías verificar en la base de datos qué información tenemos registrada de Copidrogas?",
    "Busca en la base de datos al cliente Jorge Arbeláez y dime sus datos de contacto."
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Laboratorio de Pruebas WhatsApp</h1>
              <span className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" />
                Consulta en BD Activa
              </span>
              <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Venta Consultiva & Pedagogía Activa
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Los agentes aplican <strong>venta consultiva</strong>: no se apresuran a cotizar, indagan necesidades, enseñan cómo se fabrican las cosas (sustratos, troqueles, ondas) y exigen información suficiente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDbSearchPanel(!showDbSearchPanel)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm ${
              showDbSearchPanel 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-background hover:bg-muted text-foreground'
            }`}
            title="Abrir u ocultar panel de búsqueda en base de datos"
          >
            <Database className="w-4 h-4" />
            {showDbSearchPanel ? 'Ocultar Buscador BD' : 'Explorar Base de Datos'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors"
            title="Reiniciar chat"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            Reiniciar Chat
          </button>
        </div>
      </div>

      {/* Panel interactivo de Consulta a Base de Datos de Clientes */}
      {showDbSearchPanel && (
        <div className="bg-card border-2 border-emerald-500/30 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Buscador en Tiempo Real de Clientes (Base de Datos)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prueba consultas directas como las que ejecutan los agentes por Nombre, Empresa, Teléfono, Correo o NIT
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDbSearchPanel(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
            >
              Cerrar
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={dbSearchField}
              onChange={(e: any) => setDbSearchField(e.target.value)}
              className="bg-background border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">🔍 Todos los campos</option>
              <option value="name">👤 Nombre de Persona</option>
              <option value="company">🏢 Empresa / Razón Social</option>
              <option value="phone">📞 Teléfono / Celular</option>
              <option value="email">✉️ Correo Electrónico</option>
              <option value="nit">🆔 NIT / Documento</option>
            </select>

            <div className="flex-1 relative">
              <input
                type="text"
                value={dbSearchTerm}
                onChange={(e) => setDbSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchDb();
                  }
                }}
                placeholder="Escribe un nombre (Jorge), empresa (Copidrogas), teléfono (311...), correo o NIT..."
                className="w-full bg-background border rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={() => handleSearchDb()}
              disabled={isSearchingDb}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearchingDb ? 'Buscando...' : 'Consultar BD'}
            </button>
          </div>

          {/* Sugerencias de búsqueda rápida */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Búsquedas rápidas:</span>
            {[
              { label: 'Copidrogas', val: 'Copidrogas' },
              { label: 'Jorge Arbeláez', val: 'Jorge Arbeláez' },
              { label: 'Tel: 3112688275', val: '3112688275' },
              { label: 'Pintuco', val: 'Pintuco' },
              { label: 'Baxter', val: 'Baxter' },
              { label: 'Tel: 8821144', val: '8821144' }
            ].map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDbSearchTerm(s.val);
                  handleSearchDb(s.val);
                }}
                className="px-2 py-0.5 bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground rounded border text-[11px] transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Resultados de la búsqueda */}
          {hasSearchedDb && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Resultados encontrados: <strong>{dbSearchResults.length}</strong></span>
              </div>

              {dbSearchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {dbSearchResults.map((cust: any) => {
                    const primaryPhone = cust.primaryPhone || cust.phones?.[0] || 'No registrado';
                    const primaryEmail = cust.primaryEmail || cust.emails?.[0] || 'No registrado';
                    return (
                      <div 
                        key={cust.id} 
                        className="bg-muted/40 hover:bg-muted/70 border rounded-xl p-3 text-xs space-y-2 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <h4 className="font-bold text-foreground text-sm leading-tight">
                                {cust.name || 'Cliente sin nombre'}
                              </h4>
                              {cust.company && (
                                <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3 shrink-0" />
                                  {cust.company}
                                </p>
                              )}
                            </div>
                            {cust.matchedBy && (
                              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                                {cust.matchedBy}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted-foreground">
                            <div>
                              <span className="block font-medium text-[10px] uppercase tracking-wider text-muted-foreground/70">Teléfono:</span>
                              <span className="font-mono text-foreground">{primaryPhone}</span>
                            </div>
                            <div>
                              <span className="block font-medium text-[10px] uppercase tracking-wider text-muted-foreground/70">NIT:</span>
                              <span className="font-mono text-foreground">{cust.nit || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="block font-medium text-[10px] uppercase tracking-wider text-muted-foreground/70">Correo:</span>
                              <span className="font-mono text-foreground truncate block">{primaryEmail}</span>
                            </div>
                            {(cust.city || cust.address) && (
                              <div className="col-span-2 text-[10px] text-muted-foreground/80 truncate">
                                📍 {[cust.address, cust.city].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                          <button
                            onClick={() => handleApplyCustomerToSimulator(cust)}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                            title="Establecer este cliente como el remitente de WhatsApp"
                          >
                            <User className="w-3 h-3" /> Simular como Remitente
                          </button>
                          <button
                            onClick={() => handleAskAgentAboutCustomer(cust)}
                            className="py-1.5 px-2.5 bg-background hover:bg-muted border text-foreground rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                            title="Preguntar al agente sobre este cliente"
                          >
                            <Bot className="w-3 h-3 text-emerald-600" /> Consultar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl">
                  No se encontraron coincidencias para <strong>"{dbSearchTerm}"</strong> en el campo seleccionado.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barra de Simulación del Remitente (Cliente que escribe por WhatsApp) */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Remitente de WhatsApp (Quién escribe):
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            El agente cruza teléfono, correo, empresa, nombre y NIT contra la base de datos automáticamente
          </span>
        </div>

        {/* Preset chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground text-[11px] whitespace-nowrap font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Clientes precargados:
          </span>
          {presetCustomers.map((pc, idx) => {
            const isSelected = simulatedPhone === pc.phone;
            return (
              <button
                key={idx}
                onClick={() => handleSelectPreset(pc)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border-border'
                }`}
              >
                <span>{pc.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                  ({pc.phone || 'Sin tel'})
                </span>
              </button>
            );
          })}
        </div>

        {/* Inputs multicriterio: teléfono, nombre, empresa, correo, nit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5 text-xs">
            <PhoneCall className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold block leading-none">Teléfono:</span>
              <input
                type="text"
                value={simulatedPhone}
                onChange={(e) => setSimulatedPhone(e.target.value)}
                placeholder="Ej: 3112688275"
                className="bg-transparent w-full focus:outline-none font-mono text-foreground text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold block leading-none">Nombre Contacto:</span>
              <input
                type="text"
                value={simulatedName}
                onChange={(e) => setSimulatedName(e.target.value)}
                placeholder="Ej: Jorge Arbeláez"
                className="bg-transparent w-full focus:outline-none text-foreground text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold block leading-none">Empresa:</span>
              <input
                type="text"
                value={simulatedCompany}
                onChange={(e) => setSimulatedCompany(e.target.value)}
                placeholder="Ej: Copidrogas"
                className="bg-transparent w-full focus:outline-none text-foreground text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5 text-xs">
            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold block leading-none">Correo:</span>
              <input
                type="text"
                value={simulatedEmail}
                onChange={(e) => setSimulatedEmail(e.target.value)}
                placeholder="Ej: compras@copidrogas.com"
                className="bg-transparent w-full focus:outline-none font-mono text-foreground text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5 text-xs">
            <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold block leading-none">NIT / Documento:</span>
              <input
                type="text"
                value={simulatedNit}
                onChange={(e) => setSimulatedNit(e.target.value)}
                placeholder="Ej: 860000000"
                className="bg-transparent w-full focus:outline-none font-mono text-foreground text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: WhatsApp Phone Mockup (Left/Center) + Inspector/Training (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA 1: Simulador WhatsApp (8 cols en desktop) */}
        <div className="lg:col-span-8 flex flex-col h-[740px] rounded-2xl border shadow-lg overflow-hidden bg-[#efeae2] dark:bg-zinc-950">
          
          {/* WhatsApp App Bar */}
          <div className="bg-[#075E54] dark:bg-zinc-900 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-700 dark:bg-zinc-800 flex items-center justify-center font-bold text-white border border-white/20">
                  {activeAgentName.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] dark:border-zinc-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm leading-tight text-white">
                    Fusión Empaques
                  </h3>
                  <span className="bg-emerald-400/20 text-emerald-200 text-[10px] px-2 py-0.2 rounded-full font-medium">
                    Atiende: {activeAgentName} ({activeAgentDomain})
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/80 font-normal">
                  {isLoading ? 'escribiendo...' : 'en línea • Respuesta automática IA'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-white/80">
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-full text-white/90">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Trato Familiar Activo</span>
              </div>
              <button className="hover:text-white p-1" title="Llamada"><Phone className="w-4 h-4" /></button>
              <button className="hover:text-white p-1" title="Video"><Video className="w-4 h-4" /></button>
              <button className="hover:text-white p-1" title="Opciones"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Banner de Reconocimiento si el cliente fue identificado en BD */}
          {identifiedCustomer && (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-200 dark:border-emerald-800/60 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 z-10 animate-in fade-in flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-tight">
                  <strong>Cliente Reconocido en BD:</strong> {identifiedCustomer.name} {identifiedCustomer.company && identifiedCustomer.company !== identifiedCustomer.name ? `(${identifiedCustomer.company})` : ''}
                  {identifiedCustomer.phone && <span className="ml-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">📞 {identifiedCustomer.phone}</span>}
                  {identifiedCustomer.email && <span className="ml-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">✉️ {identifiedCustomer.email}</span>}
                </span>
              </div>
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {identifiedCustomer.matchedBy || 'Identificado en BD'}
              </span>
            </div>
          )}

          {/* WhatsApp Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/90 dark:bg-zinc-950/80 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-3 relative z-10">
                    <div className="bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 text-xs px-3.5 py-1.5 rounded-lg shadow-sm border border-zinc-200/60 dark:border-zinc-700 text-center max-w-[85%]">
                      <p className="font-medium">{msg.content}</p>
                      {msg.handoffInfo && (
                        <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-200/50 dark:border-emerald-800/40 text-left">
                          <span className="font-semibold">Contexto transferido sin repetir:</span> {msg.handoffInfo.extractedContext}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';

              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} relative z-10`}
                >
                  <div 
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm ${
                      isUser 
                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 rounded-tr-none' 
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-700/50'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-zinc-100 dark:border-zinc-700/60">
                        <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                          {msg.agentName || 'Agente Fusión'}
                        </span>
                        {msg.agentDomain && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-medium">
                            {msg.agentDomain}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">
                      {msg.content}
                    </p>

                    {/* Pre-cotización IA generada */}
                    {msg.preQuoteData && (
                      <div className="mt-2.5 p-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-2 text-xs text-foreground">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Pre-cotización Oficial Estructurada</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
                            {msg.preQuoteData.number}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block font-medium">Cliente:</span>
                            <span className="font-bold truncate block">{msg.preQuoteData.clientName || 'Cliente'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block font-medium">Contacto / Tel:</span>
                            <span className="font-mono">{msg.preQuoteData.clientPhone || 'No registrado'}</span>
                          </div>
                        </div>

                        {msg.preQuoteData.items && msg.preQuoteData.items.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-muted-foreground block">
                              Ítems identificados ({msg.preQuoteData.items.length}):
                            </span>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {msg.preQuoteData.items.map((item: any, i: number) => (
                                <div key={i} className="p-2 bg-background/90 rounded-lg border border-border/80 text-[11px] space-y-0.5">
                                  <div className="flex justify-between items-start font-bold">
                                    <span className="leading-tight">{item.order || i + 1}. {item.description}</span>
                                    <span className="text-amber-700 dark:text-amber-400 font-mono shrink-0 ml-2">
                                      {Number(item.quantity).toLocaleString('es-CO')} u.
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                                    {item.size && <span>📐 {item.size}</span>}
                                    {item.material && <span>📦 {item.material}</span>}
                                    {item.inks && <span>🎨 {item.inks}</span>}
                                    {item.finishes && <span>✨ {item.finishes}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="p-2 rounded bg-amber-500/15 border border-amber-500/20 text-[10.5px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span>
                            <strong>Borrador técnico listo:</strong> Los comerciales pueden ingresar costos unitarios y márgenes para emitir la cotización formal.
                          </span>
                        </div>

                        <a
                          href={`/dashboard/cotizaciones?quoteId=${msg.preQuoteData.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                        >
                          <FileText className="w-3.5 h-3.5" /> Abrir y Completar en Cotizador →
                        </a>
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isUser ? 'text-emerald-800/70 dark:text-emerald-300/70' : 'text-zinc-400'
                    }`}>
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start relative z-10">
                <div className="bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-zinc-200/50 dark:border-zinc-700 flex items-center gap-2 text-xs text-zinc-500">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  </div>
                  <span>{activeAgentName} está consultando la base de datos y respondiendo...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick prompt suggestions */}
          <div className="bg-background/80 backdrop-blur-sm border-t px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none z-10">
            <span className="text-muted-foreground whitespace-nowrap font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Pruebas rápidas:
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 bg-muted/70 hover:bg-muted rounded-full text-foreground/80 hover:text-foreground border text-[11px] transition-colors"
              >
                {p.length > 38 ? p.substring(0, 38) + '...' : p}
              </button>
            ))}
          </div>

          {/* WhatsApp Bottom Input Bar */}
          <div className="bg-[#f0f2f5] dark:bg-zinc-900 px-3 py-2.5 border-t flex items-center gap-2 z-10">
            <button
              onClick={handleGeneratePreQuote}
              disabled={isLoading || isGeneratingPreQuote || messages.length <= 1}
              className="h-10 px-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 text-xs font-bold shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Generar o estructurar Pre-cotización con IA a partir de esta conversación"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isGeneratingPreQuote ? 'Extrayendo...' : 'Pre-cotizar (IA)'}</span>
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                placeholder={`Escribe a ${activeAgentName} como cliente en WhatsApp...`}
                className="w-full bg-white dark:bg-zinc-800 text-foreground placeholder:text-muted-foreground border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
            </div>
            
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* COLUMNA 2: Inspector del Sistema, Memoria y Agentes (4 cols en desktop) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card: Protocolo de Venta Consultiva y Pedagogía */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Venta Consultiva & Pedagogía
              </h3>
              <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                Regla Activa
              </span>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Principio: Prohibido Apresurarse a Cotizar</span>
              </div>
              <p className="text-blue-800/80 dark:text-blue-300 text-[11px] leading-relaxed">
                El agente indaga las necesidades reales y <strong>educa al cliente</strong> sobre cómo se fabrican los empaques (troqueles, montaje, calibres, ondas C vs E, escalas de volumen) antes de emitir una pre-cotización.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Checklist de Información Suficiente:
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">1. Propósito y peso a contener</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">2. Dimensiones (Largo x Ancho x Alto)</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">3. Material / Onda recomendada</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">4. Tintas / Impresión requerida</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">5. Cantidad y escalas de tiraje</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-medium">6. Ciudad de entrega / Logística</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Pre-cotizaciones Generadas por IA para el Cotizador */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Pre-cotizaciones en Cotizador
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                sessionPreQuotes.length > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {sessionPreQuotes.length} en borrador
              </span>
            </div>

            {sessionPreQuotes.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessionPreQuotes.map((pq) => (
                  <div key={pq.id} className="p-3 bg-amber-500/5 dark:bg-amber-950/30 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-amber-800 dark:text-amber-300 font-mono">{pq.number}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded border">
                        {pq.items?.length || 0} ítem(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      👤 {pq.clientName || 'Cliente'}
                    </p>
                    <a 
                      href={`/dashboard/cotizaciones?quoteId=${pq.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline pt-0.5"
                    >
                      <span>Abrir y completar en Cotizador</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground text-center space-y-1">
                <p className="font-medium text-foreground">Aún no se ha generado pre-cotización</p>
                <p className="text-[11px]">
                  Pide una cotización en el chat o pulsa <strong>"Pre-cotizar (IA)"</strong> para estructurar los ítems, cantidades y medidas automáticamente.
                </p>
              </div>
            )}
          </div>
          
          {/* Card 1: Ficha del Cliente Reconocido */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                Ficha del Cliente en Base de Datos
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                identifiedCustomer 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {identifiedCustomer ? 'Reconocido' : 'Esperando consulta'}
              </span>
            </div>

            {identifiedCustomer ? (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                      {identifiedCustomer.name}
                    </h4>
                    <p className="text-emerald-800/80 dark:text-emerald-300 font-medium">
                      {identifiedCustomer.company}
                    </p>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Cliente de la Casa
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-500/10 space-y-1 text-[11px] text-emerald-900/80 dark:text-emerald-300/80 font-mono">
                  <p>📞 Teléfono(s): {identifiedCustomer.phones?.join(', ') || identifiedCustomer.phone || 'No registrado'}</p>
                  {(identifiedCustomer.emails?.length || identifiedCustomer.email) && (
                    <p>✉️ Correo(s): {identifiedCustomer.emails?.join(', ') || identifiedCustomer.email}</p>
                  )}
                  {identifiedCustomer.nit && <p>🆔 NIT / Doc: {identifiedCustomer.nit}</p>}
                  {(identifiedCustomer.address || identifiedCustomer.city) && (
                    <p>📍 Ubicación: {[identifiedCustomer.address, identifiedCustomer.city].filter(Boolean).join(', ')}</p>
                  )}
                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold font-sans pt-0.5">
                    🔍 Coincidencia: {identifiedCustomer.matchedBy}
                  </p>
                </div>

                <div className="bg-white/60 dark:bg-zinc-900/60 p-2 rounded border border-emerald-500/10 text-[11px] text-emerald-800 dark:text-emerald-200">
                  ✨ <strong>Instrucción activa para la IA:</strong> Tratar a don/doña {identifiedCustomer.name} con cariño, cercanía y familiaridad por ser cliente de confianza.
                </div>
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl p-4 text-xs text-muted-foreground text-center space-y-1">
                <Search className="w-5 h-5 mx-auto text-muted-foreground/60 mb-1" />
                <p className="font-medium text-foreground">Consulta automática activada</p>
                <p className="text-[11px]">
                  Al enviar un mensaje con el número <strong>{simulatedPhone || 'registrado'}</strong> o nombre, el agente buscará entre los 1.600 clientes de Fusión y activará el saludo de bienvenida familiar.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Agente Activo y Cambio Manual */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Agente en Control
              </h3>
              <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                Activo
              </span>
            </div>

            <div className="bg-muted/40 border rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {activeAgentName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base truncate leading-tight">{activeAgentName}</h4>
                <p className="text-xs text-muted-foreground font-medium">Área: {activeAgentDomain}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Regla de Trato Familiar Inyectada</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Cambiar o Forzar Agente Manualmente:
              </label>
              <select
                value={activeAgentId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setActiveAgentId(newId);
                  const found = availableAgents.find(a => a.id === newId);
                  if (found) {
                    setActiveAgentName(found.name);
                    setActiveAgentDomain(found.domain);
                    setMessages(prev => [
                      ...prev,
                      {
                        id: 'force-agent-' + Date.now(),
                        sender: 'system',
                        content: `⚡ Agente cambiado manualmente a: ${found.name} (${found.domain}). Toda respuesta siguiente usará su entrenamiento real.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                  }
                }}
                className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                {availableAgents.map(ag => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} — {ag.domain} ({ag.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Inspeccionar Prompt de Entrenamiento */}
            {activeAgentFullData && (
              <div className="border-t pt-3">
                <button
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Ver Prompt y Personalidad Real ({activeAgentFullData.systemPrompt?.length || 0} caracteres)
                  </span>
                  {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPromptDetails && (
                  <div className="mt-2 bg-muted/60 rounded-lg p-2.5 max-h-48 overflow-y-auto text-[11px] font-mono whitespace-pre-wrap border leading-relaxed text-muted-foreground">
                    {activeAgentFullData.systemPrompt}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Contexto acumulado y memoria transferida */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              Memoria y Contexto Acumulado
            </h3>
            
            {transferredContext ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Datos que el agente ya conoce (no volverá a preguntar):
                </p>
                <p className="font-mono text-[11.5px] bg-background/60 p-2 rounded border border-emerald-500/10">
                  {transferredContext}
                </p>
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground text-center">
                Aún no se ha realizado ninguna transferencia de datos en esta sesión. En cuanto el cliente dé información y el comercial lo transfiera, aquí se verá el contexto que heredará el siguiente agente.
              </div>
            )}
          </div>

          {/* Card 4: Historial de Handoffs de la sesión */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Cadena de Traspasos (Timeline)
            </h3>

            {handoffHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin transferencias aún en la conversación actual.
              </p>
            ) : (
              <div className="space-y-2">
                {handoffHistory.map((h, i) => (
                  <div key={i} className="border rounded-lg p-2.5 text-xs bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-emerald-600 flex items-center gap-1">
                        {h.from} ➔ {h.to}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{h.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">Traspasó:</span> {h.context}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guía explicativa */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Reconocimiento de Clientes Antiguos
            </div>
            <p className="leading-relaxed text-[11.5px]">
              Al ingresar o seleccionar un cliente registrado (ej: <strong>Don Jorge Arbeláez</strong> o <strong>Copidrogas</strong>), los agentes consultan en milisegundos la colección de clientes de Firestore y reciben la instrucción de saludar reconociendo la trayectoria del cliente para hacerlo sentir en familia.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
