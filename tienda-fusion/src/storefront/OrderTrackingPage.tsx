import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Printer, 
  FileText, 
  MessageCircle, 
  MapPin, 
  CreditCard, 
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers
} from 'lucide-react';

interface OrderData {
  order: {
    id: string;
    numericId: number;
    createdAt: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCity: string;
    customerAddress: string;
    customerNit?: string;
    subtotal: number;
    iva: number;
    shippingCost: number;
    total: number;
    shippingMethod: string;
    paymentMethod: string;
    paymentStatus: string;
    trackingNumber?: string;
    trackingCourier?: string;
    invoicePdfUrl?: string;
  };
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specs?: Record<string, any>;
    fileType?: string;
    previewImageUrl?: string;
    notes?: string;
  }>;
}

const ORDER_STEPS = [
  { key: 'NUEVO', label: 'Pedido Confirmado', desc: 'Pago validado y orden en cola de pre-prensa', icon: Clock },
  { key: 'EN_DISEÑO', label: 'Revisión y Diseño', desc: 'Verificación de sangrado, tintas CMYK y resolución', icon: Layers },
  { key: 'EN_PRODUCCION', label: 'En Prensa Litográfica', desc: 'Impresión y aplicación de acabados seleccionados', icon: Printer },
  { key: 'LISTO_DESPACHO', label: 'Empaque y Control', desc: 'Control de calidad y embalaje de seguridad', icon: Package },
  { key: 'ENVIADO', label: 'En Camino', desc: 'Entregado a la transportadora con número de guía', icon: Truck },
  { key: 'ENTREGADO', label: 'Entregado con Éxito', desc: 'Recibido en la dirección de entrega', icon: CheckCircle2 },
];

export default function OrderTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [orderCode, setOrderCode] = useState(initialCode);
  const [customerEmail, setCustomerEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleTrack = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    if (!customerEmail.trim()) {
      setError('Ingresa el correo electrónico con el que hiciste el pedido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/checkout/track?code=${encodeURIComponent(codeToSearch.trim())}&email=${encodeURIComponent(customerEmail.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrderData(data);
        setSearchParams({ code: codeToSearch.trim(), email: customerEmail.trim() });
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.message || 'No encontramos un pedido con este número. Por favor verifica los datos.');
        setOrderData(null);
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al consultar el pedido. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && customerEmail) {
      handleTrack(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(orderCode);
  };

  const getStepIndex = (status: string) => {
    const idx = ORDER_STEPS.findIndex(s => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStepIndex = orderData ? getStepIndex(orderData.order.status) : 0;

  const getTrackingUrl = (courier?: string, guide?: string) => {
    if (!guide) return null;
    const c = courier?.toLowerCase() || '';
    if (c.includes('coordinadora')) {
      return `https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastrear-guias/?guia=${guide}`;
    }
    if (c.includes('servientrega')) {
      return `https://www.servientrega.com/wps/portal/rastreo-envio`;
    }
    if (c.includes('envia') || c.includes('envía')) {
      return `https://envia.co/`;
    }
    if (c.includes('inter') || c.includes('rapidisimo')) {
      return `https://www.interrapidisimo.com/sigue-tu-envio/`;
    }
    if (c.includes('tcc')) {
      return `https://tcc.com.co/rastreo/`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100 mb-2">
            <Package size={14} /> Centro de Seguimiento y Despachos
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Rastrea tu Pedido Litográfico
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Ingresa tu número de orden para consultar el estado de impresión, pruebas de color y número de guía.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Número de Orden *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    placeholder="Ej: ORD-2026-0001 ó 1"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 placeholder-slate-400 font-bold focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Buscando orden...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Consultar Estado</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Order Details Display */}
        {orderData && (
          <div className="space-y-6">
            
            {/* Top Order Status Card */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl font-black text-slate-900">{orderData.order.id}</span>
                    <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full border border-teal-100">
                      {orderData.order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Fecha de pedido: {new Date(orderData.order.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={`https://wa.me/573000000000?text=Hola%20Imprenta%20Fusi%C3%B3n,%20quisiera%20consultar%20el%20estado%20de%20mi%20pedido%20${orderData.order.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-colors"
                  >
                    <MessageCircle size={16} /> Asesor WhatsApp
                  </a>
                  {orderData.order.invoicePdfUrl && (
                    <a
                      href={orderData.order.invoicePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                    >
                      <FileText size={16} /> Factura DIAN
                    </a>
                  )}
                </div>
              </div>

              {/* Stepper Timeline */}
              <div className="py-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                  Progreso en Taller y Entrega
                </h3>

                <div className="relative">
                  {/* Progress Line */}
                  <div className="hidden sm:block absolute top-6 left-6 right-6 h-1 bg-slate-100 -z-0">
                    <div 
                      className="h-full bg-teal-500 transition-all duration-700" 
                      style={{ width: `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-6 relative z-10">
                    {ORDER_STEPS.map((step, idx) => {
                      const IconComp = step.icon;
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30 scale-110 font-bold'
                              : isCompleted
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            <IconComp size={20} />
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isCurrent ? 'text-teal-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5 leading-snug">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Shipping / Courier Tracking Card */}
              {orderData.order.trackingNumber && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-5 rounded-2xl border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-teal-900">
                        Despachado con {orderData.order.trackingCourier || 'Transportadora Nacional'}
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        Número de Guía: <span className="font-mono text-teal-700">{orderData.order.trackingNumber}</span>
                      </p>
                    </div>
                  </div>

                  {getTrackingUrl(orderData.order.trackingCourier, orderData.order.trackingNumber) ? (
                    <a
                      href={getTrackingUrl(orderData.order.trackingCourier, orderData.order.trackingNumber)!}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-sm"
                    >
                      Rastrear en {orderData.order.trackingCourier} <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-teal-700 bg-white/60 px-3 py-1.5 rounded-lg">
                      En ruta de entrega local
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Two Column Section: Products & Shipping Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Order Items */}
              <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">Productos en Producción</h3>
                
                <div className="divide-y divide-slate-100">
                  {orderData.items.map((item, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                      {item.previewImageUrl ? (
                        <img 
                          src={item.previewImageUrl} 
                          alt={item.productName} 
                          className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Printer size={24} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.productName || 'Producto Litográfico'}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Cantidad: <span className="font-bold text-slate-800">{item.quantity.toLocaleString()} unidades</span>
                        </p>

                        {item.specs && Object.keys(item.specs).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(item.specs).map(([key, val]) => (
                              <span key={key} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                {key}: {String(val)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900 text-sm">{formatCOP(item.totalPrice)}</p>
                        <p className="text-[10px] text-slate-400">{formatCOP(item.unitPrice)} c/u</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">{formatCOP(orderData.order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (19%)</span>
                    <span className="font-bold text-slate-800">{formatCOP(orderData.order.iva)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío</span>
                    <span className="font-bold text-slate-800">{formatCOP(orderData.order.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total Pagado</span>
                    <span className="text-teal-600 font-extrabold">{formatCOP(orderData.order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery & Customer Info */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">Dirección de Entrega</h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-teal-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">{orderData.order.customerName}</p>
                        <p>{orderData.order.customerAddress}</p>
                        <p className="font-medium text-slate-700">{orderData.order.customerCity}, Colombia</p>
                      </div>
                    </div>
                    {orderData.order.customerPhone && (
                      <p className="pl-6 text-slate-500 font-medium">Tel: {orderData.order.customerPhone}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Detalles de Facturación</h3>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-700">NIT/C.C.:</span> {orderData.order.customerNit || 'Consumidor Final'}</p>
                    <p><span className="font-semibold text-slate-700">Método de Pago:</span> {orderData.order.paymentMethod}</p>
                    <p><span className="font-semibold text-slate-700">Estado de Pago:</span> <span className="text-emerald-600 font-bold">{orderData.order.paymentStatus}</span></p>
                  </div>
                </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <a
                      href={`https://wa.me/573118293847?text=${encodeURIComponent(`Hola Fusión Gráfica! 👋 Quiero consultar detalles sobre mi pedido ${orderData.order.id}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <MessageCircle size={15} />
                      <span>Contactar a Asesor por WhatsApp</span>
                    </a>
                    
                    <Link
                      to="/categoria/todas"
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Realizar un nuevo pedido</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
