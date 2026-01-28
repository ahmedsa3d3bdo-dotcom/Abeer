"use client";

import { useMemo } from "react";
import { LocalDate } from "@/components/common/local-datetime";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { computeOrderTotals, normalizeOrderData } from "@/lib/pricing";
import { InvoicePriceSummary } from "@/components/shared/pricing";

import { OrderItemsTable } from "./order-items-table";

export function InvoiceContent(props: { d: any; siteName: string; seller: any }) {
  const { d, siteName, seller } = props;
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

        {/* Use unified InvoicePriceSummary component */}
        <div className="mt-6">
          <InvoicePriceSummary totals={pricingTotals} currency={currency} locale={locale} />
        </div>
      </div>
    </div>
  );
}
