import * as React from 'react';
import { PhoneOutgoing } from 'lucide-react';
import { useSoftphone } from '../../../apps/web/src/features/voice/sip/SoftphoneContext';
import { notify } from '../../lib/notify';

/** Marca el número desde el teléfono del navegador del asesor. */
export function CallBackButton({ number, label = 'Devolver', compact = false }: { number: string; label?: string; compact?: boolean }) {
  const { state, makeCall, activeCall } = useSoftphone();
  const ready = state === 'REGISTERED' || state === 'MIRROR_MODE';
  const busy = Boolean(activeCall);
  const title = !ready ? 'Tu teléfono del navegador no está conectado' : busy ? 'Ya estás en una llamada' : `Llamar a ${number}`;
  return (
    <button
      type="button"
      title={title}
      disabled={!ready || busy || !number}
      onClick={(e) => {
        e.stopPropagation();
        makeCall(number).catch((err) => notify(`No se pudo llamar: ${err?.message || err}`, 'error'));
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-background font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${compact ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm'}`}
    >
      <PhoneOutgoing className="w-4 h-4" />
      {label}
    </button>
  );
}
