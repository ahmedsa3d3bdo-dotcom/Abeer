/**
 * Cart pricing utilities
 * Uses unified pricing library for consistency across the app
 */

import type { AppliedDiscount, Cart, CartItem } from "@/types/storefront";
import {
  computeOrderTotals,
  normalizeOrderData,
  isGiftItem,
  getReferencePrice,
  getCompareAtPrice,
  type PricingTotals,
} from "@/lib/pricing";

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function isGiftCartItem(item: CartItem) {
  const unit = safeNumber((item as any).unitPrice);
  const total = safeNumber((item as any).totalPrice);
  return Boolean((item as any).isGift) || (unit === 0 && total === 0);
}

export function getCartItemReferenceUnit(item: CartItem) {
  const ref = safeNumber((item as any).referencePrice);
  if (ref > 0) return ref;
  return safeNumber((item as any).unitPrice);
}

export function getCartItemCompareAtUnit(item: CartItem) {
  return safeNumber((item as any).compareAtPrice);
}

export function computeCartPromotionSavings(cart: Cart) {
  return (cart.items || []).reduce((sum: number, it: any) => {
    const qty = safeNumber(it.quantity);
    if (qty <= 0) return sum;

    const ref = getCartItemReferenceUnit(it);
    if (ref <= 0) return sum;

    if (isGiftCartItem(it)) return sum + ref * qty;

    const hasOffer = Boolean(String(it.promotionName || "").trim());
    if (!hasOffer) return sum;

    const unit = safeNumber(it.unitPrice);
    if (unit <= 0) return sum;
    if (unit >= ref) return sum;

    return sum + (ref - unit) * qty;
  }, 0);
}

export function computeCartSaleSavings(cart: Cart) {
  return (cart.items || []).reduce((sum: number, it: any) => {
    const qty = safeNumber(it.quantity);
    if (qty <= 0) return sum;

    if (isGiftCartItem(it)) return sum;

    const ref = getCartItemReferenceUnit(it);
    const compareAt = getCartItemCompareAtUnit(it);

    if (ref <= 0) return sum;
    if (compareAt <= ref) return sum;

    return sum + (compareAt - ref) * qty;
  }, 0);
}

export function splitCartAppliedDiscounts(appliedDiscounts: AppliedDiscount[] | undefined) {
  const promotionDiscounts = (appliedDiscounts || []).filter((d) => Boolean((d as any).isAutomatic));
  const couponDiscounts = (appliedDiscounts || []).filter((d) => !Boolean((d as any).isAutomatic));

  const promotionDiscount = promotionDiscounts.reduce((sum, d) => sum + safeNumber((d as any).amount), 0);
  const couponDiscount = couponDiscounts.reduce((sum, d) => sum + safeNumber((d as any).amount), 0);

  return { promotionDiscounts, couponDiscounts, promotionDiscount, couponDiscount };
}

/**
 * Extended cart totals with backward-compatible field names
 */
export interface CartTotals extends Omit<PricingTotals, 'totalDiscounts'> {
  /** Alias for totalDiscounts (backward compatible) */
  sumAllDiscounts: number;
  /** The raw cart discount amount */
  cartDiscountAmount: number;
}

export function computeCartTotals(
  cart: Cart,
  opts?: {
    totalAfterDiscountsOverride?: number;
  },
): CartTotals {
  // Use the unified pricing library
  const cartData = {
    items: (cart.items || []).map((it: any) => ({
      id: String(it.id || ""),
      productId: it.productId,
      productName: it.name || "",
      variantName: it.variantName,
      sku: it.sku,
      image: it.image,
      quantity: safeNumber(it.quantity),
      unitPrice: safeNumber(it.unitPrice),
      totalPrice: safeNumber(it.totalPrice),
      referencePrice: safeNumber(it.referencePrice),
      compareAtPrice: safeNumber(it.compareAtPrice),
      promotionName: it.promotionName,
      isGift: Boolean(it.isGift),
    })),
    appliedDiscounts: (cart.appliedDiscounts || []).map((d: any) => ({
      id: String(d.id || ""),
      type: d.code && !d.isAutomatic ? "coupon" as const : d.isAutomatic ? "promotion" as const : "other" as const,
      code: d.code || null,
      name: d.discountName || d.name || null,
      amount: safeNumber(d.amount),
      isAutomatic: Boolean(d.isAutomatic),
      metadata: d.discountMetadata || d.metadata || null,
    })),
    subtotal: safeNumber(cart.subtotal),
    discountAmount: safeNumber(cart.discountAmount),
    shippingAmount: safeNumber(cart.shippingAmount),
    taxAmount: safeNumber(cart.taxAmount),
    totalAmount: opts?.totalAfterDiscountsOverride !== undefined
      ? safeNumber(opts.totalAfterDiscountsOverride)
      : safeNumber(cart.totalAmount),
  };

  const totals = computeOrderTotals(cartData);
  const cartDiscountAmount = safeNumber(cart.discountAmount);

  return {
    displaySubtotal: totals.displaySubtotal,
    saleSavings: totals.saleSavings,
    promotionSavings: totals.promotionSavings,
    promotionNames: totals.promotionNames,
    promotionDiscount: totals.promotionDiscount,
    promotionDiscounts: totals.promotionDiscounts,
    couponDiscount: totals.couponDiscount,
    couponDiscounts: totals.couponDiscounts,
    otherDiscount: totals.otherDiscount,
    shipping: totals.shipping,
    tax: totals.tax,
    totalBeforeDiscounts: totals.totalBeforeDiscounts,
    totalAfterDiscounts: totals.totalAfterDiscounts,
    // Backward compatible aliases
    sumAllDiscounts: totals.totalDiscounts,
    cartDiscountAmount,
  };
}
