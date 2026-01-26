"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "../atoms/price-display";
import { RatingStars } from "../atoms/rating-stars";
import { ProductBadge } from "../atoms/product-badge";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { siteConfig } from "@/config/site";

interface ProductCardProps {
  product: ProductCardType;
  className?: string;
  onQuickView?: (productSlug: string) => void;
}

export function ProductCard({ product, className, onQuickView }: ProductCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(product.primaryImage || "/placeholder-product.svg");
  const addItem = useCartStore((state) => state.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    setImgSrc(product.primaryImage || "/placeholder-product.svg");
  }, [product.primaryImage]);

  // Avoid hydration mismatch by deferring wishlist-derived UI until mounted
  const wish = mounted && isInWishlist;

  const requireAuth = () => {
    if ((session as any)?.user?.id) return true;
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`${siteConfig.routes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return false;
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth()) return;
    try {
      setIsAdding(true);
      await addItem(product.id, undefined, 1);
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth()) return;
    toggleWishlist(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product.slug);
      return;
    }
    router.push(`/product/${product.slug}`);
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth()) return;
    try {
      setIsBuying(true);
      const res = await fetch("/api/storefront/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Buy Now failed");
      router.push("/checkout?mode=buy-now");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout");
    } finally {
      setIsBuying(false);
    }
  };

  const isOutOfStock = product.stockStatus === "out_of_stock";
  const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price;
  const isSale = !!product.isOnSale || product.badge === "sale";
  const displayBadge = isSale ? "sale" : product.badge;
  const discountPercent = hasDiscount ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) : 0;

  return (
    <div
      className={cn(
        "group relative block rounded-xl border border-border/50 bg-card overflow-hidden",
        "transition-all duration-500 ease-out",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/30",
        "hover:bg-gradient-to-br hover:from-card hover:to-card/95",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/product/${product.slug}`} aria-label={product.name} className="absolute inset-0 z-10" />
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {/* Hover Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <Image
          src={imgSrc}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-all duration-700 ease-out group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImgSrc("/placeholder-product.svg");
            setImageLoaded(true);
          }}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        />

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {hasDiscount && (
            <Badge className="bg-destructive hover:bg-destructive/90 text-white">
              -{discountPercent}%
            </Badge>
          )}
          {displayBadge && <ProductBadge type={displayBadge} />}
          {isOutOfStock && <ProductBadge type="out-of-stock" />}
        </div>

        {/* Quick Actions - Show on hover */}
        <div
          className={cn(
            "absolute right-2 top-2 z-20 flex flex-col gap-2 transition-opacity duration-200",
            "opacity-100 md:opacity-0",
            isHovered && "md:opacity-100"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background",
              wish && "text-red-500"
            )}
            onClick={handleWishlist}
          >
            <Heart className={cn("h-4 w-4", wish && "fill-current")} />
            <span className="sr-only" suppressHydrationWarning>
              {wish ? "Remove from wishlist" : "Add to wishlist"}
            </span>
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={handleQuickView}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">Quick view</span>
          </Button>
          {!isOutOfStock && (
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full shadow-md md:hidden"
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">Add to cart</span>
            </Button>
          )}
        </div>

        {/* Add to Cart + Buy Now - Show on hover */}
        {!isOutOfStock && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 z-20 p-2 transition-transform duration-200 translate-y-0 hidden md:block",
              !isHovered && "md:translate-y-full"
            )}
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="shadow-md"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isAdding ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="outline"
                className="shadow-md"
                onClick={handleBuyNow}
                disabled={isBuying}
              >
                {isBuying ? "Loading..." : "Buy Now"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col transition-all duration-300 group-hover:bg-gradient-to-t group-hover:from-primary/5 group-hover:to-transparent">
        {/* Product Name */}
        <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight transition-all duration-300 group-hover:text-primary">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="mb-2 min-h-[1.25rem]">
          <RatingStars
            rating={product.rating}
            reviewCount={product.reviewCount}
            size="sm"
          />
        </div>

        {/* Price */}
        <PriceDisplay
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          className="text-base"
          showDiscountBadge={false}
        />
      </div>
    </div>
  );
}
