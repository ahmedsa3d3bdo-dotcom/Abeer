"use client";

import { useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "../molecules/product-card";
import { QuickViewModal } from "../organisms/quick-view-modal";

export function RelatedProductsClient({ products }: { products: ProductCardType[] }) {
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  if (!products || products.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onQuickView={setQuickViewSlug} />
        ))}
      </div>

      <QuickViewModal
        productSlug={quickViewSlug}
        isOpen={!!quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </>
  );
}
