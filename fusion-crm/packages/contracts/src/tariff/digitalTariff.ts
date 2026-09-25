import { z } from 'zod';

export const DigitalVolumeTierSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  digitalFormatTariffId: z.string(),
  minSheets: z.number().int().positive(),
  maxSheets: z.number().int().positive().nullable().optional(),
  unitPrice: z.number().positive(),
  label: z.string(),
});

export type DigitalVolumeTierDto = z.infer<typeof DigitalVolumeTierSchema>;

export const DigitalFormatTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  name: z.string(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  price1x0: z.number().min(0),
  price4x0: z.number().min(0),
  price4x4: z.number().min(0),
  laminationUnitPrice: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  volumeTiers: z.array(DigitalVolumeTierSchema).default([]),
});

export type DigitalFormatTariffDto = z.infer<typeof DigitalFormatTariffSchema>;

export const CreateDigitalFormatInputSchema = z.object({
  tariffVersionId: z.string(),
  name: z.string().min(1),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  price1x0: z.number().min(0),
  price4x0: z.number().min(0),
  price4x4: z.number().min(0),
  laminationUnitPrice: z.number().min(0).default(0),
  order: z.number().int().default(0),
  volumeTiers: z.array(
    z.object({
      minSheets: z.number().int().positive(),
      maxSheets: z.number().int().positive().nullable().optional(),
      unitPrice: z.number().positive(),
      label: z.string(),
    })
  ).optional(),
});

export type CreateDigitalFormatInput = z.infer<typeof CreateDigitalFormatInputSchema>;

export const UpdateDigitalVolumeTiersInputSchema = z.object({
  digitalFormatTariffId: z.string(),
  tiers: z.array(
    z.object({
      minSheets: z.number().int().positive(),
      maxSheets: z.number().int().positive().nullable().optional(),
      unitPrice: z.number().positive(),
      label: z.string(),
    })
  ),
});

export type UpdateDigitalVolumeTiersInput = z.infer<typeof UpdateDigitalVolumeTiersInputSchema>;
