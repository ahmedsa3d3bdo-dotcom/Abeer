"use client";

import { LocalDate } from "@/components/common/local-datetime";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

import { OrderItemsTable } from "./order-items-table";

export function InvoiceContent(props: { d: any; siteName: string; seller: any }) {
  const { d, siteName, seller } = props;
  const currency = d?.order?.currency || "CAD";
  const locale = "en-CA";
  const totals = {
    subtotal: Number(d?.order?.subtotal ?? 0),
    shipping: Number(d?.order?.shippingAmount ?? 0),
    tax: Number(d?.order?.taxAmount ?? 0),
    total: Number(d?.order?.totalAmount ?? 0),
  };

  const allDiscountLines: any[] = Array.isArray(d?.orderDiscounts)
    ? d.orderDiscounts
    : Number(d?.order?.discountAmount || 0) > 0
      ? [{ id: "order-discount", code: d?.order?.appliedDiscountCode || null, amount: d?.order?.discountAmount }]
      : [];

  const offerPromotionNames = allDiscountLines
    .filter((od) => Number(od?.amount ?? 0) === 0)
    .filter((od) => {
      if (String(od?.discountType || "") === "free_shipping") return false;
      const md: any = (od as any)?.discountMetadata || null;
      return md?.kind === "offer" && md?.offerKind === "standard";
    })
    .map((od) => od?.discountName || od?.code || "")
    .filter(Boolean)
    .join(" • ");

  const dealPromotionNames = allDiscountLines
    .filter((od) => Number(od?.amount ?? 0) === 0)
    .filter((od) => {
      const md: any = (od as any)?.discountMetadata || null;
      return md?.kind === "deal" && (md?.offerKind === "bxgy_generic" || md?.offerKind === "bxgy_bundle");
    })
    .map((od) => od?.discountName || od?.code || "")
    .filter(Boolean)
    .join(" • ");

  const promotionNames = [offerPromotionNames, dealPromotionNames].filter(Boolean).join(" • ");

  const discountLines = allDiscountLines.filter((od) => Number(od?.amount ?? 0) > 0);

  const giftValue = (d?.items || []).reduce((sum: number, it: any) => {
    const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
    if (!isGift) return sum;
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    const ref = parseFloat(String(it.variantPrice ?? it.productPrice ?? 0));
    if (!Number.isFinite(ref) || ref <= 0) return sum;
    return sum + ref * qty;
  }, 0);

  const offerSavings = (d?.items || []).reduce((sum: number, it: any) => {
    if (!offerPromotionNames) return sum;
    const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
    if (isGift) return sum;
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    const base = parseFloat(String(it.variantPrice ?? it.productPrice ?? 0));
    const unit = Number(it.unitPrice ?? 0);
    if (!Number.isFinite(base) || base <= 0) return sum;
    if (!Number.isFinite(unit) || unit <= 0) return sum;
    if (unit >= base) return sum;
    return sum + (base - unit) * qty;
  }, 0);

  const saleSavings = (d?.items || []).reduce((sum: number, it: any) => {
    const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
    if (isGift) return sum;
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    const base = parseFloat(String(it.variantPrice ?? it.productPrice ?? 0));
    if (!Number.isFinite(base) || base <= 0) return sum;
    const compareAt = Number(it.variantCompareAtPrice ?? it.productCompareAtPrice ?? 0);
    if (!Number.isFinite(compareAt) || compareAt <= base) return sum;
    return sum + (compareAt - base) * qty;
  }, 0);

  const promotionSavings = Number(giftValue || 0) + Number(offerSavings || 0);

  const couponLines = discountLines.filter((od) => Boolean(od?.code));
  const otherDiscountLines = discountLines.filter((od) => !od?.code);

  const couponDiscount = couponLines.reduce((sum: number, od: any) => sum + Number(od?.amount ?? 0), 0);
  const discountsExcludingCoupon =
    (Number.isFinite(promotionSavings) ? promotionSavings : 0) +
    (Number.isFinite(saleSavings) ? saleSavings : 0) +
    otherDiscountLines.reduce((sum: number, od: any) => sum + Number(od?.amount ?? 0), 0);

  const totalBeforeDiscounts = Number(totals.total ?? 0) + Number(discountsExcludingCoupon || 0) + Number(couponDiscount || 0);

  const billedTo = d?.shippingAddress
    ? {
        name: `${d.shippingAddress.firstName ?? ""} ${d.shippingAddress.lastName ?? ""}`.trim(),
        addressLine1: d.shippingAddress.addressLine1,
        addressLine2: d.shippingAddress.addressLine2,
        city: d.shippingAddress.city,
        state: d.shippingAddress.state,
        postalCode: d.shippingAddress.postalCode,
        country: d.shippingAddress.country,
        phone: d.shippingAddress.phone,
      }
    : null;

  return (
    <div className="invoice-print-root mx-auto max-w-4xl p-6 print:p-0">
      <div className="rounded-lg border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/Storefront/images/Complete-Logo.png"
              alt={siteName}
              className="h-24 w-auto"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Invoice</h1>
            <p className="text-sm text-muted-foreground">
              <LocalDate value={d?.order?.createdAt} />
            </p>
            <p className="text-sm">{d?.order?.orderNumber}</p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">Billed To</h3>
            <div className="text-sm leading-6">
              {billedTo ? (
                <>
                  <div>{billedTo.name || "—"}</div>
                  <div>{billedTo.addressLine1}</div>
                  {billedTo.addressLine2 && <div>{billedTo.addressLine2}</div>}
                  <div>
                    {billedTo.city}, {billedTo.state} {billedTo.postalCode}
                  </div>
                  <div>{billedTo.country}</div>
                  {billedTo.phone ? <div className="mt-1">{billedTo.phone}</div> : null}
                </>
              ) : (
                <div className="text-muted-foreground">No address on file</div>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Seller</h3>
            <div className="text-sm leading-6">
              <div>{seller.name || siteName}</div>
              <div>{seller.cityLine}</div>
              <div>{seller.country}</div>
              <div className="mt-1">{seller.email}</div>
              {seller.phone ? <div>{seller.phone}</div> : null}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <OrderItemsTable d={d} currency={currency} locale={locale} promotionNames={promotionNames} mode="invoice" />

        <div className="mt-6 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-full max-w-sm justify-between">
            <span className="text-muted-foreground">Total before discounts</span>
            <span>{formatCurrency(totalBeforeDiscounts, { currency, locale })}</span>
          </div>
          <div className="flex w-full max-w-sm justify-between">
            <span className="text-muted-foreground">Discounts</span>
            <span>-{formatCurrency(discountsExcludingCoupon, { currency, locale })}</span>
          </div>
          {couponLines.map((od) => (
            <div key={String(od.id)} className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Coupon {od?.code ? `(${String(od.code)})` : ""}</span>
              <span>-{formatCurrency(Number(od?.amount ?? 0), { currency, locale })}</span>
            </div>
          ))}
          <div className="flex w-full max-w-sm justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatCurrency(totals.shipping, { currency, locale })}</span>
          </div>
          <div className="flex w-full max-w-sm justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(totals.tax, { currency, locale })}</span>
          </div>
          <Separator className="my-2 w-full max-w-sm" />
          <div className="flex w-full max-w-sm justify-between text-base font-semibold">
            <span>Total after discounts</span>
            <span>{formatCurrency(totals.total, { currency, locale })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
