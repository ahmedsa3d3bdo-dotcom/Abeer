import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export class StorefrontWishlistRepository {
  async getOrCreate(userId: string) {
    const [existing] = await db
      .select()
      .from(schema.wishlists)
      .where(eq(schema.wishlists.userId, userId))
      .limit(1);
    if (existing) return existing;
    const [row] = await db
      .insert(schema.wishlists)
      .values({ userId })
      .returning();
    return row;
  }

  async listItems(userId: string) {
    const wishlist = await this.getOrCreate(userId);

    const primaryImageOnly = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnly = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnly}, ${variantImageOnly})`;

    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const avgApproved = sql<number>`(
      select coalesce(avg(${schema.productReviews.rating}), 0)
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const rows = await db
      .select({
        id: schema.wishlistItems.id,
        addedAt: schema.wishlistItems.addedAt,
        productId: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
      })
      .from(schema.wishlistItems)
      .innerJoin(schema.wishlists, eq(schema.wishlistItems.wishlistId, schema.wishlists.id))
      .innerJoin(schema.products, eq(schema.wishlistItems.productId, schema.products.id))
      .where(and(eq(schema.wishlists.userId, userId)))
      .orderBy(desc(schema.wishlistItems.addedAt));

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      addedAt: r.addedAt as any,
      product: {
        id: r.productId,
        name: r.name as any,
        slug: r.slug as any,
        price: parseFloat(r.price as any),
        compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice as any) : undefined,
        primaryImage: r.primaryImageUrl as any,
        images: [r.primaryImageUrl as any].filter(Boolean),
        rating: Number(r.rating || 0),
        reviewCount: Number(r.reviewCount || 0),
        stockStatus: r.stockStatus as any,
        isFeatured: Boolean(r.isFeatured),
      },
    }));
  }

  async addItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    await db
      .insert(schema.wishlistItems)
      .values({ wishlistId: wishlist.id, productId })
      .onConflictDoNothing({ target: [schema.wishlistItems.wishlistId, schema.wishlistItems.productId] });
    return this.listItems(userId);
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    await db
      .delete(schema.wishlistItems)
      .where(and(eq(schema.wishlistItems.wishlistId, wishlist.id), eq(schema.wishlistItems.productId, productId)));
    return this.listItems(userId);
  }

  async merge(userId: string, productIds: string[]) {
    const unique = Array.from(new Set(productIds));
    const wishlist = await this.getOrCreate(userId);
    if (unique.length === 0) return this.listItems(userId);
    await db
      .insert(schema.wishlistItems)
      .values(unique.map((pid) => ({ wishlistId: wishlist.id, productId: pid })))
      .onConflictDoNothing({ target: [schema.wishlistItems.wishlistId, schema.wishlistItems.productId] });
    return this.listItems(userId);
  }

  async clearItems(userId: string) {
    const wishlist = await this.getOrCreate(userId);
    await db
      .delete(schema.wishlistItems)
      .where(eq(schema.wishlistItems.wishlistId, wishlist.id));
    return [] as any[];
  }

  async listUserIdsByProduct(productId: string) {
    const rows = await db
      .select({ userId: schema.wishlists.userId })
      .from(schema.wishlistItems)
      .innerJoin(schema.wishlists, eq(schema.wishlistItems.wishlistId, schema.wishlists.id))
      .where(eq(schema.wishlistItems.productId, productId));
    return rows.map((r) => r.userId as string);
  }
}

export const storefrontWishlistRepository = new StorefrontWishlistRepository();
