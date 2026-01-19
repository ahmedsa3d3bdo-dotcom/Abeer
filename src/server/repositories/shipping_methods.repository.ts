import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export class ShippingMethodsRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
    sort?: "createdAt.desc" | "createdAt.asc";
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.shippingMethods.name} ILIKE ${like} OR ${schema.shippingMethods.code} ILIKE ${like} OR ${schema.shippingMethods.carrier} ILIKE ${like})`);
    }
    if (typeof params.isActive === "boolean") filters.push(eq(schema.shippingMethods.isActive, params.isActive));

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.shippingMethods.createdAt as any) : desc(schema.shippingMethods.createdAt as any);

    const items = await db
      .select({
        id: schema.shippingMethods.id,
        name: schema.shippingMethods.name,
        code: schema.shippingMethods.code,
        carrier: schema.shippingMethods.carrier,
        price: schema.shippingMethods.price,
        estimatedDays: schema.shippingMethods.estimatedDays,
        isActive: schema.shippingMethods.isActive,
        sortOrder: schema.shippingMethods.sortOrder,
        createdAt: schema.shippingMethods.createdAt,
        updatedAt: schema.shippingMethods.updatedAt,
      })
      .from(schema.shippingMethods)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.shippingMethods).where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db.select().from(schema.shippingMethods).where(eq(schema.shippingMethods.id, id)).limit(1);
    return row || null;
  }

  async create(input: {
    name: string;
    code: string;
    description?: string | null;
    carrier?: string | null;
    price: string;
    estimatedDays?: number | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const [row] = await db
      .insert(schema.shippingMethods)
      .values({
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        carrier: input.carrier ?? null,
        price: input.price as any,
        estimatedDays: input.estimatedDays ?? null,
        isActive: typeof input.isActive === "boolean" ? input.isActive : true,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return row;
  }

  async update(id: string, patch: Partial<{ name: string; code: string; description: string | null; carrier: string | null; price: string; estimatedDays: number | null; isActive: boolean; sortOrder: number }>) {
    const [row] = await db.update(schema.shippingMethods).set(patch as any).where(eq(schema.shippingMethods.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.shippingMethods).where(eq(schema.shippingMethods.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const shippingMethodsRepository = new ShippingMethodsRepository();
