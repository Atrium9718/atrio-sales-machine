import React, { useRef } from 'react';
import { 
  Printer, Download, X, CheckSquare, Layers, FileText, 
  Calendar, User, MapPin, AlertCircle, ShieldCheck, Scissors, 
  CheckCircle2, Sparkles, Box, Phone, Mail, Hash
} from 'lucide-react';
import jsPDF from 'jspdf';
import { OrderDetail, OrderItemDetail } from './OrderDetailModal';

interface JobTicketModalProps {
  order: OrderDetail;
  items: OrderItemDetail[];
  onClose: () => void;
}

export default function JobTicketModal({ order, items, onClose }: JobTicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Cálculos litográficos de taller
  const calculateJobMetrics = (item: OrderItemDetail) => {
    const qty = item.quantity || 1000;
    const specs = item.specs || {};
    
    // Dimensiones de pieza
    let widthMm = specs.widthMm || specs.width || 90;
    let heightMm = specs.heightMm || specs.height || 55;
    
    // Papel
    const paperName = specs.paper || specs.paperType || specs.material || 'Propalcote 300g';
    
    // Estimación de pliego sugerido y poses
    let sheetName = 'Medio Pliego (50 x 70 cm)';
    let posesPerSheet = 24; // Default para tarjetas en 50x70
    
    if (widthMm > 150 || heightMm > 220) {
      // Formato grande (Afiche / Revista)
      sheetName = 'Pliego Completo (70 x 100 cm)';
      posesPerSheet = 4;
    } else if (widthMm > 100 || heightMm > 140) {
      // Media carta / Cuarto
      sheetName = 'Medio Pliego (50 x 70 cm)';
      posesPerSheet = 8;
    }

    // Pliegos brutos y merma
    const netSheets = Math.ceil(qty / posesPerSheet);
    const wastePercent = qty <= 1000 ? 0.08 : 0.05; // 8% merma en tirajes cortos, 5% en medianos
    const wasteSheets = Math.ceil(netSheets * wastePercent) + 15; // +15 hojas para registro y pinza
    const totalGrossSheets = netSheets + wasteSheets;

    return {
      qty,
      widthMm,
      heightMm,
      paperName,
      sheetName,
      posesPerSheet,
      netSheets,
      wasteSheets,
      totalGrossSheets,
      inks: specs.inks || specs.tinta || '4x4 CMYK (Ambas Caras)',
      finishes: specs.finishes || specs.acabados || ['Plastificado Mate', 'Refilado Guillotina'],
      machine: qty > 300 ? 'Prensa Offset Heidelberg Speedmaster 4C' : 'Prensa Digital Xerox Iridesse'
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Encabezado
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HOJA DE RUTA & TICKET DE PRODUCCIÓN LITOGRÁFICA', 105, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('FUSIÓN COMUNICACIÓN GRÁFICA W2P — CONTROL DE TALLER & PRENSA', 105, 18, { align: 'center' });

    // Código y Fecha
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORDEN: ${order.code}`, 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha Ingreso: ${new Date(order.createdAt).toLocaleDateString('es-CO')}`, 14, 40);
    doc.text(`Estado Actual: ${order.status}`, 14, 45);

    // Cliente
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE / DESPACHO:', 110, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${order.customerName || order.userEmail}`, 110, 40);
    doc.text(`Tel: ${order.customerPhone || 'N/A'} | Ciudad: ${order.customerCity || 'N/A'}`, 110, 45);
    doc.text(`Dirección: ${order.customerAddress || 'Entrega en Planta'}`, 110, 50);

    // Línea divisoria
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 55, 196, 55);

    let currentY = 62;

    // Items
    items.forEach((item, index) => {
      const metrics = calculateJobMetrics(item);

      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`ITEM ${index + 1}: ${item.productName.toUpperCase()} — CANTIDAD: ${item.quantity.toLocaleString('es-CO')} UNIDADES`, 17, currentY + 5.5);

      currentY += 12;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      doc.text(`• Formato de Pieza: ${metrics.widthMm} x ${metrics.heightMm} mm (Sangrado 3 mm)`, 17, currentY);
      doc.text(`• Sustrato / Papel: ${metrics.paperName}`, 17, currentY + 5);
      doc.text(`• Máquina Asignada: ${metrics.machine}`, 17, currentY + 10);
      doc.text(`• Tintas: ${metrics.inks}`, 17, currentY + 15);

      doc.text(`• Pliego de Prensa: ${metrics.sheetName}`, 110, currentY);
      doc.text(`• Poses por Pliego: ${metrics.posesPerSheet} poses`, 110, currentY + 5);
      doc.text(`• Pliegos Netos: ${metrics.netSheets} hojas`, 110, currentY + 10);
      doc.text(`• Merma y Registro: +${metrics.wasteSheets} hojas (Total Bruto: ${metrics.totalGrossSheets} hojas)`, 110, currentY + 15);

      currentY += 24;

      // Acabados
      doc.setFont('helvetica', 'bold');
      doc.text(`Acabados: ${Array.isArray(metrics.finishes) ? metrics.finishes.join(' | ') : metrics.finishes}`, 17, currentY);
      currentY += 8;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY, 196, currentY);
      currentY += 6;
    });

    // Checkpoints de Taller
    doc.setFillColor(15, 23, 42);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('HOJA DE CONTROL Y FIRMAS DE OPERADORES (CHECKLIST)', 17, currentY + 4.8);

    currentY += 12;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const steps = [
      '1. [  ] Preprensa / Visto Bueno CTP (Planchas & Calibre)',
      '2. [  ] Corte Inicial / Desbaste Sustrato (Guillotina Polar)',
      '3. [  ] Tiraje en Prensa Offset / Impresión Digital',
      '4. [  ] Plastificado / Laminado Térmico',
      '5. [  ] Troquelado / Hendido / Perforado',
      '6. [  ] Refilado Final & Descarte de Merma',
      '7. [  ] Conteo, Empaque & Rotulado con Código de Barras'
    ];

    steps.forEach((step, i) => {
      const col = i < 4 ? 17 : 110;
      const rowY = currentY + (i % 4) * 6;
      doc.text(step, col, rowY);
    });

    currentY += 30;

    // Firmas
    doc.line(20, currentY + 15, 80, currentY + 15);
    doc.text('Firma Jefe de Producción / Preprensa', 25, currentY + 19);

    doc.line(130, currentY + 15, 190, currentY + 15);
    doc.text('Firma Operador de Prensa / Impresor', 135, currentY + 19);

    doc.save(`JobTicket_${order.code}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* MODAL WRAPPER */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 print:border-none print:shadow-none print:max-h-none print:rounded-none">
        
        {/* MODAL HEADER (HIDDEN ON PRINT) */}
        <div className="p-5 sm:px-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Hoja de Ruta & Job Ticket Litográfico</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-black bg-teal-500 text-slate-950">
                  {order.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Especificaciones técnicas para guillotina, montaje CTP, prensa y acabados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 active:scale-95"
              title="Descargar en PDF para imprimir en planta"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
            >
              <Printer size={15} />
              <span>Imprimir Ticket</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT BODY */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 bg-white print:p-0 print:space-y-4">
          
          {/* HEADER LITOGRÁFICO */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">FUSIÓN COMUNICACIÓN GRÁFICA</span>
                <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">Taller Litográfico</span>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Ficha Técnica de Producción / Job Ticket de Control Interno
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono bg-slate-100 border-2 border-slate-900 px-3 py-1 rounded-lg inline-block">
                {order.code}
              </span>
              <p className="text-[11px] font-bold text-slate-500 mt-1">
                Fecha: {new Date(order.createdAt).toLocaleDateString('es-CO')} — {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* DATOS DEL CLIENTE Y DESPACHO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 print:bg-transparent print:border-slate-300">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User size={14} className="text-teal-600" /> Datos del Cliente & Contacto
              </h3>
              <p className="text-xs font-bold text-slate-900">{order.customerName || order.userEmail}</p>
              <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                <Mail size={12} /> {order.userEmail}
              </p>
              {order.customerPhone && (
                <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                  <Phone size={12} /> {order.customerPhone}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-teal-600" /> Destino de Entrega & Despacho
              </h3>
              <p className="text-xs font-bold text-slate-900">
                {order.customerCity || 'Manizales'} {order.customerAddress ? `— ${order.customerAddress}` : '(Entrega en Planta)'}
              </p>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Método: <span className="font-bold text-slate-800">{order.shippingMethod || 'Despacho Terrestre'}</span> 
                {order.trackingCourier ? ` (${order.trackingCourier})` : ''}
              </p>
              {order.internalNotes && (
                <p className="text-[11px] text-amber-900 font-medium bg-amber-50 border border-amber-200 rounded p-1.5 mt-1.5">
                  <strong>Nota Taller:</strong> {order.internalNotes}
                </p>
              )}
            </div>
          </div>

          {/* DETALLE TÉCNICO DE ITEMS */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-2">
              <Layers size={15} className="text-teal-600" />
              Especificaciones Técnicas por Producto ({items.length} {items.length === 1 ? 'Item' : 'Items'})
            </h3>

            {items.map((item, idx) => {
              const metrics = calculateJobMetrics(item);
              return (
                <div key={item.id || idx} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 print:border-slate-300">
                  
                  {/* Título de Item */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="font-black text-sm text-slate-900">{item.productName}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg">
                        Tiraje: {item.quantity.toLocaleString('es-CO')} Unidades
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        {metrics.machine}
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Métricas Litográficas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    
                    {/* Formato y Sangrado */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Tamaño Final Neto</span>
                      <p className="font-black text-slate-900 mt-0.5">{metrics.widthMm} x {metrics.heightMm} mm</p>
                      <span className="text-[10px] text-teal-600 font-bold block mt-0.5">Sangrado: 3 mm perimetral</span>
                    </div>

                    {/* Sustrato */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Sustrato / Papel</span>
                      <p className="font-black text-slate-900 mt-0.5">{metrics.paperName}</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Tintas: {metrics.inks}</span>
                    </div>

                    {/* Imposición & Poses */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Pliego & Poses CTP</span>
                      <p className="font-black text-slate-900 mt-0.5">{metrics.posesPerSheet} poses / pliego</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{metrics.sheetName}</span>
                    </div>

                    {/* Consumo de Papel */}
                    <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                      <span className="text-[10px] font-black text-teal-800 uppercase block">Cálculo de Pliegos</span>
                      <p className="font-black text-teal-950 mt-0.5">{metrics.totalGrossSheets} Pliegos Brutos</p>
                      <span className="text-[10px] text-teal-700 block mt-0.5">
                        ({metrics.netSheets} netos + {metrics.wasteSheets} merma/pinza)
                      </span>
                    </div>

                  </div>

                  {/* Acabados & Notas */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-600">Acabados Requeridos:</span>
                    {Array.isArray(metrics.finishes) ? (
                      metrics.finishes.map((f: string, fi: number) => (
                        <span key={fi} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-md text-[11px]">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-md text-[11px]">
                        {metrics.finishes}
                      </span>
                    )}
                  </div>

                  {/* Archivos vinculados */}
                  {item.highResPdfUrl && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                      <span className="truncate max-w-md"><strong>Archivo de Impresión:</strong> {item.highResPdfUrl}</span>
                      <span className="text-teal-600 font-bold">✓ PDF Listo para CTP</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* CHECKLIST DE CONTROL DE TALLER (OPERADORES) */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50 space-y-3 print:bg-transparent">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare size={15} className="text-teal-600" />
              Hoja de Control de Calidad & Checkpoints Operativos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">1. Visto Bueno Preprensa & Calibración CTP</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">2. Corte y Escuadre de Pliegos en Guillotina</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">3. Aprobación de Color y Registro en Prensa</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">4. Plastificado / Laminado Térmico</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">5. Troquelado, Hendido o Perforado</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">6. Refilado Final & Conteo de Paquetes</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors sm:col-span-2">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="font-medium text-slate-800">7. Empaque Termoencogible, Etiqueta de Despacho & Salida a Logística</span>
              </label>
            </div>
          </div>

          {/* FIRMAS DE RESPONSABILIDAD */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-slate-900 pt-2">
              <p className="font-black text-slate-900">Jefe de Producción / Preprensa</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Revisión Técnica de Archivos & Imposición</p>
            </div>
            <div className="border-t border-slate-900 pt-2">
              <p className="font-black text-slate-900">Operador de Prensa / Acabados</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Control de Tiraje, Calidad & Conteo</p>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER (HIDDEN ON PRINT) */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500 shrink-0 print:hidden">
          <span>Consejo: Puedes imprimir directamente en papel tamaño carta para engrapar al paquete físico en el taller.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
