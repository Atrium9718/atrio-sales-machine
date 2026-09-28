import { z } from 'zod';

export const TariffStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type TariffStatusType = z.infer<typeof TariffStatusSchema>;

export const TariffVersionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  code: z.string(), // TAR-AAAA-NN
  name: z.string(),
  status: TariffStatusSchema,
  validFrom: z.string().datetime().or(z.date()),
  validTo: z.string().datetime().or(z.date()).nullable().optional(),
  publishedAt: z.string().datetime().or(z.date()).nullable().optional(),
  publishedById: z.string().nullable().optional(),
  archivedAt: z.string().datetime().or(z.date()).nullable().optional(),
  bleedCm: z.number().default(0.6),
  gripMarginCm: z.number().default(1.0),
  defaultWastageSheets: z.number().int().default(200),
  defaultLithoMarginPercent: z.number().default(30.0),
  notes: z.string().nullable().optional(),
  sourceFileKey: z.string().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  createdById: z.string().nullable().optional(),
  updatedById: z.string().nullable().optional(),
  deletedAt: z.string().datetime().or(z.date()).nullable().optional(),
  version: z.number().int().default(1),
});

export type TariffVersionDto = z.infer<typeof TariffVersionSchema>;

export const CreateTariffVersionInputSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, 'El nombre de la versión es requerido'),
  validFrom: z.string().datetime().or(z.date()),
  validTo: z.string().datetime().or(z.date()).optional(),
  bleedCm: z.number().min(0).max(5).default(0.6),
  gripMarginCm: z.number().min(0).max(5).default(1.0),
  defaultWastageSheets: z.number().int().min(0).max(2000).default(200),
  defaultLithoMarginPercent: z.number().min(0).max(100).default(30.0),
  notes: z.string().optional(),
});

export type CreateTariffVersionInput = z.infer<typeof CreateTariffVersionInputSchema>;

export const UpdateTariffVersionInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  validFrom: z.string().datetime().or(z.date()).optional(),
  validTo: z.string().datetime().or(z.date()).nullable().optional(),
  bleedCm: z.number().optional(),
  gripMarginCm: z.number().optional(),
  defaultWastageSheets: z.number().int().optional(),
  defaultLithoMarginPercent: z.number().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateTariffVersionInput = z.infer<typeof UpdateTariffVersionInputSchema>;

export const PublishTariffVersionInputSchema = z.object({
  id: z.string(),
  validFrom: z.string().datetime().or(z.date()).optional(),
});

export type PublishTariffVersionInput = z.infer<typeof PublishTariffVersionInputSchema>;

export const ListTariffVersionsInputSchema = z.object({
  organizationId: z.string(),
  status: TariffStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type ListTariffVersionsInput = z.infer<typeof ListTariffVersionsInputSchema>;
