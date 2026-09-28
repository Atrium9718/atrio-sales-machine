import { describe, it, expect, vi, beforeEach } from 'vitest';

const stores = vi.hoisted(() => new Map<string, any>());
vi.mock('../repositories/documentStore', async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    documentRepository: (c: string) => {
      if (!stores.has(c)) stores.set(c, actual.createMemoryRepository());
      return stores.get(c);
    },
  };
});

import {
  DEFAULT_VERSION, activateTariffVersion, getActiveTariff, getTariffVersion, listTariffVersions, loadTariffStore,
  publishTariffVersion, validateTariff, __resetTariffStore,
} from './tariffStore';
import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press';
import { DEFAULT_ASSIST_FORM_STATE } from '../../apps/web/src/features/quote-assist/types';

const withPaperPrice = (price: number) => {
  const s = structuredClone(DEFAULT_VERSION.snapshot) as any;
  s.papers[0].pricePerSheet = price;
  return s;
};

describe('versiones del tarifario', () => {
  beforeEach(() => {
    stores.clear();
    __resetTariffStore();
  });

  it('sin versiones guardadas rige el oficial, con números simples', () => {
    expect(getActiveTariff().id).toBe('tar-2026-01');
    expect(typeof (getActiveTariff().snapshot.papers[0] as any).pricePerSheet).toBe('number');
    expect(validateTariff(DEFAULT_VERSION.snapshot)).toEqual([]);
  });

  it('publicar deja la nueva vigente, conserva las anteriores y sobrevive a un reinicio', async () => {
    const v1 = await publishTariffVersion(withPaperPrice(999), { by: 'Ana', note: 'Alza de papel', now: new Date('2026-10-01T15:00:00Z') });
    expect(getActiveTariff().id).toBe(v1.id);
    expect((getActiveTariff().snapshot.papers[0] as any).pricePerSheet).toBe(999);

    __resetTariffStore();
    await loadTariffStore();
    expect(getActiveTariff()).toMatchObject({ id: v1.id, createdBy: 'Ana', note: 'Alza de papel' });
    expect(listTariffVersions().map((v) => [v.id, v.isActive])).toEqual([
      [v1.id, true],
      ['tar-2026-01', false],
    ]);
    // Una cotización vieja se recalcula con su versión
    expect((getTariffVersion('tar-2026-01').snapshot.papers[0] as any).pricePerSheet).not.toBe(999);
  });

  it('se puede volver a una versión anterior', async () => {
    const v1 = await publishTariffVersion(withPaperPrice(700), { now: new Date('2026-10-01T15:00:00Z') });
    await publishTariffVersion(withPaperPrice(800), { now: new Date('2026-10-02T15:00:00Z') });
    await activateTariffVersion(v1.id);
    expect(getActiveTariff().id).toBe(v1.id);
    expect(listTariffVersions().filter((v) => v.isActive)).toHaveLength(1);
    await activateTariffVersion('tar-2026-01');
    expect(getActiveTariff().id).toBe('tar-2026-01');
    await expect(activateTariffVersion('no-existe')).rejects.toThrow('Versión no encontrada');
  });

  it('rechaza valores inválidos', async () => {
    const bad = withPaperPrice(-5);
    bad.papers[1].name = ' ';
    await expect(publishTariffVersion(bad)).rejects.toThrow(/Papel 1 \(precio\).*Papel 2: falta el nombre/);
    expect(validateTariff({})).toContain('Falta la lista papers');
  });

  it('el motor calcula igual con la versión guardada (números) que con la oficial (Decimal)', () => {
    const form = { ...DEFAULT_ASSIST_FORM_STATE, technique: 'LITHO' as const, jobName: 'Volantes' };
    const plain = calculatePressQuote(buildPressQuoteInput(form, getActiveTariff().snapshot)!).litho![0];
    const official = calculatePressQuote(buildPressQuoteInput(form, DEFAULT_OFFICIAL_TARIFF)!).litho![0];
    expect(Number(plain.total)).toBeGreaterThan(0);
    expect(Number(plain.total)).toBe(Number(official.total));
  });
});
