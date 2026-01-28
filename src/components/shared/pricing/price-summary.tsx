"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { PricingTotals, DiscountLineItem } from "@/lib/pricing";
import { getDiscountLabel, isBxgyDeal } from "@/lib/pricing";
import { Separator } from "@/components/ui/separator";

interface PriceSummaryProps {
    totals: PricingTotals;
    currency?: string;
    locale?: string;
    className?: string;
    /** Show detailed breakdown with all discount lines */
    showDetails?: boolean;
    /** Show "Total before discounts" line */
    showBeforeDiscounts?: boolean;
    /** Show "Total savings" line */
    showTotalDiscounts?: boolean;
    /** Size variant */
    size?: "sm" | "md";
}

/**
 * Professional price summary component for cart, checkout, and order pages
 * 
 * Displays:
 * - Subtotal (before discounts)
 * - Sale savings (strikethrough reductions)
 * - Promotion savings (offers/deals at line level)
 * - Individual promotion discounts (BXGY, scheduled offers)
 * - Coupon discounts (customer codes)
 * - Shipping and Tax
 * - Total before/after discounts
 */
export function PriceSummary({
    totals,
    currency = "CAD",
    locale = "en-CA",
    className,
    showDetails = true,
    showBeforeDiscounts = true,
    showTotalDiscounts = true,
    size = "md",
}: PriceSummaryProps) {
    const fmt = (value: number) => formatCurrency(value, { currency, locale });

    const textSize = size === "sm" ? "text-xs" : "text-sm";
    const labelColor = "text-muted-foreground";
    const discountColor = "text-green-600 dark:text-green-400";

    const hasDiscounts = totals.totalDiscounts > 0;

    return (
        <div className={cn("space-y-1.5", textSize, className)}>
            {/* Subtotal */}
            <div className="flex justify-between">
                <span className={labelColor}>Subtotal</span>
                <span>{fmt(totals.displaySubtotal)}</span>
            </div>

            {/* Sale Savings */}
            {totals.saleSavings > 0 && (
                <div className="flex justify-between">
                    <span className={labelColor}>Sale savings</span>
                    <span className={discountColor}>-{fmt(totals.saleSavings)}</span>
                </div>
            )}

            {/* Promotion Savings (line-level offers/deals) */}
            {totals.promotionSavings > 0 && (
                <div className="flex justify-between">
                    <span className={labelColor}>
                        Promotion savings
                        {totals.promotionNames.length > 0 && (
                            <span className="ml-1 text-xs">({totals.promotionNames.join(" • ")})</span>
                        )}
                    </span>
                    <span className={discountColor}>-{fmt(totals.promotionSavings)}</span>
                </div>
            )}

            {/* Detailed discount lines */}
            {showDetails && (
                <>
                    {/* Automatic promotions (BXGY, scheduled) with monetary value */}
                    {totals.promotionDiscounts.map((d) =>
                        d.amount > 0 ? (
                            <div key={d.id} className="flex justify-between">
                                <span className={discountColor}>{getDiscountLabel(d)}</span>
                                <span className={discountColor}>-{fmt(d.amount)}</span>
                            </div>
                        ) : null,
                    )}

                    {/* Coupon discounts */}
                    {totals.couponDiscounts.map((d) => (
                        <div key={d.id} className="flex justify-between">
                            <span className={discountColor}>{getDiscountLabel(d)}</span>
                            <span className={discountColor}>
                                {d.amount === 0 ? "Applied" : `-${fmt(d.amount)}`}
                            </span>
                        </div>
                    ))}
                </>
            )}

            {/* Other discounts (when not showing details) */}
            {totals.otherDiscount > 0 && !showDetails && (
                <div className="flex justify-between">
                    <span className={discountColor}>Discount</span>
                    <span className={discountColor}>-{fmt(totals.otherDiscount)}</span>
                </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between">
                <span className={labelColor}>Shipping</span>
                <span>{totals.shipping === 0 ? <span className={discountColor}>FREE</span> : fmt(totals.shipping)}</span>
            </div>

            {/* Tax */}
            <div className="flex justify-between">
                <span className={labelColor}>Tax</span>
                <span>{fmt(totals.tax)}</span>
            </div>

            {/* Before/After discounts section */}
            {hasDiscounts && (showBeforeDiscounts || showTotalDiscounts) && (
                <>
                    <Separator className="my-2" />

                    {showBeforeDiscounts && (
                        <div className="flex justify-between">
                            <span className={labelColor}>Total before discounts</span>
                            <span>{fmt(totals.totalBeforeDiscounts)}</span>
                        </div>
                    )}

                    {showTotalDiscounts && (
                        <div className="flex justify-between">
                            <span className={discountColor}>Total savings</span>
                            <span className={discountColor}>-{fmt(totals.totalDiscounts)}</span>
                        </div>
                    )}
                </>
            )}

            {/* Final Total */}
            <Separator className="my-2" />
            <div className={cn("flex justify-between font-semibold", size === "sm" ? "text-sm" : "text-base")}>
                <span>Total</span>
                <span>{fmt(totals.totalAfterDiscounts)}</span>
            </div>
        </div>
    );
}

/**
 * Compact invoice-style price summary for print
 * 
 * Displays a right-aligned summary suitable for invoices:
 * - Total before discounts
 * - All savings broken down
 * - Shipping and Tax
 * - Final Total
 */
interface InvoicePriceSummaryProps {
    totals: PricingTotals;
    currency?: string;
    locale?: string;
    className?: string;
}

export function InvoicePriceSummary({ totals, currency = "CAD", locale = "en-CA", className }: InvoicePriceSummaryProps) {
    const fmt = (value: number) => formatCurrency(value, { currency, locale });
    const discountColor = "text-green-700 dark:text-green-300";

    return (
        <div className={cn("flex flex-col items-end gap-1 text-sm", className)}>
            {/* Total before discounts */}
            <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Total before discounts</span>
                <span>{fmt(totals.totalBeforeDiscounts)}</span>
            </div>

            {/* Sale savings */}
            {totals.saleSavings > 0 && (
                <div className="flex w-full max-w-sm justify-between">
                    <span className={discountColor}>Sale savings</span>
                    <span className={discountColor}>-{fmt(totals.saleSavings)}</span>
                </div>
            )}

            {/* Promotion savings */}
            {totals.promotionSavings > 0 && (
                <div className="flex w-full max-w-sm justify-between">
                    <span className={discountColor}>
                        Promotion
                        {totals.promotionNames.length > 0 && (
                            <span className="ml-1 text-xs">({totals.promotionNames.join(" • ")})</span>
                        )}
                    </span>
                    <span className={discountColor}>-{fmt(totals.promotionSavings)}</span>
                </div>
            )}

            {/* Promotion discounts (cart-level BXGY, offers) */}
            {totals.promotionDiscounts.map(
                (d) =>
                    d.amount > 0 && (
                        <div key={d.id} className="flex w-full max-w-sm justify-between">
                            <span className={discountColor}>{getDiscountLabel(d)}</span>
                            <span className={discountColor}>-{fmt(d.amount)}</span>
                        </div>
                    ),
            )}

            {/* Coupon discounts */}
            {totals.couponDiscounts.map((d) => (
                <div key={d.id} className="flex w-full max-w-sm justify-between">
                    <span className={discountColor}>{getDiscountLabel(d)}</span>
                    <span className={discountColor}>
                        {d.amount === 0 ? "Applied" : `-${fmt(d.amount)}`}
                    </span>
                </div>
            ))}

            {/* Shipping */}
            <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{totals.shipping === 0 ? <span className={discountColor}>FREE</span> : fmt(totals.shipping)}</span>
            </div>

            {/* Tax */}
            <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{fmt(totals.tax)}</span>
            </div>

            {/* Separator and Total */}
            <Separator className="my-2 w-full max-w-sm" />
            <div className="flex w-full max-w-sm justify-between text-base font-semibold">
                <span>Total</span>
                <span>{fmt(totals.totalAfterDiscounts)}</span>
            </div>
        </div>
    );
}
