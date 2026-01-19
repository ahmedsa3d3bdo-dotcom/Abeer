import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  reviewCount,
  className,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const stars: ReactNode[] = [];
  for (let i = 1; i <= maxRating; i++) {
    if (i <= Math.floor(rating)) {
      // Full star
      stars.push(
        <Star
          key={i}
          className={cn(sizeClasses[size], "fill-yellow-400 text-yellow-400")}
        />
      );
    } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
      // Half star
      stars.push(
        <StarHalf
          key={i}
          className={cn(sizeClasses[size], "fill-yellow-400 text-yellow-400")}
        />
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          className={cn(sizeClasses[size], "text-muted-foreground")}
        />
      );
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">{stars}</div>
      {showValue && (
        <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
      )}
      {reviewCount !== undefined && (
        <span className="text-sm text-muted-foreground ml-1">
          {reviewCount === 0 ? "(0)" : `(${reviewCount})`}
        </span>
      )}
    </div>
  );
}
