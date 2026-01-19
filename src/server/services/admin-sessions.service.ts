import crypto from "crypto";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { failure, success, type ServiceResult } from "../types";
import { writeAudit } from "../utils/audit";

export type AdminSessionRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

function nowPlusDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function normalizeIp(v: string | null) {
  if (!v) return null;
  const first = v.split(",")[0]?.trim();
  return first || null;
}

const CONTROL_PANEL_PERMISSION_SLUGS = [
  "dashboard.view",
  "products.view",
  "products.manage",
  "products.create",
  "products.update",
  "products.delete",
  "categories.view",
  "categories.manage",
  "categories.create",
  "categories.update",
  "categories.delete",
  "orders.view",
  "orders.manage",
  "orders.create",
  "orders.update",
  "orders.delete",
  "refunds.view",
  "refunds.manage",
  "refunds.create",
  "refunds.update",
  "refunds.delete",
  "returns.view",
  "returns.manage",
  "returns.create",
  "returns.update",
  "returns.delete",
  "customers.view",
  "customers.manage",
  "customers.create",
  "customers.update",
  "customers.delete",
  "reviews.view",
  "reviews.manage",
  "reviews.create",
  "reviews.update",
  "reviews.delete",
  "discounts.view",
  "discounts.manage",
  "discounts.create",
  "discounts.update",
  "discounts.delete",
  "shipping.view",
  "shipping.manage",
  "shipping.create",
  "shipping.update",
  "shipping.delete",
  "users.view",
  "users.manage",
  "users.create",
  "users.update",
  "users.delete",
  "roles.view",
  "roles.manage",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.view",
  "permissions.manage",
  "permissions.create",
  "permissions.update",
  "permissions.delete",
  "settings.view",
  "settings.manage",
  "settings.create",
  "settings.update",
  "settings.delete",
  "security.view",
  "security.manage",
  "security.create",
  "security.update",
  "security.delete",
  "audit.view",
  "audit.manage",
  "audit.create",
  "audit.update",
  "audit.delete",
  "backups.view",
  "backups.manage",
  "backups.create",
  "backups.update",
  "backups.delete",
  "health.view",
  "health.manage",
  "health.create",
  "health.update",
  "health.delete",
  "support.view",
  "support.manage",
  "support.create",
  "support.update",
  "support.delete",
  "newsletter.view",
  "newsletter.manage",
  "newsletter.create",
  "newsletter.update",
  "newsletter.delete",
  "notifications.view",
  "notifications.manage",
  "notifications.create",
  "notifications.update",
  "notifications.delete",
  "emails.view",
  "emails.manage",
  "emails.create",
  "emails.update",
  "emails.delete",
  "system.logs.view",
  "system.logs.manage",
];

export class AdminSessionsService {
  private cookieName = "admin_session_token";

  getCookieName() {
    return this.cookieName;
  }

  generateToken() {
    return crypto.randomBytes(24).toString("hex");
  }

  async ping(params: {
    userId: string;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<ServiceResult<{ revoked: boolean }>> {
    try {
      const [existing] = await db
        .select({ id: schema.sessions.id, revokedAt: schema.sessions.revokedAt })
        .from(schema.sessions)
        .where(eq(schema.sessions.token, params.token))
        .limit(1);

      if (existing?.revokedAt) return success({ revoked: true });

      const stamp = new Date();

      if (!existing?.id) {
        const created = await db
          .insert(schema.sessions)
          .values({
            userId: params.userId as any,
            token: params.token,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            lastSeenAt: stamp as any,
            expiresAt: nowPlusDays(30) as any,
            updatedAt: stamp as any,
          } as any)
          .onConflictDoNothing({ target: [schema.sessions.token] })
          .returning({ id: schema.sessions.id });

        if (created?.[0]?.id) {
          await writeAudit({
            action: "login",
            resource: "admin_sessions",
            resourceId: String(created[0].id),
            userId: params.userId,
            ipAddress: normalizeIp(params.ipAddress) ?? undefined,
            userAgent: params.userAgent ?? undefined,
            metadata: { scope: "admin" },
          });
          return success({ revoked: false });
        }
      }

      await db
        .update(schema.sessions)
        .set({
          userId: params.userId as any,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          lastSeenAt: stamp as any,
          updatedAt: stamp as any,
        } as any)
        .where(eq(schema.sessions.token, params.token));

      return success({ revoked: false });
    } catch (e: any) {
      return failure("ADMIN_SESSION_PING_FAILED", e?.message || "Failed to update session");
    }
  }

  async logout(params: {
    token: string;
    actor?: { userId?: string; ip?: string | null; userAgent?: string | null };
  }): Promise<ServiceResult<{ ok: true }>> {
    try {
      const stamp = new Date();
      const [updated] = await db
        .update(schema.sessions)
        .set({ revokedAt: stamp as any, updatedAt: stamp as any } as any)
        .where(eq(schema.sessions.token, params.token))
        .returning({ id: schema.sessions.id });

      if (!updated) return success({ ok: true });

      await writeAudit({
        action: "logout",
        resource: "admin_sessions",
        resourceId: String(updated.id),
        userId: params.actor?.userId,
        ipAddress: normalizeIp(params.actor?.ip ?? null) ?? undefined,
        userAgent: params.actor?.userAgent ?? undefined,
        metadata: { scope: "admin" },
      });

      return success({ ok: true });
    } catch (e: any) {
      return failure("ADMIN_SESSION_LOGOUT_FAILED", e?.message || "Failed to logout session");
    }
  }

  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    activeWithinSec?: number;
    includeRevoked?: boolean;
  }): Promise<ServiceResult<{ items: AdminSessionRow[]; total: number }>> {
    try {
      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(200, Math.max(1, params.limit ?? 20));
      const offset = (page - 1) * limit;

      const controlPanelUserRows = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.roles.id))
        .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
        .where(sql`${schema.roles.slug} IN ${["super_admin"]} OR ${schema.permissions.slug} IN ${CONTROL_PANEL_PERMISSION_SLUGS}`)
        .groupBy(schema.userRoles.userId);

      const controlPanelUserIds = controlPanelUserRows.map((r) => String(r.userId));
      if (!controlPanelUserIds.length) return success({ items: [], total: 0 });

      const filters: any[] = [sql`${schema.sessions.userId} IN ${controlPanelUserIds}`];

      filters.push(sql`${schema.sessions.expiresAt} > now()`);

      if (!params.includeRevoked) {
        filters.push(sql`${schema.sessions.revokedAt} IS NULL`);
      }

      if (params.q) {
        const like = `%${params.q}%`;
        filters.push(sql`(${schema.users.email} ILIKE ${like} OR ${schema.users.firstName} ILIKE ${like} OR ${schema.users.lastName} ILIKE ${like})`);
      }

      if (typeof params.activeWithinSec === "number" && Number.isFinite(params.activeWithinSec) && params.activeWithinSec > 0) {
        const secs = Math.trunc(params.activeWithinSec);
        filters.push(sql`${schema.sessions.lastSeenAt} >= (now() - make_interval(secs => ${secs}))`);
      }

      const where = filters.length ? and(...filters) : undefined;

      const rows = await db
        .select({
          id: schema.sessions.id,
          userId: schema.sessions.userId,
          token: schema.sessions.token,
          ipAddress: schema.sessions.ipAddress,
          userAgent: schema.sessions.userAgent,
          lastSeenAt: schema.sessions.lastSeenAt,
          expiresAt: schema.sessions.expiresAt,
          revokedAt: schema.sessions.revokedAt,
          createdAt: schema.sessions.createdAt,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.sessions)
        .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
        .where(where as any)
        .orderBy(sql`${schema.sessions.lastSeenAt} DESC`)
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.sessions)
        .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
        .where(where as any);

      const items = rows.map((r: any) => ({
        id: String(r.id),
        userId: String(r.userId),
        userEmail: String(r.email),
        userName: `${String(r.firstName || "")} ${String(r.lastName || "")}`.trim(),
        token: String(r.token),
        ipAddress: r.ipAddress ? String(r.ipAddress) : null,
        userAgent: r.userAgent ? String(r.userAgent) : null,
        lastSeenAt: new Date(r.lastSeenAt as any),
        expiresAt: new Date(r.expiresAt as any),
        revokedAt: r.revokedAt ? new Date(r.revokedAt as any) : null,
        createdAt: new Date(r.createdAt as any),
      })) as AdminSessionRow[];

      return success({ items, total: count ?? 0 });
    } catch (e: any) {
      return failure("ADMIN_SESSION_LIST_FAILED", e?.message || "Failed to list sessions");
    }
  }

  async revoke(params: {
    sessionId: string;
    actor?: { userId?: string; ip?: string | null; userAgent?: string | null };
  }): Promise<ServiceResult<{ ok: true }>> {
    try {
      const stamp = new Date();
      const [updated] = await db
        .update(schema.sessions)
        .set({ revokedAt: stamp as any, updatedAt: stamp as any } as any)
        .where(eq(schema.sessions.id, params.sessionId as any))
        .returning({ id: schema.sessions.id });

      if (!updated) return failure("NOT_FOUND", "Session not found");

      await writeAudit({
        action: "update",
        resource: "admin_sessions",
        resourceId: params.sessionId,
        userId: params.actor?.userId,
        ipAddress: normalizeIp(params.actor?.ip ?? null) ?? undefined,
        userAgent: params.actor?.userAgent ?? undefined,
        metadata: { scope: "admin", change: "revoke" },
      });

      return success({ ok: true });
    } catch (e: any) {
      return failure("ADMIN_SESSION_REVOKE_FAILED", e?.message || "Failed to revoke session");
    }
  }
}

export const adminSessionsService = new AdminSessionsService();
