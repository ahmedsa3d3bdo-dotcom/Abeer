"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart.store";
import { CartItemList } from "@/components/storefront/organisms/cart-item-list";
import { CartSummary } from "@/components/storefront/organisms/cart-summary";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentlyViewedCarousel } from "@/components/storefront/organisms/recently-viewed-carousel";
import { RecommendationsRail } from "@/components/storefront/organisms/recommendations-rail";

export default function CartPage() {
  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCart = async () => {
    if (isClearing) return;
    const ok = typeof window === "undefined" ? true : window.confirm("Clear all items from your cart?");
    if (!ok) return;
    try {
      setIsClearing(true);
      await fetch("/api/storefront/cart/clear", { method: "POST" });
    } finally {
      setIsClearing(false);
      await fetchCart();
    }
  };

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Refetch on window focus / tab visibility
  useEffect(() => {
    const onFocus = () => fetchCart();
    const onVisibility = () => {
      if (!document.hidden) fetchCart();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCart]);

  if (isLoading && !cart) {
    return (
      <div className="container py-12">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <div className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <ShoppingBag className="h-24 w-24 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added anything to your cart yet. Start
            shopping to fill it up!
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-center items-stretch sm:items-center">
            <Link href="/shop">
              <Button size="lg" className="w-full sm:w-auto">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Start Shopping
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse Featured Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 pb-28 sm:pb-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/shop"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
            <p className="text-muted-foreground mt-2">
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} in your cart
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="sm:hidden"
            onClick={handleClearCart}
            disabled={isLoading || isClearing}
          >
            {isClearing ? "Clearing..." : "Clear cart"}
          </Button>
        </div>
      </div>

      {/* Cart Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <CartItemList items={cart.items} />
        </div>

        {/* Cart Summary */}
        <div>
          <CartSummary cart={cart} />
        </div>
      </div>

      {/* Recommendations and Recently Viewed */}
      <div className="mt-12 space-y-10">
        <RecommendationsRail context="cart" title="You may also like" limit={6} />
        <RecentlyViewedCarousel />
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="sm:hidden" aria-hidden>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">${cart.subtotal.toFixed(2)}</span>
          </div>
          <Link href="/checkout">
            <Button size="lg" className="w-full">Checkout</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
