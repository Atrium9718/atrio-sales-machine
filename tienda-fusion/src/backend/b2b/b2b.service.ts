import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, isNotNull, ne, or, desc } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { B2B_TIER_CONFIG, B2BTierLevel } from '../../lib/b2bEngine';

export interface B2BRequestData {
  tier: B2BTierLevel;
  companyName: string;
  nit: string;
  contactPerson: string;
  phone: string;
  city: string;
  whiteLabelPacking?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

const isTier = (tier: any): tier is B2BTierLevel => Object.prototype.hasOwnProperty.call(B2B_TIER_CONFIG, tier);

/** Descuento B2B (%) que el servidor aplica a un usuario. Solo cuenta el nivel aprobado. */
export const getB2BDiscount = (user?: { b2bTier?: string | null } | null): number => {
  const tier = user?.b2bTier;
  return tier && isTier(tier) ? B2B_TIER_CONFIG[tier].discount : 0;
};

@Injectable()
export class B2BService {
  getProfile(user: typeof users.$inferSelect) {
    const tier = isTier(user.b2bTier) ? user.b2bTier : 'RETAIL';
    return {
      email: user.email,
      tier,
      discountPercentage: B2B_TIER_CONFIG[tier].discount,
      paymentTermsDays: B2B_TIER_CONFIG[tier].paymentTerms,
      isVerifiedB2B: tier !== 'RETAIL',
      request: (user.b2bRequest as B2BRequestData | null) || null,
    };
  }

  async submitRequest(user: typeof users.$inferSelect, body: Partial<B2BRequestData>) {
    if (!isTier(body.tier) || body.tier === 'RETAIL') {
      throw new BadRequestException('Nivel B2B inválido.');
    }
    const required = ['companyName', 'nit', 'contactPerson', 'phone', 'city'] as const;
    for (const field of required) {
      if (!String(body[field] || '').trim()) {
        throw new BadRequestException(`El campo ${field} es obligatorio.`);
      }
    }
    const request: B2BRequestData = {
      tier: body.tier,
      companyName: String(body.companyName).trim().slice(0, 200),
      nit: String(body.nit).trim().slice(0, 40),
      contactPerson: String(body.contactPerson).trim().slice(0, 120),
      phone: String(body.phone).trim().slice(0, 40),
      city: String(body.city).trim().slice(0, 80),
      whiteLabelPacking: Boolean(body.whiteLabelPacking),
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };
    const [updated] = await db.update(users).set({ b2bRequest: request }).where(eq(users.id, user.id)).returning();
    return this.getProfile(updated);
  }

  async listAccounts() {
    const rows = await db.select().from(users)
      .where(or(isNotNull(users.b2bRequest), ne(users.b2bTier, 'RETAIL')))
      .orderBy(desc(users.id));
    return rows.map(u => ({ id: u.id, ...this.getProfile(u) }));
  }

  async review(userId: number, action: 'approve' | 'reject' | 'revoke', reviewer: string, tierOverride?: string) {
    const user = (await db.select().from(users).where(eq(users.id, userId)))[0];
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const request = (user.b2bRequest as B2BRequestData | null) || null;

    let b2bTier: B2BTierLevel = 'RETAIL';
    if (action === 'approve') {
      const tier = tierOverride || request?.tier;
      if (!isTier(tier) || tier === 'RETAIL') throw new BadRequestException('Nivel B2B inválido.');
      b2bTier = tier;
    }

    const reviewedRequest = request ? {
      ...request,
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
    } : null;

    const [updated] = await db.update(users)
      .set({ b2bTier, b2bRequest: reviewedRequest })
      .where(eq(users.id, userId))
      .returning();
    return { id: updated.id, ...this.getProfile(updated) };
  }
}
