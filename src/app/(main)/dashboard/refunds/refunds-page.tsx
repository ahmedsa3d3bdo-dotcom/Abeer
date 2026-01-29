"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCcw, DollarSign, CheckCircle2, Clock, Cog, Layers, Download } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getRefundColumns, type RefundRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function RefundsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RefundRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RefundRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    amount: "0.00",
    currency: "CAD",
    reason: "",
    status: "pending",
  });
  const [orderItems, setOrderItems] = useState<Array<{ id: string; productName: string; quantity: number; unitPrice: string }>>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderOptions, setOrderOptions] = useState<Array<{ id: string; orderNumber: string; customerEmail?: string | null }>>([]);
  const [orderLabel, setOrderLabel] = useState<string>("");

  const columns = useMemo(
    () =>
      getRefundColumns({
        onApprove: async (row) => {
          try {
            const res = await fetch(`/api/v1/refunds/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "approved" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Approve failed");
            toast.success("Refund approved");
            void fetchItems();
          } catch (e: any) {
            toast.error(e.message || "Approve failed");
          }
        },
        onProcess: async (row) => {
          try {
            const res = await fetch(`/api/v1/refunds/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "processed" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Process failed");
            toast.success("Refund processed");
            void fetchItems();
          } catch (e: any) {
            toast.error(e.message || "Process failed");
          }
        },
        onEdit: (row) => {
          setEditing(row);
          setForm({
            orderId: row.orderId,
            amount: String(row.amount),
            currency: row.currency,
            reason: row.reason || "",
            status: row.status,
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
      const res = await fetch(`/api/v1/refunds/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Refund deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchItems();
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



  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/v1/refunds/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch { }
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
      const res = await fetch(`/api/v1/refunds?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load refunds");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load refunds");
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
        const items = (data.data.items as any[]).map((it) => ({ id: it.id, productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice }));
        setOrderItems(items);
        // Initialize selection map to zeros
        const initSel: Record<string, number> = {};
        for (const it of items) initSel[it.id] = 0;
        setSelected(initSel);
      }
    } catch { }
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
    } catch { }
  }

  // Auto-calc refund amount when selection changes
  useEffect(() => {
    const total = Object.entries(selected).reduce((sum, [id, qty]) => {
      const oi = orderItems.find((x) => x.id === id);
      if (!oi || qty <= 0) return sum;
      const clamped = Math.min(qty, oi.quantity);
      const unit = parseFloat(oi.unitPrice || "0");
      return sum + unit * clamped;
    }, 0);
    setForm((s) => ({ ...s, amount: total.toFixed(2) }));
  }, [selected, orderItems]);

  function resetForm() {
    setEditing(null);
    setForm({ orderId: "", amount: "0.00", currency: "CAD", reason: "", status: "pending" });
    setOrderItems([]);
    setSelected({});
  }

  async function onSubmit() {
    try {
      const payload: any = {
        orderId: form.orderId,
        amount: form.amount,
        currency: form.currency,
        reason: form.reason || null,
        status: form.status,
        items: Object.entries(selected)
          .filter(([_, qty]) => qty > 0)
          .map(([orderItemId, qty]) => {
            const oi = orderItems.find((x) => x.id === orderItemId);
            const maxQty = oi ? oi.quantity : qty;
            const clamped = Math.min(qty, maxQty);
            const unit = oi ? parseFloat(oi.unitPrice || "0") : 0;
            return { orderItemId, quantity: clamped, amount: (unit * clamped).toFixed(2) };
          }),
      };
      const res = await fetch(editing ? `/api/v1/refunds/${editing.id}` : "/api/v1/refunds", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(`Refund ${editing ? "updated" : "created"}`);
      setOpen(false);
      resetForm();
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total refunds" value={metrics?.totalRefunds ?? total} icon={Layers} tone="blue" />
        <MetricCard title="Total amount" value={formatCurrency(Number(metrics?.totalAmount ?? 0), { currency: metrics?.currency || "CAD", locale: "en-CA" })} icon={DollarSign} tone="emerald" />
        <MetricCard title="Avg amount" value={formatCurrency(Number(metrics?.avgAmount ?? 0), { currency: metrics?.currency || "CAD", locale: "en-CA" })} icon={DollarSign} tone="slate" />
        <MetricCard title="Approved" value={Number(metrics?.approvedCount ?? 0)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Processed" value={Number(metrics?.processedCount ?? 0)} icon={Cog} tone="violet" />
        <MetricCard title="Pending" value={Number(metrics?.pendingCount ?? 0)} icon={Clock} tone="amber" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search order number or ID" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchItems()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <Link href="/dashboard/refunds/export">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </Link>

          <FormModal
            open={open}
            onOpenChange={(v) => (v ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Refund" : "New Refund"}
            className="max-w-2xl"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Refund
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
                <Label>Amount</Label>
                <Input value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} />
              </div>
              {orderItems.length > 0 && (
                <div className="sm:col-span-2">
                  <Label>Items to Refund</Label>
                  <div className="mt-2 max-h-56 overflow-auto rounded border p-2">
                    <div className="grid grid-cols-1 gap-2">
                      {orderItems.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{it.productName}</div>
                            <div className="text-muted-foreground text-xs">Qty: {it.quantity} • Unit: ${it.unitPrice}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Refund Qty</Label>
                            <Input
                              className="w-20"
                              type="number"
                              min={0}
                              max={it.quantity}
                              value={selected[it.id] ?? 0}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(Number(e.target.value || 0), it.quantity));
                                setSelected((s) => ({ ...s, [it.id]: v }));
                              }}
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
        title="Delete refund"
        description={deleteTarget ? `This will permanently delete refund ${deleteTarget.id}.` : "This will permanently delete the selected refund."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
