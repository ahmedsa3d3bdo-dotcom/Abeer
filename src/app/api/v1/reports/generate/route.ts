import type { NextRequest } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, ne } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
    reportId: z.string(),
    format: z.enum(["pdf", "xlsx", "csv"]),
    dateRange: z.object({
        from: z.string(),
        to: z.string(),
    }).optional(),
});

// Helper to parse date range
function parseDateRange(dateRange?: { from: string; to: string }) {
    if (!dateRange) {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from, to: now };
    }
    return {
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
    };
}

// Fetch sales report data
async function fetchSalesReportData(from: Date, to: Date) {
    // Summary stats
    const [summary] = await db
        .select({
            totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            totalOrders: sql<number>`count(*)`,
            averageOrderValue: sql<number>`coalesce(avg(${schema.orders.totalAmount}), 0)`,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        );

    // Daily breakdown
    const dailyData = await db
        .select({
            date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
            revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            orders: sql<number>`count(*)`,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        )
        .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
        .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);

    // Orders list
    const orders = await db
        .select({
            id: schema.orders.id,
            orderNumber: schema.orders.orderNumber,
            createdAt: schema.orders.createdAt,
            status: schema.orders.status,
            totalAmount: schema.orders.totalAmount,
            paymentMethod: schema.orders.paymentMethod,
            paymentStatus: schema.orders.paymentStatus,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to)
            )
        )
        .orderBy(desc(schema.orders.createdAt))
        .limit(500);

    // Top products
    const topProducts = await db
        .select({
            name: sql<string>`max(${schema.orderItems.productName})`,
            sku: sql<string>`max(coalesce(${schema.orderItems.sku}, ''))`,
            units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
            revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
        })
        .from(schema.orderItems)
        .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        )
        .groupBy(schema.orderItems.productId)
        .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
        .limit(20);

    return {
        summary: {
            totalRevenue: Number(summary?.totalRevenue || 0),
            totalOrders: Number(summary?.totalOrders || 0),
            averageOrderValue: Number(summary?.averageOrderValue || 0),
        },
        dailyData: dailyData.map((d) => ({
            date: d.date,
            revenue: Number(d.revenue),
            orders: Number(d.orders),
        })),
        orders: orders.map((o) => ({
            orderNumber: o.orderNumber,
            date: o.createdAt?.toISOString().split("T")[0] || "",
            status: o.status,
            total: Number(o.totalAmount || 0),
            paymentMethod: o.paymentMethod || "N/A",
            paymentStatus: o.paymentStatus || "N/A",
        })),
        topProducts: topProducts.map((p) => ({
            name: p.name || "Unknown",
            sku: p.sku || "",
            units: Number(p.units),
            revenue: Number(p.revenue),
        })),
    };
}

// Fetch products report data
async function fetchProductsReportData() {
    // All products with inventory
    const products = await db
        .select({
            name: schema.products.name,
            sku: schema.products.sku,
            price: schema.products.price,
            status: schema.products.status,
            stockStatus: schema.products.stockStatus,
            stock: schema.inventory.availableQuantity,
            soldCount: schema.products.soldCount,
            viewCount: schema.products.viewCount,
        })
        .from(schema.products)
        .leftJoin(schema.inventory, eq(schema.inventory.productId, schema.products.id))
        .orderBy(desc(schema.products.soldCount))
        .limit(500);

    // Low stock items
    const lowStock = await db
        .select({
            name: schema.products.name,
            sku: schema.products.sku,
            stock: schema.inventory.availableQuantity,
            threshold: schema.inventory.lowStockThreshold,
        })
        .from(schema.inventory)
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(
            and(
                sql`${schema.inventory.availableQuantity} > 0`,
                sql`${schema.inventory.availableQuantity} <= ${schema.inventory.lowStockThreshold}`
            )
        )
        .orderBy(schema.inventory.availableQuantity)
        .limit(50);

    // Out of stock
    const outOfStock = await db
        .select({
            name: schema.products.name,
            sku: schema.products.sku,
        })
        .from(schema.inventory)
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(eq(schema.inventory.availableQuantity, 0))
        .limit(50);

    const [summary] = await db
        .select({
            totalProducts: sql<number>`count(*)`,
            activeProducts: sql<number>`sum(case when ${schema.products.status} = 'active' then 1 else 0 end)`,
        })
        .from(schema.products);

    return {
        summary: {
            totalProducts: Number(summary?.totalProducts || 0),
            activeProducts: Number(summary?.activeProducts || 0),
            lowStockCount: lowStock.length,
            outOfStockCount: outOfStock.length,
        },
        products: products.map((p) => ({
            name: p.name,
            sku: p.sku || "",
            price: Number(p.price),
            status: p.status,
            stockStatus: p.stockStatus,
            stock: Number(p.stock || 0),
            sold: Number(p.soldCount || 0),
            views: Number(p.viewCount || 0),
        })),
        lowStock: lowStock.map((p) => ({
            name: p.name,
            sku: p.sku || "",
            stock: Number(p.stock || 0),
            threshold: Number(p.threshold || 5),
        })),
        outOfStock: outOfStock.map((p) => ({
            name: p.name,
            sku: p.sku || "",
        })),
    };
}

// Fetch customers report data
async function fetchCustomersReportData(from: Date, to: Date) {
    // Top customers
    const topCustomers = await db
        .select({
            name: sql<string>`concat(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
            email: schema.users.email,
            orders: sql<number>`count(${schema.orders.id})`,
            totalSpent: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            lastOrder: sql<string>`max(${schema.orders.createdAt})`,
        })
        .from(schema.users)
        .leftJoin(
            schema.orders,
            and(
                eq(schema.orders.userId, schema.users.id),
                ne(schema.orders.status, "cancelled")
            )
        )
        .groupBy(schema.users.id, schema.users.firstName, schema.users.lastName, schema.users.email)
        .having(sql`count(${schema.orders.id}) > 0`)
        .orderBy(desc(sql`coalesce(sum(${schema.orders.totalAmount}), 0)`))
        .limit(100);

    // New customers in period
    const newCustomers = await db
        .select({
            name: sql<string>`concat(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
            email: schema.users.email,
            createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(
            and(
                gte(schema.users.createdAt, from),
                lte(schema.users.createdAt, to)
            )
        )
        .orderBy(desc(schema.users.createdAt))
        .limit(100);

    const [summary] = await db
        .select({
            totalCustomers: sql<number>`count(distinct ${schema.orders.userId})`,
        })
        .from(schema.orders)
        .where(sql`${schema.orders.userId} is not null`);

    const [newCount] = await db
        .select({
            count: sql<number>`count(*)`,
        })
        .from(schema.users)
        .where(
            and(
                gte(schema.users.createdAt, from),
                lte(schema.users.createdAt, to)
            )
        );

    return {
        summary: {
            totalCustomers: Number(summary?.totalCustomers || 0),
            newCustomers: Number(newCount?.count || 0),
        },
        topCustomers: topCustomers.map((c) => ({
            name: String(c.name || "Unknown").trim() || "Unknown",
            email: c.email,
            orders: Number(c.orders),
            totalSpent: Number(c.totalSpent),
            lastOrder: c.lastOrder || "",
        })),
        newCustomers: newCustomers.map((c) => ({
            name: String(c.name || "Unknown").trim() || "Unknown",
            email: c.email,
            joinedAt: c.createdAt?.toISOString().split("T")[0] || "",
        })),
    };
}

// Fetch financial report data
async function fetchFinancialReportData(from: Date, to: Date) {
    // Revenue summary
    const [revenueSummary] = await db
        .select({
            totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            totalOrders: sql<number>`count(*)`,
            avgOrderValue: sql<number>`coalesce(avg(${schema.orders.totalAmount}), 0)`,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        );

    // Discount impact
    const [discountSummary] = await db
        .select({
            totalDiscounts: sql<number>`coalesce(sum(${schema.orderDiscounts.amount}), 0)`,
            discountedOrders: sql<number>`count(distinct ${schema.orderDiscounts.orderId})`,
        })
        .from(schema.orderDiscounts)
        .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to)
            )
        );

    // Revenue by payment method
    const revenueByMethod = await db
        .select({
            method: sql<string>`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`,
            revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            count: sql<number>`count(*)`,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        )
        .groupBy(sql`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`)
        .orderBy(desc(sql`coalesce(sum(${schema.orders.totalAmount}), 0)`));

    // Daily revenue
    const dailyRevenue = await db
        .select({
            date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
            revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
            orders: sql<number>`count(*)`,
        })
        .from(schema.orders)
        .where(
            and(
                gte(schema.orders.createdAt, from),
                lte(schema.orders.createdAt, to),
                ne(schema.orders.status, "cancelled")
            )
        )
        .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
        .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);

    return {
        summary: {
            totalRevenue: Number(revenueSummary?.totalRevenue || 0),
            totalOrders: Number(revenueSummary?.totalOrders || 0),
            avgOrderValue: Number(revenueSummary?.avgOrderValue || 0),
            totalDiscounts: Number(discountSummary?.totalDiscounts || 0),
            discountedOrders: Number(discountSummary?.discountedOrders || 0),
        },
        revenueByMethod: revenueByMethod.map((r) => ({
            method: r.method,
            revenue: Number(r.revenue),
            orders: Number(r.count),
        })),
        dailyRevenue: dailyRevenue.map((d) => ({
            date: d.date,
            revenue: Number(d.revenue),
            orders: Number(d.orders),
        })),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                { error: "Invalid request parameters" },
                { status: 400 }
            );
        }

        const { reportId, format, dateRange } = parsed.data;
        const { from, to } = parseDateRange(dateRange);

        // Determine report type from reportId
        let reportType: "sales" | "products" | "customers" | "financial";
        let data: any;

        if (reportId.startsWith("daily-") || reportId.startsWith("weekly-") || reportId.startsWith("monthly-") || reportId.includes("order") || reportId.includes("revenue")) {
            reportType = "sales";
            data = await fetchSalesReportData(from, to);
        } else if (reportId.includes("product") || reportId.includes("inventory") || reportId.includes("catalog") || reportId.includes("stock") || reportId.includes("category")) {
            reportType = "products";
            data = await fetchProductsReportData();
        } else if (reportId.includes("customer") || reportId.includes("acquisition") || reportId.includes("segment") || reportId.includes("geographic")) {
            reportType = "customers";
            data = await fetchCustomersReportData(from, to);
        } else if (reportId.includes("profit") || reportId.includes("tax") || reportId.includes("discount") || reportId.includes("shipping") || reportId.includes("refund") || reportId.includes("payment") || reportId.includes("financial")) {
            reportType = "financial";
            data = await fetchFinancialReportData(from, to);
        } else {
            reportType = "sales";
            data = await fetchSalesReportData(from, to);
        }

        return Response.json({
            success: true,
            reportType,
            reportId,
            format,
            dateRange: { from: from.toISOString(), to: to.toISOString() },
            data,
        });
    } catch (error: any) {
        console.error("Report generation error:", error);
        return Response.json(
            { error: error.message || "Failed to generate report" },
            { status: 500 }
        );
    }
}
