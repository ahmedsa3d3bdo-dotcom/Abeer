"use client";

import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

import { OrderItemsTable } from "./order-items-table";

export function DrawerContent({ d }: { d: any }) {
  const currency = d?.order?.currency || "CAD";
  const locale = "en-CA";

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

  const totalAfterDiscounts = Number(d.order?.totalAmount ?? 0);
  const totalBeforeDiscounts = totalAfterDiscounts + Number(discountsExcludingCoupon || 0) + Number(couponDiscount || 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-1">
            <StatusBadge type="order" status={String(d.order?.status || "")} />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Payment</div>
          <div className="mt-1">
            <StatusBadge type="payment" status={String(d.order?.paymentStatus || "")} />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Customer</div>
          <div className="font-medium">
            {(() => {
              const fn = (d.order as any)?.customerFirstName || (d.shippingAddress?.firstName ?? "");
              const ln = (d.order as any)?.customerLastName || (d.shippingAddress?.lastName ?? "");
              const full = `${fn} ${ln}`.trim();
              const email = d.order?.customerEmail || d.shippingAddress?.email;
              const phone = d.order?.customerPhone || d.shippingAddress?.phone;
              if (full) return full;
              if (email) return email;
              if (phone) return phone;
              return "—";
            })()}
          </div>
          {(d.order?.customerEmail || d.shippingAddress?.email) && (
            <div className="text-xs text-muted-foreground mt-0.5">{d.order?.customerEmail || d.shippingAddress?.email}</div>
          )}
          {(d.order?.customerPhone || d.shippingAddress?.phone) && (
            <div className="text-xs text-muted-foreground">{d.order?.customerPhone || d.shippingAddress?.phone}</div>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Before discounts</div>
            <div className="text-sm font-medium">{formatCurrency(totalBeforeDiscounts, { currency, locale })}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Discounts</div>
            <div className="text-sm font-medium">-{formatCurrency(discountsExcludingCoupon, { currency, locale })}</div>
          </div>
          {couponLines.map((od) => (
            <div key={String(od.id)} className="mt-1 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Coupon {od?.code ? `(${String(od.code)})` : ""}</div>
              <div className="text-sm font-medium">-{formatCurrency(Number(od?.amount ?? 0), { currency, locale })}</div>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">After discounts</div>
            <div className="text-sm font-semibold">{formatCurrency(totalAfterDiscounts, { currency, locale })}</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-medium">Items</div>
        <OrderItemsTable d={d} currency={currency} locale={locale} promotionNames={promotionNames} />
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-medium">Shipping Address</div>
        <div className="rounded-lg border p-4 text-sm">
          {d.shippingAddress ? (
            <div className="space-y-0.5">
              <div className="font-medium">{`${d.shippingAddress.firstName} ${d.shippingAddress.lastName}`.trim()}</div>
              <div>{d.shippingAddress.addressLine1}</div>
              {d.shippingAddress.addressLine2 && <div>{d.shippingAddress.addressLine2}</div>}
              <div>
                {d.shippingAddress.city}, {d.shippingAddress.state} {d.shippingAddress.postalCode}
              </div>
              <div>{d.shippingAddress.country}</div>
              {d.shippingAddress.phone && <div className="text-xs text-muted-foreground">Phone: {d.shippingAddress.phone}</div>}
              {d.shippingAddress.email && <div className="text-xs text-muted-foreground">Email: {d.shippingAddress.email}</div>}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No address on file</div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-medium">Shipments</div>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-5 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div>Method</div>
            <div>Tracking</div>
            <div>Status</div>
            <div className="text-right">Shipped</div>
            <div className="text-right">ETA</div>
          </div>
          {(d.shipments || []).map((s: any) => (
            <div key={s.id} className="grid grid-cols-5 gap-2 border-b last:border-b-0 p-2 text-sm">
              <div>{s.methodName || "—"}</div>
              <div>{s.trackingNumber || "—"}</div>
              <div className="capitalize">{s.status}</div>
              <div className="text-right">{s.shippedAt ? <LocalDateTime value={s.shippedAt} /> : "—"}</div>
              <div className="text-right">{s.estimatedDeliveryAt ? <LocalDate value={s.estimatedDeliveryAt} /> : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
