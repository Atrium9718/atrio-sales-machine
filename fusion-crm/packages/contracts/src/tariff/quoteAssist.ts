import { z } from 'zod';
import { SheetFormatSchema } from './paperTariff';
import { PrintTechniqueSchema } from './inkSetTariff';

export const AssistModeSchema = z.enum([
  'GUIDED',
  'MANUAL_LITHO',
  'WIDE_FORMAT',
  'ON_DEMAND',
]);
export type AssistModeType = z.infer<typeof AssistModeSchema>;

export const QuoteAssistFinishingSelectionSchema = z.object({
  finishingTariffId: z.string(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
});

export const QuoteAssistRunInputSchema = z.object({
  organizationId: z.string(),
  quoteId: z.string().optional(),
  mode: AssistModeSchema.default('GUIDED'),
  technique: PrintTechniqueSchema.optional(), // If not set, guided mode evaluates both LITHO & DIGITAL
  productName: z.string().min(1, 'El nombre o descripción del producto es requerido'),
  paperTariffItemId: z.string().optional(),
  sheetFormat: SheetFormatSchema.optional(),
  targetWidthCm: z.number().positive('El ancho debe ser mayor a 0'),
  targetHeightCm: z.number().positive('El alto debe ser mayor a 0'),
  inkSetCode: z.string().default('4X0'), // "4X4", "4X0", "1X0"
  quantities: z.array(z.number().int().positive()).min(1, 'Se requiere al menos una cantidad'),
  finishings: z.array(QuoteAssistFinishingSelectionSchema).default([]),
  customMarginPercent: z.number().min(0).max(100).optional(),
});

export type QuoteAssistRunInput = z.infer<typeof QuoteAssistRunInputSchema>;

export const CostBreakdownSchema = z.object({
  paperCost: z.number().min(0),
  platesCost: z.number().min(0),
  printingCost: z.number().min(0),
  finishingCost: z.number().min(0),
  outsourcedCost: z.number().min(0).default(0),
  wasteCost: z.number().min(0).default(0),
  totalUnitCost: z.number().min(0),
  totalInternalCost: z.number().min(0),
  marginPercent: z.number().min(0),
  marginAmount: z.number().min(0),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

export const ImpositionPlanSchema = z.object({
  sheetFormat: SheetFormatSchema,
  cutCode: z.string(), // ".1/4", ".1/8", etc.
  parentSheetsCount: z.number().int().positive(),
  sheetsWithWaste: z.number().int().positive(),
  cutsPerParentSheet: z.number().int().positive(),
  unitsPerCutSheet: z.number().int().positive(),
  totalUnitsPerParentSheet: z.number().int().positive(),
  wasteSheets: z.number().int().min(0),
  efficiencyPercent: z.number().min(0).max(100),
  plateCount: z.number().int().min(0),
});

export type ImpositionPlan = z.infer<typeof ImpositionPlanSchema>;

export const QuoteAssistAlternativeItemSchema = z.object({
  quantity: z.number().int().positive(),
  recommendedTechnique: PrintTechniqueSchema,
  suggestedUnitSalePrice: z.number().positive(),
  suggestedTotalSalePrice: z.number().positive(),
  imposition: ImpositionPlanSchema.optional(),
  // Campos sensibles de costo (removidos si no tiene permiso quote:assist_cost)
  breakdown: CostBreakdownSchema.optional(),
  internalCost: z.number().optional(),
  marginPercent: z.number().optional(),
  marginAmount: z.number().optional(),
});

export type QuoteAssistAlternativeItem = z.infer<typeof QuoteAssistAlternativeItemSchema>;

export const QuoteAssistResultSchema = z.object({
  assistRunId: z.string(),
  tariffVersionId: z.string(),
  tariffVersionCode: z.string(),
  timestamp: z.string().datetime().or(z.date()),
  input: QuoteAssistRunInputSchema,
  recommendationSummary: z.string(),
  items: z.array(QuoteAssistAlternativeItemSchema),
});

export type QuoteAssistResult = z.infer<typeof QuoteAssistResultSchema>;
