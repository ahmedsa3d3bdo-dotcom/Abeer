"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Tag, Target, TrendingUp, Package, Percent, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocalDateTime } from "@/components/common/local-datetime";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import type { DiscountRow } from "./columns";

type DiscountUsageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: DiscountRow | null;
};

function getDiscountKindValue(row: DiscountRow | null) {
  if (!row) return null;
  if (!row.isAutomatic) return "coupon";
  const md: any = row?.metadata || null;
  if (md?.kind === "offer" && md?.offerKind === "bundle") return "bundle_offer";
  if (md?.kind === "offer") return "scheduled_offer";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_generic") return "bxgy_generic";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") return "bxgy_bundle";
  return "scheduled_offer";
}

function getDisplayValueLabel(row: DiscountRow | null) {
  if (!row) return "—";
  
  const kind = getDiscountKindValue(row);
  const md: any = row?.metadata || null;

  // Handle BXGY Generic
  if (kind === "bxgy_generic") {
    const buy = Number(md?.bxgy?.buyQty ?? 0);
    const get = Number(md?.bxgy?.getQty ?? 0);
    if (buy > 0 && get > 0) return `Buy ${buy} Get ${get}`;
    return "BXGY";
  }

  // Handle BXGY Bundle
  if (kind === "bxgy_bundle") {
    const buyLines = Array.isArray(md?.bxgyBundle?.buy) ? md.bxgyBundle.buy : [];
    const getLines = Array.isArray(md?.bxgyBundle?.get) ? md.bxgyBundle.get : [];
    const buyQty = buyLines.reduce((sum: number, l: any) => sum + Number(l?.quantity ?? 0), 0);
    const getQty = getLines.reduce((sum: number, l: any) => sum + Number(l?.quantity ?? 0), 0);
    if (buyQty > 0 && getQty > 0) return `Buy ${buyQty} Get ${getQty}`;
    return "BXGY Bundle";
  }

  // Handle regular discounts
  if (row.type === "percentage") {
    return `${row.value}%`;
  }
  
  return formatCurrency(Number(row.value || 0), { currency: "CAD", locale: "en-CA" });
}

function getDiscountTypeColor(type: string | undefined, isBXGY: boolean) {
  if (isBXGY) {
    return "bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
  }
  switch (type) {
    case "percentage":
      return "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "fixed_amount":
      return "bg-gradient-to-br from-emerald-500/10 to-green-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-gradient-to-br from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30";
  }
}

function getDiscountKindColor(kind: string | undefined) {
  switch (kind) {
    case "coupon":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
    case "scheduled_offer":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30";
    case "bxgy_generic":
    case "bxgy_bundle":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "bundle_offer":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30";
  }
}

function getScopeColor(scope: string | undefined) {
  switch (scope) {
    case "all":
      return "bg-gradient-to-br from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30";
    case "categories":
      return "bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-400 border-green-500/30";
    case "products":
      return "bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
    default:
      return "bg-gradient-to-br from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30";
  }
}

function getKindLabel(kind: string | undefined) {
  switch (kind) {
    case "coupon":
      return "Coupon";
    case "scheduled_offer":
      return "Scheduled Offer";
    case "bxgy_generic":
      return "BXGY Generic";
    case "bxgy_bundle":
      return "BXGY Bundle";
    case "bundle_offer":
      return "Bundle Offer";
    default:
      return "Discount";
  }
}

export function DiscountUsageSheet({ open, onOpenChange, discount }: DiscountUsageSheetProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const pageSize = 10;

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  }, [total]);

  const kind = useMemo(() => getDiscountKindValue(discount), [discount]);
  const isBXGY = kind === "bxgy_generic" || kind === "bxgy_bundle";

  async function fetchUsage(discountId: string, page: number) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/v1/discounts/${discountId}/usage?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load usage");
      setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
      setTotal(Number(data?.data?.total || 0));
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      toast.error(e?.message || "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!discount?.id) return;
    setPageIndex(0);
    void fetchUsage(discount.id, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, discount?.id]);

  useEffect(() => {
    if (!open) return;
    if (!discount?.id) return;
    void fetchUsage(discount.id, pageIndex + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col" suppressHydrationWarning>
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-xl">Discount Details</SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-6 overflow-y-auto scrollbar-hide">
          <div className="py-6 space-y-6">
            {/* Header Card with Gradient */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-background p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate">{discount?.name || "—"}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4 flex-shrink-0" />
                      <span className="font-mono truncate">{discount?.code || "—"}</span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getDiscountKindColor(kind || undefined)} font-semibold text-xs px-3 py-1 flex-shrink-0`}
                  >
                    {getKindLabel(kind || undefined)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Type Card */}
              <div className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${getDiscountTypeColor(discount?.type, isBXGY)}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isBXGY ? (
                    <Gift className="h-5 w-5" />
                  ) : discount?.type === "percentage" ? (
                    <Percent className="h-5 w-5" />
                  ) : (
                    <TrendingUp className="h-5 w-5" />
                  )}
                  <div className="text-xs font-semibold uppercase tracking-wider">Type</div>
                </div>
                <div className="text-xl font-bold">
                  {isBXGY ? "BXGY" : String(discount?.type || "").replaceAll("_", " ").toUpperCase() || "—"}
                </div>
              </div>

              {/* Value Card */}
              <div className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${getDiscountTypeColor(discount?.type, isBXGY)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-5 w-5" />
                  <div className="text-xs font-semibold uppercase tracking-wider">Value</div>
                </div>
                <div className="text-xl font-bold break-words">
                  {getDisplayValueLabel(discount)}
                </div>
              </div>

              {/* Scope Card */}
              <div className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${getScopeColor(discount?.scope)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5" />
                  <div className="text-xs font-semibold uppercase tracking-wider">Scope</div>
                </div>
                <div className="text-xl font-bold capitalize">
                  {String(discount?.scope || "").replaceAll("_", " ") || "—"}
                </div>
              </div>

              {/* Usage Card */}
              <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">Usage</div>
                </div>
                <div className="text-xl font-bold text-primary">
                  {Number(discount?.usageCount ?? 0)}
                  {discount?.usageLimit ? (
                    <span className="text-base font-medium text-muted-foreground"> / {discount.usageLimit}</span>
                  ) : (
                    <span className="text-base font-medium text-muted-foreground"> / ∞</span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates Section */}
            {(discount?.startsAt || discount?.endsAt) && (
              <div className="rounded-xl border p-5 bg-muted/50 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-semibold">Active Period</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Starts</div>
                    <div className="text-sm font-semibold">
                      {discount?.startsAt ? <LocalDateTime value={discount.startsAt} /> : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ends</div>
                    <div className="text-sm font-semibold">
                      {discount?.endsAt ? <LocalDateTime value={discount.endsAt} /> : "No expiry"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Usage Table */}
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/50 p-5">
                <div>
                  <div className="text-base font-semibold">Usage History</div>
                  <div className="text-xs text-muted-foreground mt-1">Orders that applied this discount</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || pageIndex <= 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || pageIndex + 1 >= pageCount}
                    onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 bg-muted/30 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="col-span-3">Order</div>
                <div className="col-span-4">Customer</div>
                <div className="col-span-2 text-right">Discount</div>
                <div className="col-span-3 text-right">Date</div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  <div className="mt-3 text-sm font-medium text-muted-foreground">Loading usage data...</div>
                </div>
              ) : items.length ? (
                <div className="divide-y">
                  {items.map((u: any) => (
                    <div 
                      key={String(u.orderId || u.orderNumber)} 
                      className="grid grid-cols-12 gap-3 px-5 py-4 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <div className="col-span-3 font-mono font-semibold text-primary truncate">
                        #{u.orderNumber || "—"}
                      </div>
                      <div className="col-span-4 truncate font-medium">{u.customerEmail || "—"}</div>
                      <div className="col-span-2 text-right font-bold">
                        {Number(u.amount ?? 0) === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            -{formatCurrency(Number(u.amount ?? 0), { currency: u.currency || "CAD", locale: "en-CA" })}
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-right text-xs text-muted-foreground">
                        <LocalDateTime value={u.createdAt} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-3">📊</div>
                  <div className="text-base font-semibold">No usage yet</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    This discount hasn't been used in any orders
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
