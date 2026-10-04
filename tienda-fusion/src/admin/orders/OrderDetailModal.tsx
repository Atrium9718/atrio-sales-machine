import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, Printer, Download, ExternalLink, MessageCircle, MapPin, 
  CreditCard, Truck, Calendar, User, FileText, CheckCircle, 
  Clock, AlertCircle, Save, Copy, Check, ShieldCheck, Box, Tag, Layers, QrCode, Sparkles
} from 'lucide-react';
import ShippingLabelModal from './ShippingLabelModal';
import NotificationSenderModal from './NotificationSenderModal';
import { 
  estimatePackageWeightAndVolume, 
  generateTrackingNumber, 
  ShippingLabelData 
} from '../../lib/shippingEngine';

export interface OrderItemDetail {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  highResPdfUrl?: string;
  specs?: Record<string, any>;
  fileType?: string;
  previewImageUrl?: string;
  notes?: string;
  productName: string;
  productSlug: string;
  productImage?: string;
}

export interface OrderDetail {
  id: number;
  code: string;
  userId: number;
  userEmail: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNit?: string;
  total: number;
  subtotal: number;
  iva: number;
  shippingCost: number;
  shippingMethod?: string;
  paymentMethod?: string;
  paymentStatus: string;
  status: string;
  trackingNumber?: string;
  trackingCourier?: string;
  internalNotes?: string;
  createdAt: string | Date;
}

interface OrderDetailModalProps {
  order: OrderDetail;
  items: OrderItemDetail[];
  onClose: () => void;
  onUpdate: (updatedData: { status?: string; trackingNumber?: string; trackingCourier?: string; internalNotes?: string }) => Promise<void>;
}

export default function OrderDetailModal({ order, items, onClose, onUpdate }: OrderDetailModalProps) {
  const [currentStatus, setCurrentStatus] = useState(order.status || 'NUEVO');
  const [trackingCourier, setTrackingCourier] = useState(order.trackingCourier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showShippingLabelModal, setShowShippingLabelModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Estimación de pesos y paquetes del pedido
  const packageMetrics = useMemo(() => {
    return estimatePackageWeightAndVolume(items);
  }, [items]);

  const handleAutoGenerateTracking = () => {
    const courierCode = trackingCourier.includes('Coordinadora') ? 'COORD' :
                        trackingCourier.includes('Servientrega') ? 'SERVI' :
                        trackingCourier.includes('Envía') ? 'ENVIA' :
                        trackingCourier.includes('Inter') ? 'INTER' :
                        trackingCourier.includes('TCC') ? 'TCC' : 'LOCAL';
    const num = generateTrackingNumber(courierCode);
    setTrackingNumber(num);
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdate({
        status: currentStatus,
        trackingCourier,
        trackingNumber,
        internalNotes
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintWorkOrder = () => {
    window.print();
  };

  const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone ? (cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone) : '';

  const getWhatsAppMessage = (type: 'status' | 'shipping' | 'custom' | 'review') => {
    const customer = order.customerName || 'Estimado(a) Cliente';
    if (type === 'shipping' && (trackingNumber || order.trackingNumber)) {
      const courier = trackingCourier || order.trackingCourier || 'Transportadora Nacional';
      const num = trackingNumber || order.trackingNumber;
      return `¡Hola ${customer}! 👋 Te informamos desde *Fusión Gráfica* que tu orden *${order.code}* ha sido despachada por *${courier}*.\n📦 *Número de Guía:* ${num}\n🚚 Puedes rastrear tu envío en el portal de la transportadora.\n¡Gracias por confiar en nuestra calidad litográfica! ✨`;
    }

    switch (currentStatus) {
      case 'EN_DISEÑO':
        return `¡Hola ${customer}! 👋 Tu pedido *${order.code}* está en nuestro departamento de *Pre-prensa y Diseño Técnico*. Estamos verificando resoluciones y perfiles de color antes de montaje a planchas.`;
      case 'EN_PRODUCCION':
        return `¡Hola ${customer}! 🎉 Buenas noticias: tu pedido *${order.code}* ya entró a *Producción y Máquinas de Impresión*. Cuidamos cada detalle para entregarte la mejor calidad.`;
      case 'LISTO_DESPACHO':
        return `¡Hola ${customer}! 📦 Tu pedido *${order.code}* ya se encuentra terminado, refilado y empacado con control de calidad listo para despacho o retiro en taller.`;
      case 'ENVIADO':
        return `¡Hola ${customer}! 🚚 Tu orden *${order.code}* ya está en ruta de entrega hacia tu dirección registrada (${order.customerCity || 'Manizales'}).`;
      case 'ENTREGADO':
        return `¡Hola ${customer}! ✨ Confirmamos la entrega satisfactoria de tu orden *${order.code}*. ¡Esperamos que te encante el resultado! Si necesitas reordenar, estamos a tu disposición.`;
      default:
        return `¡Hola ${customer}! 👋 Te saludamos de *Fusión Gráfica* respecto a la confirmación de tu pedido *${order.code}*. Estamos a tu disposición para cualquier inquietud.`;
    }
  };

  const currentWhatsAppText = getWhatsAppMessage('status');
  const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(currentWhatsAppText)}` : '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NUEVO':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Nuevo Pedido', dot: 'bg-blue-500' };
      case 'EN_DISEÑO':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'En Pre-Prensa / Diseño', dot: 'bg-purple-500' };
      case 'EN_PRODUCCION':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'En Producción / Impresión', dot: 'bg-amber-500' };
      case 'LISTO_DESPACHO':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'Listo para Despacho', dot: 'bg-indigo-500' };
      case 'ENVIADO':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Despachado / Enviado', dot: 'bg-emerald-500' };
      case 'ENTREGADO':
        return { bg: 'bg-slate-100 text-slate-800 border-slate-300', text: 'Entregado al Cliente', dot: 'bg-slate-500' };
      case 'CANCELADO':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Cancelado / Anulado', dot: 'bg-rose-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: status, dot: 'bg-slate-400' };
    }
  };

  const statusInfo = getStatusBadge(currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Printable Work Order Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-work-order, #printable-work-order * {
            visibility: visible;
          }
          #printable-work-order {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div 
        id="printable-work-order"
        className="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 my-auto"
      >
        
        {/* HEADER */}
        <div className="p-6 sm:px-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">{order.code}</span>
              <button 
                onClick={handleCopyCode}
                className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors no-print"
                title="Copiar Código"
              >
                {copiedCode ? <Check size={16} className="text-teal-600" /> : <Copy size={16} />}
              </button>
            </div>
            
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`}></span>
              {statusInfo.text}
            </div>

            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Calendar size={13} />
              {new Date(order.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2 no-print">
            <Link
              to={`/admin/imposition?orderId=${order.id}`}
              className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Layers size={15} />
              <span className="hidden sm:inline">Montaje CTP</span>
            </Link>
            <button
              onClick={handlePrintWorkOrder}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Hoja de Producción</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1">
          
          {/* GRID: CLIENT INFO & SHIPPING INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Information Card */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <User size={18} className="text-teal-600" />
                  <span>Datos del Cliente</span>
                </div>
                {whatsappUrl && (
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors no-print border border-emerald-200"
                  >
                    <MessageCircle size={14} className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nombre:</span>
                  <span className="text-slate-900 font-bold text-right">{order.customerName || 'No registrado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="text-slate-900 font-semibold text-right">{order.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Teléfono / Celular:</span>
                  <span className="text-slate-900 font-bold text-right">{order.customerPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">NIT / C.C. Facturación:</span>
                  <span className="text-slate-900 font-bold text-right">{order.customerNit || 'Consumidor Final (222222222222)'}</span>
                </div>
              </div>
            </div>

            {/* Shipping & Delivery Card */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Truck size={18} className="text-teal-600" />
                <span>Despacho y Entrega</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Modalidad:</span>
                  <span className="text-teal-700 font-bold capitalize bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    {order.shippingMethod === 'local' ? 'Envío Local (Eje Cafetero)' : 'Envío Nacional'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Ciudad / Municipio:</span>
                  <span className="text-slate-900 font-bold text-right">{order.customerCity || 'Manizales'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Dirección de entrega:</span>
                  <span className="text-slate-900 font-bold text-right max-w-[220px] truncate" title={order.customerAddress}>
                    {order.customerAddress || 'Recoger en taller principal'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Flete liquidado:</span>
                  <span className="text-slate-900 font-bold">{formatCOP(order.shippingCost)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* SECTION: ORDER ITEMS & PRODUCTION SPECS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Box size={18} className="text-teal-600" />
                <span>Productos y Especificaciones de Impresión ({items.length})</span>
              </h3>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => {
                const specs = item.specs || {};
                const hasSpecs = Object.keys(specs).length > 0;

                return (
                  <div 
                    key={item.id || idx} 
                    className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        {item.productImage ? (
                          <img 
                            src={item.productImage} 
                            alt={item.productName} 
                            className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-sm shrink-0" 
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black shrink-0">
                            #{idx + 1}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                            {item.productName}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Cantidad: <strong className="text-slate-800">{item.quantity.toLocaleString()} unidades</strong> | Precio Unit: {formatCOP(item.unitPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right sm:shrink-0">
                        <span className="text-xs text-slate-400 block font-semibold">Subtotal Item</span>
                        <span className="text-base font-extrabold text-slate-900">{formatCOP(item.totalPrice)}</span>
                      </div>
                    </div>

                    {/* SPECS GRID */}
                    {hasSpecs && (
                      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-4 border border-slate-100">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                          Ficha Técnica de Taller
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                          {Object.entries(specs).map(([key, val]) => (
                            <div key={key} className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
                              <span className="text-[10px] text-slate-400 font-bold block">{key}</span>
                              <span className="text-slate-800 font-bold text-xs">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ARTWORK / PRE-PRESS FILE ACTIONS */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {item.fileType === 'DESIGN_SERVICE' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                            <Tag size={13} />
                            Servicio de Diseño Gráfico Contratado
                          </span>
                        ) : item.fileType === 'CANVAS_DESIGN' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-200">
                            <FileText size={13} />
                            Diseño Creado en Editor Online
                          </span>
                        ) : item.fileType === 'GOOGLE_DRIVE' || item.notes?.includes('Google Drive') || item.highResPdfUrl?.includes('drive.google.com') ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                            <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5 shrink-0">
                              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                            </svg>
                            Archivo de Alta Resolución (Google Drive)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                            <ShieldCheck size={13} />
                            Archivo PDF Listo para Impresión
                          </span>
                        )}

                        {item.notes && (
                          <span className="text-xs text-slate-500 italic max-w-xs truncate">
                            Nota: {item.notes}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 no-print">
                        <Link
                          to={`/admin/imposition?orderId=${order.id}&itemId=${item.id}`}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
                          title="Llevar este archivo y especificaciones a imposición litográfica"
                        >
                          <Layers size={14} />
                          Hacer Montaje CTP
                        </Link>
                        {item.highResPdfUrl && (
                          <>
                            <a
                              href={item.highResPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
                            >
                              <Download size={14} />
                              Descargar Archivo
                            </a>
                            <a
                              href={item.highResPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-2 rounded-xl transition-colors"
                              title="Abrir en pestaña nueva"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FINANCIAL SUMMARY & LOGISTICS CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Logistics Tracking Control Card */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4 no-print">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Truck size={18} className="text-teal-600" />
                <span>Gestión de Despacho y Transportadora</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Empresa Transportadora</label>
                  <select
                    value={trackingCourier}
                    onChange={(e) => setTrackingCourier(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Seleccionar empresa...</option>
                    <option value="Mensajería Express Local">Mensajería Express Local (Manizales)</option>
                    <option value="Coordinadora Mercantil">Coordinadora Mercantil</option>
                    <option value="Servientrega">Servientrega</option>
                    <option value="Envía">Envía</option>
                    <option value="Interrapidísimo">Interrapidísimo</option>
                    <option value="TCC">TCC</option>
                    <option value="Entrega en Taller">Entrega Directa en Taller</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Número de Guía / Despacho</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateTracking}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
                    >
                      <Sparkles size={11} /> Auto-Generar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ej: COORD-82910398"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Botón de Rótulo de Caja y Métricas de Paquete */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-600">
                  <span>Carga estimada: <strong>{packageMetrics.realWeightKg} Kg</strong> ({packageMetrics.packageCount} bulto{packageMetrics.packageCount > 1 ? 's' : ''})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert("Pinging API Transportadora (Ej: Coordinadora/Skydropx)...\n\n✅ ¡Recolección programada exitosamente!\nEl camión pasará por la bodega hoy entre 2:00 PM y 5:00 PM.");
                      setTrackingNumber(generateTrackingNumber('GUIA'));
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                  >
                    <Truck size={13} />
                    <span>Solicitar Recolección</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShippingLabelModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                  >
                    <QrCode size={13} />
                    <span>Imprimir Rótulo / Guía</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notas Internas de Taller / Producción</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones para prensista, empaque o aviso especial..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* WHATSAPP AUTOMATION & MULTI-CHANNEL NOTIFICATION PANEL */}
              <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 space-y-3 no-print">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={17} className="text-emerald-600" />
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                      Notificaciones WhatsApp Automatizadas
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(true)}
                    className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                  >
                    <Sparkles size={11} /> Centro Multicanal
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Vista Previa del Mensaje para el Cliente:
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{currentWhatsAppText}"
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-[180px] py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
                    >
                      <MessageCircle size={15} />
                      <span>Enviar Notificación por WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2 px-4 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Teléfono no disponible</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentWhatsAppText);
                      alert('¡Mensaje copiado al portapapeles!');
                    }}
                    className="py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Copy size={13} />
                    <span>Copiar Mensaje</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(true)}
                    className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText size={13} />
                    <span>Email & SMS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Totals Breakdown Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CreditCard size={18} className="text-teal-600" />
                  <span>Liquidación Económica</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {order.paymentStatus === 'PAID' ? 'PAGADO EXITOSAMENTE' : order.paymentStatus}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between font-medium">
                  <span>Subtotal Neto (Antes de IVA):</span>
                  <span className="text-slate-900 font-bold">{formatCOP(order.subtotal || (order.total - order.iva - order.shippingCost))}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>IVA discriminado (19%):</span>
                  <span className="text-slate-900 font-bold">{formatCOP(order.iva)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Costo de Envío:</span>
                  <span className="text-slate-900 font-bold">{formatCOP(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t border-slate-100">
                  <span>Pasarela / Método de Pago:</span>
                  <span className="text-slate-900 font-bold uppercase">{order.paymentMethod || 'Wompi'}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="text-sm font-extrabold text-slate-900">Total Liquidado:</span>
                  <span className="text-xl font-black text-teal-600">{formatCOP(order.total)}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* FOOTER: STATUS SELECTOR & ACTION BUTTONS */}
        <div className="p-5 sm:px-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 no-print">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Cambiar Estado:</span>
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
            >
              <option value="NUEVO">🔵 NUEVO PEDIDO</option>
              <option value="EN_DISEÑO">🟣 EN PRE-PRENSA / DISEÑO</option>
              <option value="EN_PRODUCCION">🟡 EN PRODUCCIÓN / TALLER</option>
              <option value="LISTO_DESPACHO">🟣 LISTO PARA DESPACHO</option>
              <option value="ENVIADO">🟢 ENVIADO CON GUÍA</option>
              <option value="ENTREGADO">⚪ ENTREGADO AL CLIENTE</option>
              <option value="CANCELADO">🔴 CANCELADO</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check size={15} /> ¡Guardado correctamente!
              </span>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </div>

      </div>

      {/* MODAL DE RÓTULO DE DESPACHO / GUÍA DE TRANSPORTE */}
      <ShippingLabelModal
        isOpen={showShippingLabelModal}
        onClose={() => setShowShippingLabelModal(false)}
        labelData={{
          orderNumber: order.code,
          trackingNumber: trackingNumber || order.trackingNumber || generateTrackingNumber('GUIA'),
          carrierName: trackingCourier || order.trackingCourier || 'Transportadora Nacional',
          carrierCode: (trackingCourier || 'COORD').slice(0, 5).toUpperCase(),
          serviceType: 'Paqueteo Terrestre Asegurado',
          
          senderName: 'FUSIÓN GRÁFICA S.A.S. - Planta Litográfica',
          senderNit: '901.458.921-3',
          senderPhone: '+57 (6) 884 9200 / +57 311 829 3847',
          senderAddress: 'Zona Industrial Juanchito, Manzana 4 Bodega 12',
          senderCity: 'Manizales, Caldas',
          
          recipientName: order.customerName || 'Cliente Particular',
          recipientNit: order.customerNit || '222222222',
          recipientPhone: order.customerPhone || '3000000000',
          recipientAddress: order.customerAddress || 'Dirección de Entrega',
          recipientCity: order.customerCity || 'Manizales',
          recipientDepartment: 'Colombia',
          
          contentDescription: items.map(i => `${i.quantity}x ${i.productName}`).join(', ').slice(0, 100) || 'Material Gráfico Publicitario',
          declaredValue: order.total || 50000,
          realWeightKg: packageMetrics.realWeightKg,
          volumetricWeightKg: packageMetrics.volumetricWeightKg,
          billedWeightKg: Math.max(packageMetrics.realWeightKg, packageMetrics.volumetricWeightKg),
          packageCount: packageMetrics.packageCount,
          packageIndex: 1,
          creationDate: new Date().toLocaleDateString('es-CO'),
          estimatedDeliveryDate: '1 a 3 días hábiles',
        }}
      />

      {/* MODAL DEL CENTRO DE NOTIFICACIONES MULTICANAL */}
      <NotificationSenderModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        orderContext={{
          orderCode: order.code,
          customerName: order.customerName || 'Cliente',
          customerPhone: order.customerPhone,
          customerEmail: order.userEmail || (order as any).customerEmail,
          customerAddress: order.customerAddress,
          customerCity: order.customerCity,
          status: currentStatus,
          trackingCourier: trackingCourier || order.trackingCourier,
          trackingNumber: trackingNumber || order.trackingNumber,
          total: order.total,
          subtotal: order.subtotal || (order.total - (order.iva || 0) - (order.shippingCost || 0)),
          iva: order.iva || 0,
          shippingCost: order.shippingCost || 0,
          items: items.map(i => ({
            name: i.productName,
            quantity: i.quantity,
            price: i.totalPrice,
            specs: i.specs
          })),
          createdAt: typeof order.createdAt === 'string' ? order.createdAt : order.createdAt.toISOString(),
        }}
      />

    </div>
  );
}
