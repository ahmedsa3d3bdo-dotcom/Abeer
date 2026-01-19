"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Truck, CheckCircle2, Clock, Navigation, Package, XCircle, Reply, Calendar, Printer } from "lucide-react";
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
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getShipmentColumns, type ShipmentRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function ShipmentsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShipmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShipmentRow | null>(null);
  const [form, setForm] = useState({ status: "pending", trackingNumber: "", carrier: "", notes: "" });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShipmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { isNew } = useNewNotifications({ type: "shipment_created", limit: 200 });

  const columns = useMemo(
    () =>
      getShipmentColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({ status: row.status, trackingNumber: row.trackingNumber || "", carrier: row.carrier || "", notes: "" });
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
      const res = await fetch(`/api/v1/shipments/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Shipment deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllShipmentsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: ShipmentRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/shipments?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load shipments");
      const batch: ShipmentRow[] = (data.data?.items || []).map((s: any) => ({ ...s }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllShipments() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllShipmentsMatchingFilters();
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Shipments</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-3">Order</div>
              <div className="col-span-3">Method</div>
              <div className="col-span-2">Tracking</div>
              <div className="col-span-2">Carrier</div>
              <div className="col-span-2">Status</div>
            </div>
            {all.map((s) => (
              <div key={s.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-3 font-medium">#{s.orderNumber || "—"}</div>
                <div className="col-span-3">{s.methodName || "—"}</div>
                <div className="col-span-2">{s.trackingNumber || "—"}</div>
                <div className="col-span-2">{s.carrier || "—"}</div>
                <div className="col-span-2 capitalize">{s.status}</div>
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

  async function printSelectedShipments() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one shipment to print");
      return;
    }
    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/shipments/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load shipment ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Shipments (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-3">Order</div>
              <div className="col-span-3">Method</div>
              <div className="col-span-2">Tracking</div>
              <div className="col-span-2">Carrier</div>
              <div className="col-span-2">Status</div>
            </div>
            {details.map((s: any) => (
              <div key={s.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-3 font-medium">#{s.orderNumber || "—"}</div>
                <div className="col-span-3">{s.methodName || "—"}</div>
                <div className="col-span-2">{s.trackingNumber || "—"}</div>
                <div className="col-span-2">{s.carrier || "—"}</div>
                <div className="col-span-2 capitalize">{s.status}</div>
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
    void fetchItems();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, dateFrom, dateTo, pageIndex, pageSize]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/v1/shipments/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/shipments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load shipments");
      setItems((data.data?.items || []).map((o: any) => ({ ...o })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    if (!editing) return;
    try {
      const payload: any = {
        status: form.status,
        trackingNumber: form.trackingNumber || null,
        carrier: form.carrier || null,
        notes: form.notes || null,
      };
      const res = await fetch(`/api/v1/shipments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Update failed");
      toast.success("Shipment updated");
      setOpen(false);
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total shipments" value={metrics?.totalShipments ?? total} icon={Truck} tone="blue" />
        <MetricCard title="Pending" value={Number(metrics?.pendingCount ?? 0)} icon={Clock} tone="amber" />
        <MetricCard title="Processing" value={Number(metrics?.processingCount ?? 0)} icon={Navigation} tone="violet" />
        <MetricCard title="In transit" value={Number(metrics?.inTransitCount ?? 0)} icon={Navigation} tone="slate" />
        <MetricCard title="Out for delivery" value={Number(metrics?.outForDeliveryCount ?? 0)} icon={Package} tone="amber" />
        <MetricCard title="Delivered" value={Number(metrics?.deliveredCount ?? 0)} icon={CheckCircle2} tone="emerald" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Failed" value={Number(metrics?.failedCount ?? 0)} icon={XCircle} tone="rose" />
        <MetricCard title="Returned" value={Number(metrics?.returnedCount ?? 0)} icon={Reply} tone="amber" />
        <MetricCard title="Shipped (30d)" value={Number(metrics?.shipped30d ?? 0)} icon={Calendar} tone="blue" />
        <MetricCard title="Delivered (30d)" value={Number(metrics?.delivered30d ?? 0)} icon={CheckCircle2} tone="emerald" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Tracking, order number, carrier" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
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
              <DropdownMenuItem onClick={() => void printSelectedShipments()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllShipments()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DataTable
          table={table as any}
          columns={columns as any}
          getRowClassName={(row: ShipmentRow) => (isNew(row.id) ? "bg-amber-50/60" : undefined)}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      {/* Edit dialog */}
      <FormModal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), setEditing(null)))}
        title="Update Shipment"
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
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tracking Number</Label>
                <Input value={form.trackingNumber} onChange={(e) => setForm((s) => ({ ...s, trackingNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Carrier</Label>
                <Input value={form.carrier} onChange={(e) => setForm((s) => ({ ...s, carrier: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
            </div>
          </div>
      </FormModal>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete shipment"
        description={deleteTarget ? `This will permanently delete shipment for order #${deleteTarget.orderNumber || deleteTarget.id}.` : "This will permanently delete the selected shipment."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
