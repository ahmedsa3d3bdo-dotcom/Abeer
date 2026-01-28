"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart.store";
import { ShoppingCart, Tag, Loader2 } from "lucide-react";
import type { Cart } from "@/types/storefront";
import { computeCartTotals } from "@/components/storefront/cart/cart-pricing";

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const [discountCode, setDiscountCode] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const removeDiscount = useCartStore((state) => state.removeDiscount);
  const cartError = useCartStore((state) => state.error);

  const totals = computeCartTotals(cart);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsApplyingDiscount(true);
    try {
      await applyDiscount(discountCode);
      setDiscountCode("");
    } catch (error) {
      console.error("Failed to apply discount:", error);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setIsApplyingDiscount(true);
    try {
      await removeDiscount();
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 sticky top-4">
      <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

      {/* Discount Code */}
      <div className="mb-6">
        <Label htmlFor="discount-code" className="mb-2 block text-sm">
          Discount Code
        </Label>
        <div className="flex gap-2">
          <Input
            id="discount-code"
            placeholder="Enter code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
            disabled={isApplyingDiscount}
          />
          <Button
            onClick={handleApplyDiscount}
            disabled={!discountCode.trim() || isApplyingDiscount}
            variant="outline"
          >
            {isApplyingDiscount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>

      {cartError && (
        <p className="-mt-4 mb-6 text-xs text-destructive">{cartError}</p>
      )}
      </div>

      {/* Applied Discounts */}
      {cart.appliedDiscounts && cart.appliedDiscounts.length > 0 && (
        <div className="mb-4 space-y-2">
          {cart.appliedDiscounts.map((discount) => (
            <div
              key={discount.id}
              className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 p-2 rounded"
            >
              <Tag className="h-3 w-3" />
              <span className="flex-1 font-medium">{discount.code}</span>
              {Number(discount.amount ?? 0) === 0 ? <span>FREE</span> : <span>-${discount.amount.toFixed(2)}</span>}
              {!discount.isAutomatic && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-green-700 hover:text-green-800 dark:text-green-300"
                  onClick={handleRemoveDiscount}
                  disabled={isApplyingDiscount}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator className="my-4" />

      {/* Price Breakdown */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${totals.displaySubtotal.toFixed(2)}</span>
        </div>

        {totals.saleSavings > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sale savings</span>
            <span>-${totals.saleSavings.toFixed(2)}</span>
          </div>
        ) : null}

        {totals.promotionSavings > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Promotion savings</span>
            <span>-${totals.promotionSavings.toFixed(2)}</span>
          </div>
        ) : null}

        {totals.promotionDiscounts.length
          ? totals.promotionDiscounts.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span className="text-muted-foreground">Promotion{d.code ? ` (${d.code})` : ""}</span>
                {Number(d.amount ?? 0) === 0 ? <span>FREE</span> : <span>-${d.amount.toFixed(2)}</span>}
              </div>
            ))
          : null}

        {totals.couponDiscounts.length
          ? totals.couponDiscounts.map((d) => (
              <div key={d.id} className="flex justify-between text-green-600">
                <span>Coupon{d.code ? ` (${d.code})` : ""}</span>
                {Number(d.amount ?? 0) === 0 ? <span>FREE</span> : <span>-${d.amount.toFixed(2)}</span>}
              </div>
            ))
          : null}

        {totals.otherDiscount > 0 ? (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-${totals.otherDiscount.toFixed(2)}</span>
          </div>
        ) : null}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>
            {cart.shippingAmount === 0 ? (
              <span className="text-green-600">FREE</span>
            ) : (
              `$${cart.shippingAmount.toFixed(2)}`
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>${cart.taxAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Total before discounts</span>
          <span>${totals.totalBeforeDiscounts.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-green-600">
          <span>Sum of all discounts</span>
          <span>-${totals.sumAllDiscounts.toFixed(2)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Total */}
      <div className="flex justify-between text-lg font-semibold mb-6">
        <span>Total</span>
        <span>${totals.totalAfterDiscounts.toFixed(2)}</span>
      </div>

      {/* Checkout Button */}
      <Link href="/checkout">
        <Button size="lg" className="w-full">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Proceed to Checkout
        </Button>
      </Link>

      {/* Additional Info */}
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <p>• Taxes calculated at checkout</p>
        <p>• Free shipping applied on all orders </p>
        <p>• Secure checkout with SSL encryption</p>
      </div>
    </div>
  );
}
