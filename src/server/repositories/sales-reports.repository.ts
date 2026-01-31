import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, ne } from "drizzle-orm";

/**
 * Sales Reports Repository
 * Handles all database queries for sales report generation
 * Pure data access layer - no business logic
 */
export class SalesReportsRepository {
  // Common queries used across multiple reports
  
  async getSalesSummary(from: Date, to: Date) {
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

    return summary;
  }

  async getTotalProfit(from: Date, to: Date) {
    const [profitSummary] = await db
      .select({
        totalProfit: sql<number>`
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
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to),
          ne(schema.orders.status, "cancelled")
        ) as any
      );

    return profitSummary;
  }

  async getDailySalesData(from: Date, to: Date) {
    return await db
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
  }

  async getDailyProfit(from: Date, to: Date) {
    return await db
      .select({
        date: sql<string>`date_trunc('day', ${schema.orders.createdAt})::date`,
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
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to),
          ne(schema.orders.status, "cancelled")
        ) as any
      )
      .groupBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${schema.orders.createdAt})::date`);
  }

  async getWeeklySalesData(from: Date, to: Date) {
    return await db
      .select({
        week: sql<string>`TO_CHAR(date_trunc('week', ${schema.orders.createdAt}), 'YYYY-"W"IW')`,
        weekStart: sql<string>`date_trunc('week', ${schema.orders.createdAt})::date`,
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
      .groupBy(sql`date_trunc('week', ${schema.orders.createdAt})`)
      .orderBy(sql`date_trunc('week', ${schema.orders.createdAt})`);
  }

  async getWeeklyProfit(from: Date, to: Date) {
    return await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${schema.orders.createdAt})::date`,
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
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to),
          ne(schema.orders.status, "cancelled")
        ) as any
      )
      .groupBy(sql`date_trunc('week', ${schema.orders.createdAt})`)
      .orderBy(sql`date_trunc('week', ${schema.orders.createdAt})`);
  }

  async getMonthlySalesData(from: Date, to: Date) {
    return await db
      .select({
        month: sql<string>`TO_CHAR(date_trunc('month', ${schema.orders.createdAt}), 'YYYY-MM')`,
        monthStart: sql<string>`date_trunc('month', ${schema.orders.createdAt})::date`,
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
      .groupBy(sql`date_trunc('month', ${schema.orders.createdAt})`)
      .orderBy(sql`date_trunc('month', ${schema.orders.createdAt})`);
  }

  async getMonthlyProfit(from: Date, to: Date) {
    return await db
      .select({
        monthStart: sql<string>`date_trunc('month', ${schema.orders.createdAt})::date`,
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
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to),
          ne(schema.orders.status, "cancelled")
        ) as any
      )
      .groupBy(sql`date_trunc('month', ${schema.orders.createdAt})`)
      .orderBy(sql`date_trunc('month', ${schema.orders.createdAt})`);
  }

  async getNewCustomersByMonth(from: Date, to: Date) {
    return await db
      .select({
        monthStart: sql<string>`date_trunc('month', ${schema.users.createdAt})::date`,
        newCustomers: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(
        and(
          gte(schema.users.createdAt, from),
          lte(schema.users.createdAt, to)
        )
      )
      .groupBy(sql`date_trunc('month', ${schema.users.createdAt})`)
      .orderBy(sql`date_trunc('month', ${schema.users.createdAt})`);
  }

  async getOrdersList(from: Date, to: Date, limit: number = 1000) {
    return await db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        createdAt: schema.orders.createdAt,
        customerEmail: schema.orders.customerEmail,
        status: schema.orders.status,
        paymentStatus: schema.orders.paymentStatus,
        paymentMethod: schema.orders.paymentMethod,
        subtotal: schema.orders.subtotal,
        discountAmount: schema.orders.discountAmount,
        taxAmount: schema.orders.taxAmount,
        shippingAmount: schema.orders.shippingAmount,
        totalAmount: schema.orders.totalAmount,
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to)
        )
      )
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit);
  }

  async getTopProducts(from: Date, to: Date, limit: number = 200) {
    return await db
      .select({
        name: sql<string>`max(${schema.orderItems.productName})`,
        sku: sql<string>`max(coalesce(${schema.orderItems.sku}, ''))`,
        units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
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
      .limit(limit);
  }

  async getRevenueByCategory(from: Date, to: Date) {
    return await db
      .select({
        categoryId: schema.categories.id,
        name: schema.categories.name,
        products: sql<number>`count(distinct ${schema.orderItems.productId})`,
        units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
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
      .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`));
  }
}

export const salesReportsRepository = new SalesReportsRepository();
