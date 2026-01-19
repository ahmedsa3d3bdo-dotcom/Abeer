"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ThumbsUp, Flag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "../atoms/rating-stars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewCardProps {
  review: {
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
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleHelpful = async () => {
    if (isHelpful) return;
    try {
      const res = await fetch(`/api/storefront/reviews/${review.id}/helpful`, { method: "POST" });
      if (res.ok) {
        setIsHelpful(true);
        setHelpfulCount((prev) => prev + 1);
      }
    } catch {}
  };

  const handleReport = async () => {
    try {
      const res = await fetch(`/api/storefront/reviews/${review.id}/report`, { method: "POST" });
      if (res.ok) setShowReportDialog(false);
    } catch {}
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="space-y-4 py-6">
        {/* Review Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10">
                {getInitials(review.authorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{review.authorName}</span>
                {review.isVerifiedPurchase && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified Purchase
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <RatingStars rating={review.rating} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(review.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Review Content */}
        <div className="space-y-2">
          {review.title && (
            <h4 className="font-semibold text-lg">{review.title}</h4>
          )}
          <p className="text-muted-foreground leading-relaxed">
            {review.comment}
          </p>
        </div>

        {/* Review Images */}
        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {review.images.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image.url)}
                className="relative h-20 w-20 rounded-lg overflow-hidden border hover:border-primary transition-colors"
              >
                <Image
                  src={image.url}
                  alt="Review image"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Review Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpful}
            disabled={isHelpful}
            className={isHelpful ? "text-primary" : ""}
          >
            <ThumbsUp className={`mr-2 h-4 w-4 ${isHelpful ? "fill-current" : ""}`} />
            Helpful ({helpfulCount})
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReport}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </Button>
        </div>
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Review Image</DialogTitle>
          {selectedImage && (
            <div className="relative w-full h-[70vh]">
              <Image
                src={selectedImage}
                alt="Review image"
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
