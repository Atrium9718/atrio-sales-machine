import React, { useState, useEffect } from 'react';
import {
  Phone,
  Delete,
  RotateCcw,
  Search,
  User,
  Building,
  Shield,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useSoftphone } from '../sip/SoftphoneContext';
import { voiceRpc } from '../sip/rpc';
import { formatColombianPhone } from '../../../../../../packages/ui/src/components/PhoneLink';

export interface VoiceDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination?: string;
}

export const VoiceDialerModal: React.FC<VoiceDialerModalProps> = ({
  isOpen,
  onClose,
  initialDestination = '',
}) => {
  const { makeCall } = useSoftphone();
  const [inputVal, setInputVal] = useState(initialDestination);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [lastDialedNumber, setLastDialedNumber] = useState<string>('');

  useEffect(() => {
    if (initialDestination) {
      setInputVal(initialDestination);
    }
  }, [initialDestination]);

  // Cargar último número marcado desde localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const last = localStorage.getItem('fusion_voice_last_dialed');
      if (last) setLastDialedNumber(last);
    }
  }, [isOpen]);

  // Búsqueda en vivo de contactos y clientes
  useEffect(() => {
    if (!inputVal.trim() || inputVal.length < 2) {
      setSearchResults([]);
      setSelectedContact(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await voiceRpc.contacts.search(inputVal);
        setSearchResults(results);
        if (results.length > 0) {
          setSelectedContact(results[0]);
        } else {
          setSelectedContact(null);
        }
      } catch {
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputVal]);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    setInputVal((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleCall = async (dest?: string, name?: string, context?: any) => {
    const target = (dest || inputVal).trim();
    if (!target) return;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fusion_voice_last_dialed', target);
    }

    onClose();
    await makeCall(target, name || selectedContact?.name, context || selectedContact);
  };

  const handleRedial = () => {
    if (lastDialedNumber) {
      setInputVal(lastDialedNumber);
    }
  };

  const keyPadDigits = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-[360px] max-w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-primary" />
              <span>Marcador Telefónico</span>
            </h3>
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>CallerID: +57 (601) 390-4820 (Troncal PBX)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campo de marcación y búsqueda */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCall();
              }}
              placeholder="Número o nombre..."
              className="w-full text-center text-xl font-bold font-mono tracking-wider py-3 px-8 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              autoFocus
            />

            {inputVal && (
              <button
                type="button"
                onClick={handleBackspace}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                title="Borrar dígito"
              >
                <Delete className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Contacto detectado en tiempo real */}
          {selectedContact && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedContact.name?.charAt(0) || 'C'}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-foreground truncate">{selectedContact.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {selectedContact.customerName || selectedContact.company || 'Contacto registrado'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCall(selectedContact.phone, selectedContact.name, selectedContact)}
                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 shrink-0 hover:bg-primary/90"
              >
                <span>Llamar</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Resultados de búsqueda si hay varios */}
          {searchResults.length > 1 && (
            <div className="max-h-24 overflow-y-auto space-y-1 border-t border-border/60 pt-1 text-xs">
              {searchResults.slice(1).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setInputVal(c.phone);
                    setSelectedContact(c);
                  }}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-muted/80 flex items-center justify-between"
                >
                  <span className="font-medium truncate">{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{formatColombianPhone(c.phone)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Teclado numérico 4x3 */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {keyPadDigits.map((k) => (
              <button
                key={k.num}
                type="button"
                onClick={() => handleDigitClick(k.num)}
                className="flex flex-col items-center justify-center h-12 rounded-2xl bg-card hover:bg-primary/10 border border-border hover:border-primary/40 transition-colors active:scale-95 shadow-sm group"
              >
                <span className="text-lg font-bold font-mono text-foreground group-hover:text-primary">
                  {k.num}
                </span>
                {k.letters && (
                  <span className="text-[8px] font-semibold text-muted-foreground group-hover:text-primary/80 tracking-widest -mt-1">
                    {k.letters}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Botones inferiores: Rellamada y Llamar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleRedial}
              disabled={!lastDialedNumber}
              className="flex-1 py-3 px-3 rounded-2xl bg-muted hover:bg-muted/80 disabled:opacity-40 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              title={lastDialedNumber ? `Rellamar a ${lastDialedNumber}` : 'Sin llamadas previas'}
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <span>Rellamada</span>
            </button>

            <button
              type="button"
              onClick={() => handleCall()}
              disabled={!inputVal.trim()}
              className="flex-[2] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>Llamar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
