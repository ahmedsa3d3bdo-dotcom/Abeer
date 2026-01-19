import { reviewsRepository } from "../repositories/reviews.repository";
import { productsRepository } from "../repositories/products.repository";
import { notificationsService } from "./notifications.service";
import { success, failure, type ServiceResult } from "../types";

export interface ListReviewParams {
  page?: number;
  limit?: number;
  q?: string;
  productId?: string;
  rating?: number;
  isApproved?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpdateReviewInput {
  title?: string | null;
  content?: string | null;
  rating?: number;
  isApproved?: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
}

class ReviewsService {
  async list(params: ListReviewParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await reviewsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_REVIEWS_FAILED", e?.message || "Failed to list reviews");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await reviewsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Review not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_REVIEW_FAILED", e?.message || "Failed to get review");
    }
  }

  async update(id: string, patch: UpdateReviewInput): Promise<ServiceResult<any>> {
    try {
      const before = await reviewsRepository.get(id);
      const row = await reviewsRepository.update(id, patch);
      if (!row) return failure("NOT_FOUND", "Review not found");
      try {
        const userId = (before as any)?.userId as string | undefined;
        const productId = (before as any)?.productId as string | undefined;
        // If moderation status changed, inform the author
        if (typeof patch.isApproved === "boolean" && userId && productId) {
          const product = await productsRepository.get(productId);
          const slug = (product as any)?.slug as string | undefined;
          const name = (product as any)?.name as string | undefined;
          const title = patch.isApproved ? "Review published" : "Review rejected";
          const message = patch.isApproved
            ? `Your review for ${name || "the product"} is now live`
            : `Your review for ${name || "the product"} was rejected`;
          await notificationsService.create(
            { userId, type: "product_review" as any, title, message, actionUrl: slug ? `/product/${slug}` : undefined },
            { userId },
          );
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_REVIEW_FAILED", e?.message || "Failed to update review");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await reviewsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Review not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_REVIEW_FAILED", e?.message || "Failed to delete review");
    }
  }
}

export const reviewsService = new ReviewsService();
