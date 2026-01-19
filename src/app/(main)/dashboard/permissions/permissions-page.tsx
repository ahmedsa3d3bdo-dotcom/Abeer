"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, ShieldCheck, Layers, ListChecks, Users, Ban, CalendarPlus, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import { getPermissionColumns, type PermissionRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function PermissionsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PermissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [resource, setResource] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PermissionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    resource: "",
    action: "",
    description: "",
  });

  const [resources, setResources] = useState<string[]>([]);

  const columns = useMemo(
    () =>
      getPermissionColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({
            name: row.name,
            slug: row.slug,
            resource: row.resource,
            action: row.action,
            description: row.description || "",
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
      const res = await fetch(`/api/v1/permissions/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Permission deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchPermissions();
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

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (resource !== "all") params.set("resource", resource);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllPermissionsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: PermissionRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/permissions?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load permissions");
      const batch: PermissionRow[] = (data.data?.items || []).map((p: any) => ({ ...p, createdAt: p.createdAt }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  function renderPermissionsPrint(rows: PermissionRow[], title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-5">Permission</div>
            <div className="col-span-5">Scope</div>
            <div className="col-span-2">Created</div>
          </div>
          {rows.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-5">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.slug}</div>
              </div>
              <div className="col-span-5">{p.resource}.{p.action}</div>
              <div className="col-span-2">{p.createdAt ? new Date(p.createdAt as any).toLocaleDateString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedPermissions() {
    const selected = (table as any).getSelectedRowModel?.().rows?.map((r: any) => r.original as PermissionRow) || [];
    if (!selected.length) {
      toast.error("Select at least one permission to print");
      return;
    }
    void print(renderPermissionsPrint(selected, "Permissions (Selected)"));
  }

  async function printAllPermissions() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllPermissionsMatchingFilters();
      setPrintPreparing(false);
      void print(renderPermissionsPrint(all, "Permissions"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  useEffect(() => {
    void fetchResources();
  }, []);

  useEffect(() => {
    void fetchPermissions();
    void fetchMetrics();
  }, [q, resource, pageIndex, pageSize]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (resource !== "all") params.set("resource", resource);
      const res = await fetch(`/api/v1/permissions/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchResources() {
    try {
      const res = await fetch("/api/v1/permissions/resources");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load resources");
      setResources(data.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load resources");
    }
  }

  async function fetchPermissions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (resource !== "all") params.set("resource", resource);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/permissions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load permissions");
      setItems((data.data?.items || []).map((p: any) => ({ ...p, createdAt: p.createdAt })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", slug: "", resource: "", action: "", description: "" });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        resource: form.resource,
        action: form.action,
        description: form.description || null,
      };
      const res = await fetch(editing ? `/api/v1/permissions/${editing.id}` : "/api/v1/permissions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "Permission updated" : "Permission created");
      setOpen(false);
      resetForm();
      void fetchPermissions();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total permissions" value={metrics?.totalPermissions ?? total} icon={ShieldCheck} tone="blue" />
        <MetricCard title="Resources" value={Number(metrics?.distinctResources ?? 0)} icon={Layers} tone="violet" />
        <MetricCard title="Actions" value={Number(metrics?.distinctActions ?? 0)} icon={ListChecks} tone="amber" />
        <MetricCard title="Assigned to roles" value={Number(metrics?.assignedToRoles ?? 0)} icon={Users} tone="emerald" />
        <MetricCard title="Unassigned" value={Number(metrics?.unassignedCount ?? 0)} icon={Ban} tone="rose" />
        <MetricCard title="New (30d)" value={Number(metrics?.newPermissions30d ?? 0)} icon={CalendarPlus} tone="blue" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Resource</Label>
            <Select value={resource} onValueChange={(v) => setResource(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchPermissions()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedPermissions()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllPermissions()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Permission" : "Create Permission"}
            className="sm:max-w-[520px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Permission
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
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Resource</Label>
                  <Input value={form.resource} onChange={(e) => setForm((s) => ({ ...s, resource: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Action</Label>
                  <Input value={form.action} onChange={(e) => setForm((s) => ({ ...s, action: e.target.value }))} />
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

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete permission"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.slug}\".` : "This will permanently delete the selected permission."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
