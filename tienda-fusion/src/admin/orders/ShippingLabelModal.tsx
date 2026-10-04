import React, { useRef } from 'react';
import { Printer, Download, Truck, Package, ShieldCheck, X, QrCode, ExternalLink } from 'lucide-react';
import { ShippingLabelData, generateBarcodeSvg } from '../../lib/shippingEngine';

interface ShippingLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelData: ShippingLabelData;
}

export default function ShippingLabelModal({ isOpen, onClose, labelData }: ShippingLabelModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeSvg = generateBarcodeSvg(labelData.trackingNumber);
  const trackingUrl = `${window.location.origin}/rastreo?code=${encodeURIComponent(labelData.orderNumber)}`;

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col">
        
        {/* MODAL HEADER (NO-PRINT) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Rótulo de Despacho y Guía de Transporte</h2>
              <p className="text-xs text-slate-500">Etiqueta adhesiva estandarizada para caja, refilado de envío y escaneo QR.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Ver Rastreo Público</span>
            </a>
            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
            >
              <Printer size={15} />
              <span>Imprimir Rótulo</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE LABEL CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-100/60">
          
          <div 
            ref={printContainerRef}
            className="w-full max-w-[520px] bg-white border-2 border-dashed border-slate-400 p-6 shadow-md rounded-2xl print:border-solid print:border-black print:p-4 print:shadow-none print:max-w-none print:w-full print:rounded-none"
            id="printable-shipping-label"
          >
            {/* CARRIER HEADER & LOGO */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
              <div>
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">Transportadora Oficial</span>
                <span className="text-lg font-black text-slate-950 uppercase tracking-tight">{labelData.carrierName}</span>
                <span className="block text-[11px] font-bold text-teal-700">{labelData.serviceType}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Orden</span>
                <div className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                  {labelData.orderNumber}
                </div>
              </div>
            </div>

            {/* BARCODE & QR SECTION */}
            <div className="grid grid-cols-4 gap-3 items-center my-3 py-2 border-y border-slate-200 bg-slate-50/60 p-2 rounded-lg">
              <div className="col-span-3 text-center">
                <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                <div className="text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                  GUÍA: <span className="font-mono text-sm">{labelData.trackingNumber}</span>
                </div>
              </div>
              <div className="col-span-1 flex flex-col items-center justify-center border-l border-slate-200 pl-2">
                <div className="w-14 h-14 bg-white border border-slate-300 rounded p-1 flex items-center justify-center shadow-2xs">
                  {/* Visual QR Code Pattern */}
                  <svg viewBox="0 0 33 33" className="w-full h-full text-slate-900 fill-current">
                    <rect x="0" y="0" width="11" height="11" />
                    <rect x="2" y="2" width="7" height="7" fill="white" />
                    <rect x="4" y="4" width="3" height="3" />
                    
                    <rect x="22" y="0" width="11" height="11" />
                    <rect x="24" y="2" width="7" height="7" fill="white" />
                    <rect x="26" y="4" width="3" height="3" />
                    
                    <rect x="0" y="22" width="11" height="11" />
                    <rect x="2" y="24" width="7" height="7" fill="white" />
                    <rect x="4" y="26" width="3" height="3" />
                    
                    <rect x="14" y="4" width="4" height="4" />
                    <rect x="14" y="14" width="5" height="5" />
                    <rect x="22" y="14" width="4" height="4" />
                    <rect x="14" y="24" width="4" height="4" />
                    <rect x="24" y="24" width="5" height="5" />
                  </svg>
                </div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter mt-1">Escanea Rastreo</span>
              </div>
            </div>

            {/* SENDER & RECIPIENT GRID */}
            <div className="grid grid-cols-2 gap-3 text-xs border-b-2 border-black pb-4 mb-3">
              
              {/* REMITENTE */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-black text-[10px] text-slate-400 uppercase block tracking-wider mb-1">
                  REMITENTE (ORIGEN)
                </span>
                <p className="font-bold text-slate-900 leading-tight">{labelData.senderName}</p>
                <p className="text-[11px] text-slate-600">NIT: {labelData.senderNit}</p>
                <p className="text-[11px] text-slate-600">{labelData.senderAddress}</p>
                <p className="font-bold text-slate-800">{labelData.senderCity}</p>
                <p className="text-[10px] text-slate-500">Tel: {labelData.senderPhone}</p>
              </div>

              {/* DESTINATARIO */}
              <div className="bg-teal-50/60 p-2.5 rounded-lg border-2 border-teal-600">
                <span className="font-black text-[10px] text-teal-800 uppercase block tracking-wider mb-1">
                  DESTINATARIO (ENTREGA)
                </span>
                <p className="font-extrabold text-slate-950 text-sm leading-tight">{labelData.recipientName}</p>
                <p className="text-[11px] text-slate-700">CC/NIT: {labelData.recipientNit}</p>
                <p className="text-[11px] font-bold text-slate-900 mt-1">{labelData.recipientAddress}</p>
                <p className="font-black text-sm text-teal-900 uppercase">{labelData.recipientCity}, {labelData.recipientDepartment}</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Cel: {labelData.recipientPhone}</p>
              </div>

            </div>

            {/* PACKAGE METRICS */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3 border-b border-slate-200 pb-3">
              <div className="bg-slate-100 p-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 block">PESO REAL</span>
                <span className="font-black text-slate-900">{labelData.realWeightKg} Kg</span>
              </div>
              <div className="bg-slate-100 p-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 block">PESO VOL</span>
                <span className="font-black text-slate-900">{labelData.volumetricWeightKg} Kg</span>
              </div>
              <div className="bg-slate-100 p-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 block">BULTOS</span>
                <span className="font-black text-slate-900">{labelData.packageIndex || 1} de {labelData.packageCount || 1}</span>
              </div>
              <div className="bg-slate-100 p-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 block">VALOR DECL.</span>
                <span className="font-black text-slate-900 text-[11px]">{formatCOP(labelData.declaredValue)}</span>
              </div>
            </div>

            {/* PACKAGE FOOTER / INSTRUCTIONS */}
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700">Contenido: {labelData.contentDescription}</p>
                <p>Fecha Despacho: {labelData.creationDate}</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[9px]">
                  MANIPULAR CON CUIDADO
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* MODAL FOOTER (NO-PRINT) */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <span className="text-xs text-slate-500">
            Formato estándar compatible con impresoras térmicas (Zebra/Xprinter) y papel carta/adhesivo.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <Printer size={15} />
              <span>Imprimir Rótulo de Caja</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
