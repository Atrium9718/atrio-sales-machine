/**
 * Normalización de números telefónicos a formato canónico E.164 para Colombia (+57).
 * Cumple con la regulación de marcación única de la CRC (Resolución 5826 de 2020)
 * y la convención de numeración local de Manizales / Caldas (Eje Cafetero - 606).
 */

export interface PhoneNormalizationResult {
  readonly isValid: boolean;
  readonly e164: string | null;
  readonly raw: string;
  readonly type: 'MOBILE' | 'LANDLINE' | 'SPECIAL' | 'UNKNOWN';
  readonly isAnonymous: boolean;
  readonly department?: string;
  readonly region?: string;
}

const ANONYMOUS_PATTERNS = new Set([
  'anonymous',
  'private',
  'unknown',
  'restricted',
  'unavailable',
  'oculto',
  'privado',
  'bloqueado',
  '0',
  '0000',
]);

/**
 * Normaliza un número telefónico al formato canónico E.164 (+57...).
 * Devuelve el string E.164 canónico si es válido, o null si es anónimo/inválido.
 */
export function normalizeColombianPhone(rawInput: string | null | undefined): string | null {
  const result = parseColombianPhone(rawInput);
  return result.e164;
}

/**
 * Analiza en detalle el número y devuelve metadata completa de la línea.
 */
export function parseColombianPhone(rawInput: string | null | undefined): PhoneNormalizationResult {
  const raw = (rawInput ?? '').trim();

  if (!raw) {
    return {
      isValid: false,
      e164: null,
      raw,
      type: 'UNKNOWN',
      isAnonymous: true,
    };
  }

  const lower = raw.toLowerCase();
  if (ANONYMOUS_PATTERNS.has(lower) || /^0+$/.test(lower)) {
    return {
      isValid: false,
      e164: null,
      raw,
      type: 'UNKNOWN',
      isAnonymous: true,
    };
  }

  // Eliminar caracteres de formato (espacios, guiones, puntos, paréntesis)
  let digits = raw.replace(/[^\d+]/g, '');

  // Si comienza con +, verificar si ya tiene el prefijo de país
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  // Remover prefijo internacional 00 o 011
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Si tiene prefijo '03' (antiguo prefijo de larga distancia para celular en Colombia: 03 + 10 dígitos = 12 dígitos)
  if (digits.startsWith('03') && digits.length === 12 && digits.charAt(2) === '3') {
    digits = digits.slice(2); // deja 3XXXXXXXXX
  } else if (digits.startsWith('0') && digits.length === 11 && digits.charAt(1) === '3') {
    // Caso de celular con 0 al inicio (ej: 03001234567 -> 3001234567)
    digits = digits.slice(1);
  } else if (digits.startsWith('03') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Remover prefijo 57 si ya viene incluido
  if (digits.startsWith('57') && (digits.length === 12 || digits.length === 11 || digits.length === 9)) {
    digits = digits.slice(2);
  }

  // 1. CELULAR COLOMBIANO: 10 dígitos iniciando con 3 (300, 310, 320, 350, etc.)
  if (digits.length === 10 && digits.startsWith('3')) {
    return {
      isValid: true,
      e164: `+57${digits}`,
      raw,
      type: 'MOBILE',
      isAnonymous: false,
      region: 'Nacional (Celular)',
      department: 'Nacional (Celular)',
    };
  }

  // 2. FIJO COLOMBIANO NACIONAL CON CÓDIGO CRC: 10 dígitos iniciando con 60
  if (digits.length === 10 && digits.startsWith('60')) {
    const regionCode = digits.substring(0, 3);
    const department = getRegionName(regionCode);
    return {
      isValid: true,
      e164: `+57${digits}`,
      raw,
      type: 'LANDLINE',
      isAnonymous: false,
      department,
      region: department,
    };
  }

  // 3. FIJO LOCAL DE MANIZALES / CALDAS SIN INDICATIVO (7 dígitos ej: 8801234, 8751234)
  // En Manizales y Caldas los fijos locales tienen 7 dígitos (típicamente inician con 8).
  // La regla maestra de la Sub-Etapa 17.3 especifica:
  // "Los fijos de Manizales sin indicativo se completan con +6068"
  // Indicativo Eje Cafetero = 606 + número local (ej: 8801234 -> +576068801234)
  if (digits.length === 7) {
    const dep = 'Caldas / Manizales / Eje Cafetero';
    return {
      isValid: true,
      e164: `+57606${digits}`,
      raw,
      type: 'LANDLINE',
      isAnonymous: false,
      department: dep,
      region: dep,
    };
  }

  // 4. Si son 8 dígitos y empiezan con 68 (antiguo indicativo local 6 + 8):
  if (digits.length === 8 && digits.startsWith('68')) {
    return {
      isValid: true,
      e164: `+5760${digits}`,
      raw,
      type: 'LANDLINE',
      isAnonymous: false,
      department: 'Caldas / Eje Cafetero',
    };
  }

  // 5. NÚMEROS INTERNACIONALES VÁLIDOS (E.164 fuera de Colombia)
  // Si vino con formato internacional explícito y tiene entre 10 y 15 dígitos
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return {
      isValid: true,
      e164: `+${digits}`,
      raw,
      type: 'SPECIAL',
      isAnonymous: false,
    };
  }

  // Número inválido / basura
  return {
    isValid: false,
    e164: null,
    raw,
    type: 'UNKNOWN',
    isAnonymous: false,
  };
}

function getRegionName(code: string): string {
  switch (code) {
    case '601':
      return 'Bogotá / Cundinamarca';
    case '602':
      return 'Cali / Valle / Cauca / Nariño';
    case '604':
      return 'Medellín / Antioquia / Chocó / Córdoba';
    case '605':
      return 'Barranquilla / Costa Atlántica';
    case '606':
      return 'Eje Cafetero (Caldas / Risaralda / Quindío)';
    case '607':
      return 'Santanderes / Arauca';
    case '608':
      return 'Tolima / Huila / Llanos / Amazonía';
    default:
      return 'Colombia';
  }
}
