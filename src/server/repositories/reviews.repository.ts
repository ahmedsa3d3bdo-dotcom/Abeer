import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export class ReviewsRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    productId?: string;
    rating?: number;
    isApproved?: boolean;
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
        sql`(${schema.productReviews.title} ILIKE ${like} OR ${schema.productReviews.content} ILIKE ${like} OR ${schema.products.name} ILIKE ${like})`,
      );
    }
    if (params.productId) filters.push(eq(schema.productReviews.productId, params.productId));
    if (typeof params.rating === "number") filters.push(eq(schema.productReviews.rating, params.rating));
    if (typeof params.isApproved === "boolean") filters.push(eq(schema.productReviews.isApproved, params.isApproved));
    if (params.dateFrom) filters.push(sql`${schema.productReviews.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.productReviews.createdAt} <= ${new Date(params.dateTo)}`);

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.productReviews.createdAt as any) : desc(schema.productReviews.createdAt as any);

    const items = await db
      .select({
        id: schema.productReviews.id,
        productId: schema.productReviews.productId,
        productName: schema.products.name,
        userId: schema.productReviews.userId,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userEmail: schema.users.email,
        orderId: schema.productReviews.orderId,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        content: schema.productReviews.content,
        isApproved: schema.productReviews.isApproved,
        helpfulCount: schema.productReviews.helpfulCount,
        reportCount: schema.productReviews.reportCount,
        createdAt: schema.productReviews.createdAt,
      })
      .from(schema.productReviews)
      .leftJoin(schema.products, eq(schema.products.id, schema.productReviews.productId))
      .leftJoin(schema.users, eq(schema.users.id, schema.productReviews.userId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.productReviews)
      .leftJoin(schema.products, eq(schema.products.id, schema.productReviews.productId))
      .leftJoin(schema.users, eq(schema.users.id, schema.productReviews.userId))
      .where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        id: schema.productReviews.id,
        productId: schema.productReviews.productId,
        userId: schema.productReviews.userId,
        orderId: schema.productReviews.orderId,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        content: schema.productReviews.content,
        isApproved: schema.productReviews.isApproved,
        helpfulCount: schema.productReviews.helpfulCount,
        reportCount: schema.productReviews.reportCount,
        createdAt: schema.productReviews.createdAt,
        updatedAt: schema.productReviews.updatedAt,
      })
      .from(schema.productReviews)
      .where(eq(schema.productReviews.id, id))
      .limit(1);
    return row || null;
  }

  async update(id: string, patch: Partial<{ title: string | null; content: string | null; rating: number; isApproved: boolean; approvedBy: string | null; approvedAt: Date | null }>) {
    const [row] = await db.update(schema.productReviews).set(patch as any).where(eq(schema.productReviews.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.productReviews).where(eq(schema.productReviews.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const reviewsRepository = new ReviewsRepository();
