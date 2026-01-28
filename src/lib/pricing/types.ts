/**
 * Shared pricing types for consistent discount/promotion display
 * across admin and customer-facing pages.
 */

export interface DiscountLineItem {
  id: string;
  type: "sale" | "promotion" | "deal" | "coupon" | "other";
  code?: string | null;
  name?: string | null;
  amount: number;
  isAutomatic: boolean;
  metadata?: {
    kind?: "offer" | "deal";
    offerKind?: "standard" | "bundle" | "bxgy_generic" | "bxgy_bundle";
    bxgy?: { buyQty?: number; getQty?: number };
    bxgyBundle?: { buy?: any[]; get?: any[] };
  } | null;
}

export interface OrderLineItem {
  id: string;
  productId?: string | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  image?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  referencePrice?: number;
  compareAtPrice?: number;
  promotionName?: string | null;
  isGift?: boolean;
}

export interface PricingTotals {
  /** Subtotal before any discounts (compare-at prices if applicable) */
  displaySubtotal: number;

  /** Savings from compare-at prices (sale/markdown) */
  saleSavings: number;

  /** Savings from scheduled offers and BXGY deals (line-level) */
  promotionSavings: number;

  /** Names of promotions applied (for display) */
  promotionNames: string[];

  /** Cart-level promotion discounts (automatic) */
  promotionDiscount: number;

  /** Individual promotion discount lines */
  promotionDiscounts: DiscountLineItem[];

  /** Cart-level coupon discounts */
  couponDiscount: number;

  /** Individual coupon discount lines */
  couponDiscounts: DiscountLineItem[];

  /** Any other discounts not categorized */
  otherDiscount: number;

  /** Total of all discounts */
  totalDiscounts: number;

  /** Shipping cost */
  shipping: number;

  /** Tax amount */
  tax: number;

  /** Total before any discounts were applied */
  totalBeforeDiscounts: number;

  /** Final total after all discounts */
  totalAfterDiscounts: number;
}

export interface ComputeTotalsInput {
  items: OrderLineItem[];
  appliedDiscounts?: DiscountLineItem[];
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}

/**
 * Standard display labels for discount types
 */
export const DISCOUNT_LABELS = {
  sale: "Sale savings",
  promotion: "Promotion savings",
  deal: "Deal savings",
  coupon: "Coupon",
  bxgy_generic: "Buy X Get Y",
  bxgy_bundle: "Bundle deal",
  free_gift: "Free gift",
  other: "Discount",
} as const;

/**
 * Get display label for a discount line
 */
export function getDiscountLabel(discount: DiscountLineItem): string {
  const { type, code, name, metadata } = discount;

  // For coupons, always show "Coupon (CODE)"
  if (type === "coupon" && code) {
    return `Coupon (${code})`;
  }

  // For promotions/deals with names
  if (type === "promotion" || type === "deal") {
    const offerKind = metadata?.offerKind;

    if (offerKind === "bxgy_generic") {
      const buyQty = metadata?.bxgy?.buyQty || 0;
      const getQty = metadata?.bxgy?.getQty || 0;
      if (buyQty > 0 && getQty > 0) {
        return name ? `Buy ${buyQty} Get ${getQty} (${name})` : `Buy ${buyQty} Get ${getQty}`;
      }
      return name ? `Buy X Get Y (${name})` : DISCOUNT_LABELS.bxgy_generic;
    }

    if (offerKind === "bxgy_bundle") {
      return name ? `Bundle deal (${name})` : DISCOUNT_LABELS.bxgy_bundle;
    }

    if (name) {
      return `Promotion (${name})`;
    }

    return DISCOUNT_LABELS.promotion;
  }

  // Fallback
  if (name) return name;
  if (code) return `Discount (${code})`;
  return DISCOUNT_LABELS[type] || DISCOUNT_LABELS.other;
}
