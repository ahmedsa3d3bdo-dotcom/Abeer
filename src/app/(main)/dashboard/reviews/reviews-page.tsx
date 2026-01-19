"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Star, CheckCircle2, Clock, Calendar, ShieldCheck, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useNewNotifications } from "@/hooks/use-new-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrint } from "@/components/common/print/print-provider";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";

import { getReviewColumns, type ReviewRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function ReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<ReviewRow | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [approval, setApproval] = useState<string>("all"); // all | approved | pending
  const [rating, setRating] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { isNew } = useNewNotifications({ type: "product_review", limit: 200 });

  const columns = useMemo(
    () =>
      getReviewColumns({
        onView: (row) => {
          setViewTarget(row);
          setViewOpen(true);
        },
        onApprove: async (row) => {
          try {
            const res = await fetch(`/api/v1/reviews/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isApproved: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Approve failed");
            toast.success("Review approved");
            void fetchReviews();
          } catch (e: any) {
            toast.error(e.message || "Approve failed");
          }
        },
        onReject: async (row) => {
          try {
            const res = await fetch(`/api/v1/reviews/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isApproved: false }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Reject failed");
            toast.success("Review rejected");
            void fetchReviews();
          } catch (e: any) {
            toast.error(e.message || "Reject failed");
          }
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
      const res = await fetch(`/api/v1/reviews/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Review deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchReviews();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (approval !== "all") params.set("isApproved", String(approval === "approved"));
      if (rating !== "all") params.set("rating", rating);
      const res = await fetch(`/api/v1/reviews/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
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

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (approval !== "all") params.set("isApproved", String(approval === "approved"));
    if (rating !== "all") params.set("rating", rating);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllReviewsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: ReviewRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/reviews?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load reviews");
      const batch: ReviewRow[] = (data.data?.items || []).map((r: any) => {
        const name = [r.userFirstName, r.userLastName].filter(Boolean).join(" ");
        const emailName = (r.userEmail || "").split("@")[0];
        return { ...r, userName: name || emailName || null } as ReviewRow;
      });
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllReviews() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllReviewsMatchingFilters();
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Reviews</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-4">Product</div>
              <div className="col-span-2">Rating</div>
              <div className="col-span-3">User</div>
              <div className="col-span-3">Status</div>
            </div>
            {all.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{r.productName}</div>
                  <div className="text-xs text-muted-foreground">{r.title || "—"}</div>
                </div>
                <div className="col-span-2">{r.rating}★</div>
                <div className="col-span-3">{r.userName || "—"}</div>
                <div className="col-span-3">{r.isApproved ? "Approved" : "Pending"}</div>
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

  async function printSelectedReviews() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one review to print");
      return;
    }

    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/reviews/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load review ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Reviews (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          {details.map((r: any, idx: number) => (
            <div key={r.id} className={idx === details.length - 1 ? "" : "print-page-break"}>
              <div className="mt-4 rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold">{r.title || "Review"}</div>
                    <div className="text-sm text-muted-foreground">Rating: {r.rating}★</div>
                    <div className="text-sm text-muted-foreground">{r.isApproved ? "Approved" : "Pending"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</div>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm">{r.content || "—"}</div>
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

  useEffect(() => {
    void fetchReviews();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, approval, rating, pageIndex, pageSize]);

  async function fetchReviews() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (approval !== "all") params.set("isApproved", String(approval === "approved"));
      if (rating !== "all") params.set("rating", rating);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/reviews?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load reviews");
      const rows = (data.data?.items || []).map((r: any) => {
        const name = [r.userFirstName, r.userLastName].filter(Boolean).join(" ");
        const emailName = (r.userEmail || "").split("@")[0];
        return { ...r, userName: name || emailName || null } as ReviewRow;
      });
      setItems(rows);
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          if (o) setViewOpen(true);
          else {
            setViewOpen(false);
            setViewTarget(null);
          }
        }}
      >
        <AppDialogContent
          title="Review"
          description={
            viewTarget ? (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{viewTarget.productName}</span>
                <span className="text-xs text-muted-foreground">{viewTarget.userName || "—"} • {viewTarget.rating}★</span>
              </div>
            ) : undefined
          }
          className="sm:max-w-[820px]"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!viewTarget) return;
                  void print(
                    <div className="p-6">
                      <div className="text-lg font-semibold">Review</div>
                      <div className="mt-1 text-xs text-muted-foreground">{viewTarget.createdAt ? new Date(viewTarget.createdAt as any).toLocaleString() : ""}</div>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Product</div>
                          <div className="mt-1 text-sm font-medium">{viewTarget.productName || "—"}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">User</div>
                            <div className="mt-1 text-sm">{viewTarget.userName || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Rating</div>
                            <div className="mt-1 text-sm">{viewTarget.rating}★</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Status</div>
                            <div className="mt-1 text-sm">{viewTarget.isApproved ? "Approved" : "Pending"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Helpful / Reports</div>
                            <div className="mt-1 text-sm">{viewTarget.helpfulCount} / {viewTarget.reportCount}</div>
                          </div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Title</div>
                          <div className="mt-1 text-sm font-medium">{viewTarget.title || "—"}</div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Content</div>
                          <div className="mt-2 whitespace-pre-wrap text-sm">{viewTarget.content || "—"}</div>
                        </div>
                      </div>
                    </div>,
                  );
                }}
                disabled={loading || isPrinting || printPreparing || !viewTarget}
              >
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </div>
          }
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1 text-sm">{viewTarget ? (viewTarget.isApproved ? "Approved" : "Pending") : "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="mt-1 text-sm">{viewTarget?.createdAt ? new Date(viewTarget.createdAt as any).toLocaleString() : "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Helpful</div>
                <div className="mt-1 text-sm">{typeof viewTarget?.helpfulCount === "number" ? viewTarget.helpfulCount : "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Reports</div>
                <div className="mt-1 text-sm">{typeof viewTarget?.reportCount === "number" ? viewTarget.reportCount : "—"}</div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="mt-2 text-sm">{viewTarget?.title || "—"}</div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Content</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{viewTarget?.content || "—"}</div>
            </div>
          </div>
        </AppDialogContent>
      </Dialog>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total reviews" value={metrics?.totalReviews ?? total} icon={Star} tone="blue" />
        <MetricCard title="Approved" value={metrics?.approvedReviews ?? "—"} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Pending" value={metrics?.pendingReviews ?? "—"} icon={Clock} tone="amber" />
        <MetricCard title="Avg rating" value={Number(metrics?.avgRating ?? 0).toFixed(1)} icon={Star} tone="violet" />
        <MetricCard title="Reviews (30d)" value={Number(metrics?.reviews30d ?? 0)} icon={Calendar} tone="slate" />
        <MetricCard title="Verified purchase" value={Number(metrics?.verifiedReviews ?? 0)} icon={ShieldCheck} tone="rose" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search title, content or product" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={approval} onValueChange={(v) => setApproval(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rating</Label>
            <Select value={rating} onValueChange={(v) => setRating(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="1">1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchReviews()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedReviews()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllReviews()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DataTable
          table={table as any}
          columns={columns as any}
          getRowClassName={(row: ReviewRow) => (isNew(row.id) ? "bg-amber-50/60" : undefined)}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete review"
        description={deleteTarget ? `This will permanently delete the review for \"${deleteTarget.productName}\".` : "This will permanently delete the selected review."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
