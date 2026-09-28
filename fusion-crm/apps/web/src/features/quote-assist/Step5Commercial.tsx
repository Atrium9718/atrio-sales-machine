import React from 'react';
import { AssistFormState } from './types';
import { BadgePercent, Clock, CreditCard, ShieldCheck } from 'lucide-react';

interface Step5Props {
  form: AssistFormState;
  onChange: (patch: Partial<AssistFormState>) => void;
}

export const Step5Commercial: React.FC<Step5Props> = ({ form, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <BadgePercent className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Condiciones Comerciales y Fiscales</h3>
          <p className="text-[11px] text-muted-foreground">
            Impuestos, margen de descuento y términos de entrega de la propuesta
          </p>
        </div>
      </div>

      {/* BLOQUE IMPUESTOS Y DESCUENTOS */}
      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <BadgePercent className="w-3.5 h-3.5 text-primary" />
          Impuestos y Descuentos
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tipo de IVA */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Régimen / Tipo de IVA</label>
            <select
              value={form.vatLabel}
              onChange={(e) => onChange({ vatLabel: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="IVA 19%">IVA General (19%)</option>
              <option value="IVA 5%">IVA Reducido (5%)</option>
              <option value="Exento 0%">Exento / Régimen Simple (0%)</option>
            </select>
          </div>

          {/* Otros impuestos % */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Otros Impuestos / ICA (%)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.otherTaxPercent}
                onChange={(e) => onChange({ otherTaxPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
            </div>
          </div>

          {/* Descuento por Tipo de Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Descuento Tipo de Cliente</label>
            <select
              value={form.clientDiscountLabel}
              onChange={(e) => onChange({ clientDiscountLabel: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="Ninguno">Ninguno (0%)</option>
              <option value="Corporativo">Cliente Corporativo (5%)</option>
              <option value="Distribuidor">Distribuidor Gráfico (10%)</option>
              <option value="Agencia">Agencia Publicitaria (15%)</option>
            </select>
          </div>

          {/* Otros descuentos % */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Otros Descuentos Adicionales (%)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.otherDiscountPercent}
                onChange={(e) => onChange({ otherDiscountPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
            </div>
          </div>

          {/* Comisión de Venta % */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Comisión Asesor Comercial (%)</label>
            <div className="relative max-w-xs">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.salesCommissionPercent}
                onChange={(e) => onChange({ salesCommissionPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Comisión estándar del agente comercial según escala corporativa.
            </p>
          </div>
        </div>
      </div>

      {/* BLOQUE TÉRMINOS Y CONDICIONES */}
      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Términos de la Oferta
        </h4>

        <div className="space-y-3">
          {/* Tiempo de Entrega */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Tiempo de Entrega Estándar
            </label>
            <input
              type="text"
              value={form.deliveryTime}
              onChange={(e) => onChange({ deliveryTime: e.target.value })}
              placeholder="Ej: 3 a 5 días hábiles..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Forma de Pago */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              Forma de Pago
            </label>
            <input
              type="text"
              value={form.paymentTerms}
              onChange={(e) => onChange({ paymentTerms: e.target.value })}
              placeholder="Ej: 50% anticipo, 50% contra entrega..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Validez */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Vigencia de la Cotización
            </label>
            <input
              type="text"
              value={form.validity}
              onChange={(e) => onChange({ validity: e.target.value })}
              placeholder="Ej: 15 días calendario..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
