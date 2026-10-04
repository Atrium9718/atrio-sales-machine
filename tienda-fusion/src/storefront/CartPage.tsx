import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ChevronLeft, ArrowRight, Minus, Plus, ShoppingBag, ShieldCheck, Printer, PlusCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, grossSubtotal, b2bDiscount, subtotal, iva, total, b2bProfile, refreshPrices } = useCart();

  // Al abrir el carrito se sincronizan los precios con el servidor
  useEffect(() => {
    refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center text-teal-500 mb-6">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Tu carrito está vacío</h2>
        <p className="text-slate-500 mb-8 max-w-sm">Parece que aún no has agregado productos. Descubre nuestro catálogo y comienza a diseñar.</p>
        <Link to="/categoria/todas" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full shadow-md shadow-teal-500/30 transition-transform active:scale-95 flex items-center gap-2">
          <PlusCircle size={20} />
          Explorar Catálogo y Comprar
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 lg:flex lg:gap-12">
        
        {/* COLUMNA IZQUIERDA: PRODUCTOS */}
        <div className="lg:flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="bg-white p-2.5 rounded-full shadow-xs text-slate-600 hover:text-teal-600 border border-slate-100 hidden md:block" title="Volver">
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Tu Carrito <span className="text-teal-600">({items.length})</span></h1>
            </div>
            
            <Link 
              to="/categoria/todas" 
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-teal-200 shadow-xs transition-colors shrink-0"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Seguir Comprando</span>
              <span className="sm:hidden">Comprar más</span>
            </Link>
          </div>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 sm:gap-6 relative">
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="absolute top-4 right-4 sm:static sm:order-last p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors h-fit"
                  title="Eliminar producto"
                >
                  <Trash2 size={20} />
                </button>
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[16px] bg-slate-100 overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 pr-8 sm:pr-0">{item.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{item.options}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 block"></span>
                      <p className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md w-fit">
                        Diseño: {item.design || 'Sin diseño'}
                      </p>

                      {item.driveFile && (
                        <a
                          href={item.driveFile.webViewLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <svg viewBox="0 0 87.3 78" className="w-3 h-3">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                          <span>Google Drive ({item.driveFile.size || 'Nube'})</span>
                        </a>
                      )}
                    </div>

                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-100">
                      <button onClick={() => updateQuantity(item.id, Math.max(100, item.quantity - 100))} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-sm hover:text-teal-600 transition-colors">
                        <Minus size={16} />
                      </button>
                      <span className="font-extrabold text-sm w-12 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 100)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-sm hover:text-teal-600 transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {formatCOP(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Banner para Seguir Comprando y agregar más ítems */}
          <div className="mt-4 p-4 rounded-2xl bg-white border border-dashed border-teal-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">¿Deseas imprimir otros productos?</p>
                <p className="text-xs text-slate-500">Agrega tarjetas, volantes, cajas o pendones a este mismo pedido.</p>
              </div>
            </div>
            <Link
              to="/categoria/todas"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors shrink-0"
            >
              <Plus size={16} />
              <span>Seguir Comprando</span>
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500 bg-teal-50 p-4 rounded-[16px] border border-teal-100">
            <ShieldCheck size={20} className="text-teal-600 shrink-0" />
            <p>Tus archivos serán revisados por pre-prensa antes de imprimir para asegurar la mejor calidad.</p>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y CHECKOUT */}
        <div className="mt-8 lg:mt-0 lg:w-[400px] shrink-0">
          <div className="bg-white rounded-[32px] shadow-lg border border-slate-100 p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Resumen de Compra</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal Bruto</span>
                <span>{formatCOP(grossSubtotal)}</span>
              </div>

              {b2bDiscount > 0 && b2bProfile && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-emerald-800">
                    <span>Descuento B2B ({b2bProfile.discountPercentage}% {b2bProfile.companyName ? '· ' + b2bProfile.companyName : ''})</span>
                    <span>-{formatCOP(b2bDiscount)}</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    Tarifa de Distribuidor Mayorista aplicada automáticamente.
                  </p>
                </div>
              )}

              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal Liquidable</span>
                <span>{formatCOP(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-500 font-medium pb-4 border-b border-slate-100">
                <span>IVA discriminado (19%)</span>
                <span>{formatCOP(iva)}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-lg font-bold text-slate-900">Total a Pagar</span>
                <span className="text-3xl font-black text-teal-600 tracking-tight">{formatCOP(total)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link 
                to="/checkout"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-slate-900/20"
              >
                <span>Continuar al Pago</span>
                <ArrowRight size={20} />
              </Link>

              <Link
                to="/categoria/todas"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                <span>Seguir Comprando</span>
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs text-center text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <Printer size={14} /> Producción estimada: 2-4 días hábiles
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
