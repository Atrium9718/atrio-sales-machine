import React, { useEffect, useState, useRef } from 'react';
import { Building, Upload, MapPin, Phone, Mail, Globe, Save, CheckCircle2, Trash2, Image as ImageIcon } from 'lucide-react';

export default function OrganizacionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [logoPrincipal, setLogoPrincipal] = useState<string>('');
  const [logoSecundario, setLogoSecundario] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [razonSocial, setRazonSocial] = useState<string>('Fusión Comunicación Gráfica S.A.S.');
  const [nit, setNit] = useState<string>('900.284.195-1');
  const [direccion, setDireccion] = useState<string>('Medellín, Colombia');
  const [telefono, setTelefono] = useState<string>('+57 (4) 444-0000');
  const [email, setEmail] = useState<string>('contacto@fusion.com.co');
  const [terminos, setTerminos] = useState<string>('Validez de la oferta: 15 días calendario. Anticipo del 50%, saldo contra entrega.');
  const [datosBancarios, setDatosBancarios] = useState<string>('Bancolombia Cuenta de Ahorros N° 123-456789-01 a nombre de Fusión Comunicación Gráfica S.A.S.');

  const primaryLogoInputRef = useRef<HTMLInputElement>(null);
  const secondaryLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: any[]) => {
        const getVal = (key: string, fallback: string) => {
          const item = data.find(s => s.key === key);
          return item?.value || fallback;
        };

        setLogoPrincipal(getVal('organization.branding.logoUrl', ''));
        setLogoSecundario(getVal('organization.branding.logoSecondaryUrl', ''));
        setPrimaryColor(getVal('organization.branding.primaryColor', '#000000'));
        setRazonSocial(getVal('organization.business.name', 'Fusión Comunicación Gráfica S.A.S.'));
        setNit(getVal('organization.business.nit', '900.284.195-1'));
        setDireccion(getVal('organization.business.address', 'Medellín, Colombia'));
        setTelefono(getVal('organization.business.phone', '+57 (4) 444-0000'));
        setEmail(getVal('organization.business.email', 'contacto@fusion.com.co'));
        setTerminos(getVal('organization.legal.terms', 'Validez de la oferta: 15 días calendario. Anticipo del 50%, saldo contra entrega.'));
        setDatosBancarios(getVal('organization.bankDetails', 'Bancolombia Cuenta de Ahorros N° 123-456789-01 a nombre de Fusión Comunicación Gráfica S.A.S.'));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando configuración:', err);
        setLoading(false);
      });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isPrimary: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers change
    e.target.value = '';

    // Check size limit (max 10MB input before downscaling)
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar los 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      
      // Optimize and resize image using canvas to ensure lightweight base64 (~20-80KB)
      // preventing localStorage QuotaExceededError
      const img = new Image();
      img.onload = () => {
        const maxWidth = 500;
        const maxHeight = 250;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/png', 0.92);
          if (isPrimary) {
            setLogoPrincipal(optimizedBase64);
          } else {
            setLogoSecundario(optimizedBase64);
          }
        } else {
          if (isPrimary) setLogoPrincipal(rawBase64);
          else setLogoSecundario(rawBase64);
        }
      };
      img.onerror = () => {
        if (isPrimary) setLogoPrincipal(rawBase64);
        else setLogoSecundario(rawBase64);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const updates = [
      { key: 'organization.branding.logoUrl', value: logoPrincipal },
      { key: 'organization.branding.logoSecondaryUrl', value: logoSecundario },
      { key: 'organization.branding.primaryColor', value: primaryColor },
      { key: 'organization.business.name', value: razonSocial },
      { key: 'organization.business.nit', value: nit },
      { key: 'organization.business.address', value: direccion },
      { key: 'organization.business.phone', value: telefono },
      { key: 'organization.business.email', value: email },
      { key: 'organization.legal.terms', value: terminos },
      { key: 'organization.bankDetails', value: datosBancarios },
    ];

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!res.ok) {
        throw new Error('Error al guardar en el servidor');
      }

      // Update local storage and notify UI components immediately
      const identityData = {
        name: razonSocial,
        logoUrl: logoPrincipal,
        logoSecondaryUrl: logoSecundario,
        primaryColor,
        nit,
        address: direccion,
        phone: telefono,
        email
      };
      
      try {
        localStorage.setItem('fusion_org_identity', JSON.stringify(identityData));
      } catch (storageErr) {
        console.warn('Could not cache to localStorage (quota or disabled):', storageErr);
      }

      window.dispatchEvent(new CustomEvent('fusion_identity_updated', { detail: identityData }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error guardando identidad:', err);
      alert('Hubo un inconveniente al guardar. Por favor reintenta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-muted-foreground">
        Cargando identidad corporativa...
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="text-primary w-7 h-7" /> Identidad de la Empresa
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configura el logo, nombre comercial, datos fiscales y contacto que identifican a la empresa en todo el sistema.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" /> Guardado y logo actualizado
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Todo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* Logos & Branding */}
        <div className="border border-border bg-card rounded-lg p-5 shadow-xs">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Identidad Visual
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            El logo principal reemplazará automáticamente el nombre «Fusión CRM» en la esquina superior izquierda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo Principal */}
            <div>
              <input 
                type="file" 
                ref={primaryLogoInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                onChange={(e) => handleFileUpload(e, true)}
              />
              
              {logoPrincipal ? (
                <div className="border border-border bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center text-center relative group min-h-[140px]">
                  <img 
                    src={logoPrincipal} 
                    alt="Logo Principal" 
                    className="max-h-20 max-w-full object-contain mb-2" 
                  />
                  <div className="text-xs font-medium text-foreground">Logo Principal (Activo)</div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => primaryLogoInputRef.current?.click()}
                      className="text-xs text-primary underline hover:opacity-80"
                    >
                      Cambiar
                    </button>
                    <button 
                      onClick={() => setLogoPrincipal('')}
                      className="text-xs text-destructive flex items-center gap-1 hover:opacity-80"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => primaryLogoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[140px]"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <div className="text-sm font-semibold text-foreground">Subir Logo Principal</div>
                  <div className="text-xs text-muted-foreground mt-1">PNG, SVG o JPG (Fondo transparente)</div>
                </div>
              )}
            </div>

            {/* Logo Secundario */}
            <div>
              <input 
                type="file" 
                ref={secondaryLogoInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                onChange={(e) => handleFileUpload(e, false)}
              />
              
              {logoSecundario ? (
                <div className="border border-border bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center text-center relative group min-h-[140px]">
                  <img 
                    src={logoSecundario} 
                    alt="Logo Secundario" 
                    className="max-h-20 max-w-full object-contain mb-2 bg-slate-900/10 p-1 rounded" 
                  />
                  <div className="text-xs font-medium text-foreground">Logo Secundario (Oscuro)</div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => secondaryLogoInputRef.current?.click()}
                      className="text-xs text-primary underline hover:opacity-80"
                    >
                      Cambiar
                    </button>
                    <button 
                      onClick={() => setLogoSecundario('')}
                      className="text-xs text-destructive flex items-center gap-1 hover:opacity-80"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => secondaryLogoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[140px]"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <div className="text-sm font-semibold text-foreground">Logo Secundario</div>
                  <div className="text-xs text-muted-foreground mt-1">Versión oscura o monograma</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">Color Principal de Marca</label>
            <div className="flex gap-2 items-center mt-1.5">
              <input 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-border p-0.5 cursor-pointer bg-card" 
              />
              <input 
                type="text" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="px-3 py-2 border border-border rounded-md w-full bg-background text-sm font-mono" 
              />
            </div>
          </div>
        </div>

        {/* Fiscal & Contact */}
        <div className="border border-border bg-card rounded-lg p-5 shadow-xs">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" /> Datos Fiscales y Contacto
          </h3>
          <div className="space-y-3.5">
            <div>
              <label className="text-sm font-medium">Razón Social / Nombre de la Empresa</label>
              <input 
                type="text" 
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="mt-1 px-3 py-2 border border-border rounded-md w-full bg-background text-sm" 
                placeholder="Nombre de la empresa"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">NIT / Identificación Tributaria</label>
              <input 
                type="text" 
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="mt-1 px-3 py-2 border border-border rounded-md w-full bg-background text-sm" 
                placeholder="900.000.000-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Dirección Principal
              </label>
              <input 
                type="text" 
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle 123 #45-67, Ciudad" 
                className="mt-1 px-3 py-2 border border-border rounded-md w-full bg-background text-sm" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono
                </label>
                <input 
                  type="text" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 px-3 py-2 border border-border rounded-md w-full bg-background text-sm" 
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email Corporativo
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 px-3 py-2 border border-border rounded-md w-full bg-background text-sm" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legals & Banking */}
        <div className="border border-border bg-card rounded-lg p-5 md:col-span-2 shadow-xs">
          <h3 className="font-bold text-lg mb-4">Financiero y Textos Legales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Datos Bancarios para Pagos</label>
              <p className="text-xs text-muted-foreground mb-1">Información que saldrá en las cotizaciones y facturas emitidas.</p>
              <textarea 
                value={datosBancarios}
                onChange={(e) => setDatosBancarios(e.target.value)}
                className="px-3 py-2 border border-border rounded-md w-full bg-background text-sm h-24 resize-none" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Términos Comerciales Estándar</label>
              <p className="text-xs text-muted-foreground mb-1">Validez de ofertas y condiciones generales de pago.</p>
              <textarea 
                value={terminos}
                onChange={(e) => setTerminos(e.target.value)}
                className="px-3 py-2 border border-border rounded-md w-full bg-background text-sm h-24 resize-none" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
