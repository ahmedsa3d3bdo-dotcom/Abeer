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

  const wrapClassName = mode === "drawer" ? "overflow-x-auto" : "";
  const tableClassName = mode === "drawer" ? "min-w-[980px] w-full" : "w-full";
  const textClassName = mode === "invoice" ? "text-xs" : "text-sm";

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
              <th className="p-2 text-right font-medium">Price (original)</th>
              <th className="p-2 text-left font-medium">Promotion</th>
              <th className="p-2 text-right font-medium">Price (after discount)</th>
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
                          {it.sku ? (
                            <div className="text-[11px] text-muted-foreground">SKU: {it.sku}</div>
                          ) : null}
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

                  {/* Price original */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => {
                        const base = getBaseUnit(it);
                        const compareAt = getCompareAtUnit(it);
                        const original = compareAt > base ? compareAt : base;
                        return (
                          <div key={String(it?.id || "")} className="leading-tight">
                            {formatCurrency(Number(original ?? 0), { currency, locale })}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Promotion */}
                  <td className={`p-2 ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => {
                        if (g.kind === "bxgy_bundle" || g.kind === "bxgy_generic") {
                          return (
                            <div key={String(it?.id || "")} className="leading-tight">
                              {(g as any).label || "BXGY"}
                            </div>
                          );
                        }

                        if (isGiftItem(it)) {
                          return (
                            <div key={String(it?.id || "")} className="leading-tight">
                              Gift
                            </div>
                          );
                        }

                        const base = getBaseUnit(it);
                        const compareAt = getCompareAtUnit(it);
                        if (compareAt > base && base > 0) {
                          const pct = getCompareAtPercentOff(it);
                          return (
                            <div key={String(it?.id || "")} className="leading-tight">
                              {pct > 0 ? `Fixed ${pct}%` : "Fixed"}
                            </div>
                          );
                        }

                        const unit = Number(it?.unitPrice ?? 0);
                        const hasOffer = base > 0 && unit > 0 && unit < base;

                        return (
                          <div key={String(it?.id || "")} className="leading-tight">
                            {hasOffer ? promotionNames || "Promotion" : "—"}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Price after discount */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => {
                        if (isGiftItem(it)) {
                          return (
                            <div key={String(it?.id || "")} className="leading-tight">
                              FREE
                            </div>
                          );
                        }

                        if (g.kind === "bxgy_bundle") {
                          const pid = String(it?.productId || "");
                          if (pid && bundleGetIds.includes(pid)) {
                            return (
                              <div key={String(it?.id || "")} className="leading-tight">
                                Get products show free
                              </div>
                            );
                          }
                        }

                        if (g.kind === "bxgy_generic") {
                          const id = String(it?.id || "");
                          const freeQty = freeQtyByItemId.get(id) || 0;
                          if (freeQty > 0) {
                            return (
                              <div key={String(it?.id || "")} className="leading-tight">
                                Lowest price of the Get products free
                              </div>
                            );
                          }
                        }

                        return (
                          <div key={String(it?.id || "")} className="leading-tight">
                            {formatCurrency(Number(it?.unitPrice ?? 0), { currency, locale })}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Subtotal */}
                  <td className={`p-2 text-right ${textClassName}`}>
                    <div className="space-y-2">
                      {g.items.map((it) => (
                        <div key={String(it?.id || "")} className="leading-tight">
                          {isGiftItem(it)
                            ? "FREE"
                            : formatCurrency(Number(it?.totalPrice ?? 0), { currency, locale })}
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