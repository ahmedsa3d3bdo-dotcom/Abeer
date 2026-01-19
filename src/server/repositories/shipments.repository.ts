import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export class ShipmentsRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string; // shipment number, tracking number, order number, carrier
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(
        sql`(${schema.shipments.shipmentNumber} ILIKE ${like} OR ${schema.shipments.trackingNumber} ILIKE ${like} OR ${schema.shipments.carrier} ILIKE ${like} OR ${schema.orders.orderNumber} ILIKE ${like})`,
      );
    }
    if (params.status) filters.push(eq(schema.shipments.status, params.status as any));
    if (params.dateFrom) filters.push(sql`${schema.shipments.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.shipments.createdAt} <= ${new Date(params.dateTo)}`);

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.shipments.createdAt as any) : desc(schema.shipments.createdAt as any);

    const items = await db
      .select({
        id: schema.shipments.id,
        orderId: schema.shipments.orderId,
        orderNumber: schema.orders.orderNumber,
        shipmentNumber: schema.shipments.shipmentNumber,
        shippingMethodId: schema.shipments.shippingMethodId,
        methodName: schema.shippingMethods.name,
        trackingNumber: schema.shipments.trackingNumber,
        carrier: schema.shipments.carrier,
        status: schema.shipments.status,
        shippedAt: schema.shipments.shippedAt,
        estimatedDeliveryAt: schema.shipments.estimatedDeliveryAt,
        deliveredAt: schema.shipments.deliveredAt,
        createdAt: schema.shipments.createdAt,
      })
      .from(schema.shipments)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.shipments.orderId))
      .leftJoin(schema.shippingMethods, eq(schema.shippingMethods.id, schema.shipments.shippingMethodId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.shipments)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.shipments.orderId))
      .where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        id: schema.shipments.id,
        orderId: schema.shipments.orderId,
        orderNumber: schema.orders.orderNumber,
        shipmentNumber: schema.shipments.shipmentNumber,
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
      .leftJoin(schema.orders, eq(schema.orders.id, schema.shipments.orderId))
      .leftJoin(schema.shippingMethods, eq(schema.shippingMethods.id, schema.shipments.shippingMethodId))
      .where(eq(schema.shipments.id, id))
      .limit(1);
    return row || null;
  }

  async update(id: string, patch: Partial<{ status: any; trackingNumber: string | null; carrier: string | null; shippingMethodId: string | null; shippedAt: Date | null; deliveredAt: Date | null; estimatedDeliveryAt: Date | null; notes: string | null }>) {
    const [row] = await db.update(schema.shipments).set(patch as any).where(eq(schema.shipments.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.shipments).where(eq(schema.shipments.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const shipmentsRepository = new ShipmentsRepository();
