/**
 * Shared pricing types for consistent discount/promotion display
 * across admin and customer-facing pages.
 * 
 * TERMINOLOGY GUIDE:
 * - "Sale savings" = Price reduction from compare-at to current price (markdown/sale)
 * - "Promotion savings" = Price reduction from offers/deals applied at line-item level
 * - "Coupon" = Customer-entered discount codes (manual, not automatic)
 * - "Promotion" = Automatic discounts including BXGY deals and scheduled offers
 * - "Free gift" = Items with $0 price from promotions
 */

/**
 * Discount type classification
 * - sale: Compare-at price reduction (markdown)
 * - promotion: Automatic offers (scheduled discounts, percentage off)
 * - deal: BXGY promotions (Buy X Get Y, Bundle deals)
 * - coupon: Customer-entered discount codes
 * - other: Unclassified discounts
 */
export type DiscountType = "sale" | "promotion" | "deal" | "coupon" | "other";

/**
 * Offer kind for promotions and deals
 */
export type OfferKind = "standard" | "bundle" | "bxgy_generic" | "bxgy_bundle";

export interface DiscountLineItem {
    id: string;
    type: DiscountType;
    code?: string | null;
    name?: string | null;
    amount: number;
    isAutomatic: boolean;
    metadata?: {
        kind?: "offer" | "deal";
        offerKind?: OfferKind;
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
 * Standard display labels for discount types - Professional terminology
 */
export const DISCOUNT_LABELS = {
    // Line-level savings
    sale: "Sale savings",
    promotion: "Promotion",

    // Deal types
    deal: "Deal",
    bxgy_generic: "Buy X Get Y",
    bxgy_bundle: "Bundle deal",

    // Customer-entered
    coupon: "Coupon",

    // Gift items
    free_gift: "Free gift",

    // Fallback
    other: "Discount",
} as const;

/**
 * Determines the correct discount type based on metadata
 * This is the SOURCE OF TRUTH for classifying discounts
 */
export function classifyDiscount(discount: {
    code?: string | null;
    isAutomatic?: boolean;
    metadata?: { kind?: string; offerKind?: string } | null;
}): DiscountType {
    const { code, isAutomatic, metadata } = discount;

    // Check metadata first - this is the most reliable indicator
    if (metadata) {
        const { kind, offerKind } = metadata;

        // BXGY deals (automatic promotions)
        if (kind === "deal" || offerKind === "bxgy_generic" || offerKind === "bxgy_bundle") {
            return "deal";
        }

        // Standard offers (scheduled promotions)
        if (kind === "offer" || offerKind === "standard" || offerKind === "bundle") {
            return "promotion";
        }
    }

    // If it's automatic (no user input), it's a promotion
    if (isAutomatic) {
        return "promotion";
    }

    // If it has a code and is not automatic, it's a coupon
    if (code && !isAutomatic) {
        return "coupon";
    }

    // Default fallback
    return "other";
}

/**
 * Determines if a discount is a BXGY deal
 */
export function isBxgyDeal(discount: DiscountLineItem): boolean {
    const offerKind = discount.metadata?.offerKind;
    const kind = discount.metadata?.kind;
    return kind === "deal" || offerKind === "bxgy_generic" || offerKind === "bxgy_bundle";
}

/**
 * Get professional display label for a discount line
 * 
 * Examples:
 * - Coupon: "Coupon (SAVE20)"
 * - BXGY Generic: "Buy 2 Get 1 Free (Summer Sale)"
 * - BXGY Bundle: "Bundle deal (Home Starter Kit)"
 * - Standard offer: "Promotion (Flash Sale)"
 */
export function getDiscountLabel(discount: DiscountLineItem): string {
    const { type, code, name, metadata } = discount;
    const offerKind = metadata?.offerKind;

    // Handle BXGY Generic - "Buy X Get Y" format
    if (offerKind === "bxgy_generic" || (type === "deal" && metadata?.kind === "deal" && !offerKind)) {
        const buyQty = metadata?.bxgy?.buyQty || 0;
        const getQty = metadata?.bxgy?.getQty || 0;

        if (buyQty > 0 && getQty > 0) {
            const dealLabel = getQty === 1 ? `Buy ${buyQty} Get 1 Free` : `Buy ${buyQty} Get ${getQty} Free`;
            return name ? `${dealLabel} (${name})` : dealLabel;
        }

        return name ? `Buy X Get Y (${name})` : DISCOUNT_LABELS.bxgy_generic;
    }

    // Handle BXGY Bundle - "Bundle deal" format
    if (offerKind === "bxgy_bundle") {
        return name ? `Bundle deal (${name})` : DISCOUNT_LABELS.bxgy_bundle;
    }

    // Handle Coupons - "Coupon (CODE)" format
    if (type === "coupon") {
        if (code) {
            return `Coupon (${code})`;
        }
        return name ? `Coupon (${name})` : DISCOUNT_LABELS.coupon;
    }

    // Handle standard promotions - "Promotion (name)" format
    if (type === "promotion" || type === "deal") {
        if (name) {
            return `Promotion (${name})`;
        }
        if (code) {
            return `Promotion (${code})`;
        }
        return DISCOUNT_LABELS.promotion;
    }

    // Fallback
    if (name) return name;
    if (code) return `Discount (${code})`;
    return DISCOUNT_LABELS.other;
}

/**
 * Get a short badge label for inline display
 * Used for promotion badges on line items
 */
export function getShortPromotionLabel(discount: DiscountLineItem | { metadata?: { offerKind?: string; bxgy?: { buyQty?: number; getQty?: number } } | null; name?: string | null }): string {
    const metadata = discount.metadata;
    const offerKind = metadata?.offerKind;
    const name = discount.name;

    if (offerKind === "bxgy_generic") {
        const buyQty = metadata?.bxgy?.buyQty || 0;
        const getQty = metadata?.bxgy?.getQty || 0;
        if (buyQty > 0 && getQty > 0) {
            return `Buy ${buyQty} Get ${getQty}`;
        }
        return "Buy X Get Y";
    }

    if (offerKind === "bxgy_bundle") {
        return "Bundle deal";
    }

    if (name) {
        return name;
    }

    return "Promotion";
}
