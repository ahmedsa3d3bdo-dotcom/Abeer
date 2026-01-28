"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Eye, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Tag } from "lucide-react";
import Image from "next/image";
import { LocalDate } from "@/components/common/local-datetime";
import { usePrint } from "@/components/common/print/print-provider";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { computeOrderTotals, normalizeOrderData } from "@/lib/pricing";
import { InvoicePriceSummary, PromotionBadge } from "@/components/shared/pricing";
import { formatCurrency } from "@/lib/utils";

export default function OrdersPage() {
  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    date: string;
    status: string;
    paymentStatus: string;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      image?: string;
      productSlug?: string | null;
      productId?: string | null;
    }>;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        params.set("page", String(page));
        params.set("limit", String(limit));
        const res = await fetch(`/api/storefront/orders?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          const payload = data?.data || { items: [], total: 0, page: 1, limit, hasMore: false };
          setOrders(Array.isArray(payload.items) ? payload.items : []);
          setHasMore(Boolean(payload.hasMore));
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filteredOrders = orders;

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
    const items = Array.isArray(order?.items) ? order.items : [];

    // Use unified pricing logic
    const normalized = normalizeOrderData(order);
    const totals = computeOrderTotals(normalized);

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

          {/* Items table with promotion info */}
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

          {/* Use unified InvoicePriceSummary component */}
          <div className="mt-6">
            <InvoicePriceSummary totals={totals} />
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            <p>Thank you for your purchase.</p>
            <p className="mt-1">If you have any questions about this invoice, please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePrintInvoice = async (orderId: string) => {
    try {
      setPrintPreparing(true);
      const [settingsRes, orderRes] = await Promise.all([
        fetch("/api/storefront/settings/public", { cache: "no-store" }),
        fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" }),
      ]);

      const settingsJson = await settingsRes.json().catch(() => null);
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson?.success) throw new Error(orderJson?.error?.message || "Failed to load invoice");

      const items = settingsJson?.data?.items;
      const settingsMap: Record<string, string> = {};
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it?.key && typeof it?.value === "string") settingsMap[String(it.key)] = it.value;
        }
      }

      const fullOrder = orderJson.data;
      if (fullOrder?.paymentStatus !== "paid") {
        toast.error("Invoice unavailable", { description: "The invoice will be available once the order is paid." });
        return;
      }

      await print(<InvoiceDocument order={fullOrder} settings={settingsMap} />);
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare invoice");
    } finally {
      setPrintPreparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-muted-foreground">
            View and track your orders
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="pt-6">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Placed on <LocalDate value={order.date} />
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge type="order" status={order.status} />
                  <span className="text-lg font-bold">
                    {formatCurrency(order.total, { currency: "CAD", locale: "en-CA" })}
                  </span>
                </div>
              </div>

              {/* Items toggle */}
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                  className="px-2"
                >
                  {expanded[order.id] ? (
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

              {/* Order Items */}
              {expanded[order.id] && (
                <div className="space-y-3 mb-4">
                  {order.items.map((item, idx) => {
                    const isGift = Number((item as any).price ?? 0) === 0 && Number((item as any).total ?? 0) === 0;
                    return (
                      <div key={idx} className="flex gap-4">
                        <div className="relative h-16 w-16 rounded bg-muted flex-shrink-0">
                          <Image src={item.image || "/placeholder-product.jpg"} alt={item.name} fill className="object-cover rounded" sizes="64px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {isGift && (
                            <PromotionBadge type="gift" size="sm" className="mt-0.5" />
                          )}
                          {(item as any).promotionName && !isGift && (
                            <PromotionBadge type="promotion" label={(item as any).promotionName} size="sm" className="mt-0.5" />
                          )}
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × {isGift ? (
                              <span className="text-green-600 dark:text-green-400">FREE</span>
                            ) : (
                              formatCurrency(item.price, { currency: "CAD", locale: "en-CA" })
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </Link>
                {order.paymentStatus === "paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handlePrintInvoice(order.id)}
                    disabled={loading || printPreparing || isPrinting}
                    className="hidden lg:inline-flex"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Invoice
                  </Button>
                )}
                {order.status === "delivered" && (
                  <Button variant="outline" size="sm">
                    Buy Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-6">
              {statusFilter === "all"
                ? "You haven't placed any orders yet"
                : `No ${statusFilter} orders`}
            </p>
            <Link href="/shop">
              <Button>Start Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
