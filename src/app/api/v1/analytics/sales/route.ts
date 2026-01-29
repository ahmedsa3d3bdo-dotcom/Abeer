import type { NextRequest } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, ne } from "drizzle-orm";
import { successResponse, handleRouteError } from "@/server/utils/response";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const querySchema = z.object({
    range: z.enum(["7d", "30d", "90d", "365d"]).optional().default("30d"),
});

function getDateRanges(range: string) {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const currentTo = now;

    const previousFrom = new Date(currentFrom.getTime() - days * 24 * 60 * 60 * 1000);
    const previousTo = new Date(currentFrom.getTime() - 1);

    return { currentFrom, currentTo, previousFrom, previousTo, days };
}

export async function GET(request: NextRequest) {
    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = querySchema.safeParse(params);
        if (!parsed.success) {
            return successResponse({ error: "Invalid parameters" });
        }

        const { range } = parsed.data;
        const { currentFrom, currentTo, previousFrom, previousTo } = getDateRanges(range);

        // Current period summary
        const [currentSummary] = await db
            .select({
                totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
                totalOrders: sql<number>`count(*)`,
                averageOrderValue: sql<number>`coalesce(avg(${schema.orders.totalAmount}), 0)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo),
                    ne(schema.orders.status, "cancelled")
                )
            );

        // Previous period summary for comparison
        const [previousSummary] = await db
            .select({
                totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
                totalOrders: sql<number>`count(*)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, previousFrom),
                    lte(schema.orders.createdAt, previousTo),
                    ne(schema.orders.status, "cancelled")
                )
            );

        // Revenue by day
        const revenueByDay = await db
            .select({
                date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
                revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
                orders: sql<number>`count(*)`,
                // Simplified profit calculation - would need proper cost tracking
                profit: sql<number>`coalesce(sum(${schema.orders.totalAmount}) * 0.3, 0)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
            .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);

        // Orders by status
        const ordersByStatus = await db
            .select({
                status: schema.orders.status,
                count: sql<number>`count(*)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo)
                )
            )
            .groupBy(schema.orders.status);

        const totalStatusOrders = ordersByStatus.reduce((sum, s) => sum + Number(s.count), 0);
        const ordersByStatusWithPercentage = ordersByStatus.map((s) => ({
            status: s.status,
            count: Number(s.count),
            percentage: totalStatusOrders > 0 ? (Number(s.count) / totalStatusOrders) * 100 : 0,
        }));

        // Revenue by payment method
        const revenueByPayment = await db
            .select({
                method: sql<string>`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`,
                amount: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
                count: sql<number>`count(*)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(sql`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`)
            .orderBy(desc(sql`coalesce(sum(${schema.orders.totalAmount}), 0)`));

        // Top products
        const topProducts = await db
            .select({
                id: schema.orderItems.productId,
                name: sql<string>`max(${schema.orderItems.productName})`,
                revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
                units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
            })
            .from(schema.orderItems)
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(schema.orderItems.productId)
            .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
            .limit(10);

        // Sales by hour
        const salesByHour = await db
            .select({
                hour: sql<number>`extract(hour from ${schema.orders.createdAt})`,
                orders: sql<number>`count(*)`,
                revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, currentFrom),
                    lte(schema.orders.createdAt, currentTo),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(sql`extract(hour from ${schema.orders.createdAt})`)
            .orderBy(sql`extract(hour from ${schema.orders.createdAt})`);

        // Fill in missing hours
        const salesByHourFilled: { hour: number; orders: number; revenue: number }[] = [];
        const hourMap = new Map<number, { hour: number; orders: number; revenue: number }>(
            salesByHour.map((h) => [Number(h.hour), { hour: Number(h.hour), orders: Number(h.orders), revenue: Number(h.revenue) }])
        );
        for (let i = 0; i < 24; i++) {
            const existing = hourMap.get(i);
            salesByHourFilled.push({
                hour: i,
                orders: existing ? existing.orders : 0,
                revenue: existing ? existing.revenue : 0,
            });
        }

        return successResponse({
            summary: {
                totalRevenue: Number(currentSummary?.totalRevenue || 0),
                totalOrders: Number(currentSummary?.totalOrders || 0),
                averageOrderValue: Number(currentSummary?.averageOrderValue || 0),
                conversionRate: 3.2, // Placeholder - would need sessions data
                previousRevenue: Number(previousSummary?.totalRevenue || 0),
                previousOrders: Number(previousSummary?.totalOrders || 0),
            },
            revenueByDay: revenueByDay.map((d) => ({
                date: d.date,
                revenue: Number(d.revenue || 0),
                orders: Number(d.orders || 0),
                profit: Number(d.profit || 0),
            })),
            ordersByStatus: ordersByStatusWithPercentage,
            revenueByPayment: revenueByPayment.map((p) => ({
                method: String(p.method || "Unknown"),
                amount: Number(p.amount || 0),
                count: Number(p.count || 0),
            })),
            topProducts: topProducts.map((p) => ({
                id: String(p.id),
                name: String(p.name || "Unknown Product"),
                revenue: Number(p.revenue || 0),
                units: Number(p.units || 0),
            })),
            salesByHour: salesByHourFilled,
        });
    } catch (error: any) {
        return handleRouteError(error, request);
    }
}
