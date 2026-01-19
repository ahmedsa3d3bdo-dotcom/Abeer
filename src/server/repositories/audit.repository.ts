import { db } from "@/shared/db";
import { auditLogs } from "@/shared/db/schema/system";
import { auditActionEnum } from "@/shared/db/enums";
import { users } from "@/shared/db/schema/users";
import { and, eq, sql } from "drizzle-orm";

export class AuditRepository {
  async list(params: { page?: number; limit?: number; userId?: string; user?: string; action?: string; resource?: string; dateFrom?: string; dateTo?: string; q?: string; sort?: "createdAt.desc" | "createdAt.asc" }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    const actionRaw = params.action ? String(params.action).trim().toLowerCase() : "";
    const action = actionRaw && auditActionEnum.enumValues.includes(actionRaw as any) ? actionRaw : undefined;

    const filters: any[] = [];
    if (params.userId) filters.push(eq(auditLogs.userId, params.userId));
    if (action) filters.push(eq(auditLogs.action, action as any));
    if (params.resource) {
      const likeResource = `%${String(params.resource).trim()}%`;
      filters.push(sql`${auditLogs.resource} ILIKE ${likeResource}`);
    }
    if (params.dateFrom) filters.push(sql`${auditLogs.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${auditLogs.createdAt} <= ${new Date(params.dateTo)}`);
    if (params.q) filters.push(sql`(${auditLogs.ipAddress} ILIKE ${`%${params.q}%`} OR ${auditLogs.userAgent} ILIKE ${`%${params.q}%`})`);
    if (params.user) {
      const likeUser = `%${String(params.user).trim()}%`;
      filters.push(sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${auditLogs.userId} AND ${users.email} ILIKE ${likeUser})`);
    }

    let where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? auditLogs.createdAt : sql`${auditLogs.createdAt} DESC`;

    const items = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where as any);
    return { items, total: count ?? 0 };
  }
}

export const auditRepository = new AuditRepository();
