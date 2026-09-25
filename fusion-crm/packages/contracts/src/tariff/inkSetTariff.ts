import { z } from 'zod';

export const PrintTechniqueSchema = z.enum(['LITHO', 'DIGITAL']);
export type PrintTechniqueType = z.infer<typeof PrintTechniqueSchema>;

export const InkSetTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  code: z.string(), // "4X4", "4X0", "1X0", etc.
  plates: z.number().int().min(0),
  technique: PrintTechniqueSchema,
  order: z.number().int().default(0),
});

export type InkSetTariffDto = z.infer<typeof InkSetTariffSchema>;

export const CreateInkSetInputSchema = z.object({
  tariffVersionId: z.string(),
  code: z.string().min(1),
  plates: z.number().int().min(0),
  technique: PrintTechniqueSchema,
  order: z.number().int().default(0),
});

export type CreateInkSetInput = z.infer<typeof CreateInkSetInputSchema>;
