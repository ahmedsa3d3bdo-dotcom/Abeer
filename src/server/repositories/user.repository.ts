import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { BaseRepositoryImpl } from "./base.repository";
import type { AuthUser } from "../types";

export interface UserWithRoles {
  id: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  permissions: Array<{
    id: string;
    slug: string;
    resource: string;
    action: string;
  }>;
}

export class UserRepository extends BaseRepositoryImpl<any> {
  constructor() {
    super(schema.users);
  }

  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    role?: string;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }): Promise<{ items: UserWithRoles[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    // If a role filter is provided, pre-compute user IDs that have this role
    let roleUserIds: string[] | null = null;
    if (params.role) {
      const roleMatches = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .where(eq(schema.roles.slug, params.role));
      const ids = roleMatches.map((r: any) => r.userId);
      if (ids.length === 0) {
        return { items: [], total: 0 };
      }
      roleUserIds = ids;
    }

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.users.email} ILIKE ${like} OR ${schema.users.firstName} ILIKE ${like} OR ${schema.users.lastName} ILIKE ${like})`);
    }
    if (typeof params.isActive === "boolean") {
      filters.push(eq(schema.users.isActive, params.isActive));
    }
    if (params.dateFrom) {
      filters.push(sql`${schema.users.createdAt} >= ${new Date(params.dateFrom)}`);
    }
    if (params.dateTo) {
      filters.push(sql`${schema.users.createdAt} <= ${new Date(params.dateTo)}`);
    }
    if (roleUserIds) {
      filters.push(sql`${schema.users.id} IN ${roleUserIds}`);
    }

    const where = filters.length ? and(...filters) : undefined as any;

    const orderBy = params.sort === "createdAt.asc" ? schema.users.createdAt : sql`${schema.users.createdAt} DESC`;

    const itemsRaw = await db
      .select()
      .from(schema.users)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(where as any);

    const userIds = itemsRaw.map((u: any) => u.id);
    let rolesMap = new Map<string, { id: string; name: string; slug: string }[]>();
    if (userIds.length) {
      const rows = await db
        .select({
          userId: schema.userRoles.userId,
          roleId: schema.roles.id,
          roleName: schema.roles.name,
          roleSlug: schema.roles.slug,
        })
        .from(schema.userRoles)
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .where(sql`${schema.userRoles.userId} IN ${userIds}`);

      for (const r of rows) {
        const list = rolesMap.get(r.userId) ?? [];
        list.push({ id: r.roleId, name: r.roleName, slug: r.roleSlug });
        rolesMap.set(r.userId, list);
      }
    }

    let items = (itemsRaw as any[]).map((u) => ({
      ...u,
      roles: rolesMap.get(u.id) ?? [],
      permissions: [],
    })) as UserWithRoles[];

    // No need to filter by role here since it's pushed to the DB-level filter above.

    return { items, total: count ?? 0 };
  }

  async getById(id: string): Promise<UserWithRoles | null> {
    return this.findByIdWithRoles(id);
  }

  async updateUser(id: string, data: Partial<{ email: string; password: string; firstName: string; lastName: string; isActive: boolean; avatar: string }>): Promise<UserWithRoles | null> {
    const [updated] = await db.update(schema.users).set(data as any).where(eq(schema.users.id, id)).returning();
    if (!updated) return null;
    return this.findByIdWithRoles(id);
  }

  async setUserRoles(userId: string, roleSlugs: string[]): Promise<void> {
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    if (!roleSlugs?.length) return;
    const roles = await db.select().from(schema.roles).where(sql`${schema.roles.slug} IN ${roleSlugs}`);
    if (roles.length) {
      await db.insert(schema.userRoles).values(roles.map((r: any) => ({ userId, roleId: r.id })));
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(schema.users).where(eq(schema.users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserWithRoles | null> {
    // Get user
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (!user) return null;

    // Get user roles
    const userRoles = await db
      .select({
        roleId: schema.userRoles.roleId,
        roleName: schema.roles.name,
        roleSlug: schema.roles.slug,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, user.id));

    // Get permissions for these roles
    const roleIds = userRoles.map((r) => r.roleId);
    const permissions =
      roleIds.length > 0
        ? await db
            .select({
              id: schema.permissions.id,
              slug: schema.permissions.slug,
              resource: schema.permissions.resource,
              action: schema.permissions.action,
            })
            .from(schema.rolePermissions)
            .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
            .where(sql`${schema.rolePermissions.roleId} IN ${roleIds}`)
        : [];

    return {
      ...user,
      roles: userRoles.map((r) => ({
        id: r.roleId,
        name: r.roleName,
        slug: r.roleSlug,
      })),
      permissions: permissions,
    };
  }

  /**
   * Find user by ID with roles and permissions
   */
  async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    // Get user
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);

    if (!user) return null;

    // Get user roles
    const userRoles = await db
      .select({
        roleId: schema.userRoles.roleId,
        roleName: schema.roles.name,
        roleSlug: schema.roles.slug,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, user.id));

    // Get permissions for these roles
    const roleIds = userRoles.map((r) => r.roleId);
    const permissions =
      roleIds.length > 0
        ? await db
            .select({
              id: schema.permissions.id,
              slug: schema.permissions.slug,
              resource: schema.permissions.resource,
              action: schema.permissions.action,
            })
            .from(schema.rolePermissions)
            .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
            .where(sql`${schema.rolePermissions.roleId} IN ${roleIds}`)
        : [];

    return {
      ...user,
      roles: userRoles.map((r) => ({
        id: r.roleId,
        name: r.roleName,
        slug: r.roleSlug,
      })),
      permissions: permissions,
    };
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ id: string; email: string }> {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: true,
        emailVerified: false,
      })
      .returning({ id: schema.users.id, email: schema.users.email });

    return user;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleSlug: string): Promise<void> {
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.slug, roleSlug)).limit(1);

    if (!role) {
      throw new Error(`Role ${roleSlug} not found`);
    }

    await db.insert(schema.userRoles).values({
      userId,
      roleId: role.id,
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    await db
      .update(schema.users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await db
      .update(schema.users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.users).where(eq(schema.users.email, email));
    return (result?.count ?? 0) > 0;
  }

  /**
   * Convert to AuthUser format
   */
  toAuthUser(user: UserWithRoles): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      roles: user.roles.map((r) => r.slug),
      permissions: user.permissions.map((p) => p.slug),
    };
  }
}

// Singleton instance
export const userRepository = new UserRepository();
