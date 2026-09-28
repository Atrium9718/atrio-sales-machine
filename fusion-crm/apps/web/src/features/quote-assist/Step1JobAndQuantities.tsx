import React from 'react';
import { AssistFormState } from './types';
import { ImpositionPreview } from './ImpositionPreview';
import { Layers, FileText, Info, Hash } from 'lucide-react';

interface Step1Props {
  form: AssistFormState;
  onChange: (patch: Partial<AssistFormState>) => void;
  impositionCount: number;
  orientationA: number;
  orientationB: number;
  sheetWidthCm: number;
  sheetHeightCm: number;
  sheetLabel?: string;
  errors?: Record<string, string>;
}

export const Step1JobAndQuantities: React.FC<Step1Props> = ({
  form,
  onChange,
  impositionCount,
  orientationA,
  orientationB,
  sheetWidthCm,
  sheetHeightCm,
  sheetLabel,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      {/* Descripción del Trabajo */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Descripción del Trabajo
            <span className="text-rose-500">*</span>
          </span>
          {errors.jobName && (
            <span className="text-rose-500 normal-case font-normal text-xs">{errors.jobName}</span>
          )}
        </label>
        <input
          type="text"
          value={form.jobName}
          onChange={(e) => onChange({ jobName: e.target.value })}
          placeholder="Ej: Volantes 4x4 media carta, Cuadernos corporativos, Afiches..."
          className={`w-full px-3.5 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.jobName ? 'border-rose-500' : 'border-input'
          }`}
        />
        <p className="text-[11px] text-muted-foreground">
          Nombre de referencia para el producto o servicio que se cotizará.
        </p>
      </div>

      {/* Dimensiones del Arte */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Dimensiones del Arte (cm)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Ancho (cm) *</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.artWidthCm || ''}
              onChange={(e) => onChange({ artWidthCm: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.artWidthCm ? 'border-rose-500' : 'border-input'
              }`}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Alto (cm) *</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.artHeightCm || ''}
              onChange={(e) => onChange({ artHeightCm: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.artHeightCm ? 'border-rose-500' : 'border-input'
              }`}
            />
          </div>
        </div>

        {/* Sangrado Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground block">
              ¿Calcular con sangrado?
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 text-primary shrink-0" />
              Suma 0,6 cm a cada dimensión para compensar corte en guillotina.
            </span>
          </div>

          <button
            type="button"
            onClick={() => onChange({ applyBleed: !form.applyBleed })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              form.applyBleed ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                form.applyBleed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Número de Páginas u Hojas (Opcional) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            Número de hojas o páginas (Opcional)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.pagesPerUnit ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
              onChange({ pagesPerUnit: isNaN(val as any) ? null : val });
            }}
            placeholder="Ej: 100 para cuadernos, 32 para revistas..."
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[11px] text-muted-foreground">
            Para libros, revistas, talonarios y cuadernos encuadernados.
          </p>
        </div>
      </div>

      {/* Imposition Live Preview */}
      <ImpositionPreview
        sheetWidthCm={sheetWidthCm}
        sheetHeightCm={sheetHeightCm}
        artWidthCm={form.artWidthCm}
        artHeightCm={form.artHeightCm}
        applyBleed={form.applyBleed}
        impositionCount={impositionCount}
        orientationA={orientationA}
        orientationB={orientationB}
        sheetLabel={sheetLabel}
      />

      {/* Tres Campos de Cantidad */}
      <div className="space-y-2 pt-2 border-t border-border/80">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
          <span>Cantidades a Cotizar (Escala)</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Solo la primera es obligatoria
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cantidad 1 */}
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5">
            <span className="text-xs font-bold text-primary flex items-center justify-between">
              <span>Cantidad 1 *</span>
              <span className="text-[10px] uppercase tracking-wide bg-primary/20 px-1.5 py-0.2 rounded font-black">
                Base
              </span>
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.qty1 || ''}
              onChange={(e) => onChange({ qty1: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-2.5 py-1.5 bg-background border border-primary/40 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-primary/10">
              Cabida: <strong className="text-foreground">{impositionCount}</strong> · Formatos:{' '}
              <strong className="text-foreground">
                {impositionCount > 0 ? Math.ceil((form.qty1 || 0) / impositionCount) : 0}
              </strong>
            </div>
          </div>

          {/* Cantidad 2 */}
          <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground">Cantidad 2 (Opcional)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.qty2 ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                onChange({ qty2: isNaN(val as any) ? null : val });
              }}
              placeholder="Opcional"
              className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              {form.qty2 ? (
                <>
                  Cabida: <strong className="text-foreground">{impositionCount}</strong> · Formatos:{' '}
                  <strong className="text-foreground">
                    {impositionCount > 0 ? Math.ceil(form.qty2 / impositionCount) : 0}
                  </strong>
                </>
              ) : (
                <span className="italic text-muted-foreground/60">Sin escala 2</span>
              )}
            </div>
          </div>

          {/* Cantidad 3 */}
          <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground">Cantidad 3 (Opcional)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.qty3 ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                onChange({ qty3: isNaN(val as any) ? null : val });
              }}
              placeholder="Opcional"
              className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              {form.qty3 ? (
                <>
                  Cabida: <strong className="text-foreground">{impositionCount}</strong> · Formatos:{' '}
                  <strong className="text-foreground">
                    {impositionCount > 0 ? Math.ceil(form.qty3 / impositionCount) : 0}
                  </strong>
                </>
              ) : (
                <span className="italic text-muted-foreground/60">Sin escala 3</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
