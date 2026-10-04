/**
 * Motor de Gestión de Cuentas B2B, Agencias y Distribuidores Mayoristas
 * Incluye niveles de fidelidad (Tier), descuentos de escala y cupos de crédito litográfico.
 */

export type B2BTierLevel = 'RETAIL' | 'SILVER_AGENCY' | 'GOLD_DISTRIBUTOR' | 'PLATINUM_PRINTER';

export interface B2BProfile {
  id: string;
  email: string;
  companyName: string;
  nit: string;
  contactPerson: string;
  phone: string;
  city: string;
  tier: B2BTierLevel;
  discountPercentage: number;
  creditLimit: number;
  creditUsed: number;
  taxExemptWithholding: boolean; // Autorretenedor / Gran Contribuyente
  paymentTermsDays: number; // 0 (contado), 15, 30, 45 días
  isVerifiedB2B: boolean;
  whiteLabelPacking: boolean; // Empaque neutro sin marca de Fusión Gráfica para revendedores
  dedicatedAdvisor: {
    name: string;
    phone: string;
    email: string;
  };
}

export const B2B_TIER_CONFIG: Record<B2BTierLevel, {
  name: string;
  badge: string;
  discount: number;
  minMonthlyVolume: number;
  paymentTerms: number;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  RETAIL: {
    name: 'Cliente Estándar / Retail',
    badge: 'Particular',
    discount: 0,
    minMonthlyVolume: 0,
    paymentTerms: 0,
    description: 'Tarifas públicas del catálogo general sin compras mínimas.',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  SILVER_AGENCY: {
    name: 'Agencia Creativa & Diseñadores',
    badge: 'Nivel Silver (Agencia)',
    discount: 10, // 10% dto global
    minMonthlyVolume: 1500000,
    paymentTerms: 15,
    description: '10% de descuento en todos los tirajes offset/digital y prioridad media en CTP.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  GOLD_DISTRIBUTOR: {
    name: 'Distribuidor / Publicista Mayorista',
    badge: 'Nivel Gold (Distribuidor)',
    discount: 18, // 18% dto global
    minMonthlyVolume: 4000000,
    paymentTerms: 30,
    description: '18% de descuento, empaque neutro sin marca (White-Label) y cupo de crédito a 30 días.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  PLATINUM_PRINTER: {
    name: 'Aliado Gráfico / Gran Cuenta',
    badge: 'Nivel Platinum VIP',
    discount: 25, // 25% dto global
    minMonthlyVolume: 10000000,
    paymentTerms: 45,
    description: '25% de descuento, turno prioritario en prensa Heidelberg, flete gratis en Eje Cafetero y crédito a 45 días.',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
  }
};

const B2B_STORAGE_KEY = 'fusion_grafica_b2b_profile';

export function getStoredB2BProfile(): B2BProfile | null {
  try {
    const raw = localStorage.getItem(B2B_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveB2BProfile(profile: B2BProfile): void {
  localStorage.setItem(B2B_STORAGE_KEY, JSON.stringify(profile));
}

export function clearB2BProfile(): void {
  localStorage.removeItem(B2B_STORAGE_KEY);
}

/**
 * Aplica el cálculo de descuento B2B a un precio base según el perfil activo
 */
export function calculateB2BPrice(basePrice: number, b2bProfile: B2BProfile | null): {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  tierName?: string;
} {
  if (!b2bProfile || !b2bProfile.isVerifiedB2B || b2bProfile.discountPercentage <= 0) {
    return {
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      discountPercentage: 0,
    };
  }

  const discountPercentage = b2bProfile.discountPercentage;
  const discountAmount = Math.round((basePrice * discountPercentage) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return {
    originalPrice: basePrice,
    finalPrice,
    discountAmount,
    discountPercentage,
    tierName: B2B_TIER_CONFIG[b2bProfile.tier]?.name || 'Tarifa Mayorista',
  };
}
