"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Shield, BadgeCheck, UserCog, Users, Ban, ListChecks, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

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

import { getRoleColumns, type RoleRow } from "./columns";

type PermissionOption = { id: string; name: string; slug: string; resource: string; action: string };

const DEFAULT_LIMIT = 10;

export default function RolesPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RoleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [isSystem, setIsSystem] = useState<string>("all"); // all|system|custom
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    isSystem: false,
    permissions: [] as string[],
  });

  const [allPermissions, setAllPermissions] = useState<PermissionOption[]>([]);

  const columns = useMemo(
    () =>
      getRoleColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({
            name: row.name,
            slug: row.slug,
            description: row.description || "",
            isSystem: row.isSystem,
            permissions: (row.permissions || []).map((p) => p.slug),
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
      const res = await fetch(`/api/v1/roles/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Role deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchRoles();
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
    void fetchAllPermissions();
  }, []);

  useEffect(() => {
    void fetchRoles();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isSystem, pageIndex, pageSize]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSystem !== "all") params.set("isSystem", String(isSystem === "system"));
      const res = await fetch(`/api/v1/roles/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchAllPermissions() {
    try {
      const res = await fetch("/api/v1/roles/permissions");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load permissions");
      setAllPermissions(data.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load permissions");
    }
  }

  async function fetchRoles() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isSystem !== "all") params.set("isSystem", String(isSystem === "system"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/roles?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load roles");
      setItems((data.data?.items || []).map((r: any) => ({ ...r, createdAt: r.createdAt })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", isSystem: false, permissions: [] });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        isSystem: form.isSystem,
        permissions: form.permissions,
      };
      const res = await fetch(editing ? `/api/v1/roles/${editing.id}` : "/api/v1/roles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "Role updated" : "Role created");
      setOpen(false);
      resetForm();
      void fetchRoles();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total roles" value={metrics?.totalRoles ?? total} icon={Shield} tone="blue" />
        <MetricCard title="System" value={Number(metrics?.systemCount ?? 0)} icon={BadgeCheck} tone="violet" />
        <MetricCard title="Custom" value={Number(metrics?.customCount ?? 0)} icon={UserCog} tone="slate" />
        <MetricCard title="With users" value={Number(metrics?.withUsers ?? 0)} icon={Users} tone="emerald" />
        <MetricCard title="No permissions" value={Number(metrics?.rolesNoPermissions ?? 0)} icon={Ban} tone="rose" />
        <MetricCard title="Avg perms/role" value={Number(metrics?.avgPermissionsPerRole ?? 0).toFixed(1)} icon={ListChecks} tone="amber" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <MetricCard title="New roles (30d)" value={Number(metrics?.newRoles30d ?? 0)} icon={CalendarPlus} tone="blue" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search role or slug" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={isSystem} onValueChange={(v) => setIsSystem(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchRoles()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Role" : "Create Role"}
            className="sm:max-w-[640px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Role
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
                    <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} disabled={!!editing?.isSystem} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isSystem" checked={form.isSystem} onCheckedChange={(v) => setForm((s) => ({ ...s, isSystem: Boolean(v) }))} />
                  <Label htmlFor="isSystem">System role</Label>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Permissions</Label>
                  <div className="max-h-64 overflow-auto rounded-md border p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {allPermissions.map((p) => {
                        const checked = form.permissions.includes(p.slug);
                        return (
                          <label key={p.slug} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setForm((s) => ({
                                  ...s,
                                  permissions: v ? [...s.permissions, p.slug] : s.permissions.filter((x) => x !== p.slug),
                                }))
                              }
                            />
                            <span className="capitalize">{p.resource}.{p.action}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
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
        title="Delete role"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected role."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
