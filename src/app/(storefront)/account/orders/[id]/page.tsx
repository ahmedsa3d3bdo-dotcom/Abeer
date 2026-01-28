"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Package, MapPin, CreditCard, Truck, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { LocalDate } from "@/components/common/local-datetime";
import { usePrint } from "@/components/common/print/print-provider";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { computeOrderTotals, normalizeOrderData, getDiscountLabel } from "@/lib/pricing";
import { PriceSummary, InvoicePriceSummary, PromotionBadge } from "@/components/shared/pricing";
import { formatCurrency } from "@/lib/utils";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(true);
  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  useEffect(() => {
    let mounted = true;
    params.then(async (p) => {
      if (!mounted) return;
      setOrderId(p.id);
      try {
        setLoading(true);
        const res = await fetch(`/api/storefront/orders/${encodeURIComponent(p.id)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to load order");
        if (mounted) setOrder(data.data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load order");
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  // Compute pricing totals using unified logic
  const pricingTotals = useMemo(() => {
    if (!order) return null;
    const normalized = normalizeOrderData(order);
    return computeOrderTotals(normalized);
  }, [order]);

  const getSeller = (settings: Record<string, string> | null) => {
    const get = (key: string) => String(settings?.[key] ?? "").trim();

    const name = get("seller.name") || get("seller_name") || get("site_name") || siteConfig.name || "";
    const email = get("seller.email") || get("seller_email") || get("email") || "support@example.com";
    const phone = get("seller.phone") || get("seller_phone") || get("phone") || "";

    const addressLine1 =
      get("seller.address_line1") ||
      get("seller.addressLine1") ||
      get("contact.address") ||
      get("contact.address_line1") ||
      get("address") ||
      get("address_line1") ||
      "";

    const city = get("seller.city") || get("city") || "";
    const province = get("seller.province") || get("seller.state") || get("province") || get("state") || "";
    const postalCode = get("seller.postal_code") || get("seller.postalCode") || get("postal_code") || get("postalCode") || "";
    const country = get("seller.country") || get("app.country") || get("country") || "";

    const cityLine = `${[city, province].filter(Boolean).join(", ")}${postalCode ? ` ${postalCode}` : ""}`.trim();

    return { name, email, phone, addressLine1, cityLine, country };
  };

  function InvoiceDocument({ order, settings, totals }: { order: any; settings: Record<string, string> | null; totals: ReturnType<typeof computeOrderTotals> | null }) {
    const siteName = settings?.site_name || siteConfig.name || "";
    const seller = getSeller(settings);
    const items = Array.isArray(order?.items) ? order.items : [];

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
                <LocalDate value={order?.date} />
              </p>
              <p className="text-sm">{order?.orderNumber}</p>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-border" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Billed To</h3>
              <div className="text-sm leading-6">
                {order?.shippingAddress ? (
                  <>
                    <div>{order.shippingAddress.name || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim()}</div>
                    <div>{order.shippingAddress.addressLine1}</div>
                    {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </div>
                    <div>{order.shippingAddress.country}</div>
                    <div className="mt-1">{order.shippingAddress.phone}</div>
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
                {seller.addressLine1 ? <div>{seller.addressLine1}</div> : null}
                {seller.cityLine ? <div>{seller.cityLine}</div> : null}
                {seller.country ? <div>{seller.country}</div> : null}
                <div className="mt-1">{seller.email}</div>
                {seller.phone ? <div>{seller.phone}</div> : null}
              </div>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-border" />

          {/* Items table */}
          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            {items.map((it: any) => {
              const isGift = Number(it.price ?? 0) === 0 && Number(it.total ?? 0) === 0;
              const qty = Number(it.quantity ?? 0);
              const unit = Number(it.price ?? 0);
              const total = Number(it.total ?? 0);
              const compareAt = Number(it.compareAtPrice ?? 0);
              const hasCompareAt = compareAt > 0 && compareAt > unit;

              return (
                <div key={it.id} className="grid grid-cols-12 gap-2 p-2 text-sm border-b last:border-b-0">
                  <div className="col-span-5">
                    <div className="font-medium">{it.name}</div>
                    {isGift && <div className="text-xs font-medium text-green-700 dark:text-green-300">Free gift</div>}
                    {it.promotionName && !isGift && (
                      <div className="text-xs font-medium text-green-700 dark:text-green-300">{it.promotionName}</div>
                    )}
                    {it.variant && <div className="text-xs text-muted-foreground">{it.variant}</div>}
                    {it.sku && <div className="text-xs text-muted-foreground">SKU: {it.sku}</div>}
                  </div>
                  <div className="col-span-2 text-center">{qty}</div>
                  <div className="col-span-2 text-right">
                    {isGift ? (
                      "FREE"
                    ) : (
                      <div className="flex flex-col items-end leading-tight">
                        {hasCompareAt && <span className="text-xs text-muted-foreground line-through">${compareAt.toFixed(2)}</span>}
                        <span>${unit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    {isGift ? (
                      "FREE"
                    ) : (
                      <div className="flex flex-col items-end leading-tight">
                        {hasCompareAt && <span className="text-xs text-muted-foreground line-through">${(compareAt * qty).toFixed(2)}</span>}
                        <span>${total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals using unified component */}
          {totals && (
            <div className="mt-6">
              <InvoicePriceSummary totals={totals} />
            </div>
          )}

          <div className="mt-8 text-xs text-muted-foreground">
            <p>Thank you for your purchase.</p>
            <p className="mt-1">If you have any questions about this invoice, please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePrintInvoice = async () => {
    if (!order?.id) return;
    if (order?.paymentStatus !== "paid") {
      toast.error("Invoice unavailable", { description: "The invoice will be available once the order is paid." });
      return;
    }

    try {
      setPrintPreparing(true);
      const res = await fetch("/api/storefront/settings/public", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const items = json?.data?.items;
      const settingsMap: Record<string, string> = {};
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it?.key && typeof it?.value === "string") settingsMap[String(it.key)] = it.value;
        }
      }

      await print(<InvoiceDocument order={order} settings={settingsMap} totals={pricingTotals} />);
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare invoice");
    } finally {
      setPrintPreparing(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading order...</div>;
  }
  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }
  if (!order) {
    return <div className="text-sm text-muted-foreground">Order not found</div>;
  }

  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/account/orders">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </Link>

      {/* Order Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
          <p className="text-muted-foreground">
            Placed on <LocalDate value={order.date} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge type="order" status={order.status} />
          {order.paymentStatus === "paid" && (
            <Button
              variant="outline"
              onClick={() => void handlePrintInvoice()}
              disabled={printPreparing || isPrinting}
              className="hidden lg:inline-flex"
            >
              <Download className="mr-2 h-4 w-4" />
              Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Savings callout */}
      {pricingTotals && pricingTotals.totalDiscounts > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Tag className="h-4 w-4" />
            <span className="font-medium">
              You saved {formatCurrency(pricingTotals.totalDiscounts, { currency: "CAD", locale: "en-CA" })} on this order!
            </span>
          </div>
        </div>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItemsExpanded((v) => !v)}
              className="px-2"
            >
              {itemsExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" /> Hide items ({items.length})
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" /> Show items ({items.length})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemsExpanded && (
            <>
              <div className="space-y-4 mb-6">
                {items.map((item: any) => {
                  const isGift = Number(item.price ?? 0) === 0 && Number(item.total ?? 0) === 0;
                  const unit = Number(item.price ?? 0);
                  const qty = Number(item.quantity ?? 0);
                  const total = Number(item.total ?? 0);
                  const compareAt = Number(item.compareAtPrice ?? 0);
                  const ref = Number(item.referencePrice ?? unit);
                  const hasCompareAt = compareAt > 0 && compareAt > unit;
                  const hasPromo = ref > unit && unit > 0;

                  return (
                    <div key={item.id} className="flex gap-4">
                      <Link href={item.productSlug ? `/product/${item.productSlug}` : item.productId ? `/product/${item.productId}` : "#"} className="relative h-20 w-20 rounded bg-muted flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder-product.jpg"}
                          alt={item.name}
                          fill
                          className="object-cover rounded"
                          sizes="80px"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={item.productSlug ? `/product/${item.productSlug}` : item.productId ? `/product/${item.productId}` : "#"} className="font-semibold hover:underline">
                          {item.name}
                        </Link>
                        {isGift && (
                          <PromotionBadge type="gift" size="sm" className="mt-1" />
                        )}
                        {item.promotionName && !isGift && (
                          <PromotionBadge type="promotion" label={item.promotionName} size="sm" className="mt-1" />
                        )}
                        <p className="text-sm text-muted-foreground">
                          {item.variant || ""}
                        </p>
                        {item.sku && (
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        )}
                        <p className="text-sm mt-1">
                          Qty: {qty} ×{" "}
                          {isGift ? (
                            <span className="text-green-600 dark:text-green-400">FREE</span>
                          ) : (
                            <span className="inline-flex flex-col items-start leading-tight">
                              {hasCompareAt && (
                                <span className="text-xs text-muted-foreground line-through">${compareAt.toFixed(2)}</span>
                              )}
                              <span>${unit.toFixed(2)}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        {isGift ? (
                          <>
                            {ref > 0 && (
                              <p className="text-xs text-muted-foreground line-through">${(ref * qty).toFixed(2)}</p>
                            )}
                            <p className="font-semibold text-green-600 dark:text-green-400">FREE</p>
                          </>
                        ) : (
                          <div className="flex flex-col items-end leading-tight">
                            {hasCompareAt && (
                              <span className="text-xs text-muted-foreground line-through">${(compareAt * qty).toFixed(2)}</span>
                            )}
                            {hasPromo && !hasCompareAt && (
                              <span className="text-xs text-muted-foreground line-through">${(ref * qty).toFixed(2)}</span>
                            )}
                            <p className="font-semibold">${total.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Summary using unified component */}
              {pricingTotals && (
                <div className="border-t pt-4">
                  <PriceSummary
                    totals={pricingTotals}
                    showDetails={true}
                    showBeforeDiscounts={true}
                    showTotalDiscounts={true}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {order.shippingAddress ? (
              <>
                <p className="font-medium">{order.shippingAddress.name || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim()}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && (
                  <p>{order.shippingAddress.addressLine2}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p className="pt-2">{order.shippingAddress.phone}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No shipping address on file</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="capitalize">
              {order.paymentMethod === "cash_on_delivery" || order.paymentMethod === "cod"
                ? "Cash on Delivery"
                : order.paymentMethod === "credit_card" || order.paymentMethod === "card"
                  ? "Credit/Debit Card"
                  : order.paymentMethod || "Payment"}
            </p>
            <StatusBadge type="payment" status={order.paymentStatus} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Shipping & Tracking */}
      {(Boolean(order?.selectedShippingMethod) || (Array.isArray(order.shipments) && order.shipments.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping & Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(order.shipments) && order.shipments.length > 0 ? (
              <div className="space-y-4">
                {order.shipments.map((s: any) => (
                  <div key={s.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{s.methodName || "Shipping"}</p>
                      <StatusBadge type="shipment" status={s.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.carrier || "—"} {s.trackingNumber ? `• ${s.trackingNumber}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{order?.selectedShippingMethod?.name || "Shipping"}</p>
                  <StatusBadge type="shipment" status="preparing" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {order?.selectedShippingMethod?.carrier || "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Tracking information will appear once your order ships.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
