import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Truck, CreditCard, ShieldCheck, CheckCircle2, Package, Clock, Building2, Award, Zap, ExternalLink, RefreshCw, AlertCircle, Check, QrCode } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { COLOMBIAN_CITIES, quoteAllCarriers, estimatePackageWeightAndVolume, CarrierQuote } from '../lib/shippingEngine';
import { B2B_TIER_CONFIG } from '../lib/b2bEngine';

interface GatewayStatus {
  wompi: {
    configured: boolean;
    publicKey: string;
    isSandbox: boolean;
    mode: string;
  };
  bold: {
    configured: boolean;
    apiKey: string;
    isSandbox: boolean;
    mode: string;
  };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, grossSubtotal, b2bDiscount, subtotal, iva, clearCart, b2bProfile, refreshPrices } = useCart();
  const [paidTotal, setPaidTotal] = useState<number | null>(null);

  useEffect(() => {
    refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'bold' | 'b2b_credit' | 'bank_transfer'>('wompi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(b2bProfile?.contactPerson || 'Juan David Restrepo');
  const [customerEmail, setCustomerEmail] = useState(b2bProfile?.email || 'juandavid@ejemplo.com');
  const [customerPhone, setCustomerPhone] = useState(b2bProfile?.phone || '+57 311 234 5678');
  const [customerNit, setCustomerNit] = useState(b2bProfile?.nit || '1053829102');
  const [customerAddress, setCustomerAddress] = useState('Carrera 23 # 45-12 Apto 302');
  const [customerCity, setCustomerCity] = useState(b2bProfile?.city || 'Manizales');
  const [selectedCarrierCode, setSelectedCarrierCode] = useState<string>('LOCAL_MOTO');
  const [createdOrderCode, setCreatedOrderCode] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [whiteLabelPacking, setWhiteLabelPacking] = useState(b2bProfile?.whiteLabelPacking || false);

  const [gatewaysStatus, setGatewaysStatus] = useState<GatewayStatus | null>(null);
  const [activeGatewayModal, setActiveGatewayModal] = useState<'wompi' | 'bold' | null>(null);
  const [modalSessionData, setModalSessionData] = useState<any>(null);

  // Cargar estado de configuración de pasarelas
  useEffect(() => {
    fetch('/api/checkout/gateways-status')
      .then(res => res.json())
      .then(data => setGatewaysStatus(data))
      .catch(err => console.warn('No se pudo obtener estado de pasarelas:', err));
  }, []);

  // Cálculo de pesos del pedido
  const packageMetrics = useMemo(() => {
    return estimatePackageWeightAndVolume(items);
  }, [items]);

  // Cotizaciones en tiempo real según la ciudad destino
  const carrierQuotes = useMemo(() => {
    const quotes = quoteAllCarriers(customerCity, items);
    return quotes;
  }, [customerCity, items]);

  // Cotización de la transportadora seleccionada actualmente
  const activeQuote = useMemo(() => {
    return carrierQuotes.find(q => q.carrierCode === selectedCarrierCode) || carrierQuotes[0] || {
      carrierId: 'local-express',
      carrierName: 'Mensajería Express',
      carrierCode: 'LOCAL_MOTO',
      serviceName: 'Estándar',
      cost: 8000,
      deliveryTimeText: '24 a 48 horas',
      realWeightKg: packageMetrics.realWeightKg,
      volumetricWeightKg: packageMetrics.volumetricWeightKg,
      billedWeightKg: packageMetrics.realWeightKg,
      packageCount: packageMetrics.packageCount,
    };
  }, [carrierQuotes, selectedCarrierCode, packageMetrics]);

  const shippingCost = activeQuote.cost;
  const total = subtotal + iva + shippingCost;

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  // Carga dinámica del widget JS de Wompi
  const loadWompiScript = async (): Promise<boolean> => {
    if ((window as any).WidgetCheckout) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.wompi.co/widget.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Crear la orden inicial en base de datos
  const createBaseOrder = async () => {
    const orderItemsPayload = items.map(it => ({
      productId: Number(it.productId) || null,
      productName: it.name || 'Producto Personalizado',
      quantity: Math.max(1, it.quantity || 1),
      // El servidor recalcula el precio con esta especificación
      pricing: it.pricing,
      highResPdfUrl: it.driveFile?.webViewLink || (it.file ? it.file.name : null),
      specs: {
        options: it.options || '',
        design: it.design || '',
        driveFile: it.driveFile ? { id: it.driveFile.id, name: it.driveFile.name, link: it.driveFile.webViewLink } : null,
        hasDesignService: Boolean(it.design && !it.file && !it.driveFile),
      },
      fileType: it.driveFile ? 'GOOGLE_DRIVE' : (it.file ? 'UPLOADED_PDF' : (it.canvasData ? 'CANVAS_DESIGN' : 'STANDARD')),
      previewImageUrl: it.image || null,
      notes: it.design || it.options || null,
    }));

    const res = await fetch('/api/checkout/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerName || 'Cliente Web',
        customerEmail,
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        customerCity: customerCity || '',
        customerNit: customerNit || '',
        shippingCarrierCode: activeQuote.carrierCode,
        // Total que vio el cliente: si no coincide con el del servidor, se avisa antes de cobrar
        total,
        paymentMethod,
        items: orderItemsPayload,
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 409) {
        // Los precios cambiaron: se actualiza el carrito para que el cliente vea el total correcto
        await refreshPrices();
      }
      throw new Error(errorData.message || 'Error al registrar la orden en base de datos.');
    }

    return await res.json();
  };

  // Confirmar pago directo
  const confirmOrderPayment = async (orderId: number, method: string, transactionId?: string) => {
    try {
      const confirmRes = await fetch('/api/checkout/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: method,
          transactionId: transactionId || `SANDBOX-TX-${Date.now()}`,
          status: 'APPROVED',
        })
      });

      if (confirmRes.ok) {
        const result = await confirmRes.json();
        setCreatedOrderCode(result.orderCode || `ORD-2026-${String(orderId).padStart(4, '0')}`);
        clearCart();
        setActiveGatewayModal(null);
        setIsSuccess(true);
      } else {
        const errorData = await confirmRes.json().catch(() => ({}));
        setErrorMsg(errorData.message || 'No pudimos confirmar el pago todavía. Si fue aprobado, tu pedido se actualizará automáticamente.');
      }
    } catch (err) {
      console.error('Error al confirmar pago:', err);
    }
  };

  const handlePayment = async () => {
    if (!customerName || !customerEmail || !customerAddress) {
      setErrorMsg('Por favor diligencia todos los campos de envío requeridos.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // 1. Crear Orden en DB
      const orderData = await createBaseOrder();
      const orderId = orderData.orderId;
      const orderCode = orderData.orderCode;
      setCreatedOrderId(orderId);
      setCreatedOrderCode(orderCode);
      setPaidTotal(Number(orderData.total) || null);

      // 2. Si es Crédito B2B o Transferencia Manual
      if (paymentMethod === 'b2b_credit') {
        clearCart();
        setIsSuccess(true);
        return;
      }

      if (paymentMethod === 'bank_transfer') {
        clearCart();
        setIsSuccess(true);
        return;
      }

      // 3. Flujo Wompi
      if (paymentMethod === 'wompi') {
        const sessionRes = await fetch('/api/checkout/wompi/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!sessionRes.ok) {
          throw new Error('No se pudo generar la sesión de Wompi');
        }

        const session = await sessionRes.json();
        setModalSessionData(session);

        const isScriptLoaded = await loadWompiScript();

        if (isScriptLoaded && (window as any).WidgetCheckout) {
          try {
            const checkout = new (window as any).WidgetCheckout({
              currency: session.currency || 'COP',
              amountInCents: session.amountInCents,
              reference: session.reference,
              publicKey: session.publicKey,
              signature: {
                integrity: session.signature,
              },
              redirectUrl: `${window.location.origin}/rastreo?code=${encodeURIComponent(orderCode)}&email=${encodeURIComponent(customerEmail)}`,
              customerData: {
                email: customerEmail,
                fullName: customerName,
                phoneNumber: customerPhone.replace(/\D/g, '').slice(-10),
                phoneNumberPrefix: '+57',
              },
              shippingAddress: {
                addressLine1: customerAddress,
                city: customerCity,
                country: 'CO',
              }
            });

            checkout.open((result: any) => {
              const tx = result?.transaction;
              if (tx?.status === 'APPROVED') {
                confirmOrderPayment(orderId, 'Wompi (' + (tx.payment_method_type || 'ONLINE') + ')', tx.id);
              } else if (tx?.status === 'DECLINED' || tx?.status === 'ERROR') {
                setErrorMsg(`La transacción fue declinada por Wompi (${tx.status_message || tx.status}). Puedes intentar nuevamente.`);
              }
            });
          } catch (widgetError) {
            console.warn('Error al invocar Widget Wompi nativo:', widgetError);
            setActiveGatewayModal('wompi');
          }
        } else {
          // Si el script de Wompi es bloqueado por navegador/iframe, abrir modal de control
          setActiveGatewayModal('wompi');
        }
      }

      // 4. Flujo Bold
      if (paymentMethod === 'bold') {
        const sessionRes = await fetch('/api/checkout/bold/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!sessionRes.ok) {
          throw new Error('No se pudo generar la sesión de Bold');
        }

        const session = await sessionRes.json();
        setModalSessionData(session);

        if (session.checkoutUrl) {
          window.location.href = session.checkoutUrl;
        } else {
          setActiveGatewayModal('bold');
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 mb-6 mx-auto animate-bounce shadow-lg shadow-teal-500/10">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">¡Pago y Pedido Confirmado!</h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          Hemos recibido tu orden correctamente. Tus archivos han pasado a revisión de pre-prensa y el comprobante electrónico ha sido emitido.
        </p>

        <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-100 shadow-sm max-w-md w-full mx-auto mb-8 text-left space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase">Número de orden</span>
            <span className="font-extrabold text-teal-600 text-base">{createdOrderCode}</span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase">Método Utilizado</span>
            <span className="font-bold text-slate-800 text-xs uppercase bg-slate-100 px-3 py-1 rounded-full">
              {paymentMethod === 'wompi' ? 'Wompi (Bancolombia/Nequi/Tarjetas)' : paymentMethod === 'bold' ? 'Bold (Tarjetas/PSE)' : paymentMethod === 'b2b_credit' ? 'Crédito Corporativo B2B' : 'Transferencia Bancaria'}
            </span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Pagado</span>
            <span className="font-extrabold text-slate-900 text-lg">{formatCOP(paidTotal ?? total)}</span>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Factura Electrónica y Notificación</p>
            <p className="font-bold text-slate-900 text-sm">{customerEmail}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={() => navigate(`/rastreo?code=${encodeURIComponent(createdOrderCode)}&email=${encodeURIComponent(customerEmail)}`)}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-8 rounded-full shadow-md shadow-teal-600/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Clock size={16} />
            <span>Rastrear Pedido en Vivo</span>
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 px-8 rounded-full transition-colors"
          >
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-32 md:pb-12">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900">Finalizar Compra & Pasarelas</h1>
          </div>

          {gatewaysStatus && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Wompi {gatewaysStatus.wompi.mode}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Bold {gatewaysStatus.bold.mode}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:flex lg:gap-12">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="lg:flex-1 space-y-8">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
              <AlertCircle size={20} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos de Envío */}
          <section className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
                <MapPin size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Datos de Envío & Facturación</h2>
            </div>

            {/* Destino y Ciudad */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombres y Apellidos *</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-medium" 
                    placeholder="Ej: Juan Pérez" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Cédula / NIT *</label>
                  <input 
                    type="text" 
                    value={customerNit}
                    onChange={(e) => setCustomerNit(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-medium" 
                    placeholder="Para factura electrónica DIAN" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo Electrónico *</label>
                  <input 
                    type="email" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-medium" 
                    placeholder="ejemplo@correo.com" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono / WhatsApp *</label>
                  <input 
                    type="text" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-medium" 
                    placeholder="+57 311 000 0000" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Ciudad de Destino *</label>
                  <select
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-semibold text-slate-800"
                  >
                    {COLOMBIAN_CITIES.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city} ({c.department}) - Zona {c.zone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Dirección de Entrega Exacta *</label>
                  <input 
                    type="text" 
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 text-sm font-medium" 
                    placeholder="Ej: Calle 22 # 23-45 Apto 301" 
                  />
                </div>
              </div>
            </div>

            {/* Resumen de Cubicaje y Peso */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Cálculo de Carga Litográfica:</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span>Peso Real: <strong className="text-slate-900">{packageMetrics.realWeightKg} Kg</strong></span>
                <span>Peso Volumétrico: <strong className="text-slate-900">{packageMetrics.volumetricWeightKg} Kg</strong></span>
                <span>Bultos: <strong className="text-slate-900">{packageMetrics.packageCount}</strong></span>
              </div>
            </div>

            {/* Transportadoras Cotizadas */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Selecciona Empresa Transportadora
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {carrierQuotes.map((quote) => {
                  const isSelected = selectedCarrierCode === quote.carrierCode;
                  return (
                    <div
                      key={quote.carrierCode}
                      onClick={() => setSelectedCarrierCode(quote.carrierCode)}
                      className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase block leading-tight">
                            {quote.carrierName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {quote.serviceName}
                          </span>
                        </div>
                        <span className="text-sm font-black text-teal-600 whitespace-nowrap">
                          {quote.cost === 0 ? '¡GRATIS!' : formatCOP(quote.cost)}
                        </span>
                      </div>

                      <div className="mt-auto pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {quote.deliveryTimeText}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                            Seleccionado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Método de Pago y Pasarelas */}
          <section className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Método de Pago</h2>
                  <p className="text-xs text-slate-500">Pasarelas colombianas oficiales con firma de integridad SHA-256</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Opción 1: Wompi */}
              <label className={`relative flex cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 items-start gap-4 ${paymentMethod === 'wompi' ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="payment" value="wompi" checked={paymentMethod === 'wompi'} onChange={() => setPaymentMethod('wompi')} className="sr-only" />
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-blue-600 mt-1">
                  {paymentMethod === 'wompi' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 text-base">Wompi Colombia</p>
                      <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">Bancolombia</span>
                    </div>
                    <span className="font-black text-blue-900 italic tracking-tighter text-lg">Wompi.</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Bancolombia Transferencia directa, Botón Bancolombia, Nequi, PSE, Daviplata, Tarjetas Visa / Mastercard / Amex.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Bancolombia', 'Nequi', 'PSE', 'Visa', 'Mastercard', 'Daviplata'].map((badge) => (
                      <span key={badge} className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md shadow-2xs">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </label>

              {/* Opción 2: Bold */}
              <label className={`relative flex cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 items-start gap-4 ${paymentMethod === 'bold' ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="payment" value="bold" checked={paymentMethod === 'bold'} onChange={() => setPaymentMethod('bold')} className="sr-only" />
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-rose-600 mt-1">
                  {paymentMethod === 'bold' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 text-base">Bold Pagos</p>
                      <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">Smart Checkout</span>
                    </div>
                    <span className="font-black text-rose-600 tracking-tighter text-lg">Bold</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Pagos seguros con Tarjetas Débito y Crédito nacionales e internacionales y Botón de Pago PSE.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tarjetas Crédito', 'Tarjetas Débito', 'PSE Bold', 'Apple Pay'].map((badge) => (
                      <span key={badge} className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md shadow-2xs">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </label>

              {/* Opción 3: Cupo B2B */}
              {b2bProfile?.isVerifiedB2B && b2bProfile.paymentTermsDays > 0 && (
                <label className={`relative flex cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 items-start gap-4 ${paymentMethod === 'b2b_credit' ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50'}`}>
                  <input type="radio" name="payment" value="b2b_credit" checked={paymentMethod === 'b2b_credit'} onChange={() => setPaymentMethod('b2b_credit')} className="sr-only" />
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-amber-500 mt-1">
                    {paymentMethod === 'b2b_credit' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-slate-900 text-base">Cupo de Crédito Corporativo B2B</p>
                        <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Plazo {b2bProfile.paymentTermsDays} Días</span>
                      </div>
                      <span className="font-black text-amber-800 text-xs">Crédito Activo</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Cupo disponible: <strong>{formatCOP(b2bProfile.creditLimit - b2bProfile.creditUsed)}</strong> · Facturación electrónica a 30 días.
                    </p>
                  </div>
                </label>
              )}

              {/* Opción 4: Transferencia Directa */}
              <label className={`relative flex cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 items-start gap-4 ${paymentMethod === 'bank_transfer' ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} className="sr-only" />
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-teal-600 mt-1">
                  {paymentMethod === 'bank_transfer' && <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-extrabold text-slate-900 text-base">Transferencia Bancaria / QR Nequi</p>
                    <span className="text-xs font-bold text-slate-400">Manual</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Bancolombia Cuenta Corriente # 102-938475-10 o QR Nequi. Confirmación inmediata vía WhatsApp.
                  </p>
                </div>
              </label>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 justify-center">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Conexión cifrada TLS 1.3 · Cumplimiento de seguridad PCI-DSS</span>
            </div>
          </section>

        </div>

        {/* COLUMNA DERECHA: RESUMEN FINAL */}
        <div className="mt-8 lg:mt-0 lg:w-[400px] shrink-0">
          <div className="bg-white rounded-[32px] shadow-lg border border-slate-100 p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Resumen del Pedido</h2>
            
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({items.length} ítems)</span>
                <span className="font-medium">{formatCOP(subtotal)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between text-slate-700 font-bold text-xs">
                  <span>Envío: {activeQuote.carrierName}</span>
                  <span className="text-teal-600">{activeQuote.cost === 0 ? 'GRATIS' : formatCOP(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Tiempo estimado: {activeQuote.deliveryTimeText}</span>
                  <span>{activeQuote.billedWeightKg} Kg</span>
                </div>
              </div>
              <div className="flex justify-between text-slate-500 pb-4 border-b border-slate-100">
                <span>IVA discriminado (19%)</span>
                <span className="font-medium">{formatCOP(iva)}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-lg font-bold text-slate-900">Total a Pagar</span>
                <span className="text-3xl font-black text-teal-600 tracking-tight">{formatCOP(total)}</span>
              </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={isProcessing || items.length === 0}
              className={`w-full text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-75 disabled:scale-100 ${
                paymentMethod === 'wompi' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                  : paymentMethod === 'bold' 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Conectando con {paymentMethod === 'wompi' ? 'Wompi' : paymentMethod === 'bold' ? 'Bold' : 'Pasarela'}...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>Pagar con {paymentMethod === 'wompi' ? 'Wompi' : paymentMethod === 'bold' ? 'Bold' : paymentMethod === 'b2b_credit' ? 'Crédito B2B' : 'Transferencia'}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-4 leading-relaxed">
              Al realizar el pago se generará automáticamente tu Factura Electrónica y la orden ingresará al flujo de pre-prensa.
            </p>
          </div>
        </div>

      </div>

      {/* MODAL DE INTEGRACIÓN Y PRUEBAS DE PASARELA */}
      {activeGatewayModal && modalSessionData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                  activeGatewayModal === 'wompi' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {activeGatewayModal === 'wompi' ? 'W' : 'B'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {activeGatewayModal === 'wompi' ? 'Pasarela Wompi Sandbox' : 'Pasarela Bold Sandbox'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Ambiente de pruebas e integración de pagos</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                Sandbox Test
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 mb-6 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Referencia de Pago:</span>
                <span className="font-mono font-bold text-slate-800">{modalSessionData.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Total a Cobrar:</span>
                <span className="font-bold text-teal-600 text-sm">{formatCOP(total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">Firma de Integridad SHA-256:</span>
                <span className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 max-w-[200px] truncate" title={modalSessionData.signature}>
                  {modalSessionData.signature}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Puedes simular la aprobación de la transacción de prueba para verificar el cambio de estado a <strong>PAGADO / EN_PRODUCCIÓN</strong> y la generación automática de la factura electrónica DIAN.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => confirmOrderPayment(createdOrderId!, activeGatewayModal === 'wompi' ? 'Wompi Sandbox' : 'Bold Sandbox', `TEST-TX-${Date.now()}`)}
                className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  activeGatewayModal === 'wompi' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check size={18} />
                <span>Simular Pago Exitoso (Aprobado)</span>
              </button>

              <button
                onClick={() => {
                  setActiveGatewayModal(null);
                  setErrorMsg('La transacción fue cancelada por el usuario en la pasarela.');
                }}
                className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar y Volver al Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
