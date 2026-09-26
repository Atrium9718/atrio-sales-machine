import { z } from 'zod';

export const LithoFormatTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  name: z.string(), // "1/8", "Doble Carta", "1/4", "1/2", "Pliego"
  machineLabel: z.string().nullable().optional(),
  printAreaWidthCm: z.number().positive(),
  printAreaHeightCm: z.number().positive(),
  plateUnitPrice: z.number().positive(),
  pressPricePerThousand: z.number().positive(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export type LithoFormatTariffDto = z.infer<typeof LithoFormatTariffSchema>;

export const CreateLithoFormatInputSchema = z.object({
  tariffVersionId: z.string(),
  name: z.string().min(1),
  machineLabel: z.string().optional(),
  printAreaWidthCm: z.number().positive(),
  printAreaHeightCm: z.number().positive(),
  plateUnitPrice: z.number().positive(),
  pressPricePerThousand: z.number().positive(),
  order: z.number().int().default(0),
});

export type CreateLithoFormatInput = z.infer<typeof CreateLithoFormatInputSchema>;

export const UpdateLithoFormatInputSchema = z.object({
  id: z.string(),
  machineLabel: z.string().nullable().optional(),
  plateUnitPrice: z.number().positive().optional(),
  pressPricePerThousand: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type UpdateLithoFormatInput = z.infer<typeof UpdateLithoFormatInputSchema>;
