"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/storefront/api-client";
import { useSession } from "next-auth/react";
import { siteConfig } from "@/config/site";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "../atoms/price-display";
import { RatingStars } from "../atoms/rating-stars";
import { ProductBadge } from "../atoms/product-badge";
import { VariantSelector } from "../molecules/variant-selector";
import { QuantitySelector } from "../molecules/quantity-selector";
import { useCartStore } from "@/stores/cart.store";
import { ShoppingCart, ExternalLink, X } from "lucide-react";
import type { Product } from "@/types/storefront";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface QuickViewModalProps {
  productSlug: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({
  productSlug,
  isOpen,
  onClose,
}: QuickViewModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mainImageSrc, setMainImageSrc] = useState<string>("/placeholder-product.svg");
  const [isBuying, setIsBuying] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: ["product-quick-view", productSlug],
    queryFn: () => api.get(`/api/storefront/products/${productSlug}`),
    enabled: !!productSlug && isOpen,
  });

  // Reset state when modal opens with new product
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setSelectedVariant(undefined);
      setQuantity(1);
      setSelectedImageIndex(0);
    }
  };

  // Set default variant when product loads
  if (product && !selectedVariant && product.variants?.length > 0) {
    setSelectedVariant(product.variants[0].id);
  }

  const requireAuth = () => {
    if ((session as any)?.user?.id) return true;
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`${siteConfig.routes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return false;
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!requireAuth()) return;
    await addItem(product.id, selectedVariant, quantity);
    onClose();
  };

  const handleBuyNow = async () => {
    try {
      if (!product) return;
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
      onClose();
      router.push("/checkout?mode=buy-now");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
    } finally {
      setIsBuying(false);
    }
  };

  const currentVariant = product?.variants?.find((v) => v.id === selectedVariant);
  const currentPrice = currentVariant?.price || product?.price || 0;
  const currentStock = currentVariant?.stockQuantity || 999;
  const isOutOfStock = product?.stockStatus === "out_of_stock" || currentStock === 0;

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
    const raw = product?.images?.[selectedImageIndex]?.url || product?.images?.[0]?.url;
    setMainImageSrc(safeImageSrc(raw));
  }, [product?.id, product?.images, selectedImageIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl sm:max-h-[90vh] w-[100vw] sm:w-auto h-[100dvh] sm:h-auto rounded-none sm:rounded-lg p-0 sm:p-6 overflow-y-auto overscroll-contain"
      >
        <DialogTitle className="sr-only">
          {product?.name || "Product Quick View"}
        </DialogTitle>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 h-9 w-9 rounded-md bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          onClick={() => handleOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        {productLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-4 sm:px-0 pb-24 sm:pb-6">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-4 sm:px-0 pb-24 sm:pb-6">
            {/* Images */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <Image
                  src={mainImageSrc}
                  alt={product.images[selectedImageIndex]?.altText || product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={shouldUnoptimize(mainImageSrc)}
                  onError={() => setMainImageSrc("/placeholder-product.svg")}
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(0, 4).map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/20"
                      }`}
                    >
                      <Image
                        src={safeImageSrc(image.url)}
                        alt={image.altText || product.name}
                        fill
                        className="object-cover"
                        sizes="25vw"
                        unoptimized={shouldUnoptimize(image.url)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {/* Name and Badges */}
              <div>
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    SKU: {product.sku}
                  </span>
                  {product.isFeatured && <ProductBadge type="featured" />}
                  {isOutOfStock && <ProductBadge type="out-of-stock" />}
                </div>
              </div>

              {/* Rating */}
              {product.averageRating > 0 && (
                <RatingStars
                  rating={product.averageRating}
                  reviewCount={product.reviewCount}
                />
              )}

              {/* Price */}
              <PriceDisplay
                price={currentPrice}
                compareAtPrice={product.compareAtPrice}
                className="text-xl"
              />

              {/* Short Description */}
              {product.shortDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.shortDescription}
                </p>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <VariantSelector
                  variants={product.variants}
                  selectedVariantId={selectedVariant}
                  onVariantChange={setSelectedVariant}
                />
              )}

              {/* Quantity */}
              {!isOutOfStock && (
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  max={currentStock}
                />
              )}

              {/* Actions (desktop/tablet) */}
              <div className="space-y-3 hidden sm:block">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={isLoading || isOutOfStock}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isOutOfStock
                    ? "Out of Stock"
                    : isLoading
                    ? "Adding..."
                    : "Add to Cart"}
                </Button>
                {!isOutOfStock && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={handleBuyNow}
                    disabled={isBuying}
                  >
                    {isBuying ? "Loading..." : "Buy Now"}
                  </Button>
                )}
                <Link href={`/product/${productSlug}`} onClick={() => handleOpenChange(false)}>
                  <Button variant="outline" size="lg" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Details
                  </Button>
                </Link>
              </div>
              {/* Mobile sticky actions */}
              <div className="sm:hidden" aria-hidden>
                <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="lg"
                      onClick={handleAddToCart}
                      disabled={isLoading || isOutOfStock}
                    >
                      {isOutOfStock ? "Out" : isLoading ? "Adding..." : "Add"}
                    </Button>
                    {!isOutOfStock && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleBuyNow}
                        disabled={isBuying}
                      >
                        {isBuying ? "Loading..." : "Buy Now"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories */}
              {product.categories && product.categories.length > 0 && (
                <div className="text-sm border-t pt-4">
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">
                    {product.categories[0].name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 pb-24 sm:pb-12 text-center text-muted-foreground">
            Product not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
