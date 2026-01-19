"use client";

import { useCartStore } from "@/stores/cart.store";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartItem } from "@/components/storefront/molecules/cart-item";
import type { CartItem as CartItemType } from "@/types/storefront";
import type { ProductCard } from "@/types/storefront";
import Image from "next/image";

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const itemCountSel = useCartStore((state) => state.itemCount);
  const headerCount = cart ? cart.items.reduce((s, it) => s + Number(it.quantity || 0), 0) : 0;
  const [canUseDrawer, setCanUseDrawer] = useState(true);
  const [recs, setRecs] = useState<ProductCard[] | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(min-width: 640px)");

    const apply = () => setCanUseDrawer(mql.matches);
    apply();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }

    const legacyMql = mql as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };
    legacyMql.addListener?.(apply);
    return () => legacyMql.removeListener?.(apply);
  }, []);

  useEffect(() => {
    if (!canUseDrawer && isOpen) closeDrawer();
  }, [canUseDrawer, isOpen, closeDrawer]);

  useEffect(() => {
    if (isOpen) void fetchCart();
  }, [isOpen, fetchCart]);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return;
    (async () => {
      setRecsLoading(true);
      try {
        // Primary: cart-based recs
        let res = await fetch("/api/storefront/recommendations?context=cart&limit=3", { cache: "no-store" });
        if (!res.ok) throw new Error(`recs(cart) ${res.status}`);
        let data = await res.json();
        let items: ProductCard[] = data?.data || [];
        // Fallback: user-based if empty
        if ((!items || items.length === 0)) {
          res = await fetch("/api/storefront/recommendations?context=user&limit=3", { cache: "no-store" });
          if (res.ok) {
            data = await res.json();
            items = data?.data || [];
          }
        }
        if (!cancelled) setRecs(items || []);
      } catch (err) {
        if (!cancelled) setRecs([]);
        if (process.env.NODE_ENV !== "production") {
          console.error("recommendations fetch failed", err);
        }
      } finally {
        if (!cancelled) setRecsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!canUseDrawer) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? closeDrawer() : null)}>
      <SheetContent className="w-full h-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <div className="px-1 pt-1">
          <SheetHeader>
            <SheetTitle>Your Cart ({itemCountSel || headerCount})</SheetTitle>
          </SheetHeader>
        </div>

        <div className="mt-4 flex flex-col h-full min-h-0">
          {!cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mb-6">
                Add some products to get started
              </p>
              <Button asChild onClick={closeDrawer}>
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto divide-y">
                {cart.items.map((it: CartItemType) => (
                  <CartItem key={it.id} item={it} />
                ))}
                {recsLoading && (
                  <div className="p-6 border-t space-y-3">
                    <h3 className="text-sm font-semibold">You might also like</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-16 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  </div>
                )}
                {!recsLoading && recs && recs.length > 0 && (
                  <div className="p-6 border-t space-y-3">
                    <h3 className="text-sm font-semibold">You might also like</h3>
                    {recs.map((p) => (
                      <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                          <Image src={p.primaryImage} alt={p.name} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              <div className="border-t p-6 space-y-4">
                <div className="flex justify-between text-base font-medium">
                  <span>Subtotal</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shipping calculated at checkout.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/checkout" onClick={closeDrawer}>
                      Checkout
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={closeDrawer}
                    asChild
                  >
                    <Link href="/cart">View Cart</Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
