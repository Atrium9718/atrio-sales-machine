import React, { useState, useMemo } from 'react';
import {
  calculateManualLitho,
  ManualPlateRow,
  ManualImpressionRow,
  ManualPaperRow,
  ManualFinishRow,
  ManualLithoCalculationResult,
} from '../../../../../packages/core/src/pricing/press/manual-litho';
import { DEFAULT_OFFICIAL_TARIFF } from '../../../../../packages/core/src/pricing/press/defaultTariff';
import {
  AlertTriangle,
  Plus,
  Trash2,
  HelpCircle,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  Layers,
  Printer,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface ManualLithoAssistProps {
  onApplyToQuote?: (items: any[], tariffVersionId: string, notesAppendix?: string) => void;
  tariffVersionId?: string;
  tariffVersionCode?: string;
}

export const ManualLithoAssist: React.FC<ManualLithoAssistProps> = ({
  onApplyToQuote,
  tariffVersionId = 'tariff-press-2025-01',
  tariffVersionCode = 'VIGENTE-2025-01',
}) => {
  // 1. Datos generales
  const [jobDescription, setJobDescription] = useState('Volantes 1/4 pliego 4x4');
  const [quantities, setQuantities] = useState<[number, number, number]>([1000, 2000, 5000]);

  // 2. PLANCHAS: cuatro filas (1/8, 1/4, 1/2, Pliego)
  // Precios del tarifario vigente:
  // 1/8: 10.000 (Excel anterior: 8.000)
  // 1/4: 12.500 (Excel anterior: 10.000)
  // 1/2: 32.000
  // Pliego: 58.000
  const [plates, setPlates] = useState<ManualPlateRow[]>([
    { format: '1/8', unitPrice: 10000, plateCount: 0 },
    { format: '1/4', unitPrice: 12500, plateCount: 4 },
    { format: '1/2', unitPrice: 32000, plateCount: 0 },
    { format: 'Pliego', unitPrice: 58000, plateCount: 0 },
  ]);

  // 3. IMPRESIÓN: cuatro filas (1/8, 1/4, 1/2, Pliego)
  // Precios por millar vigentes:
  // 1/8: 14.000
  // 1/4: 22.000
  // 1/2: 38.000
  // Pliego: 65.000
  const [impressions, setImpressions] = useState<ManualImpressionRow[]>([
    { format: '1/8', pressPricePerThousand: 14000, plateCount: 0 },
    { format: '1/4', pressPricePerThousand: 22000, plateCount: 4 },
    { format: '1/2', pressPricePerThousand: 38000, plateCount: 0 },
    { format: 'Pliego', pressPricePerThousand: 65000, plateCount: 0 },
  ]);

  // Papeles disponibles en el tarifario
  const availablePapers = useMemo(() => {
    const names = new Set<string>();
    DEFAULT_OFFICIAL_TARIFF.papers.forEach((p) => names.add(p.name));
    return Array.from(names);
  }, []);

  // Helper para buscar precio en tarifario
  const getTariffPaperPrice = (paperName: string, format: 'S70X100' | 'S60X90'): number | null => {
    const item = DEFAULT_OFFICIAL_TARIFF.papers.find(
      (p) => p.name === paperName && p.sheetFormat === format
    );
    if (!item) return null;
    return typeof item.pricePerSheet === 'number'
      ? item.pricePerSheet
      : (item.pricePerSheet as any).toNumber();
  };

  // 4. PAPELES Y OTROS: hasta 5 filas
  const [papers, setPapers] = useState<ManualPaperRow[]>([
    {
      paperName: 'Propalcote 150g',
      sheetFormat: 'S70X100',
      pricePerSheet: getTariffPaperPrice('Propalcote 150g', 'S70X100') ?? 620,
      sheetsPerQty: [250, 500, 1250],
    },
  ]);

  // 5. ACABADOS: hasta 5 filas
  const [finishes, setFinishes] = useState<ManualFinishRow[]>([
    {
      name: 'Corte y refile final',
      pricesPerQty: [15000, 20000, 35000],
    },
  ]);

  // 6. Cierre comercial
  const [utilityPercent, setUtilityPercent] = useState<number>(70);
  const [commissionPercent, setCommissionPercent] = useState<number>(10);
  const [vatPercent, setVatPercent] = useState<number>(19);

  // Estado para alertar si se agregaron items
  const [addedSuccessQty, setAddedSuccessQty] = useState<number | null>(null);

  // Cálculo en tiempo real usando motor puro
  const result: ManualLithoCalculationResult = useMemo(() => {
    return calculateManualLitho({
      jobDescription,
      quantities: [quantities[0], quantities[1], quantities[2]],
      plates,
      impressions,
      papers,
      finishes,
      utilityPercent,
      commissionPercent,
      vatPercent,
    });
  }, [
    jobDescription,
    quantities,
    plates,
    impressions,
    papers,
    finishes,
    utilityPercent,
    commissionPercent,
    vatPercent,
  ]);

  // Manejadores para actualizar planchas
  const updatePlateRow = (index: number, patch: Partial<ManualPlateRow>) => {
    setPlates((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });

    // Sincronizar número de planchas con la tabla de impresión correspondiente
    if (patch.plateCount !== undefined) {
      setImpressions((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], plateCount: patch.plateCount! };
        }
        return copy;
      });
    }
  };

  // Manejadores para actualizar impresión
  const updateImpressionRow = (index: number, patch: Partial<ManualImpressionRow>) => {
    setImpressions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  // Manejadores para papeles
  const handlePaperNameChange = (index: number, newName: string) => {
    const currentFormat = (papers[index].sheetFormat as 'S70X100' | 'S60X90') || 'S70X100';
    const autoPrice = getTariffPaperPrice(newName, currentFormat);
    setPapers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        paperName: newName,
        pricePerSheet: autoPrice,
      };
      return copy;
    });
  };

  const handlePaperFormatChange = (index: number, newFormat: 'S70X100' | 'S60X90') => {
    const paperName = papers[index].paperName;
    const autoPrice = getTariffPaperPrice(paperName, newFormat);
    setPapers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        sheetFormat: newFormat,
        pricePerSheet: autoPrice,
      };
      return copy;
    });
  };

  const updatePaperRow = (index: number, patch: Partial<ManualPaperRow>) => {
    setPapers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const addPaperRow = () => {
    if (papers.length >= 5) return;
    const defaultName = availablePapers[0] || 'Bond 75g';
    const autoPrice = getTariffPaperPrice(defaultName, 'S70X100');
    setPapers((prev) => [
      ...prev,
      {
        paperName: defaultName,
        sheetFormat: 'S70X100',
        pricePerSheet: autoPrice,
        sheetsPerQty: [100, 200, 500],
      },
    ]);
  };

  const removePaperRow = (index: number) => {
    setPapers((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Manejadores para acabados
  const updateFinishRow = (index: number, patch: Partial<ManualFinishRow>) => {
    setFinishes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const addFinishRow = () => {
    if (finishes.length >= 5) return;
    setFinishes((prev) => [
      ...prev,
      {
        name: 'Nuevo acabado',
        pricesPerQty: [0, 0, 0],
      },
    ]);
  };

  const removeFinishRow = (index: number) => {
    setFinishes((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Volcar a la cotización
  const handleAddToQuote = (qResult: (typeof result.quantities)[0]) => {
    if (!onApplyToQuote) return;

    const paperSummary = papers
      .map((p) => `${p.paperName} (${p.sheetFormat === 'S70X100' ? '70x100' : '60x90'})`)
      .join(', ');
    const finishSummary = finishes.map((f) => f.name).join(', ');

    const lineItem = {
      id: `it_manual_${Date.now()}_${qResult.quantity}`,
      productType: 'PRESS',
      serviceType: 'LITHO',
      description: `${jobDescription} · Cantidad: ${qResult.quantity.toLocaleString('es-CO')}`,
      quantity: qResult.quantity,
      unitPrice: qResult.unitPrice,
      subtotal: qResult.subtotal,
      vatRate: vatPercent,
      vatAmount: qResult.vatAmount,
      total: qResult.total,
      notes: `Modo Manual Lito Simple · Planchas: $${qResult.platesCost.toLocaleString('es-CO')} | Impresión: $${qResult.impressionsCost.toLocaleString('es-CO')} | Papel: $${qResult.papersCost.toLocaleString('es-CO')} | Acabados: $${qResult.finishesCost.toLocaleString('es-CO')}`,
      specSheet: {
        rawInput: {
          jobName: jobDescription,
          technique: 'LITHO',
          mode: 'MANUAL_LITHO_SIMPLE',
          quantity: qResult.quantity,
          papers: paperSummary,
          finishes: finishSummary,
        },
        calculatedCostBreakdown: {
          plates: qResult.platesCost,
          press: qResult.impressionsCost,
          paper: qResult.papersCost,
          finishes: qResult.finishesCost,
          totalCost: qResult.totalCost,
          unitCost: qResult.unitCost,
          utility: qResult.utilityAmount,
          commission: qResult.commissionAmount,
          subtotal: qResult.subtotal,
          vat: qResult.vatAmount,
          total: qResult.total,
        },
        commercialConditions: {
          utilityPercent,
          commissionPercent,
          vatPercent,
        },
      },
    };

    onApplyToQuote([lineItem], tariffVersionId, `[Modo Manual Lito] ${jobDescription}`);
    setAddedSuccessQty(qResult.quantity);
    setTimeout(() => setAddedSuccessQty(null), 3500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ADVERTENCIA OFICIAL REQUERIDA */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 shadow-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm text-amber-800 dark:text-amber-100">
            Aviso de tarifas vigentes en Modo Manual
          </p>
          <p>
            Estos precios vienen del <strong>tarifario vigente ({tariffVersionCode})</strong>; en
            el Excel anterior eran otros (ej. 1/8: $10.000 vs $8.000 en el Excel antiguo; 1/4:
            $12.500 vs $10.000). Todos los valores continúan siendo 100% editables para esta
            cotización.
          </p>
        </div>
      </div>

      {/* 2. DESCRIPCIÓN Y TRES CANTIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card p-5 rounded-2xl border border-border shadow-xs">
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            Descripción del Trabajo
          </label>
          <input
            type="text"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Ej: Volantes publicitarios 1/4 pliego 4x4"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            Tres Cantidades a Evaluar
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="relative">
                <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-muted-foreground">
                  Q{idx + 1}
                </span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={quantities[idx]}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const copy: [number, number, number] = [...quantities];
                    copy[idx] = val;
                    setQuantities(copy);
                  }}
                  className="w-full pl-8 pr-2 py-2 rounded-xl border border-border bg-background text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TABLA DE PLANCHAS */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Planchas (Offset)</h3>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Total Planchas:{' '}
            <strong className="text-foreground text-sm font-bold">
              ${result.platesTotal.toLocaleString('es-CO')}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-2.5 rounded-l-lg">Formato de Máquina</th>
                <th className="p-2.5">Precio Unitario ($)</th>
                <th className="p-2.5">N° Planchas</th>
                <th className="p-2.5 text-right rounded-r-lg">Subtotal Planchas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {plates.map((row, idx) => (
                <tr key={row.format} className="hover:bg-muted/20 transition-colors">
                  <td className="p-2.5 font-semibold text-foreground">{row.format}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="500"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updatePlateRow(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-28 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      value={row.plateCount}
                      onChange={(e) =>
                        updatePlateRow(idx, { plateCount: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-20 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono font-bold text-foreground"
                    />
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-foreground">
                    ${(result.platesSubtotals[idx] || 0).toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. TABLA DE IMPRESIÓN */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Impresión por Millar</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Fórmula: Precio Millar × Planchas × ceil(Cantidad / 1.000)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-2.5 rounded-l-lg">Formato</th>
                <th className="p-2.5">Precio por Millar ($)</th>
                <th className="p-2.5">N° Planchas</th>
                <th className="p-2.5 text-right">Q1 ({quantities[0].toLocaleString()})</th>
                <th className="p-2.5 text-right">Q2 ({quantities[1].toLocaleString()})</th>
                <th className="p-2.5 text-right rounded-r-lg">
                  Q3 ({quantities[2].toLocaleString()})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {impressions.map((row, idx) => {
                const rowCostQ1 =
                  row.pressPricePerThousand *
                  row.plateCount *
                  Math.ceil(quantities[0] / 1000);
                const rowCostQ2 =
                  row.pressPricePerThousand *
                  row.plateCount *
                  Math.ceil(quantities[1] / 1000);
                const rowCostQ3 =
                  row.pressPricePerThousand *
                  row.plateCount *
                  Math.ceil(quantities[2] / 1000);

                return (
                  <tr key={row.format} className="hover:bg-muted/20 transition-colors">
                    <td className="p-2.5 font-semibold text-foreground">{row.format}</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="500"
                        value={row.pressPricePerThousand}
                        onChange={(e) =>
                          updateImpressionRow(idx, {
                            pressPricePerThousand: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-28 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={row.plateCount}
                        onChange={(e) =>
                          updateImpressionRow(idx, {
                            plateCount: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      ${rowCostQ1.toLocaleString('es-CO')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      ${rowCostQ2.toLocaleString('es-CO')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      ${rowCostQ3.toLocaleString('es-CO')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border/80 bg-muted/20 font-bold font-mono">
              <tr>
                <td colSpan={3} className="p-2.5 text-foreground">
                  Total Impresión:
                </td>
                <td className="p-2.5 text-right text-foreground">
                  ${result.quantities[0].impressionsCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-right text-foreground">
                  ${result.quantities[1].impressionsCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-right text-foreground">
                  ${result.quantities[2].impressionsCost.toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. TABLA DE PAPELES Y OTROS */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Papeles y Otros Insumos (Hasta 5 filas)
            </h3>
          </div>
          {papers.length < 5 && (
            <button
              type="button"
              onClick={addPaperRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-primary shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Fila de Papel</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-2.5 rounded-l-lg">Tipo de Papel</th>
                <th className="p-2.5">Pliego</th>
                <th className="p-2.5">Costo Pliego</th>
                <th className="p-2.5">Pliegos Q1</th>
                <th className="p-2.5">Pliegos Q2</th>
                <th className="p-2.5">Pliegos Q3</th>
                <th className="p-2.5 text-right rounded-r-lg">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {papers.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="p-2.5">
                    <select
                      value={row.paperName}
                      onChange={(e) => handlePaperNameChange(idx, e.target.value)}
                      className="w-44 px-2 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground"
                    >
                      {availablePapers.map((pName) => (
                        <option key={pName} value={pName}>
                          {pName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5">
                    <select
                      value={row.sheetFormat}
                      onChange={(e) =>
                        handlePaperFormatChange(idx, e.target.value as 'S70X100' | 'S60X90')
                      }
                      className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground"
                    >
                      <option value="S70X100">70x100</option>
                      <option value="S60X90">60x90</option>
                    </select>
                  </td>
                  <td className="p-2.5">
                    {row.pricePerSheet === null ? (
                      <span className="text-destructive font-bold">No hay precio</span>
                    ) : (
                      <input
                        type="number"
                        step="10"
                        value={row.pricePerSheet}
                        onChange={(e) =>
                          updatePaperRow(idx, { pricePerSheet: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono font-semibold text-foreground"
                      />
                    )}
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      value={row.sheetsPerQty[0] || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const copy = [...row.sheetsPerQty];
                        copy[0] = val;
                        updatePaperRow(idx, { sheetsPerQty: copy });
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      value={row.sheetsPerQty[1] || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const copy = [...row.sheetsPerQty];
                        copy[1] = val;
                        updatePaperRow(idx, { sheetsPerQty: copy });
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      value={row.sheetsPerQty[2] || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const copy = [...row.sheetsPerQty];
                        copy[2] = val;
                        updatePaperRow(idx, { sheetsPerQty: copy });
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    {papers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaperRow(idx)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border/80 bg-muted/20 font-bold font-mono">
              <tr>
                <td colSpan={3} className="p-2.5 text-foreground">
                  Total Papeles:
                </td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[0].papersCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[1].papersCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[2].papersCost.toLocaleString('es-CO')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. TABLA DE ACABADOS */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Acabados y Procesos Especiales (Hasta 5 filas)
            </h3>
          </div>
          {finishes.length < 5 && (
            <button
              type="button"
              onClick={addFinishRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-primary shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Acabado</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-2.5 rounded-l-lg">Nombre del Acabado</th>
                <th className="p-2.5">Precio Q1 ($)</th>
                <th className="p-2.5">Precio Q2 ($)</th>
                <th className="p-2.5">Precio Q3 ($)</th>
                <th className="p-2.5 text-right rounded-r-lg">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {finishes.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateFinishRow(idx, { name: e.target.value })}
                      placeholder="Ej: Plastificado mate, Troquelado..."
                      className="w-56 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="1000"
                      value={row.pricesPerQty[0] || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...row.pricesPerQty];
                        copy[0] = val;
                        updateFinishRow(idx, { pricesPerQty: copy });
                      }}
                      className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="1000"
                      value={row.pricesPerQty[1] || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...row.pricesPerQty];
                        copy[1] = val;
                        updateFinishRow(idx, { pricesPerQty: copy });
                      }}
                      className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="1000"
                      value={row.pricesPerQty[2] || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...row.pricesPerQty];
                        copy[2] = val;
                        updateFinishRow(idx, { pricesPerQty: copy });
                      }}
                      className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeFinishRow(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Eliminar acabado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border/80 bg-muted/20 font-bold font-mono">
              <tr>
                <td className="p-2.5 text-foreground">Total Acabados:</td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[0].finishesCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[1].finishesCost.toLocaleString('es-CO')}
                </td>
                <td className="p-2.5 text-foreground">
                  ${result.quantities[2].finishesCost.toLocaleString('es-CO')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 7. PARÁMETROS DE CIERRE COMERCIAL */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Cierre Comercial (Lógica Manual)</h3>
          <span className="text-[11px] text-muted-foreground">
            Utilidad sobre costo unitario · Comisión sobre costo + utilidad
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground block">
              Utilidad Sugerida (%)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={utilityPercent}
              onChange={(e) => setUtilityPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">Por defecto 70%</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground block">
              Comisión Asesor (%)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">Por defecto 10%</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground block">IVA (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={vatPercent}
              onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">Por defecto 19%</span>
          </div>
        </div>
      </div>

      {/* 8. TARJETAS DE RESULTADO POR CANTIDAD */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Resultados Comerciales por Cantidad
        </h3>

        {addedSuccessQty && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              ¡Ítem de {addedSuccessQty.toLocaleString('es-CO')} unidades volcado con éxito a la
              cotización!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.quantities.map((qResult, idx) => (
            <div
              key={qResult.quantity}
              className="rounded-2xl border-2 border-border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Escala {idx + 1}
                    </span>
                    <span className="text-lg font-black text-foreground">
                      {qResult.quantity.toLocaleString('es-CO')} un.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Lito Simple
                  </span>
                </div>

                {/* Desglose de costos */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Planchas:</span>
                    <span className="font-mono font-semibold">
                      ${qResult.platesCost.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impresión:</span>
                    <span className="font-mono font-semibold">
                      ${qResult.impressionsCost.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Papel:</span>
                    <span className="font-mono font-semibold">
                      ${qResult.papersCost.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Acabados:</span>
                    <span className="font-mono font-semibold">
                      ${qResult.finishesCost.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/60">
                    <span>Total Costos:</span>
                    <span className="font-mono">${qResult.totalCost.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Costo unitario:</span>
                    <span className="font-mono">${qResult.unitCost.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                {/* Cierre comercial */}
                <div className="space-y-1 text-xs pt-2 border-t border-border/60">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Utilidad ({utilityPercent}%):</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      +${qResult.utilityAmount.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Comisión ({commissionPercent}%):</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      +${qResult.commissionAmount.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1">
                    <span>Subtotal:</span>
                    <span className="font-mono">${qResult.subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>IVA ({vatPercent}%):</span>
                    <span className="font-mono">${qResult.vatAmount.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                {/* Total y Unitario */}
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-foreground">Total Venta:</span>
                    <span className="text-lg font-black text-primary font-mono">
                      ${qResult.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Precio Unitario:</span>
                    <span className="font-mono font-bold text-foreground">
                      ${qResult.unitPrice.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleAddToQuote(qResult)}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Agregar a la Cotización</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
