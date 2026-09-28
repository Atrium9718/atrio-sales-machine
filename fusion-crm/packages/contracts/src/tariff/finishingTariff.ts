import { z } from 'zod';

export const FinishingServiceSchema = z.enum([
  'CUT',
  'TRIM',
  'PERFORATION',
  'BINDING',
  'LAMINATION',
  'HALF_CUT',
  'DIE_CUT',
  'OTHER',
]);
export type FinishingServiceType = z.infer<typeof FinishingServiceSchema>;

export const FinishingModeSchema = z.enum([
  'NONE',
  'PER_RUN',
  'MINIMUM',
  'PER_THOUSAND',
  'PER_UNIT',
  'PER_M2',
  'PER_LINEAR_CM',
  'PER_CM2',
  'PER_LOOP',
]);
export type FinishingModeType = z.infer<typeof FinishingModeSchema>;

export const TariffScopeSchema = z.enum(['DIGITAL', 'LITHO', 'BOTH']);
export type TariffScopeType = z.infer<typeof TariffScopeSchema>;

export const FinishingTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  service: FinishingServiceSchema,
  mode: FinishingModeSchema,
  label: z.string(), // "Por unidad (Bajada)", "Mínimo", "Por millar", "Por m2", etc.
  price: z.number().min(0),
  minimumCharge: z.number().min(0).nullable().optional(),
  appliesTo: TariffScopeSchema,
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export type FinishingTariffDto = z.infer<typeof FinishingTariffSchema>;

export const CreateFinishingTariffInputSchema = z.object({
  tariffVersionId: z.string(),
  service: FinishingServiceSchema,
  mode: FinishingModeSchema,
  label: z.string().min(1),
  price: z.number().min(0),
  minimumCharge: z.number().min(0).optional(),
  appliesTo: TariffScopeSchema,
  order: z.number().int().default(0),
});

export type CreateFinishingTariffInput = z.infer<typeof CreateFinishingTariffInputSchema>;
