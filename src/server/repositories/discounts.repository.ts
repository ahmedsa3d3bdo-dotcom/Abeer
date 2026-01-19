import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm";

export interface ListDiscountParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: (typeof schema.discountStatusEnum.enumValues)[number];
  type?: (typeof schema.discountTypeEnum.enumValues)[number];
  scope?: (typeof schema.discountScopeEnum.enumValues)[number];
  isAutomatic?: boolean;
  dateFrom?: string;
  dateTo?: string;
  activeNow?: boolean;
  sort?: "createdAt.desc" | "createdAt.asc" | "startsAt.desc" | "startsAt.asc";
}

export class DiscountsRepository {
  async list(params: ListDiscountParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.discounts.name} ILIKE ${like} OR ${schema.discounts.code} ILIKE ${like})`);
    }
    if (params.status) filters.push(eq(schema.discounts.status, params.status));
    if (params.type) filters.push(eq(schema.discounts.type, params.type));
    if (params.scope) filters.push(eq(schema.discounts.scope, params.scope));
    if (typeof params.isAutomatic === "boolean") filters.push(eq(schema.discounts.isAutomatic, params.isAutomatic));
    if (params.dateFrom) filters.push(sql`${schema.discounts.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.discounts.createdAt} <= ${new Date(params.dateTo)}`);
    if (params.activeNow) {
      const now = new Date();
      filters.push(sql`(${schema.discounts.startsAt} IS NULL OR ${schema.discounts.startsAt} <= ${now})`);
      filters.push(sql`(${schema.discounts.endsAt} IS NULL OR ${schema.discounts.endsAt} >= ${now})`);
      filters.push(eq(schema.discounts.status, "active" as any));
    }

    const where = filters.length ? and(...filters) : (undefined as any);
    const orderBy =
      params.sort === "createdAt.asc"
        ? (schema.discounts.createdAt as any)
        : params.sort === "startsAt.asc"
        ? (schema.discounts.startsAt as any)
        : params.sort === "startsAt.desc"
        ? desc(schema.discounts.startsAt as any)
        : desc(schema.discounts.createdAt as any);

    const items = await db
      .select({
        id: schema.discounts.id,
        name: schema.discounts.name,
        code: schema.discounts.code,
        type: schema.discounts.type,
        value: schema.discounts.value,
        scope: schema.discounts.scope,
        status: schema.discounts.status,
        isAutomatic: schema.discounts.isAutomatic,
        usageLimit: schema.discounts.usageLimit,
        usageCount: schema.discounts.usageCount,
        startsAt: schema.discounts.startsAt,
        endsAt: schema.discounts.endsAt,
        createdAt: schema.discounts.createdAt,
      })
      .from(schema.discounts)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.discounts)
      .where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select()
      .from(schema.discounts)
      .where(eq(schema.discounts.id, id))
      .limit(1);
    if (!row) return null;

    const productIds = await db
      .select({ productId: schema.discountProducts.productId })
      .from(schema.discountProducts)
      .where(eq(schema.discountProducts.discountId, id));

    const categoryIds = await db
      .select({ categoryId: schema.discountCategories.categoryId })
      .from(schema.discountCategories)
      .where(eq(schema.discountCategories.discountId, id));

    return {
      ...row,
      productIds: productIds.map((p) => p.productId),
      categoryIds: categoryIds.map((c) => c.categoryId),
    } as any;
  }

  async create(input: typeof schema.discounts.$inferInsert & {
    productIds?: string[];
    categoryIds?: string[];
  }) {
    const [created] = await db.insert(schema.discounts).values(input).returning();
    if (!created) return null;

    if (input.productIds?.length) {
      await db
        .insert(schema.discountProducts)
        .values(input.productIds.map((pid) => ({ discountId: created.id, productId: pid })));
    }
    if (input.categoryIds?.length) {
      await db
        .insert(schema.discountCategories)
        .values(input.categoryIds.map((cid) => ({ discountId: created.id, categoryId: cid })));
    }
    return created;
  }

  async update(id: string, patch: Partial<typeof schema.discounts.$inferInsert> & {
    productIds?: string[] | null;
    categoryIds?: string[] | null;
  }) {
    const [updated] = await db.update(schema.discounts).set(patch as any).where(eq(schema.discounts.id, id)).returning();
    if (!updated) return null;

    if (patch.productIds) {
      await db.delete(schema.discountProducts).where(eq(schema.discountProducts.discountId, id));
      if (patch.productIds.length) {
        await db
          .insert(schema.discountProducts)
          .values(patch.productIds.map((pid) => ({ discountId: id, productId: pid })));
      }
    }
    if (patch.categoryIds) {
      await db.delete(schema.discountCategories).where(eq(schema.discountCategories.discountId, id));
      if (patch.categoryIds.length) {
        await db
          .insert(schema.discountCategories)
          .values(patch.categoryIds.map((cid) => ({ discountId: id, categoryId: cid })));
      }
    }
    return updated;
  }

  async remove(id: string) {
    const res = await db.delete(schema.discounts).where(eq(schema.discounts.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const discountsRepository = new DiscountsRepository();
