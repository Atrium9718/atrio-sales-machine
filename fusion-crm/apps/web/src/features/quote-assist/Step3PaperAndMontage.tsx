import React, { useState, useMemo } from 'react';
import { AssistFormState } from './types';
import { TariffSnapshot } from '../../../../../packages/core/src/pricing/press/types';
import { calculateImposition } from '../../../../../packages/core/src/pricing/press/imposition';
import { FileSpreadsheet, Scissors, Star, AlertTriangle, Check, Search } from 'lucide-react';

interface Step3Props {
  form: AssistFormState;
  onChange: (patch: Partial<AssistFormState>) => void;
  tariff: TariffSnapshot;
}

export const Step3PaperAndMontage: React.FC<Step3Props> = ({ form, onChange, tariff }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Familias de papeles
  const paperFamilies = useMemo(() => {
    const families: Record<string, typeof tariff.papers> = {
      'Propalcote': [],
      'Bond': [],
      'Químico / Autocopia': [],
      'Cartulinas y Calibres': [],
      'Otros Papeles': [],
    };

    tariff.papers.forEach((p) => {
      const n = p.name.toLowerCase();
      if (n.includes('propalcote')) {
        families['Propalcote'].push(p);
      } else if (n.includes('bond')) {
        families['Bond'].push(p);
      } else if (n.includes('químico') || n.includes('quimico')) {
        families['Químico / Autocopia'].push(p);
      } else if (n.includes('maule') || n.includes('kraft') || n.includes('kimberly')) {
        families['Cartulinas y Calibres'].push(p);
      } else {
        families['Otros Papeles'].push(p);
      }
    });

    return families;
  }, [tariff.papers]);

  // Lista única de nombres de papel disponibles
  const uniquePaperNames = useMemo(() => {
    const set = new Set<string>();
    tariff.papers.forEach((p) => set.add(p.name));
    return Array.from(set);
  }, [tariff.papers]);

  // Papeles que coinciden con búsqueda
  const filteredPaperNames = useMemo(() => {
    if (!searchTerm.trim()) return uniquePaperNames;
    const q = searchTerm.toLowerCase();
    return uniquePaperNames.filter((name) => name.toLowerCase().includes(q));
  }, [uniquePaperNames, searchTerm]);

  // Formatos disponibles para el papel actual
  const formatsForCurrentPaper = useMemo(() => {
    return tariff.papers
      .filter((p) => p.name === form.paperName)
      .map((p) => p.sheetFormat);
  }, [tariff.papers, form.paperName]);

  const isCurrentFormatAvailable = formatsForCurrentPaper.includes(form.sheetFormat);

  // Precio del pliego seleccionado
  const currentPaperItem = useMemo(() => {
    return tariff.papers.find(
      (p) => p.name === form.paperName && p.sheetFormat === form.sheetFormat
    );
  }, [tariff.papers, form.paperName, form.sheetFormat]);

  const pricePerSheet = currentPaperItem ? Number(currentPaperItem.pricePerSheet) : 0;

  // Evaluar los 17 cortes para encontrar el recomendado
  const effectiveArtW = form.applyBleed ? form.artWidthCm + 0.6 : form.artWidthCm;
  const effectiveArtH = form.applyBleed ? form.artHeightCm + 0.6 : form.artHeightCm;

  const analyzedCuts = useMemo(() => {
    return tariff.sheetCuts.map((cut) => {
      const size = cut.sizes.find((s) => s.sheetFormat === form.sheetFormat);
      if (!size) {
        return {
          cut,
          widthCm: 0,
          heightCm: 0,
          imposition: 0,
          totalUnitsPerParentSheet: 0,
        };
      }

      const w = Number(size.widthCm);
      const h = Number(size.heightCm);

      const imp = calculateImposition(w, h, effectiveArtW, effectiveArtH);
      const imposition = imp.imposition;
      const totalUnitsPerParentSheet = imposition * cut.divisor;

      return {
        cut,
        widthCm: w,
        heightCm: h,
        imposition,
        totalUnitsPerParentSheet,
      };
    });
  }, [tariff.sheetCuts, form.sheetFormat, effectiveArtW, effectiveArtH]);

  // Encontrar el corte que más rinde por pliego padre
  const recommendedCutCode = useMemo(() => {
    let bestCode = '.1/8';
    let maxUnits = 0;
    analyzedCuts.forEach((c) => {
      if (c.imposition > 0 && c.totalUnitsPerParentSheet > maxUnits) {
        maxUnits = c.totalUnitsPerParentSheet;
        bestCode = c.cut.code;
      }
    });
    return bestCode;
  }, [analyzedCuts]);

  // Corte seleccionado actualmente
  const selectedCutAnalysis = analyzedCuts.find((c) => c.cut.code === form.sheetCutCode) || analyzedCuts[0];
  const selectedImposition = selectedCutAnalysis ? selectedCutAnalysis.imposition : 0;
  const selectedDivisor = selectedCutAnalysis ? selectedCutAnalysis.cut.divisor : 4;

  // Cálculo de montaje para las cantidades
  const quantities = [form.qty1, form.qty2, form.qty3].filter((q): q is number => !!q && q > 0);

  const montageResults = quantities.map((qty) => {
    const formatosNecesarios = selectedImposition > 0 ? Math.ceil(qty / selectedImposition) : 0;
    const macula = form.lithoWastageSheets;
    const formatosTotales = formatosNecesarios + macula;
    const pliegosComprar = selectedDivisor > 0 ? Math.ceil(formatosTotales / selectedDivisor) : 0;
    const costoPapel = pliegosComprar * pricePerSheet;

    return {
      qty,
      imposition: selectedImposition,
      formatosNecesarios,
      macula,
      pliegosComprar,
      costoPapel,
    };
  });

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: TIPO DE PAPEL Y FORMATO */}
      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Sustrato / Papel</h3>
            <p className="text-[11px] text-muted-foreground">
              Selecciona el papel del tarifario y el formato del pliego padre
            </p>
          </div>
        </div>

        {/* Búsqueda y Selector de Papel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Papel (Agrupado por familia)
            </label>
            <div className="relative w-44">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar papel..."
                className="w-full pl-7 pr-2 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <select
            value={form.paperName}
            onChange={(e) => onChange({ paperName: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {Object.entries(paperFamilies).map(([familyName, papers]) => {
              const matchingInFamily = papers.filter((p) =>
                filteredPaperNames.includes(p.name)
              );
              // Dedup names in option group
              const namesInFamily: string[] = Array.from(new Set(matchingInFamily.map((p) => p.name)));
              if (namesInFamily.length === 0) return null;

              return (
                <optgroup key={familyName} label={familyName}>
                  {namesInFamily.map((name: string) => {
                    const item = tariff.papers.find(
                      (p) => p.name === name && p.sheetFormat === form.sheetFormat
                    ) || tariff.papers.find((p) => p.name === name);
                    const price = item ? `$${Number(item.pricePerSheet).toLocaleString('es-CO')}` : '';
                    return (
                      <option key={name} value={name}>
                        {name} {price ? `(${price}/pliego)` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Tamaño del Pliego (70x100 vs 60x90) */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Tamaño del Pliego Padre
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ sheetFormat: 'S70X100' })}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                form.sheetFormat === 'S70X100'
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              }`}
            >
              <div>
                <div className="text-xs font-bold">70 × 100 cm</div>
                <div className="text-[11px] text-muted-foreground">Pliego Grande Universal</div>
              </div>
              {formatsForCurrentPaper.includes('S70X100') ? (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  Disponible
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">
                  No disponible
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onChange({ sheetFormat: 'S60X90' })}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                form.sheetFormat === 'S60X90'
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              }`}
            >
              <div>
                <div className="text-xs font-bold">60 × 90 cm</div>
                <div className="text-[11px] text-muted-foreground">Pliego Mediano Editorial</div>
              </div>
              {formatsForCurrentPaper.includes('S60X90') ? (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  Disponible
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">
                  No disponible
                </span>
              )}
            </button>
          </div>

          {/* Validación si no existe en ese tamaño */}
          {!isCurrentFormatAvailable && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-medium">
                  Ese papel no se consigue en {form.sheetFormat === 'S60X90' ? '60×90' : '70×100'}.
                </span>
              </div>
              {formatsForCurrentPaper.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ sheetFormat: formatsForCurrentPaper[0] })}
                  className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0"
                >
                  Cambiar a {formatsForCurrentPaper[0] === 'S70X100' ? '70×100' : '60×90'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: LOS 17 CORTES DEL PLIEGO */}
      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Corte del Pliego (17 Cortes)</h3>
              <p className="text-[11px] text-muted-foreground">
                Selecciona la fracción de corte. La estrella marca el corte de mayor rendimiento.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Sugerido: {recommendedCutCode}
          </span>
        </div>

        {/* Grid de cortes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1">
          {analyzedCuts.map(({ cut, widthCm, heightCm, imposition, totalUnitsPerParentSheet }) => {
            const isSelected = form.sheetCutCode === cut.code;
            const isRecommended = cut.code === recommendedCutCode;

            return (
              <button
                key={cut.code}
                type="button"
                onClick={() => onChange({ sheetCutCode: cut.code })}
                className={`p-2 rounded-lg border text-left transition-all relative ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-background hover:bg-muted text-foreground'
                }`}
              >
                {isRecommended && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs"
                    title="Corte más eficiente sugerido por el sistema"
                  >
                    <Star className="w-2.5 h-2.5 fill-white" />
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{cut.code}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    (1/{cut.divisor})
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {widthCm} × {heightCm} cm
                </div>
                <div className="text-[10px] font-semibold text-primary/90 mt-0.5">
                  Cabida: {imposition} un. · Rinde: {totalUnitsPerParentSheet}/pliego
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 3: RECUADRO DE RESULTADO DEL MONTAJE */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          Resultado del Montaje por Cantidad
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {montageResults.map((res, i) => (
            <div
              key={res.qty}
              className="p-3 rounded-lg border border-primary/20 bg-background/80 shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <span className="text-xs font-black text-foreground">
                  {res.qty.toLocaleString('es-CO')} un.
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Escala {i + 1}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Cabida x corte:</span>
                <strong className="text-foreground">{res.imposition} un.</strong>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Formatos netos:</span>
                <strong className="text-foreground">{res.formatosNecesarios.toLocaleString('es-CO')}</strong>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Mácula de prensa:</span>
                <strong className="text-foreground">+{res.macula}</strong>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Pliegos a comprar:</span>
                <strong className="text-primary font-bold">{res.pliegosComprar.toLocaleString('es-CO')}</strong>
              </div>
              <div className="text-xs font-bold text-foreground pt-1 border-t border-border/60 flex justify-between">
                <span>Costo Papel:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ${Math.round(res.costoPapel).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
