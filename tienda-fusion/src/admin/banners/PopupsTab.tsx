import React, { useState } from 'react';
import { 
  Gift, 
  Plus, 
  Sparkles, 
  Copy, 
  Check, 
  Clock, 
  MousePointerClick, 
  Sliders, 
  Play, 
  Edit, 
  Trash2, 
  Copy as DuplicateIcon, 
  CheckCircle2, 
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PopupsTabProps {
  banners: any[];
  onOpenCreate: () => void;
  onEdit: (banner: any) => void;
  onDelete: (popup: any) => void;
  onToggle: (id: number, active: boolean) => void;
  onDuplicate: (id: number) => void;
}

export default function PopupsTab({
  banners,
  onOpenCreate,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate
}: PopupsTabProps) {
  const popups = banners.filter(b => b.isPopup || b.placement === 'popup_modal');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [simulatedPopup, setSimulatedPopup] = useState<any | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSimulate = (popup: any) => {
    setSimulatedPopup(popup);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 rounded-[28px] p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-teal-800/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-black uppercase tracking-wider mb-2">
            <Gift size={13} />
            <span>Módulo de Ventanas Emergentes Promocionales</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Popups & Modales de Conversión</h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl">
            Aumenta tus ventas con modales interactivos activados por tiempo o intento de salida, equipados con cupones copiables y efecto confeti.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-transform active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Crear Nueva Ventana Emergente</span>
        </button>
      </div>

      {/* Grid of Active Popups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {popups.map((popup) => {
          const pConfig = popup.popupConfig || {};
          const isAct = popup.active ?? true;
          return (
            <div
              key={popup.id}
              className={`bg-white rounded-[24px] border transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-md ${
                isAct ? 'border-teal-200' : 'border-slate-200 opacity-80'
              }`}
            >
              {/* Card Header & Preview Image */}
              <div className="relative h-44 bg-slate-900 overflow-hidden">
                {popup.desktopImageUrl ? (
                  <img
                    src={popup.desktopImageUrl}
                    alt={popup.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${popup.gradientFrom || '#0f172a'}, ${popup.gradientTo || '#14b8a6'})`
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isAct ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {isAct ? 'Activo' : 'Pausado'}
                  </span>
                  {pConfig.discountValue && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      {pConfig.discountValue}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                    Trigger: {pConfig.trigger === 'exit_intent' ? 'Intento de Salida' : (pConfig.trigger === 'on_load' ? 'Al Cargar' : `Tras ${pConfig.delaySeconds || 4}s`)}
                  </span>
                  <h3 className="text-base font-black truncate">{popup.title}</h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                  {popup.subtitle || 'Sin subtítulo configurado.'}
                </p>

                {/* Coupon Box */}
                {pConfig.couponCode && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">Cupón de Descuento</span>
                      <span className="text-sm font-mono font-black text-teal-950">{pConfig.couponCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(pConfig.couponCode)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedCode === pConfig.couponCode ? (
                        <>
                          <Check size={12} />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span>{pConfig.showOncePerSession ? '1 vez x sesión' : 'Siempre visible'}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Sparkles size={12} className="text-teal-500" />
                    <span>Confeti: {pConfig.confetti ? 'Activado' : 'No'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulate(popup)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Ver cómo lo ve el cliente"
                  >
                    <Eye size={13} />
                    <span>Simular</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(popup.id, !isAct)}
                      className={`p-2 rounded-xl transition-colors ${
                        isAct ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={isAct ? 'Pausar Popup' : 'Activar Popup'}
                    >
                      {isAct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicate(popup.id)}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                      title="Duplicar"
                    >
                      <DuplicateIcon size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(popup)}
                      className="p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(popup)}
                      className="p-2 text-slate-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {popups.length === 0 && (
        <div className="bg-white rounded-[28px] p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600">
            <Gift size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">No tienes ventanas emergentes activas</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            Crea tu primer popup promocional con cupones, cuenta regresiva y animaciones para captar más clientes en la tienda.
          </p>
          <button
            onClick={onOpenCreate}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-full text-xs font-black inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            <Plus size={15} />
            <span>Crear Primer Popup</span>
          </button>
        </div>
      )}

      {/* Interactive Simulator Modal */}
      {simulatedPopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative">
            
            {/* Modal Image Header */}
            <div className="relative h-52 bg-slate-950 overflow-hidden">
              {simulatedPopup.desktopImageUrl ? (
                <img
                  src={simulatedPopup.desktopImageUrl}
                  alt={simulatedPopup.title}
                  className="w-full h-full object-cover opacity-70"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${simulatedPopup.gradientFrom || '#0f172a'}, ${simulatedPopup.gradientTo || '#14b8a6'})`
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

              <button
                onClick={() => setSimulatedPopup(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 right-6 text-white">
                {simulatedPopup.tag && (
                  <span className="inline-block px-3 py-0.5 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2">
                    {simulatedPopup.tag}
                  </span>
                )}
                <h3 className="text-xl font-black leading-tight text-white">{simulatedPopup.title}</h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-center">
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                {simulatedPopup.subtitle || 'Aprovecha este descuento exclusivo antes de que finalice la promoción.'}
              </p>

              {/* Coupon Box with interactive copy & confetti */}
              {simulatedPopup.popupConfig?.couponCode && (
                <div className="p-4 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-300 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">Código Promocional</span>
                    <span className="text-lg font-mono font-black text-teal-950">{simulatedPopup.popupConfig.couponCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(simulatedPopup.popupConfig.couponCode)}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-black shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    {copiedCode === simulatedPopup.popupConfig.couponCode ? '¡Copiado! 🎉' : 'Copiar Cupón'}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSimulatedPopup(null)}
                  className="flex-1 py-3 rounded-full font-bold border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
                >
                  Continuar Navegando
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedPopup(null)}
                  className="flex-1 py-3 rounded-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs shadow-md shadow-teal-500/20 transition-transform active:scale-95"
                >
                  {simulatedPopup.ctaText || 'Ir a Comprar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
