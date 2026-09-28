import crypto from 'crypto';
import type { AppDocument, DocumentRepository, WriteContext } from '../types';
import { ensureBaseData, ensureUser, getPrisma, nextClientCode, type Tx } from './client';
import {
  ORGANIZATION_ID,
  fromClientRow,
  fromProjectRow,
  fromQuoteRow,
  splitNit,
  toClientRow,
  toProjectRow,
  toQuoteItemRow,
  toQuoteRow,
} from './mappers';
import { normalizeClientName } from '../../../packages/core/src/portal/clientProgress';

const TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 };

function withPatch<T extends AppDocument>(repo: Omit<DocumentRepository<T>, 'patch' | 'upsertMany'>): DocumentRepository<T> {
  return {
    ...repo,
    async upsertMany(docs, ctx) {
      for (const d of docs) await repo.upsert(d, ctx);
    },
    async patch(id, fields, ctx) {
      const current = await repo.get(id);
      if (!current) return null;
      return repo.upsert({ ...current, ...fields, id } as T, ctx);
    },
  };
}

// ── Clientes ───────────────────────────────────────────────────

async function upsertClient(tx: Tx, customer: AppDocument) {
  const existing = await tx.client.findUnique({ where: { id: customer.id }, select: { code: true } });
  const { number } = splitNit(customer.nit ?? customer.documentNumber);
  // El NIT es único por organización: si ya lo tiene otro cliente, este queda sin NIT en la columna
  const clash = number
    ? await tx.client.findFirst({ where: { organizationId: ORGANIZATION_ID, documentNumber: number, NOT: { id: customer.id } } })
    : null;
  const row = toClientRow(customer, existing?.code ?? (await nextClientCode(tx)), clash ? null : number);
  const { id, ...update } = row;
  await tx.client.upsert({ where: { id }, create: row, update: { ...update, deletedAt: null } });
}

export function createClientsRepository(): DocumentRepository {
  return withPatch({
    backend: 'postgres',
    async list() {
      await ensureBaseData();
      const rows = await getPrisma().client.findMany({
        where: { organizationId: ORGANIZATION_ID, deletedAt: null },
        select: { id: true, customFields: true },
        orderBy: { name: 'asc' },
      });
      return rows.map(fromClientRow);
    },
    async get(id) {
      const row = await getPrisma().client.findFirst({ where: { id, deletedAt: null }, select: { id: true, customFields: true } });
      return row ? fromClientRow(row) : null;
    },
    async upsert(doc) {
      await ensureBaseData();
      await getPrisma().$transaction((tx) => upsertClient(tx, doc), TX_OPTIONS);
      return (await this.get(doc.id))!;
    },
    // Los clientes tienen cotizaciones asociadas: se archivan en lugar de borrarse
    async delete(id) {
      await getPrisma().client.updateMany({ where: { id }, data: { deletedAt: new Date() } });
    },
    async deleteAll() {
      const r = await getPrisma().client.updateMany({ where: { organizationId: ORGANIZATION_ID, deletedAt: null }, data: { deletedAt: new Date() } });
      return r.count;
    },
  });
}

// ── Cotizaciones ───────────────────────────────────────────────

/** Cliente de la cotización: por id, NIT o nombre; si no existe, se crea con los datos de la cotización. */
async function resolveQuoteClient(tx: Tx, quote: AppDocument): Promise<string> {
  if (typeof quote.clientId === 'string' && quote.clientId) {
    const byId = await tx.client.findUnique({ where: { id: quote.clientId }, select: { id: true } });
    if (byId) return byId.id;
  }
  const { number } = splitNit(quote.clientNit ?? quote.clientData?.nit);
  if (number) {
    const byNit = await tx.client.findFirst({ where: { organizationId: ORGANIZATION_ID, documentNumber: number }, select: { id: true } });
    if (byNit) return byNit.id;
  }
  const name = String(quote.clientName || quote.clientData?.name || 'Cliente General');
  const byName = await tx.client.findFirst({
    where: { organizationId: ORGANIZATION_ID, normalizedName: normalizeClientName(name) },
    select: { id: true },
  });
  if (byName) return byName.id;

  const id = `cli_${crypto.randomBytes(8).toString('hex')}`;
  await upsertClient(tx, {
    id,
    name,
    nit: quote.clientNit ?? quote.clientData?.nit,
    email: quote.clientEmail ?? quote.clientData?.email,
    phone1: quote.clientPhone ?? quote.clientData?.phone,
    address: quote.clientAddress ?? quote.clientData?.address,
    source: 'Creado desde cotización',
  });
  return id;
}

export function createQuotesRepository(): DocumentRepository {
  const include = { items: { select: { appData: true, order: true } } } as const;
  return withPatch({
    backend: 'postgres',
    async list() {
      await ensureBaseData();
      const rows = await getPrisma().quote.findMany({
        where: { organizationId: ORGANIZATION_ID, deletedAt: null },
        select: { id: true, appData: true, ...include },
        orderBy: { issueDate: 'desc' },
      });
      return rows.map(fromQuoteRow);
    },
    async get(id) {
      const row = await getPrisma().quote.findFirst({ where: { id, deletedAt: null }, select: { id: true, appData: true, ...include } });
      return row ? fromQuoteRow(row) : null;
    },
    async upsert(doc, ctx?: WriteContext) {
      await ensureBaseData();
      await getPrisma().$transaction(async (tx) => {
        const existing = await tx.quote.findUnique({ where: { id: doc.id }, select: { ownerId: true, revision: true } });
        const clientId = await resolveQuoteClient(tx, doc);
        const ownerId = existing?.ownerId ?? (await ensureUser(tx, ctx));
        const number = String(doc.number || doc.id);

        // (organización, número, revisión) es único: si el número ya lo usa otra cotización, se toma la siguiente revisión
        let revision = existing?.revision ?? 1;
        const taken = await tx.quote.findFirst({ where: { organizationId: ORGANIZATION_ID, number, revision, NOT: { id: doc.id } } });
        if (taken) {
          const last = await tx.quote.findFirst({ where: { organizationId: ORGANIZATION_ID, number }, orderBy: { revision: 'desc' }, select: { revision: true } });
          revision = (last?.revision ?? 0) + 1;
        }

        const row = toQuoteRow(doc, { clientId, ownerId, revision });
        const { id, createdAt, ...update } = row;
        await tx.quote.upsert({ where: { id }, create: row, update: { ...update, deletedAt: null } });
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        const items = Array.isArray(doc.items) ? doc.items : [];
        if (items.length > 0) await tx.quoteItem.createMany({ data: items.map((it: any, i: number) => toQuoteItemRow(id, it, i)) });
      }, TX_OPTIONS);
      return (await this.get(doc.id))!;
    },
    async delete(id) {
      await getPrisma().quote.deleteMany({ where: { id } });
    },
    async deleteAll() {
      const r = await getPrisma().quote.deleteMany({ where: { organizationId: ORGANIZATION_ID } });
      return r.count;
    },
  });
}

// ── Proyectos de producción ────────────────────────────────────

export function createProjectsRepository(): DocumentRepository {
  return withPatch({
    backend: 'postgres',
    async list() {
      await ensureBaseData();
      const rows = await getPrisma().productionProject.findMany({
        where: { organizationId: ORGANIZATION_ID, deletedAt: null },
        select: { id: true, appData: true },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(fromProjectRow);
    },
    async get(id) {
      const row = await getPrisma().productionProject.findFirst({ where: { id, deletedAt: null }, select: { id: true, appData: true } });
      return row ? fromProjectRow(row) : null;
    },
    async upsert(doc) {
      await ensureBaseData();
      await getPrisma().$transaction(async (tx) => {
        // El número es único por organización; si otra OT ya lo usa, se desambigua en la columna
        let number = String(doc.number || doc.id);
        const clash = await tx.productionProject.findFirst({ where: { organizationId: ORGANIZATION_ID, number, NOT: { id: doc.id } } });
        if (clash) number = `${number}-${doc.id.slice(-6)}`;
        const row = toProjectRow(doc, number);
        const { id, createdAt, ...update } = row;
        await tx.productionProject.upsert({ where: { id }, create: row, update: { ...update, deletedAt: null } });
      }, TX_OPTIONS);
      return (await this.get(doc.id))!;
    },
    async delete(id) {
      await getPrisma().productionProject.deleteMany({ where: { id } });
    },
    async deleteAll() {
      const r = await getPrisma().productionProject.deleteMany({ where: { organizationId: ORGANIZATION_ID } });
      return r.count;
    },
  });
}
