import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { settingsRepository } from "../repositories/settings.repository";

async function getLowStockThreshold() {
  const s = await settingsRepository.findByKey("low_stock_threshold");
  const n = Number(s?.value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.floor(n));
}

export class ProductsRepository {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    stockStatus?: string;
    isFeatured?: boolean;
    onSale?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(or(ilike(schema.products.name, like), ilike(schema.products.slug, like), ilike(schema.products.sku, like)) as any);
    }
    if (params.status) filters.push(eq(schema.products.status, params.status as any));
    if (params.stockStatus) filters.push(eq(schema.products.stockStatus, params.stockStatus as any));
    if (typeof params.isFeatured === "boolean") filters.push(eq(schema.products.isFeatured, params.isFeatured));
    if (typeof params.onSale === "boolean") {
      const saleCond = sql`${schema.products.compareAtPrice} is not null and ${schema.products.compareAtPrice} > ${schema.products.price}`;
      filters.push(params.onSale ? (saleCond as any) : (sql`NOT (${saleCond})` as any));
    }
    if (params.dateFrom) filters.push(sql`${schema.products.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${schema.products.createdAt} <= ${new Date(params.dateTo)}`);

    const where = filters.length ? and(...filters) : undefined as any;
    const orderBy = params.sort === "createdAt.asc" ? (schema.products.createdAt as any) : desc(schema.products.createdAt as any);

    // Subquery for primary image url
    const primaryImageUrl = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc
      limit 1
    )`;

    const sold = sql<number>`(
      select coalesce(sum(${schema.orderItems.quantity})::int, 0)
      from ${schema.orderItems}
      inner join ${schema.orders} on ${schema.orderItems.orderId} = ${schema.orders.id}
      where ${schema.orderItems.productId} = ${schema.products.id}
        and ${schema.orders.status} in ('shipped', 'delivered')
        and ${schema.orders.paymentStatus} <> 'failed'
    )`;

    const onSale = sql<boolean>`(${schema.products.compareAtPrice} is not null and ${schema.products.compareAtPrice} > ${schema.products.price})`;
    const items = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        sku: schema.products.sku,
        compareAtPrice: schema.products.compareAtPrice,
        price: schema.products.price,
        status: schema.products.status,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
        onSale,
        averageRating: schema.products.averageRating,
        reviewCount: schema.products.reviewCount,
        createdAt: schema.products.createdAt,
        updatedAt: schema.products.updatedAt,
        primaryImageUrl,
        categoryNames: sql<string[]>`coalesce(array_agg(distinct ${schema.categories.name}) filter (where ${schema.categories.id} is not null), '{}')`,
        quantity: sql<number>`coalesce(sum(${schema.inventory.quantity}) filter (where ${schema.inventory.variantId} is null)::int, 0)`,
        sold,
      })
      .from(schema.products)
      .leftJoin(schema.productCategories, eq(schema.productCategories.productId, schema.products.id))
      .leftJoin(schema.categories, eq(schema.categories.id, schema.productCategories.categoryId))
      .leftJoin(schema.inventory, eq(schema.inventory.productId, schema.products.id))
      .where(where as any)
      .groupBy(
        schema.products.id,
        schema.products.name,
        schema.products.slug,
        schema.products.sku,
        schema.products.compareAtPrice,
        schema.products.price,
        schema.products.status,
        schema.products.stockStatus,
        schema.products.isFeatured,
        schema.products.averageRating,
        schema.products.reviewCount,
        schema.products.createdAt,
        schema.products.updatedAt
      )
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.products).where(where as any);

    return { items, total: count ?? 0 };
  }

  async get(id: string) {
    const categoryIds = sql<string[]>`coalesce(array_agg(distinct ${schema.productCategories.categoryId}) filter (where ${schema.productCategories.categoryId} is not null), '{}')`;
    const quantity = sql<number>`coalesce(sum(${schema.inventory.quantity}) filter (where ${schema.inventory.variantId} is null)::int, 0)`;
    const rows = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        sku: schema.products.sku,
        description: schema.products.description,
        shortDescription: schema.products.shortDescription,
        price: schema.products.price,
        costPerItem: schema.products.costPerItem,
        compareAtPrice: schema.products.compareAtPrice,
        status: schema.products.status,
        stockStatus: schema.products.stockStatus,
        trackInventory: schema.products.trackInventory,
        isFeatured: schema.products.isFeatured,
        allowReviews: schema.products.allowReviews,
        publishedAt: schema.products.publishedAt,
        categoryIds,
        quantity,
      })
      .from(schema.products)
      .leftJoin(schema.productCategories, eq(schema.productCategories.productId, schema.products.id))
      .leftJoin(schema.inventory, eq(schema.inventory.productId, schema.products.id))
      .where(eq(schema.products.id, id))
      .groupBy(
        schema.products.id,
        schema.products.name,
        schema.products.slug,
        schema.products.sku,
        schema.products.description,
        schema.products.shortDescription,
        schema.products.price,
        schema.products.status,
        schema.products.stockStatus,
        schema.products.trackInventory,
        schema.products.isFeatured,
        schema.products.allowReviews,
        schema.products.publishedAt,
      );
    const row = rows[0];
    return row || null;
  }

  async create(input: {
    name: string;
    slug?: string;
    sku?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    price: string;
    costPerItem?: string | null;
    compareAtPrice?: string | null;
    status?: any;
    stockStatus?: any;
    trackInventory?: boolean;
    isFeatured?: boolean;
    allowReviews?: boolean;
    publishedAt?: Date | null;
    categoryIds?: string[];
    stockQuantity?: number;
  }) {
    const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [row] = await db
      .insert(schema.products)
      .values({
        name: input.name,
        slug,
        sku: input.sku ?? null,
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        price: input.price as any,
        costPerItem: (input.costPerItem ?? null) as any,
        compareAtPrice: (input.compareAtPrice ?? null) as any,
        status: (input.status as any) ?? ("draft" as any),
        stockStatus: (input.stockStatus as any) ?? ("in_stock" as any),
        trackInventory: typeof input.trackInventory === "boolean" ? input.trackInventory : true,
        isFeatured: Boolean(input.isFeatured),
        allowReviews: typeof input.allowReviews === "boolean" ? input.allowReviews : true,
        publishedAt: input.publishedAt ?? null,
      })
      .returning();
    const productId = row.id;

    // Categories (many-to-many)
    if (Array.isArray(input.categoryIds) && input.categoryIds.length) {
      await db
        .insert(schema.productCategories)
        .values(input.categoryIds.map((cid) => ({ productId, categoryId: cid })))
        .onConflictDoNothing();
    }

    // Inventory (product-level quantity)
    if (typeof input.stockQuantity === "number" && input.stockQuantity >= 0) {
      const lowStockThreshold = await getLowStockThreshold();
      const qty = input.stockQuantity;
      const stockStatus = qty <= 0 ? ("out_of_stock" as any) : qty <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
      const [existing] = await db
        .select({ id: schema.inventory.id })
        .from(schema.inventory)
        .where(and(eq(schema.inventory.productId, productId), sql`${schema.inventory.variantId} is null` as any))
        .limit(1);

      if (!existing?.id) {
        await db.insert(schema.inventory).values({ productId, variantId: null, quantity: qty, reservedQuantity: 0, availableQuantity: qty } as any);
      } else {
        await db
          .update(schema.inventory)
          .set({ quantity: qty, reservedQuantity: 0, availableQuantity: qty, updatedAt: new Date() } as any)
          .where(eq(schema.inventory.id, existing.id));
      }
      await db.update(schema.products).set({ stockStatus }).where(eq(schema.products.id, productId));
      row.stockStatus = stockStatus;
    }

    return row;
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      slug: string;
      sku: string | null;
      description: string | null;
      shortDescription: string | null;
      price: string;
      costPerItem: string | null;
      compareAtPrice: string | null;
      status: any;
      stockStatus: any;
      trackInventory: boolean;
      isFeatured: boolean;
      allowReviews: boolean;
      publishedAt: Date | null;
      categoryIds: string[];
      stockQuantity: number;
      addStockQuantity: number;
    }>,
  ) {
    if (typeof patch.slug === "string" && patch.slug) {
      patch.slug = patch.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    const mutablePatch: any = { ...patch };
    delete mutablePatch.categoryIds;
    delete mutablePatch.stockQuantity;
    delete mutablePatch.addStockQuantity;
    mutablePatch.updatedAt = new Date();
    const [row] = await db.update(schema.products).set(mutablePatch as any).where(eq(schema.products.id, id)).returning();

    // Update categories
    if (Array.isArray(patch.categoryIds)) {
      await db.delete(schema.productCategories).where(eq(schema.productCategories.productId, id));
      if (patch.categoryIds.length) {
        await db
          .insert(schema.productCategories)
          .values(patch.categoryIds.map((cid) => ({ productId: id, categoryId: cid })))
          .onConflictDoNothing();
      }
    }

    // Update inventory quantity and product stock status
    // - addStockQuantity increments stock (preferred)
    // - stockQuantity overwrites stock only if provided without addStockQuantity (legacy clients)
    const hasAdd = typeof (patch as any).addStockQuantity === "number" && Number((patch as any).addStockQuantity) > 0;
    const hasSet = typeof patch.stockQuantity === "number" && patch.stockQuantity >= 0 && !hasAdd;

    if (hasAdd || hasSet) {
      const qtyDelta = hasAdd ? Number((patch as any).addStockQuantity) : 0;
      const qtySet = hasSet ? Number(patch.stockQuantity) : null;

      if (hasAdd) {
        const [existing] = await db
          .select({ id: schema.inventory.id })
          .from(schema.inventory)
          .where(and(eq(schema.inventory.productId, id), sql`${schema.inventory.variantId} is null` as any))
          .limit(1);

        if (!existing?.id) {
          await db.insert(schema.inventory).values({ productId: id, variantId: null, quantity: qtyDelta, reservedQuantity: 0, availableQuantity: qtyDelta } as any);
        } else {
          await db
            .update(schema.inventory)
            .set({
              quantity: sql`${schema.inventory.quantity} + ${qtyDelta}` as any,
              availableQuantity: sql`${schema.inventory.availableQuantity} + ${qtyDelta}` as any,
              updatedAt: new Date(),
            })
            .where(eq(schema.inventory.id, existing.id));
        }
      } else if (hasSet && qtySet != null) {
        const [existing] = await db
          .select({ id: schema.inventory.id })
          .from(schema.inventory)
          .where(and(eq(schema.inventory.productId, id), sql`${schema.inventory.variantId} is null` as any))
          .limit(1);

        if (!existing?.id) {
          await db.insert(schema.inventory).values({ productId: id, variantId: null, quantity: qtySet, reservedQuantity: 0, availableQuantity: qtySet } as any);
        } else {
          await db
            .update(schema.inventory)
            .set({ quantity: qtySet, reservedQuantity: 0, availableQuantity: qtySet, updatedAt: new Date() } as any)
            .where(eq(schema.inventory.id, existing.id));
        }
      }

      const [{ avail = 0 } = {} as any] = await db
        .select({ avail: sql<number>`coalesce(sum(${schema.inventory.availableQuantity})::int, 0)` })
        .from(schema.inventory)
        .where(and(eq(schema.inventory.productId, id), sql`${schema.inventory.variantId} is null` as any));

      const lowStockThreshold = await getLowStockThreshold();
      const stockStatus = Number(avail) <= 0 ? ("out_of_stock" as any) : Number(avail) <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
      await db.update(schema.products).set({ stockStatus, updatedAt: new Date() } as any).where(eq(schema.products.id, id));
      if (row) (row as any).stockStatus = stockStatus;
    }
    return row || null;
  }

  async remove(id: string) {
    const res = await db.delete(schema.products).where(eq(schema.products.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }

  // ============== IMAGES ==============
  async listImages(productId: string) {
    const rows = await db
      .select({
        id: schema.productImages.id,
        productId: schema.productImages.productId,
        url: schema.productImages.url,
        altText: schema.productImages.altText,
        sortOrder: schema.productImages.sortOrder,
        isPrimary: schema.productImages.isPrimary,
        createdAt: schema.productImages.createdAt,
      })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, productId))
      .orderBy(schema.productImages.sortOrder as any, schema.productImages.createdAt as any);
    return rows;
  }

  async addImages(productId: string, items: Array<{ url: string; altText?: string | null }>) {
    if (!items.length) return [] as any[];
    const existing = await this.listImages(productId);
    const baseSort = existing.length ? Math.max(...existing.map((r) => r.sortOrder ?? 0)) + 1 : 0;
    const values = items.map((it, idx) => ({ productId, url: it.url, altText: it.altText ?? null, sortOrder: baseSort + idx, isPrimary: false }));
    const inserted = await db.insert(schema.productImages).values(values).returning();
    return inserted;
  }

  async updateImage(productId: string, imageId: string, patch: Partial<{ altText: string | null; isPrimary: boolean; sortOrder: number }>) {
    if (patch.isPrimary === true) {
      await db.update(schema.productImages).set({ isPrimary: false }).where(eq(schema.productImages.productId, productId));
    }
    const [row] = await db
      .update(schema.productImages)
      .set(patch as any)
      .where(and(eq(schema.productImages.id, imageId), eq(schema.productImages.productId, productId)))
      .returning();
    return row || null;
  }

  async removeImage(productId: string, imageId: string) {
    const [img] = await db
      .select()
      .from(schema.productImages)
      .where(and(eq(schema.productImages.id, imageId), eq(schema.productImages.productId, productId)))
      .limit(1);
    if (!img) return { ok: false, url: null };
    const res = await db.delete(schema.productImages).where(and(eq(schema.productImages.id, imageId), eq(schema.productImages.productId, productId)));
    return { ok: (res.rowCount ? res.rowCount > 0 : false) as boolean, url: (img as any).url as string };
  }
}

export const productsRepository = new ProductsRepository();
