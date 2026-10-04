import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Scissors, 
  Layers, 
  Maximize2, 
  Sliders, 
  PieChart, 
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { CalculationResult, SheetComparisonItem, SmartFitSuggestion, HybridLayoutOption } from './types';

interface SheetEfficiencyAdvisorProps {
  calculation: CalculationResult;
  pieceWidthMm: number;
  pieceHeightMm: number;
  sheetWidthCm: number;
  sheetHeightCm: number;
  impositionPolicy: 'corte_comun' | 'doble_corte';
  spacingBetweenPiecesMm: number;
  onApplyOptimalSheet: (sheetId: string) => void;
  onApplyCommonCut: () => void;
  onApplySmartFit: (sug: SmartFitSuggestion) => void;
}

export default function SheetEfficiencyAdvisor({
  calculation,
  pieceWidthMm,
  pieceHeightMm,
  sheetWidthCm,
  sheetHeightCm,
  impositionPolicy,
  spacingBetweenPiecesMm,
  onApplyOptimalSheet,
  onApplyCommonCut,
  onApplySmartFit
}: SheetEfficiencyAdvisorProps) {
  const {
    efficiencyPct,
    efficiencyNetPct,
    pctGripper,
    pctMargins,
    pctSpacing,
    pctUnusedWaste,
    sheetComparisons,
    smartFitSuggestions,
    hybridOption,
    bestTotal,
    reamsCount,
    totalSheetsToCut
  } = calculation;

  const currentComparison = sheetComparisons.find(s => s.isCurrent);
  const bestComparison = sheetComparisons.find(s => s.isBest);
  const hasBetterSheet = bestComparison && !bestComparison.isCurrent && (bestComparison.efficiencyPct > efficiencyPct + 2);

  // Status diagnosis
  let statusBadge = {
    label: 'Aprovechamiento Crítico (<60%)',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    desc: 'Existe un alto porcentaje de merma y sobrante de papel en este formato.'
  };

  if (efficiencyPct >= 80) {
    statusBadge = {
      label: 'Aprovechamiento Óptimo (≥80%)',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      desc: 'Excelente relación de área entre la pieza y el pliego de impresión.'
    };
  } else if (efficiencyPct >= 65) {
    statusBadge = {
      label: 'Aprovechamiento Moderado (65% - 79%)',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      desc: 'El pliego es aceptable, pero hay margen de optimización mediante formato o corte.'
    };
  }

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-xs p-6 space-y-6">
      
      {/* Header with Title and Overall Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                Diagnóstico & Optimizador de Aprovechamiento
              </h3>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusBadge.bg} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análisis litográfico del rendimiento de papel y recomendaciones para reducir costos
            </p>
          </div>
        </div>

        {/* Dual Efficiency Numbers */}
        <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eficiencia Bruta</span>
            <span className={`text-xl font-black ${
              efficiencyPct >= 80 ? 'text-emerald-600' : efficiencyPct >= 65 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {efficiencyPct}%
            </span>
          </div>
          <div className="h-7 w-[1px] bg-slate-200" />
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block" title="Descontando pinza obligatoria de máquina">
              Área Imprimible
            </span>
            <span className="text-xl font-black text-slate-800">
              {efficiencyNetPct}%
            </span>
          </div>
        </div>
      </div>

      {/* 1. VISUAL DISTRIBUTION BAR (Pérdidas y Distribución de Área) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <PieChart size={14} className="text-teal-600" />
            ¿A dónde se va el área de tu pliego? (Desglose de Pérdidas):
          </span>
          <span className="text-[11px] text-slate-400">Total Pliego: {sheetWidthCm}x{sheetHeightCm} cm</span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/60">
          {/* Useful pieces */}
          <div 
            style={{ width: `${efficiencyPct}%` }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all"
            title={`Área Neta Útil: ${efficiencyPct}%`}
          />
          {/* Gripper */}
          <div 
            style={{ width: `${pctGripper}%` }}
            className="bg-amber-400 h-full transition-all"
            title={`Pinza de Prensa (No Imprimible): ${pctGripper}%`}
          />
          {/* Margins */}
          <div 
            style={{ width: `${pctMargins}%` }}
            className="bg-sky-400 h-full transition-all"
            title={`Guías Laterales / Registro: ${pctMargins}%`}
          />
          {/* Gutter spacing */}
          {pctSpacing > 0 && (
            <div 
              style={{ width: `${pctSpacing}%` }}
              className="bg-indigo-400 h-full transition-all"
              title={`Calles de Doble Corte: ${pctSpacing}%`}
            />
          )}
          {/* Unused waste */}
          <div 
            style={{ width: `${Math.max(0, pctUnusedWaste)}%` }}
            className="bg-slate-300 h-full transition-all"
            title={`Retazo / Sobrante No Utilizado: ${pctUnusedWaste}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 flex-shrink-0" />
            <span className="font-bold text-slate-800">{efficiencyPct}% Piezas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 flex-shrink-0" />
            <span className="text-slate-600">{pctGripper}% Pinza prensa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 flex-shrink-0" />
            <span className="text-slate-600">{pctMargins}% Guías registro</span>
          </div>
          {pctSpacing > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 flex-shrink-0" />
              <span className="text-slate-600">{pctSpacing}% Calles corte</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 flex-shrink-0" />
            <span className="font-bold text-slate-700">{pctUnusedWaste}% Retazo muerto</span>
          </div>
        </div>
      </div>

      {/* 2. THREE KEY REASONS & DIRECT SOLUTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        
        {/* Solution 1: Format choice */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasBetterSheet ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-300/40' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-lg ${hasBetterSheet ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
              <Layers size={15} />
            </div>
            <span className="text-xs font-black text-slate-900">1. Formato de Pliego</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {hasBetterSheet && bestComparison ? (
              <>El formato <strong>{bestComparison.sheetName}</strong> rinde <strong>{bestComparison.efficiencyPct}%</strong> (+{bestComparison.efficiencyPct - efficiencyPct}% vs actual).</>
            ) : (
              <>El formato actual ({sheetWidthCm}x{sheetHeightCm} cm) es el más equilibrado para esta medida.</>
            )}
          </p>
          {hasBetterSheet && bestComparison && (
            <button
              onClick={() => onApplyOptimalSheet(bestComparison.sheetId)}
              className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
            >
              <span>Aplicar {bestComparison.sheetName.split('(')[0]}</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Solution 2: Cutting Policy */}
        <div className={`p-4 rounded-2xl border transition-all ${
          impositionPolicy === 'doble_corte' ? 'bg-teal-50/50 border-teal-200' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-lg ${impositionPolicy === 'doble_corte' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-700'}`}>
              <Scissors size={15} />
            </div>
            <span className="text-xs font-black text-slate-900">2. Política de Corte</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {impositionPolicy === 'doble_corte' ? (
              <>Las calles de {spacingBetweenPiecesMm}mm consumen <strong>{pctSpacing}%</strong> del pliego y exigen el doble de pases de guillotina.</>
            ) : (
              <>Corte común activo (0 mm). Se maximizan las cabidas y se reduce el 50% de cortes de guillotina.</>
            )}
          </p>
          {impositionPolicy === 'doble_corte' && (
            <button
              onClick={onApplyCommonCut}
              className="mt-3 w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
            >
              <span>Activar Corte Común (0 mm)</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Solution 3: Standardize Piece Size */}
        <div className={`p-4 rounded-2xl border transition-all ${
          smartFitSuggestions.length > 0 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-lg ${smartFitSuggestions.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
              <Maximize2 size={15} />
            </div>
            <span className="text-xs font-black text-slate-900">3. Ajuste Milimétrico ("Smart Fit")</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {smartFitSuggestions.length > 0 ? (
              <>Reduciendo {Math.abs(smartFitSuggestions[0].diffWidthMm || smartFitSuggestions[0].diffHeightMm)}mm la pieza ganas <strong>+{smartFitSuggestions[0].extraPoses} poses</strong> por pliego.</>
            ) : (
              <>La medida de la pieza ({pieceWidthMm}x{pieceHeightMm} mm) encaja de forma simétrica sin ganar filas con micro-ajustes.</>
            )}
          </p>
          {smartFitSuggestions.length > 0 && (
            <button
              onClick={() => onApplySmartFit(smartFitSuggestions[0])}
              className="mt-3 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
            >
              <span>Ajustar a {smartFitSuggestions[0].targetWidthMm}x{smartFitSuggestions[0].targetHeightMm} mm</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

      </div>

      {/* 3. COMPARADOR DE FORMATOS DE PLIEGO EN TIEMPO REAL */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Comparativa de Rendimiento por Formato de Pliego
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Calculado para {pieceWidthMm} x {pieceHeightMm} mm | Tiraje: {calculation.totalSheetsToCut} pliegos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] text-slate-500">
                <th className="py-2.5 px-3 font-bold rounded-l-xl">Formato / Máquina</th>
                <th className="py-2.5 px-3 font-bold text-center">Medida (cm)</th>
                <th className="py-2.5 px-3 font-bold text-center">Poses x Pliego</th>
                <th className="py-2.5 px-3 font-bold text-center">Aprovechamiento</th>
                <th className="py-2.5 px-3 font-bold text-center">Resmas 70x100</th>
                <th className="py-2.5 px-3 font-bold text-right rounded-r-xl">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sheetComparisons.map((item) => (
                <tr 
                  key={item.sheetId}
                  className={`transition-colors ${
                    item.isCurrent 
                      ? 'bg-teal-50/60 font-semibold' 
                      : item.isBest 
                      ? 'bg-amber-50/40 hover:bg-amber-50/80' 
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.sheetName}</span>
                      {item.isCurrent && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-teal-600 text-white rounded-full">
                          Actual
                        </span>
                      )}
                      {item.isBest && !item.isCurrent && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-full">
                          ⭐ Más Eficiente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                    {item.widthCm} &times; {item.heightCm}
                  </td>
                  <td className="py-2.5 px-3 text-center font-black text-slate-900">
                    {item.totalPoses} poses
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`font-black ${
                        item.efficiencyPct >= 80 ? 'text-emerald-600' : item.efficiencyPct >= 65 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {item.efficiencyPct}%
                      </span>
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          style={{ width: `${item.efficiencyPct}%` }}
                          className={`h-full ${
                            item.efficiencyPct >= 80 ? 'bg-emerald-500' : item.efficiencyPct >= 65 ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-700 font-mono text-[11px]">
                    {item.reamsCount} rsm
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {item.isCurrent ? (
                      <span className="text-[11px] text-teal-700 font-bold flex items-center justify-end gap-1">
                        <CheckCircle2 size={13} />
                        Seleccionado
                      </span>
                    ) : (
                      <button
                        onClick={() => onApplyOptimalSheet(item.sheetId)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 transition-all shadow-xs"
                      >
                        Usar Pliego
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
