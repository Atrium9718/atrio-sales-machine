import React, { useState, useEffect } from 'react';
import { 
  Bot, Settings, Power, Database, Briefcase, Calculator, 
  Layers, Package, PhoneCall, Plus, BrainCircuit, X, Save,
  History, MessageSquare, Trash2, Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';

const iconMap: Record<string, any> = {
  COMMERCIAL: Briefcase,
  QUOTING: Calculator,
  PRODUCTION: Layers,
  CAPACITY: Layers,
  INVENTORY: Package,
  FINANCE: DollarSignIcon,
  SERVICE: PhoneCall,
  DATA: Database,
  MANAGEMENT: Settings,
};

function DollarSignIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export default function AgentesDashboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  
  // Tabs in train modal: 'RULES' or 'MEMORY'
  const [trainTab, setTrainTab] = useState<'RULES' | 'MEMORY'>('RULES');
  const [newMemory, setNewMemory] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ASSISTANT',
    domain: 'MANAGEMENT',
    systemPrompt: ''
  });

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setAgents(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({ name: '', description: '', type: 'ASSISTANT', domain: 'MANAGEMENT', systemPrompt: '' });
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrainAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: formData.systemPrompt })
      });
      if (res.ok) {
        setIsTrainModalOpen(false);
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newMemory.trim()) return;
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemory.trim() })
      });
      if (res.ok) {
        const addedMemory = await res.json();
        const updatedAgent = { ...selectedAgent, memories: [...(selectedAgent.memories || []), addedMemory] };
        setSelectedAgent(updatedAgent);
        setAgents(prev => prev.map(a => a.id === selectedAgent.id ? updatedAgent : a));
        setNewMemory('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!selectedAgent) return;
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/memory/${memoryId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedAgent = { 
          ...selectedAgent, 
          memories: selectedAgent.memories.filter((m: any) => m.id !== memoryId) 
        };
        setSelectedAgent(updatedAgent);
        setAgents(prev => prev.map(a => a.id === selectedAgent.id ? updatedAgent : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTrainModal = (agent: any) => {
    setSelectedAgent(agent);
    setFormData({ ...formData, systemPrompt: agent.systemPrompt || '' });
    setTrainTab('RULES');
    setIsTrainModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Agentes IA</h1>
          <p className="text-muted-foreground mt-1">Crea, gestiona y entrena a tus asistentes de inteligencia artificial.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/agentes/propuestas" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md shadow-sm font-medium hover:bg-secondary/80 flex items-center gap-2">
            <Bot className="w-4 h-4" /> Propuestas
          </Link>
          <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Crear Agente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Cargando agentes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {agents.map(agent => {
            const Icon = iconMap[agent.domain] || Bot;
            const memoryCount = (agent.memories || []).length;
            
            return (
              <div key={agent.id} className={`bg-card border rounded-xl overflow-hidden shadow-sm transition-all ${!agent.isActive ? 'opacity-60 grayscale' : 'hover:border-primary/50 hover:shadow-md'}`}>
                <div className="p-5 border-b border-border bg-muted/10 relative">
                  <div className="absolute top-4 right-4 flex items-center">
                    <button
                      onClick={() => toggleStatus(agent.id, agent.isActive)}
                      className={`p-1.5 rounded-full transition-colors ${agent.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      title={agent.isActive ? 'Desactivar' : 'Activar'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${agent.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 h-8 line-clamp-2">{agent.description || 'Sin descripción'}</p>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Tipo</p>
                      <p className="font-medium text-sm">{agent.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Memorias</p>
                      <p className="font-medium text-sm flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        {memoryCount} aprendidas
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border">
                    <button 
                      onClick={() => openTrainModal(agent)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-bold transition-colors"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      Entrenar Agente
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {agents.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-xl">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">No tienes agentes activos</h3>
              <p className="text-muted-foreground mb-4">Crea tu primer agente para automatizar tareas en tu empresa.</p>
              <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Crear mi primer Agente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Agente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Crear Nuevo Agente
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <form id="create-agent-form" onSubmit={handleCreateAgent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre del Agente</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" placeholder="Ej. Asistente Comercial" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descripción</label>
                  <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" placeholder="Qué hace este agente..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tipo</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                      <option value="CONVERSATIONAL">Conversacional</option>
                      <option value="ANALYST">Analista</option>
                      <option value="PLANNER">Planificador</option>
                      <option value="MONITOR">Monitor</option>
                      <option value="ASSISTANT">Asistente</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Dominio</label>
                    <select value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                      <option value="COMMERCIAL">Comercial</option>
                      <option value="QUOTING">Cotizaciones</option>
                      <option value="PRODUCTION">Producción</option>
                      <option value="INVENTORY">Inventario</option>
                      <option value="FINANCE">Finanzas</option>
                      <option value="SERVICE">Servicio al Cliente</option>
                      <option value="DATA">Datos</option>
                      <option value="MANAGEMENT">Gestión / General</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Instrucciones Iniciales (Prompt base)</label>
                  <textarea rows={4} value={formData.systemPrompt} onChange={e => setFormData({...formData, systemPrompt: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background font-mono resize-none" placeholder="Instrucciones para el comportamiento inicial..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-2 mt-auto">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-muted rounded-md transition-colors">Cancelar</button>
              <button form="create-agent-form" type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">Crear Agente</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrenar Agente */}
      {isTrainModalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Entrenar: {selectedAgent.name}</h3>
                  <p className="text-xs text-muted-foreground">Configura reglas estáticas y revisa lo que el agente ha aprendido dinámicamente.</p>
                </div>
              </div>
              <button onClick={() => setIsTrainModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-border shrink-0">
              <button 
                onClick={() => setTrainTab('RULES')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${trainTab === 'RULES' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Reglas Base (System Prompt)
              </button>
              <button 
                onClick={() => setTrainTab('MEMORY')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${trainTab === 'MEMORY' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Memoria y Experiencia
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full">{(selectedAgent.memories || []).length}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/5 p-4 flex flex-col">
              
              {/* TAB: RULES */}
              {trainTab === 'RULES' && (
                <form id="train-agent-form" onSubmit={handleTrainAgent} className="h-full flex flex-col space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm mb-2 shrink-0">
                    <strong>ℹ️ Reglas Estáticas:</strong> Estas son las directrices principales de tu agente. Define su personalidad, su formato de respuesta y las reglas que NUNCA debe romper.
                  </div>
                  <div className="space-y-1.5 flex flex-col flex-1">
                    <label className="text-sm font-bold">Instrucciones del Sistema (System Prompt) <span className="text-red-500">*</span></label>
                    <textarea 
                      required 
                      value={formData.systemPrompt} 
                      onChange={e => setFormData({...formData, systemPrompt: e.target.value})} 
                      className="w-full flex-1 px-4 py-3 border border-input rounded-md text-sm bg-background font-mono resize-none leading-relaxed shadow-inner" 
                      placeholder="Ej. Eres un experto en finanzas corporativas..."
                    ></textarea>
                  </div>
                </form>
              )}

              {/* TAB: MEMORY */}
              {trainTab === 'MEMORY' && (
                <div className="h-full flex flex-col space-y-6">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm shrink-0">
                    <strong>💡 Aprendizaje Continuo:</strong> El agente extraerá datos clave de las conversaciones con usuarios y los guardará aquí automáticamente. Esta experiencia se suma como contexto para no olvidar detalles importantes.
                  </div>
                  
                  {/* Simulate adding experience manually for demonstration */}
                  <form onSubmit={handleAddMemory} className="flex gap-2 shrink-0">
                    <div className="relative flex-1">
                      <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <input 
                        value={newMemory}
                        onChange={e => setNewMemory(e.target.value)}
                        placeholder="Simular un nuevo aprendizaje o preferencia del cliente..." 
                        className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-md bg-background"
                      />
                    </div>
                    <button type="submit" disabled={!newMemory.trim()} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-bold hover:bg-secondary/80 disabled:opacity-50">
                      Añadir Experiencia
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Memoria a Largo Plazo</h4>
                    {(selectedAgent.memories || []).length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                        <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">El agente aún no ha extraído conocimientos de ninguna conversación.</p>
                      </div>
                    ) : (
                      (selectedAgent.memories || []).map((mem: any) => (
                        <div key={mem.id} className="bg-background border border-border p-3 rounded-lg flex items-start justify-between gap-4 shadow-sm hover:border-amber-500/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-amber-100 text-amber-600 p-1 rounded-md">
                              <Lightbulb className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{mem.content}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 uppercase">Aprendido el {new Date(mem.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteMemory(mem.id)} className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-background flex justify-between items-center shrink-0">
              <span className="text-xs text-muted-foreground">Última actualización: {new Date(selectedAgent.updatedAt).toLocaleString()}</span>
              <div className="flex gap-2">
                <button onClick={() => setIsTrainModalOpen(false)} className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-muted rounded-md transition-colors">Cerrar</button>
                {trainTab === 'RULES' && (
                  <button form="train-agent-form" type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Guardar Reglas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
