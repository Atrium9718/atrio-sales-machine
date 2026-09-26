import React from 'react';
import { X, Building, Phone, Mail, MapPin, UserCheck, FileText, PlusCircle, MessageSquare } from 'lucide-react';

interface Props {
  client: any;
  onClose: () => void;
  onNewQuote?: (client: any) => void;
}

export function ClientDetailModal({ client, onClose, onNewQuote }: Props) {
  if (!client) return null;

  const cleanPhoneForWa = (phoneStr: string) => {
    const digits = (phoneStr || '').replace(/\D/g, '');
    if (!digits) return '';
    // If it's a 10 digit Colombian mobile starting with 3, prefix with 57
    if (digits.length === 10 && digits.startsWith('3')) {
      return `57${digits}`;
    }
    return digits;
  };

  const phones = [
    { label: 'Teléfono 1', val: client.phone1 || client.phone },
    { label: 'Teléfono 2', val: client.phone2 },
    { label: 'Teléfono 3', val: client.phone3 },
  ].filter((p) => Boolean(p.val && p.val !== '-'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
                NIT: {client.nit || client.doc || 'Sin NIT'}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  client.type === 'ACTIVE'
                    ? 'bg-success/10 text-success'
                    : 'bg-info/10 text-info'
                }`}
              >
                {client.type === 'ACTIVE' ? 'Activo' : 'Prospecto'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{client.name}</h2>
            {client.tradeName && (
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                Nombre Comercial: {client.tradeName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Nombres Desglosados si existen */}
          {(client.firstName || client.firstLastName) && (
            <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Nombres Desglosados
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">1er Nombre</span>
                  <span className="font-semibold text-foreground">{client.firstName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">2do Nombre</span>
                  <span className="font-semibold text-foreground">{client.secondName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">1er Apellido</span>
                  <span className="font-semibold text-foreground">{client.firstLastName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">2do Apellido</span>
                  <span className="font-semibold text-foreground">{client.secondLastName || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contactos Telefónicos */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Teléfonos Registrados
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {phones.length > 0 ? (
                phones.map((p, idx) => {
                  const waNumber = cleanPhoneForWa(p.val);
                  return (
                    <div
                      key={idx}
                      className="bg-card border border-border rounded-xl p-3 text-xs space-y-2 shadow-sm"
                    >
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        {p.label}
                      </span>
                      <span className="font-bold text-foreground text-sm block font-mono">
                        {p.val}
                      </span>
                      <div className="flex gap-1.5 pt-1">
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-semibold text-[11px] transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                        <a
                          href={`tel:${p.val}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px] transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          Llamar
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground col-span-3 py-2 italic">
                  No hay teléfonos registrados para este cliente.
                </div>
              )}
            </div>
          </div>

          {/* Correo y Facturación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3.5 space-y-1.5 shadow-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Correo Electrónico
              </span>
              <p className="text-sm font-semibold text-foreground break-all">
                {client.email || 'No registra'}
              </p>
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="text-xs text-primary hover:underline font-medium block"
                >
                  Enviar correo electrónico
                </a>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 space-y-1.5 shadow-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Dirección
              </span>
              <p className="text-sm font-semibold text-foreground">
                {client.address || 'No registra'}
              </p>
            </div>
          </div>

          {/* Facturación */}
          {(client.billingContact || client.billingEmail) && (
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-primary" />
                Datos de Contacto para Facturación
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Contacto de Facturación:</span>
                  <span className="font-semibold text-foreground">
                    {client.billingContact || 'No especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">E-mails Contacto Facturación:</span>
                  <span className="font-semibold text-foreground break-all">
                    {client.billingEmail || 'No especificado'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
          <span className="text-xs text-muted-foreground font-mono">
            Código: {client.code || client.id}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Cerrar
            </button>
            {onNewQuote && (
              <button
                onClick={() => {
                  onNewQuote(client);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                Cotizar a este Cliente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
