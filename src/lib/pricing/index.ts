/**
 * Unified pricing utilities
 * Single source of truth for discount/promotion calculations and display
 * 
 * Usage:
 * 1. Import normalizeOrderData and computeOrderTotals to calculate totals
 * 2. Import getDiscountLabel for professional discount naming
 * 3. Import classifyDiscount to determine discount type from raw data
 * 4. Use the PriceSummary component for consistent UI display
 */

export * from "./types";
export * from "./compute-order-totals";
