"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/storefront/api-client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingStars } from "../atoms/rating-stars";
import { ReviewCard } from "../molecules/review-card";
import { ReviewForm } from "../molecules/review-form";
import { Star, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductReviewsProps {
  productId: string;
  averageRating: number;
  reviewCount: number;
}

export function ProductReviews({
  productId,
  averageRating,
  reviewCount,
}: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState("recent");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch reviews
  const { data: reviewsData, isLoading, refetch } = useQuery<{
    reviews: Array<{
      id: string;
      rating: number;
      title?: string;
      comment: string;
      authorName: string;
      isVerifiedPurchase: boolean;
      createdAt: string;
      helpfulCount: number;
      images?: Array<{
        id: string;
        url: string;
      }>;
    }>;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  }>({
    queryKey: ["product-reviews", productId, sortBy, filterRating],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sortBy", sortBy);
      if (filterRating) params.set("rating", filterRating.toString());
      
      // Note: This endpoint needs to be created
      return api.get(`/api/storefront/products/${productId}/reviews?${params}`);
    },
  });

  const reviews = reviewsData?.reviews || [];
  const ratingDistribution = reviewsData?.distribution || {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  // Derive totals from API (fallback to reviews length)
  const totalReviews =
    (ratingDistribution[1] || 0) +
    (ratingDistribution[2] || 0) +
    (ratingDistribution[3] || 0) +
    (ratingDistribution[4] || 0) +
    (ratingDistribution[5] || 0) ||
    reviews.length;

  // Compute average from API reviews if product average is zero
  const computedAverage =
    averageRating > 0
      ? averageRating
      : totalReviews > 0
      ? reviews.reduce((sum, r: any) => sum + (r.rating || 0), 0) / totalReviews
      : 0;

  // Calculate percentage for each rating
  const getRatingPercentage = (rating: number) => {
    if (totalReviews === 0) return 0;
    return (
      (ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100
    );
  };

  return (
    <div className="mt-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Customer Reviews
        </h2>
        <p className="text-muted-foreground">
          {totalReviews > 0
            ? `${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`
            : "No reviews yet"}
        </p>
      </div>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Overall Rating */}
        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
          <div className="text-5xl font-bold mb-2">
            {computedAverage.toFixed(1)}
          </div>
          <RatingStars rating={computedAverage} size="lg" />
          <p className="text-sm text-muted-foreground mt-2">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="lg:col-span-2 space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() =>
                setFilterRating(filterRating === rating ? null : rating)
              }
              className="flex items-center gap-3 w-full hover:bg-muted/50 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </div>
              <Progress
                value={getRatingPercentage(rating)}
                className="flex-1 h-2"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {ratingDistribution[rating as keyof typeof ratingDistribution] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Write Review Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setShowReviewForm(!showReviewForm)}
        >
          {showReviewForm ? (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            "Write a Review"
          )}
        </Button>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="mb-8 p-6 border rounded-lg">
          <ReviewForm
            productId={productId}
            onSuccess={() => {
              setShowReviewForm(false);
              void refetch();
            }}
          />
        </div>
      )}

      {/* Filters and Sort */}
      {reviewCount > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {filterRating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterRating(null)}
              >
                Clear filter
              </Button>
            )}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="helpful">Most Helpful</SelectItem>
              <SelectItem value="rating_high">Highest Rated</SelectItem>
              <SelectItem value="rating_low">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review: any) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {filterRating
              ? `No ${filterRating}-star reviews yet`
              : "No reviews yet"}
          </p>
          {!showReviewForm && (
            <Button onClick={() => setShowReviewForm(true)}>
              Be the First to Review
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
