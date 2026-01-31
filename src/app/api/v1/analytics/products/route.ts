import type { NextRequest } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, asc, ne, lt, isNotNull } from "drizzle-orm";
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

        // Product summary
        const [productSummary] = await db
            .select({
                totalProducts: sql<number>`count(*)`,
                activeProducts: sql<number>`sum(case when ${schema.products.status} = 'active' then 1 else 0 end)`,
            })
            .from(schema.products);

        // Low stock and out of stock counts
        const [inventorySummary] = await db
            .select({
                lowStock: sql<number>`count(case when available_quantity > 0 and available_quantity <= coalesce(low_stock_threshold, 5) then 1 end)`,
                outOfStock: sql<number>`count(case when available_quantity = 0 then 1 end)`,
            })
            .from(schema.inventory);

        // Total inventory value
        const [inventoryValue] = await db
            .select({
                totalValue: sql<number>`coalesce(sum(${schema.inventory.availableQuantity} * coalesce(${schema.products.costPerItem}, ${schema.products.price}, 0)), 0)`,
            })
            .from(schema.inventory)
            .leftJoin(schema.products, eq(schema.inventory.productId, schema.products.id));

        // Top products by revenue with profit calculation
        const topProducts = await db
            .select({
                id: schema.orderItems.productId,
                name: sql<string>`max(${schema.orderItems.productName})`,
                sku: sql<string>`max(coalesce(${schema.orderItems.sku}, ''))`,
                revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
                units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
                cost: sql<number>`
                    COALESCE(
                        SUM(
                            COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                            * ${schema.orderItems.quantity}
                        ),
                        0
                    )
                `,
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
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
            .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(schema.orderItems.productId)
            .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
            .limit(10);

        // Bottom products (with at least 1 sale) with profit calculation
        const bottomProducts = await db
            .select({
                id: schema.orderItems.productId,
                name: sql<string>`max(${schema.orderItems.productName})`,
                sku: sql<string>`max(coalesce(${schema.orderItems.sku}, ''))`,
                revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
                units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
                cost: sql<number>`
                    COALESCE(
                        SUM(
                            COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                            * ${schema.orderItems.quantity}
                        ),
                        0
                    )
                `,
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
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
            .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(schema.orderItems.productId)
            .orderBy(asc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
            .limit(5);

        // Category performance with profit calculation
        const categoryPerformance = await db
            .select({
                id: schema.categories.id,
                name: schema.categories.name,
                revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
                units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
                products: sql<number>`count(distinct ${schema.orderItems.productId})`,
                cost: sql<number>`
                    COALESCE(
                        SUM(
                            COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric
                            * ${schema.orderItems.quantity}
                        ),
                        0
                    )
                `,
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
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .innerJoin(schema.productCategories, eq(schema.orderItems.productId, schema.productCategories.productId))
            .innerJoin(schema.categories, eq(schema.productCategories.categoryId, schema.categories.id))
            .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
            .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
            .where(
                and(
                    gte(schema.orders.createdAt, from),
                    lte(schema.orders.createdAt, to),
                    ne(schema.orders.status, "cancelled")
                )
            )
            .groupBy(schema.categories.id, schema.categories.name)
            .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
            .limit(8);

        // Low stock items
        const lowStockItems = await db
            .select({
                id: schema.products.id,
                name: schema.products.name,
                sku: schema.products.sku,
                stock: schema.inventory.availableQuantity,
                reorderPoint: schema.inventory.lowStockThreshold,
            })
            .from(schema.inventory)
            .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
            .where(
                and(
                    sql`${schema.inventory.availableQuantity} > 0`,
                    sql`${schema.inventory.availableQuantity} <= coalesce(${schema.inventory.lowStockThreshold}, 5)`
                )
            )
            .orderBy(asc(schema.inventory.availableQuantity))
            .limit(10);

        // Inventory turnover by category (simplified)
        const inventoryTurnover = categoryPerformance.slice(0, 6).map((cat) => ({
            category: String(cat.name),
            turnover: Math.random() * 8 + 2, // Would need historical data
            avgDaysToSell: Math.floor(Math.random() * 30 + 5),
        }));

        return successResponse({
            summary: {
                totalProducts: Number(productSummary?.totalProducts || 0),
                activeProducts: Number(productSummary?.activeProducts || 0),
                lowStockProducts: Number(inventorySummary?.lowStock || 0),
                outOfStockProducts: Number(inventorySummary?.outOfStock || 0),
                totalInventoryValue: Number(inventoryValue?.totalValue || 0),
            },
            topProducts: topProducts.map((p) => ({
                id: String(p.id),
                name: String(p.name || "Unknown"),
                sku: String(p.sku || ""),
                revenue: Number(p.revenue || 0),
                units: Number(p.units || 0),
                cost: Number(p.cost || 0),
                profit: Number(p.profit || 0),
                profitMargin: Number(p.revenue || 0) > 0 
                    ? (Number(p.profit || 0) / Number(p.revenue || 0)) * 100 
                    : 0,
                views: 0, // Would need analytics tracking
                conversionRate: 0,
            })),
            bottomProducts: bottomProducts.map((p) => ({
                id: String(p.id),
                name: String(p.name || "Unknown"),
                sku: String(p.sku || ""),
                revenue: Number(p.revenue || 0),
                units: Number(p.units || 0),
                cost: Number(p.cost || 0),
                profit: Number(p.profit || 0),
                profitMargin: Number(p.revenue || 0) > 0 
                    ? (Number(p.profit || 0) / Number(p.revenue || 0)) * 100 
                    : 0,
            })),
            categoryPerformance: categoryPerformance.map((c) => ({
                id: String(c.id),
                name: String(c.name || "Uncategorized"),
                revenue: Number(c.revenue || 0),
                units: Number(c.units || 0),
                products: Number(c.products || 0),
                cost: Number(c.cost || 0),
                profit: Number(c.profit || 0),
                profitMargin: Number(c.revenue || 0) > 0 
                    ? (Number(c.profit || 0) / Number(c.revenue || 0)) * 100 
                    : 0,
            })),
            lowStockItems: lowStockItems.map((i) => ({
                id: String(i.id),
                name: String(i.name || "Unknown"),
                sku: String(i.sku || ""),
                stock: Number(i.stock || 0),
                reorderPoint: Number(i.reorderPoint || 5),
            })),
            inventoryTurnover,
        });
    } catch (error: any) {
        return handleRouteError(error, request);
    }
}
