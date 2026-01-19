import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface PermissionEntity {
  id: string;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    resource?: string;
    action?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }): Promise<{ items: PermissionEntity[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.permissions.name} ILIKE ${like} OR ${schema.permissions.slug} ILIKE ${like})`);
    }
    if (params.resource) filters.push(eq(schema.permissions.resource, params.resource));
    if (params.action) filters.push(eq(schema.permissions.action, params.action));
    const where = filters.length ? and(...filters) : undefined as any;

    const orderBy = params.sort === "createdAt.asc" ? schema.permissions.createdAt : sql`${schema.permissions.createdAt} DESC`;

    const items = (await db
      .select()
      .from(schema.permissions)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset)) as any as PermissionEntity[];

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.permissions).where(where as any);
    return { items, total: count ?? 0 };
  }

  async getById(id: string): Promise<PermissionEntity | null> {
    const [row] = await db.select().from(schema.permissions).where(eq(schema.permissions.id, id)).limit(1);
    return (row as any) || null;
  }

  async create(input: { name: string; slug: string; resource: string; action: string; description?: string | null }): Promise<PermissionEntity> {
    const [r] = await db
      .insert(schema.permissions)
      .values({ name: input.name, slug: input.slug, resource: input.resource, action: input.action, description: input.description ?? null })
      .returning();
    return r as any;
  }

  async update(id: string, input: Partial<{ name: string; slug: string; resource: string; action: string; description: string | null }>): Promise<PermissionEntity | null> {
    const patch: any = {};
    if (typeof input.name !== "undefined") patch.name = input.name;
    if (typeof input.slug !== "undefined") patch.slug = input.slug;
    if (typeof input.resource !== "undefined") patch.resource = input.resource;
    if (typeof input.action !== "undefined") patch.action = input.action;
    if (typeof input.description !== "undefined") patch.description = input.description;
    const [r] = await db.update(schema.permissions).set(patch).where(eq(schema.permissions.id, id)).returning();
    return (r as any) || null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await db.delete(schema.permissions).where(eq(schema.permissions.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }

  async distinctResources(): Promise<string[]> {
    const rows = await db.select({ resource: schema.permissions.resource }).from(schema.permissions).groupBy(schema.permissions.resource);
    return rows.map((r: any) => r.resource).filter(Boolean);
  }

  async countRolesByPermissionId(permissionId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.permissionId, permissionId));
    return count ?? 0;
  }
}

export const permissionRepository = new PermissionRepository();
