"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "../atoms/price-display";
import { RatingStars } from "../atoms/rating-stars";
import { ProductBadge } from "../atoms/product-badge";
import { VariantSelector } from "../molecules/variant-selector";
import { QuantitySelector } from "../molecules/quantity-selector";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import type { Product } from "@/types/storefront";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { siteConfig } from "@/config/site";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    product.variants?.[0]?.id
  );
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const [bundleMsg, setBundleMsg] = useState<string>("");

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  const currentVariant = product.variants?.find((v) => v.id === selectedVariant);
  const currentPrice = currentVariant?.price || product.price;
  const currentStock = currentVariant?.stockQuantity || 999; // Fallback to high number
  const isOutOfStock = product.stockStatus === "out_of_stock" || currentStock === 0;

  const requireAuth = () => {
    if ((session as any)?.user?.id) return true;
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`${siteConfig.routes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return false;
  };

  const handleAddToCart = async () => {
    if (!requireAuth()) return;
    await addItem(product.id, selectedVariant, quantity);
  };

  // Highlight bundle offer if applicable
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/offers", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) return;
        const items: any[] = Array.isArray(data.data?.items) ? data.data.items : [];
        const bundles = items.filter((o) => (o?.metadata?.offerKind === "bundle"));
        if (!bundles.length) return;
        const catIds = new Set((product.categories || []).map((c) => c.id));
        for (const o of bundles) {
          const scope: string = o.scope;
          let targeted = false;
          if (scope === "all") targeted = true;
          else if (scope === "products" && Array.isArray(o.productIds)) targeted = o.productIds.includes(product.id);
          else if (scope === "categories" && Array.isArray(o.categoryIds)) targeted = o.categoryIds.some((cid: string) => catIds.has(cid));
          if (targeted) {
            const qty = Number(o?.metadata?.bundle?.requiredQty || 0);
            const value = parseFloat(String(o.value || "0"));
            const msg = o.type === "percentage" ? `Bundle: buy ${qty}+ save ${value}%` : o.type === "fixed_amount" ? `Bundle: buy ${qty}+ save $${value.toFixed(2)}` : "Bundle: free shipping";
            if (!aborted) setBundleMsg(msg);
            break;
          }
        }
      } catch {}
    })();
    return () => { aborted = true; };
  }, [product.id, product.categories?.length]);

  const handleBuyNow = async () => {
    try {
      if (!requireAuth()) return;
      setIsBuying(true);
      const res = await fetch("/api/storefront/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Buy Now failed");
      router.push("/checkout?mode=buy-now");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
    } finally {
      setIsBuying(false);
    }
  };

  const handleWishlist = () => {
    if (!requireAuth()) return;
    toggleWishlist({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
      primaryImage: (product.images?.[0]?.url as any) || "",
      images: (product.images || []).map((i: any) => i?.url).filter(Boolean),
      rating: Number(product.averageRating || 0),
      reviewCount: Number(product.reviewCount || 0),
      stockStatus: product.stockStatus as any,
      isFeatured: Boolean(product.isFeatured),
    } as any);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDescription,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Name and Badges */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleWishlist}
              className={isInWishlist ? "text-red-500" : ""}
            >
              <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
              <span className="sr-only">Add to wishlist</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share product</span>
            </Button>
          </div>
        </div>

        {/* SKU and Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
          {product.isFeatured && <ProductBadge type="featured" />}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <ProductBadge type="sale" />
          )}
          {isOutOfStock && <ProductBadge type="out-of-stock" />}
          {product.stockStatus === "low_stock" && <ProductBadge type="low-stock" />}
        </div>
      </div>

      {/* Rating */}
      {product.averageRating > 0 && (
        <RatingStars
          rating={product.averageRating}
          reviewCount={product.reviewCount}
          showValue
          size="lg"
        />
      )}

      {/* Price */}
      <PriceDisplay
        price={currentPrice}
        compareAtPrice={product.compareAtPrice}
        className="text-2xl"
      />
      {bundleMsg && (
        <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 rounded px-3 py-1 inline-flex items-center gap-2">
          <span>🔥</span>
          <span className="font-medium">{bundleMsg}</span>
        </div>
      )}

      {/* Short Description */}
      {product.shortDescription && (
        <p className="text-muted-foreground leading-relaxed">
          {product.shortDescription}
        </p>
      )}

      <Separator />

      {/* Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          selectedVariantId={selectedVariant}
          onVariantChange={setSelectedVariant}
        />
      )}

      {/* Stock Status */}
      {!isOutOfStock && (
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-medium">
            {currentStock < 10 ? `Only ${currentStock} left` : "In Stock"}
          </span>
        </div>
      )}

      {/* Quantity and Add to Cart */}
      <div className="space-y-4">
        {!isOutOfStock && (
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={currentStock}
          />
        )}

        {/* Inline actions hidden on mobile; sticky bar will handle mobile */}
        <div className="hidden sm:flex gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={isLoading || isOutOfStock}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isOutOfStock ? "Out of Stock" : isLoading ? "Adding..." : "Add to Cart"}
          </Button>
          {!isOutOfStock && (
            <Button size="lg" variant="outline" onClick={handleBuyNow} disabled={isBuying}>
              {isBuying ? "Loading..." : "Buy Now"}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <div className="sm:hidden" aria-hidden>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">${Number(currentPrice).toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={isLoading || isOutOfStock}
            >
              {isOutOfStock ? "Out" : isLoading ? "Adding..." : "Add"}
            </Button>
            {!isOutOfStock && (
              <Button size="lg" variant="outline" onClick={handleBuyNow} disabled={isBuying}>
                {isBuying ? "Loading..." : "Buy Now"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Category:</span>
          <span className="font-medium">
            {product.categories?.[0]?.name || "Uncategorized"}
          </span>
        </div>
        {product.status && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">{product.status}</span>
          </div>
        )}
      </div>
    </div>
  );
}
