import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import Markdown from 'react-markdown';
import { useFusionAuth } from '@/context/FusionAuthContext';

export default function ChatWidget() {
  const { isSuperAdmin } = useFusionAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState('');

  if (!isSuperAdmin) return null;

  useEffect(() => {
    let sid = localStorage.getItem('fusion_chat_session');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('fusion_chat_session', sid);
    }
    setSessionId(sid);
    
    // Check initial sync
    fetch('/api/widget/sync/' + sid)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([
            { id: 1, sender: 'bot', text: '¡Hola! Soy el asistente de Fusión. Para darte un servicio más personalizado, ¿me podrías decir tu nombre?', time: new Date().toISOString() }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Polling when open
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    const interval = setInterval(() => {
      fetch('/api/widget/sync/' + sessionId)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > messages.length) {
            setMessages(data.messages);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, sessionId, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('fusion_chat_history', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), sender: 'user', text: input, time: 'Ahorita' };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let context = {};
      if (typeof window !== 'undefined') {
        const storedProjects = localStorage.getItem('fusion_projects');
        const storedInventory = localStorage.getItem('fusion_inventory');
        context = {
          projects: storedProjects ? JSON.parse(storedProjects) : [],
          inventory: storedInventory ? JSON.parse(storedInventory) : []
        };
      }

      const res = await fetch('/api/widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: newMsg.text,
          history: messages.map(m => ({ sender: m.sender, text: m.text })),
          context
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error en el servidor');
      }
      const data = await res.json();
      
      
    if (data.messages) {
      setMessages(data.messages);
    } else if (data.reply) {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'bot', text: data.reply, time: new Date().toISOString() }]);
    }

    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || 'Lo siento, hubo un error conectando con mis servidores (IA no disponible).';
      if (errorMsg === 'Load failed' || errorMsg === 'Failed to fetch' || errorMsg.includes('Timeout')) {
        errorMsg = 'No me he podido conectar a los servidores. Por favor verifica tu conexión o intenta más tarde.';
      }
      if (err.message && err.message.includes('GEMINI_API_KEY')) {
         errorMsg = 'No puedo responder en este momento porque no se ha configurado la clave GEMINI_API_KEY en el servidor.';
      }
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'bot', text: errorMsg, time: 'Ahorita' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 sm:bottom-6 right-36 sm:right-40 w-11 h-11 sm:w-14 sm:h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all z-40 ${isOpen ? 'hidden' : 'flex'}`}
        title="Chat de Soporte IA"
      >
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[24rem] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden max-h-[75vh] sm:max-h-[500px]" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Bot className="w-4 h-4" /></div>
               <div>
                  <h3 className="font-bold text-sm">Soporte Fusión</h3>
                  <div className="text-[10px] flex items-center gap-1 opacity-90"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> En línea (Agente IA)</div>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/10">
            <div className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold my-2">Hoy</div>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${(msg.sender === 'user') ? 'justify-end' : 'justify-start'}`}>
                {(msg.sender === 'bot' || msg.sender === 'human') && <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><Bot className="w-3 h-3"/></div>}
                
                <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${(msg.sender === 'user') ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none border border-border'}`}>
                   {(msg.sender === 'bot' || msg.sender === 'human') ? (
                     <div className="markdown-body text-sm font-medium leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                       <Markdown>{msg.text}</Markdown>
                     </div>
                   ) : (
                     msg.text
                   )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><Bot className="w-3 h-3"/></div>
                <div className="p-3 rounded-2xl bg-muted text-foreground rounded-tl-none border border-border flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-card border-t border-border shrink-0 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-muted px-3 py-2 rounded-full text-sm border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button type="submit" disabled={!input.trim()} className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-indigo-700 transition-colors">
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
