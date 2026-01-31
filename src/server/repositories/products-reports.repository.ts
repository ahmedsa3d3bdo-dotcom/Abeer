import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Products Reports Repository
 * Handles all database queries for product report generation
 * Pure data access layer - no business logic
 */
export class ProductsReportsRepository {
  // Product Catalog queries
  async getAllProducts(limit: number = 500) {
    return await db
      .select({
        name: schema.products.name,
        sku: schema.products.sku,
        price: schema.products.price,
        costPerItem: schema.products.costPerItem,
        status: schema.products.status,
        stockStatus: schema.products.stockStatus,
        stock: schema.inventory.availableQuantity,
        soldCount: schema.products.soldCount,
        viewCount: schema.products.viewCount,
      })
      .from(schema.products)
      .leftJoin(schema.inventory, eq(schema.inventory.productId, schema.products.id))
      .orderBy(desc(schema.products.soldCount))
      .limit(limit);
  }

  async getLowStockProducts(limit: number = 50) {
    return await db
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
      .limit(limit);
  }

  async getOutOfStockProducts(limit: number = 50) {
    return await db
      .select({
        name: schema.products.name,
        sku: schema.products.sku,
      })
      .from(schema.inventory)
      .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
      .where(eq(schema.inventory.availableQuantity, 0))
      .limit(limit);
  }

  async getProductsSummary() {
    const [summary] = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        activeProducts: sql<number>`sum(case when ${schema.products.status} = 'active' then 1 else 0 end)`,
      })
      .from(schema.products);

    return summary;
  }

  // Inventory Levels queries
  async getInventoryLevels(limit: number = 500) {
    return await db
      .select({
        productName: schema.products.name,
        sku: schema.products.sku,
        availableQuantity: schema.inventory.availableQuantity,
        reservedQuantity: schema.inventory.reservedQuantity,
        price: schema.products.price,
        lowStockThreshold: schema.inventory.lowStockThreshold,
      })
      .from(schema.inventory)
      .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
      .orderBy(desc(sql`${schema.inventory.availableQuantity} * ${schema.products.price}`))
      .limit(limit);
  }

  // Product Performance queries
  async getProductPerformance(from: Date, to: Date, limit: number = 200) {
    return await db
      .select({
        productId: schema.orderItems.productId,
        name: sql<string>`max(${schema.orderItems.productName})`,
        sku: sql<string>`max(coalesce(${schema.orderItems.sku}, ''))`,
        unitsSold: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
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
        views: sql<number>`max(${schema.products.viewCount})`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .leftJoin(schema.products, sql`${schema.products.id} = ${schema.orderItems.productId}` as any)
      .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
      .where(
        and(
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to),
          sql`${schema.orders.status} != 'cancelled'`
        )
      )
      .groupBy(schema.orderItems.productId)
      .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`))
      .limit(limit);
  }

  // Category Breakdown queries
  async getCategoryBreakdown(from: Date, to: Date) {
    return await db
      .select({
        categoryId: schema.categories.id,
        name: schema.categories.name,
        products: sql<number>`count(distinct ${schema.products.id})`,
        revenue: sql<number>`coalesce(sum(${schema.orderItems.totalPrice}), 0)`,
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
        units: sql<number>`coalesce(sum(${schema.orderItems.quantity}), 0)`,
      })
      .from(schema.categories)
      .leftJoin(schema.productCategories, eq(schema.productCategories.categoryId, schema.categories.id))
      .leftJoin(schema.products, eq(schema.products.id, schema.productCategories.productId))
      .leftJoin(schema.orderItems, eq(schema.orderItems.productId, schema.products.id))
      .leftJoin(schema.orders, and(
        eq(schema.orders.id, schema.orderItems.orderId),
        gte(schema.orders.createdAt, from),
        lte(schema.orders.createdAt, to),
        sql`${schema.orders.status} != 'cancelled'`
      ) as any)
      .leftJoin(schema.productVariants, sql`${schema.productVariants.id} = ${schema.orderItems.variantId}` as any)
      .groupBy(schema.categories.id, schema.categories.name)
      .orderBy(desc(sql`coalesce(sum(${schema.orderItems.totalPrice}), 0)`));
  }
}

export const productsReportsRepository = new ProductsReportsRepository();
