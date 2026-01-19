import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListRefundParams {
  page?: number;
  limit?: number;
  q?: string; // order number, refund number, or id
  status?: (typeof schema.refundStatusEnum.enumValues)[number];
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc" | "processedAt.desc" | "processedAt.asc";
}

export class RefundsRepository {
  async list(params: ListRefundParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.orders.orderNumber} ILIKE ${like} OR ${schema.refunds.refundNumber} ILIKE ${like} OR ${schema.refunds.id}::text ILIKE ${like})`);
    }
    if (params.status) filters.push(eq(schema.refunds.status, params.status));
    if (params.dateFrom) filters.push(sql`${schema.refunds.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.refunds.createdAt} <= ${new Date(params.dateTo)}`);

    const where = filters.length ? and(...filters) : (undefined as any);
    const orderBy =
      params.sort === "createdAt.asc"
        ? (schema.refunds.createdAt as any)
        : params.sort === "processedAt.asc"
        ? (schema.refunds.processedAt as any)
        : params.sort === "processedAt.desc"
        ? desc(schema.refunds.processedAt as any)
        : desc(schema.refunds.createdAt as any);

    const items = await db
      .select({
        id: schema.refunds.id,
        orderId: schema.refunds.orderId,
        orderNumber: schema.orders.orderNumber,
        refundNumber: schema.refunds.refundNumber,
        amount: schema.refunds.amount,
        currency: schema.refunds.currency,
        status: schema.refunds.status,
        reason: schema.refunds.reason,
        processedAt: schema.refunds.processedAt,
        createdAt: schema.refunds.createdAt,
      })
      .from(schema.refunds)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.refunds)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId))
      .where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        id: schema.refunds.id,
        orderId: schema.refunds.orderId,
        orderNumber: schema.orders.orderNumber,
        refundNumber: schema.refunds.refundNumber,
        paymentId: schema.refunds.paymentId,
        status: schema.refunds.status,
        amount: schema.refunds.amount,
        currency: schema.refunds.currency,
        reason: schema.refunds.reason,
        approvedBy: schema.refunds.approvedBy,
        processedAt: schema.refunds.processedAt,
        createdAt: schema.refunds.createdAt,
        updatedAt: schema.refunds.updatedAt,
      })
      .from(schema.refunds)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId))
      .where(eq(schema.refunds.id, id))
      .limit(1);
    if (!row) return null;

    const items = await db
      .select({
        id: schema.refundItems.id,
        orderItemId: schema.refundItems.orderItemId,
        quantity: schema.refundItems.quantity,
        amount: schema.refundItems.amount,
        reason: schema.refundItems.reason,
      })
      .from(schema.refundItems)
      .where(eq(schema.refundItems.refundId, id));

    return { ...row, items } as any;
  }

  async create(input: typeof schema.refunds.$inferInsert & { items?: Array<{
    orderItemId: string;
    quantity: number;
    amount: string;
    reason?: string | null;
  }>; }) {
    const [ref] = await db.insert(schema.refunds).values(input).returning();
    if (!ref) return null;
    if (input.items?.length) {
      await db.insert(schema.refundItems).values(
        input.items.map((it) => ({ ...it, refundId: ref.id })) as any,
      );
    }
    return ref;
  }

  async update(id: string, patch: Partial<typeof schema.refunds.$inferInsert> & { items?: Array<{ id?: string; orderItemId: string; quantity: number; amount: string; reason?: string | null; }> | null; }) {
    const [row] = await db.update(schema.refunds).set(patch as any).where(eq(schema.refunds.id, id)).returning();
    if (!row) return null;
    if (patch.items) {
      await db.delete(schema.refundItems).where(eq(schema.refundItems.refundId, id));
      if (patch.items.length) {
        await db.insert(schema.refundItems).values(
          patch.items.map((it) => ({ refundId: id, orderItemId: it.orderItemId, quantity: it.quantity, amount: it.amount, reason: it.reason ?? null })) as any,
        );
      }
    }
    return row;
  }

  async remove(id: string) {
    const res = await db.delete(schema.refunds).where(eq(schema.refunds.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const refundsRepository = new RefundsRepository();
