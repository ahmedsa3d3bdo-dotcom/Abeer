/**
 * Unified pricing calculation logic for orders and carts.
 * Single source of truth for all discount/promotion calculations.
 * 
 * This module ensures consistent pricing display across:
 * - Customer: Cart, Checkout, Order Confirmation, Order Details, Invoice
 * - Admin: Order Drawer, Order Invoice, Order Table
 */

import type { ComputeTotalsInput, DiscountLineItem, DiscountType, OrderLineItem, PricingTotals } from "./types";
import { classifyDiscount, isBxgyDeal } from "./types";

function safeNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Determines if an item is a gift (free item from promotion)
 */
export function isGiftItem(item: OrderLineItem): boolean {
    if (item.isGift) return true;
    const unit = safeNumber(item.unitPrice);
    const total = safeNumber(item.totalPrice);
    return unit === 0 && total === 0;
}

/**
 * Gets the reference unit price (base price before promotions)
 */
export function getReferencePrice(item: OrderLineItem): number {
    const ref = safeNumber(item.referencePrice);
    if (ref > 0) return ref;
    return safeNumber(item.unitPrice);
}

/**
 * Gets the compare-at price (original price before sale)
 */
export function getCompareAtPrice(item: OrderLineItem): number {
    return safeNumber(item.compareAtPrice);
}

/**
 * Calculates sale savings (compare-at vs reference price)
 * This is the "strikethrough" price difference from markdowns
 */
export function computeSaleSavings(items: OrderLineItem[]): number {
    return items.reduce((sum, item) => {
        const qty = safeNumber(item.quantity);
        if (qty <= 0) return sum;

        if (isGiftItem(item)) return sum;

        const ref = getReferencePrice(item);
        const compareAt = getCompareAtPrice(item);

        if (ref <= 0) return sum;
        if (compareAt <= ref) return sum;

        return sum + (compareAt - ref) * qty;
    }, 0);
}

/**
 * Calculates promotion savings (reference price vs unit price)
 * Includes gift items valued at their reference price
 * 
 * This covers:
 * - Scheduled offers that reduce unit price
 * - BXGY deals where items become free/discounted
 * - Gift items from promotions
 */
export function computePromotionSavings(items: OrderLineItem[]): { savings: number; names: string[] } {
    const names: string[] = [];
    let savings = 0;

    for (const item of items) {
        const qty = safeNumber(item.quantity);
        if (qty <= 0) continue;

        const ref = getReferencePrice(item);
        if (ref <= 0) continue;

        // Gift items: full reference price is the savings
        if (isGiftItem(item)) {
            savings += ref * qty;
            continue;
        }

        // Check if there's a promotion applied
        const unit = safeNumber(item.unitPrice);
        if (unit <= 0) continue;
        if (unit >= ref) continue;

        savings += (ref - unit) * qty;

        // Collect promotion name
        const promoName = item.promotionName?.trim();
        if (promoName && !names.includes(promoName)) {
            names.push(promoName);
        }
    }

    return { savings, names };
}

/**
 * Splits applied discounts into categories:
 * - Promotions: Automatic discounts (BXGY deals, scheduled offers)
 * - Coupons: Customer-entered discount codes
 * - Other: Unclassified discounts
 */
export function splitAppliedDiscounts(discounts: DiscountLineItem[] | undefined) {
    const promotionDiscounts: DiscountLineItem[] = [];
    const couponDiscounts: DiscountLineItem[] = [];
    const otherDiscounts: DiscountLineItem[] = [];

    for (const d of discounts || []) {
        // Use the centralized classification logic
        const actualType = classifyDiscount({
            code: d.code,
            isAutomatic: d.isAutomatic,
            metadata: d.metadata,
        });

        if (actualType === "coupon") {
            couponDiscounts.push(d);
        } else if (actualType === "promotion" || actualType === "deal") {
            promotionDiscounts.push(d);
        } else {
            otherDiscounts.push(d);
        }
    }

    const promotionDiscount = promotionDiscounts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    const couponDiscount = couponDiscounts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    const otherDiscount = otherDiscounts.reduce((sum, d) => sum + safeNumber(d.amount), 0);

    return {
        promotionDiscounts,
        couponDiscounts,
        otherDiscounts,
        promotionDiscount,
        couponDiscount,
        otherDiscount,
    };
}

/**
 * Extracts promotion names from discount lines (for non-monetary displays)
 * Used to show promotion names in the pricing summary
 */
export function extractPromotionNames(discounts: DiscountLineItem[] | undefined): string[] {
    const names: string[] = [];

    for (const d of discounts || []) {
        // Skip coupons - they have their own display
        if (d.type === "coupon") continue;

        // Skip if no metadata indicating a promotion/deal
        const md = d.metadata;
        if (!md) continue;

        // Include offers and deals
        const isOffer = md.kind === "offer";
        const isDeal = md.kind === "deal" || md.offerKind === "bxgy_generic" || md.offerKind === "bxgy_bundle";

        if (isOffer || isDeal) {
            const name = d.name?.trim();
            if (name && !names.includes(name)) {
                names.push(name);
            }
        }
    }

    return names;
}

/**
 * Main function to compute all pricing totals
 * 
 * Returns a comprehensive breakdown of:
 * - Display subtotal (what items would cost without discounts)
 * - Sale savings (compare-at reductions)
 * - Promotion savings (offer/deal reductions at line level)
 * - Promotion discounts (cart-level automatic discounts)
 * - Coupon discounts (customer-entered codes)
 * - Shipping and tax
 * - Totals before/after discounts
 */
export function computeOrderTotals(input: ComputeTotalsInput): PricingTotals {
    const { items, appliedDiscounts, subtotal, discountAmount, shippingAmount, taxAmount, totalAmount } = input;

    // Calculate line-level savings
    const saleSavings = computeSaleSavings(items);
    const { savings: promotionSavings, names: itemPromotionNames } = computePromotionSavings(items);

    // Split applied discounts using centralized logic
    const { promotionDiscounts, couponDiscounts, promotionDiscount, couponDiscount, otherDiscount } =
        splitAppliedDiscounts(appliedDiscounts);

    // Get promotion names from discount lines
    const discountPromotionNames = extractPromotionNames(appliedDiscounts);

    // Combine unique promotion names
    const allPromotionNames = [...new Set([...itemPromotionNames, ...discountPromotionNames])];

    // Calculate display subtotal (what items would cost before any discounts)
    const baseSubtotal = safeNumber(subtotal);
    const displaySubtotal = baseSubtotal + promotionSavings + saleSavings;

    // Get totals from cart/order
    const cartDiscountAmount = safeNumber(discountAmount);
    const appliedDiscountsTotal = promotionDiscount + couponDiscount + otherDiscount;

    // Any discount not accounted for in applied discounts
    const remainingOtherDiscount = Math.max(0, cartDiscountAmount - appliedDiscountsTotal) + otherDiscount;

    // All discounts combined
    const totalDiscounts = saleSavings + promotionSavings + cartDiscountAmount;

    // Shipping and tax
    const shipping = safeNumber(shippingAmount);
    const tax = safeNumber(taxAmount);

    // Final total
    const totalAfterDiscounts = safeNumber(totalAmount);
    const totalBeforeDiscounts = totalAfterDiscounts + totalDiscounts;

    return {
        displaySubtotal,
        saleSavings,
        promotionSavings,
        promotionNames: allPromotionNames,
        promotionDiscount,
        promotionDiscounts,
        couponDiscount,
        couponDiscounts,
        otherDiscount: remainingOtherDiscount,
        totalDiscounts,
        shipping,
        tax,
        totalBeforeDiscounts,
        totalAfterDiscounts,
    };
}

/**
 * Convert raw order/cart data to ComputeTotalsInput format
 * 
 * This normalizes data from various sources:
 * - Cart objects (frontend)
 * - Order objects (API responses)
 * - Admin order details
 * 
 * The key improvement here is using metadata to correctly classify
 * BXGY deals as promotions (not coupons), even if they have a code.
 */
export function normalizeOrderData(data: any): ComputeTotalsInput {
    // Normalize items
    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const items: OrderLineItem[] = rawItems.map((it: any) => ({
        id: String(it?.id || ""),
        productId: it?.productId || null,
        productName: it?.productName || it?.name || "",
        variantName: it?.variantName || it?.variant || null,
        sku: it?.sku || null,
        image: it?.image || null,
        quantity: safeNumber(it?.quantity),
        unitPrice: safeNumber(it?.unitPrice ?? it?.price),
        totalPrice: safeNumber(it?.totalPrice ?? it?.total),
        referencePrice: safeNumber(it?.referencePrice ?? it?.variantPrice ?? it?.productPrice),
        compareAtPrice: safeNumber(it?.compareAtPrice ?? it?.variantCompareAtPrice ?? it?.productCompareAtPrice),
        promotionName: it?.promotionName || null,
        isGift: Boolean(it?.isGift),
    }));

    // Normalize applied discounts with CORRECT type classification
    const rawDiscounts = Array.isArray(data?.appliedDiscounts)
        ? data.appliedDiscounts
        : Array.isArray(data?.orderDiscounts)
            ? data.orderDiscounts
            : Array.isArray(data?.discounts)
                ? data.discounts
                : [];

    const appliedDiscounts: DiscountLineItem[] = rawDiscounts.map((d: any) => {
        // Extract metadata
        const metadata = d?.discountMetadata || d?.metadata || null;

        // Use centralized classification based on metadata
        const discountType = classifyDiscount({
            code: d?.code,
            isAutomatic: Boolean(d?.isAutomatic),
            metadata,
        });

        return {
            id: String(d?.id || ""),
            type: discountType,
            code: d?.code || null,
            name: d?.discountName || d?.name || null,
            amount: safeNumber(d?.amount),
            isAutomatic: Boolean(d?.isAutomatic),
            metadata,
        };
    });

    // Add fallback discount if no applied discounts but discountAmount exists
    const discountAmount = safeNumber(data?.discountAmount ?? data?.discount);
    if (appliedDiscounts.length === 0 && discountAmount > 0) {
        // If there's a code provided, it's likely a coupon
        const hasCode = Boolean(data?.appliedDiscountCode);
        appliedDiscounts.push({
            id: "order-discount",
            type: hasCode ? "coupon" : "other",
            code: data?.appliedDiscountCode || null,
            name: null,
            amount: discountAmount,
            isAutomatic: !hasCode,
            metadata: null,
        });
    }

    return {
        items,
        appliedDiscounts,
        subtotal: safeNumber(data?.subtotal),
        discountAmount,
        shippingAmount: safeNumber(data?.shippingAmount ?? data?.shipping),
        taxAmount: safeNumber(data?.taxAmount ?? data?.tax),
        totalAmount: safeNumber(data?.totalAmount ?? data?.total),
    };
}
