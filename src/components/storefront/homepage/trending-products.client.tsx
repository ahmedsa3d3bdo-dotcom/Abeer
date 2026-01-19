"use client";

import { useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "../molecules/product-card";
import { QuickViewModal } from "../organisms/quick-view-modal";
import { HScrollButtons } from "./hscroll-buttons";

export function TrendingProductsClient({ products }: { products: ProductCardType[] }) {
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  return (
    <div className="relative">
      <div
        id="trending-scroll"
        className="flex gap-6 overflow-x-auto pb-4 px-8 scrollbar-hide snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div key={product.id} className="flex-none w-[280px] snap-start">
            <ProductCard product={product} onQuickView={setQuickViewSlug} />
          </div>
        ))}
      </div>

      {/* Scroll Indicators (Desktop) */}
      <HScrollButtons containerId="trending-scroll" className="hidden lg:block" />

      {/* Quick View Modal */}
      <QuickViewModal
        productSlug={quickViewSlug}
        isOpen={!!quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </div>
  );
}
