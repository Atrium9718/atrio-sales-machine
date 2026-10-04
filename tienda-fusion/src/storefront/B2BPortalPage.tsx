import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Award, 
  CreditCard, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  Percent, 
  Phone, 
  Mail, 
  FileText, 
  ArrowRight,
  UserCheck,
  Zap,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  B2BProfile, 
  B2BTierLevel, 
  B2B_TIER_CONFIG, 
  getStoredB2BProfile, 
  saveB2BProfile, 
  clearB2BProfile 
} from '../lib/b2bEngine';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';

export default function B2BPortalPage() {
  const { b2bProfile, setB2BProfile } = useCart();

  const { user, login } = useAuth();

  const [companyName, setCompanyName] = useState(b2bProfile?.companyName || '');
  const [nit, setNit] = useState(b2bProfile?.nit || '');
  const [contactPerson, setContactPerson] = useState(b2bProfile?.contactPerson || '');
  const [phone, setPhone] = useState(b2bProfile?.phone || '');
  const [email, setEmail] = useState(b2bProfile?.email || '');
  const [city, setCity] = useState(b2bProfile?.city || 'Manizales');
  const [tier, setTier] = useState<B2BTierLevel>(b2bProfile && b2bProfile.tier !== 'RETAIL' ? b2bProfile.tier : 'SILVER_AGENCY');
  const [whiteLabelPacking, setWhiteLabelPacking] = useState(b2bProfile?.whiteLabelPacking ?? false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPendingReview = Boolean(b2bProfile && !b2bProfile.isVerifiedB2B);
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);

  const [showApplySuccess, setShowApplySuccess] = useState(false);
  const [quickOrderSku, setQuickOrderSku] = useState('');
  const [quickOrderQty, setQuickOrderQty] = useState('1000');
  const [quickOrderSuccess, setQuickOrderSuccess] = useState(false);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // La solicitud se guarda en el servidor y un administrador la aprueba;
  // el descuento solo se aplica cuando el nivel B2B queda aprobado.
  const handleActivateB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);

    if (!user) {
      await login();
      if (!auth.currentUser) {
        setApplyError('Inicia sesión con Google para enviar tu solicitud B2B.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/b2b/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, companyName, nit, contactPerson, phone, city, whiteLabelPacking }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo enviar la solicitud.');
      }

      const newProfile: B2BProfile = {
        id: b2bProfile?.id || 'B2B-' + Date.now().toString().slice(-6),
        companyName,
        nit,
        contactPerson,
        phone,
        email: data.email || email,
        city,
        tier: data.isVerifiedB2B ? data.tier : tier,
        discountPercentage: data.isVerifiedB2B ? data.discountPercentage : 0,
        creditLimit: 0,
        creditUsed: 0,
        taxExemptWithholding: false,
        paymentTermsDays: data.isVerifiedB2B ? data.paymentTermsDays : 0,
        isVerifiedB2B: Boolean(data.isVerifiedB2B),
        whiteLabelPacking,
        dedicatedAdvisor: b2bProfile?.dedicatedAdvisor || { name: '', phone: '', email: '' },
      };
      setB2BProfile(newProfile);
      setShowApplySuccess(true);
      setTimeout(() => setShowApplySuccess(false), 6000);
    } catch (err: any) {
      setApplyError(err.message || 'No se pudo enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateB2B = () => {
    setB2BProfile(null);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      
      {/* HERO BANNER B2B */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8 border-b border-teal-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-black uppercase tracking-wider">
                <Sparkles size={13} />
                Portal Exclusivo para Distribuidores & Agencias
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Tarifas Mayoristas & Escala Litográfica Directa
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Accede a descuentos de hasta el <strong>25% de margen</strong>, empaques neutros de marca blanca (White-Label), cupo de crédito a 30 y 45 días, y cola de impresión prioritaria en prensas Offset Heidelberg.
              </p>
            </div>

            {/* Quick Status Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 w-full lg:w-96 shrink-0 text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase">Estado de tu Cuenta:</span>
                {b2bProfile?.isVerifiedB2B ? (
                  <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={13} /> Verificado B2B
                  </span>
                ) : isPendingReview ? (
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={13} /> Solicitud en revisión
                  </span>
                ) : (
                  <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Tarifa Pública
                  </span>
                )}
              </div>

              {b2bProfile?.isVerifiedB2B ? (
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Razón Social:</span>
                    <span className="font-bold text-white truncate max-w-[180px]">{b2bProfile.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nivel de Aliado:</span>
                    <span className="font-black text-teal-300">{B2B_TIER_CONFIG[b2bProfile.tier]?.badge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Descuento Global:</span>
                    <span className="font-black text-emerald-400 text-sm">{b2bProfile.discountPercentage}% OFF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cupo de Crédito:</span>
                    <span className="font-bold text-white">{formatCOP(b2bProfile.creditLimit - b2bProfile.creditUsed)} Disp.</span>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleDeactivateB2B}
                      className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl font-bold text-xs transition-colors"
                    >
                      Cerrar Sesión B2B / Volver a Retail
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Activa tu cuenta comercial o agencia para desbloquear los precios netos de fábrica en todo el catálogo.
                  </p>
                  <a
                    href="#registro-b2b"
                    className="block text-center w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    Activar o Vincular Mi Cuenta B2B
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BENEFICIOS DEL PROGRAMA MAYORISTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Percent size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Margen Mayorista</h2>
              <p className="text-xs text-slate-500 mt-1">Desde 10% hasta 25% de ahorro directo calculado en el carrito.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <PackageCheck size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Empaque Marca Blanca</h2>
              <p className="text-xs text-slate-500 mt-1">Despachos neutros directos a tu cliente final con tu logo o sin publicidad.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Crédito Comercial</h2>
              <p className="text-xs text-slate-500 mt-1">Plazos de pago a 15, 30 y 45 días contra factura electrónica.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Prioridad en CTP & Prensa</h2>
              <p className="text-xs text-slate-500 mt-1">Tirajes express y asesoría técnica directa con ingenieros de pre-prensa.</p>
            </div>
          </div>

        </div>
      </div>

      {/* TABLA DE NIVELES DE DISTRIBUIDOR (TIERS) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Escala de Beneficios por Volumen Mensual</h2>
          <p className="text-sm text-slate-500 mt-2">
            Tu nivel se ajusta automáticamente según la facturación acumulada de tu empresa en los últimos 30 días.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* SILVER */}
          <div className="bg-white rounded-3xl p-6 border-2 border-blue-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Agencias & Freelancers
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
                <Award size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Nivel Silver</h3>
              <p className="text-xs text-slate-500 mt-1">Para agencias de publicidad y diseñadores gráficos independientes.</p>
              
              <div className="my-6">
                <span className="text-3xl font-black text-blue-600">10% OFF</span>
                <span className="text-xs text-slate-500 block mt-1">En todo el portafolio litográfico</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                  <span>Volumen mínimo: <strong>$1.500.000 / mes</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                  <span>Plazo de pago: <strong>15 días</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                  <span>Revisión de pre-prensa preferente</span>
                </li>
              </ul>
            </div>
          </div>

          {/* GOLD */}
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-400 shadow-md flex flex-col justify-between relative overflow-hidden ring-4 ring-amber-400/20">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              MÁS POPULAR
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4">
                <Award size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Nivel Gold</h3>
              <p className="text-xs text-slate-500 mt-1">Para empresas de artes gráficas, litografías intermedias y distribuidores.</p>
              
              <div className="my-6">
                <span className="text-3xl font-black text-amber-600">18% OFF</span>
                <span className="text-xs text-slate-500 block mt-1">En tirajes offset y gran formato</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span>Volumen mínimo: <strong>$4.000.000 / mes</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span>Plazo de pago: <strong>30 días</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span><strong>Empaque Marca Blanca</strong> para tu cliente</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span>Cupo de crédito asignado hasta $6.000.000</span>
                </li>
              </ul>
            </div>
          </div>

          {/* PLATINUM */}
          <div className="bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              GRANDES CUENTAS
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-4">
                <Award size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Nivel Platinum VIP</h3>
              <p className="text-xs text-slate-500 mt-1">Grandes maquiladores, editoriales e imprentas comerciales aliadas.</p>
              
              <div className="my-6">
                <span className="text-3xl font-black text-purple-600">25% OFF</span>
                <span className="text-xs text-slate-500 block mt-1">Máxima rentabilidad y escala industrial</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-500 shrink-0" />
                  <span>Volumen mínimo: <strong>$10.000.000 / mes</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-500 shrink-0" />
                  <span>Plazo de pago: <strong>45 días</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-500 shrink-0" />
                  <span>Flete 100% Bonificado en Eje Cafetero</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-500 shrink-0" />
                  <span>Ejecutivo de cuenta y línea telefónica directa 24/7</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* FORMULARIO DE REGISTRO / ACTIVACIÓN B2B */}
      <div id="registro-b2b" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl">
          
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Formulario de Vinculación Comercial B2B</h2>
              <p className="text-xs text-slate-500">Ingresa los datos fiscales de tu empresa para validar tus tarifas mayoristas.</p>
            </div>
          </div>

          {showApplySuccess && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <span>¡Solicitud enviada! Nuestro equipo validará los datos de tu empresa y, al aprobarla, tu carrito mostrará automáticamente los precios con descuento.</span>
            </div>
          )}

          {applyError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs font-bold">
              {applyError}
            </div>
          )}

          <form onSubmit={handleActivateB2B} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Razón Social o Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Ej: Impresos & Diseños del Eje S.A.S."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NIT o Cédula Jurídica *</label>
                <input
                  type="text"
                  required
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Ej: 901.482.910-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Persona de Contacto / Compras *</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Ej: Laura Gómez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono / WhatsApp Corporativo *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="+57 311 000 0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico de Facturación *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="facturacion@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nivel Comercial Solicitado *</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as B2BTierLevel)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="SILVER_AGENCY">Nivel Silver (Agencia) - 10% Dto.</option>
                  <option value="GOLD_DISTRIBUTOR">Nivel Gold (Distribuidor Mayorista) - 18% Dto.</option>
                  <option value="PLATINUM_PRINTER">Nivel Platinum VIP (Gran Cuenta) - 25% Dto.</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ciudad de Despacho Principal *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Manizales, Pereira, Armenia, Bogotá..."
                />
              </div>
            </div>

            {/* Opciones Especiales B2B */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase text-slate-700 block tracking-wider">
                Preferencias de Despacho y Facturación
              </span>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whiteLabelPacking}
                  onChange={(e) => setWhiteLabelPacking(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  <strong>Empaque Marca Blanca (White-Label):</strong> Enviar las cajas sin cintas ni membretes de Fusión Gráfica para revender directo al cliente final.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-xs px-8 py-3.5 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
              >
                <UserCheck size={16} />
                <span>{isSubmitting ? 'Enviando…' : user ? 'Enviar Solicitud de Vinculación B2B' : 'Iniciar Sesión y Enviar Solicitud'}</span>
              </button>
            </div>

          </form>

        </div>
      </div>

    </div>
  );
}
