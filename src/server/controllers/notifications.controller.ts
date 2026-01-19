import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notificationsService } from "../services/notifications.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";

const notificationTypeValues = [
  "order_created",
  "order_updated",
  "order_shipped",
  "order_delivered",
  "product_review",
  "customer_registered",
  "shipment_created",
  "newsletter_subscribed",
  "contact_message",
  "low_stock",
  "system_alert",
  "promotional",
] as const;

const notificationTypeSet = new Set<string>(notificationTypeValues as unknown as string[]);

function sanitizeNotificationType(type: unknown) {
  const v = String(type ?? "").trim();
  if (!v) return undefined;
  return notificationTypeSet.has(v) ? v : undefined;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  scope: z.enum(["mine", "all"]).optional(),
});

const createSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(notificationTypeValues),
  title: z.string().min(1),
  message: z.string().min(1),
  actionUrl: z.string().url().optional(),
  metadata: z.any().optional(),
});

const broadcastSchema = z
  .object({
    roleSlug: z.string().min(1).optional(),
    roleSlugs: z.array(z.string().min(1)).optional(),
    all: z.coerce.boolean().optional(),
    type: z.enum(notificationTypeValues),
    title: z.string().min(1),
    message: z.string().min(1),
    actionUrl: z.string().url().optional(),
    metadata: z.any().optional(),
  })
  .refine((d) => Boolean(d.all) || Boolean(d.roleSlug) || Boolean(d.roleSlugs && d.roleSlugs.length), {
    message: "Provide 'all' or at least one role",
    path: ["roleSlugs"],
  });

export class NotificationsController {
  static async list(request: NextRequest) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const query = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const effective = { ...query } as any;
      effective.type = sanitizeNotificationType(query.type);
      if (query.scope === "mine" && !query.userId) {
        effective.userId = (session.user as any)?.id;
      }
      const result =
        query.scope === "all"
          ? await notificationsService.listBroadcasts({ page: effective.page, limit: effective.limit, sort: effective.sort, type: effective.type, search: effective.search })
          : await notificationsService.list(effective);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "notifications.manage");
      const body = await request.json().catch(() => ({}));
      const input = createSchema.parse(body || {});
      const result = await notificationsService.create(input, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async markRead(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const result = await notificationsService.markRead(id, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async markAll(request: NextRequest) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const userId = (session.user as any)?.id as string;
      const result = await notificationsService.markAllRead(userId, {
        userId,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async archive(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const result = await notificationsService.archive(id, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const result = await notificationsService.remove(id, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async broadcastToRole(request: NextRequest) {
    try {
      const session = await requirePermission(request, "notifications.manage");
      const body = await request.json().catch(() => ({}));
      const input = broadcastSchema.parse(body || {});
      const roleSlugs = input.all ? [] : input.roleSlugs ?? (input.roleSlug ? [input.roleSlug] : []);
      const result = await notificationsService.sendToRoles(
        { all: Boolean(input.all), roleSlugs, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl, metadata: input.metadata },
        {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        },
      );
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      const session = await requirePermission(request, "notifications.view");
      const query = listQuerySchema.partial().parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const safeType = sanitizeNotificationType(query.type);

      const filters: any[] = [];
      let effectiveScope: "mine" | "all" = (query.scope as any) || "mine";
      let effectiveUserId: string | undefined = (query.userId as any) || undefined;
      if (effectiveScope === "mine" && !effectiveUserId) {
        effectiveUserId = (session.user as any)?.id as string;
      }
      if (effectiveUserId) filters.push(sql`${schema.notifications.userId} = ${effectiveUserId}`);
      if (query.status) filters.push(sql`${schema.notifications.status} = ${query.status}`);
      if (safeType) filters.push(sql`${schema.notifications.type} = ${safeType}`);
      if ((query as any).search) {
        const like = `%${(query as any).search}%`;
        filters.push(sql`(${schema.notifications.title} ILIKE ${like} OR ${schema.notifications.message} ILIKE ${like})`);
      }
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ total }] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(schema.notifications)
        .where(where as any);

      const [{ unread }] = await db
        .select({ unread: sql<number>`COUNT(*)` })
        .from(schema.notifications)
        .where(sql`${schema.notifications.status} = 'unread' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ read }] = await db
        .select({ read: sql<number>`COUNT(*)` })
        .from(schema.notifications)
        .where(sql`${schema.notifications.status} = 'read' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ archived }] = await db
        .select({ archived: sql<number>`COUNT(*)` })
        .from(schema.notifications)
        .where(sql`${schema.notifications.status} = 'archived' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ last30d }] = await db
        .select({ last30d: sql<number>`COUNT(*)` })
        .from(schema.notifications)
        .where(sql`${schema.notifications.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      // Distinct users (only meaningful when scope = all)
      const distinctUsers = effectiveScope === "all"
        ? Number(((await db.select({ c: sql<number>`COUNT(DISTINCT ${schema.notifications.userId})` }).from(schema.notifications).where(where as any)) as any)[0]?.c || 0)
        : undefined;

      const readRate = Number(total || 0) ? Math.round((Number(read || 0) / Number(total || 0)) * 100) : 0;

      return successResponse({
        total: Number(total || 0),
        unread: Number(unread || 0),
        read: Number(read || 0),
        archived: Number(archived || 0),
        last30d: Number(last30d || 0),
        distinctUsers,
        readRate,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
