import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, Copy, Check, Clock, Gift, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PromoPopupModal() {
  const [activePopup, setActivePopup] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 23,
    minutes: 59,
    seconds: 45
  });
  const exitIntentTriggered = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPopups() {
      try {
        const res = await fetch('/api/catalog/banners');
        if (!res.ok) return;
        const banners = await res.json();
        
        // Find active popup banner
        const popups = banners.filter((b: any) => 
          (b.isPopup || b.placement === 'popup_modal') && (b.active !== false && b.isActive !== false)
        );

        if (popups.length === 0 || !isMounted) {
          setActivePopup(null);
          setIsOpen(false);
          return;
        }

        // Choose the highest priority popup
        const candidate = popups[0];
        const pConfig = candidate.popupConfig || {};
        const storageKey = `w2p_popup_seen_${candidate.id}`;

        if (pConfig.showOncePerSession && sessionStorage.getItem(storageKey)) {
          return; // already shown in this browser session
        }

        setActivePopup(candidate);

        const trigger = pConfig.trigger || 'delay';
        const delayMs = (pConfig.delaySeconds || 4) * 1000;

        if (trigger === 'on_load') {
          setTimeout(() => {
            if (isMounted) {
              setIsOpen(true);
              sessionStorage.setItem(storageKey, 'true');
            }
          }, 800);
        } else if (trigger === 'delay') {
          const timer = setTimeout(() => {
            if (isMounted) {
              setIsOpen(true);
              sessionStorage.setItem(storageKey, 'true');
            }
          }, delayMs);
          return () => clearTimeout(timer);
        } else if (trigger === 'exit_intent') {
          const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 10 && !exitIntentTriggered.current) {
              exitIntentTriggered.current = true;
              if (isMounted) {
                setIsOpen(true);
                sessionStorage.setItem(storageKey, 'true');
              }
            }
          };
          document.addEventListener('mouseleave', handleMouseLeave);
          return () => document.removeEventListener('mouseleave', handleMouseLeave);
        }
      } catch (e) {
        console.error('Error initializing promo popup:', e);
      }
    }

    loadPopups();

    const handleUpdate = () => loadPopups();
    window.addEventListener('banners-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => { 
      isMounted = false; 
      window.removeEventListener('banners-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Simple countdown timer tick
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !activePopup) return null;

  const pConfig = activePopup.popupConfig || {};
  const bgImg = activePopup.desktopImageUrl || activePopup.imageUrl;

  const handleCopyCode = () => {
    if (!pConfig.couponCode) return;
    navigator.clipboard.writeText(pConfig.couponCode);
    setCopied(true);

    if (pConfig.confetti !== false) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }
    }
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative">
        
        {/* Header Visual Banner */}
        <div className="relative h-48 sm:h-56 bg-slate-950 overflow-hidden">
          {bgImg ? (
            <img
              src={bgImg}
              alt={activePopup.title}
              className="w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${activePopup.gradientFrom || '#042f2e'}, ${activePopup.gradientTo || '#0f766e'})`
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-20 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          {/* Tag & Title in Header */}
          <div className="absolute bottom-4 left-5 right-5 text-white z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Sparkles size={11} />
                {activePopup.tag || 'Oferta Exclusiva Web-To-Print'}
              </span>
              {pConfig.discountValue && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  {pConfig.discountValue}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black leading-tight text-white drop-shadow-sm">
              {activePopup.title}
            </h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {activePopup.subtitle || 'Aprovecha este descuento especial antes de que termine el tiempo de la promoción.'}
          </p>

          {/* Countdown Urgent Box */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-50 border border-slate-200 w-fit mx-auto text-xs font-bold text-slate-700">
            <Clock size={14} className="text-teal-600 animate-pulse" />
            <span>Expira en:</span>
            <div className="flex items-center gap-1 font-mono text-teal-700 font-black">
              <span className="bg-slate-200 px-1.5 py-0.5 rounded-sm">{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded-sm">{String(timeLeft.minutes).padStart(2, '0')}m</span>
              <span>:</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded-sm">{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </div>
          </div>

          {/* Coupon Box with 1-click copy */}
          {pConfig.couponCode && (
            <div className="p-4 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-300 flex items-center justify-between gap-2">
              <div className="text-left truncate">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">Código Promocional</span>
                <span className="text-base sm:text-lg font-mono font-black text-teal-950 truncate block">
                  {pConfig.couponCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-slate-950 text-slate-950 hover:text-white text-xs font-black shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-slate-950 font-black" />
                    <span>¡Copiado! 🎉</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Cupón</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-full font-bold border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
            >
              No, gracias
            </button>
            <Link
              to={activePopup.linkUrl || activePopup.link || "/categoria/todas"}
              onClick={handleClose}
              className="flex-1 py-3 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-md shadow-teal-500/20 transition-transform active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>{activePopup.ctaText || 'Aprovechar Oferta'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
