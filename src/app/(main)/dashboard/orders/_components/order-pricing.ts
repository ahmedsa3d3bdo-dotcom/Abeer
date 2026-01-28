export type OrderTotals = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

export type PricingBreakdown = {
  totals: OrderTotals;
  promotionNames: string;
  promotionSavings: number;
  saleSavings: number;
  discountsExcludingCoupon: number;
  couponLines: any[];
  couponDiscount: number;
  totalBeforeDiscounts: number;
};

export type OrderItemGroup = {
  id: string;
  kind: "single" | "bxgy_bundle" | "bxgy_generic";
  items: any[];
  label?: string;
  discount?: any;
  bundleGetProductIds?: string[];
  genericBuyQty?: number;
  genericGetQty?: number;
};

export function isGiftItem(it: any) {
  return Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
}

export function getBaseUnit(it: any) {
  const base = parseFloat(String(it.variantPrice ?? it.productPrice ?? 0));
  return Number.isFinite(base) ? base : 0;
}

export function getCompareAtUnit(it: any) {
  const compareAt = Number(it.variantCompareAtPrice ?? it.productCompareAtPrice ?? 0);
  return Number.isFinite(compareAt) ? compareAt : 0;
}

export function getCompareAtPercentOff(it: any) {
  const base = getBaseUnit(it);
  const compareAt = getCompareAtUnit(it);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(compareAt) || compareAt <= base) return 0;
  const pct = ((compareAt - base) / compareAt) * 100;
  return Math.max(0, Math.round(pct));
}

export function buildBxgyGroups(d: any): OrderItemGroup[] {
  const items: any[] = Array.isArray(d?.items) ? d.items : [];
  const discounts: any[] = Array.isArray(d?.orderDiscounts) ? d.orderDiscounts : [];
  const used = new Set<string>();

  const groups: OrderItemGroup[] = [];

  for (const od of discounts) {
    const md: any = od?.discountMetadata || null;
    if (!(md?.kind === "deal" && md?.offerKind === "bxgy_bundle")) continue;
    const spec = md?.bxgyBundle || md?.bundleBxgy || {};
    const buy = Array.isArray(spec?.buy) ? spec.buy : [];
    const get = Array.isArray(spec?.get) ? spec.get : [];
    const productIds = [...buy, ...get].map((x: any) => String(x?.productId || "")).filter(Boolean);
    const getProductIds = get.map((x: any) => String(x?.productId || "")).filter(Boolean);
    if (!productIds.length) continue;

    const groupItems = items.filter((it) => {
      if (used.has(String(it?.id || ""))) return false;
      const pid = String(it?.productId || "");
      return pid && productIds.includes(pid);
    });
    if (!groupItems.length) continue;
    groupItems.forEach((it) => used.add(String(it?.id || "")));
    groups.push({
      id: String(od?.id || `bxgy-bundle-${groups.length}`),
      kind: "bxgy_bundle",
      items: groupItems,
      label: od?.discountName || od?.code || "BXGY",
      discount: od,
      bundleGetProductIds: getProductIds,
    });
  }

  for (const od of discounts) {
    const md: any = od?.discountMetadata || null;
    if (!(md?.kind === "deal" && md?.offerKind === "bxgy_generic")) continue;
    const bxgy = md?.bxgy || md?.bxgyGeneric || {};
    const buyQty = Number(bxgy?.buyQty || 0);
    const getQty = Number(bxgy?.getQty || 0);
    const targetProductIds: string[] = Array.isArray(od?.targetProductIds) ? od.targetProductIds.map(String) : [];
    if (!targetProductIds.length) continue;

    const groupItems = items.filter((it) => {
      if (used.has(String(it?.id || ""))) return false;
      const pid = String(it?.productId || "");
      return pid && targetProductIds.includes(pid);
    });
    if (!groupItems.length) continue;
    groupItems.forEach((it) => used.add(String(it?.id || "")));
    groups.push({
      id: String(od?.id || `bxgy-generic-${groups.length}`),
      kind: "bxgy_generic",
      items: groupItems,
      label: od?.discountName || od?.code || "BXGY",
      discount: od,
      genericBuyQty: Number.isFinite(buyQty) ? buyQty : 0,
      genericGetQty: Number.isFinite(getQty) ? getQty : 0,
    });
  }

  for (const it of items) {
    const id = String(it?.id || "");
    if (!id || used.has(id)) continue;
    groups.push({ id, kind: "single", items: [it] });
  }

  return groups;
}
