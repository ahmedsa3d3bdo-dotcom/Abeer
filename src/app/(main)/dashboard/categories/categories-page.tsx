"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Upload, Trash2, Layers, CheckCircle2, PauseCircle, FolderTree, GitBranch, Image as ImageIcon, Printer } from "lucide-react";
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

import { getCategoryColumns, type CategoryRow } from "./columns";

const DEFAULT_LIMIT = 10;

type ParentOption = { id: string; name: string };

export default function CategoriesPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all"); // all | active | inactive
  const [parentId, setParentId] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parentId: "root",
    sortOrder: 0,
    isActive: true,
  });

  const columns = useMemo(
    () =>
      getCategoryColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({
            name: row.name,
            slug: row.slug,
            description: row.description || "",
            image: row.image || "",
            parentId: row.parentId || "root",
            sortOrder: row.sortOrder,
            isActive: row.isActive,
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
      const res = await fetch(`/api/v1/categories/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Category deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchCategories();
      void fetchParentOptions();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("isActive", String(status === "active"));
    if (parentId !== "all") params.set("parentId", parentId === "root" ? "null" : parentId);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllCategoriesMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: CategoryRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/categories?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load categories");
      const batch: CategoryRow[] = (data.data?.items || []).map((c: any) => ({ ...c }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllCategories() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllCategoriesMatchingFilters();
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Categories</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-6">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Sort</div>
              <div className="col-span-2">Parent</div>
            </div>
            {all.map((c) => (
              <div key={c.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-6">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug}</div>
                </div>
                <div className="col-span-2">{c.isActive ? "Active" : "Inactive"}</div>
                <div className="col-span-2">{c.sortOrder}</div>
                <div className="col-span-2">{c.parentId ? "Child" : "Root"}</div>
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

  async function printSelectedCategories() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one category to print");
      return;
    }
    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/categories/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load category ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Categories (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-6">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Sort</div>
              <div className="col-span-2">Parent</div>
            </div>
            {details.map((c: any) => (
              <div key={c.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-6">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug}</div>
                </div>
                <div className="col-span-2">{c.isActive ? "Active" : "Inactive"}</div>
                <div className="col-span-2">{c.sortOrder}</div>
                <div className="col-span-2">{c.parentId ? "Child" : "Root"}</div>
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

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("isActive", String(status === "active"));
      if (parentId !== "all") params.set("parentId", parentId === "root" ? "null" : parentId);
      const res = await fetch(`/api/v1/categories/metrics?${params.toString()}`);
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

  useEffect(() => {
    void fetchParentOptions();
  }, []);

  useEffect(() => {
    void fetchCategories();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, parentId, pageIndex, pageSize]);

  async function fetchParentOptions() {
    try {
      const res = await fetch(`/api/v1/categories?page=1&limit=100&sort=createdAt.desc`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load categories");
      setParentOptions((data.data?.items || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
    }
  }

  async function fetchCategories() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("isActive", String(status === "active"));
      if (parentId !== "all") params.set("parentId", parentId === "root" ? "null" : parentId);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/categories?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load categories");
      setItems((data.data?.items || []).map((c: any) => ({ ...c })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", image: "", parentId: "root", sortOrder: 0, isActive: true });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || null,
        image: form.image || null,
        parentId: form.parentId === "root" ? null : form.parentId,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: Boolean(form.isActive),
      };
      const res = await fetch(editing ? `/api/v1/categories/${editing.id}` : "/api/v1/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      resetForm();
      void fetchCategories();
      void fetchParentOptions();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function onFilesSelected(fileList: FileList | File[]) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      setUploading(true);
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const up = await fetch(`/api/v1/uploads`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData?.error?.message || "Upload failed");
      const first = (upData.data?.items || [])[0];
      if (first?.url) {
        setForm((s) => ({ ...s, image: first.url }));
        toast.success("Image uploaded");
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total categories" value={metrics?.totalCategories ?? total} icon={Layers} tone="blue" />
        <MetricCard title="Active" value={metrics?.activeCategories ?? "—"} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Inactive" value={metrics?.inactiveCategories ?? "—"} icon={PauseCircle} tone="slate" />
        <MetricCard title="Root categories" value={metrics?.rootCategories ?? "—"} icon={FolderTree} tone="violet" />
        <MetricCard title="Child categories" value={metrics?.childCategories ?? "—"} icon={GitBranch} tone="amber" />
        <MetricCard title="With image" value={metrics?.withImage ?? "—"} icon={ImageIcon} tone="rose" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <div className="flex flex-col gap-1.5">
            <Label>Parent</Label>
            <Select value={parentId} onValueChange={(v) => setParentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="root">Root only</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchCategories()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedCategories()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllCategories()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Category" : "Create Category"}
            className="sm:max-w-[520px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Category
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
                    <Label>Slug (optional)</Label>
                    <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Parent</Label>
                    <Select value={form.parentId} onValueChange={(v) => setForm((s) => ({ ...s, parentId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Root" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root</SelectItem>
                        {parentOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="flex flex-col gap-1.5">
                  <Label>Image</Label>
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => e.currentTarget.files && onFilesSelected(e.currentTarget.files)}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement) || null;
                        if (input) input.click();
                      }}>
                        <Upload className="mr-1 h-4 w-4" /> Upload
                      </Button>
                    </label>
                    {form.image ? (
                      <Button type="button" variant="destructive" size="sm" onClick={() => setForm((s) => ({ ...s, image: "" }))}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    ) : null}
                  </div>
                  <div
                    className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files || []);
                      if (files.length) void onFilesSelected(files);
                    }}
                  >
                    Drag and drop an image here or use the Upload button above.
                  </div>
                  {form.image ? (
                    <div className="rounded-md border p-2">
                      <div className="relative aspect-[16/9] overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.image} alt="Category" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isActive" checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: Boolean(v) }))} />
                  <Label htmlFor="isActive">Active</Label>
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
        title="Delete category"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected category."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
