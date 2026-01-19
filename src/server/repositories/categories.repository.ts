import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";

export class CategoriesRepository {
  async list(params: { page?: number; limit?: number; q?: string; isActive?: boolean; parentId?: string | null; sort?: "createdAt.desc" | "createdAt.asc" }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(ilike(schema.categories.name, like));
    }
    if (typeof params.isActive === "boolean") filters.push(eq(schema.categories.isActive, params.isActive));
    if (typeof params.parentId !== "undefined") {
      if (params.parentId === null) filters.push(sql`${schema.categories.parentId} IS NULL`);
      else filters.push(eq(schema.categories.parentId, params.parentId));
    }
    const where = filters.length ? and(...filters) : undefined as any;

    const orderBy = params.sort === "createdAt.asc" ? (schema.categories.createdAt as any) : sql`${schema.categories.createdAt} DESC`;

    const items = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        description: schema.categories.description,
        image: schema.categories.image,
        parentId: schema.categories.parentId,
        sortOrder: schema.categories.sortOrder,
        isActive: schema.categories.isActive,
        createdAt: schema.categories.createdAt,
        updatedAt: schema.categories.updatedAt,
      })
      .from(schema.categories)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.categories).where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
    return row || null;
  }

  async create(input: {
    name: string;
    slug?: string;
    description?: string | null;
    image?: string | null;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [row] = await db
      .insert(schema.categories)
      .values({
        name: input.name,
        slug,
        description: input.description ?? null,
        image: input.image ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: typeof input.isActive === "boolean" ? input.isActive : true,
      })
      .returning();
    return row;
  }

  async update(id: string, patch: Partial<{ name: string; slug: string; description: string | null; image: string | null; parentId: string | null; sortOrder: number; isActive: boolean }>) {
    if (typeof patch.slug === "string" && patch.slug) {
      patch.slug = patch.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    const [row] = await db.update(schema.categories).set(patch as any).where(eq(schema.categories.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.categories).where(eq(schema.categories.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const categoriesRepository = new CategoriesRepository();
