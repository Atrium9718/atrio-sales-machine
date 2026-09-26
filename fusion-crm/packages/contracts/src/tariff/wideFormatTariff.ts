import { z } from 'zod';

export const WideFormatTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  materialName: z.string(), // "Banner 13oz", "Vinilo adhesivo brillante", etc.
  widthMeters: z.number().positive(),
  costPerM2: z.number().positive(),
  salePricePerM2: z.number().positive(),
  inkCostPerM2: z.number().min(0).default(0),
  preparationCost: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export type WideFormatTariffDto = z.infer<typeof WideFormatTariffSchema>;

export const CreateWideFormatInputSchema = z.object({
  tariffVersionId: z.string(),
  materialName: z.string().min(1),
  widthMeters: z.number().positive(),
  costPerM2: z.number().positive(),
  salePricePerM2: z.number().positive(),
  inkCostPerM2: z.number().min(0).default(0),
  preparationCost: z.number().min(0).default(0),
  order: z.number().int().default(0),
});

export type CreateWideFormatInput = z.infer<typeof CreateWideFormatInputSchema>;

export const UpdateWideFormatInputSchema = z.object({
  id: z.string(),
  materialName: z.string().min(1).optional(),
  widthMeters: z.number().positive().optional(),
  costPerM2: z.number().positive().optional(),
  salePricePerM2: z.number().positive().optional(),
  inkCostPerM2: z.number().min(0).optional(),
  preparationCost: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type UpdateWideFormatInput = z.infer<typeof UpdateWideFormatInputSchema>;
