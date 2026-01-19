import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface RoleEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ id: string; name: string; slug: string; resource: string; action: string }>;
}

export class RoleRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    isSystem?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }): Promise<{ items: RoleEntity[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.roles.name} ILIKE ${like} OR ${schema.roles.slug} ILIKE ${like})`);
    }
    if (typeof params.isSystem === "boolean") {
      filters.push(eq(schema.roles.isSystem, params.isSystem));
    }
    if (params.dateFrom) filters.push(sql`${schema.roles.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.roles.createdAt} <= ${new Date(params.dateTo)}`);
    const where = filters.length ? and(...filters) : undefined as any;

    const orderBy = params.sort === "createdAt.asc" ? schema.roles.createdAt : sql`${schema.roles.createdAt} DESC`;

    const rows = await db.select().from(schema.roles).where(where as any).orderBy(orderBy as any).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.roles).where(where as any);

    const roleIds = rows.map((r: any) => r.id);
    const map = new Map<string, RoleEntity["permissions"]>();
    if (roleIds.length) {
      const pRows = await db
        .select({
          roleId: schema.rolePermissions.roleId,
          id: schema.permissions.id,
          name: schema.permissions.name,
          slug: schema.permissions.slug,
          resource: schema.permissions.resource,
          action: schema.permissions.action,
        })
        .from(schema.rolePermissions)
        .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
        .where(sql`${schema.rolePermissions.roleId} IN ${roleIds}`);
      for (const r of pRows) {
        const list = map.get(r.roleId) ?? [];
        list.push({ id: r.id, name: r.name, slug: r.slug, resource: r.resource, action: r.action });
        map.set(r.roleId, list);
      }
    }

    const items: RoleEntity[] = (rows as any[]).map((r) => ({ ...r, permissions: map.get(r.id) ?? [] }));
    return { items, total: count ?? 0 };
  }

  async getById(id: string): Promise<RoleEntity | null> {
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    if (!role) return null;
    const perms = await db
      .select({ id: schema.permissions.id, name: schema.permissions.name, slug: schema.permissions.slug, resource: schema.permissions.resource, action: schema.permissions.action })
      .from(schema.rolePermissions)
      .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.rolePermissions.roleId, role.id));
    return { ...(role as any), permissions: perms } as RoleEntity;
  }

  async create(input: { name: string; slug: string; description?: string | null; isSystem?: boolean; permissions?: string[] }): Promise<RoleEntity> {
    const [r] = await db
      .insert(schema.roles)
      .values({ name: input.name, slug: input.slug, description: input.description ?? null, isSystem: Boolean(input.isSystem) })
      .returning();
    if (input.permissions?.length) await this.setPermissions(r.id, input.permissions);
    const item = await this.getById(r.id);
    return item as RoleEntity;
  }

  async update(id: string, input: Partial<{ name: string; slug: string; description: string | null; isSystem: boolean; permissions: string[] }>): Promise<RoleEntity | null> {
    const patch: any = {};
    if (typeof input.name !== "undefined") patch.name = input.name;
    if (typeof input.slug !== "undefined") patch.slug = input.slug;
    if (typeof input.description !== "undefined") patch.description = input.description;
    if (typeof input.isSystem === "boolean") patch.isSystem = input.isSystem;
    if (Object.keys(patch).length) await db.update(schema.roles).set(patch).where(eq(schema.roles.id, id));
    if (Array.isArray(input.permissions)) await this.setPermissions(id, input.permissions);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(schema.roles).where(eq(schema.roles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async setPermissions(roleId: string, permissionSlugs: string[]): Promise<void> {
    await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));
    if (!permissionSlugs?.length) return;
    const perms = await db.select().from(schema.permissions).where(sql`${schema.permissions.slug} IN ${permissionSlugs}`);
    if (perms.length) {
      await db.insert(schema.rolePermissions).values(perms.map((p: any) => ({ roleId, permissionId: p.id })));
    }
  }

  async countUsers(roleId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.roleId, roleId));
    return count ?? 0;
  }
}

export const roleRepository = new RoleRepository();
