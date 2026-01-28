"use client";

import { formatCurrency } from "@/lib/utils";

import { buildBxgyGroups, getBaseUnit, getCompareAtPercentOff, getCompareAtUnit, isGiftItem } from "./order-pricing";

export function OrderItemsTable(props: {
  d: any;
  currency: string;
  locale: string;
  promotionNames: string;
  mode?: "drawer" | "invoice";
}) {
  const { d, currency, locale, promotionNames, mode = "drawer" } = props;
  const items: any[] = buildBxgyGroups(d).flatMap((g) => g.items);

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
            {items.map((it) => {
              const isGift = isGiftItem(it);
              const qty = Number(it?.quantity ?? 0);
              const base = getBaseUnit(it);
              const compareAt = getCompareAtUnit(it);
              const original = compareAt > base ? compareAt : base;

              const hasCompareAt = compareAt > base && base > 0;
              const pct = hasCompareAt ? getCompareAtPercentOff(it) : 0;
              const unit = Number(it?.unitPrice ?? 0);
              const hasOffer = !isGift && base > 0 && unit > 0 && unit < base;

              return (
                <tr key={String(it?.id || "")} className="border-b last:border-b-0 align-top">
                  <td className={`p-2 ${textClassName}`}>
                    <div className="font-medium leading-tight">{it.productName}</div>
                    {it.sku ? <div className="text-[11px] text-muted-foreground">SKU: {it.sku}</div> : null}
                  </td>
                  <td className={`p-2 text-right ${textClassName}`}>{qty || "—"}</td>
                  <td className={`p-2 text-right ${textClassName}`}>{formatCurrency(Number(original ?? 0), { currency, locale })}</td>
                  <td className={`p-2 ${textClassName}`}>
                    {isGift ? "Gift" : hasCompareAt ? (pct > 0 ? `Fixed ${pct}%` : "Fixed") : hasOffer ? promotionNames || "Promotion" : "—"}
                  </td>
                  <td className={`p-2 text-right ${textClassName}`}>{isGift ? "FREE" : formatCurrency(Number(it?.unitPrice ?? 0), { currency, locale })}</td>
                  <td className={`p-2 text-right ${textClassName}`}>{isGift ? "FREE" : formatCurrency(Number(it?.totalPrice ?? 0), { currency, locale })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
