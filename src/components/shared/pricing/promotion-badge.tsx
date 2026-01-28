"use client";

import { cn } from "@/lib/utils";
import { Tag, Percent, Gift, Ticket, Package } from "lucide-react";

/**
 * Promotion badge types for visual distinction
 */
export type PromotionType = "sale" | "promotion" | "deal" | "coupon" | "bxgy" | "gift" | "bundle";

interface PromotionBadgeProps {
    type: PromotionType;
    label?: string;
    code?: string | null;
    className?: string;
    size?: "sm" | "md";
}

/**
 * Color and icon configuration for each promotion type
 * Using professional, distinct colors for each category
 */
const typeConfig: Record<PromotionType, { icon: typeof Tag; defaultLabel: string; color: string }> = {
    sale: {
        icon: Percent,
        defaultLabel: "Sale",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    promotion: {
        icon: Tag,
        defaultLabel: "Promotion",
        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
    deal: {
        icon: Gift,
        defaultLabel: "Deal",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    coupon: {
        icon: Ticket,
        defaultLabel: "Coupon",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    bxgy: {
        icon: Gift,
        defaultLabel: "Buy X Get Y",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
    gift: {
        icon: Gift,
        defaultLabel: "Free Gift",
        color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    },
    bundle: {
        icon: Package,
        defaultLabel: "Bundle",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    },
};

/**
 * Displays a professional promotion/discount badge
 * Used inline with products to show applied promotions
 */
export function PromotionBadge({ type, label, code, className, size = "sm" }: PromotionBadgeProps) {
    const config = typeConfig[type] || typeConfig.promotion;
    const Icon = config.icon;

    const displayLabel = label || (code ? `${config.defaultLabel} (${code})` : config.defaultLabel);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium",
                size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                config.color,
                className,
            )}
        >
            <Icon className={cn("flex-shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <span className="truncate">{displayLabel}</span>
        </span>
    );
}

/**
 * Determines the appropriate promotion type from metadata
 * Used to select the correct badge styling
 */
export function getPromotionType(metadata?: { kind?: string; offerKind?: string } | null): PromotionType {
    if (!metadata) return "promotion";

    const { kind, offerKind } = metadata;

    // BXGY deals get special purple badge
    if (offerKind === "bxgy_generic") return "bxgy";
    if (offerKind === "bxgy_bundle") return "bundle";

    // Other deals
    if (kind === "deal") return "deal";

    // Standard offers
    if (kind === "offer") return "promotion";

    return "promotion";
}

/**
 * Creates a professional BXGY label from metadata
 * Examples: "Buy 2 Get 1", "Buy 1 Get 1"
 */
export function getBxgyLabel(metadata?: { bxgy?: { buyQty?: number; getQty?: number } } | null, name?: string | null): string {
    const buyQty = metadata?.bxgy?.buyQty || 0;
    const getQty = metadata?.bxgy?.getQty || 0;

    if (buyQty > 0 && getQty > 0) {
        const label = `Buy ${buyQty} Get ${getQty}`;
        return name ? `${label} • ${name}` : label;
    }

    return name || "Buy X Get Y";
}
