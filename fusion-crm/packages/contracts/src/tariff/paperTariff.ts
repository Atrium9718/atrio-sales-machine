import { z } from 'zod';

export const SheetFormatSchema = z.enum(['S70X100', 'S60X90']);
export type SheetFormatType = z.infer<typeof SheetFormatSchema>;

export const PaperTariffItemSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  family: z.string(),
  name: z.string(),
  paperTypeId: z.string().nullable().optional(),
  sheetFormat: SheetFormatSchema,
  pricePerSheet: z.number().positive(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

export type PaperTariffItemDto = z.infer<typeof PaperTariffItemSchema>;

export const CreatePaperTariffItemInputSchema = z.object({
  tariffVersionId: z.string(),
  family: z.string().min(1),
  name: z.string().min(1),
  paperTypeId: z.string().optional(),
  sheetFormat: SheetFormatSchema,
  pricePerSheet: z.number().positive(),
  order: z.number().int().default(0),
});

export type CreatePaperTariffItemInput = z.infer<typeof CreatePaperTariffItemInputSchema>;

export const UpdatePaperTariffItemInputSchema = z.object({
  id: z.string(),
  pricePerSheet: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type UpdatePaperTariffItemInput = z.infer<typeof UpdatePaperTariffItemInputSchema>;
