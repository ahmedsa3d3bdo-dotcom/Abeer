import type { AppliedDiscount, Cart, CartItem } from "@/types/storefront";

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

export function computeCartTotals(
  cart: Cart,
  opts?: {
    totalAfterDiscountsOverride?: number;
  },
) {
  const promotionSavings = computeCartPromotionSavings(cart);
  const saleSavings = computeCartSaleSavings(cart);

  const { promotionDiscounts, couponDiscounts, promotionDiscount, couponDiscount } = splitCartAppliedDiscounts(
    cart.appliedDiscounts,
  );

  const cartDiscountAmount = safeNumber(cart.discountAmount);
  const appliedDiscountsAmount = promotionDiscount + couponDiscount;
  const otherDiscount = Math.max(0, cartDiscountAmount - appliedDiscountsAmount);

  const totalAfterDiscounts =
    opts?.totalAfterDiscountsOverride !== undefined ? safeNumber(opts.totalAfterDiscountsOverride) : safeNumber(cart.totalAmount);

  const sumAllDiscounts = promotionSavings + saleSavings + cartDiscountAmount;
  const totalBeforeDiscounts = totalAfterDiscounts + sumAllDiscounts;

  const displaySubtotal = safeNumber(cart.subtotal) + promotionSavings + saleSavings;

  return {
    displaySubtotal,
    promotionSavings,
    saleSavings,
    promotionDiscounts,
    couponDiscounts,
    promotionDiscount,
    couponDiscount,
    otherDiscount,
    cartDiscountAmount,
    totalBeforeDiscounts,
    sumAllDiscounts,
    totalAfterDiscounts,
  };
}
