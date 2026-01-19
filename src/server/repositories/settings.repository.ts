import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema/system";
import { and, eq, ilike, sql } from "drizzle-orm";

export type SystemSetting = typeof schema.systemSettings.$inferSelect;

export class SettingsRepository {
  async list(params: { page?: number; limit?: number; q?: string; isPublic?: boolean; sort?: "createdAt.desc" | "createdAt.asc" }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.systemSettings.key} ILIKE ${like} OR ${schema.systemSettings.description} ILIKE ${like})`);
    }
    if (typeof params.isPublic === "boolean") filters.push(eq(schema.systemSettings.isPublic, params.isPublic));

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? schema.systemSettings.createdAt : sql`${schema.systemSettings.createdAt} DESC`;

    const items = await db.select().from(schema.systemSettings).where(where as any).orderBy(orderBy as any).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.systemSettings).where(where as any);
    return { items, total: count ?? 0 };
  }

  async getById(id: string) {
    const [row] = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.id, id)).limit(1);
    return row || null;
  }

  async findByKey(key: string) {
    const [row] = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, key)).limit(1);
    return row || null;
  }

  async create(input: { key: string; value: string; type?: string; description?: string | null; isPublic?: boolean }) {
    const [row] = await db
      .insert(schema.systemSettings)
      .values({ key: input.key, value: input.value, type: input.type ?? "string", description: input.description ?? null, isPublic: Boolean(input.isPublic) })
      .returning();
    return row;
  }

  async update(id: string, patch: Partial<{ key: string; value: string; type: string; description: string | null; isPublic: boolean }>) {
    const [row] = await db.update(schema.systemSettings).set(patch as any).where(eq(schema.systemSettings.id, id)).returning();
    return row || null;
  }

  async upsertByKey(key: string, data: { value: string; type?: string; description?: string | null; isPublic?: boolean }) {
    const existing = await this.findByKey(key);
    if (existing) {
      const [row] = await db
        .update(schema.systemSettings)
        .set({ value: data.value, type: data.type ?? existing.type, description: data.description ?? existing.description, isPublic: typeof data.isPublic === "boolean" ? data.isPublic : existing.isPublic })
        .where(eq(schema.systemSettings.key, key))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(schema.systemSettings)
      .values({ key, value: data.value, type: data.type ?? "string", description: data.description ?? null, isPublic: Boolean(data.isPublic) })
      .returning();
    return row;
  }

  async delete(id: string) {
    const res = await db.delete(schema.systemSettings).where(eq(schema.systemSettings.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const settingsRepository = new SettingsRepository();
