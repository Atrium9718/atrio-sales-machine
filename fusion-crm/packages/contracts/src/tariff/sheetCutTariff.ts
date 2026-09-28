import { z } from 'zod';
import { SheetFormatSchema } from './paperTariff';

export const SheetCutSizeSchema = z.object({
  id: z.string(),
  sheetCutId: z.string(),
  sheetFormat: SheetFormatSchema,
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
});

export type SheetCutSizeDto = z.infer<typeof SheetCutSizeSchema>;

export const SheetCutSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  code: z.string(), // ".1", ".1/2", ".1/4", ...
  divisor: z.number().int().positive(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  sizes: z.array(SheetCutSizeSchema).default([]),
});

export type SheetCutDto = z.infer<typeof SheetCutSchema>;

export const CreateSheetCutInputSchema = z.object({
  tariffVersionId: z.string(),
  code: z.string().min(1),
  divisor: z.number().int().positive(),
  order: z.number().int().default(0),
  sizes: z.array(
    z.object({
      sheetFormat: SheetFormatSchema,
      widthCm: z.number().positive(),
      heightCm: z.number().positive(),
    })
  ).optional(),
});

export type CreateSheetCutInput = z.infer<typeof CreateSheetCutInputSchema>;
