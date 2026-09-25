import React from 'react';
import { AssistFormState } from './types';
import { TariffSnapshot } from '../../../../../packages/core/src/pricing/press/types';
import { Printer, Layers, AlertCircle, Sparkles, SlidersHorizontal } from 'lucide-react';

interface Step2Props {
  form: AssistFormState;
  onChange: (patch: Partial<AssistFormState>) => void;
  tariff: TariffSnapshot;
  artWidthCm: number;
  artHeightCm: number;
  applyBleed: boolean;
}

export const Step2Technique: React.FC<Step2Props> = ({
  form,
  onChange,
  tariff,
  artWidthCm,
  artHeightCm,
  applyBleed,
}) => {
  const showDigital = form.technique === 'DIGITAL' || form.technique === 'BOTH';
  const showLitho = form.technique === 'LITHO' || form.technique === 'BOTH';

  // Calcular planchas automáticas
  const matchedInkSet = tariff.inkSets.find((i) => i.code === form.lithoInkSetCode);
  const calculatedPlates = matchedInkSet ? matchedInkSet.plates : 4;
  const isManualPlateOverridden =
    form.lithoManualPlateCount !== null && form.lithoManualPlateCount !== undefined;

  return (
    <div className="space-y-6">
      {/* Selector de Técnica Global */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          Modalidad de Producción
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ technique: 'DIGITAL' })}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              form.technique === 'DIGITAL'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                : 'bg-card border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span className="text-xs font-bold">1. Digital</span>
            <span className="text-[10px] opacity-80">Prensas láser HP / Xerox</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ technique: 'LITHO' })}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              form.technique === 'LITHO'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                : 'bg-card border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold">2. Litográfica</span>
            <span className="text-[10px] opacity-80">Offset Speedmaster / Ryobi</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ technique: 'BOTH' })}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              form.technique === 'BOTH'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold'
                : 'bg-card border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold">3. Comparar</span>
            <span className="text-[10px] opacity-80">Ambas con punto de equilibrio</span>
          </button>
        </div>
      </div>

      {/* BLOQUE DIGITAL */}
      {showDigital && (
        <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Configuración Digital</h3>
              <p className="text-[11px] text-muted-foreground">
                Parámetros de prensa digital y formato de bajada
              </p>
            </div>
          </div>

          {/* Formato de montaje digital */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Formato de Montaje Digital
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tariff.digitalFormats.map((df) => {
                const isSelected = form.digitalFormatName === df.formatName;
                const effW = applyBleed ? artWidthCm + 0.6 : artWidthCm;
                const effH = applyBleed ? artHeightCm + 0.6 : artHeightCm;
                // Cabida aproximada
                const w = Number(df.widthCm);
                const h = Number(df.heightCm);
                const a = effW > 0 && effH > 0 ? Math.floor(w / effW) * Math.floor(h / effH) : 0;
                const b = effW > 0 && effH > 0 ? Math.floor(h / effW) * Math.floor(w / effH) : 0;
                const imp = Math.max(a, b);

                return (
                  <button
                    key={df.formatName}
                    type="button"
                    onClick={() => onChange({ digitalFormatName: df.formatName })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-xs font-bold">{df.formatName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {Number(df.widthCm)} × {Number(df.heightCm)} cm
                    </div>
                    <div className="text-[10px] font-semibold text-primary/90 mt-1">
                      Cabida estimada: {imp} un.
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo de Tintas Digital */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Modo de Tintas Digital
            </label>
            <select
              value={form.digitalInkMode}
              onChange={(e) => onChange({ digitalInkMode: e.target.value as any })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ONE_SIDE_COLOR">Una cara a color (4x0)</option>
              <option value="BOTH_SIDES_COLOR">Doble cara a color (4x4)</option>
              <option value="ONE_SIDE_BLACK">Una cara en negro (1x0)</option>
              <option value="BOTH_SIDES_BLACK">Doble cara en negro (1x1)</option>
            </select>
          </div>

          {/* Impresión por demanda */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background/60">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground block">
                ¿Impresión por demanda (tiro corto urgente)?
              </span>
              <span className="text-[11px] text-muted-foreground">
                Optimiza para tiradas mínimas inmediatas sin escala escalonada.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ digitalOnDemand: !form.digitalOnDemand })}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                form.digitalOnDemand ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.digitalOnDemand ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* BLOQUE LITOGRÁFICO */}
      {showLitho && (
        <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Configuración Litográfica / Offset</h3>
              <p className="text-[11px] text-muted-foreground">
                Planchas CTP, formato de máquina y calibración de merma
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Formato de Plancha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Formato de Plancha
              </label>
              <select
                value={form.lithoPlateFormatName}
                onChange={(e) => onChange({ lithoPlateFormatName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {tariff.lithoFormats.map((lf) => (
                  <option key={lf.plateFormatName} value={lf.plateFormatName}>
                    {lf.plateFormatName} (Área útil: {Number(lf.printAreaWidthCm)}×{Number(lf.printAreaHeightCm)} cm)
                  </option>
                ))}
              </select>
            </div>

            {/* Juego de Tintas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Juego de Tintas
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  = {calculatedPlates} planchas
                </span>
              </div>
              <select
                value={form.lithoInkSetCode}
                onChange={(e) => onChange({ lithoInkSetCode: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {tariff.inkSets.map((is) => (
                  <option key={is.code} value={is.code}>
                    {is.code} ({is.plates} planchas)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Planchas con Volteo Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background/60">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground block">
                ¿Planchas con volteo (Work & Turn)?
              </span>
              <span className="text-[11px] text-muted-foreground">
                Usa el mismo juego de planchas para imprimir frente y vuelta rotando el pliego.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ lithoPlateBacking: !form.lithoPlateBacking })}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                form.lithoPlateBacking ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.lithoPlateBacking ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Número Manual de Planchas (Opcional) */}
          <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-background/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Número manual de planchas (Opcional)
              </label>
              {isManualPlateOverridden && (
                <button
                  type="button"
                  onClick={() => onChange({ lithoManualPlateCount: null })}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Restaurar cálculo automático
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={form.lithoManualPlateCount ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                onChange({ lithoManualPlateCount: isNaN(val as any) ? null : val });
              }}
              placeholder={`Automático (= ${calculatedPlates} planchas)`}
              className="w-full px-3 py-1.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {isManualPlateOverridden && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Aviso: El número manual anula el cálculo automático por tintas y volteo.
              </p>
            )}
          </div>

          {/* Margen y Mácula */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Utilidad litográfica (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.lithoMarginPercent}
                  onChange={(e) =>
                    onChange({ lithoMarginPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Por defecto: 30% del tarifario</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mácula litográfica (pliegos)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={form.lithoWastageSheets}
                onChange={(e) =>
                  onChange({ lithoWastageSheets: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground">Por defecto: 200 pliegos / tiro</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
