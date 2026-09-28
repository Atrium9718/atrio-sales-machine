import Decimal from 'decimal.js';
import { PressQuoteInput, TariffSnapshot } from '../types';

export const MOCK_TARIFF_SNAPSHOT: TariffSnapshot = {
  bleedCm: new Decimal(0.6),
  gripMarginCm: new Decimal(1.0),
  defaultWastageSheets: 200,
  defaultLithoMarginPercent: new Decimal(0.3),
  laminationMinCharge: new Decimal(65000),
  laminationPricePerM2: new Decimal(3500),
  peerDiscountPerMeter: new Decimal(10000),
  papers: [
    {
      name: 'Propalcote 150g',
      sheetFormat: 'S70X100',
      pricePerSheet: new Decimal(650),
    },
    {
      name: 'Propalcote 150g',
      sheetFormat: 'S60X90',
      pricePerSheet: new Decimal(520),
    },
    {
      name: 'Bond 75g',
      sheetFormat: 'S70X100',
      pricePerSheet: new Decimal(320),
    },
    {
      name: 'Maule Calibre 12',
      sheetFormat: 'S70X100',
      pricePerSheet: new Decimal(1100),
    },
  ],
  digitalFormats: [
    {
      formatName: 'Carta',
      widthCm: new Decimal(23.0),
      heightCm: new Decimal(33.0),
      price1x0: new Decimal(1200),
      price4x0: new Decimal(2000),
      price4x4: new Decimal(3000),
      laminationUnitPrice: new Decimal(350),
      volumeTiers: [
        { minSheets: 1, maxSheets: 20, unitPrice: new Decimal(2000) },
        { minSheets: 21, maxSheets: 50, unitPrice: new Decimal(1500) },
        { minSheets: 51, maxSheets: 100, unitPrice: new Decimal(1200) },
        { minSheets: 101, maxSheets: 150, unitPrice: new Decimal(1000) },
        { minSheets: 151, maxSheets: null, unitPrice: new Decimal(800) },
      ],
    },
    {
      formatName: 'Tabloide',
      widthCm: new Decimal(33.0),
      heightCm: new Decimal(48.0),
      price1x0: new Decimal(1800),
      price4x0: new Decimal(3200),
      price4x4: new Decimal(4800),
      laminationUnitPrice: new Decimal(500),
      volumeTiers: [
        { minSheets: 1, maxSheets: 20, unitPrice: new Decimal(3200) },
        { minSheets: 21, maxSheets: 50, unitPrice: new Decimal(2600) },
        { minSheets: 51, maxSheets: 100, unitPrice: new Decimal(2100) },
        { minSheets: 101, maxSheets: null, unitPrice: new Decimal(1700) },
      ],
    },
    {
      formatName: 'Sin Escala',
      widthCm: new Decimal(23.0),
      heightCm: new Decimal(33.0),
      price4x0: new Decimal(2200),
      volumeTiers: [],
    },
  ],
  lithoFormats: [
    {
      plateFormatName: '1/4 (52 x 40 cm)',
      plateUnitPrice: new Decimal(18000),
      pressPricePerThousand: new Decimal(22000),
      printAreaWidthCm: new Decimal(50),
      printAreaHeightCm: new Decimal(38),
    },
    {
      plateFormatName: '1/2 (74 x 54 cm)',
      plateUnitPrice: new Decimal(32000),
      pressPricePerThousand: new Decimal(38000),
      printAreaWidthCm: new Decimal(72),
      printAreaHeightCm: new Decimal(52),
    },
  ],
  sheetCuts: [
    {
      code: '.1/4',
      divisor: 4,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(50), heightCm: new Decimal(35) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(45), heightCm: new Decimal(30) },
      ],
    },
    {
      code: '.1/2',
      divisor: 2,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(70), heightCm: new Decimal(50) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(60), heightCm: new Decimal(45) },
      ],
    },
    {
      code: '.1/8',
      divisor: 8,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(35), heightCm: new Decimal(25) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(30), heightCm: new Decimal(22.5) },
      ],
    },
  ],
  inkSets: [
    { code: '4X4', plates: 8 },
    { code: '4X0', plates: 4 },
    { code: '1X0', plates: 1 },
    { code: '1X1', plates: 2 },
    { code: '2X0', plates: 2 },
  ],
  finishings: [
    { service: 'CORTE', mode: 'PER_RUN', price: new Decimal(2000) },
    { service: 'DESPUNTE', mode: 'PER_RUN', price: new Decimal(1500) },
    { service: 'PERFORADO', mode: 'PER_RUN', price: new Decimal(1500) },
    { service: 'ARGOLLADO', mode: 'PER_LOOP', price: new Decimal(50) },
    { service: 'PLASTIFICADO', mode: 'BOTH_FACES', price: new Decimal(350), minimumCharge: new Decimal(65000), pricePerM2: new Decimal(3500) },
    { service: 'MEDIO_CORTE', mode: 'PER_LINEAR_CM', price: new Decimal(15) },
  ],
};

export function createBaseQuoteInput(overrides: Partial<PressQuoteInput> = {}): PressQuoteInput {
  return {
    technique: 'DIGITAL',
    jobName: 'Volante Promocional',
    artWidthCm: new Decimal(14),
    artHeightCm: new Decimal(21),
    applyBleed: false,
    pagesPerUnit: null,
    quantities: [new Decimal(100), new Decimal(500), new Decimal(1000)],
    digital: {
      formatName: 'Carta',
      inkMode: 'ONE_SIDE_COLOR',
      onDemand: false,
    },
    commercial: {
      vatLabel: 'IVA 19%',
      otherTaxPercent: new Decimal(0),
      clientDiscountLabel: 'Ninguno',
      otherDiscountPercent: new Decimal(0),
      salesCommissionPercent: new Decimal(0),
    },
    tariff: MOCK_TARIFF_SNAPSHOT,
    ...overrides,
  };
}
