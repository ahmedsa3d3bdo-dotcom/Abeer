import { db } from "@/shared/db";
import { and, desc, eq, ilike, inArray, or, sql, gt, isNull } from "drizzle-orm";
import { notifications, emailTemplates, emailLogs } from "@/shared/db/schema/notifications";
import { users, roles, userRoles } from "@/shared/db/schema/users";
import { auditLogs } from "@/shared/db/schema/system";

export class NotificationsRepository {
  async list(params: {
    page?: number;
    limit?: number;
    sort?: "createdAt.desc" | "createdAt.asc";
    userId?: string;
    status?: string;
    type?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const where = and(
      params.userId ? eq(notifications.userId, params.userId) : undefined,
      params.status ? eq(notifications.status, params.status as any) : undefined,
      params.type ? eq(notifications.type, params.type as any) : undefined,
      params.search
        ? or(ilike(notifications.title, `%${params.search}%`), ilike(notifications.message, `%${params.search}%`))
        : undefined,
    );

    const orderBy = params.sort === "createdAt.asc" ? (notifications.createdAt as any) : desc(notifications.createdAt as any);

    const items = await db.select().from(notifications).where(where as any).orderBy(orderBy as any).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(where as any);
    return { items, total: count ?? 0 };
  }

  async listBroadcasts(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc"; type?: string; search?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conds: any[] = [eq(auditLogs.resource, "notification.broadcast") as any];
    if (params.type) {
      conds.push(sql`(audit_logs.changes ->> 'type') = ${params.type}`);
    }
    if (params.search) {
      const like = `%${params.search}%`;
      conds.push(sql`((audit_logs.changes ->> 'title') ILIKE ${like} OR (audit_logs.changes ->> 'message') ILIKE ${like})` as any);
    }
    const where = and(...conds);

    const orderBy = params.sort === "createdAt.asc" ? (auditLogs.createdAt as any) : desc(auditLogs.createdAt as any);

    const rows = await db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        changes: auditLogs.changes,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    let items = rows.map((r) => {
      const changes = (r as any).changes || {};
      const meta = (r as any).metadata || {};
      const roleSlugs = Array.isArray(meta.roleSlugs) ? meta.roleSlugs : [];
      const target = meta.all ? "All users" : roleSlugs.join(", ");
      const targetedCount = Number(meta.targetedCount ?? meta.usersCount ?? 0) || 0;
      const createdCount = Number(meta.createdCount ?? meta.count ?? 0) || 0;
      return {
        id: r.id as any,
        type: (changes.type as string) || "",
        title: (changes.title as string) || "",
        message: (changes.message as string) || "",
        actionUrl: (changes.actionUrl as string) || null,
        target,
        count: targetedCount || createdCount,
        targetedCount,
        createdCount,
        createdAt: r.createdAt as any,
      };
    });

    let total = 0;
    if (items.length === 0) {
      const whereParts: any[] = [];
      if (params.type) whereParts.push(eq(notifications.type, params.type as any));
      if (params.search) {
        const like = `%${params.search}%`;
        whereParts.push(or(ilike(notifications.title, like), ilike(notifications.message, like)) as any);
      }
      const whereFallback = whereParts.length ? and(...whereParts) : undefined;

      const fallbackRowsRes = await db.execute(sql`
        SELECT
          MAX(${notifications.createdAt}) AS created_at,
          ${notifications.type} AS type,
          ${notifications.title} AS title,
          ${notifications.message} AS message,
          ${notifications.actionUrl} AS action_url,
          COUNT(*)::int AS count
        FROM ${notifications}
        ${whereFallback ? sql`WHERE ${whereFallback}` : sql``}
        GROUP BY ${notifications.type}, ${notifications.title}, ${notifications.message}, ${notifications.actionUrl}, date_trunc('minute', ${notifications.createdAt})
        ORDER BY created_at ${params.sort === "createdAt.asc" ? sql`ASC` : sql`DESC`}
        LIMIT ${limit} OFFSET ${offset}
      `);
      const fallbackRows = (fallbackRowsRes as any).rows as any[];

      const fallbackCountRes = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT 1
          FROM ${notifications}
          ${whereFallback ? sql`WHERE ${whereFallback}` : sql``}
          GROUP BY ${notifications.type}, ${notifications.title}, ${notifications.message}, ${notifications.actionUrl}, date_trunc('minute', ${notifications.createdAt})
        ) AS g
      `);
      const fallbackCountRows = (fallbackCountRes as any).rows as any[];

      items = fallbackRows.map((r: any) => ({
        id: `${r.type}:${r.title}:${r.message}:${r.created_at}`,
        type: r.type,
        title: r.title,
        message: r.message,
        actionUrl: r.action_url ?? null,
        target: "Legacy broadcast",
        count: r.count ?? 0,
        createdAt: r.created_at,
      }));
      total = (Array.isArray(fallbackCountRows) && Number((fallbackCountRows[0] as any)?.total)) || 0;
    } else {
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where as any);
      total = count ?? 0;
    }
    return { items, total };
  }

  async create(input: { userId: string; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }) {
    const [row] = await db
      .insert(notifications)
      .values({ userId: input.userId, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null, metadata: input.metadata ?? null })
      .returning();
    return row;
  }

  async createMany(input: { userIds: string[]; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }) {
    if (!input.userIds?.length) return { count: 0, items: [] as any[] };
    // dedupe within short window to avoid accidental double-sends
    const windowStart = new Date(Date.now() - 10 * 60 * 1000);
    const existing = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(
        and(
          inArray(notifications.userId, input.userIds),
          eq(notifications.type, input.type as any),
          eq(notifications.title, input.title),
          eq(notifications.message, input.message),
          // consider actionUrl as part of identity
          (input.actionUrl ? eq(notifications.actionUrl, input.actionUrl) : isNull(notifications.actionUrl)),
          gt(notifications.createdAt, windowStart as any),
        ) as any,
      );
    const already = new Set(existing.map((r) => r.userId));
    const remainingUserIds = input.userIds.filter((id) => !already.has(id));
    if (!remainingUserIds.length) return { count: 0, items: [] as any[] };

    const values = remainingUserIds.map((uid) => ({
      userId: uid,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? null,
    }));
    const rows = await db
      .insert(notifications)
      .values(values)
      .onConflictDoNothing({ target: [notifications.userId, notifications.type, notifications.title, notifications.message] })
      .returning();
    return { count: rows.length, items: rows } as { count: number; items: (typeof notifications)["$inferSelect"][] };
  }

  async markRead(id: string) {
    const [row] = await db.update(notifications).set({ status: "read" as any, readAt: new Date() }).where(eq(notifications.id, id)).returning();
    return row;
  }

  async markAllRead(userId: string) {
    const res = await db.update(notifications).set({ status: "read" as any, readAt: new Date() }).where(eq(notifications.userId, userId));
    return res.rowCount ?? 0;
  }

  async markReadMany(userId: string, ids: string[]) {
    const clean = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!clean.length) return 0;
    const res = await db
      .update(notifications)
      .set({ status: "read" as any, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), inArray(notifications.id, clean)) as any);
    return res.rowCount ?? 0;
  }

  async unreadSummaryByType(userId: string, types?: string[]) {
    const list = Array.isArray(types) ? types.filter(Boolean) : [];
    const where = and(
      eq(notifications.userId, userId),
      eq(notifications.status, "unread" as any),
      list.length ? inArray(notifications.type, list as any) : undefined,
    );
    const rows = await db
      .select({ type: notifications.type, count: sql<number>`count(*)` })
      .from(notifications)
      .where(where as any)
      .groupBy(notifications.type);
    const byType: Record<string, number> = {};
    let totalUnread = 0;
    for (const r of rows) {
      const c = Number((r as any).count || 0);
      byType[String((r as any).type)] = c;
      totalUnread += c;
    }
    return { totalUnread, byType };
  }

  async archive(id: string) {
    const [row] = await db.update(notifications).set({ status: "archived" as any }).where(eq(notifications.id, id)).returning();
    return row;
  }

  async remove(id: string) {
    const res = await db.delete(notifications).where(eq(notifications.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }

  async getActiveUserIdsByRoleSlug(roleSlug: string) {
    const rows = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(roles.slug, roleSlug), eq(users.isActive, true)));
    return rows.map((r) => r.userId);
  }

  async getActiveUserIdsByRoleSlugs(roleSlugs: string[]) {
    if (!roleSlugs.length) return [] as string[];
    const rows = await db
      .selectDistinct({ userId: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(inArray(roles.slug, roleSlugs), eq(users.isActive, true)));
    return rows.map((r) => r.userId);
  }

  async getAllActiveUserIds() {
    const rows = await db.select({ userId: users.id }).from(users).where(eq(users.isActive, true));
    return rows.map((r) => r.userId);
  }
}

export class EmailsRepository {
  async listTemplates(params: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;
    const where = and(
      typeof params.isActive === "boolean" ? eq(emailTemplates.isActive, params.isActive) : undefined,
      params.search ? or(ilike(emailTemplates.name, `%${params.search}%`), ilike(emailTemplates.slug, `%${params.search}%`)) : undefined,
    );
    const items = await db.select().from(emailTemplates).where(where as any).orderBy(desc(emailTemplates.updatedAt as any)).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(emailTemplates).where(where as any);
    return { items, total: count ?? 0 };
  }

  async getTemplate(id: string) {
    const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
    return row || null;
  }

  async createTemplate(input: { name: string; slug: string; subject: string; body: string; variables?: Record<string, string>; isActive?: boolean }) {
    const [row] = await db
      .insert(emailTemplates)
      .values({ name: input.name, slug: input.slug, subject: input.subject, body: input.body, variables: (input.variables as any) ?? null, isActive: Boolean(input.isActive ?? true) })
      .returning();
    return row;
  }

  async updateTemplate(id: string, patch: Partial<{ name: string; slug: string; subject: string; body: string; variables: Record<string, string>; isActive: boolean }>) {
    const [row] = await db.update(emailTemplates).set(patch as any).where(eq(emailTemplates.id, id)).returning();
    return row || null;
  }

  async deleteTemplate(id: string) {
    const res = await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }

  async listLogs(params: { page?: number; limit?: number; to?: string; status?: string; search?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;
    const where = and(
      params.to ? ilike(emailLogs.to, `%${params.to}%`) : undefined,
      params.status ? eq(emailLogs.status, params.status as any) : undefined,
      params.search ? or(ilike(emailLogs.subject, `%${params.search}%`), ilike(emailLogs.body, `%${params.search}%`)) : undefined,
    );
    const items = await db.select().from(emailLogs).where(where as any).orderBy(desc(emailLogs.createdAt as any)).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(emailLogs).where(where as any);
    return { items, total: count ?? 0 };
  }

  async logEmail(input: {
    userId?: string | null;
    templateId?: string | null;
    to: string;
    from: string;
    subject: string;
    body: string;
    status: "pending" | "sent" | "failed" | "bounced";
    error?: string | null;
    metadata?: any;
    sentAt?: Date | null;
  }) {
    const [row] = await db
      .insert(emailLogs)
      .values({
        userId: (input.userId as any) ?? null,
        templateId: (input.templateId as any) ?? null,
        to: input.to,
        from: input.from,
        subject: input.subject,
        body: input.body,
        status: input.status as any,
        error: input.error ?? null,
        metadata: (input.metadata as any) ?? null,
        sentAt: input.sentAt ?? null,
      })
      .returning();
    return row;
  }

  async updateLog(id: string, patch: Partial<{ status: string; error: string | null; sentAt: Date | null; metadata: any }>) {
    const [row] = await db.update(emailLogs).set(patch as any).where(eq(emailLogs.id, id)).returning();
    return row || null;
  }
}

export const notificationsRepository = new NotificationsRepository();
export const emailsRepository = new EmailsRepository();
