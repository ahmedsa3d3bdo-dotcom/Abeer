"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Package, CheckCircle2, Star, AlertTriangle, Ban, DollarSign, BarChart3, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

import { getProductColumns, type ProductRow } from "./columns";
import { ProductImageGallery } from "./product-image-gallery";

const DEFAULT_LIMIT = 10;

export default function ProductsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const num = useMemo(
    () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [],
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [featured, setFeatured] = useState<string>("all");
  const [onSale, setOnSale] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftImages, setDraftImages] = useState<Array<{ id: string; url: string; altText?: string | null; isPrimary?: boolean }>>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    serialNumber: "",
    specMaterial: "",
    specColor: "",
    specDimensions: "",
    specStyle: "",
    specIdealFor: "",
    price: "0.00",
    costPerItem: "",
    compareAtPrice: "",
    status: "draft",
    stockStatus: "in_stock",
    trackInventory: true,
    isFeatured: false,
    allowReviews: true,
    description: "",
    shortDescription: "",
    stockQuantity: 0,
    addStockQuantity: 0,
    categoryId: "none",
  });

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/v1/categories?page=1&limit=100`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const items = (data.data?.items || []).map((c: any) => ({ id: c.id, name: c.name }));
        setCategories(items);
      }
    } catch {}
  }

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (stockStatus !== "all") params.set("stockStatus", stockStatus);
    if (featured !== "all") params.set("isFeatured", String(featured === "yes"));
    if (onSale !== "all") params.set("onSale", String(onSale === "yes"));
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllProductsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: ProductRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load products");
      const batch: ProductRow[] = (data.data?.items || []).map((p: any) => ({ ...p }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllProducts() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllProductsMatchingFilters();
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Products</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-5">Product</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Price</div>
            </div>
            {all.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-5">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</div>
                </div>
                <div className="col-span-3">{(p.categoryNames || []).length ? (p.categoryNames || []).join(", ") : "—"}</div>
                <div className="col-span-2 capitalize">{p.status}</div>
                <div className="col-span-2 text-right">${p.price}</div>
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

  async function printSelectedProducts() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one product to print");
      return;
    }

    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/products/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load product ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Products (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-5">Product</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Price</div>
            </div>
            {details.map((p: any) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-5">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</div>
                </div>
                <div className="col-span-3">{Array.isArray(p.categoryNames) && p.categoryNames.length ? p.categoryNames.join(", ") : "—"}</div>
                <div className="col-span-2 capitalize">{p.status}</div>
                <div className="col-span-2 text-right">${String(p.price ?? "")}</div>
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
      if (status !== "all") params.set("status", status);
      if (stockStatus !== "all") params.set("stockStatus", stockStatus);
      if (featured !== "all") params.set("isFeatured", String(featured === "yes"));
      if (onSale !== "all") params.set("onSale", String(onSale === "yes"));
      const res = await fetch(`/api/v1/products/metrics?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchProductDetail(id: string) {
    try {
      const res = await fetch(`/api/v1/products/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      const p = data.data || {};
      const catId = Array.isArray(p.categoryIds) && p.categoryIds.length ? p.categoryIds[0] : "none";
      setForm((s) => ({
        ...s,
        serialNumber: p.serialNumber || "",
        specMaterial: p.specMaterial || "",
        specColor: p.specColor || "",
        specDimensions: p.specDimensions || "",
        specStyle: p.specStyle || "",
        specIdealFor: p.specIdealFor || "",
        description: p.description || "",
        shortDescription: p.shortDescription || "",
        compareAtPrice: typeof p.compareAtPrice === "string" && p.compareAtPrice ? p.compareAtPrice : "",
        costPerItem: typeof p.costPerItem === "string" && p.costPerItem ? p.costPerItem : "",
        stockQuantity: typeof p.quantity === "number" ? p.quantity : 0,
        addStockQuantity: 0,
        categoryId: catId,
      }));
    } catch {}
  }

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit: (row) => {
          setEditing(row);
          // Prefill basic fields; details (quantity/categories) fetched below
          setForm((s) => ({
            ...s,
            name: row.name,
            slug: row.slug,
            sku: row.sku || "",
            price: String(row.price),
            compareAtPrice: (row as any).compareAtPrice ? String((row as any).compareAtPrice) : "",
            costPerItem: (row as any).costPerItem ? String((row as any).costPerItem) : "",
            status: row.status,
            stockStatus: row.stockStatus,
            isFeatured: row.isFeatured,
            addStockQuantity: 0,
          }));
          setOpen(true);
          void fetchProductDetail(row.id);
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
      const res = await fetch(`/api/v1/products/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Product deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchProducts();
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
    void fetchProducts();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, stockStatus, featured, onSale, pageIndex, pageSize]);

  useEffect(() => {
    void fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (stockStatus !== "all") params.set("stockStatus", stockStatus);
      if (featured !== "all") params.set("isFeatured", String(featured === "yes"));
      if (onSale !== "all") params.set("onSale", String(onSale === "yes"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load products");
      setItems((data.data?.items || []).map((p: any) => ({ ...p })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", slug: "", sku: "", serialNumber: "", specMaterial: "", specColor: "", specDimensions: "", specStyle: "", specIdealFor: "", price: "0.00", costPerItem: "", compareAtPrice: "", status: "draft", stockStatus: "in_stock", trackInventory: true, isFeatured: false, allowReviews: true, description: "", shortDescription: "", stockQuantity: 0, addStockQuantity: 0, categoryId: "none" });
    setDraftImages([]);
  }

  async function onSubmit() {
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug || undefined,
        sku: form.sku || undefined,
        serialNumber: form.serialNumber?.trim() ? form.serialNumber.trim() : null,
        specMaterial: form.specMaterial?.trim() ? form.specMaterial.trim() : null,
        specColor: form.specColor?.trim() ? form.specColor.trim() : null,
        specDimensions: form.specDimensions?.trim() ? form.specDimensions.trim() : null,
        specStyle: form.specStyle?.trim() ? form.specStyle.trim() : null,
        specIdealFor: form.specIdealFor?.trim() ? form.specIdealFor.trim() : null,
        price: form.price,
        costPerItem: form.costPerItem?.trim() ? form.costPerItem : null,
        compareAtPrice: form.compareAtPrice?.trim() ? form.compareAtPrice : null,
        status: form.status,
        stockStatus: form.stockStatus,
        trackInventory: Boolean(form.trackInventory),
        isFeatured: Boolean(form.isFeatured),
        allowReviews: Boolean(form.allowReviews),
        description: form.description || null,
        shortDescription: form.shortDescription || null,
        ...(editing
          ? { addStockQuantity: Number.isFinite(form.addStockQuantity) ? Number(form.addStockQuantity) : 0 }
          : { stockQuantity: Number.isFinite(form.stockQuantity) ? Number(form.stockQuantity) : 0 }),
        categoryIds: form.categoryId && form.categoryId !== "none" ? [form.categoryId] : undefined,
      };
      const creating = !editing;
      const res = await fetch(creating ? "/api/v1/products" : `/api/v1/products/${editing.id}` , {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      const newId: string | undefined = creating ? data?.data?.id : editing?.id;
      if (creating && newId && draftImages.length) {
        try {
          const items = draftImages.map((it) => ({ url: it.url, altText: it.altText ?? null }));
          const addRes = await fetch(`/api/v1/products/${newId}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          // best-effort: don't block modal close on failure
          if (!addRes.ok) {
            // ignore error details here per request to avoid chatter
          }
        } catch {}
      }
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false);
      resetForm();
      void fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total products" value={metrics?.totalProducts ?? total} icon={Package} tone="blue" />
        <MetricCard title="Active" value={metrics?.activeProducts ?? "—"} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Featured" value={metrics?.featuredProducts ?? "—"} icon={Star} tone="violet" />
        <MetricCard title="Low stock" value={metrics?.lowStockProducts ?? "—"} icon={AlertTriangle} tone="amber" />
        <MetricCard title="Out of stock" value={metrics?.outOfStockProducts ?? "—"} icon={Ban} tone="rose" />
        <MetricCard title="Avg price" value={num.format(Number(metrics?.avgPrice ?? 0))} icon={DollarSign} tone="slate" />
        <MetricCard title="Total Sales (30d)" value={num.format(Number(metrics?.revenue30d ?? 0))} icon={DollarSign} tone="emerald" />
        <MetricCard title="Units sold (30d)" value={Number(metrics?.unitsSold30d ?? 0)} icon={BarChart3} tone="amber" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Name, SKU or slug" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Stock</Label>
            <Select value={stockStatus} onValueChange={(v) => setStockStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
                <SelectItem value="preorder">Preorder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Featured</Label>
            <Select value={featured} onValueChange={(v) => setFeatured(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>On sale</Label>
            <Select value={onSale} onValueChange={(v) => setOnSale(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchProducts()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedProducts()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllProducts()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Product" : "Create Product"}
            className="sm:max-w-[920px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Product
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>S/N</Label>
                  <Input value={form.serialNumber} onChange={(e) => setForm((s) => ({ ...s, serialNumber: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Price</Label>
                  <Input value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Cost per item</Label>
                  <Input
                    placeholder="Optional"
                    value={form.costPerItem}
                    onChange={(e) => setForm((s) => ({ ...s, costPerItem: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Compare at price</Label>
                  <Input
                    placeholder="Optional"
                    value={form.compareAtPrice}
                    onChange={(e) => setForm((s) => ({ ...s, compareAtPrice: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-3 ${editing ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                <div className="flex flex-col gap-1.5">
                  <Label>Stock</Label>
                  <Select value={form.stockStatus} onValueChange={(v) => setForm((s) => ({ ...s, stockStatus: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In stock</SelectItem>
                      <SelectItem value="low_stock">Low stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      <SelectItem value="preorder">Preorder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editing ? (
                  <div className="flex flex-col gap-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.stockQuantity}
                      onChange={(e) => setForm((s) => ({ ...s, stockQuantity: Number(e.target.value || 0) }))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label>Quantity</Label>
                      <Input type="number" value={form.stockQuantity} disabled className="opacity-70" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Add stock</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.addStockQuantity}
                        onChange={(e) => setForm((s) => ({ ...s, addStockQuantity: Number(e.target.value || 0) }))}
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm((s) => ({ ...s, categoryId: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Checkbox id="isFeatured" checked={form.isFeatured} onCheckedChange={(v) => setForm((s) => ({ ...s, isFeatured: Boolean(v) }))} />
                  <Label htmlFor="isFeatured">Featured</Label>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Checkbox id="allowReviews" checked={form.allowReviews} onCheckedChange={(v) => setForm((s) => ({ ...s, allowReviews: Boolean(v) }))} />
                  <Label htmlFor="allowReviews">Allow reviews</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Material</Label>
                  <Input value={form.specMaterial} onChange={(e) => setForm((s) => ({ ...s, specMaterial: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Color</Label>
                  <Input value={form.specColor} onChange={(e) => setForm((s) => ({ ...s, specColor: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Dimensions</Label>
                  <Input value={form.specDimensions} onChange={(e) => setForm((s) => ({ ...s, specDimensions: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Style</Label>
                  <Input value={form.specStyle} onChange={(e) => setForm((s) => ({ ...s, specStyle: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Ideal For</Label>
                  <Input value={form.specIdealFor} onChange={(e) => setForm((s) => ({ ...s, specIdealFor: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Short Description</Label>
                  <Textarea
                    value={form.shortDescription}
                    onChange={(e) => setForm((s) => ({ ...s, shortDescription: e.target.value }))}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    className="min-h-[160px]"
                  />
                </div>
              </div>
              <div className="mt-2">
                <ProductImageGallery productId={editing?.id} onDraftChange={setDraftImages} />
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
        title="Delete product"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected product."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
