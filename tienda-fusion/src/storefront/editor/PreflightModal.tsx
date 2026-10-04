import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, FileText, Download, 
  Settings2, Sliders, ShieldCheck, Printer, RefreshCw, Layers, Sparkles 
} from 'lucide-react';
import { 
  PreflightReport, 
  PreflightIssue, 
  ExportPdfOptions, 
  runPreflightCheck, 
  generateProductionPdf 
} from '../../lib/pdfPreflightEngine';

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: any[];
  dimensions: { widthMm: number; heightMm: number; bleedMm: number; safetyMm: number };
  getCanvasElement: () => HTMLCanvasElement | null;
  productName?: string;
  orderNumber?: string;
}

export default function PreflightModal({
  isOpen,
  onClose,
  elements,
  dimensions,
  getCanvasElement,
  productName = 'Producto Litográfico',
  orderNumber = 'ORD-ONLINE'
}: PreflightModalProps) {
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'report' | 'export_settings'>('report');

  const [pdfOptions, setPdfOptions] = useState<ExportPdfOptions>({
    standard: 'PDF/X-1a',
    includeCropMarks: true,
    includeBleedMarks: true,
    includeColorBars: true,
    includeJobInfo: true,
    bleedMm: dimensions.bleedMm || 3,
    dpi: 300,
    cmykSimulation: true,
    productName,
    orderNumber
  });

  useEffect(() => {
    if (isOpen) {
      const rep = runPreflightCheck(elements, dimensions);
      setReport(rep);
    }
  }, [isOpen, elements, dimensions]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    const canvas = getCanvasElement();
    if (!canvas) {
      alert('No se pudo capturar el lienzo de trabajo.');
      return;
    }

    try {
      setIsExporting(true);
      const blob = await generateProductionPdf(
        canvas,
        {
          widthMm: dimensions.widthMm,
          heightMm: dimensions.heightMm,
          bleedMm: pdfOptions.bleedMm
        },
        pdfOptions
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IMPRESION_${(productName || 'DISENO').replace(/\s+/g, '_').toUpperCase()}_${pdfOptions.standard}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Hubo un error al generar el PDF de alta resolución.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Preflight & Exportación Litográfica Pro
                <span className="bg-teal-100 text-teal-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                  300 DPI CMYK
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Auditoría técnica de preprensa y generación de archivo PDF/X para planchas CTP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'report' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auditoría ({report?.issues.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('export_settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'export_settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Opciones PDF/X
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'report' ? (
            <div className="space-y-6">
              
              {/* Score Bar */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl ${
                    (report?.score || 0) >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    (report?.score || 0) >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {report?.score || 0}%
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {(report?.score || 0) >= 90 ? 'Listo para Impresión Litográfica Óptima' :
                       (report?.score || 0) >= 70 ? 'Apto con advertencias menores' : 'Requiere correcciones antes de imprimir'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {report?.resolutionSummary.lowResImagesCount 
                        ? `${report.resolutionSummary.lowResImagesCount} imágenes de baja resolución detectadas.` 
                        : 'Resolución de rasterizado y vectorizado aprobados.'}
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-700">DPI Mínimo: {report?.resolutionSummary.minDpi} DPI</div>
                  <div className="text-[11px] text-slate-400">Sangrado: {dimensions.bleedMm} mm | Margen: {dimensions.safetyMm} mm</div>
                </div>
              </div>

              {/* Lista de Hallazgos */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Inspección de Preprensa</h4>

                {report?.issues.length === 0 ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center text-emerald-800">
                    <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-sm">¡Excelente! El diseño cumple con todos los estándares gráficos.</p>
                    <p className="text-xs text-emerald-600 mt-1">Sin desbordes de texto ni imágenes pixeladas.</p>
                  </div>
                ) : (
                  report?.issues.map((issue: PreflightIssue) => (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                        issue.type === 'error' ? 'bg-red-50/60 border-red-200/80 text-red-900' :
                        issue.type === 'warning' ? 'bg-amber-50/60 border-amber-200/80 text-amber-900' :
                        'bg-blue-50/60 border-blue-200/80 text-blue-900'
                      }`}
                    >
                      {issue.type === 'error' ? <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" /> :
                       issue.type === 'warning' ? <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" /> :
                       <CheckCircle2 size={20} className="text-blue-500 shrink-0 mt-0.5" />}
                      
                      <div className="flex-1 text-xs">
                        <div className="font-bold text-sm">{issue.title}</div>
                        <p className="mt-0.5 opacity-90">{issue.description}</p>
                        <p className="mt-1.5 font-semibold text-[11px] bg-white/70 px-2.5 py-1 rounded-lg inline-block border border-black/5">
                          💡 Recomendación: {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Estándar Gráfico PDF</label>
                  <select
                    value={pdfOptions.standard}
                    onChange={(e) => setPdfOptions({ ...pdfOptions, standard: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    <option value="PDF/X-1a">PDF/X-1a (Offset Tradicional - CMYK Plano)</option>
                    <option value="PDF/X-4">PDF/X-4 (Offset Digital / Transparencias Vivas)</option>
                    <option value="HiRes-300DPI">PDF Alta Resolución 300 DPI estándar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Sangrado Perimetral (Bleed)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={pdfOptions.bleedMm}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, bleedMm: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                    />
                    <span className="text-xs font-bold text-slate-400">mm</span>
                  </div>
                </div>

              </div>

              {/* Switches de marcas técnicas */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Marcas de Imprenta</h4>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">Cruces y Marcas de Corte (Crop Marks)</div>
                    <div className="text-slate-400">Líneas de registro para corte de guillotina.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeCropMarks}
                    onChange={(e) => setPdfOptions({ ...pdfOptions, includeCropMarks: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-md focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer border-t border-slate-200/60 pt-3">
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">Tira de Control de Color CMYK (Color Bars)</div>
                    <div className="text-slate-400">Parches densitométricos para control de entintado.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeColorBars}
                    onChange={(e) => setPdfOptions({ ...pdfOptions, includeColorBars: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-md focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer border-t border-slate-200/60 pt-3">
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">Información Técnica del Trabajo (Job Info)</div>
                    <div className="text-slate-400">Nombre de orden, fecha y especificaciones al pie.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeJobInfo}
                    onChange={(e) => setPdfOptions({ ...pdfOptions, includeJobInfo: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-md focus:ring-0"
                  />
                </label>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Exportar PDF/X Listo para Imprenta</span>
          </button>
        </div>

      </div>
    </div>
  );
}
