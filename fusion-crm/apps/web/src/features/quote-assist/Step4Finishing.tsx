import React from 'react';
import { AssistFormState } from './types';
import { TariffSnapshot, LaminationMode } from '../../../../../packages/core/src/pricing/press/types';
import { Scissors, Layers, Sparkles, PlusCircle } from 'lucide-react';

interface Step4Props {
  form: AssistFormState;
  onChange: (patch: Partial<AssistFormState>) => void;
  tariff: TariffSnapshot;
}

export const Step4Finishing: React.FC<Step4Props> = ({ form, onChange, tariff }) => {
  const quantities = [form.qty1, form.qty2, form.qty3].filter((q): q is number => !!q && q > 0);

  // Precios del tarifario
  const corteService = tariff.finishings.find((f) => f.service === 'CORTE');
  const despunteService = tariff.finishings.find((f) => f.service === 'DESPUNTE');
  const perforadoService = tariff.finishings.find((f) => f.service === 'PERFORADO');
  const argolladoService = tariff.finishings.find((f) => f.service === 'ARGOLLADO');
  const plastificadoService = tariff.finishings.find((f) => f.service === 'PLASTIFICADO');
  const medioCorteService = tariff.finishings.find((f) => f.service === 'MEDIO_CORTE');
  const troqueladoService = tariff.finishings.find((f) => f.service === 'TROQUELADO');

  // Cálculos en vivo para cada acabado y cantidad
  const calculateCorteCost = (qty: number) => {
    const price = corteService ? Number(corteService.price) : 2000;
    return (form.cutRuns || 0) * price;
  };

  const calculateDespunteCost = (qty: number) => {
    const price = despunteService ? Number(despunteService.price) : 1500;
    return (form.trimRuns || 0) * price;
  };

  const calculatePerforadoCost = (qty: number) => {
    const price = perforadoService ? Number(perforadoService.price) : 1500;
    return (form.perforationCount || 0) * price;
  };

  const calculateArgolladoCost = (qty: number) => {
    const price = argolladoService ? Number(argolladoService.price) : 50;
    return (form.bindingLoops || 0) * price * qty;
  };

  const calculatePlastificadoCost = (qty: number) => {
    if (form.laminationMode === 'NONE') return 0;
    const minCharge = plastificadoService?.minimumCharge
      ? Number(plastificadoService.minimumCharge)
      : 65000;
    const pricePerM2 = plastificadoService?.pricePerM2
      ? Number(plastificadoService.pricePerM2)
      : 3500;

    // Área en m2
    const wM = form.artWidthCm / 100;
    const hM = form.artHeightCm / 100;
    const factorCaras = form.laminationMode === 'BOTH_FACES' ? 2 : 1;
    const totalAreaM2 = wM * hM * qty * factorCaras;
    const rawCost = totalAreaM2 * pricePerM2;
    return Math.max(rawCost, minCharge);
  };

  const calculateMedioCorteCost = (qty: number) => {
    const price = medioCorteService ? Number(medioCorteService.price) : 15;
    return (form.halfCutLinearCm || 0) * price * qty;
  };

  const calculateTroqueladoCost = (qty: number) => {
    return form.dieCutPrice || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Scissors className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Catálogo de Acabados</h3>
          <p className="text-[11px] text-muted-foreground">
            Tarifas de post-prensa y procesos especiales por cantidad
          </p>
        </div>
      </div>

      {/* TABLA DE ACABADOS */}
      <div className="border border-border rounded-xl overflow-hidden bg-card/60">
        <div className="p-3 bg-muted/40 border-b border-border grid grid-cols-12 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5 sm:col-span-4">Servicio / Acabado</div>
          <div className="col-span-3 sm:col-span-4">Parámetro / Unidades</div>
          <div className="col-span-4 text-right">Costo Estimado</div>
        </div>

        <div className="divide-y divide-border/60 text-xs">
          {/* 1. CORTE */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Corte Guillotina
              <div className="text-[10px] text-muted-foreground font-normal">
                ${corteService ? Number(corteService.price).toLocaleString('es-CO') : 2000} / bajada
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.cutRuns}
                onChange={(e) => onChange({ cutRuns: parseInt(e.target.value, 10) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">bajadas</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculateCorteCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 2. DESPUNTE */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Despunte (Esquinas)
              <div className="text-[10px] text-muted-foreground font-normal">
                ${despunteService ? Number(despunteService.price).toLocaleString('es-CO') : 1500} / bajada
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.trimRuns}
                onChange={(e) => onChange({ trimRuns: parseInt(e.target.value, 10) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">bajadas</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculateDespunteCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 3. PERFORADO */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Perforado
              <div className="text-[10px] text-muted-foreground font-normal">
                ${perforadoService ? Number(perforadoService.price).toLocaleString('es-CO') : 1500} / hueco
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.perforationCount}
                onChange={(e) => onChange({ perforationCount: parseInt(e.target.value, 10) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">huecos</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculatePerforadoCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 4. ARGOLLADO */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Argollado Doble O
              <div className="text-[10px] text-muted-foreground font-normal">
                ${argolladoService ? Number(argolladoService.price).toLocaleString('es-CO') : 50} / loop
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.bindingLoops}
                onChange={(e) => onChange({ bindingLoops: parseInt(e.target.value, 10) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">loops</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculateArgolladoCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 5. PLASTIFICADO */}
          <div className="p-3 grid grid-cols-12 items-center gap-2 bg-muted/10">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Plastificado Térmico
              <div className="text-[10px] text-muted-foreground font-normal">
                Mínimo $65.000 o $3.500 / m²
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4">
              <select
                value={form.laminationMode}
                onChange={(e) => onChange({ laminationMode: e.target.value as LaminationMode })}
                className="w-full px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              >
                <option value="NONE">Sin plastificar</option>
                <option value="ONE_FACE_OF_TWO_PRINTED">1 Cara (Brillo / Mate)</option>
                <option value="BOTH_FACES">2 Caras (Brillo / Mate)</option>
              </select>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${Math.round(calculatePlastificadoCost(q)).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 6. MEDIO CORTE */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Medio Corte Adhesivo
              <div className="text-[10px] text-muted-foreground font-normal">
                ${medioCorteService ? Number(medioCorteService.price).toLocaleString('es-CO') : 15} / cm lineal
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.halfCutLinearCm}
                onChange={(e) => onChange({ halfCutLinearCm: parseFloat(e.target.value) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">cm lineales</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculateMedioCorteCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>

          {/* 7. TROQUELADO */}
          <div className="p-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 sm:col-span-4 font-semibold text-foreground">
              Troquelado
              <div className="text-[10px] text-muted-foreground font-normal">
                Base fija o matriz
              </div>
            </div>
            <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="5000"
                value={form.dieCutPrice}
                onChange={(e) => onChange({ dieCutPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-24 px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">COP</span>
            </div>
            <div className="col-span-4 text-right font-bold text-foreground">
              {quantities.map((q, i) => (
                <div key={q} className="text-[11px]">
                  <span className="text-muted-foreground mr-1">Q{i + 1}:</span>
                  ${calculateTroqueladoCost(q).toLocaleString('es-CO')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TRES LÍNEAS LIBRES DE OTROS ACABADOS */}
      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <PlusCircle className="w-3.5 h-3.5 text-primary" />
          Otros Acabados o Cobros (Personalizados)
        </h4>

        <div className="space-y-2">
          {/* Línea 1 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={form.other1Label}
              onChange={(e) => onChange({ other1Label: e.target.value })}
              placeholder="Cobro 1: ej. Relieve, barniz..."
              className="col-span-4 px-2.5 py-1.5 bg-background border border-input rounded text-xs text-foreground"
            />
            <div className="col-span-8 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="number"
                  placeholder={`$ Q${idx + 1}`}
                  value={form.other1Prices[idx] || ''}
                  onChange={(e) => {
                    const next = [...form.other1Prices] as [number, number, number];
                    next[idx] = parseFloat(e.target.value) || 0;
                    onChange({ other1Prices: next });
                  }}
                  className="px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
                />
              ))}
            </div>
          </div>

          {/* Línea 2 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={form.other2Label}
              onChange={(e) => onChange({ other2Label: e.target.value })}
              placeholder="Cobro 2: ej. Empaque especial..."
              className="col-span-4 px-2.5 py-1.5 bg-background border border-input rounded text-xs text-foreground"
            />
            <div className="col-span-8 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="number"
                  placeholder={`$ Q${idx + 1}`}
                  value={form.other2Prices[idx] || ''}
                  onChange={(e) => {
                    const next = [...form.other2Prices] as [number, number, number];
                    next[idx] = parseFloat(e.target.value) || 0;
                    onChange({ other2Prices: next });
                  }}
                  className="px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
                />
              ))}
            </div>
          </div>

          {/* Línea 3 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={form.other3Label}
              onChange={(e) => onChange({ other3Label: e.target.value })}
              placeholder="Cobro 3: ej. Flete express..."
              className="col-span-4 px-2.5 py-1.5 bg-background border border-input rounded text-xs text-foreground"
            />
            <div className="col-span-8 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="number"
                  placeholder={`$ Q${idx + 1}`}
                  value={form.other3Prices[idx] || ''}
                  onChange={(e) => {
                    const next = [...form.other3Prices] as [number, number, number];
                    next[idx] = parseFloat(e.target.value) || 0;
                    onChange({ other3Prices: next });
                  }}
                  className="px-2 py-1 bg-background border border-input rounded text-xs text-foreground"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
