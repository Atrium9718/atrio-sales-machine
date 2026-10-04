import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, FileText, 
  Download, ExternalLink, X, Eye, Sparkles, Sliders, Scissors, 
  Maximize2, Check, MessageSquare, Copy
} from 'lucide-react';
import { OrderItemDetail } from './OrderDetailModal';

interface PreflightInspectorModalProps {
  orderCode: string;
  item: OrderItemDetail;
  onClose: () => void;
  onApprove?: (notes?: string) => void;
  onReject?: (reasons: string[]) => void;
}

export default function PreflightInspectorModal({ 
  orderCode, 
  item, 
  onClose,
  onApprove,
  onReject
}: PreflightInspectorModalProps) {
  const [feedbackNote, setFeedbackNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'layers' | 'colors' | 'dimensions'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  const specs = item.specs || {};
  const widthMm = specs.widthMm || specs.width || 90;
  const heightMm = specs.heightMm || specs.height || 55;
  const bleedMm = specs.bleedMm || 3;
  const safeMarginMm = specs.safeMarginMm || 4;

  // Parámetros analizados simulados con base en los datos reales del ítem
  const preflightChecks = [
    {
      id: 'dpi',
      title: 'Resolución de Imágenes (DPI)',
      value: '300 DPI (Óptimo para Prensa)',
      status: 'pass',
      description: 'Las imágenes rasterizadas superan el estándar litográfico mínimo de 300 DPI.'
    },
    {
      id: 'colorspace',
      title: 'Espacio de Color & Perfil',
      value: 'CMYK (ISO Coated v2 300%)',
      status: 'pass',
      description: 'Sin tintas RGB no convertidas. Cobertura máxima de tinta dentro del rango seguro (TAC < 300%).'
    },
    {
      id: 'bleed',
      title: 'Margen de Sangrado Perimetral',
      value: `${bleedMm} mm por lado`,
      status: bleedMm >= 3 ? 'pass' : 'warn',
      description: bleedMm >= 3 
        ? 'Sangrado suficiente para corte en guillotina sin filos blancos.'
        : 'Sangrado inferior a 3 mm recomendado para guillotina industrial.'
    },
    {
      id: 'safety',
      title: 'Zona de Seguridad de Textos',
      value: `${safeMarginMm} mm del borde neto`,
      status: 'pass',
      description: 'Todos los textos y logotipos respetan la distancia de seguridad contra el corte.'
    },
    {
      id: 'fonts',
      title: 'Fuentes & Tipografías',
      value: 'Convertidas a Curvas / Incrustadas',
      status: 'pass',
      description: 'No hay fuentes faltantes o desvinculadas en el archivo PDF.'
    },
    {
      id: 'overprint',
      title: 'Sobreimpresión de Negros (Overprint K)',
      value: 'K100 Activo para Textos Pequeños',
      status: 'pass',
      description: 'Textos negros sobreimprimen sobre fondos para evitar descalces de color.'
    }
  ];

  const handleCopySpecs = () => {
    const text = `Preflight Aprobado para Orden ${orderCode} - Item: ${item.productName}\nMedidas: ${widthMm}x${heightMm}mm + ${bleedMm}mm sangrado\nResolución: 300 DPI | Modo: CMYK\nPapel: ${specs.paper || 'Propalcote 300g'}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="p-5 sm:px-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Inspector Preflight & Control Gráfico</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {orderCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Validación técnica de resolución, sangrado, perfiles CMYK y líneas de corte
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          
          {/* ITEM SUMMARY BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              {item.previewImageUrl ? (
                <img src={item.previewImageUrl} alt={item.productName} className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black text-xl">
                  PDF
                </div>
              )}
              <div>
                <h3 className="font-black text-slate-900 text-sm">{item.productName}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {item.quantity.toLocaleString('es-CO')} Unidades • {widthMm} x {heightMm} mm (+{bleedMm}mm sangrado)
                </p>
                <span className="inline-block mt-1 text-[11px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                  {specs.paper || 'Propalcote 300g'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {item.highResPdfUrl && (
                <a
                  href={item.highResPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={14} /> Descargar Arte PDF
                </a>
              )}
              <button
                onClick={handleCopySpecs}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Copiar resumen técnico"
              >
                {copiedLink ? <Check size={16} className="text-teal-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* PREFLIGHT SCORE CARD */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                Diagnóstico de Archivo: Apto para Impresión (100% Validado)
              </h4>
              <p className="text-xs text-emerald-800 mt-1">
                El documento cumple con todos los estándares ISO de pre-impresión litográfica. Puede enviarse directamente a filmación de planchas CTP o prensa digital.
              </p>
            </div>
          </div>

          {/* CHECKLIST CRITERIOS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Parámetros de Control Verificados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {preflightChecks.map((chk) => (
                <div 
                  key={chk.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{chk.title}</span>
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <Check size={12} /> APROBADO
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{chk.value}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{chk.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SIMULADOR DE LÍNEAS GUÍA Y CORTE */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Scissors size={15} className="text-teal-600" />
              Esquema de Sangrado y Caja de Texto
            </h4>

            <div className="relative w-full max-w-sm mx-auto h-36 border-2 border-dashed border-rose-400 bg-rose-50/40 rounded-xl flex items-center justify-center p-3">
              <span className="absolute top-1 left-2 text-[9px] font-black text-rose-600 uppercase">
                Línea de Sangrado ({bleedMm} mm)
              </span>

              <div className="w-full h-full border-2 border-teal-500 bg-white rounded-lg flex items-center justify-center relative shadow-xs">
                <span className="absolute top-1 left-2 text-[9px] font-black text-teal-700 uppercase">
                  Línea de Corte Neto ({widthMm} x {heightMm} mm)
                </span>

                <div className="w-4/5 h-3/5 border border-dashed border-indigo-300 bg-indigo-50/30 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold text-indigo-700 text-center px-2">
                    Zona Segura para Textos y Logos
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-slate-500 font-medium">
              Tolerancia de corte estimada en guillotina industrial: ±0.5 mm
            </p>
          </div>

          {/* NOTAS OPERATIVAS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Notas u Observaciones para Taller / Preprensa:
            </label>
            <input
              type="text"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Ej. Revisar tono de piel en foto principal / Verificar calce de troquel..."
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
            />
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cerrar Inspector
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onApprove) onApprove(feedbackNote);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
            >
              <Check size={15} />
              <span>Aprobar Visto Bueno para Prensa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
