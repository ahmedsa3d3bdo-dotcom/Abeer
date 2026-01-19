import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, between, gte, lte } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { settingsRepository } from "@/server/repositories/settings.repository";

const overviewQuery = z.object({
  range: z.enum(["7d", "30d", "90d"]).optional().default("90d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const timeseriesQuery = z.object({
  range: z.enum(["7d", "30d", "90d"]).optional().default("90d"),
});

const rangeQuery = z.object({
  range: z.enum(["7d", "30d", "90d"]).optional().default("90d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

function getRange(
  q: { range?: string; dateFrom?: string; dateTo?: string },
): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  let to = q.dateTo ? new Date(q.dateTo) : now;
  let from = q.dateFrom ? new Date(q.dateFrom) : new Date();
  if (!q.dateFrom) {
    const days = q.range === "7d" ? 7 : q.range === "30d" ? 30 : 90;
    from = new Date(to);
    from.setDate(from.getDate() - days);
  }
  const prevFrom = new Date(from);
  const prevTo = new Date(to);
  const diffMs = to.getTime() - from.getTime();
  prevFrom.setTime(prevFrom.getTime() - diffMs);
  prevTo.setTime(prevTo.getTime() - diffMs);
  return { from, to, prevFrom, prevTo };
}

export class DashboardController {
  static async overview(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = overviewQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to, prevFrom, prevTo } = getRange(q);

      const activeSalesWhere = (fromDate: Date, toDate: Date) =>
        and(
          sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
          gte(schema.orders.createdAt, fromDate),
          lte(schema.orders.createdAt, toDate),
        ) as any;

      // Revenue (paid orders)
      const [{ revenue = 0 } = {} as any] = await db
        .select({ revenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}::numeric), 0)` })
        .from(schema.orders)
        .where(and(eq(schema.orders.paymentStatus, "paid"), gte(schema.orders.createdAt, from), lte(schema.orders.createdAt, to)) as any);

      const [{ prevRevenue = 0 } = {} as any] = await db
        .select({ prevRevenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}::numeric), 0)` })
        .from(schema.orders)
        .where(and(eq(schema.orders.paymentStatus, "paid"), gte(schema.orders.createdAt, prevFrom), lte(schema.orders.createdAt, prevTo)) as any);

      // Total sales (non-cancelled/refunded orders)
      const [{ totalSales = 0 } = {} as any] = await db
        .select({ totalSales: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}::numeric), 0)` })
        .from(schema.orders)
        .where(activeSalesWhere(from, to));

      const [{ prevTotalSales = 0 } = {} as any] = await db
        .select({ prevTotalSales: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}::numeric), 0)` })
        .from(schema.orders)
        .where(activeSalesWhere(prevFrom, prevTo));

      // Net profit (paid orders): SUM(items revenue) - SUM(costPerItem * qty)
      const [{ netProfit = 0 } = {} as any] = await db
        .select({
          netProfit: sql<number>`
            COALESCE(SUM(${schema.orderItems.totalPrice}::numeric), 0)
            - COALESCE(
                SUM(
                  COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                  * ${schema.orderItems.quantity}
                ),
                0
              )
          `,
        })
        .from(schema.orderItems)
        .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.orderItems.orderId}` as any)
        .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
        .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
        .where(
          and(
            sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(schema.orders.createdAt, from),
            lte(schema.orders.createdAt, to),
          ) as any,
        );

      const [{ prevNetProfit = 0 } = {} as any] = await db
        .select({
          prevNetProfit: sql<number>`
            COALESCE(SUM(${schema.orderItems.totalPrice}::numeric), 0)
            - COALESCE(
                SUM(
                  COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                  * ${schema.orderItems.quantity}
                ),
                0
              )
          `,
        })
        .from(schema.orderItems)
        .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.orderItems.orderId}` as any)
        .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
        .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
        .where(
          and(
            sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(schema.orders.createdAt, prevFrom),
            lte(schema.orders.createdAt, prevTo),
          ) as any,
        );

      // Orders count
      const [{ ordersCount = 0 } = {} as any] = await db
        .select({ ordersCount: sql<number>`COUNT(*)` })
        .from(schema.orders)
        .where(and(gte(schema.orders.createdAt, from), lte(schema.orders.createdAt, to)) as any);

      const [{ prevOrdersCount = 0 } = {} as any] = await db
        .select({ prevOrdersCount: sql<number>`COUNT(*)` })
        .from(schema.orders)
        .where(and(gte(schema.orders.createdAt, prevFrom), lte(schema.orders.createdAt, prevTo)) as any);

      // Paid orders count for AOV
      const [{ paidCount = 0 } = {} as any] = await db
        .select({ paidCount: sql<number>`COUNT(*)` })
        .from(schema.orders)
        .where(and(eq(schema.orders.paymentStatus, "paid"), gte(schema.orders.createdAt, from), lte(schema.orders.createdAt, to)) as any);

      // New customers
      const [{ newCustomers = 0 } = {} as any] = await db
        .select({ newCustomers: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(and(gte(schema.users.createdAt, from), lte(schema.users.createdAt, to)) as any);

      const [{ prevNewCustomers = 0 } = {} as any] = await db
        .select({ prevNewCustomers: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(and(gte(schema.users.createdAt, prevFrom), lte(schema.users.createdAt, prevTo)) as any);

      const avgOrderValue = Number(paidCount) > 0 ? Number(revenue) / Number(paidCount) : 0;

      const pct = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0);

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      return successResponse({
        revenue: Number(revenue),
        revenueChangePct: Number(pct(Number(revenue), Number(prevRevenue)).toFixed(1)),
        totalSales: Number(totalSales),
        totalSalesChangePct: Number(pct(Number(totalSales), Number(prevTotalSales)).toFixed(1)),
        netProfit: Number(netProfit),
        netProfitChangePct: Number(pct(Number(netProfit), Number(prevNetProfit)).toFixed(1)),
        ordersCount: Number(ordersCount),
        ordersChangePct: Number(pct(Number(ordersCount), Number(prevOrdersCount)).toFixed(1)),
        newCustomers: Number(newCustomers),
        newCustomersChangePct: Number(pct(Number(newCustomers), Number(prevNewCustomers)).toFixed(1)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async timeseries(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = timeseriesQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to } = getRange(q);

      // Group by day
      const rows = await db
        .select({
          date: sql<string>`TO_CHAR(date_trunc('day', ${schema.orders.createdAt}), 'YYYY-MM-DD')`,
          revenue: sql<number>`COALESCE(SUM(CASE WHEN ${schema.orders.status} NOT IN ('cancelled', 'refunded') THEN ${schema.orders.totalAmount}::numeric ELSE 0 END), 0)`,
          orders: sql<number>`COALESCE(SUM(CASE WHEN ${schema.orders.status} NOT IN ('cancelled', 'refunded') THEN 1 ELSE 0 END), 0)`,
        })
        .from(schema.orders)
        .where(and(gte(schema.orders.createdAt, from), lte(schema.orders.createdAt, to)) as any)
        .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})`);

      const profitRows = await db
        .select({
          date: sql<string>`TO_CHAR(date_trunc('day', ${schema.orders.createdAt}), 'YYYY-MM-DD')`,
          profit: sql<number>`
            COALESCE(SUM(${schema.orderItems.totalPrice}::numeric), 0)
            - COALESCE(
                SUM(
                  COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                  * ${schema.orderItems.quantity}
                ),
                0
              )
          `,
        })
        .from(schema.orderItems)
        .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.orderItems.orderId}` as any)
        .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
        .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
        .where(
          and(
            sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(schema.orders.createdAt, from),
            lte(schema.orders.createdAt, to),
          ) as any,
        )
        .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})`);

      const profitByDate = new Map(profitRows.map((r) => [r.date, Number((r as any).profit || 0)]));
      const items = rows.map((r) => ({
        ...r,
        profit: Number(profitByDate.get(r.date) || 0),
      }));

      return successResponse({ items });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async recentOrders(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const qs = Object.fromEntries(request.nextUrl.searchParams.entries());
      const limit = Math.min(Math.max(Number(qs.limit || 10), 1), 50);

      const rows = await db
        .select({
          id: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
          customerEmail: schema.orders.customerEmail,
          status: schema.orders.status,
          paymentStatus: schema.orders.paymentStatus,
          totalAmount: schema.orders.totalAmount,
          currency: schema.orders.currency,
          createdAt: schema.orders.createdAt,
        })
        .from(schema.orders)
        .orderBy(sql`${schema.orders.createdAt} DESC`)
        .limit(limit);

      return successResponse({ items: rows });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async ordersStatus(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = rangeQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to } = getRange(q);

      const rows = await db
        .select({
          status: schema.orders.status,
          paymentStatus: schema.orders.paymentStatus,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.orders)
        .where(and(gte(schema.orders.createdAt, from), lte(schema.orders.createdAt, to)) as any)
        .groupBy(schema.orders.status, schema.orders.paymentStatus);

      return successResponse({ items: rows });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async revenueByPayment(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = rangeQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to } = getRange(q);

      const rows = await db
        .select({
          paymentMethod: schema.orders.paymentMethod,
          revenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}::numeric), 0)`,
        })
        .from(schema.orders)
        .where(
          and(
            sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(schema.orders.createdAt, from),
            lte(schema.orders.createdAt, to),
          ) as any,
        )
        .groupBy(schema.orders.paymentMethod);

      return successResponse({ items: rows });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async topProducts(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = rangeQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to } = getRange(q);
      const limit = Math.min(Math.max(Number(q.limit || 10), 1), 50);

      const rows = await db
        .select({
          productId: schema.orderItems.productId,
          productName: schema.orderItems.productName,
          units: sql<number>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
          revenue: sql<number>`COALESCE(SUM(${schema.orderItems.totalPrice}::numeric), 0)`,
        })
        .from(schema.orderItems)
        .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.orderItems.orderId}` as any)
        .where(
          and(
            sql`${schema.orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(schema.orders.createdAt, from),
            lte(schema.orders.createdAt, to),
          ) as any,
        )
        .groupBy(schema.orderItems.productId, schema.orderItems.productName)
        .orderBy(sql`SUM(${schema.orderItems.totalPrice}::numeric) DESC`)
        .limit(limit);

      return successResponse({ items: rows });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async recentActivities(request: NextRequest) {
    try {
      await requirePermission(request, "dashboard.view");
      const q = rangeQuery.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const { from, to } = getRange(q);
      const limit = Math.min(Math.max(Number(q.limit || 10), 1), 50);

      const rows = await db
        .select({
          id: schema.auditLogs.id,
          action: schema.auditLogs.action,
          resource: schema.auditLogs.resource,
          userId: schema.auditLogs.userId,
          createdAt: schema.auditLogs.createdAt,
          userEmail: sql<string>`(SELECT ${schema.users.email} FROM ${schema.users} WHERE ${schema.users.id} = ${schema.auditLogs.userId})`,
        })
        .from(schema.auditLogs)
        .where(and(gte(schema.auditLogs.createdAt, from), lte(schema.auditLogs.createdAt, to)) as any)
        .orderBy(sql`${schema.auditLogs.createdAt} DESC`)
        .limit(limit);

      return successResponse({ items: rows });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
