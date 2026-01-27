"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LocalDate } from "@/components/common/local-datetime";
import { usePrint } from "@/components/common/print/print-provider";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);
  const { print, isPrinting } = usePrint();

  useEffect(() => {
    let alive = true;
    fetch("/api/storefront/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const items = json?.data?.items;
        if (!alive || !Array.isArray(items)) return;
        const map: Record<string, string> = {};
        for (const it of items) {
          if (it?.key && typeof it?.value === "string") map[String(it.key)] = it.value;
        }
        setPublicSettings(map);
      })
      .catch(() => {
        if (!alive) return;
        setPublicSettings(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const siteName = publicSettings?.site_name || siteConfig.name || "";

  const seller = useMemo(() => {
    const get = (key: string) => String(publicSettings?.[key] ?? "").trim();

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
      "123 Commerce St.";

    const city = get("seller.city") || get("city") || "City";
    const province = get("seller.province") || get("seller.state") || get("province") || get("state") || "ST";
    const postalCode = get("seller.postal_code") || get("seller.postalCode") || get("postal_code") || get("postalCode");
    const country = get("seller.country") || get("app.country") || get("country") || "United States";

    const cityLine = `${[city, province].filter(Boolean).join(", ")}${postalCode ? ` ${postalCode}` : ""}`.trim();

    return { name, email, phone, addressLine1, cityLine, country };
  }, [publicSettings]);

  useEffect(() => {
    let mounted = true;
    params.then(async (p) => {
      if (!mounted) return;
      setId(p.id);
      try {
        setLoading(true);
        const res = await fetch(`/api/storefront/orders/${encodeURIComponent(p.id)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to load invoice");
        if (mounted) setOrder(data.data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load invoice");
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  const totals = useMemo(() => {
    if (!order) return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
    return {
      subtotal: Number(order.subtotal || 0),
      shipping: Number(order.shipping || 0),
      tax: Number(order.tax || 0),
      discount: Number(order.discount || 0),
      total: Number(order.total || 0),
    };
  }, [order]);

  const discountLines = useMemo(() => {
    if (!order) return [] as any[];
    if (Array.isArray((order as any)?.discounts)) return (order as any).discounts;
    if (Number((order as any)?.discount || 0) > 0) return [{ id: "order-discount", code: null, amount: (order as any).discount }];
    return [] as any[];
  }, [order]);

  const promotionNames = useMemo(
    () =>
      discountLines
        .filter((d: any) => Number(d?.amount ?? 0) === 0)
        .filter((d: any) => {
          if (String(d?.type || "") === "free_shipping") return false;
          const md: any = d?.metadata || null;
          return md?.kind === "offer" && md?.offerKind === "standard";
        })
        .map((d: any) => d?.name || d?.discountName || d?.code || "")
        .filter(Boolean)
        .join(" • "),
    [discountLines],
  );

  const monetaryDiscountLines = useMemo(() => discountLines.filter((d: any) => Number(d?.amount ?? 0) > 0), [discountLines]);

  const giftValue = useMemo(() => {
    if (!order?.items) return 0;
    return (order.items as any[]).reduce((sum, it) => {
      const isGift = Number(it.price ?? 0) === 0 && Number(it.total ?? 0) === 0;
      if (!isGift) return sum;
      const qty = Number(it.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) return sum;
      const ref = Number(it.referencePrice ?? 0);
      if (!Number.isFinite(ref) || ref <= 0) return sum;
      return sum + ref * qty;
    }, 0);
  }, [order]);

  const offerSavings = useMemo(() => {
    if (!order?.items) return 0;
    let sum = 0;
    for (const it of order.items as any[]) {
      const qty = Number(it.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const unit = Number(it.price ?? 0);
      const total = Number(it.total ?? 0);
      const isGift = unit === 0 && total === 0;
      if (isGift) continue;

      const base = Number(it.referencePrice ?? 0);
      if (!Number.isFinite(base) || base <= 0) continue;

      if (Number.isFinite(unit) && unit > 0 && unit < base) {
        sum += (base - unit) * qty;
      }
    }
    return Math.max(0, Number(sum.toFixed(2)));
  }, [order]);

  const saleSavings = useMemo(() => {
    if (!order?.items) return 0;
    let sum = 0;
    for (const it of order.items as any[]) {
      const qty = Number(it.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const unit = Number(it.price ?? 0);
      const total = Number(it.total ?? 0);
      const isGift = unit === 0 && total === 0;
      if (isGift) continue;
      const base = Number(it.referencePrice ?? 0);
      const compareAt = Number(it.compareAtPrice ?? 0);
      if (!Number.isFinite(base) || base <= 0) continue;
      if (!Number.isFinite(compareAt) || compareAt <= base) continue;
      sum += (compareAt - base) * qty;
    }
    return Math.max(0, Number(sum.toFixed(2)));
  }, [order]);

  const promotionSavings = useMemo(() => {
    const v = Number(giftValue || 0) + (promotionNames ? Number(offerSavings || 0) : 0);
    return Math.max(0, Number(v.toFixed(2)));
  }, [giftValue, offerSavings, promotionNames]);

  const displaySubtotal = useMemo(
    () =>
      totals.subtotal +
      (Number.isFinite(promotionSavings) ? promotionSavings : 0) +
      (Number.isFinite(saleSavings) ? saleSavings : 0),
    [totals.subtotal, promotionSavings, saleSavings],
  );

  function InvoiceDocument() {
    return (
      <div className="invoice-print-root mx-auto max-w-4xl p-6 print:p-0">
        <div className="rounded-lg border p-6">
          {/* Header */}
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
              <p className="text-sm text-muted-foreground"><LocalDate value={order.date} /></p>
              <p className="text-sm">{order.orderNumber}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Addresses */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Billed To</h3>
              <div className="text-sm leading-6">
                {order.shippingAddress ? (
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
                <div>{seller.cityLine}</div>
                <div>{seller.country}</div>
                <div className="mt-1">{seller.email}</div>
                {seller.phone ? <div>{seller.phone}</div> : null}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Items */}
          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-2">Promotion</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {order.items.map((it: any) => (
              (() => {
                const isGift = Number(it.price ?? 0) === 0 && Number(it.total ?? 0) === 0;
                const compareAt = Number(it.compareAtPrice ?? 0);
                const hasCompareAt = Number.isFinite(compareAt) && compareAt > 0 && compareAt > Number(it.price ?? 0);
                const base = Number(it.referencePrice ?? 0);
                const hasOffer =
                  !isGift &&
                  Boolean(promotionNames) &&
                  Number.isFinite(base) &&
                  base > 0 &&
                  Number(it.price ?? 0) > 0 &&
                  Number(it.price ?? 0) < base;
                return (
                  <div key={it.id} className="grid grid-cols-12 gap-2 p-2 text-sm">
                    <div className="col-span-5">
                      <div className="font-medium">{it.name}</div>
                      {isGift ? <div className="text-xs font-medium text-green-700 dark:text-green-300">Free gift</div> : null}
                      {it.variant && <div className="text-xs text-muted-foreground">{it.variant}</div>}
                      {it.sku && <div className="text-xs text-muted-foreground">SKU: {it.sku}</div>}
                    </div>
                    <div className="col-span-2 truncate">{isGift || hasOffer ? (promotionNames || "—") : ""}</div>
                    <div className="col-span-2 text-right">{it.quantity}</div>
                    <div className="col-span-1 text-right">
                      {isGift ? (
                        "FREE"
                      ) : (
                        <div className="flex flex-col items-end leading-tight">
                          {hasCompareAt ? (
                            <span className="text-xs text-muted-foreground line-through">${compareAt.toFixed(2)}</span>
                          ) : null}
                          <span>${Number(it.price).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {isGift ? (
                        "FREE"
                      ) : (
                        <div className="flex flex-col items-end leading-tight">
                          {hasCompareAt ? (
                            <span className="text-xs text-muted-foreground line-through">${(compareAt * Number(it.quantity ?? 0)).toFixed(2)}</span>
                          ) : null}
                          <span>${Number(it.total).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${displaySubtotal.toFixed(2)}</span>
            </div>
            {saleSavings > 0 ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Sale savings</span>
                <span>-${saleSavings.toFixed(2)}</span>
              </div>
            ) : null}
            {promotionNames && promotionSavings <= 0 ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Promotion ({promotionNames})</span>
                <span>—</span>
              </div>
            ) : null}
            {promotionSavings > 0 ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Discount{promotionNames ? ` (${promotionNames})` : ""}</span>
                <span>-${promotionSavings.toFixed(2)}</span>
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
            <Separator className="my-2 w-full max-w-sm" />
            <div className="flex w-full max-w-sm justify-between text-base font-semibold">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-xs text-muted-foreground">
            <p>Thank you for your purchase.</p>
            <p className="mt-1">If you have any questions about this invoice, please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading invoice...</div>;
  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!order) return <div className="p-6 text-sm text-muted-foreground">Invoice not found</div>;
  if (order.paymentStatus !== "paid") {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        <Link href={`/account/orders/${order.id || id}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Order
          </Button>
        </Link>
        <div className="rounded-lg border p-6">
          <h1 className="text-lg font-semibold">Invoice unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">The invoice will be available once the order is paid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/account/orders/${order.id || id}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Order
          </Button>
        </Link>
        <Button
          onClick={() => void print(<InvoiceDocument />)}
          className="gap-2"
          disabled={isPrinting}
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
      <InvoiceDocument />
    </div>
  );
}
