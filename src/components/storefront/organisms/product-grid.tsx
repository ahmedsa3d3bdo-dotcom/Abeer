"use client";

import { useState } from "react";
import { ProductCard } from "../molecules/product-card";
import { ProductCardSkeleton } from "../atoms/product-card-skeleton";
import { QuickViewModal } from "../organisms/quick-view-modal";
import type { ProductCard as ProductCardType } from "@/types/storefront";

interface ProductGridProps {
  products: ProductCardType[];
  isLoading?: boolean;
  columns?: "auto" | 2 | 3 | 4 | 5;
  className?: string;
  density?: "comfortable" | "compact";
}

export function ProductGrid({
  products,
  isLoading = false,
  columns = "auto",
  className,
  density = "comfortable",
}: ProductGridProps) {
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const gridClasses = {
    auto: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
    2: "grid grid-cols-2 gap-4 sm:gap-6",
    3: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
    4: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
    5: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4",
  };

  if (isLoading) {
    return (
      <div className={`${gridClasses[columns]} ${density === "compact" ? "gap-2 sm:gap-3" : ""}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-muted-foreground">
          <svg
            className="mx-auto h-24 w-24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`${gridClasses[columns]} ${density === "compact" ? "gap-2 sm:gap-3" : ""} ${className || ""}`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onQuickView={setQuickViewSlug}
          />
        ))}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        productSlug={quickViewSlug}
        isOpen={!!quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </>
  );
}
