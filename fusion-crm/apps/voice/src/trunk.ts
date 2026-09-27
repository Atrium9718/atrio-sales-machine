/**
 * Marcación por la troncal del operador. El endpoint se llama como en
 * infra/asterisk/etc/pjsip.conf ([trunk-endpoint]) y el número va en el formato que
 * pida el operador: NATIONAL (3001234567, 6068801234; lo usual en Colombia),
 * INTERNATIONAL (573001234567) o E164 (+573001234567).
 */
export const TRUNK_ENDPOINT = process.env.TRUNK_ENDPOINT || 'trunk-endpoint';

export type TrunkDialFormat = 'NATIONAL' | 'INTERNATIONAL' | 'E164';

export function trunkDialNumber(e164: string, format: string = process.env.TRUNK_DIAL_FORMAT || 'NATIONAL'): string {
  const digits = String(e164 || '').replace(/[^\d]/g, '');
  const national = digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : digits;
  const prefix = process.env.TRUNK_DIAL_PREFIX || '';
  switch ((format || 'NATIONAL').toUpperCase()) {
    case 'E164':
      return `${prefix}+57${national}`;
    case 'INTERNATIONAL':
      return `${prefix}57${national}`;
    default:
      return `${prefix}${national}`;
  }
}

/** Cadena de marcación de ARI para un número externo por la troncal. */
export const trunkDialString = (e164: string) => `PJSIP/${trunkDialNumber(e164)}@${TRUNK_ENDPOINT}`;
