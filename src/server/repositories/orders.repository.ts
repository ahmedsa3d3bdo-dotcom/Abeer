import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export class OrdersRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string; // order number or email
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
    userId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.orders.orderNumber} ILIKE ${like} OR ${schema.orders.customerEmail} ILIKE ${like})`);
    }
    if (params.status) filters.push(eq(schema.orders.status, params.status as any));
    if (params.paymentStatus) filters.push(eq(schema.orders.paymentStatus, params.paymentStatus as any));
    if (params.dateFrom) filters.push(sql`${schema.orders.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.orders.createdAt} <= ${new Date(params.dateTo)}`);
    if (params.userId) filters.push(eq(schema.orders.userId, params.userId as any));

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.orders.createdAt as any) : desc(schema.orders.createdAt as any);

    const items = await db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerEmail: schema.orders.customerEmail,
        customerPhone: schema.orders.customerPhone,
        status: schema.orders.status,
        paymentStatus: schema.orders.paymentStatus,
        paymentMethod: schema.orders.paymentMethod,
        subtotal: schema.orders.subtotal,
        taxAmount: schema.orders.taxAmount,
        shippingAmount: schema.orders.shippingAmount,
        discountAmount: schema.orders.discountAmount,
        totalAmount: schema.orders.totalAmount,
        currency: schema.orders.currency,
        createdAt: schema.orders.createdAt,
        customerFirstName: schema.users.firstName,
        customerLastName: schema.users.lastName,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.orders).where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        ...schema.orders,
        customerFirstName: schema.users.firstName,
        customerLastName: schema.users.lastName,
      } as any)
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(eq(schema.orders.id, id))
      .limit(1);
    return (row as any) || null;
  }

  async getDetails(id: string) {
    const order = await this.get(id);
    if (!order) return null;

    const items = await db
      .select({
        id: schema.orderItems.id,
        productId: schema.orderItems.productId,
        variantId: schema.orderItems.variantId,
        productName: schema.orderItems.productName,
        variantName: schema.orderItems.variantName,
        sku: schema.orderItems.sku,
        quantity: schema.orderItems.quantity,
        unitPrice: schema.orderItems.unitPrice,
        totalPrice: schema.orderItems.totalPrice,
        taxAmount: schema.orderItems.taxAmount,
        discountAmount: schema.orderItems.discountAmount,
      })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    const shipments = await db
      .select({
        id: schema.shipments.id,
        orderId: schema.shipments.orderId,
        shippingMethodId: schema.shipments.shippingMethodId,
        methodName: schema.shippingMethods.name,
        trackingNumber: schema.shipments.trackingNumber,
        carrier: schema.shipments.carrier,
        status: schema.shipments.status,
        shippedAt: schema.shipments.shippedAt,
        estimatedDeliveryAt: schema.shipments.estimatedDeliveryAt,
        deliveredAt: schema.shipments.deliveredAt,
        notes: schema.shipments.notes,
        createdAt: schema.shipments.createdAt,
        updatedAt: schema.shipments.updatedAt,
      })
      .from(schema.shipments)
      .leftJoin(schema.shippingMethods, eq(schema.shippingMethods.id, schema.shipments.shippingMethodId))
      .where(eq(schema.shipments.orderId, id));

    // Shipping address snapshot (works for guests and users)
    const [shippingAddress] = await db
      .select()
      .from(schema.orderShippingAddresses)
      .where(eq(schema.orderShippingAddresses.orderId, id))
      .limit(1);

    return { order, items, shipments, shippingAddress };
  }

  async update(id: string, patch: Partial<{ status: any; paymentStatus: any; adminNote: string | null }>) {
    const [row] = await db.update(schema.orders).set(patch as any).where(eq(schema.orders.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.orders).where(eq(schema.orders.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const ordersRepository = new OrdersRepository();
