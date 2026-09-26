'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Phone, Instagram, Facebook, Link as LinkIcon, UserPlus, Ban, Search } from 'lucide-react';

export default function IdentidadesPage() {
  const [identities, setIdentities] = useState<any[]>([]);

  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});

  const handleLink = (identityId: string, contactId: string) => {
    // In a real app, this would call an API
    setIdentities(identities.filter(i => i.id !== identityId));
  };

  const handleCreateNew = (identityId: string) => {
    // API call to create new Client + Contact
    setIdentities(identities.filter(i => i.id !== identityId));
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP': return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'EMAIL': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'MESSENGER': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'VOICE': return <Phone className="w-4 h-4 text-purple-500" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Identidades sin Vincular</h1>
          <p className="text-muted-foreground text-sm">Resuelve identidades huérfanas de diferentes canales para mantener un contexto unificado.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
          <LinkIcon className="w-4 h-4" /> Vincular sugerencias altas ({">80%"})
        </button>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/20 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar por identificador o nombre..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {identities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <LinkIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No hay identidades pendientes por resolver.</p>
            </div>
          ) : (
            identities.map((identity) => (
              <div key={identity.id} className="border border-border rounded-lg p-4 bg-background flex flex-col md:flex-row gap-6">
                
                {/* Identity Info */}
                <div className="md:w-1/3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(identity.channelType)}
                    <span className="font-bold text-sm">{identity.displayName || 'Desconocido'}</span>
                  </div>
                  <div className="text-xs font-mono bg-muted p-1.5 rounded text-muted-foreground break-all">
                    {identity.normalizedIdentifier}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{identity.messageCount} mensajes</span>
                    <span>Último: Hace 1h</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handleCreateNew(identity.id)}
                      className="flex-1 border border-primary text-primary hover:bg-primary/5 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3 h-3" /> Crear Nuevo
                    </button>
                    <button 
                      className="border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                      title="Ignorar o Bloquear"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Candidates */}
                <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Candidatos Sugeridos</h3>
                  
                  {identity.candidates.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {identity.candidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {candidate.name}
                              {candidate.similarity >= 80 && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded font-bold">
                                  {candidate.similarity}% SIMILITUD
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{candidate.company}</div>
                          </div>
                          <button 
                            onClick={() => handleLink(identity.id, candidate.id)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" /> Vincular
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed border-border">
                      No se encontraron candidatos probables.
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
