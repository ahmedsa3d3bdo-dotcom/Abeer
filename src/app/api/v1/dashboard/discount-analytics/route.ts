import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
import { successResponse, handleRouteError } from "@/server/utils/response";
import { ValidationError } from "@/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const querySchema = z.object({
    range: z.enum(["7d", "30d", "90d", "365d"]).optional().default("30d"),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.coerce.number().int().positive().max(20).optional().default(10),
});

function getDateRange(range: string, dateFrom?: string, dateTo?: string) {
    const now = new Date();
    let from: Date;
    const to = dateTo ? new Date(dateTo) : now;

    if (dateFrom) {
        from = new Date(dateFrom);
    } else {
        const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
        from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    return { from, to };
}

export async function GET(request: NextRequest) {
    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = querySchema.safeParse(params);
        if (!parsed.success) {
            throw new ValidationError(parsed.error.issues[0]?.message || "Invalid query");
        }

        const { range, dateFrom, dateTo, limit } = parsed.data;
        const { from, to } = getDateRange(range, dateFrom, dateTo);

        // 1. Overall discount metrics
        const [overallMetrics] = await db
            .select({
                totalDiscountAmount: sql<number>`coalesce(sum(${schema.orders.discountAmount}), 0)`,
                ordersWithDiscount: sql<number>`count(*) filter (where ${schema.orders.discountAmount} > 0)`,
                totalOrders: sql<number>`count(*)`,
                totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
                avgDiscountPerOrder: sql<number>`coalesce(avg(${schema.orders.discountAmount}) filter (where ${schema.orders.discountAmount} > 0), 0)`,
            })
            .from(schema.orders)
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to),
                    sql`${schema.orders.status} != 'cancelled'`,
                ),
            );

        // 2. Breakdown by discount type (from orderDiscounts table joined with discounts)
        const discountsByType = await db
            .select({
                discountType: sql<string>`coalesce(${schema.discounts.metadata}->>'kind', 
          case when ${schema.discounts.isAutomatic} then 'offer' else 'coupon' end)`,
                offerKind: sql<string>`coalesce(${schema.discounts.metadata}->>'offerKind', 'standard')`,
                totalAmount: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
                usageCount: sql<number>`count(*)`,
                avgAmount: sql<number>`coalesce(avg(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.orderDiscounts)
            .leftJoin(schema.discounts, eq(schema.orderDiscounts.discountId, schema.discounts.id))
            .leftJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orderDiscounts.createdAt, from),
                    lte(schema.orderDiscounts.createdAt, to),
                    sql`${schema.orders.status} != 'cancelled'`,
                ),
            )
            .groupBy(
                sql`coalesce(${schema.discounts.metadata}->>'kind', 
          case when ${schema.discounts.isAutomatic} then 'offer' else 'coupon' end)`,
                sql`coalesce(${schema.discounts.metadata}->>'offerKind', 'standard')`,
            );

        // 3. Top performing discounts
        const topDiscounts = await db
            .select({
                id: schema.discounts.id,
                name: schema.discounts.name,
                code: schema.discounts.code,
                type: schema.discounts.type,
                value: schema.discounts.value,
                isAutomatic: schema.discounts.isAutomatic,
                metadata: schema.discounts.metadata,
                totalAmount: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
                usageCount: sql<number>`count(distinct ${schema.orderDiscounts.orderId})`,
                avgDiscountPerOrder: sql<number>`coalesce(avg(${schema.orderDiscounts.amount}), 0)`,
            })
            .from(schema.discounts)
            .innerJoin(schema.orderDiscounts, eq(schema.orderDiscounts.discountId, schema.discounts.id))
            .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orderDiscounts.createdAt, from),
                    lte(schema.orderDiscounts.createdAt, to),
                    sql`${schema.orders.status} != 'cancelled'`,
                ),
            )
            .groupBy(
                schema.discounts.id,
                schema.discounts.name,
                schema.discounts.code,
                schema.discounts.type,
                schema.discounts.value,
                schema.discounts.isAutomatic,
                schema.discounts.metadata,
            )
            .orderBy(desc(sql`coalesce(sum(${schema.orderDiscounts.amount}), 0)`))
            .limit(limit);

        // 4. Discount usage over time (daily aggregation)
        const usageOverTime = await db
            .select({
                date: sql<string>`date_trunc('day', ${schema.orderDiscounts.createdAt})::date`,
                totalAmount: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
                usageCount: sql<number>`count(distinct ${schema.orderDiscounts.orderId})`,
            })
            .from(schema.orderDiscounts)
            .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
            .where(
                and(
                    gte(schema.orderDiscounts.createdAt, from),
                    lte(schema.orderDiscounts.createdAt, to),
                    sql`${schema.orders.status} != 'cancelled'`,
                ),
            )
            .groupBy(sql`date_trunc('day', ${schema.orderDiscounts.createdAt})::date`)
            .orderBy(sql`date_trunc('day', ${schema.orderDiscounts.createdAt})::date`);

        // 5. Active discounts count
        const now = new Date();
        const [activeDiscounts] = await db
            .select({
                total: sql<number>`count(*)`,
                coupons: sql<number>`count(*) filter (where ${schema.discounts.isAutomatic} = false)`,
                promotions: sql<number>`count(*) filter (where ${schema.discounts.isAutomatic} = true)`,
            })
            .from(schema.discounts)
            .where(
                and(
                    eq(schema.discounts.status, "active"),
                    sql`(${schema.discounts.startsAt} IS NULL OR ${schema.discounts.startsAt} <= ${now})`,
                    sql`(${schema.discounts.endsAt} IS NULL OR ${schema.discounts.endsAt} >= ${now})`,
                ),
            );

        // Calculate summary metrics
        const totalDiscountAmount = Number(overallMetrics?.totalDiscountAmount || 0);
        const totalRevenue = Number(overallMetrics?.totalRevenue || 0);
        const totalOrders = Number(overallMetrics?.totalOrders || 0);
        const ordersWithDiscount = Number(overallMetrics?.ordersWithDiscount || 0);
        const discountRate = totalOrders > 0 ? (ordersWithDiscount / totalOrders) * 100 : 0;
        const avgDiscountPerOrder = Number(overallMetrics?.avgDiscountPerOrder || 0);
        const discountAsPercentOfRevenue = totalRevenue > 0 ? (totalDiscountAmount / (totalRevenue + totalDiscountAmount)) * 100 : 0;

        // Format discount types for display
        const discountTypeBreakdown = discountsByType.map((d) => {
            let label = "Other";
            const kind = String(d.discountType || "");
            const offerKind = String(d.offerKind || "");

            if (kind === "coupon" || (!d.discountType && offerKind === "standard")) {
                label = "Coupons";
            } else if (kind === "offer" && offerKind === "standard") {
                label = "Scheduled Offers";
            } else if (kind === "offer" && offerKind === "bundle") {
                label = "Bundle Offers";
            } else if (kind === "deal" && offerKind === "bxgy_generic") {
                label = "Buy X Get Y";
            } else if (kind === "deal" && offerKind === "bxgy_bundle") {
                label = "BXGY Bundle";
            }

            return {
                type: kind || "unknown",
                offerKind: offerKind,
                label,
                totalAmount: Number(d.totalAmount || 0),
                usageCount: Number(d.usageCount || 0),
                avgAmount: Number(d.avgAmount || 0),
            };
        });

        // Format top discounts for display
        const topDiscountsFormatted = topDiscounts.map((d) => {
            const metadata = d.metadata as any;
            let typeLabel = d.isAutomatic ? "Promotion" : "Coupon";

            if (metadata?.kind === "deal") {
                if (metadata?.offerKind === "bxgy_generic") {
                    const buyQty = metadata?.bxgy?.buyQty || 0;
                    const getQty = metadata?.bxgy?.getQty || 0;
                    typeLabel = buyQty && getQty ? `Buy ${buyQty} Get ${getQty}` : "Buy X Get Y";
                } else if (metadata?.offerKind === "bxgy_bundle") {
                    typeLabel = "Bundle Deal";
                }
            } else if (metadata?.kind === "offer") {
                typeLabel = metadata?.offerKind === "bundle" ? "Bundle Offer" : "Scheduled Offer";
            }

            return {
                id: d.id,
                name: d.name,
                code: d.code,
                type: d.type,
                typeLabel,
                value: Number(d.value || 0),
                isAutomatic: d.isAutomatic,
                totalSavings: Number(d.totalAmount || 0),
                usageCount: Number(d.usageCount || 0),
                avgDiscountPerOrder: Number(d.avgDiscountPerOrder || 0),
            };
        });

        return successResponse({
            summary: {
                totalDiscountAmount,
                ordersWithDiscount,
                totalOrders,
                discountRate: Math.round(discountRate * 10) / 10,
                avgDiscountPerOrder: Math.round(avgDiscountPerOrder * 100) / 100,
                discountAsPercentOfRevenue: Math.round(discountAsPercentOfRevenue * 10) / 10,
            },
            activeDiscounts: {
                total: Number(activeDiscounts?.total || 0),
                coupons: Number(activeDiscounts?.coupons || 0),
                promotions: Number(activeDiscounts?.promotions || 0),
            },
            typeBreakdown: discountTypeBreakdown,
            topDiscounts: topDiscountsFormatted,
            usageOverTime: usageOverTime.map((d) => ({
                date: d.date,
                totalAmount: Number(d.totalAmount || 0),
                usageCount: Number(d.usageCount || 0),
            })),
            dateRange: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
        });
    } catch (error: any) {
        return handleRouteError(error, request);
    }
}
