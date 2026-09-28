import { z } from 'zod';
import { PressTechnique, DigitalInkMode, LaminationMode } from '../../../../../packages/core/src/pricing/press/types';

export type AssistStep = 'trabajo' | 'tecnica' | 'papel' | 'acabados' | 'comercial';
export type AssistPanelMode = 'GUIDED' | 'MANUAL' | 'WIDE_FORMAT';

export interface StepDefinition {
  key: AssistStep;
  number: number;
  label: string;
  description: string;
}

export const ASSIST_STEPS: StepDefinition[] = [
  { key: 'trabajo', number: 1, label: 'Trabajo y Cantidades', description: 'Dimensiones, sangrado y tiradas a cotizar' },
  { key: 'tecnica', number: 2, label: 'Técnica', description: 'Digital, Litográfica o Comparativa' },
  { key: 'papel', number: 3, label: 'Papel y Montaje', description: 'Sustrato, formato de pliego y corte óptimo' },
  { key: 'acabados', number: 4, label: 'Acabados', description: 'Post-prensa, plastificado, troquel y encuadernación' },
  { key: 'comercial', number: 5, label: 'Comercial', description: 'Impuestos, descuentos, comisión y condiciones' },
];

export interface AssistFormState {
  // Encabezado
  technique: PressTechnique;
  
  // Paso 1: Trabajo y Cantidades
  jobName: string;
  artWidthCm: number;
  artHeightCm: number;
  applyBleed: boolean;
  pagesPerUnit: number | null;
  qty1: number;
  qty2: number | null;
  qty3: number | null;

  // Paso 2: Técnica
  // Digital
  digitalFormatName: string;
  digitalInkMode: DigitalInkMode;
  digitalOnDemand: boolean;
  // Litografía
  lithoPlateFormatName: string;
  lithoInkSetCode: string;
  lithoPlateBacking: boolean;
  lithoManualPlateCount: number | null;
  lithoMarginPercent: number;
  lithoWastageSheets: number;

  // Paso 3: Papel y Montaje (Litografía)
  paperName: string;
  sheetFormat: 'S70X100' | 'S60X90';
  sheetCutCode: string;

  // Paso 4: Acabados
  cutRuns: number;
  trimRuns: number;
  perforationCount: number;
  bindingLoops: number;
  laminationMode: LaminationMode;
  halfCutLinearCm: number;
  dieCutPrice: number;
  other1Label: string;
  other1Prices: [number, number, number];
  other2Label: string;
  other2Prices: [number, number, number];
  other3Label: string;
  other3Prices: [number, number, number];

  // Paso 5: Comercial
  vatLabel: string;
  otherTaxPercent: number;
  clientDiscountLabel: string;
  otherDiscountPercent: number;
  salesCommissionPercent: number;
  deliveryTime: string;
  paymentTerms: string;
  validity: string;
}

export const DEFAULT_ASSIST_FORM_STATE: AssistFormState = {
  technique: 'LITHO',
  jobName: '',
  artWidthCm: 14,
  artHeightCm: 21,
  applyBleed: true,
  pagesPerUnit: null,
  qty1: 1000,
  qty2: 2500,
  qty3: 5000,

  digitalFormatName: 'Carta',
  digitalInkMode: 'ONE_SIDE_COLOR',
  digitalOnDemand: false,

  lithoPlateFormatName: '1/4 (52 x 40 cm)',
  lithoInkSetCode: '4X4',
  lithoPlateBacking: false,
  lithoManualPlateCount: null,
  lithoMarginPercent: 30,
  lithoWastageSheets: 200,

  paperName: 'Propalcote 150g',
  sheetFormat: 'S70X100',
  sheetCutCode: '.1/8',

  cutRuns: 1,
  trimRuns: 0,
  perforationCount: 0,
  bindingLoops: 0,
  laminationMode: 'NONE',
  halfCutLinearCm: 0,
  dieCutPrice: 0,
  other1Label: '',
  other1Prices: [0, 0, 0],
  other2Label: '',
  other2Prices: [0, 0, 0],
  other3Label: '',
  other3Prices: [0, 0, 0],

  vatLabel: 'IVA 19%',
  otherTaxPercent: 0,
  clientDiscountLabel: 'Ninguno',
  otherDiscountPercent: 0,
  salesCommissionPercent: 0,
  deliveryTime: '3 a 5 días hábiles',
  paymentTerms: '50% anticipo, 50% contra entrega',
  validity: '15 días calendario',
};

export interface AssistTemplateItem {
  id: string;
  organizationId: string;
  name: string;
  technique: PressTechnique;
  input: Partial<AssistFormState>;
  usageCount: number;
  isShared: boolean;
  createdAt: string;
}
