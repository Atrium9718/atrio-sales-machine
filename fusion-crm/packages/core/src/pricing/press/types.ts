import Decimal from 'decimal.js';

export type PressTechnique = 'DIGITAL' | 'LITHO' | 'BOTH';

export type DigitalInkMode =
  | 'ONE_SIDE_BLACK'
  | 'BOTH_SIDES_BLACK'
  | 'ONE_SIDE_COLOR'
  | 'BOTH_SIDES_COLOR';

export type LaminationMode = 'NONE' | 'BOTH_FACES' | 'ONE_FACE_OF_TWO_PRINTED';

export interface PressDigitalInput {
  formatName: string;
  inkMode: DigitalInkMode;
  onDemand: boolean;
}

export interface PressLithoInput {
  plateFormatName: string;
  inkSetCode: string;
  plateBacking: boolean;
  manualPlateCount?: number | null;
  paperName: string;
  sheetFormat: 'S70X100' | 'S60X90';
  sheetCutCode: string;
  marginPercent?: Decimal | number;
  wastageSheets?: number;
}

export interface PressFinishingInput {
  cut?: { label?: string; runs: number };
  trim?: { label?: string; runs: number };
  perforation?: { label?: string; count: number };
  binding?: { label?: string; loops: number };
  lamination?: { mode: LaminationMode };
  halfCut?: { label?: string; linearCm?: Decimal | number; mode?: 'PER_LINEAR_CM' | 'PER_CM2' };
  dieCut?: { label?: string; price: Decimal | number };
  others?: { label?: string; prices: (Decimal | number)[] }[];
}

export interface PressCommercialInput {
  vatLabel: string;
  otherTaxPercent?: Decimal | number;
  clientDiscountLabel?: string;
  otherDiscountPercent?: Decimal | number;
  salesCommissionPercent?: Decimal | number;
}

export interface DigitalVolumeTierSnapshot {
  minSheets: number;
  maxSheets: number | null;
  unitPrice: Decimal | number;
}

export interface DigitalFormatTariffSnapshot {
  formatName: string;
  widthCm: Decimal | number;
  heightCm: Decimal | number;
  price1x0?: Decimal | number;
  price4x0: Decimal | number;
  price4x4?: Decimal | number;
  laminationUnitPrice?: Decimal | number;
  volumeTiers?: DigitalVolumeTierSnapshot[];
}

export interface LithoFormatTariffSnapshot {
  plateFormatName: string;
  plateUnitPrice: Decimal | number;
  pressPricePerThousand: Decimal | number;
  printAreaWidthCm?: Decimal | number;
  printAreaHeightCm?: Decimal | number;
}

export interface SheetCutSizeSnapshot {
  sheetFormat: 'S70X100' | 'S60X90';
  widthCm: Decimal | number;
  heightCm: Decimal | number;
}

export interface SheetCutSnapshot {
  code: string;
  divisor: number;
  sizes: SheetCutSizeSnapshot[];
}

export interface PaperTariffItemSnapshot {
  name: string;
  sheetFormat: 'S70X100' | 'S60X90';
  pricePerSheet: Decimal | number;
}

export interface InkSetTariffSnapshot {
  code: string;
  plates: number;
}

export interface FinishingTariffSnapshot {
  service: string;
  mode?:
    | 'NONE'
    | 'PER_RUN'
    | 'MINIMUM'
    | 'PER_THOUSAND'
    | 'PER_LOOP'
    | 'PER_LINEAR_CM'
    | 'PER_CM2'
    | 'BOTH_FACES'
    | 'ONE_FACE_OF_TWO_PRINTED'
    | string;
  label?: string;
  price?: Decimal | number;
  minimumCharge?: Decimal | number;
  pricePerM2?: Decimal | number;
}

export interface TariffSnapshot {
  bleedCm: Decimal | number;
  gripMarginCm: Decimal | number;
  defaultWastageSheets?: number;
  defaultLithoMarginPercent?: Decimal | number;
  papers: PaperTariffItemSnapshot[];
  digitalFormats: DigitalFormatTariffSnapshot[];
  lithoFormats: LithoFormatTariffSnapshot[];
  sheetCuts: SheetCutSnapshot[];
  inkSets: InkSetTariffSnapshot[];
  finishings: FinishingTariffSnapshot[];
  laminationMinCharge?: Decimal | number;
  laminationPricePerM2?: Decimal | number;
  peerDiscountPerMeter?: Decimal | number;
}

export interface PressQuoteInput {
  technique: PressTechnique;
  jobName: string;
  artWidthCm: Decimal | number;
  artHeightCm: Decimal | number;
  applyBleed: boolean;
  pagesPerUnit: number | null;
  quantities: (Decimal | number | null)[];
  digital?: PressDigitalInput;
  litho?: PressLithoInput;
  finishing?: PressFinishingInput;
  commercial: PressCommercialInput;
  tariff: TariffSnapshot;
}

export interface CostLine {
  key: string;
  label: string;
  amount: Decimal;
}

export interface QuantityResult {
  quantity: Decimal;
  impositionPerSheet: number;
  sheetsPrinted: number;
  plateCount: number | null;
  paperSheets: number | null;
  lines: CostLine[];
  subtotalBeforeMargin: Decimal;
  margin: Decimal;
  discounts: Decimal;
  commission: Decimal;
  taxableBase: Decimal;
  vat: Decimal;
  otherTaxes: Decimal;
  total: Decimal;
  unitPrice: Decimal;
  unitPriceBeforeTax: Decimal;
  internalCost: Decimal;
  marginPercent: Decimal;
  productionSpec: string;
}

export interface PressQuoteWarning {
  code: string;
  message: string;
  quantityIndex?: number;
}

export interface PressQuoteResult {
  engineVersion: string;
  digital?: QuantityResult[];
  litho?: QuantityResult[];
  recommended: 'DIGITAL' | 'LITHO' | null;
  warnings: PressQuoteWarning[];
}
