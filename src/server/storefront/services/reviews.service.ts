import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, sql, inArray } from "drizzle-orm";

export type StorefrontReview = {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  helpfulCount: number;
  images?: Array<{ id: string; url: string }>;
};

export type RecentReview = StorefrontReview & {
  product: { id: string; name: string; slug: string };
};

export class StorefrontReviewsService {
  async listByProduct(params: {
    productId: string;
    rating?: number;
    sortBy?: "recent" | "helpful" | "rating_high" | "rating_low";
  }): Promise<{
    reviews: StorefrontReview[];
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }> {
    const { productId, rating, sortBy = "recent" } = params;

    // Base where
    const whereBase = [
      eq(schema.productReviews.productId, productId),
      eq(schema.productReviews.isApproved, true),
    ];
    if (typeof rating === "number") {
      whereBase.push(eq(schema.productReviews.rating, rating));
    }

    // Sorting
    let orderBy: any = desc(schema.productReviews.createdAt);
    switch (sortBy) {
      case "helpful":
        orderBy = desc(schema.productReviews.helpfulCount);
        break;
      case "rating_high":
        orderBy = desc(schema.productReviews.rating);
        break;
      case "rating_low":
        orderBy = schema.productReviews.rating;
        break;
      case "recent":
      default:
        orderBy = desc(schema.productReviews.createdAt);
        break;
    }

    // Reviews list with author
    const rows = await db
      .select({
        id: schema.productReviews.id,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        content: schema.productReviews.content,
        isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
        createdAt: schema.productReviews.createdAt,
        helpfulCount: schema.productReviews.helpfulCount,
        authorFirst: schema.users.firstName,
        authorLast: schema.users.lastName,
        authorEmail: schema.users.email,
      })
      .from(schema.productReviews)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.productReviews.userId)
      )
      .where(and(...(whereBase as any)))
      .orderBy(orderBy);

    const reviewIds = rows.map((r) => r.id);

    // Images for the selected reviews
    const images = reviewIds.length
      ? await db
          .select({
            id: schema.reviewImages.id,
            reviewId: schema.reviewImages.reviewId,
            url: schema.reviewImages.url,
          })
          .from(schema.reviewImages)
          .where(inArray(schema.reviewImages.reviewId, reviewIds))
      : [];

    const imagesByReview = new Map<string, Array<{ id: string; url: string }>>();
    for (const img of images) {
      const list = imagesByReview.get(img.reviewId) || [];
      list.push({ id: img.id, url: img.url });
      imagesByReview.set(img.reviewId, list);
    }

    const reviews: StorefrontReview[] = rows.map((r) => {
      const name = [r.authorFirst, r.authorLast].filter(Boolean).join(" ");
      const emailName = (r.authorEmail || "").split("@")[0];
      return {
        id: r.id,
        rating: Number(r.rating),
        title: r.title ?? undefined,
        comment: r.content,
        authorName: name || emailName || "Anonymous",
        isVerifiedPurchase: !!r.isVerifiedPurchase,
        createdAt: (r.createdAt as unknown as Date).toISOString?.() ?? String(r.createdAt),
        helpfulCount: Number(r.helpfulCount ?? 0),
        images: imagesByReview.get(r.id) || [],
      };
    });

    // Rating distribution across all approved reviews for the product (ignore rating filter)
    const distRows = await db
      .select({
        rating: schema.productReviews.rating,
        count: sql<number>`count(*)`,
      })
      .from(schema.productReviews)
      .where(
        and(
          eq(schema.productReviews.productId, productId),
          eq(schema.productReviews.isApproved, true)
        )
      )
      .groupBy(schema.productReviews.rating);

    const distribution: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows) {
      distribution[Number(row.rating) as 1 | 2 | 3 | 4 | 5] = Number(row.count);
    }

    return { reviews, distribution };
  }

  async listRecent(limit = 8): Promise<RecentReview[]> {
    const rows = await db
      .select({
        id: schema.productReviews.id,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        content: schema.productReviews.content,
        isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
        createdAt: schema.productReviews.createdAt,
        helpfulCount: schema.productReviews.helpfulCount,
        authorFirst: schema.users.firstName,
        authorLast: schema.users.lastName,
        authorEmail: schema.users.email,
        productId: schema.products.id,
        productName: schema.products.name,
        productSlug: schema.products.slug,
      })
      .from(schema.productReviews)
      .innerJoin(schema.products, eq(schema.products.id, schema.productReviews.productId))
      .leftJoin(schema.users, eq(schema.users.id, schema.productReviews.userId))
      .where(and(eq(schema.productReviews.isApproved, true)))
      .orderBy(desc(schema.productReviews.createdAt))
      .limit(limit);

    return rows.map((r) => {
      const name = [r.authorFirst, r.authorLast].filter(Boolean).join(" ");
      const emailName = (r.authorEmail || "").split("@")[0];
      return {
        id: r.id,
        rating: Number(r.rating),
        title: r.title ?? undefined,
        comment: r.content,
        authorName: name || emailName || "Anonymous",
        isVerifiedPurchase: !!r.isVerifiedPurchase,
        createdAt: (r.createdAt as unknown as Date).toISOString?.() ?? String(r.createdAt),
        helpfulCount: Number(r.helpfulCount ?? 0),
        images: [],
        product: { id: r.productId, name: r.productName, slug: r.productSlug },
      };
    });
  }
}

export const storefrontReviewsService = new StorefrontReviewsService();
