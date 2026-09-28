import Decimal from 'decimal.js';
import { TariffSnapshot } from './types';

export const DEFAULT_OFFICIAL_TARIFF: TariffSnapshot = {
  bleedCm: new Decimal(0.6),
  gripMarginCm: new Decimal(1.0),
  defaultWastageSheets: 200,
  defaultLithoMarginPercent: new Decimal(0.3),
  laminationMinCharge: new Decimal(65000),
  laminationPricePerM2: new Decimal(3500),
  peerDiscountPerMeter: new Decimal(10000),
  papers: [
    // Familia Propalcote
    { name: 'Propalcote 115g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(480) },
    { name: 'Propalcote 115g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(380) },
    { name: 'Propalcote 150g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(650) },
    { name: 'Propalcote 150g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(520) },
    { name: 'Propalcote 200g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(840) },
    { name: 'Propalcote 200g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(680) },
    { name: 'Propalcote 240g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(980) },
    { name: 'Propalcote 240g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(790) },
    { name: 'Propalcote 300g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(1200) },
    { name: 'Propalcote 300g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(980) },

    // Familia Bond
    { name: 'Bond 75g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(320) },
    { name: 'Bond 75g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(260) },
    { name: 'Bond 90g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(390) },
    { name: 'Bond 90g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(310) },
    { name: 'Bond 115g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(480) },
    { name: 'Bond 115g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(390) },

    // Familia Químico / Autocopia
    { name: 'Químico CB 55g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(380) },
    { name: 'Químico CB 55g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(300) },
    { name: 'Químico CFB 53g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(410) },
    { name: 'Químico CFB 53g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(330) },
    { name: 'Químico CF 55g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(370) },
    { name: 'Químico CF 55g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(290) },

    // Familia Cartulinas y Calibres (Algunos solo en 70x100)
    { name: 'Maule Calibre 12', sheetFormat: 'S70X100', pricePerSheet: new Decimal(1100) },
    { name: 'Maule Calibre 14', sheetFormat: 'S70X100', pricePerSheet: new Decimal(1320) },
    { name: 'Kraft Liner 150g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(540) },
    { name: 'Kraft Liner 150g', sheetFormat: 'S60X90', pricePerSheet: new Decimal(430) },
    { name: 'Kimberly 220g', sheetFormat: 'S70X100', pricePerSheet: new Decimal(2400) },
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
      formatName: 'Cuarto Digital',
      widthCm: new Decimal(25.0),
      heightCm: new Decimal(35.0),
      price1x0: new Decimal(1400),
      price4x0: new Decimal(2400),
      price4x4: new Decimal(3600),
      laminationUnitPrice: new Decimal(400),
      volumeTiers: [
        { minSheets: 1, maxSheets: 25, unitPrice: new Decimal(2400) },
        { minSheets: 26, maxSheets: 60, unitPrice: new Decimal(1800) },
        { minSheets: 61, maxSheets: 120, unitPrice: new Decimal(1400) },
        { minSheets: 121, maxSheets: null, unitPrice: new Decimal(1100) },
      ],
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
    {
      plateFormatName: 'Pliego (102 x 72 cm)',
      plateUnitPrice: new Decimal(58000),
      pressPricePerThousand: new Decimal(65000),
      printAreaWidthCm: new Decimal(100),
      printAreaHeightCm: new Decimal(70),
    },
  ],
  sheetCuts: [
    {
      code: '.1',
      divisor: 1,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(100), heightCm: new Decimal(70) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(90), heightCm: new Decimal(60) },
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
      code: '.1/3',
      divisor: 3,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(70), heightCm: new Decimal(33.3) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(60), heightCm: new Decimal(30) },
      ],
    },
    {
      code: '.1/4',
      divisor: 4,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(50), heightCm: new Decimal(35) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(45), heightCm: new Decimal(30) },
      ],
    },
    {
      code: '.1/6',
      divisor: 6,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(35), heightCm: new Decimal(33.3) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(30), heightCm: new Decimal(30) },
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
    {
      code: '.1/9',
      divisor: 9,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(33.3), heightCm: new Decimal(23.3) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(30), heightCm: new Decimal(20) },
      ],
    },
    {
      code: '.1/12',
      divisor: 12,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(25), heightCm: new Decimal(23.3) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(22.5), heightCm: new Decimal(20) },
      ],
    },
    {
      code: '.1/16',
      divisor: 16,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(25), heightCm: new Decimal(17.5) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(22.5), heightCm: new Decimal(15) },
      ],
    },
    {
      code: '.1/18',
      divisor: 18,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(23.3), heightCm: new Decimal(16.6) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(20), heightCm: new Decimal(15) },
      ],
    },
    {
      code: '.1/20',
      divisor: 20,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(25), heightCm: new Decimal(14) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(22.5), heightCm: new Decimal(12) },
      ],
    },
    {
      code: '.1/24',
      divisor: 24,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(17.5), heightCm: new Decimal(16.6) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(15), heightCm: new Decimal(15) },
      ],
    },
    {
      code: '.1/28',
      divisor: 28,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(17.5), heightCm: new Decimal(14.2) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(15), heightCm: new Decimal(12.8) },
      ],
    },
    {
      code: '.1/32',
      divisor: 32,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(17.5), heightCm: new Decimal(12.5) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(15), heightCm: new Decimal(11.2) },
      ],
    },
    {
      code: '.1/36',
      divisor: 36,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(16.6), heightCm: new Decimal(11.6) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(15), heightCm: new Decimal(10) },
      ],
    },
    {
      code: '.1/48',
      divisor: 48,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(12.5), heightCm: new Decimal(11.6) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(11.2), heightCm: new Decimal(10) },
      ],
    },
    {
      code: '.1/64',
      divisor: 64,
      sizes: [
        { sheetFormat: 'S70X100', widthCm: new Decimal(12.5), heightCm: new Decimal(8.75) },
        { sheetFormat: 'S60X90', widthCm: new Decimal(11.2), heightCm: new Decimal(7.5) },
      ],
    },
  ],
  inkSets: [
    { code: '4X4', plates: 8 },
    { code: '4X0', plates: 4 },
    { code: '1X0', plates: 1 },
    { code: '1X1', plates: 2 },
    { code: '2X0', plates: 2 },
    { code: '2X2', plates: 4 },
  ],
  finishings: [
    { service: 'CORTE', mode: 'PER_RUN', price: new Decimal(2000), label: 'Corte guillotina' },
    { service: 'DESPUNTE', mode: 'PER_RUN', price: new Decimal(1500), label: 'Despunte esquinas' },
    { service: 'PERFORADO', mode: 'PER_RUN', price: new Decimal(1500), label: 'Perforado huecos' },
    { service: 'ARGOLLADO', mode: 'PER_LOOP', price: new Decimal(50), label: 'Argollado Doble O' },
    {
      service: 'PLASTIFICADO',
      mode: 'BOTH_FACES',
      price: new Decimal(350),
      minimumCharge: new Decimal(65000),
      pricePerM2: new Decimal(3500),
      label: 'Plastificado térmico',
    },
    {
      service: 'MEDIO_CORTE',
      mode: 'PER_LINEAR_CM',
      price: new Decimal(15),
      label: 'Medio corte plotter/adhesivo',
    },
    {
      service: 'TROQUELADO',
      mode: 'MINIMUM',
      price: new Decimal(45000),
      label: 'Troquelado estándar',
    },
  ],
};
