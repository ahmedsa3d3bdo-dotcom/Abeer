import { NextRequest, NextResponse } from "next/server";
import { storefrontReviewsService } from "@/server/storefront/services/reviews.service";
import { storefrontProductsRepository } from "@/server/storefront/repositories/products.repository";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { enforceSecurity } from "@/server/utils/security-guards";
import { notificationsService } from "@/server/services/notifications.service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);

  const sortBy = (searchParams.get("sortBy") || "recent") as
    | "recent"
    | "helpful"
    | "rating_high"
    | "rating_low";
  const ratingParam = searchParams.get("rating");
  const rating = ratingParam ? Number(ratingParam) : undefined;

  try {
    // Accept either a UUID or a product slug in the path segment for flexibility
    let productId = slug;
    const isUuidLike = /^[0-9a-fA-F-]{36}$/.test(slug);

    if (!isUuidLike) {
      const product = await storefrontProductsRepository.getBySlug(slug);
      if (!product) {
        return NextResponse.json(
          { success: false, error: { message: "Product not found" } },
          { status: 404 }
        );
      }
      productId = product.id;
    }

    const result = await storefrontReviewsService.listByProduct({
      productId,
      sortBy,
      rating: typeof rating === "number" && !Number.isNaN(rating) ? rating : undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    console.error("Error fetching storefront reviews:", e);
    return NextResponse.json(
      {
        success: false,
        error: { message: e?.message || "Failed to fetch reviews" },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  try {
    const security = await enforceSecurity(request, "reviewsPost");
    if (security) return security;

    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    const body = await request.json();
    const rating = Number(body?.rating);
    const title = typeof body?.title === "string" ? body.title.slice(0, 255) : null;
    const comment = typeof body?.comment === "string" ? body.comment.slice(0, 1000) : "";

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid rating" } },
        { status: 400 }
      );
    }
    if (!comment) {
      return NextResponse.json(
        { success: false, error: { message: "Comment is required" } },
        { status: 400 }
      );
    }

    let productId = slug;
    const isUuidLike = /^[0-9a-fA-F-]{36}$/.test(slug);
    let productName: string | null = null;
    if (!isUuidLike) {
      const product = await storefrontProductsRepository.getBySlug(slug);
      if (!product) {
        return NextResponse.json(
          { success: false, error: { message: "Product not found" } },
          { status: 404 }
        );
      }
      productId = product.id;
      productName = (product as any)?.name ? String((product as any).name) : null;
    }

    if (!productName) {
      try {
        const [p] = await db
          .select({ name: schema.products.name })
          .from(schema.products)
          .where(eq(schema.products.id, productId))
          .limit(1);
        productName = p?.name ? String(p.name) : null;
      } catch {}
    }

    const [created] = await db
      .insert(schema.productReviews)
      .values({
        productId,
        userId: userId ?? null,
        rating,
        title: title || null,
        content: comment,
        isVerifiedPurchase: false,
        isApproved: false,
      })
      .returning({ id: schema.productReviews.id });

    // Notify admins
    try {
      const shortId = String(created.id).split("-")[0];
      const productLabel = productName ? String(productName) : "a product";
      void notificationsService
        .sendToRoles(
          {
            roleSlugs: ["super_admin", "admin"],
            type: "product_review" as any,
            title: `New review: ${productLabel} (${shortId})`,
            message: `New review submitted for ${productLabel} (rating ${rating}/5).`,
            actionUrl: "/dashboard/reviews",
            metadata: {
              entity: "review",
              entityId: created.id,
              productId,
              productName: productName || undefined,
            },
          },
          { userId: userId || undefined },
        )
        .catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to submit review" } },
      { status: 500 }
    );
  }
}
