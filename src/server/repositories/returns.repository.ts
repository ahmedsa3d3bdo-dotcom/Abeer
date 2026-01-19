import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListReturnParams {
  page?: number;
  limit?: number;
  q?: string; // order number, rma, id
  status?: (typeof schema.returnStatusEnum.enumValues)[number];
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc" | "approvedAt.desc" | "approvedAt.asc" | "receivedAt.desc" | "receivedAt.asc";
}

export class ReturnsRepository {
  async list(params: ListReturnParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(
        sql`(${schema.orders.orderNumber} ILIKE ${like} OR ${schema.returns.rmaNumber} ILIKE ${like} OR ${schema.returns.id}::text ILIKE ${like})`,
      );
    }
    if (params.status) filters.push(eq(schema.returns.status, params.status));
    if (params.dateFrom) filters.push(sql`${schema.returns.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.returns.createdAt} <= ${new Date(params.dateTo)}`);

    const where = filters.length ? and(...filters) : (undefined as any);
    const orderBy =
      params.sort === "createdAt.asc"
        ? (schema.returns.createdAt as any)
        : params.sort === "approvedAt.asc"
        ? (schema.returns.approvedAt as any)
        : params.sort === "approvedAt.desc"
        ? desc(schema.returns.approvedAt as any)
        : params.sort === "receivedAt.asc"
        ? (schema.returns.receivedAt as any)
        : params.sort === "receivedAt.desc"
        ? desc(schema.returns.receivedAt as any)
        : desc(schema.returns.createdAt as any);

    const items = await db
      .select({
        id: schema.returns.id,
        orderId: schema.returns.orderId,
        orderNumber: schema.orders.orderNumber,
        rmaNumber: schema.returns.rmaNumber,
        status: schema.returns.status,
        requestedAt: schema.returns.requestedAt,
        approvedAt: schema.returns.approvedAt,
        receivedAt: schema.returns.receivedAt,
        createdAt: schema.returns.createdAt,
      })
      .from(schema.returns)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.returns.orderId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.returns)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.returns.orderId))
      .where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        id: schema.returns.id,
        orderId: schema.returns.orderId,
        orderNumber: schema.orders.orderNumber,
        rmaNumber: schema.returns.rmaNumber,
        status: schema.returns.status,
        reason: schema.returns.reason,
        notes: schema.returns.notes,
        requestedBy: schema.returns.requestedBy,
        approvedBy: schema.returns.approvedBy,
        requestedAt: schema.returns.requestedAt,
        approvedAt: schema.returns.approvedAt,
        receivedAt: schema.returns.receivedAt,
        createdAt: schema.returns.createdAt,
        updatedAt: schema.returns.updatedAt,
      })
      .from(schema.returns)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.returns.orderId))
      .where(eq(schema.returns.id, id))
      .limit(1);
    if (!row) return null;

    const items = await db
      .select({
        id: schema.returnItems.id,
        orderItemId: schema.returnItems.orderItemId,
        quantity: schema.returnItems.quantity,
        reason: schema.returnItems.reason,
      })
      .from(schema.returnItems)
      .where(eq(schema.returnItems.returnId, id));

    return { ...row, items } as any;
  }

  async create(input: typeof schema.returns.$inferInsert & { items?: Array<{ orderItemId: string; quantity: number; reason?: string | null }>; }) {
    const [ret] = await db.insert(schema.returns).values(input).returning();
    if (!ret) return null;
    if (input.items?.length) {
      await db.insert(schema.returnItems).values(
        input.items.map((it) => ({ ...it, returnId: ret.id })) as any,
      );
    }
    return ret;
  }

  async update(id: string, patch: Partial<typeof schema.returns.$inferInsert> & { items?: Array<{ id?: string; orderItemId: string; quantity: number; reason?: string | null }>|null; }) {
    const [row] = await db.update(schema.returns).set(patch as any).where(eq(schema.returns.id, id)).returning();
    if (!row) return null;
    if (patch.items) {
      await db.delete(schema.returnItems).where(eq(schema.returnItems.returnId, id));
      if (patch.items.length) {
        await db.insert(schema.returnItems).values(
          patch.items.map((it) => ({ returnId: id, orderItemId: it.orderItemId, quantity: it.quantity, reason: it.reason ?? null })) as any,
        );
      }
    }
    return row;
  }

  async remove(id: string) {
    const res = await db.delete(schema.returns).where(eq(schema.returns.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const returnsRepository = new ReturnsRepository();
