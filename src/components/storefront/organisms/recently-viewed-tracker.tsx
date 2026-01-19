"use client";

import { useEffect } from "react";

type MinimalProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  primaryImage?: string;
  rating?: number;
  reviewCount?: number;
};

interface Props {
  product: MinimalProduct;
}

/**
 * Persists the current product into localStorage for Recently Viewed.
 * Safe for guests and logged-in users alike.
 */
export function RecentlyViewedTracker({ product }: Props) {
  useEffect(() => {
    try {
      const key = "recently_viewed";
      const raw = localStorage.getItem(key) || "[]";
      const arr: MinimalProduct[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const deduped = [product, ...arr.filter((p) => p.id !== product.id)].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(deduped));
    } catch {}
  }, [product]);

  return null;
}
