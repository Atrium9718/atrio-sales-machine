import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Package, 
  Clock, 
  RotateCcw, 
  FileText, 
  Truck, 
  MapPin, 
  CreditCard, 
  ChevronRight, 
  Search, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface CustomerOrder {
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

export default function CustomerAccountPage() {
  const { user, login, logout, loading: authLoading, isLoggingIn } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [emailInput, setEmailInput] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [reorderingItemId, setReorderingItemId] = useState<number | null>(null);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  const activeEmail = user?.email || (hasSearched ? emailInput.trim() : '');

  const fetchOrdersForEmail = async (email: string) => {
    if (!email.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/checkout/customer-orders?email=${encodeURIComponent(email.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchOrdersForEmail(user.email);
    }
  }, [user]);

  const handleSearchManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      fetchOrdersForEmail(emailInput.trim());
    }
  };

  const handleReorderItem = (item: CustomerOrder['items'][0]) => {
    setReorderingItemId(item.id);
    
    // Format specs nicely for cart display
    const specsString = item.specs 
      ? Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(' | ') 
      : 'Especificación estándar';

    addToCart({
      productId: item.productId,
      name: item.productName || 'Producto Litográfico',
      options: specsString,
      quantity: item.quantity,
      price: item.totalPrice,
      image: item.previewImageUrl || 'https://images.unsplash.com/photo-1589330694653-0608cb2142e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      design: 'Re-impresión de orden previa (Arte Aprobado)',
      canvasData: null
    });

    setReorderSuccessMsg(`¡"${item.productName || 'Producto'}" se agregó a tu carrito con la misma configuración de arte!`);
    setTimeout(() => {
      setReorderSuccessMsg(null);
      setReorderingItemId(null);
    }, 4000);
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
      'NUEVO': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Nuevo / Pago Validado' },
      'EN_DISEÑO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'En Pre-Prensa' },
      'EN_PRODUCCION': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'En Prensa Litográfica' },
      'LISTO_DESPACHO': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Empaque y Control' },
      'ENVIADO': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'En Camino / Despachado' },
      'ENTREGADO': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Entregado con Éxito' },
    };

    const current = config[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${current.bg} ${current.text} ${current.border}`}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Toast Alert for Reorder */}
        {reorderSuccessMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 size={20} className="text-teal-400 shrink-0" />
            <div className="text-xs font-medium pr-2">
              <p className="font-bold text-white mb-0.5">Listo para Re-impresión</p>
              <p className="text-slate-300">{reorderSuccessMsg}</p>
            </div>
            <Link
              to="/carrito"
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0"
            >
              Ir al Carrito
            </Link>
          </div>
        )}

        {/* Profile / Account Hero Header */}
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-2xl border border-teal-100 shadow-xs">
              {user ? (
                user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  (user.displayName || user.email || 'U')[0].toUpperCase()
                )
              ) : (
                <User size={30} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {user ? (user.displayName || 'Mi Cuenta') : 'Portal del Cliente'}
                </h1>
                {user && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck size={12} /> Verificado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeEmail || 'Consulta tu historial de compras, facturas electrónicas y re-imprime con 1 clic.'}
              </p>
            </div>
          </div>

          {/* Login or Switch Account */}
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/categoria/todas"
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <ShoppingBag size={15} /> Nuevo Pedido
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={login}
                  disabled={isLoggingIn}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <User size={15} /> {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Email Lookup form if not logged in */}
        {!user && (
          <div className="bg-gradient-to-r from-teal-500/10 via-slate-50 to-emerald-500/10 p-6 sm:p-8 rounded-[32px] border border-teal-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              ¿Compraste como invitado o con otro correo?
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa el correo electrónico utilizado en tus pedidos para ver todo tu historial de facturas y re-órdenes al instante.
            </p>
            <form onSubmit={handleSearchManual} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ejemplo@tuempresa.com"
                className="flex-1 px-4 py-3 bg-white rounded-2xl border border-slate-200 text-slate-900 text-sm font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Consultando...' : <><Search size={15} /> Ver Mis Trabajos</>}
              </button>
            </form>
          </div>
        )}

        {/* Orders List Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-teal-600" />
              <h2 className="text-xl font-black text-slate-900">Historial de Pedidos y Trabajos</h2>
            </div>
            {orders.length > 0 && (
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                {orders.length} {orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-[32px] border border-slate-100 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-slate-700">Cargando tus pedidos anteriores...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white p-10 sm:p-14 rounded-[32px] border border-slate-100 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <Package size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {hasSearched ? 'No se encontraron pedidos con este correo' : 'Aún no tienes pedidos registrados'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Empieza configurando tus tarjetas de presentación, volantes, cajas o catálogos en nuestro catálogo interactivo.
              </p>
              <div className="pt-2">
                <Link
                  to="/categoria/todas"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-2xl shadow-sm transition-all"
                >
                  <ShoppingBag size={16} /> Explorar Catálogo
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-teal-100"
                >
                  {/* Order Header Summary */}
                  <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-black text-slate-900">{order.id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(order.createdAt).toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {order.invoicePdfUrl && (
                        <a
                          href={order.invoicePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors shadow-xs"
                        >
                          <FileText size={14} /> Factura DIAN
                        </a>
                      )}
                      
                      <Link
                        to={`/rastreo?code=${order.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition-colors"
                      >
                        <Truck size={14} /> Rastrear Envío
                      </Link>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="p-6 sm:p-8 divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {item.previewImageUrl ? (
                            <img 
                              src={item.previewImageUrl} 
                              alt={item.productName} 
                              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0" 
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                              <Printer size={24} />
                            </div>
                          )}

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{item.productName || 'Producto Litográfico'}</h4>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Tiraje: <span className="text-slate-800 font-bold">{item.quantity.toLocaleString()} unidades</span>
                            </p>

                            {item.specs && Object.keys(item.specs).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(item.specs).map(([key, val]) => (
                                  <span key={key} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                    {key}: {String(val)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price & Reorder Action */}
                        <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-50">
                          <div className="text-left md:text-right">
                            <p className="font-black text-slate-900 text-sm">{formatCOP(item.totalPrice)}</p>
                            <p className="text-[11px] text-slate-400">{formatCOP(item.unitPrice)} c/u</p>
                          </div>

                          <button
                            onClick={() => handleReorderItem(item)}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                            title="Volver a pedir con la misma configuración de arte"
                          >
                            <RotateCcw size={13} />
                            <span>Volver a Pedir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer & Total */}
                  <div className="px-6 sm:px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {order.customerCity}, {order.customerAddress}
                      </span>
                      <span>•</span>
                      <span>Pago: <strong className="text-slate-700">{order.paymentMethod}</strong></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">Total Facturado:</span>
                      <span className="text-base font-black text-slate-900">{formatCOP(order.total)}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
