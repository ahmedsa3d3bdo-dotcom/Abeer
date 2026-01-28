"use client";

import { formatCurrency } from "@/lib/utils";
import {
  buildBxgyGroups,
  getBaseUnit,
  getCompareAtPercentOff,
  getCompareAtUnit,
  isGiftItem,
} from "./order-pricing";

export function OrderItemsTable(props: {
  d: any;
  currency: string;
  locale: string;
  promotionNames: string;
  mode?: "drawer" | "invoice";
}) {
  const { d, currency, locale, promotionNames, mode = "drawer" } = props;

  const groups = buildBxgyGroups(d);
  const fmt = (value: number) => formatCurrency(value, { currency, locale });

  const wrapClassName = mode === "drawer" ? "overflow-x-auto" : "";
  const tableClassName = mode === "drawer" ? "min-w-[980px] w-full" : "w-full";
  const textClassName = mode === "invoice" ? "text-xs" : "text-sm";

  /**
   * Get professional promotion label for display
   * Examples: "Buy 2 Get 1 Free", "Bundle deal", "20% Off"
   */
  const getPromotionLabel = (group: any, item: any) => {
    // BXGY Bundle
    if (group.kind === "bxgy_bundle") {
      const buyQty = group.bundleBuyQty || 0;
      const getQty = group.bundleGetQty || 0;
      if (buyQty > 0 && getQty > 0) {
        return (
          <span className="text-purple-700 dark:text-purple-300">
            Bundle deal ({group.label || `Buy ${buyQty} Get ${getQty}`})
          </span>
        );
      }
      return <span className="text-purple-700 dark:text-purple-300">{group.label || "Bundle deal"}</span>;
    }

    // BXGY Generic
    if (group.kind === "bxgy_generic") {
      const buyQty = group.genericBuyQty || 0;
      const getQty = group.genericGetQty || 0;
      if (buyQty > 0 && getQty > 0) {
        const label = getQty === 1 ? `Buy ${buyQty} Get 1 Free` : `Buy ${buyQty} Get ${getQty} Free`;
        return (
          <span className="text-purple-700 dark:text-purple-300">
            {group.label ? `${label} (${group.label})` : label}
          </span>
        );
      }
      return <span className="text-purple-700 dark:text-purple-300">{group.label || "Buy X Get Y"}</span>;
    }

    // Gift item
    if (isGiftItem(item)) {
      return <span className="text-pink-700 dark:text-pink-300">Free gift</span>;
    }

    // Sale price (compare-at)
    const base = getBaseUnit(item);
    const compareAt = getCompareAtUnit(item);
    if (compareAt > base && base > 0) {
      const pct = getCompareAtPercentOff(item);
      return (
        <span className="text-amber-700 dark:text-amber-300">
          {pct > 0 ? `${pct}% off` : "Sale"}
        </span>
      );
    }

    // Has promotion offer
    const unit = Number(item?.unitPrice ?? 0);
    const hasOffer = base > 0 && unit > 0 && unit < base;
    if (hasOffer) {
      return (
        <span className="text-green-700 dark:text-green-300">
          {promotionNames || "Promotion"}
        </span>
      );
    }

    return <span className="text-muted-foreground">—</span>;
  };

  /**
   * Get price after discount label
   */
  const getPriceAfterDiscount = (group: any, item: any, freeQtyByItemId: Map<string, number>) => {
    // Gift item
    if (isGiftItem(item)) {
      return <span className="text-green-700 dark:text-green-300 font-semibold">FREE</span>;
    }

    // BXGY Bundle - "Get" products are free
    if (group.kind === "bxgy_bundle") {
      const bundleGetIds: string[] = Array.isArray(group.bundleGetProductIds) ? group.bundleGetProductIds : [];
      const pid = String(item?.productId || "");
      if (pid && bundleGetIds.includes(pid)) {
        return <span className="text-green-700 dark:text-green-300 font-semibold">FREE (Bundle)</span>;
      }
    }

    // BXGY Generic - cheapest items become free
    if (group.kind === "bxgy_generic") {
      const id = String(item?.id || "");
      const freeQty = freeQtyByItemId.get(id) || 0;
      if (freeQty > 0) {
        const qty = Number(item?.quantity || 0);
        if (freeQty >= qty) {
          return <span className="text-green-700 dark:text-green-300 font-semibold">FREE</span>;
        }
        return (
          <span className="text-green-700 dark:text-green-300">
            {freeQty} free, {qty - freeQty} @ {fmt(Number(item?.unitPrice ?? 0))}
          </span>
        );
      }
    }

    return <span>{fmt(Number(item?.unitPrice ?? 0))}</span>;
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={wrapClassName}>
        <table className={tableClassName}>
          <colgroup>
            <col style={{ width: "36%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="p-2 text-left font-medium">Product</th>
              <th className="p-2 text-right font-medium">Qty</th>
              <th className="p-2 text-right font-medium">Original Price</th>
              <th className="p-2 text-left font-medium">Promotion</th>
              <th className="p-2 text-right font-medium">Discounted Price</th>
              <th className="p-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((g) => {
              const bundleGetIds: string[] = Array.isArray((g as any).bundleGetProductIds)
                ? (g as any).bundleGetProductIds
                : [];

              // For BXGY generic: compute which items receive the free units (cheapest-first)
              const freeQtyByItemId = new Map<string, number>();
              if (g.kind === "bxgy_generic") {
                const buyQty = Number((g as any).genericBuyQty || 0);
                const getQty = Number((g as any).genericGetQty || 0);
                const eligibleQty = g.items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0);

                const applications =
                  buyQty > 0 && getQty > 0 ? Math.floor(eligibleQty / (buyQty + getQty)) : 0;

                let remainingFree = applications * getQty;

                const sorted = g.items
                  .slice()
                  .map((it) => ({
                    it,
                    unit: Number(getBaseUnit(it) || Number(it?.unitPrice ?? 0)),
                  }))
                  .sort((a, b) => a.unit - b.unit);

                for (const row of sorted) {
                  if (remainingFree <= 0) break;
                  const id = String(row.it?.id || "");
                  const qty = Number(row.it?.quantity || 0);
                  if (!id || !Number.isFinite(qty) || qty <= 0) continue;

                  const take = Math.min(remainingFree, qty);
                  freeQtyByItemId.set(id, take);
                  remainingFree -= take;
                }
              }

              return (
                <tr key={String(g.id)} className="border-b last:border-b-0 align-top">
                  {/* Product + SKU */}
                  <td className={`p-2 ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")}>
                          <div className="font-medium leading-tight">{it.productName}</div>
                          {it.variantName && (
                            <div className="text-[11px] text-muted-foreground">{it.variantName}</div>
                          )}
                          {it.sku && (
                            <div className="text-[11px] text-muted-foreground">SKU: {it.sku}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Qty */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")} className="leading-tight">
                          {Number(it?.quantity ?? 0) || "—"}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Original Price */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => {
                        const base = getBaseUnit(it);
                        const compareAt = getCompareAtUnit(it);
                        const original = compareAt > base ? compareAt : base;
                        return (
                          <div key={String(it?.id || "")} className="leading-tight">
                            {fmt(Number(original ?? 0))}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Promotion */}
                  <td className={`p-2 ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")} className="leading-tight">
                          {getPromotionLabel(g, it)}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Discounted Price */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")} className="leading-tight">
                          {getPriceAfterDiscount(g, it, freeQtyByItemId)}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Subtotal */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")} className="leading-tight font-medium">
                          {isGiftItem(it) ? (
                            <span className="text-green-700 dark:text-green-300">FREE</span>
                          ) : (
                            fmt(Number(it?.totalPrice ?? 0))
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}