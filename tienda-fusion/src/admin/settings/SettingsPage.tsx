
import { useState, useEffect } from 'react';
import { 
  Save, Store, Truck, CreditCard, Users, Bell, Shield, Mail, 
  CheckCircle, CheckCircle2, AlertCircle, RefreshCw, Zap, Copy, Check, ExternalLink,
  Lock, Eye, EyeOff, Radio, Building2, MapPin, Package, Box, Navigation, Globe, Sparkles
} from 'lucide-react';
import UsersAndRolesManager from './UsersAndRolesManager';
import CmsAdminManager from './CmsAdminManager';


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'users';
    } catch {
      return 'users';
    }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Estados de prueba de conexión en vivo - Pasarelas
  const [isTestingWompi, setIsTestingWompi] = useState(false);
  const [wompiTestResult, setWompiTestResult] = useState<any>(null);

  const [isTestingBold, setIsTestingBold] = useState(false);
  const [boldTestResult, setBoldTestResult] = useState<any>(null);

  // Estados de prueba de conexión en vivo - Transportadoras / Skydropx
  const [isTestingSkydropx, setIsTestingSkydropx] = useState(false);
  const [skydropxTestResult, setSkydropxTestResult] = useState<any>(null);
  const [showSkydropxKey, setShowSkydropxKey] = useState(false);
  const [showSkydropxSecret, setShowSkydropxSecret] = useState(false);

  // Visibilidad de contraseñas - Pasarelas
  const [showWompiPrv, setShowWompiPrv] = useState(false);
  const [showWompiSecret, setShowWompiSecret] = useState(false);
  const [showBoldSecret, setShowBoldSecret] = useState(false);
  const [showBoldIntegrity, setShowBoldIntegrity] = useState(false);

  // Configuración completa de pasarelas
  const [config, setConfig] = useState({
    wompi: {
      enabled: true,
      mode: 'sandbox',
      publicKey: 'pub_test_Q5yDA9xoKdePzhSGeVe9HAUr1jiBmGWY',
      privateKey: 'prv_test_549382910293847583920192',
      integritySecret: 'test_integrity_4Q7x52U34FfB9v74qT6h2Yp98s1',
      eventsSecret: 'test_events_secret_998127391',
    },
    bold: {
      enabled: true,
      mode: 'sandbox',
      apiKey: 'bold_identity_test_key_online',
      secretKey: 'bold_secret_test_key_online',
      integrityKey: 'bold_integrity_test_key_online',
    },
    bankTransfer: {
      enabled: true,
      bankName: 'Bancolombia',
      accountType: 'Cuenta Corriente',
      accountNumber: '102-938475-10',
      accountHolder: 'Litografía & Impresión Express S.A.S.',
      nit: '901.458.923-1',
      nequiNumber: '311 000 0000',
    },
    b2bCredit: {
      enabled: true,
      defaultPaymentTermsDays: 30,
    }
  });

  // Configuración completa de Transportadoras / Logística (Skydropx)
  const [shippingConfig, setShippingConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('fusion_shipping_config');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      enabled: true,
      provider: 'skydropx' as 'skydropx' | 'envia_com' | 'coordinadora',
      mode: 'sandbox' as 'sandbox' | 'production',
      skydropx: {
        apiKey: '',
        apiSecret: '',
        organizationId: '',
        webhookSecret: '',
        autoGenerateLabelOnProduction: true,
        autoRequestPickup: false,
      },
      origin: {
        companyName: 'Litografía & Impresión Express S.A.S.',
        contactName: 'Andrés Sepúlveda (Despachos y Logística)',
        phone: '+57 311 458 9231',
        email: 'despachos@fusiongrafica.com.co',
        address: 'Carrera 23 # 45-12, Centro Litográfico',
        city: 'Manizales',
        department: 'Caldas',
        postalCode: '170001',
        country: 'CO',
      },
      localShipping: {
        enabled: true,
        cities: ['Manizales', 'Villamaría', 'Chinchiná'],
        flatRateCop: 10000,
        allowPickup: true,
      },
      carriers: {
        servientrega: true,
        coordinadora: true,
        interrapidisimo: true,
        envia: true,
        tcc: true,
        deprisa: false,
      }
    };
  });

  const [savedRecently, setSavedRecently] = useState(false);

  const tabs = [
    { id: 'cms', name: 'CMS & Marca Global', icon: Sparkles },
    { id: 'general', name: 'General', icon: Store },
    { id: 'shipping', name: 'Transportadoras & Envíos', icon: Truck },
    { id: 'payments', name: 'Pasarelas de Pago', icon: CreditCard },
    { id: 'users', name: 'Usuarios y Roles', icon: Users },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
  ];


  // Cargar configuración de pasarelas y envíos desde el backend
  const loadAllConfigs = async () => {
    setIsLoadingConfig(true);
    try {
      // 1. Pasarelas
      const resGateways = await fetch('/api/checkout/gateways-config');
      if (resGateways.ok) {
        const data = await resGateways.json();
        setConfig(prev => {
          const merged = {
            ...prev,
            ...data,
            wompi: { ...prev.wompi, ...(data.wompi || {}) },
            bold: { ...prev.bold, ...(data.bold || {}) },
            bankTransfer: { ...prev.bankTransfer, ...(data.bankTransfer || {}) },
            b2bCredit: { ...prev.b2bCredit, ...(data.b2bCredit || {}) },
          };
          try { localStorage.setItem('fusion_gateways_config', JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      }

      // 2. Envíos / Skydropx
      const resShipping = await fetch('/api/shipping/config');
      if (resShipping.ok) {
        const shipData = await resShipping.json();
        setShippingConfig(prev => {
          const merged = {
            ...prev,
            ...shipData,
            skydropx: { ...prev.skydropx, ...(shipData.skydropx || {}) },
            origin: { ...prev.origin, ...(shipData.origin || {}) },
            localShipping: { ...prev.localShipping, ...(shipData.localShipping || {}) },
            carriers: { ...prev.carriers, ...(shipData.carriers || {}) },
          };
          try { localStorage.setItem('fusion_shipping_config', JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      }
    } catch (e) {
      console.error('Error al cargar configuración', e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Guardar configuración completa en el backend y en localStorage
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    // Guardar inmediatamente en localStorage como respaldo instantáneo
    try {
      localStorage.setItem('fusion_shipping_config', JSON.stringify(shippingConfig));
      localStorage.setItem('fusion_gateways_config', JSON.stringify(config));
    } catch (e) {}

    try {
      const [resGateways, resShipping] = await Promise.all([
        fetch('/api/checkout/gateways-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }),
        fetch('/api/shipping/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shippingConfig)
        })
      ]);

      if (resGateways.ok && resShipping.ok) {
        const updatedGateways = await resGateways.json();
        const updatedShipping = await resShipping.json();
        setConfig(updatedGateways);
        setShippingConfig(updatedShipping);
        
        try {
          localStorage.setItem('fusion_gateways_config', JSON.stringify(updatedGateways));
          localStorage.setItem('fusion_shipping_config', JSON.stringify(updatedShipping));
        } catch (e) {}

        setSavedRecently(true);
        setSaveSuccessMsg('¡Ajustes de transportadoras, origen y pasarelas guardados exitosamente en el servidor!');
        setTimeout(() => {
          setSaveSuccessMsg(null);
          setSavedRecently(false);
        }, 3500);

        // Si Skydropx tiene clave configurada, realizar prueba de conexión rápida
        if (shippingConfig.skydropx.apiKey) {
          testSkydropxConnection();
        }
      } else {
        // Al menos quedó en localStorage
        setSavedRecently(true);
        setSaveSuccessMsg('Ajustes guardados localmente. Sincronizando con el servidor...');
        setTimeout(() => {
          setSaveSuccessMsg(null);
          setSavedRecently(false);
        }, 3000);
      }
    } catch (e: any) {
      setSavedRecently(true);
      setSaveSuccessMsg('Ajustes guardados localmente en tu navegador.');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setSavedRecently(false);
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Probar conexión Skydropx
  const testSkydropxConnection = async () => {
    setIsTestingSkydropx(true);
    setSkydropxTestResult(null);
    try {
      // Auto-guardar en background
      fetch('/api/shipping/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingConfig)
      }).catch(() => {});

      const res = await fetch('/api/shipping/test-skydropx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skydropx: shippingConfig.skydropx,
          mode: shippingConfig.mode,
        })
      });
      const data = await res.json();
      setSkydropxTestResult(data);
    } catch (e: any) {
      setSkydropxTestResult({
        success: false,
        connected: false,
        message: 'No se pudo contactar el servidor para verificar Skydropx: ' + e.message
      });
    } finally {
      setIsTestingSkydropx(false);
    }
  };

  // Probar conexión Wompi
  const testWompiConnection = async () => {
    setIsTestingWompi(true);
    setWompiTestResult(null);
    try {
      const res = await fetch('/api/checkout/test-wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.wompi)
      });
      const data = await res.json();
      setWompiTestResult(data);
    } catch (e: any) {
      setWompiTestResult({
        success: false,
        connected: false,
        message: 'No se pudo contactar al servidor: ' + e.message
      });
    } finally {
      setIsTestingWompi(false);
    }
  };

  // Probar conexión Bold
  const testBoldConnection = async () => {
    setIsTestingBold(true);
    setBoldTestResult(null);
    try {
      const res = await fetch('/api/checkout/test-bold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.bold)
      });
      const data = await res.json();
      setBoldTestResult(data);
    } catch (e: any) {
      setBoldTestResult({
        success: false,
        connected: false,
        message: 'No se pudo contactar al servidor: ' + e.message
      });
    } finally {
      setIsTestingBold(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Configuración del Sistema</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">Pasarelas de pago, envíos, impuestos y roles de usuario</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white px-7 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-75 disabled:scale-100"
          >
            {isSaving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas de Guardado */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-bold flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-teal-600 shadow-sm border border-slate-100'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-teal-500' : 'text-slate-400'} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">

          {/* Banner Global de Estado de Guardado */}
          {saveSuccessMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Operación Exitosa</h4>
                  <p className="text-xs font-bold text-emerald-950 mt-0.5">{saveSuccessMsg}</p>
                </div>
              </div>
              <button 
                onClick={() => setSaveSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-100/60 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {saveErrorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">Atención</h4>
                  <p className="text-xs font-bold text-rose-950 mt-0.5">{saveErrorMsg}</p>
                </div>
              </div>
              <button 
                onClick={() => setSaveErrorMsg(null)}
                className="text-rose-700 hover:text-rose-900 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-rose-100/60 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
          
          {/* TAB CMS & MARCA GLOBAL */}
          {activeTab === 'cms' && (
            <CmsAdminManager />
          )}

          {/* TAB GENERAL */}
          {activeTab === 'general' && (

            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Información de la Tienda</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Empresa</label>
                    <input type="text" defaultValue="Litografía & Impresión Express S.A.S." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">NIT / Documento</label>
                    <input type="text" defaultValue="901.458.923-1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección Principal</label>
                    <input type="text" defaultValue="Manizales, Caldas, Colombia" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Configuración Regional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Moneda por Defecto</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold">
                      <option value="COP">Peso Colombiano (COP)</option>
                      <option value="USD">Dólar (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Impuesto por Defecto (IVA)</label>
                    <div className="relative">
                      <input type="number" defaultValue="19" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB ENVIOS */}
          {activeTab === 'shipping' && (
            <div className="space-y-8">
              {/* Header Tab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">Integración de Transportadoras & Envíos</h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                      Colombia API
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conecta tu cuenta de Skydropx con tu Clave de Cliente y Clave Secreta para cotizar en tiempo real y emitir guías automáticas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={loadAllConfigs}
                    disabled={isLoadingConfig}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Recargar configuración"
                  >
                    <RefreshCw size={14} className={isLoadingConfig ? 'animate-spin text-teal-600' : 'text-slate-500'} />
                    <span>{isLoadingConfig ? 'Cargando...' : 'Recargar'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className={`${
                      savedRecently 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    } px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Guardando...
                      </>
                    ) : savedRecently ? (
                      <>
                        <CheckCircle size={14} /> ¡Ajustes Guardados!
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Guardar Ajustes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1. MÓDULO PRINCIPAL: SKYDROPX */}
              <div className="p-6 md:p-8 border border-slate-200 rounded-3xl bg-white shadow-xs space-y-6">
                
                {/* Header Skydropx */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-gradient-to-tr from-cyan-600 to-teal-500 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-teal-500/20">
                      <Truck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-lg">Skydropx Colombia</h3>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          Agregador Logístico
                        </span>
                        {shippingConfig.skydropx.apiKey && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Credenciales Configuradas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Coordinadora, Servientrega, Inter Rapidísimo, Envía, TCC con cotización automática en checkout y generación de guías.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShippingConfig({ ...shippingConfig, enabled: !shippingConfig.enabled })}
                      className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                        shippingConfig.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </button>
                  </div>
                </div>

                {/* Selector de Ambiente */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Ambiente de Operación API:</span>
                    <p className="text-[11px] text-slate-500">Selecciona Producción cuando uses tus credenciales reales para generar guías válidas.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShippingConfig({ ...shippingConfig, mode: 'sandbox' })}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        shippingConfig.mode === 'sandbox' 
                          ? 'bg-amber-500 text-white shadow-xs' 
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Sandbox (Staging / Pruebas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingConfig({ ...shippingConfig, mode: 'production' })}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        shippingConfig.mode === 'production' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Producción (En Vivo)
                    </button>
                  </div>
                </div>

                {/* Formulario de Credenciales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Clave de Cliente (API Key) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Clave de Cliente (API Key / Client ID) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">sky_live_... o sky_test_...</span>
                    </div>
                    <div className="relative">
                      <input 
                        type={showSkydropxKey ? 'text' : 'password'}
                        value={shippingConfig.skydropx.apiKey}
                        onChange={(e) => setShippingConfig({
                          ...shippingConfig,
                          skydropx: { ...shippingConfig.skydropx, apiKey: e.target.value }
                        })}
                        placeholder="sky_live_1234567890abcdef..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowSkydropxKey(!showSkydropxKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Ver / Ocultar"
                      >
                        {showSkydropxKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Identificador de tu cuenta proporcionado por Skydropx.</p>
                  </div>

                  {/* Clave Secreta del Cliente (API Secret Key) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Clave Secreta del Cliente (API Secret Key) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">sk_secret_...</span>
                    </div>
                    <div className="relative">
                      <input 
                        type={showSkydropxSecret ? 'text' : 'password'} 
                        value={shippingConfig.skydropx.apiSecret}
                        onChange={(e) => setShippingConfig({
                          ...shippingConfig,
                          skydropx: { ...shippingConfig.skydropx, apiSecret: e.target.value }
                        })}
                        placeholder="sk_secret_9981273948127..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowSkydropxSecret(!showSkydropxSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Ver / Ocultar"
                      >
                        {showSkydropxSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Secreto para autenticación segura en el servidor backend.</p>
                  </div>

                  {/* ID de Organización Opcional */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ID de Organización / Cuenta (Opcional)
                    </label>
                    <input 
                      type="text" 
                      value={shippingConfig.skydropx.organizationId}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        skydropx: { ...shippingConfig.skydropx, organizationId: e.target.value }
                      })}
                      placeholder="org_fusion_grafica_co" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none" 
                    />
                  </div>

                  {/* Proveedor API Logística */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motor de Integración Activo
                    </label>
                    <select 
                      value={shippingConfig.provider}
                      onChange={(e: any) => setShippingConfig({ ...shippingConfig, provider: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                    >
                      <option value="skydropx">Skydropx Colombia (Recomendado - Multi-Transportadora)</option>
                      <option value="envia_com">Envia.com API</option>
                      <option value="coordinadora">API Directa Coordinadora</option>
                    </select>
                  </div>
                </div>

                {/* URL Webhook */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      URL Webhook para Notificaciones de Rastreo y Cambios de Guía
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Actualizaciones automáticas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      type="text" 
                      value={`${window.location.origin}/api/shipping/webhook/skydropx`} 
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-600 select-all" 
                    />
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/shipping/webhook/skydropx`, 'skydropx-webhook')}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                      title="Copiar URL Webhook"
                    >
                      {copiedKey === 'skydropx-webhook' ? (
                        <>
                          <Check size={14} className="text-teal-600" />
                          <span className="text-teal-600">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Pega esta URL en tu panel de desarrolladores de Skydropx para que el taller actualice automáticamente las órdenes cuando el paquete esté en tránsito, en reparto o entregado.
                  </p>
                </div>

                {/* Botón y Diagnóstico de Prueba en Vivo */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={testSkydropxConnection}
                      disabled={isTestingSkydropx}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isTestingSkydropx ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                      <span>Probar Conexión en Vivo (Skydropx API)</span>
                    </button>

                    <a 
                      href="https://app.skydropx.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 text-xs"
                    >
                      <span>Abrir Portal de Skydropx</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {/* Resultado del diagnóstico en vivo */}
                  {skydropxTestResult && (
                    <div className={`mt-4 p-4 rounded-2xl text-xs font-medium border animate-in fade-in ${
                      skydropxTestResult.connected 
                        ? 'bg-emerald-50/90 text-emerald-950 border-emerald-200' 
                        : 'bg-rose-50/90 text-rose-950 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 font-bold mb-2">
                        <div className="flex items-center gap-2">
                          {skydropxTestResult.connected ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle size={18} className="text-rose-600 shrink-0" />
                          )}
                          <span className="text-sm">
                            {skydropxTestResult.connected ? 'Skydropx Conectado y Operativo' : 'Error de Conexión con Skydropx'}
                          </span>
                        </div>
                        {skydropxTestResult.responseTimeMs > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                            Latencia: {skydropxTestResult.responseTimeMs} ms
                          </span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed">{skydropxTestResult.message}</p>

                      {skydropxTestResult.sampleQuote && (
                        <div className="mt-3 bg-white/90 p-3.5 rounded-xl border border-emerald-200/80 text-slate-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                            <span className="text-[11px] font-black text-teal-800 uppercase tracking-wide">
                              Cotización de Prueba en Vivo (Simulación de Ruta)
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              OK (200)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ruta de Despacho:</span>
                              <strong>{skydropxTestResult.sampleQuote.route}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Paquete Base:</span>
                              <strong>{skydropxTestResult.sampleQuote.package}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Mejor Tarifa:</span>
                              <strong className="text-emerald-700">{skydropxTestResult.sampleQuote.bestRate}</strong> ({skydropxTestResult.sampleQuote.cheapestCarrier})
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Tiempo Estimado:</span>
                              <strong>{skydropxTestResult.sampleQuote.estimatedDays}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {skydropxTestResult.account && (
                        <div className="mt-2 text-[10px] text-slate-600 bg-white/60 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span><strong>Llave:</strong> {skydropxTestResult.account.clientKeyPreview}</span>
                          <span><strong>Origen:</strong> {skydropxTestResult.account.defaultOrigin}</span>
                          <span><strong>Transportadoras:</strong> {skydropxTestResult.account.activeCarriers?.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* 2. DIRECCIÓN DE REMITENTE (TALLER LITOGRÁFICO DE MANIZALES) */}
              <div className="p-6 md:p-8 border border-slate-200 rounded-3xl bg-white shadow-xs space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-black">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Dirección de Origen del Remitente (Taller Central)</h3>
                    <p className="text-xs text-slate-500">Dirección de despacho desde donde las transportadoras cotizan y recogen los paquetes</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social del Remitente</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.companyName}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, companyName: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contacto Responsable de Despachos</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.contactName}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, contactName: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Planta / Taller</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.address}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, address: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad de Origen</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.city}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, city: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Departamento</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.department}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, department: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Código Postal</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.postalCode}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, postalCode: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp Despachos</label>
                    <input 
                      type="text" 
                      value={shippingConfig.origin.phone}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, phone: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico de Despachos</label>
                    <input 
                      type="email" 
                      value={shippingConfig.origin.email}
                      onChange={(e) => setShippingConfig({
                        ...shippingConfig,
                        origin: { ...shippingConfig.origin, email: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. TRANSPORTADORAS ACTIVAS Y TARIFA PLANA LOCAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Transportadoras Habilitadas */}
                <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-xs space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                      <Box size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Transportadoras Habilitadas</h3>
                      <p className="text-[11px] text-slate-500">Opciones que los clientes podrán elegir en el checkout</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'coordinadora', name: 'Coordinadora Mercantil', tag: 'Terrestre Rápido' },
                      { key: 'servientrega', name: 'Servientrega S.A.', tag: 'Nacional' },
                      { key: 'interrapidisimo', name: 'Inter Rapidísimo', tag: 'Economico' },
                      { key: 'envia', name: 'Envía Colvanes', tag: 'Paqueteo' },
                      { key: 'tcc', name: 'TCC Carga y Paquetería', tag: 'Voluminoso' },
                    ].map(c => (
                      <div key={c.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{c.tag}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShippingConfig({
                            ...shippingConfig,
                            carriers: {
                              ...shippingConfig.carriers,
                              [c.key]: !(shippingConfig.carriers as any)[c.key]
                            }
                          })}
                          className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
                            (shippingConfig.carriers as any)[c.key] ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tarifa Plana Urbana / Caldas */}
                <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-black">
                        <Navigation size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Tarifa Plana Local & Recogida</h3>
                        <p className="text-[11px] text-slate-500">Manizales, Villamaría y Chinchiná</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShippingConfig({
                        ...shippingConfig,
                        localShipping: { ...shippingConfig.localShipping, enabled: !shippingConfig.localShipping.enabled }
                      })}
                      className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
                        shippingConfig.localShipping.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Costo Fijo Domicilio Local (COP)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input 
                          type="number" 
                          value={shippingConfig.localShipping.flatRateCop}
                          onChange={(e) => setShippingConfig({
                            ...shippingConfig,
                            localShipping: { ...shippingConfig.localShipping, flatRateCop: Number(e.target.value) || 0 }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-teal-900 block">Recogida Gratuita en Taller Central</span>
                        <span className="text-[11px] text-teal-700">El cliente retira personalmente en planta ($0 COP)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShippingConfig({
                          ...shippingConfig,
                          localShipping: { ...shippingConfig.localShipping, allowPickup: !shippingConfig.localShipping.allowPickup }
                        })}
                        className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
                          shippingConfig.localShipping.allowPickup ? 'bg-teal-600 justify-end' : 'bg-slate-200 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>Ciudades con cobertura local:</strong> {shippingConfig.localShipping.cities.join(', ')}.
                    </div>
                  </div>
                </div>

              </div>

              {/* Botón inferior para guardar */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className={`${
                    savedRecently
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  } px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-75`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Guardando Ajustes...
                    </>
                  ) : savedRecently ? (
                    <>
                      <CheckCircle size={16} /> ¡Ajustes de Transportadoras Guardados!
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Guardar Ajustes de Transportadoras
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* TAB PASARELAS DE PAGO */}
          {activeTab === 'payments' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Pasarelas de Pago Colombia</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Configura, guarda y diagnostica en tiempo real la conexión con Wompi y Bold</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={loadAllConfigs}
                    disabled={isLoadingConfig}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Recargar configuración"
                  >
                    <RefreshCw size={14} className={isLoadingConfig ? 'animate-spin text-teal-600' : 'text-slate-500'} />
                    <span>{isLoadingConfig ? 'Cargando...' : 'Recargar'}</span>
                  </button>
                  <button 
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className={`${
                      savedRecently
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    } px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Guardando...
                      </>
                    ) : savedRecently ? (
                      <>
                        <CheckCircle size={14} /> ¡Ajustes Guardados!
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Guardar Ajustes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid Pasarelas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. WOMPI */}
                <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-xs hover:border-blue-200 transition-colors flex flex-col justify-between space-y-5">
                  <div>
                    {/* Header Wompi */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm shadow-blue-500/20">
                          W
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-base">Wompi Colombia</h3>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                              Bancolombia
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Botón Bancolombia, Nequi, PSE, Tarjetas</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, wompi: { ...config.wompi, enabled: !config.wompi.enabled } })}
                          className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                            config.wompi.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </button>
                      </div>
                    </div>

                    {/* Selector de Modo */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-600">Ambiente de Operación:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, wompi: { ...config.wompi, mode: 'sandbox' } })}
                          className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                            config.wompi.mode === 'sandbox' 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sandbox (Pruebas)
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, wompi: { ...config.wompi, mode: 'production' } })}
                          className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                            config.wompi.mode === 'production' 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Producción
                        </button>
                      </div>
                    </div>

                    {/* Campos Wompi */}
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Llave Pública (Public Key) *
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">pub_test_... o pub_prod_...</span>
                        </div>
                        <input 
                          type="text" 
                          value={config.wompi.publicKey}
                          onChange={(e) => setConfig({ ...config, wompi: { ...config.wompi, publicKey: e.target.value } })}
                          placeholder="pub_test_Q5yDA9xoKdePzhSGeVe9HAUr1jiBmGWY" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none" 
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Secreto de Integridad (Integrity Secret) *
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">Para firma SHA-256</span>
                        </div>
                        <div className="relative">
                          <input 
                            type={showWompiSecret ? 'text' : 'password'} 
                            value={config.wompi.integritySecret}
                            onChange={(e) => setConfig({ ...config, wompi: { ...config.wompi, integritySecret: e.target.value } })}
                            placeholder="test_integrity_4Q7x52U34FfB9v74qT6h2Yp98s1" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowWompiSecret(!showWompiSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showWompiSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Llave Privada (Private Key)
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">prv_test_...</span>
                        </div>
                        <div className="relative">
                          <input 
                            type={showWompiPrv ? 'text' : 'password'} 
                            value={config.wompi.privateKey}
                            onChange={(e) => setConfig({ ...config, wompi: { ...config.wompi, privateKey: e.target.value } })}
                            placeholder="prv_test_..." 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowWompiPrv(!showWompiPrv)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showWompiPrv ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          URL Webhook para Eventos Wompi
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            readOnly 
                            type="text" 
                            value={`${window.location.origin}/api/checkout/webhook/wompi`} 
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-600 select-all" 
                          />
                          <button 
                            type="button"
                            onClick={() => copyToClipboard(`${window.location.origin}/api/checkout/webhook/wompi`, 'wompi-webhook')}
                            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0"
                            title="Copiar URL Webhook"
                          >
                            {copiedKey === 'wompi-webhook' ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico de Conexión Wompi */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={testWompiConnection}
                          disabled={isTestingWompi}
                          className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isTestingWompi ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                          <span>Probar Conexión en Vivo</span>
                        </button>
                        <a 
                          href="https://comercios.wompi.co" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 text-[11px]"
                        >
                          Portal Wompi <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Resultado de la prueba en vivo */}
                      {wompiTestResult && (
                        <div className={`mt-3 p-3.5 rounded-2xl text-xs font-medium border ${
                          wompiTestResult.connected 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}>
                          <div className="flex items-center gap-2 font-bold mb-1">
                            {wompiTestResult.connected ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle size={16} className="text-rose-600 shrink-0" />
                            )}
                            <span>{wompiTestResult.connected ? 'Wompi Conectado y Operativo' : 'Error de Conexión Wompi'}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">{wompiTestResult.message}</p>
                          {wompiTestResult.merchantName && (
                            <div className="mt-1.5 text-[10px] text-slate-600 bg-white/70 p-2 rounded-xl border border-slate-200/60 flex flex-wrap gap-x-4">
                              <span><strong>Comercio:</strong> {wompiTestResult.merchantName}</span>
                              <span><strong>Modo:</strong> {wompiTestResult.mode}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. BOLD */}
                <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-xs hover:border-rose-200 transition-colors flex flex-col justify-between space-y-5">
                  <div>
                    {/* Header Bold */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm shadow-rose-500/20">
                          B
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-base">Bold Pagos</h3>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                              Smart Checkout
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Tarjetas de Crédito, Débito, PSE Bold</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, bold: { ...config.bold, enabled: !config.bold.enabled } })}
                          className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                            config.bold.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </button>
                      </div>
                    </div>

                    {/* Selector de Modo */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-600">Ambiente de Operación:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, bold: { ...config.bold, mode: 'sandbox' } })}
                          className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                            config.bold.mode === 'sandbox' 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sandbox (Pruebas)
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, bold: { ...config.bold, mode: 'production' } })}
                          className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                            config.bold.mode === 'production' 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Producción
                        </button>
                      </div>
                    </div>

                    {/* Campos Bold */}
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            API Key (Identity Key) *
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">x-api-key</span>
                        </div>
                        <input 
                          type="text" 
                          value={config.bold.apiKey}
                          onChange={(e) => setConfig({ ...config, bold: { ...config.bold, apiKey: e.target.value } })}
                          placeholder="bold_identity_test_key_online" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none" 
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Integrity Key / Secreto de Firma *
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">Para firma SHA-256</span>
                        </div>
                        <div className="relative">
                          <input 
                            type={showBoldIntegrity ? 'text' : 'password'} 
                            value={config.bold.integrityKey}
                            onChange={(e) => setConfig({ ...config, bold: { ...config.bold, integrityKey: e.target.value } })}
                            placeholder="bold_integrity_test_key_online" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowBoldIntegrity(!showBoldIntegrity)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showBoldIntegrity ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Secret Key (Backend Privado)
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">bold_secret_...</span>
                        </div>
                        <div className="relative">
                          <input 
                            type={showBoldSecret ? 'text' : 'password'} 
                            value={config.bold.secretKey}
                            onChange={(e) => setConfig({ ...config, bold: { ...config.bold, secretKey: e.target.value } })}
                            placeholder="bold_secret_test_key_online" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowBoldSecret(!showBoldSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showBoldSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          URL Webhook para Notificaciones Bold
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            readOnly 
                            type="text" 
                            value={`${window.location.origin}/api/checkout/webhook/bold`} 
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-600 select-all" 
                          />
                          <button 
                            type="button"
                            onClick={() => copyToClipboard(`${window.location.origin}/api/checkout/webhook/bold`, 'bold-webhook')}
                            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0"
                            title="Copiar URL Webhook"
                          >
                            {copiedKey === 'bold-webhook' ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico de Conexión Bold */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={testBoldConnection}
                          disabled={isTestingBold}
                          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isTestingBold ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                          <span>Probar Conexión en Vivo</span>
                        </button>
                        <a 
                          href="https://bold.co" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 text-[11px]"
                        >
                          Portal Bold <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Resultado de la prueba en vivo */}
                      {boldTestResult && (
                        <div className={`mt-3 p-3.5 rounded-2xl text-xs font-medium border ${
                          boldTestResult.connected 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}>
                          <div className="flex items-center gap-2 font-bold mb-1">
                            {boldTestResult.connected ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle size={16} className="text-rose-600 shrink-0" />
                            )}
                            <span>{boldTestResult.connected ? 'Bold Conectado y Operativo' : 'Error de Conexión Bold'}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">{boldTestResult.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. TRANSFERENCIA BANCARIA DIRECTA / NEQUI */}
              <div className="p-6 border border-slate-200 rounded-3xl bg-white shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-black">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Transferencia Bancaria Directa & QR Nequi</h3>
                      <p className="text-xs text-slate-500">Datos bancarios que se mostrarán al cliente en el checkout para transferir</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, enabled: !config.bankTransfer.enabled } })}
                    className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                      config.bankTransfer.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Entidad Bancaria</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.bankName}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, bankName: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.accountType}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, accountType: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Número de Cuenta</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.accountNumber}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, accountNumber: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Titular de la Cuenta</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.accountHolder}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, accountHolder: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NIT / Cédula</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.nit}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, nit: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Línea Nequi / Daviplata</label>
                    <input 
                      type="text" 
                      value={config.bankTransfer.nequiNumber}
                      onChange={(e) => setConfig({ ...config, bankTransfer: { ...config.bankTransfer, nequiNumber: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Botón inferior para guardar */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-75"
                >
                  <Save size={16} /> Guardar Toda la Configuración
                </button>
              </div>

            </div>
          )}

          {/* TAB USUARIOS */}
          {activeTab === 'users' && (
            <UsersAndRolesManager />
          )}


          {/* TAB NOTIFICACIONES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Notificaciones Automáticas</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Nuevo Pedido Recibido</h4>
                      <p className="text-sm text-slate-500">Enviar correo al cliente confirmando su orden.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pedido en Producción</h4>
                      <p className="text-sm text-slate-500">Avisar al cliente cuando el pedido pase a producción.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pedido Enviado</h4>
                      <p className="text-sm text-slate-500">Notificar al cliente el envío con número de guía.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

