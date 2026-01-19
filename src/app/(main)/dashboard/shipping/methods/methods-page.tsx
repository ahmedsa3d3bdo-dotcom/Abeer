"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getShippingMethodColumns, type ShippingMethodRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function ShippingMethodsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShippingMethodRow[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingMethodRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShippingMethodRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    carrier: "",
    price: "0.00",
    estimatedDays: "",
    isActive: true,
    sortOrder: 0,
    description: "",
  });

  const columns = useMemo(
    () =>
      getShippingMethodColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({
            name: row.name,
            code: row.code,
            carrier: row.carrier || "",
            price: String(row.price),
            estimatedDays: row.estimatedDays != null ? String(row.estimatedDays) : "",
            isActive: row.isActive,
            sortOrder: row.sortOrder,
            description: "",
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
      const res = await fetch(`/api/v1/shipping/methods/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Shipping method deleted");
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

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, pageIndex, pageSize]);

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("isActive", String(status === "active"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/shipping/methods?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load shipping methods");
      setItems((data.data?.items || []).map((p: any) => ({ ...p })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load shipping methods");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", code: "", carrier: "", price: "0.00", estimatedDays: "", isActive: true, sortOrder: 0, description: "" });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        name: form.name,
        code: form.code,
        carrier: form.carrier || null,
        price: form.price,
        estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : null,
        isActive: Boolean(form.isActive),
        sortOrder: Number(form.sortOrder) || 0,
        description: form.description || null,
      };
      const res = await fetch(editing ? `/api/v1/shipping/methods/${editing.id}` : "/api/v1/shipping/methods", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "Method updated" : "Method created");
      setOpen(false);
      resetForm();
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Name, code, carrier" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchItems()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Shipping Method" : "Create Shipping Method"}
            className="sm:max-w-[620px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Method
              </Button>
            }
          >
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Code</Label>
                    <Input value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Carrier</Label>
                    <Input value={form.carrier} onChange={(e) => setForm((s) => ({ ...s, carrier: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Price</Label>
                    <Input value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>ETA (days)</Label>
                    <Input value={form.estimatedDays} onChange={(e) => setForm((s) => ({ ...s, estimatedDays: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 mt-1.5">
                    <Checkbox id="isActive" checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: Boolean(v) }))} />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Sort Order</Label>
                    <Input type="number" value={form.sortOrder} onChange={(e) => setForm((s) => ({ ...s, sortOrder: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
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
        title="Delete shipping method"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected shipping method."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
