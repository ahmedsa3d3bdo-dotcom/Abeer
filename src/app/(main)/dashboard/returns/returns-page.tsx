"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Layers, CheckCircle2, Clock, Package, DollarSign, XCircle, Ban, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrint } from "@/components/common/print/print-provider";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getReturnColumns, type ReturnRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function ReturnsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReturnRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReturnRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    rmaNumber: "",
    status: "requested",
    reason: "",
    notes: "",
  });
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderOptions, setOrderOptions] = useState<Array<{ id: string; orderNumber: string; customerEmail?: string | null }>>([]);
  const [orderLabel, setOrderLabel] = useState<string>("");
  const [orderItems, setOrderItems] = useState<Array<{ id: string; productName: string; quantity: number }>>([]);
  const [selected, setSelected] = useState<Record<string, { qty: number; reason: string }>>({});

  const columns = useMemo(
    () =>
      getReturnColumns({
        onApprove: async (row) => {
          try {
            const res = await fetch(`/api/v1/returns/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "approved" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Approve failed");
            toast.success("Return approved");
            void fetchItems();
          } catch (e: any) {
            toast.error(e.message || "Approve failed");
          }
        },
        onReceive: async (row) => {
          try {
            const res = await fetch(`/api/v1/returns/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "received" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Mark received failed");
            toast.success("Return marked as received");
            void fetchItems();
          } catch (e: any) {
            toast.error(e.message || "Mark received failed");
          }
        },
        onEdit: (row) => {
          setEditing(row);
          setForm({
            orderId: row.orderId,
            rmaNumber: row.rmaNumber,
            status: row.status,
            reason: "",
            notes: "",
          });
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
      const res = await fetch(`/api/v1/returns/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Return deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchItems();
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
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/v1/returns/metrics?${params.toString()}`);
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
    if (status !== "all") params.set("status", status);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllReturnsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: ReturnRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/returns?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load returns");
      const batch: ReturnRow[] = (data.data?.items || []).map((r: any) => ({ ...r }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllReturns() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllReturnsMatchingFilters();
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Returns</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-4">Order / RMA</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Requested</div>
              <div className="col-span-2">Approved</div>
              <div className="col-span-2">Received</div>
            </div>
            {all.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{r.orderNumber || r.orderId}</div>
                  <div className="text-xs text-muted-foreground">RMA: {r.rmaNumber}</div>
                </div>
                <div className="col-span-2 capitalize">{String(r.status)}</div>
                <div className="col-span-2">{r.requestedAt ? new Date(r.requestedAt as any).toLocaleString() : "—"}</div>
                <div className="col-span-2">{r.approvedAt ? new Date(r.approvedAt as any).toLocaleString() : "—"}</div>
                <div className="col-span-2">{r.receivedAt ? new Date(r.receivedAt as any).toLocaleString() : "—"}</div>
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

  async function printSelectedReturns() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one return to print");
      return;
    }

    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/returns/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load return ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Returns (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-4">Order / RMA</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-6">Notes</div>
            </div>
            {details.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{r.orderNumber || r.orderId}</div>
                  <div className="text-xs text-muted-foreground">RMA: {r.rmaNumber}</div>
                </div>
                <div className="col-span-2 capitalize">{String(r.status)}</div>
                <div className="col-span-6">{r.notes || r.reason || "—"}</div>
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

  useEffect(() => {
    void fetchItems();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, pageIndex, pageSize]);

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/returns?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load returns");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderItems() {
    try {
      if (!form.orderId) return;
      const res = await fetch(`/api/v1/orders/${form.orderId}/details`);
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        const items = (data.data.items as any[]).map((it) => ({ id: it.id, productName: it.productName, quantity: it.quantity }));
        setOrderItems(items);
        const initSel: Record<string, { qty: number; reason: string }> = {};
        for (const it of items) initSel[it.id] = { qty: 0, reason: "" };
        setSelected(initSel);
      }
    } catch {}
  }

  async function fetchOrders(q: string) {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "10");
      const res = await fetch(`/api/v1/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrderOptions((data.data?.items || []).map((o: any) => ({ id: o.id, orderNumber: o.orderNumber, customerEmail: o.customerEmail })));
      }
    } catch {}
  }

  function resetForm() {
    setEditing(null);
    setForm({ orderId: "", rmaNumber: "", status: "requested", reason: "", notes: "" });
    setOrderItems([]);
    setSelected({});
  }

  async function onSubmit() {
    try {
      const payload: any = {
        orderId: form.orderId,
        rmaNumber: form.rmaNumber,
        status: form.status,
        reason: form.reason || null,
        notes: form.notes || null,
        items: Object.entries(selected)
          .filter(([_, v]) => (v?.qty || 0) > 0)
          .map(([orderItemId, v]) => {
            const oi = orderItems.find((x) => x.id === orderItemId);
            const maxQty = oi ? oi.quantity : v.qty;
            const clamped = Math.min(v.qty, maxQty);
            return { orderItemId, quantity: clamped, reason: v.reason || null };
          }),
      };
      const res = await fetch(editing ? `/api/v1/returns/${editing.id}` : "/api/v1/returns", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(`Return ${editing ? "updated" : "created"}`);
      setOpen(false);
      resetForm();
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total returns" value={metrics?.totalReturns ?? total} icon={Layers} tone="blue" />
        <MetricCard title="Requested" value={Number(metrics?.requestedCount ?? 0)} icon={Clock} tone="amber" />
        <MetricCard title="Approved" value={Number(metrics?.approvedCount ?? 0)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Received" value={Number(metrics?.receivedCount ?? 0)} icon={Package} tone="violet" />
        <MetricCard title="Refunded" value={Number(metrics?.refundedCount ?? 0)} icon={DollarSign} tone="slate" />
        <MetricCard title="Rejected / Cancelled" value={Number(metrics?.rejectedCount ?? 0) + Number(metrics?.cancelledCount ?? 0)} icon={Ban} tone="rose" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search order number, RMA or ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchItems()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedReturns()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllReturns()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(v) => (v ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Return" : "New Return"}
            className="max-w-xl"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Return
              </Button>
            }
          >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Order</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={orderLabel || form.orderId} placeholder="Select an order" />
                    <Button type="button" variant="outline" onClick={() => { setOrderPickerOpen(true); void fetchOrders(orderSearch); }}>Select Order</Button>
                  </div>
                  <CommandDialog open={orderPickerOpen} onOpenChange={(v) => setOrderPickerOpen(v)}>
                    <CommandInput value={orderSearch} onValueChange={(v) => { setOrderSearch(v); void fetchOrders(v); }} placeholder="Search orders by number or email..." />
                    <CommandList>
                      <CommandEmpty>No orders found.</CommandEmpty>
                      <CommandGroup heading="Orders">
                        {orderOptions.map((o) => (
                          <CommandItem key={o.id} value={`${o.orderNumber} ${o.customerEmail || ""}`} onSelect={() => {
                            setForm((s) => ({ ...s, orderId: o.id }));
                            setOrderLabel(o.orderNumber);
                            setOrderPickerOpen(false);
                            void fetchOrderItems();
                          }}>
                            <div className="flex flex-col">
                              <span className="font-medium">{o.orderNumber}</span>
                              {o.customerEmail ? (<span className="text-muted-foreground text-xs">{o.customerEmail}</span>) : null}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </CommandDialog>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>RMA Number</Label>
                  <Input value={form.rmaNumber} onChange={(e) => setForm((s) => ({ ...s, rmaNumber: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Reason</Label>
                  <Input value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
                </div>
                {orderItems.length > 0 && (
                  <div className="sm:col-span-2">
                    <Label>Items to Return</Label>
                    <div className="mt-2 max-h-56 overflow-auto rounded border p-2">
                      <div className="grid grid-cols-1 gap-2">
                        {orderItems.map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{it.productName}</div>
                              <div className="text-muted-foreground text-xs">Qty: {it.quantity}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                className="w-20"
                                type="number"
                                min={0}
                                max={it.quantity}
                                value={selected[it.id]?.qty ?? 0}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(Number(e.target.value || 0), it.quantity));
                                  setSelected((s) => ({ ...s, [it.id]: { qty: v, reason: s[it.id]?.reason || "" } }));
                                }}
                              />
                              <Label className="text-xs">Reason</Label>
                              <Input
                                className="w-48"
                                value={selected[it.id]?.reason ?? ""}
                                onChange={(e) => setSelected((s) => ({ ...s, [it.id]: { qty: s[it.id]?.qty || 0, reason: e.target.value } }))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </FormModal>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete return"
        description={deleteTarget ? `This will permanently delete return \"${deleteTarget.rmaNumber}\".` : "This will permanently delete the selected return."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
