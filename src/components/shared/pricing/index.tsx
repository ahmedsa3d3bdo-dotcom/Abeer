/**
 * Shared pricing components for consistent discount display
 * 
 * Usage in customer-facing pages:
 * - PriceSummary: Full breakdown for cart/checkout
 * - InvoicePriceSummary: Compact format for invoices
 * - PromotionBadge: Inline promotion labels on items
 * - LineItemPrice: Price display with compare-at
 */

export { PromotionBadge, getPromotionType, getBxgyLabel, type PromotionType } from "./promotion-badge";
export { PriceSummary, InvoicePriceSummary } from "./price-summary";
export { LineItemPrice, UnitPrice } from "./line-item-price";
