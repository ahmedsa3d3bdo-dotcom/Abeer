"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { OrderLineItem } from "@/lib/pricing";
import { isGiftItem, getReferencePrice, getCompareAtPrice } from "@/lib/pricing";
import { PromotionBadge, getPromotionType, type PromotionType } from "./promotion-badge";

interface LineItemPriceProps {
    item: OrderLineItem;
    currency?: string;
    locale?: string;
    className?: string;
    /** Show promotion badge */
    showPromotionBadge?: boolean;
    /** Layout variant */
    layout?: "inline" | "stacked";
}

export function LineItemPrice({
    item,
    currency = "CAD",
    locale = "en-CA",
    className,
    showPromotionBadge = true,
    layout = "stacked",
}: LineItemPriceProps) {
    const fmt = (value: number) => formatCurrency(value, { currency, locale });

    const isGift = isGiftItem(item);
    const qty = item.quantity || 1;
    const unit = item.unitPrice;
    const total = item.totalPrice;
    const ref = getReferencePrice(item);
    const compareAt = getCompareAtPrice(item);

    // Determine what discounts are applied
    const hasSalePrice = !isGift && compareAt > 0 && compareAt > ref && ref > 0;
    const hasPromotionPrice = !isGift && ref > 0 && unit > 0 && unit < ref;
    const hasAnyDiscount = hasSalePrice || hasPromotionPrice || isGift;

    // Get promotion details
    const promotionName = item.promotionName?.trim();

    if (isGift) {
        return (
            <div className={cn("flex flex-col items-end", className)}>
                {showPromotionBadge && <PromotionBadge type="gift" size="sm" />}
                <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
                {ref > 0 && (
                    <span className="text-xs text-muted-foreground line-through">{fmt(ref * qty)}</span>
                )}
            </div>
        );
    }

    if (layout === "inline") {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                {hasSalePrice && (
                    <span className="text-xs text-muted-foreground line-through">{fmt(compareAt * qty)}</span>
                )}
                {hasPromotionPrice && !hasSalePrice && (
                    <span className="text-xs text-muted-foreground line-through">{fmt(ref * qty)}</span>
                )}
                <span className={cn("font-semibold", hasAnyDiscount && "text-green-600 dark:text-green-400")}>
                    {fmt(total)}
                </span>
                {showPromotionBadge && promotionName && (
                    <PromotionBadge type="promotion" label={promotionName} size="sm" />
                )}
            </div>
        );
    }

    // Stacked layout (default)
    return (
        <div className={cn("flex flex-col items-end gap-0.5", className)}>
            {showPromotionBadge && promotionName && (
                <PromotionBadge type="promotion" label={promotionName} size="sm" className="mb-1" />
            )}
            {hasSalePrice && (
                <span className="text-xs text-muted-foreground line-through">{fmt(compareAt * qty)}</span>
            )}
            {hasPromotionPrice && (
                <span className="text-xs text-muted-foreground line-through">{fmt(ref * qty)}</span>
            )}
            <span className={cn("font-semibold", hasAnyDiscount && "text-green-600 dark:text-green-400")}>
                {fmt(total)}
            </span>
        </div>
    );
}

/**
 * Unit price display with compare-at
 */
interface UnitPriceProps {
    item: OrderLineItem;
    currency?: string;
    locale?: string;
    className?: string;
}

export function UnitPrice({ item, currency = "CAD", locale = "en-CA", className }: UnitPriceProps) {
    const fmt = (value: number) => formatCurrency(value, { currency, locale });

    const isGift = isGiftItem(item);
    const unit = item.unitPrice;
    const ref = getReferencePrice(item);
    const compareAt = getCompareAtPrice(item);

    if (isGift) {
        return <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>;
    }

    const hasSalePrice = compareAt > 0 && compareAt > ref && ref > 0;
    const hasPromotionPrice = ref > 0 && unit > 0 && unit < ref;

    return (
        <div className={cn("flex flex-col items-end leading-tight", className)}>
            {hasSalePrice && <span className="text-xs text-muted-foreground line-through">{fmt(compareAt)}</span>}
            {hasPromotionPrice && <span className="text-xs text-muted-foreground line-through">{fmt(ref)}</span>}
            <span>{fmt(unit)}</span>
        </div>
    );
}
