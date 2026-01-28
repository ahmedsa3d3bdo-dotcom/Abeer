"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { Cart } from "@/types/storefront";
import { computeCartTotals } from "@/components/storefront/cart/cart-pricing";
import { getDiscountLabel } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { PromotionBadge } from "@/components/shared/pricing";

interface OrderReviewProps {
  cart: Cart;
  shippingAddress: any;
  shippingMethod: any;
  paymentMethod: any;
  onBack?: () => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
}

/**
 * Final order review before checkout completion
 * 
 * Displays:
 * - Shipping address summary
 * - Shipping method with cost
 * - Payment method
 * - Order items with promotions
 * - Complete price breakdown with professional labeling
 */
export function OrderReview({
  cart,
  shippingAddress,
  shippingMethod,
  paymentMethod,
  onBack,
  onPlaceOrder,
  isPlacingOrder,
}: OrderReviewProps) {
  const addressReady = Boolean(shippingAddress?.firstName && shippingAddress?.lastName && shippingAddress?.addressLine1);
  const shippingReady = Boolean(shippingMethod?.name);
  const paymentReady = Boolean(paymentMethod?.type);

  const safeShipPrice = Number(shippingMethod?.price ?? 0);
  const computedTotal = shippingReady ? cart.subtotal + cart.taxAmount + safeShipPrice - cart.discountAmount : cart.totalAmount;

  const totals = computeCartTotals(cart, { totalAfterDiscountsOverride: computedTotal });
  const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

  const canPlaceOrder = addressReady && shippingReady && paymentReady && !isPlacingOrder;

  return (
    <div className="space-y-6">
      {/* Shipping Address */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Shipping Address</h3>
        {addressReady ? (
          <div className="text-sm space-y-1">
            <p className="font-medium">{`${shippingAddress.firstName} ${shippingAddress.lastName}`}</p>
            <p>{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
            <p>{`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`}</p>
            <p>{shippingAddress.country}</p>
            <p className="text-muted-foreground">{shippingAddress.phone}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Please enter your shipping address.</p>
        )}
      </div>

      {/* Shipping Method */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Shipping Method</h3>
        {shippingReady ? (
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{shippingMethod.name}</p>
              <p className="text-sm text-muted-foreground">{shippingMethod.description}</p>
            </div>
            <p className="font-semibold">
              {safeShipPrice === 0 ? (
                <span className="text-green-600 dark:text-green-400">FREE</span>
              ) : (
                fmt(safeShipPrice)
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Please select a shipping method.</p>
        )}
      </div>

      {/* Payment Method */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Payment Method</h3>
        {paymentReady ? (
          <p className="text-sm">
            {paymentMethod.type === "cash_on_delivery" || paymentMethod.type === "cod"
              ? "Cash on Delivery"
              : paymentMethod.type === "card"
                ? "Credit/Debit Card"
                : paymentMethod.type === "paypal"
                  ? "PayPal"
                  : String(paymentMethod.type || "Payment")}
            {paymentMethod.cardNumber && ` ending in ${paymentMethod.cardNumber.slice(-4)}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Please choose a payment method.</p>
        )}
      </div>

      {/* Order Items */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Order Items ({cart.itemCount})</h3>
        <div className="space-y-4">
          {cart.items.map((item) => {
            const isGift = Boolean((item as any).isGift) || (Number(item.unitPrice ?? 0) === 0 && Number(item.totalPrice ?? 0) === 0);
            const referencePrice = Number((item as any).referencePrice ?? item.unitPrice ?? 0);
            const compareAt = Number((item as any).compareAtPrice ?? 0);
            const unit = Number(item.unitPrice ?? 0);
            const hasSaleCompareAt = !isGift && compareAt > 0 && compareAt > referencePrice;
            const hasPromotionPrice = !isGift && referencePrice > 0 && unit > 0 && unit < referencePrice;
            const promotionName = !isGift ? String((item as any).promotionName || "") : "";

            return (
              <div key={item.id} className="flex gap-4">
                <div className="relative h-16 w-16 rounded bg-muted flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.productName}
                    fill
                    className="object-cover rounded"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productName}</p>
                  {isGift && (
                    <PromotionBadge type="gift" size="sm" className="mt-0.5" />
                  )}
                  {promotionName && !isGift && (
                    <PromotionBadge type="promotion" label={promotionName} size="sm" className="mt-0.5" />
                  )}
                  {item.variantName && (
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <div className="text-right text-sm">
                  {hasSaleCompareAt && (
                    <div className="text-xs text-muted-foreground line-through">
                      {fmt(compareAt * Number(item.quantity ?? 0))}
                    </div>
                  )}
                  {hasPromotionPrice && !hasSaleCompareAt && (
                    <div className="text-xs text-muted-foreground line-through">
                      {fmt(referencePrice * Number(item.quantity ?? 0))}
                    </div>
                  )}
                  <div className={isGift ? "font-semibold text-green-600 dark:text-green-400" : "font-semibold"}>
                    {isGift ? "FREE" : fmt(item.totalPrice)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(totals.displaySubtotal)}</span>
          </div>

          {totals.saleSavings > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale savings</span>
              <span className="text-green-600 dark:text-green-400">-{fmt(totals.saleSavings)}</span>
            </div>
          )}

          {totals.promotionSavings > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Promotion savings
                {totals.promotionNames.length > 0 && (
                  <span className="ml-1 text-xs">({totals.promotionNames.join(" • ")})</span>
                )}
              </span>
              <span className="text-green-600 dark:text-green-400">-{fmt(totals.promotionSavings)}</span>
            </div>
          )}

          {/* Promotion discounts (BXGY, automatic) */}
          {totals.promotionDiscounts.map((d) =>
            d.amount > 0 ? (
              <div key={d.id} className="flex justify-between">
                <span className="text-green-600 dark:text-green-400">{getDiscountLabel(d)}</span>
                <span className="text-green-600 dark:text-green-400">-{fmt(d.amount)}</span>
              </div>
            ) : null,
          )}

          {/* Coupon discounts */}
          {totals.couponDiscounts.map((d) => (
            <div key={d.id} className="flex justify-between text-green-600 dark:text-green-400">
              <span>{getDiscountLabel(d)}</span>
              <span>{Number(d.amount ?? 0) === 0 ? "Applied" : `-${fmt(d.amount)}`}</span>
            </div>
          ))}

          {/* Other discounts */}
          {totals.otherDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span>-{fmt(totals.otherDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {shippingReady ? (
                safeShipPrice === 0 ? (
                  <span className="text-green-600 dark:text-green-400">FREE</span>
                ) : (
                  fmt(safeShipPrice)
                )
              ) : (
                "—"
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{fmt(cart.taxAmount)}</span>
          </div>

          {/* Total before/after discounts */}
          {totals.sumAllDiscounts > 0 && (
            <>
              <Separator className="my-2" />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total before discounts</span>
                <span>{fmt(totals.totalBeforeDiscounts)}</span>
              </div>

              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Total savings</span>
                <span>-{fmt(totals.sumAllDiscounts)}</span>
              </div>
            </>
          )}

          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{fmt(totals.totalAfterDiscounts)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isPlacingOrder}>
            Back
          </Button>
        )}
        <Button
          onClick={onPlaceOrder}
          disabled={!canPlaceOrder}
          size="lg"
          className="flex-1"
        >
          {isPlacingOrder ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>
    </div>
  );
}
