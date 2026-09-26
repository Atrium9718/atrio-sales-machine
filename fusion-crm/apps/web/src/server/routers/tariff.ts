/**
 * Router tRPC para Tarifario de Producción y Asistente Técnico de Cotización (Etapa 18.1)
 * Todos los procedimientos declaran sus esquemas Zod de entrada y salida,
 * aplicando permissionProcedure y devolviendo NOT_IMPLEMENTED en este cimiento.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  can,
  requirePermission,
  sanitizeQuoteAssistResult,
  type UserLike,
  type Permission,
} from '../../../../../packages/core/src/auth/permissions';
import {
  TariffVersionSchema,
  CreateTariffVersionInputSchema,
  UpdateTariffVersionInputSchema,
  PublishTariffVersionInputSchema,
  ListTariffVersionsInputSchema,
  PaperTariffItemSchema,
  UpdatePaperTariffItemInputSchema,
  DigitalFormatTariffSchema,
  LithoFormatTariffSchema,
  UpdateLithoFormatInputSchema,
  SheetCutSchema,
  InkSetTariffSchema,
  FinishingTariffSchema,
  CommercialTermTariffSchema,
  WideFormatTariffSchema,
  UpdateWideFormatInputSchema,
  QuoteAssistRunInputSchema,
  QuoteAssistResultSchema,
} from '../../../../../packages/contracts/src/tariff';

export interface TRPCContext {
  user?: UserLike;
  organizationId?: string;
}

const t = initTRPC.context<TRPCContext>().create();

/**
 * Middleware para verificación de permisos de dominio
 */
const createPermissionMiddleware = (requiredPermission: Permission) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Sesión no iniciada',
      });
    }

    if (!can(ctx.user, requiredPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permiso denegado: se requiere ${requiredPermission}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });

const permissionProcedure = (perm: Permission) =>
  t.procedure.use(createPermissionMiddleware(perm));

export const tariffRouter = t.router({
  // --------------------------------------------------------------------------
  // Versiones del Tarifario
  // --------------------------------------------------------------------------

  getActiveVersion: permissionProcedure('tariff:read')
    .output(TariffVersionSchema.nullable())
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  listVersions: permissionProcedure('tariff:read')
    .input(ListTariffVersionsInputSchema)
    .output(
      z.object({
        items: z.array(TariffVersionSchema),
        total: z.number().int(),
        page: z.number().int(),
        pageSize: z.number().int(),
      })
    )
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getVersionById: permissionProcedure('tariff:read')
    .input(z.object({ id: z.string() }))
    .output(TariffVersionSchema)
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  createVersion: permissionProcedure('tariff:write')
    .input(CreateTariffVersionInputSchema)
    .output(TariffVersionSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  updateVersion: permissionProcedure('tariff:write')
    .input(UpdateTariffVersionInputSchema)
    .output(TariffVersionSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  publishVersion: permissionProcedure('tariff:publish')
    .input(PublishTariffVersionInputSchema)
    .output(TariffVersionSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  archiveVersion: permissionProcedure('tariff:publish')
    .input(z.object({ id: z.string() }))
    .output(TariffVersionSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  // --------------------------------------------------------------------------
  // Tablas del Tarifario
  // --------------------------------------------------------------------------

  getPaperItems: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(PaperTariffItemSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  updatePaperItem: permissionProcedure('tariff:write')
    .input(UpdatePaperTariffItemInputSchema)
    .output(PaperTariffItemSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getDigitalFormats: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(DigitalFormatTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getLithoFormats: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(LithoFormatTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  updateLithoFormat: permissionProcedure('tariff:write')
    .input(UpdateLithoFormatInputSchema)
    .output(LithoFormatTariffSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getSheetCuts: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(SheetCutSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getInkSets: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(InkSetTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getFinishings: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(FinishingTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getCommercialTerms: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(CommercialTermTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  getWideFormats: permissionProcedure('tariff:read')
    .input(z.object({ tariffVersionId: z.string() }))
    .output(z.array(WideFormatTariffSchema))
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  updateWideFormat: permissionProcedure('tariff:write')
    .input(UpdateWideFormatInputSchema)
    .output(WideFormatTariffSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),

  // --------------------------------------------------------------------------
  // Ayuda para Cotizar (Calculadora guiada de producción)
  // --------------------------------------------------------------------------

  runQuoteAssist: permissionProcedure('quote:assist')
    .input(QuoteAssistRunInputSchema)
    .output(QuoteAssistResultSchema)
    .mutation(async ({ input, ctx }) => {
      // Regla de seguridad: Si no tiene quote:assist_cost, se sanitiza la respuesta en servidor
      // throw NOT_IMPLEMENTED para este cimiento
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Calculadora guiada en construcción (Etapa 18.1)',
      });
    }),

  applyAssistToQuote: permissionProcedure('quote:assist')
    .input(
      z.object({
        quoteId: z.string(),
        assistRunId: z.string(),
        selectedQuantities: z.array(z.number().int()),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        createdItemIds: z.array(z.string()),
      })
    )
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Procedimiento en construcción (Etapa 18.1)',
      });
    }),
});

export type TariffRouter = typeof tariffRouter;
