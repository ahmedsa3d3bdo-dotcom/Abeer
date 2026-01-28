"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { PricingTotals, DiscountLineItem } from "@/lib/pricing";
import { getDiscountLabel } from "@/lib/pricing";
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
    /** Show "Sum of all discounts" line */
    showTotalDiscounts?: boolean;
    /** Size variant */
    size?: "sm" | "md";
}

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
    const hasMultipleDiscountTypes =
        (totals.saleSavings > 0 ? 1 : 0) +
        (totals.promotionSavings > 0 ? 1 : 0) +
        (totals.couponDiscount > 0 ? 1 : 0) +
        (totals.otherDiscount > 0 ? 1 : 0) >
        1;

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

            {/* Promotion Savings (line-level) */}
            {totals.promotionSavings > 0 && (
                <div className="flex justify-between">
                    <span className={labelColor}>
                        Promotion savings
                        {totals.promotionNames.length > 0 && ` (${totals.promotionNames.join(" • ")})`}
                    </span>
                    <span className={discountColor}>-{fmt(totals.promotionSavings)}</span>
                </div>
            )}

            {/* Detailed discount lines */}
            {showDetails && (
                <>
                    {/* Promotion discounts (automatic) */}
                    {totals.promotionDiscounts.map((d) =>
                        d.amount > 0 ? (
                            <div key={d.id} className="flex justify-between">
                                <span className={labelColor}>{getDiscountLabel(d)}</span>
                                <span className={discountColor}>-{fmt(d.amount)}</span>
                            </div>
                        ) : null,
                    )}

                    {/* Coupon discounts */}
                    {totals.couponDiscounts.map((d) => (
                        <div key={d.id} className="flex justify-between">
                            <span className={discountColor}>{getDiscountLabel(d)}</span>
                            <span className={discountColor}>{d.amount === 0 ? "Applied" : `-${fmt(d.amount)}`}</span>
                        </div>
                    ))}
                </>
            )}

            {/* Other discounts */}
            {totals.otherDiscount > 0 && !showDetails && (
                <div className="flex justify-between">
                    <span className={discountColor}>Discount</span>
                    <span className={discountColor}>-{fmt(totals.otherDiscount)}</span>
                </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between">
                <span className={labelColor}>Shipping</span>
                <span>{totals.shipping === 0 ? "FREE" : fmt(totals.shipping)}</span>
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
 * Compact version for invoices and print
 */
interface InvoicePriceSummaryProps {
    totals: PricingTotals;
    currency?: string;
    locale?: string;
    className?: string;
}

export function InvoicePriceSummary({ totals, currency = "CAD", locale = "en-CA", className }: InvoicePriceSummaryProps) {
    const fmt = (value: number) => formatCurrency(value, { currency, locale });

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
                    <span className="text-muted-foreground">Sale savings</span>
                    <span>-{fmt(totals.saleSavings)}</span>
                </div>
            )}

            {/* Promotion savings */}
            {totals.promotionSavings > 0 && (
                <div className="flex w-full max-w-sm justify-between">
                    <span className="text-muted-foreground">
                        Promotion{totals.promotionNames.length > 0 ? ` (${totals.promotionNames.join(" • ")})` : ""}
                    </span>
                    <span>-{fmt(totals.promotionSavings)}</span>
                </div>
            )}

            {/* Promotion discounts (cart-level) */}
            {totals.promotionDiscounts.map(
                (d) =>
                    d.amount > 0 && (
                        <div key={d.id} className="flex w-full max-w-sm justify-between">
                            <span className="text-muted-foreground">{getDiscountLabel(d)}</span>
                            <span>-{fmt(d.amount)}</span>
                        </div>
                    ),
            )}

            {/* Coupon discounts */}
            {totals.couponDiscounts.map((d) => (
                <div key={d.id} className="flex w-full max-w-sm justify-between">
                    <span className="text-muted-foreground">{getDiscountLabel(d)}</span>
                    <span>{d.amount === 0 ? "—" : `-${fmt(d.amount)}`}</span>
                </div>
            ))}

            {/* Shipping */}
            <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{totals.shipping === 0 ? "FREE" : fmt(totals.shipping)}</span>
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
