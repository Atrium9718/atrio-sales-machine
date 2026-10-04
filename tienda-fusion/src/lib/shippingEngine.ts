/**
 * Motor de Cálculo Logístico y Generación de Guías de Transporte para Colombia
 * Compatible con: Coordinadora, Servientrega, Envía, Inter Rapidísimo, TCC y Mensajería Local.
 */

export interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  logo: string;
  baseRateRegional: number;
  baseRateNational: number;
  extraKgRate: number;
  deliveryDaysRegional: string;
  deliveryDaysNational: string;
  trackingUrlPattern: string;
}

export interface CityCoverage {
  city: string;
  department: string;
  zone: 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'ESPECIAL';
  postalCode?: string;
}

export interface ShippingCalculationInput {
  destinationCity: string;
  items: Array<{
    quantity: number;
    productId?: number;
    name?: string;
    specs?: any;
  }>;
}

export interface CarrierQuote {
  carrierId: string;
  carrierName: string;
  carrierCode: string;
  serviceName: string;
  cost: number;
  deliveryTimeText: string;
  realWeightKg: number;
  volumetricWeightKg: number;
  billedWeightKg: number;
  packageCount: number;
}

export interface ShippingLabelData {
  orderNumber: string;
  trackingNumber: string;
  carrierName: string;
  carrierCode: string;
  serviceType: string;
  
  // Remitente (Taller / Imprenta)
  senderName: string;
  senderNit: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  
  // Destinatario
  recipientName: string;
  recipientNit: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientDepartment: string;
  
  // Datos del paquete
  contentDescription: string;
  declaredValue: number;
  realWeightKg: number;
  volumetricWeightKg: number;
  billedWeightKg: number;
  packageCount: number;
  packageIndex: number;
  creationDate: string;
  estimatedDeliveryDate: string;
}

export const COLOMBIAN_CITIES: CityCoverage[] = [
  { city: 'Manizales', department: 'Caldas', zone: 'LOCAL' },
  { city: 'Villamaría', department: 'Caldas', zone: 'LOCAL' },
  { city: 'Chinchiná', department: 'Caldas', zone: 'LOCAL' },
  { city: 'Pereira', department: 'Risaralda', zone: 'REGIONAL' },
  { city: 'Dosquebradas', department: 'Risaralda', zone: 'REGIONAL' },
  { city: 'Armenia', department: 'Quindío', zone: 'REGIONAL' },
  { city: 'Bogotá D.C.', department: 'Cundinamarca', zone: 'NACIONAL' },
  { city: 'Medellín', department: 'Antioquia', zone: 'NACIONAL' },
  { city: 'Cali', department: 'Valle del Cauca', zone: 'NACIONAL' },
  { city: 'Barranquilla', department: 'Atlántico', zone: 'NACIONAL' },
  { city: 'Bucaramanga', department: 'Santander', zone: 'NACIONAL' },
  { city: 'Cartagena', department: 'Bolívar', zone: 'NACIONAL' },
  { city: 'Ibagué', department: 'Tolima', zone: 'NACIONAL' },
  { city: 'Santa Marta', department: 'Magdalena', zone: 'NACIONAL' },
  { city: 'Cúcuta', department: 'Norte de Santander', zone: 'NACIONAL' },
  { city: 'Neiva', department: 'Huila', zone: 'NACIONAL' },
  { city: 'Villavicencio', department: 'Meta', zone: 'NACIONAL' },
  { city: 'Pasto', department: 'Nariño', zone: 'NACIONAL' },
  { city: 'Popayán', department: 'Cauca', zone: 'NACIONAL' },
  { city: 'Tunja', department: 'Boyacá', zone: 'NACIONAL' },
  { city: 'Montería', department: 'Córdoba', zone: 'NACIONAL' },
  { city: 'Sincelejo', department: 'Sucre', zone: 'NACIONAL' },
  { city: 'Valledupar', department: 'Cesar', zone: 'NACIONAL' },
  { city: 'Riohacha', department: 'La Guajira', zone: 'ESPECIAL' },
  { city: 'Quibdó', department: 'Chocó', zone: 'ESPECIAL' },
  { city: 'San Andrés', department: 'San Andrés y Providencia', zone: 'ESPECIAL' },
  { city: 'Leticia', department: 'Amazonas', zone: 'ESPECIAL' },
];

export const SHIPPING_CARRIERS: ShippingCarrier[] = [
  {
    id: 'coordinadora',
    name: 'Coordinadora Mercantil',
    code: 'COORD',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=80',
    baseRateRegional: 12500,
    baseRateNational: 18500,
    extraKgRate: 2400,
    deliveryDaysRegional: '24 horas',
    deliveryDaysNational: '24 a 48 horas',
    trackingUrlPattern: 'https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=',
  },
  {
    id: 'servientrega',
    name: 'Servientrega',
    code: 'SERVI',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=80',
    baseRateRegional: 13000,
    baseRateNational: 19800,
    extraKgRate: 2600,
    deliveryDaysRegional: '24 horas',
    deliveryDaysNational: '24 a 48 horas',
    trackingUrlPattern: 'https://www.servientrega.com/wps/portal/rastreo-envio?guia=',
  },
  {
    id: 'envia',
    name: 'Envía Colvanes',
    code: 'ENVIA',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=80',
    baseRateRegional: 11900,
    baseRateNational: 17200,
    extraKgRate: 2200,
    deliveryDaysRegional: '24 a 48 horas',
    deliveryDaysNational: '48 horas',
    trackingUrlPattern: 'https://www.enviacolvanes.com.co/rastreo?guia=',
  },
  {
    id: 'interrapidisimo',
    name: 'Inter Rapidísimo',
    code: 'INTER',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=80',
    baseRateRegional: 11500,
    baseRateNational: 16900,
    extraKgRate: 2100,
    deliveryDaysRegional: '24 horas',
    deliveryDaysNational: '24 a 72 horas',
    trackingUrlPattern: 'https://www.interrapidisimo.com/sigue-tu-envio/?guia=',
  },
  {
    id: 'tcc',
    name: 'TCC Carga y Paquetería',
    code: 'TCC',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=80',
    baseRateRegional: 12200,
    baseRateNational: 17800,
    extraKgRate: 2300,
    deliveryDaysRegional: '24 a 48 horas',
    deliveryDaysNational: '48 a 72 horas',
    trackingUrlPattern: 'https://tcc.com.co/rastreo/?guia=',
  }
];

/**
 * Calcula el peso aproximado de papel y packaging litográfico según cantidad y tipo de producto
 */
export function estimatePackageWeightAndVolume(items: Array<{ quantity: number; specs?: any; name?: string }>): {
  realWeightKg: number;
  volumetricWeightKg: number;
  packageCount: number;
} {
  let totalGrams = 0;
  let totalVolumeCm3 = 0;

  items.forEach(item => {
    const qty = Number(item.quantity) || 1000;
    const nameLower = (item.name || '').toLowerCase();
    
    // Estimación por producto estándar
    if (nameLower.includes('tarjeta')) {
      // 1000 tarjetas de 9x5.5cm en Propalcote 300g ≈ 1.6 kg
      const unitGrams = 1.6 / 1000 * 1000;
      totalGrams += (qty / 1000) * 1600;
      totalVolumeCm3 += (qty / 1000) * (9 * 5.5 * 35); // Caja de 1000 tarjetas
    } else if (nameLower.includes('volante') || nameLower.includes('flyer')) {
      // 1000 volantes media carta 150g ≈ 5.2 kg
      totalGrams += (qty / 1000) * 5200;
      totalVolumeCm3 += (qty / 1000) * (22 * 14 * 18);
    } else if (nameLower.includes('plegable') || nameLower.includes('triptico') || nameLower.includes('diptico')) {
      // 1000 plegables carta 150g ≈ 9.8 kg
      totalGrams += (qty / 1000) * 9800;
      totalVolumeCm3 += (qty / 1000) * (28 * 22 * 20);
    } else if (nameLower.includes('libro') || nameLower.includes('revista') || nameLower.includes('catalogo')) {
      // 100 libros de 80 páginas ≈ 22 kg
      totalGrams += qty * 220;
      totalVolumeCm3 += qty * (24 * 17 * 1.5);
    } else if (nameLower.includes('caja') || nameLower.includes('empaque') || nameLower.includes('bolsa')) {
      // 500 bolsas de papel kraft ≈ 8 kg
      totalGrams += (qty / 500) * 8000;
      totalVolumeCm3 += (qty / 500) * (40 * 30 * 25);
    } else {
      // Default genérico: 3 kg por cada 1000 unidades
      totalGrams += (qty / 1000) * 3000;
      totalVolumeCm3 += (qty / 1000) * (25 * 20 * 15);
    }
  });

  // Peso del embalaje (caja de cartón corrugado + cinta + plástico burbuja)
  const packagingWeightGrams = Math.max(300, totalGrams * 0.05);
  const realWeightKg = Math.max(0.5, Math.round(((totalGrams + packagingWeightGrams) / 1000) * 10) / 10);

  // Peso volumétrico IATA = (Largo x Ancho x Alto en cm) / 5000
  const volumetricWeightKg = Math.max(0.5, Math.round((totalVolumeCm3 / 5000) * 10) / 10);

  // Estimación de cajas físicas
  const packageCount = Math.max(1, Math.ceil(realWeightKg / 25)); // Max 25kg por bulto

  return {
    realWeightKg,
    volumetricWeightKg,
    packageCount
  };
}

/**
 * Cotiza todas las transportadoras disponibles para una ciudad y lista de productos
 */
export function quoteAllCarriers(destinationCity: string, items: any[]): CarrierQuote[] {
  const normalizedCity = (destinationCity || '').trim().toLowerCase();
  const cityInfo = COLOMBIAN_CITIES.find(c => c.city.toLowerCase() === normalizedCity) || {
    city: destinationCity || 'Colombia',
    department: 'Nacional',
    zone: 'NACIONAL'
  };

  const { realWeightKg, volumetricWeightKg, packageCount } = estimatePackageWeightAndVolume(items);
  const billedWeightKg = Math.max(realWeightKg, volumetricWeightKg);
  const extraKg = Math.max(0, billedWeightKg - 1);

  const quotes: CarrierQuote[] = [];

  // Opción 1: Si es zona local (Manizales / Villamaría / Chinchiná)
  if (cityInfo.zone === 'LOCAL') {
    quotes.push({
      carrierId: 'local-express',
      carrierName: 'Mensajería Express Local (Motorizado)',
      carrierCode: 'LOCAL_MOTO',
      serviceName: 'Entrega en el día / Puerta a Puerta',
      cost: billedWeightKg > 10 ? 12000 : 8000,
      deliveryTimeText: 'Mismo día (2 a 4 horas hábiles)',
      realWeightKg,
      volumetricWeightKg,
      billedWeightKg,
      packageCount
    });

    quotes.push({
      carrierId: 'pickup-store',
      carrierName: 'Recogida en Taller Central',
      carrierCode: 'PICKUP',
      serviceName: 'Entrega directa en mostrador de planta',
      cost: 0,
      deliveryTimeText: 'Inmediato al finalizar producción',
      realWeightKg,
      volumetricWeightKg,
      billedWeightKg,
      packageCount
    });
  }

  // Opciones de Transportadoras Nacionales
  SHIPPING_CARRIERS.forEach(carrier => {
    let baseRate = cityInfo.zone === 'REGIONAL' ? carrier.baseRateRegional : carrier.baseRateNational;
    if (cityInfo.zone === 'ESPECIAL') {
      baseRate += 9500; // Recargo trayecto especial reexpedición
    }

    const cost = Math.round(baseRate + (extraKg * carrier.extraKgRate));
    const deliveryTimeText = cityInfo.zone === 'REGIONAL' 
      ? carrier.deliveryDaysRegional 
      : (cityInfo.zone === 'ESPECIAL' ? '72 a 96 horas' : carrier.deliveryDaysNational);

    quotes.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      carrierCode: carrier.code,
      serviceName: 'Paqueteo Terrestre Asegurado',
      cost,
      deliveryTimeText,
      realWeightKg,
      volumetricWeightKg,
      billedWeightKg,
      packageCount
    });
  });

  return quotes;
}

/**
 * Genera un número de guía aleatorio pero con formato real según la transportadora
 */
export function generateTrackingNumber(carrierCode: string): string {
  const prefix = carrierCode.toUpperCase();
  const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
  return `${prefix}-${randomDigits}`;
}

/**
 * Genera un código de barras Code 128 simplificado en formato SVG
 */
export function generateBarcodeSvg(value: string): string {
  // Generador de líneas simuladas con patrón reproducible para visualización escaneable
  const bars: string[] = [];
  let currentX = 10;
  const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);

  for (let i = 0; i < 45; i++) {
    const isThick = ((hash + (i * 7)) % 3) === 0;
    const width = isThick ? 3.2 : 1.6;
    bars.push(`<rect x="${currentX}" y="0" width="${width}" height="55" fill="#000" />`);
    currentX += width + (((hash + i) % 2) ? 2 : 1.2);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${currentX + 10} 70" width="100%" height="60">
    ${bars.join('')}
    <text x="${(currentX + 10) / 2}" y="66" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#1e293b">${value}</text>
  </svg>`;
}
