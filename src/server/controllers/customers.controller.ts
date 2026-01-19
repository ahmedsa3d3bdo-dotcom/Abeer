import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userService } from "../services/user.service";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery, validateBody } from "../utils/validation";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { requirePermission } from "../utils/rbac";
import { writeAudit } from "../utils/audit";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const upsertSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export class CustomersController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "customers.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await userService.list({ ...query, role: "user" });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      const items = result.data.items || [];
      const userIds = items.map((u: any) => u.id).filter(Boolean);
      let aggMap = new Map<string, { ordersCount: number; totalSpent: number; avgOrderValue: number; lastOrderAt: Date | null }>();
      if (userIds.length) {
        const rows = await db
          .select({
            userId: schema.orders.userId,
            ordersCount: sql<number>`count(*)`,
            totalSpent: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), '0')`,
            avgOrderValue: sql<string>`COALESCE(AVG(${schema.orders.totalAmount}), '0')`,
            lastOrderAt: sql<Date>`MAX(${schema.orders.createdAt})`,
          })
          .from(schema.orders)
          .where(sql`${schema.orders.userId} IN ${userIds}`)
          .groupBy(schema.orders.userId as any);
        for (const r of rows as any[]) {
          aggMap.set(r.userId, {
            ordersCount: Number(r.ordersCount || 0),
            totalSpent: Number(r.totalSpent || 0),
            avgOrderValue: Number(r.avgOrderValue || 0),
            lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
          });
        }
      }
      const enriched = items.map((u: any) => {
        const agg = aggMap.get(u.id) || { ordersCount: 0, totalSpent: 0, avgOrderValue: 0, lastOrderAt: null };
        return { ...u, ...agg };
      });
      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";
      return successResponse({ items: enriched, total: result.data.total, currency });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "customers.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await userService.create({ ...body, roles: ["user"] });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      const changes: any = { ...(body as any) };
      if (typeof changes.password === "string" && changes.password) changes.password = "[REDACTED]";
      await writeAudit({
        action: "create",
        resource: "customers",
        resourceId: (result.data as any)?.id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes,
      });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(_request: NextRequest, id: string) {
    try {
      await requirePermission(_request as any, "customers.view");
      const result = await userService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      // Aggregates
      const [agg] = await db
        .select({
          ordersCount: sql<number>`count(*)`,
          totalSpent: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), '0')`,
          avgOrderValue: sql<string>`COALESCE(AVG(${schema.orders.totalAmount}), '0')`,
          lastOrderAt: sql<Date>`MAX(${schema.orders.createdAt})`,
          firstOrderAt: sql<Date>`MIN(${schema.orders.createdAt})`,
        })
        .from(schema.orders)
        .where(sql`${schema.orders.userId} = ${id}`);

      // Refunded total across user's orders
      const [refAgg] = await db
        .select({ refundedTotal: sql<string>`COALESCE(SUM(${schema.refunds.amount}), '0')` })
        .from(schema.refunds)
        .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.refunds.orderId}` as any)
        .where(sql`${schema.orders.userId} = ${id}`);

      // Default addresses
      const [shipping] = await db
        .select()
        .from(schema.shippingAddresses)
        .where(sql`${schema.shippingAddresses.userId} = ${id} AND ${schema.shippingAddresses.isDefault} = true`)
        .limit(1);
      const [billing] = await db
        .select()
        .from(schema.billingAddresses)
        .where(sql`${schema.billingAddresses.userId} = ${id} AND ${schema.billingAddresses.isDefault} = true`)
        .limit(1);

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      return successResponse({
        user: result.data,
        aggregates: {
          ordersCount: Number((agg as any)?.ordersCount || 0),
          totalSpent: Number((agg as any)?.totalSpent || 0),
          avgOrderValue: Number((agg as any)?.avgOrderValue || 0),
          lastOrderAt: (agg as any)?.lastOrderAt ? new Date((agg as any).lastOrderAt) : null,
          firstOrderAt: (agg as any)?.firstOrderAt ? new Date((agg as any).firstOrderAt) : null,
          refundedTotal: Number((refAgg as any)?.refundedTotal || 0),
        },
        shippingAddress: shipping || null,
        billingAddress: billing || null,
        currency,
      });
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "customers.manage");
      const body = await validateBody(request, upsertSchema.partial());
      const result = await userService.update(id, { ...body });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      const changes: any = { ...(body as any) };
      if (typeof changes.password === "string" && changes.password) changes.password = "[REDACTED]";
      await writeAudit({
        action: "update",
        resource: "customers",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(_request: NextRequest, id: string) {
    try {
      const session = await requirePermission(_request as any, "customers.manage");
      const result = await userService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "customers",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(_request.headers.get("x-forwarded-for") || _request.headers.get("x-real-ip")),
        userAgent: _request.headers.get("user-agent") || undefined,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "customers.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      // Role filter: only customers (role = user)
      const roleRows = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .innerJoin(schema.roles, sql`${schema.userRoles.roleId} = ${schema.roles.id}` as any)
        .where(sql`${schema.roles.slug} = 'user'`);
      const roleUserIds = roleRows.map((r: any) => r.userId);
      if (roleUserIds.length === 0) {
        const currencySetting = await settingsRepository.findByKey("currency");
        const currency = currencySetting?.value || "CAD";
        return successResponse({
          totalCustomers: 0,
          activeCustomers: 0,
          newCustomers30d: 0,
          ordersCount: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          returningCustomers: 0,
          returningRate: 0,
          activeRate: 0,
          last30dOrdersCount: 0,
          currency,
        });
      }

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.users.email} ILIKE ${like} OR ${schema.users.firstName} ILIKE ${like} OR ${schema.users.lastName} ILIKE ${like})`);
      }
      if (typeof query.isActive === "boolean") filters.push(sql`${schema.users.isActive} = ${query.isActive}`);
      if (query.dateFrom) filters.push(sql`${schema.users.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.users.createdAt} <= ${new Date(query.dateTo)}`);
      // Restrict to role customers
      filters.push(sql`${schema.users.id} IN ${roleUserIds}`);
      const whereUsers = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ total: totalCustomers }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(schema.users)
        .where(whereUsers as any);

      const [{ active: activeCustomers }] = await db
        .select({ active: sql<number>`count(*)` })
        .from(schema.users)
        .where(sql`${schema.users.isActive} = true AND ${whereUsers ? sql`(${whereUsers})` : sql`true`}` as any);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ recent: newCustomers30d }] = await db
        .select({ recent: sql<number>`count(*)` })
        .from(schema.users)
        .where(sql`${schema.users.createdAt} >= ${thirtyDaysAgo} AND ${whereUsers ? sql`(${whereUsers})` : sql`true`}` as any);

      // Fetch user IDs matching filter to aggregate orders
      const userRows = await db.select({ id: schema.users.id }).from(schema.users).where(whereUsers as any);
      const userIds = userRows.map((r: any) => r.id);
      let ordersCount = 0;
      let totalSpent = 0;
      let avgOrderValue = 0;
      let last30dOrdersCount = 0;
      let returningCustomers = 0;
      if (userIds.length) {
        const [o] = await db  
          .select({
            ordersCount: sql<number>`count(*)`,
            totalSpent: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), '0')`,
            avgOrderValue: sql<string>`COALESCE(AVG(${schema.orders.totalAmount}), '0')`,
            last30dOrdersCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.orders.createdAt} >= ${thirtyDaysAgo})`,
          })
          .from(schema.orders)
          .where(sql`${schema.orders.userId} IN ${userIds}`);
        ordersCount = Number((o as any)?.ordersCount || 0);
        totalSpent = Number((o as any)?.totalSpent || 0);
        avgOrderValue = Number((o as any)?.avgOrderValue || 0);
        last30dOrdersCount = Number((o as any)?.last30dOrdersCount || 0);

        const [ret] = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${schema.orders.userId})` })
          .from(schema.orders)
          .where(sql`${schema.orders.userId} IN ${userIds}`);
        returningCustomers = Number((ret as any)?.count || 0);
      }

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      const activeRate = totalCustomers ? Math.round((activeCustomers / totalCustomers) * 100) : 0;
      const returningRate = totalCustomers ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

      return successResponse({
        totalCustomers: Number(totalCustomers || 0),
        activeCustomers: Number(activeCustomers || 0),
        newCustomers30d: Number(newCustomers30d || 0),
        ordersCount,
        totalSpent,
        avgOrderValue,
        returningCustomers,
        returningRate,
        activeRate,
        last30dOrdersCount,
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
