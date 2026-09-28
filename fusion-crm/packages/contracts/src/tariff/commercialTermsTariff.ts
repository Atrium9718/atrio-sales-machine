import { z } from 'zod';

export const CommercialTermTypeSchema = z.enum([
  'VALIDITY_DAYS',
  'PAYMENT_CONDITIONS',
  'STANDARD_DELIVERY_DAYS',
  'WARRANTY_DAYS',
  'OVERRUN_TOLERANCE_PERCENT',
]);
export type CommercialTermType = z.infer<typeof CommercialTermTypeSchema>;

export const CommercialTermTariffSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  tariffVersionId: z.string(),
  termType: CommercialTermTypeSchema,
  label: z.string(),
  defaultValue: z.string(),
  order: z.number().int().default(0),
});

export type CommercialTermTariffDto = z.infer<typeof CommercialTermTariffSchema>;

export const CreateCommercialTermInputSchema = z.object({
  tariffVersionId: z.string(),
  termType: CommercialTermTypeSchema,
  label: z.string().min(1),
  defaultValue: z.string().min(1),
  order: z.number().int().default(0),
});

export type CreateCommercialTermInput = z.infer<typeof CreateCommercialTermInputSchema>;
