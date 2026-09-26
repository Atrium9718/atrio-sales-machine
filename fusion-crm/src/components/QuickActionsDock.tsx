import React, { useEffect, useState } from 'react';
import { Bot, ChevronLeft, EyeOff, MessageSquare, Plus, X, Zap } from 'lucide-react';
import ChatWidget from './ChatWidget';
import { InterventorFloatingButton } from './interventoria/InterventorFloatingButton';

const HIDDEN_KEY = 'fusion_quick_actions_hidden';

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(v: boolean) {
  try {
    if (v) localStorage.setItem(HIDDEN_KEY, '1');
    else localStorage.removeItem(HIDDEN_KEY);
  } catch {
    /* sin almacenamiento: solo dura la sesión */
  }
}

type Panel = 'none' | 'assistant' | 'interventor';

/**
 * Un solo botón flotante que agrupa los accesos rápidos del súper admin
 * (nueva oportunidad, asistente IA e Interventor). Antes eran tres botones
 * sueltos que tapaban el contenido; ahora se despliegan al tocarlo y se
 * pueden esconder en una pestañita del borde.
 */
export function QuickActionsDock({ onNewOpportunity }: { onNewOpportunity: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState<boolean>(readHidden);
  const [panel, setPanel] = useState<Panel>('none');

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const openPanel = (p: Panel) => {
    setExpanded(false);
    setPanel(p);
  };

  const hide = () => {
    setExpanded(false);
    setHidden(true);
    writeHidden(true);
  };

  const show = () => {
    setHidden(false);
    writeHidden(false);
  };

  const actions = [
    { key: 'new', label: 'Nueva oportunidad', hint: 'N', icon: Plus, className: 'bg-primary text-primary-foreground', onClick: () => { setExpanded(false); onNewOpportunity(); } },
    { key: 'assistant', label: 'Asistente IA', icon: MessageSquare, className: 'bg-indigo-600 text-white', onClick: () => openPanel('assistant') },
    { key: 'interventor', label: 'Interventor', icon: Bot, className: 'bg-slate-950 text-amber-300 border border-amber-500', onClick: () => openPanel('interventor') },
  ];

  return (
    <>
      <ChatWidget hideLauncher open={panel === 'assistant'} onOpenChange={(v) => setPanel(v ? 'assistant' : 'none')} />
      <InterventorFloatingButton hideLauncher open={panel === 'interventor'} onOpenChange={(v) => setPanel(v ? 'interventor' : 'none')} />

      {panel === 'none' && hidden && (
        <button
          onClick={show}
          className="fixed right-0 bottom-24 md:bottom-8 z-40 flex items-center pl-1 pr-0.5 py-3 rounded-l-lg bg-card/90 border border-r-0 border-border text-muted-foreground shadow-md hover:text-foreground hover:pl-2 transition-all"
          title="Mostrar accesos rápidos"
          aria-label="Mostrar accesos rápidos"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {panel === 'none' && !hidden && (
        <>
          {expanded && (
            <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} aria-hidden="true" />
          )}
          <div className="fixed right-4 md:right-6 bottom-20 md:bottom-6 z-40 flex flex-col items-end gap-2">
            {expanded && (
              <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.key}
                      onClick={a.onClick}
                      className="flex items-center gap-2.5 group"
                    >
                      <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground shadow-sm">
                        {a.label}
                        {a.hint && <kbd className="ml-1.5 text-[10px] text-muted-foreground font-mono">{a.hint}</kbd>}
                      </span>
                      <span className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform ${a.className}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={hide}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground bg-card/90 border border-border hover:text-foreground shadow-sm"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Ocultar botones
                </button>
              </div>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30"
              title={expanded ? 'Cerrar accesos rápidos' : 'Accesos rápidos'}
              aria-label={expanded ? 'Cerrar accesos rápidos' : 'Accesos rápidos'}
              aria-expanded={expanded}
            >
              {expanded ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </button>
          </div>
        </>
      )}
    </>
  );
}
