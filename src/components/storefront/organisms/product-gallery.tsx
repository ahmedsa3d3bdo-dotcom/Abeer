"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductImage } from "@/types/storefront";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [mainImageSrc, setMainImageSrc] = useState<string>("/placeholder-product.svg");
  const [zoomImageSrc, setZoomImageSrc] = useState<string>("/placeholder-product.svg");
  const [brokenThumbs, setBrokenThumbs] = useState<Record<number, boolean>>({});

  const selectedImage = images[selectedIndex] || images[0];

  const safeImageSrc = (url?: string | null) => {
    const u = (url || "").trim();
    if (!u) return "/placeholder-product.svg";
    if (u.includes("placehold.co")) return "/placeholder-product.svg";
    return u;
  };

  const shouldUnoptimize = (url?: string | null) => {
    const u = (url || "").trim().toLowerCase();
    if (!u) return false;
    if (u.includes("placehold.co")) return true;
    if (u.endsWith(".svg")) return true;
    return false;
  };

  useEffect(() => {
    setMainImageSrc(safeImageSrc(selectedImage?.url));
  }, [selectedImage?.url]);

  useEffect(() => {
    if (!isZoomOpen) return;
    setZoomImageSrc(safeImageSrc(selectedImage?.url));
  }, [isZoomOpen, selectedImage?.url]);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (!images || images.length === 0) {
    return (
      <div className="relative w-full h-[340px] sm:h-[380px] lg:h-[420px] bg-muted rounded-lg overflow-hidden">
        <Image
          src="/placeholder-product.svg"
          alt={productName}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 50vw"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative w-full h-[340px] sm:h-[380px] lg:h-[420px] bg-muted rounded-lg overflow-hidden group">
        <Image
          src={mainImageSrc}
          alt={selectedImage.altText || productName}
          fill
          className="object-cover"
          priority={selectedIndex === 0}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 50vw"
          unoptimized={shouldUnoptimize(mainImageSrc)}
          onError={() => setMainImageSrc("/placeholder-product.svg")}
        />

        {/* Zoom Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsZoomOpen(true)}
        >
          <ZoomIn className="h-4 w-4" />
          <span className="sr-only">Zoom image</span>
        </Button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous image</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next image</span>
            </Button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/20"
              )}
            >
              <Image
                src={brokenThumbs[index] ? "/placeholder-product.svg" : safeImageSrc(image.url)}
                alt={image.altText || `${productName} - Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 8vw"
                unoptimized={shouldUnoptimize(image.url)}
                onError={() => setBrokenThumbs((prev) => ({ ...prev, [index]: true }))}
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Dialog */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-7xl w-full h-[90vh]">
          <DialogTitle className="sr-only">
            {selectedImage.altText || productName}
          </DialogTitle>
          <div className="relative w-full h-full">
            <Image
              src={zoomImageSrc}
              alt={selectedImage.altText || productName}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized={shouldUnoptimize(zoomImageSrc)}
              onError={() => setZoomImageSrc("/placeholder-product.svg")}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
