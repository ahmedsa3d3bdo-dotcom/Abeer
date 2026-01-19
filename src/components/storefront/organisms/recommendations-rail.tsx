"use client";

import { useEffect, useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "@/components/storefront/molecules/product-card";
import { QuickViewModal } from "@/components/storefront/organisms/quick-view-modal";

interface RecommendationsRailProps {
  title?: string;
  context: "product" | "cart" | "user";
  productId?: string;
  limit?: number;
  className?: string;
}

export function RecommendationsRail({ title = "You may also like", context, productId, limit = 6, className }: RecommendationsRailProps) {
  const [items, setItems] = useState<ProductCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ context, limit: String(limit) });
        if (context === "product" && productId) {
          qs.set("productId", productId);
        }
        const res = await fetch(`/api/storefront/recommendations?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data?.success) {
          setItems(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [context, productId, limit]);

  if (loading) {
    return (
      <section className={className} aria-labelledby="reco-rail-heading">
        <h2 id="reco-rail-heading" className="text-xl font-semibold mb-4">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: Math.min(6, limit) }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg border bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className={className} aria-labelledby="reco-rail-heading">
      <h2 id="reco-rail-heading" className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} onQuickView={setQuickViewSlug} />
        ))}
      </div>

      <QuickViewModal
        productSlug={quickViewSlug}
        isOpen={!!quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </section>
  );
}
