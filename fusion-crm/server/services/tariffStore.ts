import Decimal from 'decimal.js';
import { documentRepository } from '../repositories/documentStore';
import { DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press/defaultTariff';
import type { TariffSnapshot } from '../../packages/core/src/pricing/press/types';

/**
 * Versiones del tarifario (papeles, formatos, planchas, acabados…).
 *
 * Cada cambio crea una versión nueva y la deja vigente; las anteriores se conservan para
 * poder recalcular cotizaciones viejas con los precios con que se hicieron y para volver
 * atrás. Si no hay ninguna guardada, rige el tarifario oficial incluido en el código.
 */

export interface TariffVersion {
  id: string;
  code: string;
  name: string;
  validFrom: string;
  isActive: boolean;
  note?: string;
  createdBy?: string;
  snapshot: TariffSnapshot;
}

const COLLECTION = 'tariff_versions';
const repo = () => documentRepository<TariffVersion & { id: string }>(COLLECTION);

/** Decimal → número (así se guarda y viaja en JSON). */
export function toPlainTariff(snapshot: unknown): TariffSnapshot {
  const plain = (v: any): any =>
    Decimal.isDecimal(v) ? v.toNumber() : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v;
  return JSON.parse(JSON.stringify(plain(snapshot)));
}

export const DEFAULT_VERSION: TariffVersion = {
  id: 'tar-2026-01',
  code: 'TAR-2026-01',
  name: 'Tarifario Oficial 2026',
  validFrom: '2026-01-01T00:00:00.000Z',
  isActive: true,
  snapshot: toPlainTariff(DEFAULT_OFFICIAL_TARIFF),
};

let versions: TariffVersion[] = [];

export async function loadTariffStore(): Promise<void> {
  try {
    versions = (await repo().list()) as TariffVersion[];
  } catch (err) {
    console.error('[tarifario] No se pudieron cargar las versiones; se usa el oficial:', err);
    versions = [];
  }
}

export function getActiveTariff(): TariffVersion {
  return versions.find((v) => v.isActive) ?? DEFAULT_VERSION;
}

export function getTariffVersion(id?: string | null): TariffVersion {
  if (!id) return getActiveTariff();
  if (id === DEFAULT_VERSION.id) return versions.find((v) => v.id === id) ?? DEFAULT_VERSION;
  return versions.find((v) => v.id === id) ?? getActiveTariff();
}

export function listTariffVersions() {
  const all = versions.some((v) => v.id === DEFAULT_VERSION.id) ? versions : [...versions, { ...DEFAULT_VERSION, isActive: !versions.some((v) => v.isActive) }];
  return all.map(({ snapshot: _s, ...meta }) => meta).sort((a, b) => b.validFrom.localeCompare(a.validFrom));
}

/** Errores de forma y valores (vacío = válido). */
export function validateTariff(s: any): string[] {
  const errors: string[] = [];
  const nonNeg = (v: unknown, where: string) => {
    if (v === undefined || v === null || v === '') return;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) errors.push(`${where}: valor inválido`);
  };
  if (!s || typeof s !== 'object') return ['Tarifario vacío'];
  for (const k of ['papers', 'digitalFormats', 'lithoFormats', 'sheetCuts', 'inkSets', 'finishings']) {
    if (!Array.isArray(s[k])) errors.push(`Falta la lista ${k}`);
  }
  if (errors.length) return errors;
  if (!s.papers.length) errors.push('Debe haber al menos un papel');
  ['bleedCm', 'gripMarginCm', 'defaultWastageSheets', 'defaultLithoMarginPercent', 'laminationMinCharge', 'laminationPricePerM2', 'peerDiscountPerMeter'].forEach((k) => nonNeg(s[k], k));
  s.papers.forEach((p: any, i: number) => {
    if (!String(p?.name ?? '').trim()) errors.push(`Papel ${i + 1}: falta el nombre`);
    if (!['S70X100', 'S60X90'].includes(p?.sheetFormat)) errors.push(`Papel ${i + 1}: formato de pliego inválido`);
    nonNeg(p?.pricePerSheet, `Papel ${i + 1} (precio)`);
  });
  s.digitalFormats.forEach((f: any, i: number) => {
    if (!String(f?.formatName ?? '').trim()) errors.push(`Formato digital ${i + 1}: falta el nombre`);
    ['widthCm', 'heightCm', 'price1x0', 'price4x0', 'price4x4', 'laminationUnitPrice'].forEach((k) => nonNeg(f?.[k], `Formato digital ${i + 1} (${k})`));
    (f?.volumeTiers ?? []).forEach((t: any, j: number) => nonNeg(t?.unitPrice, `Formato digital ${i + 1}, escala ${j + 1}`));
  });
  s.lithoFormats.forEach((f: any, i: number) => {
    if (!String(f?.plateFormatName ?? '').trim()) errors.push(`Plancha ${i + 1}: falta el nombre`);
    ['plateUnitPrice', 'pressPricePerThousand'].forEach((k) => nonNeg(f?.[k], `Plancha ${i + 1} (${k})`));
  });
  s.finishings.forEach((f: any, i: number) => {
    if (!String(f?.service ?? '').trim()) errors.push(`Acabado ${i + 1}: falta el servicio`);
    ['price', 'minimumCharge', 'pricePerM2'].forEach((k) => nonNeg(f?.[k], `Acabado ${i + 1} (${k})`));
  });
  return errors;
}

/** Guarda una versión nueva y la deja vigente. */
export async function publishTariffVersion(snapshot: unknown, opts: { by?: string; note?: string; now?: Date } = {}): Promise<TariffVersion> {
  const plain = toPlainTariff(snapshot);
  const errors = validateTariff(plain);
  if (errors.length) throw Object.assign(new Error(errors.slice(0, 5).join('; ')), { status: 400 });
  const now = opts.now ?? new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const version: TariffVersion = {
    id: `tar-${stamp}`,
    code: `TAR-${stamp.slice(0, 8)}-${stamp.slice(8)}`,
    name: `Tarifario ${now.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })}`,
    validFrom: now.toISOString(),
    isActive: true,
    note: opts.note?.slice(0, 500),
    createdBy: opts.by,
    snapshot: plain,
  };
  await activate(version);
  return version;
}

/** Vuelve a dejar vigente una versión anterior. */
export async function activateTariffVersion(id: string): Promise<TariffVersion> {
  const target = versions.find((v) => v.id === id) ?? (id === DEFAULT_VERSION.id ? DEFAULT_VERSION : null);
  if (!target) throw Object.assign(new Error('Versión no encontrada'), { status: 404 });
  await activate({ ...target, isActive: true });
  return getActiveTariff();
}

async function activate(version: TariffVersion) {
  const others = versions.filter((v) => v.id !== version.id && v.isActive).map((v) => ({ ...v, isActive: false }));
  await repo().upsertMany([...others, version] as any);
  versions = [...versions.filter((v) => v.id !== version.id).map((v) => (v.isActive ? { ...v, isActive: false } : v)), version];
}

/** Solo para pruebas. */
export function __resetTariffStore() {
  versions = [];
}
