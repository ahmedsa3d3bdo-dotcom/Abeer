import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewsService } from "../services/reviews.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody, validateQuery } from "../utils/validation";
import { writeAudit } from "../utils/audit";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  productId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isApproved: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isApproved: z.coerce.boolean().optional(),
});

export class ReviewsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "reviews.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await reviewsService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "reviews.view");
      const result = await reviewsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "reviews.manage");
      const body = await validateBody(request, updateSchema);
      const patch: any = { ...body };
      if (typeof body.isApproved === "boolean") {
        patch.approvedAt = body.isApproved ? new Date() : null;
        patch.approvedBy = body.isApproved ? (session?.user?.id as string | undefined) ?? null : null;
      }
      const result = await reviewsService.update(id, patch);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "reviews",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: patch,
      });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "reviews.manage");
      const result = await reviewsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "reviews",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
      });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "reviews.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.productReviews.title} ILIKE ${like} OR ${schema.productReviews.content} ILIKE ${like})`);
      }
      if (query.productId) filters.push(sql`${schema.productReviews.productId} = ${query.productId}`);
      if (typeof query.rating === "number") filters.push(sql`${schema.productReviews.rating} = ${query.rating}`);
      if (typeof query.isApproved === "boolean") filters.push(sql`${schema.productReviews.isApproved} = ${query.isApproved}`);
      if (query.dateFrom) filters.push(sql`${schema.productReviews.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.productReviews.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalReviews, avgRating }] = await db
        .select({
          totalReviews: sql<number>`count(*)`,
          avgRating: sql<string>`COALESCE(AVG(${schema.productReviews.rating}), '0')`,
        })
        .from(schema.productReviews)
        .where(where as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ reviews30d, avgRating30d }] = await db
        .select({
          reviews30d: sql<number>`COUNT(*)`,
          avgRating30d: sql<string>`COALESCE(AVG(${schema.productReviews.rating}), '0')`,
        })
        .from(schema.productReviews)
        .where(sql`${where ? sql`(${where}) AND ` : sql``}${schema.productReviews.createdAt} >= ${since}` as any);

      const [{ approvedReviews }] = await db
        .select({ approvedReviews: sql<number>`count(*)` })
        .from(schema.productReviews)
        .where(sql`${schema.productReviews.isApproved} = true AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ verifiedReviews }] = await db
        .select({ verifiedReviews: sql<number>`count(*)` })
        .from(schema.productReviews)
        .where(sql`${schema.productReviews.isVerifiedPurchase} = true AND ${where ? sql`(${where})` : sql`true`}` as any);

      // With images: count of distinct reviews having at least one image
      const [{ withImages }] = await db
        .select({ withImages: sql<number>`COUNT(DISTINCT ${schema.reviewImages.reviewId})` })
        .from(schema.reviewImages)
        .innerJoin(schema.productReviews, sql`${schema.reviewImages.reviewId} = ${schema.productReviews.id}`)
        .where(where as any);

      const pendingReviews = Number(totalReviews || 0) - Number(approvedReviews || 0);

      return successResponse({
        totalReviews: Number(totalReviews || 0),
        approvedReviews: Number(approvedReviews || 0),
        pendingReviews: pendingReviews < 0 ? 0 : pendingReviews,
        avgRating: Number(avgRating || 0),
        reviews30d: Number(reviews30d || 0),
        avgRating30d: Number(avgRating30d || 0),
        verifiedReviews: Number(verifiedReviews || 0),
        withImages: Number(withImages || 0),
      });
    } catch (e) {
       return handleRouteError(e, request);
    }
  }
}
