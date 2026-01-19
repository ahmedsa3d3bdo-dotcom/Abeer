"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/storefront/molecules/product-card";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { QuickViewModal } from "@/components/storefront/organisms/quick-view-modal";

export function RecentlyViewedCarousel() {
  const [items, setItems] = useState<ProductCardType[]>([]);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const key = "recently_viewed";
        const raw = localStorage.getItem(key) || "[]";
        const arr: Array<{ id: string; name: string; slug: string; price: number | string; primaryImage?: string; rating?: number; reviewCount?: number }> = JSON.parse(raw);

        const needsHydrate = (arr || []).some((p) => p.rating == null || p.reviewCount == null);

        if (needsHydrate) {
          const next = await Promise.all(
            (arr || []).map(async (p) => {
              if (p.rating != null && p.reviewCount != null) return p;
              try {
                const res = await fetch(`/api/storefront/products/${encodeURIComponent(p.slug)}`, { cache: "no-store" });
                const data = await res.json();
                if (!res.ok || !data?.success) return p;
                const prod = data.data;
                return {
                  ...p,
                  rating: Number(prod?.averageRating ?? p.rating ?? 0),
                  reviewCount: Number(prod?.reviewCount ?? p.reviewCount ?? 0),
                };
              } catch {
                return p;
              }
            })
          );

          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch {}

          if (cancelled) return;
          const mapped: ProductCardType[] = next.slice(0, 12).map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: typeof p.price === "string" ? parseFloat(p.price) : (p.price || 0),
            compareAtPrice: undefined,
            primaryImage: p.primaryImage || "/placeholder-product.svg",
            images: p.primaryImage ? [p.primaryImage] : [],
            rating: Number(p.rating ?? 0),
            reviewCount: Number(p.reviewCount ?? 0),
            stockStatus: "in_stock",
            isFeatured: false,
            badge: undefined,
          }));
          setItems(mapped);
          return;
        }

        if (cancelled) return;
        const mapped: ProductCardType[] = (arr || []).slice(0, 12).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: typeof p.price === "string" ? parseFloat(p.price) : (p.price || 0),
          compareAtPrice: undefined,
          primaryImage: p.primaryImage || "/placeholder-product.svg",
          images: p.primaryImage ? [p.primaryImage] : [],
          rating: Number(p.rating ?? 0),
          reviewCount: Number(p.reviewCount ?? 0),
          stockStatus: "in_stock",
          isFeatured: false,
          badge: undefined,
        }));
        setItems(mapped);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="my-10">
      <h2 id="recently-viewed-heading" className="text-xl font-semibold mb-4">Recently viewed</h2>
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
