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

function getDateRange(range: string) {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to: now };
}

export async function GET(request: NextRequest) {
    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = querySchema.safeParse(params);
        if (!parsed.success) {
            return successResponse({ error: "Invalid parameters" });
        }

        const { range } = parsed.data;
        const { from, to } = getDateRange(range);
        const now = new Date();

        // Discount summary
        const [discountSummary] = await db
            .select({
                totalDiscounts: sql<number>`count(*)`,
                activeDiscounts: sql<number>`sum(case 
          when ${schema.discounts.status} = 'active' 
          and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now})
          and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})
          then 1 else 0 end)`,
            })
            .from(schema.discounts);

        // Total uses and savings in period
        const [usageSummary] = await db
            .select({
                totalUses: sql<number>`count(*)`,
                totalSavings: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.orderDiscounts)
            .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to)
                )
            );

        // Average discount per discounted order
        const [avgDiscount] = await db
            .select({
                avgAmount: sql<number>`coalesce(avg(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.orderDiscounts)
            .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to)
                )
            );

        // Top discounts
        const topDiscounts = await db
            .select({
                id: schema.discounts.id,
                name: schema.discounts.name,
                type: schema.discounts.type,
                status: schema.discounts.status,
                uses: sql<number>`count(${schema.orderDiscounts.id})`,
                savings: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.discounts)
            .leftJoin(schema.orderDiscounts, eq(schema.orderDiscounts.discountId, schema.discounts.id))
            .leftJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                sql`${schema.orders.id} is null or (${schema.orders.createdAt} >= ${from} and ${schema.orders.createdAt} <= ${to})`
            )
            .groupBy(schema.discounts.id, schema.discounts.name, schema.discounts.type, schema.discounts.status)
            .orderBy(desc(sql`count(${schema.orderDiscounts.id})`))
            .limit(10);

        // Discount usage over time
        const discountUsageOverTime = await db
            .select({
                date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
                uses: sql<number>`count(${schema.orderDiscounts.id})`,
                savings: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.orderDiscounts)
            .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to)
                )
            )
            .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
            .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);

        // Discounts by type
        const discountsByType = await db
            .select({
                type: schema.discounts.type,
                count: sql<number>`count(*)`,
                savings: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.discounts)
            .leftJoin(schema.orderDiscounts, eq(schema.orderDiscounts.discountId, schema.discounts.id))
            .leftJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                sql`${schema.orders.id} is null or (${schema.orders.createdAt} >= ${from} and ${schema.orders.createdAt} <= ${to})`
            )
            .groupBy(schema.discounts.type);

        // Discounts by status
        const discountsByStatus = await db
            .select({
                status: schema.discounts.status,
                count: sql<number>`count(*)`,
            })
            .from(schema.discounts)
            .groupBy(schema.discounts.status);

        // Recent email campaigns (simplified - would need email tracking table)
        const recentCampaigns: any[] = [];

        return successResponse({
            summary: {
                totalDiscounts: Number(discountSummary?.totalDiscounts || 0),
                activeDiscounts: Number(discountSummary?.activeDiscounts || 0),
                totalSavings: Number(usageSummary?.totalSavings || 0),
                totalUses: Number(usageSummary?.totalUses || 0),
                averageDiscountPerOrder: Number(avgDiscount?.avgAmount || 0),
            },
            topDiscounts: topDiscounts.map((d) => ({
                id: String(d.id),
                name: String(d.name || "Unnamed Discount"),
                type: String(d.type || "percentage"),
                uses: Number(d.uses || 0),
                savings: Number(d.savings || 0),
                status: String(d.status || "inactive"),
            })),
            discountUsageOverTime: discountUsageOverTime.map((d) => ({
                date: d.date,
                uses: Number(d.uses || 0),
                savings: Number(d.savings || 0),
            })),
            discountsByType: discountsByType.map((d) => ({
                type: String(d.type || "other"),
                count: Number(d.count || 0),
                savings: Number(d.savings || 0),
            })),
            discountsByStatus: discountsByStatus.map((d) => ({
                status: String(d.status || "unknown"),
                count: Number(d.count || 0),
            })),
            recentCampaigns,
        });
    } catch (error: any) {
        return handleRouteError(error, request);
    }
}
