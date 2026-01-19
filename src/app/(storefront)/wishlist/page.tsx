"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlistStore } from "@/stores/wishlist.store";
import { ProductCard } from "@/components/storefront/molecules/product-card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag } from "lucide-react";
import { RecommendationsRail } from "@/components/storefront/organisms/recommendations-rail";
import { RecentlyViewedCarousel } from "@/components/storefront/organisms/recently-viewed-carousel";
import { QuickViewModal } from "@/components/storefront/organisms/quick-view-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export default function WishlistPage() {
  const items = useWishlistStore((state) => state.items);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const syncFromServer = useWishlistStore((state) => state.syncFromServer);
  const setItems = useWishlistStore((state) => state.setItems);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Hydrate from server if authenticated; safely ignored for guests (401)
    void syncFromServer();
  }, [syncFromServer]);

  const handleClearWishlist = async () => {
    if (isClearing) return;
    try {
      setIsClearing(true);
      let cleared = false;

      try {
        const res = await fetch("/api/storefront/wishlist", { method: "DELETE" });
        if (res.ok) {
          setItems([]);
          cleared = true;
        }
      } catch {}

      // Fallback to client-only clear (guest / API failure)
      if (!cleared) {
        clearWishlist();
      }

      setIsClearConfirmOpen(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Heart className="h-8 w-8" />
              My Wishlist
            </h1>
            <p className="text-muted-foreground mt-2">
              {items.length} {items.length === 1 ? "item" : "items"} saved for later
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={() => setIsClearConfirmOpen(true)}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Wishlist Items */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} onQuickView={setQuickViewSlug} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="mb-6 flex justify-center">
            <Heart className="h-24 w-24 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-8">
            Save your favorite items here to buy them later
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/shop">
              <Button size="lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Browse Products
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Recommendations and Recently Viewed */}
      <div className="mt-12 space-y-10">
        <RecommendationsRail context="user" title="You may also like" limit={6} />
        <RecentlyViewedCarousel />
      </div>

      <QuickViewModal
        productSlug={quickViewSlug}
        isOpen={!!quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />

      <ConfirmDeleteDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        loading={isClearing}
        title="Clear wishlist"
        description="Are you sure you want to clear your entire wishlist?"
        cancelText="Cancel"
        confirmText="Clear all"
        onConfirm={handleClearWishlist}
      />
    </div>
  );
}
