"use client";

import { useMemo } from "react";
import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { computeOrderTotals, normalizeOrderData } from "@/lib/pricing";
import { PriceSummary } from "@/components/shared/pricing";

import { OrderItemsTable } from "./order-items-table";

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

  // Extract promotion names for the items table
  const promotionNames = pricingTotals.promotionNames.join(" • ");

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
          <div className="text-xs text-muted-foreground">Order Summary</div>
          <div className="mt-2 space-y-1 text-sm">
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
          {(!d.shipments || d.shipments.length === 0) && (
            <div className="p-3 text-sm text-muted-foreground">No shipments yet</div>
          )}
        </div>
      </div>
    </>
  );
}
