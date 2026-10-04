import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../db';
import { orders, orderItems, products, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class AdminOrdersService {
  async getAll() {
    const allOrders = await db.select({
      id: orders.id,
      userId: orders.userId,
      userEmail: users.email,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerCity: orders.customerCity,
      customerAddress: orders.customerAddress,
      customerNit: orders.customerNit,
      total: orders.total,
      subtotal: orders.subtotal,
      iva: orders.iva,
      shippingCost: orders.shippingCost,
      shippingMethod: orders.shippingMethod,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      status: orders.status,
      trackingNumber: orders.trackingNumber,
      trackingCourier: orders.trackingCourier,
      internalNotes: orders.internalNotes,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

    // Get item counts per order
    const allItems = await db.select().from(orderItems);
    const itemCountsByOrder: Record<number, number> = {};
    allItems.forEach(item => {
      itemCountsByOrder[item.orderId] = (itemCountsByOrder[item.orderId] || 0) + 1;
    });

    return allOrders.map(o => ({
      id: `ORD-2026-${String(o.id).padStart(4, '0')}`,
      numericId: o.id,
      client: o.customerName || o.userEmail,
      email: o.userEmail,
      phone: o.customerPhone || 'N/A',
      city: o.customerCity || 'Manizales',
      date: o.createdAt.toISOString().split('T')[0],
      createdAt: o.createdAt,
      total: Number(o.total),
      subtotal: Number(o.subtotal || 0),
      iva: Number(o.iva || 0),
      shippingCost: Number(o.shippingCost || 0),
      shippingMethod: o.shippingMethod || 'local',
      paymentMethod: o.paymentMethod || 'wompi',
      paymentStatus: o.paymentStatus || 'PAID',
      status: o.status,
      trackingNumber: o.trackingNumber,
      trackingCourier: o.trackingCourier,
      internalNotes: o.internalNotes,
      itemsCount: itemCountsByOrder[o.id] || 1,
    }));
  }

  async getById(id: number) {
    const o = await db.select({
      id: orders.id,
      userId: orders.userId,
      userEmail: users.email,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerAddress: orders.customerAddress,
      customerCity: orders.customerCity,
      customerNit: orders.customerNit,
      total: orders.total,
      subtotal: orders.subtotal,
      iva: orders.iva,
      shippingCost: orders.shippingCost,
      shippingMethod: orders.shippingMethod,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      status: orders.status,
      trackingNumber: orders.trackingNumber,
      trackingCourier: orders.trackingCourier,
      internalNotes: orders.internalNotes,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, id));

    if (!o[0]) throw new NotFoundException('Orden no encontrada');

    const items = await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      highResPdfUrl: orderItems.highResPdfUrl,
      specs: orderItems.specs,
      fileType: orderItems.fileType,
      previewImageUrl: orderItems.previewImageUrl,
      notes: orderItems.notes,
      productName: products.name,
      productSlug: products.slug,
      productImage: products.imageUrl,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));

    return {
      order: {
        ...o[0],
        code: `ORD-2026-${String(o[0].id).padStart(4, '0')}`,
        total: Number(o[0].total),
        subtotal: Number(o[0].subtotal),
        iva: Number(o[0].iva),
        shippingCost: Number(o[0].shippingCost),
      },
      items: items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      }))
    };
  }

  async updateOrder(id: number, data: { status?: string; trackingNumber?: string; trackingCourier?: string; internalNotes?: string }) {
    const updatePayload: Record<string, any> = {};
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.trackingNumber !== undefined) updatePayload.trackingNumber = data.trackingNumber;
    if (data.trackingCourier !== undefined) updatePayload.trackingCourier = data.trackingCourier;
    if (data.internalNotes !== undefined) updatePayload.internalNotes = data.internalNotes;

    const result = await db.update(orders).set(updatePayload).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateStatus(id: number, status: string) {
    const result = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return result[0];
  }
}
