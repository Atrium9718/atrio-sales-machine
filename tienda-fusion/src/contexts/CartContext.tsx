import React, { createContext, useContext, useState, useEffect } from 'react';
import { B2BProfile, getStoredB2BProfile, saveB2BProfile, clearB2BProfile, B2B_TIER_CONFIG } from '../lib/b2bEngine';
import { DriveFile } from '../lib/googleDrive';
import { useAuth } from './AuthContext';

/** Datos con los que el servidor recalcula el precio de un ítem (nunca se confía en `price`). */
export type CartPricingSpec =
  | { kind: 'product'; productId: number; quantity: number; attributes: number[] }
  | { kind: 'book'; params: Record<string, any> }
  | { kind: 'canvas'; productId: number | null; quantity: number; aiDesign: boolean };

export interface CartItem {
  id: string; // unique cart item id (e.g., Date.now())
  productId: number;
  name: string;
  options: string;
  quantity: number;
  price: number; // total price for this item
  image: string;
  design?: string; // name of the design or 'Subido por cliente'
  file?: File | null;
  driveFile?: DriveFile | null;
  canvasData?: any;
  pricing: CartPricingSpec;
}


interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number, priceMultiplier?: number) => void;
  refreshPrices: () => Promise<void>;
  clearCart: () => void;
  cartCount: number;
  grossSubtotal: number;
  b2bDiscount: number;
  subtotal: number;
  iva: number;
  total: number;
  b2bProfile: B2BProfile | null;
  setB2BProfile: (profile: B2BProfile | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('w2p_cart') || '[]');
      // Ítems de versiones anteriores sin especificación de precio no se pueden verificar en el servidor
      return Array.isArray(saved) ? saved.filter((it: any) => it && it.pricing && it.pricing.kind) : [];
    } catch {
      return [];
    }
  });

  const { user } = useAuth();
  // El perfil guardado en el navegador solo sirve para mostrar datos de la empresa;
  // el descuento se activa únicamente cuando el servidor confirma el nivel B2B aprobado.
  const [b2bProfile, setB2BProfileState] = useState<B2BProfile | null>(() => {
    const stored = getStoredB2BProfile();
    return stored ? { ...stored, isVerifiedB2B: false, discountPercentage: 0 } : null;
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setB2BProfileState(prev => prev ? { ...prev, isVerifiedB2B: false, discountPercentage: 0 } : prev);
      return;
    }
    fetch('/api/b2b/me')
      .then(res => (res.ok ? res.json() : null))
      .then(server => {
        if (cancelled || !server) return;
        const stored = getStoredB2BProfile();
        const request = server.request || {};
        if (!server.isVerifiedB2B && !server.request) {
          setB2BProfileState(null);
          return;
        }
        const tier = server.isVerifiedB2B ? server.tier : (request.tier || 'RETAIL');
        const profile: B2BProfile = {
          id: stored?.id || `B2B-${String(user.uid).slice(-6)}`,
          email: server.email,
          companyName: request.companyName || stored?.companyName || '',
          nit: request.nit || stored?.nit || '',
          contactPerson: request.contactPerson || stored?.contactPerson || '',
          phone: request.phone || stored?.phone || '',
          city: request.city || stored?.city || '',
          tier,
          discountPercentage: server.isVerifiedB2B ? server.discountPercentage : 0,
          creditLimit: stored?.creditLimit || 0,
          creditUsed: stored?.creditUsed || 0,
          taxExemptWithholding: stored?.taxExemptWithholding ?? false,
          paymentTermsDays: server.isVerifiedB2B ? server.paymentTermsDays : 0,
          isVerifiedB2B: Boolean(server.isVerifiedB2B),
          whiteLabelPacking: Boolean(request.whiteLabelPacking),
          dedicatedAdvisor: stored?.dedicatedAdvisor || { name: '', phone: '', email: '' },
        };
        saveB2BProfile(profile);
        setB2BProfileState(profile);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const setB2BProfile = (profile: B2BProfile | null) => {
    if (profile) {
      saveB2BProfile(profile);
    } else {
      clearB2BProfile();
    }
    setB2BProfileState(profile);
  };

  useEffect(() => {
    // Only save serializable data (we drop files from localStorage in a real app, but for demo we can stringify assuming no File objects or ignoring them)
    const itemsToSave = items.map(item => ({ ...item, file: undefined }));
    localStorage.setItem('w2p_cart', JSON.stringify(itemsToSave));
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: Date.now().toString() }]);
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number, _priceMultiplier = 1) => {
    const item = items.find(it => it.id === id);
    if (!item || newQuantity < 1) return;

    // Precio proporcional inmediato (feedback visual) y luego el precio real del servidor
    const nextPricing: CartPricingSpec = item.pricing.kind === 'book'
      ? { ...item.pricing, params: { ...item.pricing.params, quantity: newQuantity } }
      : { ...item.pricing, quantity: newQuantity };
    setItems(prev => prev.map(it => it.id === id
      ? { ...it, quantity: newQuantity, price: (it.price / it.quantity) * newQuantity, pricing: nextPricing }
      : it));

    fetch('/api/checkout/quote-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productName: item.name, pricing: nextPricing }] }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const serverPrice = data?.items?.[0]?.totalPrice;
        if (typeof serverPrice === 'number') {
          setItems(prev => prev.map(it => (it.id === id && it.quantity === newQuantity ? { ...it, price: serverPrice } : it)));
        }
      })
      .catch(() => {});
  };

  // Actualiza todos los precios del carrito con los del servidor (cambios de catálogo, re-impresiones)
  const refreshPrices = async () => {
    const snapshot = items;
    if (snapshot.length === 0) return;
    try {
      const res = await fetch('/api/checkout/quote-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: snapshot.map(it => ({ productName: it.name, pricing: it.pricing })) }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems(prev => prev.map(it => {
        const idx = snapshot.findIndex(s => s.id === it.id);
        const serverPrice = idx >= 0 ? data?.items?.[idx]?.totalPrice : undefined;
        return typeof serverPrice === 'number' && it.quantity === snapshot[idx].quantity ? { ...it, price: serverPrice } : it;
      }));
    } catch {
      // Sin conexión: se conservan los precios mostrados; el servidor valida al pagar
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.length;
  const grossSubtotal = items.reduce((acc, item) => acc + item.price, 0);
  
  // Descuento B2B
  const discountRate = b2bProfile?.isVerifiedB2B ? (b2bProfile.discountPercentage || 0) : 0;
  const b2bDiscount = Math.round((grossSubtotal * discountRate) / 100);
  const subtotal = Math.max(0, grossSubtotal - b2bDiscount);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      refreshPrices,
      clearCart, 
      cartCount, 
      grossSubtotal,
      b2bDiscount,
      subtotal, 
      iva, 
      total,
      b2bProfile,
      setB2BProfile
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
