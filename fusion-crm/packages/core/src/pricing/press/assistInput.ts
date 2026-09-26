import { DigitalInkMode, LaminationMode, PressQuoteInput, PressTechnique, TariffSnapshot } from './types';

/**
 * Campos del formulario del cotizador asistido que alimentan el motor de prensa.
 * El navegador y el servidor construyen la entrada del motor con la misma función, para que
 * el servidor pueda recalcular (y verificar) lo que el asesor vio en pantalla.
 */
export interface PressAssistForm {
  technique: PressTechnique;
  jobName: string;
  artWidthCm: number;
  artHeightCm: number;
  applyBleed: boolean;
  pagesPerUnit: number | null;
  qty1: number;
  qty2: number | null;
  qty3: number | null;
  digitalFormatName: string;
  digitalInkMode: DigitalInkMode;
  digitalOnDemand: boolean;
  lithoPlateFormatName: string;
  lithoInkSetCode: string;
  lithoPlateBacking: boolean;
  lithoManualPlateCount: number | null;
  lithoMarginPercent: number;
  lithoWastageSheets: number;
  paperName: string;
  sheetFormat: 'S70X100' | 'S60X90';
  sheetCutCode: string;
  cutRuns: number;
  trimRuns: number;
  perforationCount: number;
  bindingLoops: number;
  laminationMode: LaminationMode;
  halfCutLinearCm: number;
  dieCutPrice: number;
  vatLabel: string;
  otherTaxPercent: number;
  clientDiscountLabel: string;
  otherDiscountPercent: number;
  salesCommissionPercent: number;
}

export function assistQuantities(form: Pick<PressAssistForm, 'qty1' | 'qty2' | 'qty3'>): number[] {
  return [form.qty1, form.qty2, form.qty3].filter((q): q is number => typeof q === 'number' && q > 0);
}

/** Entrada del motor a partir del formulario; null si faltan cantidades o medidas. */
export function buildPressQuoteInput(form: PressAssistForm, tariff: TariffSnapshot): PressQuoteInput | null {
  const quantities = assistQuantities(form);
  if (quantities.length === 0 || !(form.artWidthCm > 0) || !(form.artHeightCm > 0)) return null;

  return {
    technique: form.technique,
    jobName: form.jobName || 'Trabajo gráfico',
    artWidthCm: form.artWidthCm,
    artHeightCm: form.artHeightCm,
    applyBleed: form.applyBleed,
    pagesPerUnit: form.pagesPerUnit ?? undefined,
    quantities,
    tariff,
    digital:
      form.technique === 'DIGITAL' || form.technique === 'BOTH'
        ? {
            formatName: form.digitalFormatName,
            inkMode: form.digitalInkMode,
            onDemand: form.digitalOnDemand,
          }
        : undefined,
    litho:
      form.technique === 'LITHO' || form.technique === 'BOTH'
        ? {
            paperName: form.paperName,
            sheetFormat: form.sheetFormat,
            sheetCutCode: form.sheetCutCode,
            plateFormatName: form.lithoPlateFormatName,
            inkSetCode: form.lithoInkSetCode,
            plateBacking: form.lithoPlateBacking,
            manualPlateCount: form.lithoManualPlateCount ?? undefined,
            marginPercent: (form.lithoMarginPercent || 30) / 100,
            wastageSheets: form.lithoWastageSheets ?? 200,
          }
        : undefined,
    finishing: {
      cut: form.cutRuns > 0 ? { runs: form.cutRuns } : undefined,
      trim: form.trimRuns > 0 ? { runs: form.trimRuns } : undefined,
      perforation: form.perforationCount > 0 ? { count: form.perforationCount } : undefined,
      binding: form.bindingLoops > 0 ? { loops: form.bindingLoops } : undefined,
      lamination: form.laminationMode !== 'NONE' ? { mode: form.laminationMode } : undefined,
      halfCut: form.halfCutLinearCm > 0 ? { linearCm: form.halfCutLinearCm } : undefined,
      dieCut: form.dieCutPrice > 0 ? { price: form.dieCutPrice } : undefined,
    },
    commercial: {
      vatLabel: form.vatLabel,
      otherTaxPercent: form.otherTaxPercent || 0,
      clientDiscountLabel: form.clientDiscountLabel,
      otherDiscountPercent: form.otherDiscountPercent || 0,
      salesCommissionPercent: form.salesCommissionPercent || 0,
    },
  } as PressQuoteInput;
}
