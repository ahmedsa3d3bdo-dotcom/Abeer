"use client";

import { useMemo } from "react";
import { Package, CreditCard, User, DollarSign, MapPin, Truck, Calendar, Tag } from "lucide-react";
import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computeOrderTotals, normalizeOrderData } from "@/lib/pricing";
import { PriceSummary } from "@/components/shared/pricing";

export function DrawerContent({ d }: { d: any }) {
  const currency = d?.order?.currency || "CAD";
  const locale = "en-CA";

  // Use unified pricing logic
  const pricingTotals = useMemo(() => {
    const orderData = {
      items: d?.items || [],
      appliedDiscounts: d?.orderDiscounts || [],
      subtotal: d?.order?.subtotal,
      discountAmount: d?.order?.discountAmount,
      shippingAmount: d?.order?.shippingAmount,
      taxAmount: d?.order?.taxAmount,
      totalAmount: d?.order?.totalAmount,
      appliedDiscountCode: d?.order?.appliedDiscountCode,
    };
    const normalized = normalizeOrderData(orderData);
    return computeOrderTotals(normalized);
  }, [d]);

  const customerName = (() => {
    const fn = (d.order as any)?.customerFirstName || (d.shippingAddress?.firstName ?? "");
    const ln = (d.order as any)?.customerLastName || (d.shippingAddress?.lastName ?? "");
    const full = `${fn} ${ln}`.trim();
    const email = d.order?.customerEmail || d.shippingAddress?.email;
    const phone = d.order?.customerPhone || d.shippingAddress?.phone;
    if (full) return full;
    if (email) return email;
    if (phone) return phone;
    return "—";
  })();

  const fmt = (value: number) => formatCurrency(value, { currency, locale }).replace(/^[A-Z]{2,3}\$?/, '$');

  return (
    <>
      {/* Header Card with Gradient */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-background p-5 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold">Order #{d.order?.orderNumber}</h3>
              <div className="mt-1 text-xs text-muted-foreground">
                <LocalDateTime value={d.order?.createdAt} />
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <StatusBadge type="order" status={String(d.order?.status || "")} />
              <StatusBadge type="payment" status={String(d.order?.paymentStatus || "")} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-4 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Customer</div>
          </div>
          <div className="text-sm font-bold text-blue-700 dark:text-blue-400 truncate">
            {customerName}
          </div>
          {(d.order?.customerEmail || d.shippingAddress?.email) && (
            <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 truncate">
              {d.order?.customerEmail || d.shippingAddress?.email}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total</div>
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {fmt(Number(d.order?.totalAmount || 0))}
          </div>
          {pricingTotals.totalDiscounts > 0 && (
            <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
              Saved {fmt(pricingTotals.totalDiscounts)}
            </div>
          )}
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="rounded-xl border p-4 bg-muted/50 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Order Summary</div>
        </div>
        <div className="space-y-1 text-sm">
          <PriceSummary
            totals={pricingTotals}
            currency={currency}
            locale={locale}
            showDetails={true}
            showBeforeDiscounts={true}
            showTotalDiscounts={true}
            size="sm"
          />
        </div>
      </div>

      {/* Items Section - Compact List */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div className="text-sm font-semibold">Order Items</div>
          <div className="text-xs text-muted-foreground mt-0.5">{(d?.items || []).length} product(s)</div>
        </div>
        <div className="divide-y max-h-80 overflow-y-auto scrollbar-hide">
          {(d?.items || []).map((item: any) => (
            <div key={String(item?.id || "")} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-tight">{item.productName}</div>
                  {item.variantName && (
                    <div className="text-xs text-muted-foreground mt-0.5">{item.variantName}</div>
                  )}
                  {item.sku && (
                    <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Qty: {Number(item?.quantity ?? 0)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium">{fmt(Number(item?.unitPrice ?? 0))} each</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold">{fmt(Number(item?.totalPrice ?? 0))}</div>
                  {Number(item?.compareAtPrice || 0) > Number(item?.unitPrice || 0) && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {Math.round((1 - Number(item?.unitPrice || 0) / Number(item?.compareAtPrice || 1)) * 100)}% off
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses Section */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-4 bg-muted/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">Shipping Address</div>
          </div>
          {d.shippingAddress ? (
            <div className="text-xs leading-relaxed space-y-0.5">
              <div className="font-semibold text-sm">{`${d.shippingAddress.firstName} ${d.shippingAddress.lastName}`.trim()}</div>
              <div>{d.shippingAddress.addressLine1}</div>
              {d.shippingAddress.addressLine2 && <div>{d.shippingAddress.addressLine2}</div>}
              <div>
                {d.shippingAddress.city}, {d.shippingAddress.state} {d.shippingAddress.postalCode}
              </div>
              <div>{d.shippingAddress.country}</div>
              {d.shippingAddress.phone && <div className="text-muted-foreground pt-1">{d.shippingAddress.phone}</div>}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No address on file</div>
          )}
        </div>

        <div className="rounded-xl border p-4 bg-muted/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">Billing Address</div>
          </div>
          {d.billingAddress ? (
            <div className="text-xs leading-relaxed space-y-0.5">
              <div className="font-semibold text-sm">{`${d.billingAddress.firstName} ${d.billingAddress.lastName}`.trim()}</div>
              <div>{d.billingAddress.addressLine1}</div>
              {d.billingAddress.addressLine2 && <div>{d.billingAddress.addressLine2}</div>}
              <div>
                {d.billingAddress.city}, {d.billingAddress.state} {d.billingAddress.postalCode}
              </div>
              <div>{d.billingAddress.country}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Same as shipping</div>
          )}
        </div>
      </div>

      {/* Shipments Section */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">Shipments</div>
          </div>
        </div>

        {(d.shipments || []).length > 0 ? (
          <div className="divide-y">
            {(d.shipments || []).map((s: any) => (
              <div key={s.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{s.methodName || "—"}</div>
                    {s.trackingNumber && (
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">{s.trackingNumber}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize text-xs flex-shrink-0">
                    {s.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Shipped:</span>{" "}
                    {s.shippedAt ? <LocalDateTime value={s.shippedAt} /> : "—"}
                  </div>
                  <div>
                    <span className="font-medium">ETA:</span>{" "}
                    {s.estimatedDeliveryAt ? <LocalDate value={s.estimatedDeliveryAt} /> : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">📦</div>
            <div className="text-sm font-semibold">No shipments yet</div>
            <div className="text-xs text-muted-foreground mt-1">
              Shipment info will appear once shipped
            </div>
          </div>
        )}
      </div>
    </>
  );
}
