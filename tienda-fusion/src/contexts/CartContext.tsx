import React, { createContext, useContext, useState, useEffect } from 'react';
import { B2BProfile, getStoredB2BProfile, saveB2BProfile, clearB2BProfile, B2B_TIER_CONFIG } from '../lib/b2bEngine';
import { DriveFile } from '../lib/googleDrive';

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
}


interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number, priceMultiplier?: number) => void;
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
    const saved = localStorage.getItem('w2p_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [b2bProfile, setB2BProfileState] = useState<B2BProfile | null>(() => {
    return getStoredB2BProfile();
  });

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

  const updateQuantity = (id: string, newQuantity: number, priceMultiplier = 1) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        // Mock updating price proportionally
        const unitPrice = item.price / item.quantity;
        return { ...item, quantity: newQuantity, price: unitPrice * newQuantity };
      }
      return item;
    }));
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
