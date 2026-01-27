"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Package, MapPin, CreditCard, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { LocalDate } from "@/components/common/local-datetime";
import { usePrint } from "@/components/common/print/print-provider";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);
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

  function InvoiceDocument({ order, settings }: { order: any; settings: Record<string, string> | null }) {
    const siteName = settings?.site_name || siteConfig.name || "";
    const seller = getSeller(settings);
    const totals = {
      subtotal: Number(order?.subtotal || 0),
      shipping: Number(order?.shipping || 0),
      tax: Number(order?.tax || 0),
      discount: Number(order?.discount || 0),
      total: Number(order?.total || 0),
    };

    const discountLines: any[] = Array.isArray(order?.discounts)
      ? order.discounts
      : totals.discount > 0
        ? [{ id: "order-discount", code: null, amount: totals.discount }]
        : [];

    const promotionNames = discountLines
      .filter((d: any) => Number(d?.amount ?? 0) === 0)
      .filter((d: any) => {
        if (String(d?.type || "") === "free_shipping") return false;
        const md: any = d?.metadata || null;
        return (md?.kind === "offer" && md?.offerKind === "standard") || (md?.kind === "deal" && (md?.offerKind === "bxgy_generic" || md?.offerKind === "bxgy_bundle"));
      })
      .map((d: any) => d?.name || d?.discountName || d?.code || "")
      .filter(Boolean)
      .join(" • ");

    const monetaryDiscountLines = discountLines.filter((d: any) => Number(d?.amount ?? 0) > 0);

    const promotionSavings = (() => {
      if (!Array.isArray(order?.items)) return 0;
      let sum = 0;
      for (const it of order.items as any[]) {
        const qty = Number(it?.quantity || 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        const unit = Number(it?.price ?? 0);
        const total = Number(it?.total ?? 0);
        const isGift = unit === 0 && total === 0;
        const base = Number(it?.referencePrice ?? 0);
        if (!Number.isFinite(base) || base <= 0) continue;

        if (isGift) {
          sum += base * qty;
          continue;
        }
        if (promotionNames && Number.isFinite(unit) && unit > 0 && unit < base) {
          sum += (base - unit) * qty;
        }
      }
      return Math.max(0, Number(sum.toFixed(2)));
    })();

    const displaySubtotal = totals.subtotal + (Number.isFinite(promotionSavings) ? promotionSavings : 0);

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
                    <div>{order.shippingAddress.name}</div>
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

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-7">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {Array.isArray(order?.items) &&
              order.items.map((it: any) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 p-2 text-sm">
                  <div className="col-span-7">
                    <div className="font-medium">{it.name}</div>
                    {it.variant && <div className="text-xs text-muted-foreground">{it.variant}</div>}
                    {it.sku && <div className="text-xs text-muted-foreground">SKU: {it.sku}</div>}
                  </div>
                  <div className="col-span-2 text-right">{it.quantity}</div>
                  <div className="col-span-1 text-right">${Number(it.price).toFixed(2)}</div>
                  <div className="col-span-2 text-right">${Number(it.total).toFixed(2)}</div>
                </div>
              ))}
          </div>

          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${displaySubtotal.toFixed(2)}</span>
            </div>
            {promotionSavings > 0 ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Promotion{promotionNames ? ` (${promotionNames})` : ""}</span>
                <span>-${promotionSavings.toFixed(2)}</span>
              </div>
            ) : promotionNames ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Promotion ({promotionNames})</span>
                <span>—</span>
              </div>
            ) : null}
            {monetaryDiscountLines.map((d: any) => (
              <div key={String(d.id)} className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">
                  Discount
                  {d?.code ? ` (${String(d.code)})` : d?.name ? ` (${String(d.name)})` : ""}
                </span>
                <span>-${Number(d?.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>${totals.shipping.toFixed(2)}</span>
            </div>
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            <div className="my-2 h-px w-full max-w-sm bg-border" />
            <div className="flex w-full max-w-sm justify-between text-base font-semibold">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

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

      await print(<InvoiceDocument order={order} settings={settingsMap} />);
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

  const discountLines: any[] = Array.isArray(order?.discounts)
    ? order.discounts
    : Number(order?.discount || 0) > 0
      ? [{ id: "order-discount", code: null, amount: Number(order?.discount || 0) }]
      : [];

  const promotionNames = discountLines
    .filter((d: any) => Number(d?.amount ?? 0) === 0)
    .filter((d: any) => {
      if (String(d?.type || "") === "free_shipping") return false;
      const md: any = d?.metadata || null;
      return (
        (md?.kind === "offer" && md?.offerKind === "standard") ||
        (md?.kind === "deal" && (md?.offerKind === "bxgy_generic" || md?.offerKind === "bxgy_bundle"))
      );
    })
    .map((d: any) => d?.name || d?.discountName || d?.code || "")
    .filter(Boolean)
    .join(" • ");

  const monetaryDiscountLines = discountLines.filter((d: any) => Number(d?.amount ?? 0) > 0);

  const promotionSavings = (() => {
    if (!Array.isArray(order?.items)) return 0;
    let sum = 0;
    for (const it of order.items as any[]) {
      const qty = Number(it?.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const unit = Number(it?.price ?? 0);
      const total = Number(it?.total ?? 0);
      const isGift = unit === 0 && total === 0;
      const base = Number(it?.referencePrice ?? 0);
      if (!Number.isFinite(base) || base <= 0) continue;

      if (isGift) {
        sum += base * qty;
        continue;
      }

      if (Number.isFinite(unit) && unit > 0 && unit < base) {
        sum += (base - unit) * qty;
      }
    }
    return Math.max(0, Number(sum.toFixed(2)));
  })();

  const displaySubtotal = Number(order.subtotal || 0) + (Number.isFinite(promotionSavings) ? promotionSavings : 0);

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
                  <ChevronUp className="mr-1 h-4 w-4" /> Hide items ({order.items.length})
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" /> Show items ({order.items.length})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemsExpanded && (
            <>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  (() => {
                    const isGift = Number(item.price ?? 0) === 0 && Number(item.total ?? 0) === 0;
                    return (
                  <div key={item.id} className="flex gap-4">
                    <Link href={item.productSlug ? `/product/${item.productSlug}` : item.productId ? `/product/${item.productId}` : "#"} className="relative h-20 w-20 rounded bg-muted flex-shrink-0">
                      <Image
                        src={item.image}
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
                      {isGift ? (
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">Free gift</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {item.variant || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.sku}
                      </p>
                      <p className="text-sm mt-1">
                        Qty: {item.quantity} × {isGift ? "FREE" : `$${item.price.toFixed(2)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={isGift ? "font-semibold text-green-700 dark:text-green-300" : "font-semibold"}>
                        {isGift ? "FREE" : `$${item.total.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${displaySubtotal.toFixed(2)}</span>
              </div>
              {promotionSavings > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promotion{promotionNames ? ` (${promotionNames})` : ""}</span>
                  <span>-${promotionSavings.toFixed(2)}</span>
                </div>
              ) : promotionNames ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promotion ({promotionNames})</span>
                  <span>—</span>
                </div>
              ) : null}
              {monetaryDiscountLines.map((d: any) => (
                <div key={String(d.id)} className="flex justify-between">
                  <span className="text-muted-foreground">
                    Discount
                    {d?.code ? ` (${String(d.code)})` : d?.name ? ` (${String(d.name)})` : ""}
                  </span>
                  <span>-${Number(d?.amount || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>${Number(order.shipping || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
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
                <p className="font-medium">{order.shippingAddress.name}</p>
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
              {order.paymentMethod === "cash_on_delivery"
                ? "Cash on Delivery"
                : order.paymentMethod === "credit_card"
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
