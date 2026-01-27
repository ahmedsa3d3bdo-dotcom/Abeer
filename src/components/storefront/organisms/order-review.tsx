"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { Cart } from "@/types/storefront";

interface OrderReviewProps {
  cart: Cart;
  shippingAddress: any;
  shippingMethod: any;
  paymentMethod: any;
  onBack?: () => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
}

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

  const computedTotal = cart.subtotal + cart.taxAmount + (shippingReady ? safeShipPrice : 0) - cart.discountAmount;

  const canPlaceOrder = addressReady && shippingReady && paymentReady && !isPlacingOrder;

  return (
    <div className="space-y-6">
      {/* Shipping Address */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Shipping Address</h3>
        {addressReady ? (
          <div className="text-sm space-y-1">
            <p>{`${shippingAddress.firstName} ${shippingAddress.lastName}`}</p>
            <p>{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
            <p>{`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`}</p>
            <p>{shippingAddress.country}</p>
            <p>{shippingAddress.phone}</p>
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
              {safeShipPrice === 0 ? "FREE" : `$${safeShipPrice.toFixed(2)}`}
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
          {cart.items.map((item) => (
            (() => {
              const isGift = Boolean((item as any).isGift) || (Number(item.unitPrice ?? 0) === 0 && Number(item.totalPrice ?? 0) === 0);
              const compareAt = Number((item as any).compareAtPrice ?? 0);
              const hasCompareAt = !isGift && Number.isFinite(compareAt) && compareAt > 0 && compareAt > Number(item.unitPrice ?? 0);
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
                {isGift ? (
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">Free gift</p>
                ) : null}
                {promotionName ? (
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">{promotionName}</p>
                ) : null}
                {item.variantName && (
                  <p className="text-xs text-muted-foreground">{item.variantName}</p>
                )}
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <div className={isGift ? "text-right font-semibold text-sm text-green-700 dark:text-green-300" : "text-right font-semibold text-sm"}>
                {hasCompareAt ? <div className="text-xs text-muted-foreground line-through">${(compareAt * Number(item.quantity ?? 0)).toFixed(2)}</div> : null}
                <div>{isGift ? "FREE" : `$${item.totalPrice.toFixed(2)}`}</div>
              </div>
            </div>
              );
            })()
          ))}
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          {(cart.appliedDiscounts || []).some((d: any) => Number(d?.amount ?? 0) === 0) ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Promotion</span>
              <span>—</span>
            </div>
          ) : null}
          {cart.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${cart.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {shippingReady ? (safeShipPrice === 0 ? "FREE" : `$${safeShipPrice.toFixed(2)}`) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>${cart.taxAmount.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${computedTotal.toFixed(2)}</span>
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
