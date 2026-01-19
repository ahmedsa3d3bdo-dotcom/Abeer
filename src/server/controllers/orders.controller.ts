import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ordersService } from "../services/orders.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody, validateQuery } from "../utils/validation";
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
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
  userId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  adminNote: z.string().nullable().optional(),
});

export class OrdersController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "orders.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await ordersService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async details(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "orders.view");
      const result = await ordersService.getDetails(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "orders.view");
      const result = await ordersService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "orders.update");
      const body = await validateBody(request, updateSchema);
      const result = await ordersService.update(id, body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "orders",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: body as any,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "orders.delete");
      const result = await ordersService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "orders",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "orders.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.orders.orderNumber} ILIKE ${like} OR ${schema.orders.customerEmail} ILIKE ${like})`);
      }
      if (query.status && query.status !== "all") filters.push(sql`${schema.orders.status} = ${query.status}`);
      if (query.paymentStatus && query.paymentStatus !== "all") filters.push(sql`${schema.orders.paymentStatus} = ${query.paymentStatus}`);
      if (query.dateFrom) filters.push(sql`${schema.orders.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.orders.createdAt} <= ${new Date(query.dateTo)}`);
      if (query.userId) filters.push(sql`${schema.orders.userId} = ${query.userId}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalOrders, revenueTotal, avgOrderValue }] = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          revenueTotal: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), '0')`,
          avgOrderValue: sql<string>`COALESCE(AVG(${schema.orders.totalAmount}), '0')`,
        })
        .from(schema.orders)
        .where(where as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ orders30d, revenue30d, aov30d }] = await db
        .select({
          orders30d: sql<number>`COUNT(*)`,
          revenue30d: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), '0')`,
          aov30d: sql<string>`COALESCE(AVG(${schema.orders.totalAmount}), '0')`,
        })
        .from(schema.orders)
        .where(sql`${where ? sql`(${where}) AND ` : sql``}${schema.orders.createdAt} >= ${since}` as any);

      const [{ paidOrders }] = await db
        .select({ paidOrders: sql<number>`count(*)` })
        .from(schema.orders)
        .where(sql`${schema.orders.paymentStatus} = 'paid' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ pendingOrders }] = await db
        .select({ pendingOrders: sql<number>`count(*)` })
        .from(schema.orders)
        .where(sql`${schema.orders.status} = 'pending' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ refundedOrders }] = await db
        .select({ refundedOrders: sql<number>`count(*)` })
        .from(schema.orders)
        .where(sql`${schema.orders.status} = 'refunded' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      return successResponse({
        totalOrders: Number(totalOrders || 0),
        revenueTotal: Number(revenueTotal || 0),
        avgOrderValue: Number(avgOrderValue || 0),
        orders30d: Number(orders30d || 0),
        revenue30d: Number(revenue30d || 0),
        aov30d: Number(aov30d || 0),
        paidOrders: Number(paidOrders || 0),
        pendingOrders: Number(pendingOrders || 0),
        refundedOrders: Number(refundedOrders || 0),
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
