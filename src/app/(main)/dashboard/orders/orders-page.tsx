"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCcw, ShoppingCart, DollarSign, Calendar, BarChart3, CreditCard, Clock, RotateCcw, Printer } from "lucide-react";
import { toast } from "sonner";
import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { formatCurrency } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrint } from "@/components/common/print/print-provider";
import { StatusBadge } from "@/components/common/status-badge";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getOrderColumns, type OrderRow } from "./columns";
import { useNewNotifications } from "@/hooks/use-new-notifications";

const DEFAULT_LIMIT = 10;

export default function OrdersPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);

  const num = useMemo(
    () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [],
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [form, setForm] = useState({ status: "pending", paymentStatus: "pending", adminNote: "" });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Optional filter coming from Customers page
  const searchParams = useSearchParams();
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  useEffect(() => {
    const uid = searchParams.get("userId") || "";
    setUserIdFilter(uid);
  }, [searchParams]);

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

  // Details sheet state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const { isNew } = useNewNotifications({ type: "order_created", limit: 200 });

  async function openDetails(row: OrderRow) {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/v1/orders/${row.id}/details`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load order details");
      setDetail(data.data || null);
      setDetailOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to load order details");
    } finally {
      setDetailLoading(false);
    }
  }

  function InvoiceContent({ d }: { d: any }) {
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

    const displaySubtotal =
      totals.subtotal +
      (Number.isFinite(promotionSavings) ? promotionSavings : 0) +
      (Number.isFinite(saleSavings) ? saleSavings : 0);

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

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-2">Promotion</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {(d?.items || []).map((it: any) => (
              (() => {
                const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
                const compareAt = Number(it.variantCompareAtPrice ?? it.productCompareAtPrice ?? 0);
                const hasCompareAt = Number.isFinite(compareAt) && compareAt > 0 && compareAt > Number(it.unitPrice ?? 0);
                const base = parseFloat(String(it.variantPrice ?? it.productPrice ?? 0));
                const hasOffer =
                  !isGift &&
                  Boolean(offerPromotionNames) &&
                  Number.isFinite(base) &&
                  base > 0 &&
                  Number(it.unitPrice ?? 0) > 0 &&
                  Number(it.unitPrice ?? 0) < base;
                return (
              <div key={it.id} className="grid grid-cols-12 gap-2 p-2 text-sm">
                <div className="col-span-5">
                  <div className="font-medium">{it.productName}</div>
                  {isGift ? <div className="text-xs font-medium text-green-700 dark:text-green-300">Free gift</div> : null}
                  {it.variantName && <div className="text-xs text-muted-foreground">{it.variantName}</div>}
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
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(compareAt, { currency, locale })}
                        </span>
                      ) : null}
                      <span>{formatCurrency(Number(it.unitPrice ?? 0), { currency, locale })}</span>
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {isGift ? (
                    "FREE"
                  ) : (
                    <div className="flex flex-col items-end leading-tight">
                      {hasCompareAt ? (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(compareAt * Number(it.quantity ?? 0), { currency, locale })}
                        </span>
                      ) : null}
                      <span>{formatCurrency(Number(it.totalPrice ?? 0), { currency, locale })}</span>
                    </div>
                  )}
                </div>
              </div>
                );
              })()
            ))}
          </div>

          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(displaySubtotal, { currency, locale })}</span>
            </div>
            {saleSavings > 0 ? (
              <div className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">Sale savings</span>
                <span>-{formatCurrency(saleSavings, { currency, locale })}</span>
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
                <span>-{formatCurrency(promotionSavings, { currency, locale })}</span>
              </div>
            ) : null}
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(totals.shipping, { currency, locale })}</span>
            </div>
            <div className="flex w-full max-w-sm justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(totals.tax, { currency, locale })}</span>
            </div>
            {discountLines.map((od) => (
              <div key={String(od.id)} className="flex w-full max-w-sm justify-between">
                <span className="text-muted-foreground">
                  Discount
                  {od?.code ? ` (${String(od.code)})` : od?.discountName ? ` (${String(od.discountName)})` : ""}
                </span>
                <span>-{formatCurrency(Number(od?.amount ?? 0), { currency, locale })}</span>
              </div>
            ))}
            <Separator className="my-2 w-full max-w-sm" />
            <div className="flex w-full max-w-sm justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totals.total, { currency, locale })}</span>
            </div>
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            <p>Thank you for your purchase.</p>
            <p className="mt-1">If you have any questions about this invoice, please contact support.</p>
          </div>
        </div>

        {null}
      </div>
    );
  }

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (userIdFilter) params.set("userId", userIdFilter);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllOrdersMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: OrderRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load orders");
      const batch: OrderRow[] = (data.data?.items || []).map((o: any) => ({ ...o }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllOrders() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllOrdersMatchingFilters();
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Orders</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-3">Order</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Payment</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {all.map((o) => (
              <div key={o.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-3 font-medium">#{o.orderNumber}</div>
                <div className="col-span-3">
                  {(() => {
                    const fn = o.customerFirstName || "";
                    const ln = o.customerLastName || "";
                    const full = `${fn} ${ln}`.trim();
                    return full || o.customerEmail || "—";
                  })()}
                </div>
                <div className="col-span-2 capitalize">{o.status}</div>
                <div className="col-span-2 capitalize">{o.paymentStatus}</div>
                <div className="col-span-2 text-right">
                  {formatCurrency(Number(o.totalAmount ?? 0), { currency: o.currency || "CAD", locale: "en-CA" })}
                </div>
              </div>
            ))}
          </div>
        </div>,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  async function printSelectedOrders() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one order to print");
      return;
    }
    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/orders/${id}/details`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load order ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          {details.map((d, idx) => (
            <div key={String(d?.order?.id || idx)} className={idx === details.length - 1 ? "" : "print-page-break"}>
              <div className="text-lg font-semibold">Order #{d?.order?.orderNumber}</div>
              <div className="mt-4">
                <DrawerContent d={d} />
              </div>
            </div>
          ))}
        </div>,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  function printDrawerOrder() {
    if (!detail?.order?.id) return;
    void print(
      <div className="p-6">
        <div className="text-lg font-semibold">Order #{detail?.order?.orderNumber}</div>
        <div className="mt-4">
          <DrawerContent d={detail} />
        </div>
      </div>,
    );
  }

  function printDrawerInvoice() {
    if (!detail?.order?.id) return;
    void print(<InvoiceContent d={detail} />);
  }

  function DrawerContent({ d }: { d: any }) {
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

    const promotionSavings = Number(giftValue || 0) + Number(offerSavings || 0);
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
            <div className="font-medium">
              {formatCurrency(Number(d.order?.totalAmount ?? 0), { currency, locale })}
            </div>
            {saleSavings > 0 ? (
              <div className="text-xs text-muted-foreground mt-0.5">Sale savings: -{formatCurrency(saleSavings, { currency, locale })}</div>
            ) : null}
            {promotionNames && promotionSavings <= 0 ? (
              <div className="text-xs text-muted-foreground mt-0.5">Promotion ({promotionNames}): —</div>
            ) : null}
            {promotionSavings > 0 ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                Promotion savings{promotionNames ? ` (${promotionNames})` : ""}: -{formatCurrency(promotionSavings, { currency, locale })}
              </div>
            ) : null}
            {discountLines.map((od) => (
              <div key={String(od.id)} className="text-xs text-muted-foreground mt-0.5">
                Discount
                {od?.code ? ` (${String(od.code)})` : od?.discountName ? ` (${String(od.discountName)})` : ""}: -
                {formatCurrency(Number(od?.amount ?? 0), { currency, locale })}
              </div>
            ))}
          </div>
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
                {d.shippingAddress.phone && (
                  <div className="text-xs text-muted-foreground">Phone: {d.shippingAddress.phone}</div>
                )}
                {d.shippingAddress.email && (
                  <div className="text-xs text-muted-foreground">Email: {d.shippingAddress.email}</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No address on file</div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium">Items</div>
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-6 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-3">Product</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Price</div>
              <div className="text-right">Total</div>
            </div>
            {(d.items || []).map((it: any) => (
              <div key={it.id} className="grid grid-cols-6 gap-2 border-b last:border-b-0 p-2 text-sm">
                <div className="col-span-3">
                  <div className="font-medium">{it.productName}</div>
                  {Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0 ? (
                    <div className="text-xs font-medium text-green-700 dark:text-green-300">Free gift</div>
                  ) : null}
                  {it.variantName && <div className="text-xs text-muted-foreground">{it.variantName}</div>}
                  {it.sku && <div className="text-xs text-muted-foreground">SKU: {it.sku}</div>}
                </div>
                <div className="text-right">{it.quantity}</div>
                <div className="text-right">
                  {(() => {
                    const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
                    if (isGift) return "FREE";
                    const currency = d.order?.currency || "CAD";
                    const compareAt = Number(it.variantCompareAtPrice ?? it.productCompareAtPrice ?? 0);
                    const unit = Number(it.unitPrice ?? 0);
                    const hasCompareAt = Number.isFinite(compareAt) && compareAt > 0 && compareAt > unit;
                    return (
                      <div className="flex flex-col items-end leading-tight">
                        {hasCompareAt ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(compareAt, { currency, locale: "en-CA" })}
                          </span>
                        ) : null}
                        <span>{formatCurrency(unit, { currency, locale: "en-CA" })}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-right">
                  {(() => {
                    const isGift = Number(it.unitPrice ?? 0) === 0 && Number(it.totalPrice ?? 0) === 0;
                    if (isGift) return "FREE";
                    const currency = d.order?.currency || "CAD";
                    const compareAt = Number(it.variantCompareAtPrice ?? it.productCompareAtPrice ?? 0);
                    const unit = Number(it.unitPrice ?? 0);
                    const qty = Number(it.quantity ?? 0);
                    const hasCompareAt = Number.isFinite(compareAt) && compareAt > 0 && compareAt > unit;
                    return (
                      <div className="flex flex-col items-end leading-tight">
                        {hasCompareAt ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(compareAt * qty, { currency, locale: "en-CA" })}
                          </span>
                        ) : null}
                        <span>{formatCurrency(Number(it.totalPrice ?? 0), { currency, locale: "en-CA" })}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
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


  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (userIdFilter) params.set("userId", userIdFilter);
      const res = await fetch(`/api/v1/orders/metrics?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  const columns = useMemo(
    () =>
      getOrderColumns({
        onView: (row) => {
          void openDetails(row);
        },
        onEdit: (row) => { 
          setEditing(row);
          setForm({ status: row.status, paymentStatus: row.paymentStatus, adminNote: "" });
          setOpen(true);
        },
        onDelete: (row) => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
      }),
    [],
  );

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/orders/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Order deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchOrders();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const table = useDataTableInstance({
    data: items,
    columns,
    manualPagination: true,
    defaultPageIndex: pageIndex,
    defaultPageSize: pageSize,
    pageCount: Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    getRowId: (row) => row.id,
    onPaginationChange: ({ pageIndex: pi, pageSize: ps }) => {
      setPageIndex(pi);
      setPageSize(ps);
    },
  });

  useEffect(() => {
    void fetchOrders();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, paymentStatus, dateFrom, dateTo, pageIndex, pageSize, userIdFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (userIdFilter) params.set("userId", userIdFilter);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load orders");
      setItems((data.data?.items || []).map((o: any) => ({ ...o })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    if (!editing) return;
    try {
      const payload: any = { status: form.status, paymentStatus: form.paymentStatus, adminNote: form.adminNote || null };
      const res = await fetch(`/api/v1/orders/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Update failed");
      toast.success("Order updated");
      setOpen(false);
      void fetchOrders();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total orders" value={metrics?.totalOrders ?? total} icon={ShoppingCart} tone="blue" />
        <MetricCard title="Total Sales" value={num.format(Number(metrics?.revenueTotal ?? 0))} icon={DollarSign} tone="emerald" />
        <MetricCard title="Avg order value" value={num.format(Number(metrics?.avgOrderValue ?? 0))} icon={DollarSign} tone="violet" />
        <MetricCard title="Orders (30d)" value={Number(metrics?.orders30d ?? 0)} icon={Calendar} tone="amber" />
        <MetricCard title="Total Sales (30d)" value={num.format(Number(metrics?.revenue30d ?? 0))} icon={BarChart3} tone="emerald" />
        <MetricCard
          title="Paid orders"
          value={Number(metrics?.paidOrders ?? 0)}
          subtitle={
            <>
              {typeof metrics?.pendingOrders === "number" ? `Pending ${metrics.pendingOrders}` : "\u00A0"}
              {typeof metrics?.refundedOrders === "number" ? ` • Refunded ${metrics.refundedOrders}` : ""}
            </>
          }
          icon={CreditCard}
          tone="slate"
        />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Order number or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Payment</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 items-end">
          {userIdFilter && (
            <div className="text-xs text-muted-foreground mr-2">
              Filtered by customer: <code className="text-xs">{userIdFilter}</code>
            </div>
          )}
          <Button variant="outline" onClick={() => void fetchOrders()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  void printSelectedOrders();
                }}
              >
                Print selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void printAllOrders();
                }}
              >
                Print all (matching filters)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DataTable
          table={table as any}
          columns={columns as any}
          getRowClassName={(row: OrderRow) => (isNew(row.id) ? "bg-amber-50/60" : undefined)}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      {/* Edit dialog */}
      <FormModal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), setEditing(null)))}
        title="Update Order"
        className="sm:max-w-[520px]"
        submitting={loading}
        submitText="Save"
        onSubmit={onSubmit}
      >
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment</Label>
                <Select value={form.paymentStatus} onValueChange={(v) => setForm((s) => ({ ...s, paymentStatus: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Admin Note</Label>
              <Input value={form.adminNote} onChange={(e) => setForm((s) => ({ ...s, adminNote: e.target.value }))} />
            </div>
          </div>
      </FormModal>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete order"
        description={deleteTarget ? `This will permanently delete order #${deleteTarget.orderNumber}.` : "This will permanently delete the selected order."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />

      {/* Details drawer */}
      <Sheet open={detailOpen} onOpenChange={(o) => setDetailOpen(o)}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col overflow-hidden">
          <SheetHeader className="border-b">
            <SheetTitle>
              {detail ? `Order #${detail.order?.orderNumber}` : "Order details"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 pb-6 pt-4 space-y-5">
              {detailLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {!detailLoading && detail && (
                <>
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={printPreparing || isPrinting}>
                          <Printer className="mr-1 h-4 w-4" /> Print
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={printDrawerOrder}>Print details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={printDrawerInvoice}>Print invoice</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <DrawerContent d={detail} />
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
