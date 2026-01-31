import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, ne } from "drizzle-orm";

export class FinancialReportsRepository {
  async getRevenueSummary(from: Date, to: Date) {
    const [summary] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
        totalOrders: sql<number>`count(*)`,
        avgOrderValue: sql<number>`coalesce(avg(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ));
    return summary;
  }

  async getTotalProfit(from: Date, to: Date) {
    const [profit] = await db
      .select({
        totalProfit: sql<number>`
          COALESCE(SUM(${schema.orderItems.totalPrice}::numeric), 0)
          - COALESCE(SUM(COALESCE(${schema.productVariants.costPerItem}, ${schema.products.costPerItem}, 0)::numeric * ${schema.orderItems.quantity}), 0)
        `,
      })
      .from(schema.orderItems)
      .leftJoin(schema.orders, sql`${schema.orders.id} = ${schema.orderItems.orderId}` as any)
      .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
      .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ) as any);
    return profit;
  }

  async getDiscountSummary(from: Date, to: Date) {
    const [summary] = await db
      .select({
        totalDiscounts: sql<number>`coalesce(sum(${schema.orders.discountAmount}), 0)`,
        discountedOrders: sql<number>`count(distinct case when ${schema.orders.discountAmount} > 0 then ${schema.orders.id} end)`,
      })
      .from(schema.orders)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ));
    return summary;
  }

  async getRevenueByPaymentMethod(from: Date, to: Date) {
    return await db
      .select({
        method: sql<string>`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`,
        revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ))
      .groupBy(sql`coalesce(${schema.orders.paymentMethod}::text, 'Unknown')`)
      .orderBy(desc(sql`coalesce(sum(${schema.orders.totalAmount}), 0)`));
  }

  async getTaxData(from: Date, to: Date) {
    return await db
      .select({
        date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
        taxableSales: sql<number>`coalesce(sum(${schema.orders.subtotal}), 0)`,
        taxCollected: sql<number>`coalesce(sum(${schema.orders.taxAmount}), 0)`,
      })
      .from(schema.orders)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ))
      .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);
  }

  async getDiscountData(from: Date, to: Date) {
    return await db
      .select({
        hasDiscount: sql<string>`case when ${schema.orders.discountAmount} > 0 then 'With Discount' else 'No Discount' end`,
        uses: sql<number>`count(*)`,
        totalDiscount: sql<number>`coalesce(sum(${schema.orders.discountAmount}), 0)`,
        revenue: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
        avgDiscount: sql<number>`coalesce(avg(${schema.orders.discountAmount}), 0)`,
      })
      .from(schema.orders)
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        ne(schema.orders.status, "cancelled")
      ))
      .groupBy(sql`case when ${schema.orders.discountAmount} > 0 then 'With Discount' else 'No Discount' end`)
      .orderBy(desc(sql`coalesce(sum(${schema.orders.discountAmount}), 0)`));
  }

  async getRefunds(from: Date, to: Date, limit: number = 500) {
    return await db
      .select({
        orderNumber: schema.orders.orderNumber,
        createdAt: schema.refunds.createdAt,
        reason: schema.refunds.reason,
        amount: schema.refunds.amount,
        status: schema.refunds.status,
      })
      .from(schema.refunds)
      .innerJoin(schema.orders, eq(schema.refunds.orderId, schema.orders.id))
      .where(and(
        gte(schema.refunds.createdAt, from),
        lte(schema.refunds.createdAt, to)
      ))
      .orderBy(desc(schema.refunds.createdAt))
      .limit(limit);
  }

  async getShippingData(from: Date, to: Date) {
    return await db
      .select({
        carrier: sql<string>`coalesce(${schema.shipments.carrier}, 'Unknown')`,
        shipments: sql<number>`count(*)`,
        totalCost: sql<number>`coalesce(sum(${schema.orders.shippingAmount}), 0)`,
        avgCost: sql<number>`coalesce(avg(${schema.orders.shippingAmount}), 0)`,
      })
      .from(schema.shipments)
      .innerJoin(schema.orders, eq(schema.shipments.orderId, schema.orders.id))
      .where(and(
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to)
      ))
      .groupBy(sql`coalesce(${schema.shipments.carrier}, 'Unknown')`)
      .orderBy(desc(sql`count(*)`));
  }
}

export const financialReportsRepository = new FinancialReportsRepository();
