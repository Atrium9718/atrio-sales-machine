import React from 'react';
import { ConnectedClientProject, ClientProjectItem, CalculationResult } from './types';

interface PrintableWorkOrderProps {
  project: ConnectedClientProject | null;
  activeItem: ClientProjectItem | null;
  calculation: CalculationResult;
  sheetWidthCm: number;
  sheetHeightCm: number;
  gripperMarginMm: number;
  lateralMarginMm: number;
  pieceWidthMm: number;
  pieceHeightMm: number;
  pieceBleedMm: number;
  spacingBetweenPiecesMm: number;
  runQuantity: number;
  wastePercentage: number;
  jobName: string;
  impositionPolicy: 'corte_comun' | 'doble_corte';
}

export default function PrintableWorkOrder({
  project,
  activeItem,
  calculation,
  sheetWidthCm,
  sheetHeightCm,
  gripperMarginMm,
  lateralMarginMm,
  pieceWidthMm,
  pieceHeightMm,
  pieceBleedMm,
  spacingBetweenPiecesMm,
  runQuantity,
  wastePercentage,
  jobName,
  impositionPolicy,
}: PrintableWorkOrderProps) {
  return (
    <div className="hidden print:block p-8 bg-white text-slate-950 text-xs font-sans max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            Ficha Técnica & Orden de Imposición CTP
          </h1>
          <p className="text-xs font-bold text-slate-600">
            Taller Litográfico & Prensa Offset — Control de Producción
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-black font-mono border-2 border-slate-900 px-3 py-1 rounded-md block">
            {project?.id || jobName}
          </span>
          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
            Fecha: {new Date().toLocaleDateString('es-CO')}
          </span>
        </div>
      </div>

      {/* Grid: 2 Columns (Client Data vs Job Data) */}
      <div className="grid grid-cols-2 gap-6 border-b border-slate-300 pb-6 mb-6">
        
        {/* Client Info */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            1. Datos del Cliente & Despacho
          </h3>
          <p><strong>Cliente:</strong> {project?.clientName || 'Cliente Particular'}</p>
          <p><strong>NIT / C.C.:</strong> {project?.clientNit || 'N/A'}</p>
          <p><strong>Teléfono:</strong> {project?.clientPhone || 'N/A'}</p>
          <p><strong>Email:</strong> {project?.clientEmail || 'N/A'}</p>
          <p><strong>Ciudad de Entrega:</strong> {project?.clientCity || 'Colombia'}</p>
          {project?.internalNotes && (
            <p className="text-[11px] text-slate-600 mt-2 italic">
              <strong>Notas:</strong> {project.internalNotes}
            </p>
          )}
        </div>

        {/* Product & Material Specs */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            2. Especificaciones del Producto & Sustrato
          </h3>
          <p><strong>Producto:</strong> {activeItem?.productName || jobName}</p>
          <p><strong>Sustrato / Papel:</strong> {activeItem?.paperType || 'Propalcote 300g'}</p>
          <p><strong>Acabados:</strong> {activeItem?.finishes?.join(', ') || 'Plastificado Mate'}</p>
          <p><strong>Tintas de Prensa:</strong> {activeItem?.inks || '4x4 CMYK (Ambas Caras)'}</p>
          <p><strong>Medida Neta Pieza:</strong> {pieceWidthMm} x {pieceHeightMm} mm</p>
          <p><strong>Sangrado Perimetral:</strong> {pieceBleedMm} mm</p>
        </div>

      </div>

      {/* Imposition & Cutting Metrics */}
      <div className="border-b border-slate-300 pb-6 mb-6">
        <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 mb-3">
          3. Esquema de Imposición & Guillotina
        </h3>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="border border-slate-300 p-3 rounded-lg">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Pliego de Prensa</span>
            <strong className="text-base font-black text-slate-900 block mt-0.5">
              {sheetWidthCm} x {sheetHeightCm} cm
            </strong>
            <span className="text-[10px] text-slate-500">Pinza: {gripperMarginMm}mm</span>
          </div>

          <div className="border border-slate-300 p-3 rounded-lg">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Poses x Pliego</span>
            <strong className="text-base font-black text-slate-900 block mt-0.5">
              {calculation.bestTotal} poses
            </strong>
            <span className="text-[10px] text-slate-500">{calculation.bestCols} x {calculation.bestRows}</span>
          </div>

          <div className="border border-slate-300 p-3 rounded-lg">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Política de Corte</span>
            <strong className="text-base font-black text-slate-900 block mt-0.5">
              {impositionPolicy === 'corte_comun' ? 'Corte Común (0mm)' : `Doble Corte (${spacingBetweenPiecesMm}mm)`}
            </strong>
            <span className="text-[10px] text-slate-500">{calculation.guillotineCutsCount} cortes totales</span>
          </div>

          <div className="border border-slate-300 p-3 rounded-lg">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Papel Requerido</span>
            <strong className="text-base font-black text-slate-900 block mt-0.5">
              {calculation.totalSheetsToCut} pliegos
            </strong>
            <span className="text-[10px] text-slate-500">({calculation.reamsCount} resmas 70x100)</span>
          </div>
        </div>
      </div>

      {/* Production Run Quantities */}
      <div className="border-b border-slate-300 pb-6 mb-6">
        <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 mb-2">
          4. Desglose de Tiraje & Mermas
        </h3>
        <table className="w-full text-left border border-slate-300 text-xs">
          <thead className="bg-slate-100 font-bold">
            <tr>
              <th className="p-2 border-b border-slate-300">Concepto</th>
              <th className="p-2 border-b border-slate-300">Cantidad</th>
              <th className="p-2 border-b border-slate-300">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b border-slate-200">Tiraje Neto Solicitado</td>
              <td className="p-2 border-b border-slate-200 font-bold">{runQuantity.toLocaleString()} unidades</td>
              <td className="p-2 border-b border-slate-200">{calculation.effectiveSheetsNeeded} pliegos máquina</td>
            </tr>
            <tr>
              <td className="p-2 border-b border-slate-200">Merma de Impresión ({wastePercentage}%)</td>
              <td className="p-2 border-b border-slate-200 font-bold">{calculation.wasteSheets} pliegos</td>
              <td className="p-2 border-b border-slate-200">Ajuste de registro y color</td>
            </tr>
            <tr className="bg-slate-50 font-black">
              <td className="p-2">Total Pliegos a Guillotinar / Imprimir</td>
              <td className="p-2">{calculation.totalSheetsToCut} pliegos de {sheetWidthCm}x{sheetHeightCm} cm</td>
              <td className="p-2">Equivalente a {calculation.parentSheets70x100} pliegos enteros 70x100 cm</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures & Quality Approval */}
      <div className="grid grid-cols-4 gap-6 pt-6 text-center text-[10px]">
        <div className="border-t border-slate-900 pt-2">
          <strong>Pre-prensa / CTP</strong>
          <p className="text-slate-400 mt-1">Firma & Fecha</p>
        </div>
        <div className="border-t border-slate-900 pt-2">
          <strong>Prensa Offset</strong>
          <p className="text-slate-400 mt-1">Firma & Fecha</p>
        </div>
        <div className="border-t border-slate-900 pt-2">
          <strong>Guillotina / Acabados</strong>
          <p className="text-slate-400 mt-1">Firma & Fecha</p>
        </div>
        <div className="border-t border-slate-900 pt-2">
          <strong>Control de Calidad</strong>
          <p className="text-slate-400 mt-1">Firma & Fecha</p>
        </div>
      </div>

    </div>
  );
}
