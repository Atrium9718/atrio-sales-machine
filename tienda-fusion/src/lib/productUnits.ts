export interface ProductUnitConfig {
  unitLabel: string;
  packSize: number;
  minQuantity: number;
  step: number;
  presetQuantities: number[];
  displaySuffix: string;
  quantityLabel: (qty: number) => string;
  quantityTiers?: { quantity: number; price: number; label?: string }[];
}

export function getProductUnitConfig(product?: { 
  slug?: string; 
  name?: string; 
  categorySlug?: string; 
  category?: string; 
  categoryName?: string;
  minQuantity?: number | string;
  quantityStep?: number | string;
  baseQuantity?: number | string;
  quantityTiers?: { quantity: number; price: number; label?: string }[];
  extraConfig?: any;
} | null): ProductUnitConfig {
  const tiers: { quantity: number; price: number; label?: string }[] = 
    product?.quantityTiers || product?.extraConfig?.quantityTiers || [];

  const customMin = tiers.length > 0 ? Number(tiers[0].quantity) : (Number(product?.minQuantity) || 1);
  const customStep = Number(product?.quantityStep) || 1;
  const baseQty = Number(product?.baseQuantity) || 1;

  // Generar presets inteligentes a partir de los tiers o del mínimo configurado
  let presets: number[] = [];
  if (tiers.length > 0) {
    presets = tiers.map(t => Number(t.quantity));
  } else if (customMin === 1) {
    if (baseQty >= 1000) {
      presets = [1, 50, 100, 250, 500, 1000, 2000, 5000];
    } else if (baseQty >= 100) {
      presets = [1, 10, 25, 50, 100, 200, 500];
    } else {
      presets = [1, 2, 3, 5, 10, 20, 50];
    }
  } else if (customMin <= 50) {
    presets = [customMin, customMin * 2, 100, 250, 500, 1000];
  } else if (customMin <= 100) {
    presets = [customMin, 200, 500, 1000, 2000, 5000];
  } else if (customMin <= 500) {
    presets = [customMin, 1000, 2000, 3000, 5000, 10000];
  } else {
    presets = [customMin, customMin * 2, customMin * 3, customMin * 5, customMin * 10];
  }

  // Filtrar duplicados ordenados
  const uniquePresets = Array.from(new Set(presets.filter(q => q >= customMin))).sort((a, b) => a - b);

  return {
    unitLabel: 'unidad',
    packSize: baseQty,
    minQuantity: customMin,
    step: customStep,
    presetQuantities: uniquePresets,
    quantityTiers: tiers,
    displaySuffix: '/ unidad',
    quantityLabel: (qty) => `${qty.toLocaleString('es-CO')} ${qty === 1 ? 'unidad' : 'unidades'}`
  };
}
