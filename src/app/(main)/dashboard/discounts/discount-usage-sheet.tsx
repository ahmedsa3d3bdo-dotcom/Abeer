"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocalDateTime } from "@/components/common/local-datetime";
import { formatCurrency } from "@/lib/utils";

import type { DiscountRow } from "./columns";

type DiscountUsageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: DiscountRow | null;
};

export function DiscountUsageSheet({ open, onOpenChange, discount }: DiscountUsageSheetProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const pageSize = 10;

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  }, [total]);

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
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Discount details</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold">{discount?.name || "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">Code: {discount?.code || "—"}</div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="font-medium capitalize">{String(discount?.type || "").replaceAll("_", " ") || "—"}</div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Value</div>
                <div className="font-medium">
                  {discount?.type === "percentage" ? `${discount?.value}%` : `$${discount?.value}`}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Scope</div>
                <div className="font-medium capitalize">{String(discount?.scope || "").replaceAll("_", " ") || "—"}</div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Usage</div>
                <div className="font-medium">
                  {Number(discount?.usageCount ?? 0)}{discount?.usageLimit ? ` / ${discount.usageLimit}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b p-3">
              <div>
                <div className="text-sm font-medium">Usage</div>
                <div className="text-xs text-muted-foreground">Orders that used this discount</div>
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

            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-3">Order</div>
              <div className="col-span-4">Customer</div>
              <div className="col-span-2 text-right">Discount</div>
              <div className="col-span-3 text-right">Date</div>
            </div>

            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading...</div>
            ) : items.length ? (
              items.map((u: any) => (
                <div key={String(u.orderId || u.orderNumber)} className="grid grid-cols-12 gap-2 border-b last:border-b-0 p-2 text-sm">
                  <div className="col-span-3 font-medium">#{u.orderNumber || "—"}</div>
                  <div className="col-span-4 truncate">{u.customerEmail || "—"}</div>
                  <div className="col-span-2 text-right">
                    -{formatCurrency(Number(u.amount ?? 0), { currency: u.currency || "CAD", locale: "en-CA" })}
                  </div>
                  <div className="col-span-3 text-right text-muted-foreground">
                    <LocalDateTime value={u.createdAt} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground">No usage yet.</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
