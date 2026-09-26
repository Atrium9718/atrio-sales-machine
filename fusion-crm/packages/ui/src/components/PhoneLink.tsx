import React, { useState } from 'react';
import { Phone, Clock, ExternalLink } from 'lucide-react';
import { getSoftphoneClient } from '../../../../apps/web/src/features/voice/sip/client';

export interface PhoneLinkProps {
  phone: string;
  name?: string;
  customerId?: string;
  className?: string;
  showIcon?: boolean;
  lastCallInfo?: {
    date: string;
    duration?: string;
    disposition?: string;
  } | null;
}

export function formatColombianPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');

  // Móvil Colombia: 3XXXXXXXXX -> +57 3XX XXX XXXX
  if (digits.length === 10 && digits.startsWith('3')) {
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  // Móvil con indicativo 57: 573XXXXXXXXX
  if (digits.length === 12 && digits.startsWith('573')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  // Fijo Bogotá: 601XXXXXXX
  if (digits.length === 10 && digits.startsWith('60')) {
    return `+57 (${digits.slice(1, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return rawPhone;
}

export const PhoneLink: React.FC<PhoneLinkProps> = ({
  phone,
  name,
  customerId,
  className = '',
  showIcon = true,
  lastCallInfo,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted = formatColombianPhone(phone);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const client = getSoftphoneClient();
      client.makeCall(phone, name, { customerId, customerName: name });
    } catch (err) {
      console.warn('Click-to-call ejecutado vía URI sip/tel fallback', err);
      window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
  };

  return (
    <div
      className="relative inline-flex items-center group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold px-1 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
        title={`Click-to-call: Marcar ${formatted}`}
      >
        {showIcon && <Phone className="w-3 h-3 shrink-0 text-primary group-hover:scale-110 transition-transform" />}
        <span>{formatted || phone}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 w-56 p-2 bg-popover text-popover-foreground border border-border shadow-lg rounded-md text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="font-bold flex items-center justify-between gap-1 text-foreground mb-1">
            <span>{formatted}</span>
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" /> Marcar
            </span>
          </div>
          {name && <div className="text-muted-foreground truncate">{name}</div>}
          {lastCallInfo ? (
            <div className="mt-1 pt-1 border-t border-border/60 text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Última llamada: {lastCallInfo.date}</span>
            </div>
          ) : (
            <div className="mt-1 pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
              Haz clic para llamar desde el softphone
            </div>
          )}
        </div>
      )}
    </div>
  );
};
