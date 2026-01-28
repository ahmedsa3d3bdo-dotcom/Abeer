import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";

export class OrdersRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string; // order number or email
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
    userId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(sql`(${schema.orders.orderNumber} ILIKE ${like} OR ${schema.orders.customerEmail} ILIKE ${like})`);
    }
    if (params.status) filters.push(eq(schema.orders.status, params.status as any));
    if (params.paymentStatus) filters.push(eq(schema.orders.paymentStatus, params.paymentStatus as any));
    if (params.dateFrom) filters.push(sql`${schema.orders.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.orders.createdAt} <= ${new Date(params.dateTo)}`);
    if (params.userId) filters.push(eq(schema.orders.userId, params.userId as any));

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.orders.createdAt as any) : desc(schema.orders.createdAt as any);

    const items = await db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerEmail: schema.orders.customerEmail,
        customerPhone: schema.orders.customerPhone,
        status: schema.orders.status,
        paymentStatus: schema.orders.paymentStatus,
        paymentMethod: schema.orders.paymentMethod,
        subtotal: schema.orders.subtotal,
        taxAmount: schema.orders.taxAmount,
        shippingAmount: schema.orders.shippingAmount,
        discountAmount: schema.orders.discountAmount,
        totalAmount: schema.orders.totalAmount,
        currency: schema.orders.currency,
        createdAt: schema.orders.createdAt,
        customerFirstName: schema.users.firstName,
        customerLastName: schema.users.lastName,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(where as any)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.orders).where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const [row] = await db
      .select({
        ...schema.orders,
        customerFirstName: schema.users.firstName,
        customerLastName: schema.users.lastName,
      } as any)
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(eq(schema.orders.id, id))
      .limit(1);
    return (row as any) || null;
  }

  async getDetails(id: string) {
    const order = await this.get(id);
    if (!order) return null;

    const items = await db
      .select({
        id: schema.orderItems.id,
        productId: schema.orderItems.productId,
        variantId: schema.orderItems.variantId,
        productName: schema.orderItems.productName,
        variantName: schema.orderItems.variantName,
        sku: schema.orderItems.sku,
        quantity: schema.orderItems.quantity,
        unitPrice: schema.orderItems.unitPrice,
        totalPrice: schema.orderItems.totalPrice,
        taxAmount: schema.orderItems.taxAmount,
        discountAmount: schema.orderItems.discountAmount,
        productPrice: schema.products.price,
        productCompareAtPrice: schema.products.compareAtPrice,
        variantPrice: schema.productVariants.price,
        variantCompareAtPrice: schema.productVariants.compareAtPrice,
      })
      .from(schema.orderItems)
      .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
      .leftJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
      .where(eq(schema.orderItems.orderId, id));

    const shipments = await db
      .select({
        id: schema.shipments.id,
        orderId: schema.shipments.orderId,
        shippingMethodId: schema.shipments.shippingMethodId,
        methodName: schema.shippingMethods.name,
        trackingNumber: schema.shipments.trackingNumber,
        carrier: schema.shipments.carrier,
        status: schema.shipments.status,
        shippedAt: schema.shipments.shippedAt,
        estimatedDeliveryAt: schema.shipments.estimatedDeliveryAt,
        deliveredAt: schema.shipments.deliveredAt,
        notes: schema.shipments.notes,
        createdAt: schema.shipments.createdAt,
        updatedAt: schema.shipments.updatedAt,
      })
      .from(schema.shipments)
      .leftJoin(schema.shippingMethods, eq(schema.shippingMethods.id, schema.shipments.shippingMethodId))
      .where(eq(schema.shipments.orderId, id));

    // Shipping address snapshot (works for guests and users)
    const [shippingAddress] = await db
      .select()
      .from(schema.orderShippingAddresses)
      .where(eq(schema.orderShippingAddresses.orderId, id))
      .limit(1);

    const orderDiscounts = await db
      .select({
        id: schema.orderDiscounts.id,
        orderId: schema.orderDiscounts.orderId,
        discountId: schema.orderDiscounts.discountId,
        code: schema.orderDiscounts.code,
        amount: schema.orderDiscounts.amount,
        discountName: schema.discounts.name,
        discountType: schema.discounts.type,
        discountValue: schema.discounts.value,
        discountMetadata: schema.discounts.metadata,
      })
      .from(schema.orderDiscounts)
      .leftJoin(schema.discounts, eq(schema.discounts.id, schema.orderDiscounts.discountId))
      .where(eq(schema.orderDiscounts.orderId, id));

    const discountIds = Array.from(
      new Set(orderDiscounts.map((d) => d.discountId).filter(Boolean)),
    ) as string[];

    let orderDiscountsWithTargets = orderDiscounts as Array<typeof orderDiscounts[number] & { targetProductIds?: string[] }>;

    if (discountIds.length) {
      const discountProductRows = await db
        .select({
          discountId: schema.discountProducts.discountId,
          productId: schema.discountProducts.productId,
        })
        .from(schema.discountProducts)
        .where(inArray(schema.discountProducts.discountId, discountIds));

      const discountCategoryRows = await db
        .select({
          discountId: schema.discountCategories.discountId,
          categoryId: schema.discountCategories.categoryId,
        })
        .from(schema.discountCategories)
        .where(inArray(schema.discountCategories.discountId, discountIds));

      const categoryIds = Array.from(new Set(discountCategoryRows.map((r) => r.categoryId))).filter(Boolean) as string[];

      const productCategoryRows = categoryIds.length
        ? await db
            .select({
              productId: schema.productCategories.productId,
              categoryId: schema.productCategories.categoryId,
            })
            .from(schema.productCategories)
            .where(inArray(schema.productCategories.categoryId, categoryIds))
        : [];

      const productsByCategoryId = new Map<string, string[]>();
      for (const row of productCategoryRows) {
        const arr = productsByCategoryId.get(row.categoryId) ?? [];
        arr.push(row.productId);
        productsByCategoryId.set(row.categoryId, arr);
      }

      const productIdsByDiscountId = new Map<string, Set<string>>();
      for (const row of discountProductRows) {
        const set = productIdsByDiscountId.get(row.discountId) ?? new Set<string>();
        set.add(row.productId);
        productIdsByDiscountId.set(row.discountId, set);
      }

      for (const row of discountCategoryRows) {
        const set = productIdsByDiscountId.get(row.discountId) ?? new Set<string>();
        const productIds = productsByCategoryId.get(row.categoryId) ?? [];
        for (const productId of productIds) set.add(productId);
        productIdsByDiscountId.set(row.discountId, set);
      }

      orderDiscountsWithTargets = orderDiscounts.map((d) => {
        const key = d.discountId ?? "";
        const targetProductIds = productIdsByDiscountId.get(key);
        return {
          ...d,
          targetProductIds: targetProductIds ? Array.from(targetProductIds) : [],
        };
      });
    }

    return { order, items, shipments, shippingAddress, orderDiscounts: orderDiscountsWithTargets };
  }

  async update(id: string, patch: Partial<{ status: any; paymentStatus: any; adminNote: string | null }>) {
    const [row] = await db.update(schema.orders).set(patch as any).where(eq(schema.orders.id, id)).returning();
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.orders).where(eq(schema.orders.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export const ordersRepository = new OrdersRepository();
