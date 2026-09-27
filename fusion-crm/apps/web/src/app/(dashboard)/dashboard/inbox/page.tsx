"use client";

import * as React from 'react';
import { Inbox, Settings2, Sparkles } from 'lucide-react';
import { ConversationsPanel } from './components/ConversationsPanel';
import { SimulatorPanel } from './components/SimulatorPanel';
import { AiConfigPanel } from './components/AiConfigPanel';

const TABS = [
  { key: 'conversations', label: 'Conversaciones', icon: Inbox },
  { key: 'simulator', label: 'Simulador', icon: Sparkles },
  { key: 'config', label: 'Configuración de la IA', icon: Settings2 },
] as const;

/**
 * Bandeja omnicanal: WhatsApp, Instagram, Messenger y chat web en un solo lugar.
 * La IA atiende; el equipo ve primero lo que necesita a una persona o está por aprobar.
 */
export default function InboxPage() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['key']>('conversations');

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7.5rem)] min-h-0">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Bandeja de entrada</h1>
          <p className="text-xs text-muted-foreground">WhatsApp, Instagram, Messenger y chat web. La IA atiende; aquí ves lo que necesita a tu equipo.</p>
        </div>
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'conversations' && <ConversationsPanel />}
        {tab === 'simulator' && <SimulatorPanel />}
        {tab === 'config' && <AiConfigPanel />}
      </div>
    </div>
  );
}
