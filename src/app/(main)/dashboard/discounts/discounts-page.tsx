"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, X, Layers, CheckCircle2, Clock, Archive, Users, DollarSign, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { formatCurrency } from "@/lib/utils";
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

import { getDiscountColumns, type DiscountRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function DiscountsPage() {
  const getKindLabel = (row: any) => {
    const isAutomatic = Boolean(row?.isAutomatic);
    if (!isAutomatic) return "Coupon";
    const md: any = row?.metadata || null;
    const offerKind = String(md?.offerKind || "");
    const kind = String(md?.kind || "");
    if (offerKind === "bundle") return "Bundle offer";
    if (offerKind === "bxgy_generic") return "BXGY generic";
    if (offerKind === "bxgy_bundle") return "BXGY bundle";
    if (kind === "offer" || offerKind === "standard") return "Scheduled offer";
    if (kind === "deal") return "Deal";
    return "Automatic";
  };

  const inferDiscountKind = (row: any) => {
    const isAutomatic = Boolean(row?.isAutomatic);
    if (!isAutomatic) return "coupon" as const;
    const md: any = row?.metadata || null;
    const offerKind = String(md?.offerKind || "");
    const kind = String(md?.kind || "");
    if (offerKind === "bundle") return "bundle_offer" as const;
    if (offerKind === "bxgy_generic") return "bxgy_generic" as const;
    if (offerKind === "bxgy_bundle") return "bxgy_bundle" as const;
    if (kind === "offer" || offerKind === "standard") return "scheduled_offer" as const;
    return "scheduled_offer" as const;
  };

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DiscountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [scope, setScope] = useState<string>("all");
  const [activeNow, setActiveNow] = useState<boolean>(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "percentage",
    value: "0",
    scope: "all",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    minSubtotal: "",
    isAutomatic: false,
    status: "draft",
  });
  const [discountKind, setDiscountKind] = useState<
    "coupon" | "scheduled_offer" | "bxgy_generic" | "bxgy_bundle" | "bundle_offer"
  >("coupon");
  const [bundleRequiredQty, setBundleRequiredQty] = useState<string>("");
  const [metadata, setMetadata] = useState<any | null>(null);
  const [offerImageUrl, setOfferImageUrl] = useState<string>("");
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);
  const [bxgyBuyQty, setBxgyBuyQty] = useState<string>("");
  const [bxgyGetQty, setBxgyGetQty] = useState<string>("");
  const [bundleBuyLines, setBundleBuyLines] = useState<Array<{ productId: string; quantity: string }>>([]);
  const [bundleGetLines, setBundleGetLines] = useState<Array<{ productId: string; quantity: string }>>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [productsQ, setProductsQ] = useState("");
  const [categoriesQ, setCategoriesQ] = useState("");
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);

  const columns = useMemo(
    () =>
      getDiscountColumns({
        onEdit: async (row) => {
          setEditing(row);
          setDiscountKind("coupon");
          setForm({
            name: row.name,
            code: row.code || "",
            type: row.type,
            value: String(row.value),
            scope: row.scope,
            usageLimit: row.usageLimit != null ? String(row.usageLimit) : "",
            startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : "",
            endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : "",
            minSubtotal: "",
            isAutomatic: row.isAutomatic,
            status: row.status,
          });
          try {
            await Promise.all([fetchProducts(productsQ), fetchCategories(categoriesQ)]);
            const res = await fetch(`/api/v1/discounts/${row.id}`);
            const data = await res.json();
            if (res.ok && data?.data) {
              setDiscountKind(inferDiscountKind(data.data));

              setForm((prev) => ({
                ...prev,
                name: String(data.data?.name || prev.name),
                isAutomatic: Boolean(data.data?.isAutomatic),
                code: String(data.data?.code || ""),
                type: String(data.data?.type || prev.type),
                value: data.data?.value != null ? String(data.data.value) : prev.value,
                scope: String(data.data?.scope || prev.scope),
                usageLimit: data.data?.usageLimit != null ? String(data.data.usageLimit) : "",
                startsAt: data.data?.startsAt ? new Date(data.data.startsAt).toISOString().slice(0, 16) : "",
                endsAt: data.data?.endsAt ? new Date(data.data.endsAt).toISOString().slice(0, 16) : "",
                minSubtotal: data.data?.minSubtotal != null ? String(data.data.minSubtotal) : prev.minSubtotal,
                status: String(data.data?.status || prev.status),
              }));

              setProductIds(Array.isArray(data.data.productIds) ? data.data.productIds : []);
              setCategoryIds(Array.isArray(data.data.categoryIds) ? data.data.categoryIds : []);
              const md: any = data.data.metadata || null;
              setMetadata(md);
              setOfferImageUrl(String(md?.display?.imageUrl || ""));
              if (md?.offerKind === "bundle") {
                setBundleRequiredQty(md?.bundle?.requiredQty ? String(md.bundle.requiredQty) : "");
              } else {
                setBundleRequiredQty("");
              }
              if (md?.kind === "deal" && md?.offerKind === "bxgy_generic") {
                setBxgyBuyQty(md?.bxgy?.buyQty != null ? String(md.bxgy.buyQty) : "");
                setBxgyGetQty(md?.bxgy?.getQty != null ? String(md.bxgy.getQty) : "");
              } else {
                setBxgyBuyQty("");
                setBxgyGetQty("");
              }
              if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") {
                const spec = md?.bxgyBundle || {};
                setBundleBuyLines(
                  Array.isArray(spec.buy)
                    ? spec.buy.map((x: any) => ({ productId: String(x?.productId || ""), quantity: String(x?.quantity || "") }))
                    : [],
                );
                setBundleGetLines(
                  Array.isArray(spec.get)
                    ? spec.get.map((x: any) => ({ productId: String(x?.productId || ""), quantity: String(x?.quantity || "") }))
                    : [],
                );
              } else {
                setBundleBuyLines([]);
                setBundleGetLines([]);
              }
            }
          } catch {}
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
      const res = await fetch(`/api/v1/discounts/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Discount deleted");
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
      if (kind !== "all") params.set("kind", kind);
      if (type !== "all") params.set("type", type);
      if (scope !== "all") params.set("scope", scope);
      if (activeNow) params.set("activeNow", "true");
      const res = await fetch(`/api/v1/discounts/metrics?${params.toString()}`);
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
    if (kind !== "all") params.set("kind", kind);
    if (type !== "all") params.set("type", type);
    if (scope !== "all") params.set("scope", scope);
    if (activeNow) params.set("activeNow", "true");
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllDiscountsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: DiscountRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/discounts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load discounts");
      const batch: DiscountRow[] = (data.data?.items || []).map((d: any) => ({ ...d }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  async function printAllDiscounts() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllDiscountsMatchingFilters();
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Discounts</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-4">Discount</div>
              <div className="col-span-2">Kind</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Value</div>
              <div className="col-span-1">Scope</div>
              <div className="col-span-1">Status</div>
            </div>
            {all.map((d) => (
              <div key={d.id} className="grid grid-cols-12 gap-2 border-b p-2 text-xs">
                <div className="col-span-4">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.code || "—"}</div>
                </div>
                <div className="col-span-2">{getKindLabel(d)}</div>
                <div className="col-span-2 capitalize">{String(d.type).replaceAll("_", " ")}</div>
                <div className="col-span-2">{String(d.type) === "percentage" ? `${d.value}%` : `$${d.value}`}</div>
                <div className="col-span-1 capitalize">{String(d.scope).replaceAll("_", " ")}</div>
                <div className="col-span-1 capitalize">{String(d.status)}</div>
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

  async function printSelectedDiscounts() {
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    if (!selected.length) {
      toast.message("No discounts selected");
      return;
    }
    const selectedIds = selected.map((s) => s.id);

    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/discounts/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load discount ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Discounts (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          {details.map((d: any, idx: number) => (
            <div key={d.id} className={idx === details.length - 1 ? "" : "print-page-break"}>
              <div className="mt-4 rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold">{d.name}</div>
                    <div className="text-sm text-muted-foreground">Code: {d.code || "—"}</div>
                  </div>
                  <div className="text-sm capitalize">{String(d.status)}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Kind</div>
                    <div className="font-medium">{getKindLabel(d)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{String(d.type).replaceAll("_", " ")}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Value</div>
                    <div className="font-medium">{String(d.type) === "percentage" ? `${d.value}%` : `$${d.value}`}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Scope</div>
                    <div className="font-medium capitalize">{String(d.scope).replaceAll("_", " ")}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Usage</div>
                    <div className="font-medium">{Number(d.usageCount ?? 0)}{d.usageLimit ? ` / ${d.usageLimit}` : ""}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm">
                  <div className="text-xs text-muted-foreground">Target products</div>
                  <div>{Array.isArray(d.productIds) && d.productIds.length ? d.productIds.join(", ") : "—"}</div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground">Target categories</div>
                  <div>{Array.isArray(d.categoryIds) && d.categoryIds.length ? d.categoryIds.join(", ") : "—"}</div>
                </div>
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
    void fetchItems();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, kind, type, scope, activeNow, pageIndex, pageSize]);

  useEffect(() => {
    if (open) {
      void fetchProducts(productsQ);
      void fetchCategories(categoriesQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (kind !== "all") params.set("kind", kind);
      if (type !== "all") params.set("type", type);
      if (scope !== "all") params.set("scope", scope);
      if (activeNow) params.set("activeNow", "true");
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/discounts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load discounts");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      type: "percentage",
      value: "0",
      scope: "all",
      usageLimit: "",
      startsAt: "",
      endsAt: "",
      minSubtotal: "",
      isAutomatic: false,
      status: "draft",
    });
    setDiscountKind("coupon");
    setProductIds([]);
    setCategoryIds([]);
    setBundleRequiredQty("");
    setMetadata(null);
    setOfferImageUrl("");
    setUploadingOfferImage(false);
    setBxgyBuyQty("");
    setBxgyGetQty("");
    setBundleBuyLines([]);
    setBundleGetLines([]);
  }

  async function uploadOfferImage(file: File) {
    try {
      setUploadingOfferImage(true);
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch(`/api/v1/uploads`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData?.error?.message || "Upload failed");
      const url = String(upData?.data?.items?.[0]?.url || "");
      if (!url) throw new Error("Upload failed");
      setOfferImageUrl(url);
      setMetadata((prev: any) => ({ ...(prev || {}), display: { ...((prev || {})?.display || {}), imageUrl: url } }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingOfferImage(false);
    }
  }

  async function onSubmit() {
    try {
      const base: any = {
        name: form.name,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        status: form.status,
      };

      let payload: any = null;
      if (discountKind === "coupon") {
        payload = {
          ...base,
          code: form.code || null,
          type: form.type,
          value: form.value,
          scope: form.scope,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          minSubtotal: form.minSubtotal || null,
          isAutomatic: false,
          metadata: metadata || null,
        };
        if (form.scope === "products") payload.productIds = productIds;
        if (form.scope === "categories") payload.categoryIds = categoryIds;
      } else if (discountKind === "scheduled_offer") {
        payload = {
          ...base,
          code: null,
          type: form.type,
          value: form.value,
          scope: "all",
          usageLimit: null,
          minSubtotal: null,
          isAutomatic: true,
          productIds,
          categoryIds,
          metadata: {
            ...(metadata || {}),
            kind: "offer",
            offerKind: "standard",
            display: {
              ...(((metadata || {}) as any)?.display || {}),
              imageUrl: offerImageUrl || (((metadata || {}) as any)?.display?.imageUrl || ""),
            },
          },
        };
      } else if (discountKind === "bundle_offer") {
        payload = {
          ...base,
          code: null,
          type: form.type,
          value: form.value,
          scope: "all",
          usageLimit: null,
          minSubtotal: null,
          isAutomatic: true,
          productIds,
          categoryIds,
          metadata: {
            ...(metadata || {}),
            kind: "offer",
            offerKind: "bundle",
            bundle: { requiredQty: bundleRequiredQty ? Number(bundleRequiredQty) : null },
            display: {
              ...(((metadata || {}) as any)?.display || {}),
              imageUrl: offerImageUrl || (((metadata || {}) as any)?.display?.imageUrl || ""),
            },
          },
        };
      } else if (discountKind === "bxgy_generic") {
        payload = {
          ...base,
          code: null,
          type: "fixed_amount",
          value: "0",
          scope: "all",
          usageLimit: null,
          minSubtotal: null,
          isAutomatic: true,
          productIds,
          categoryIds,
          metadata: {
            ...(metadata || {}),
            kind: "deal",
            offerKind: "bxgy_generic",
            bxgy: {
              buyQty: bxgyBuyQty ? Number(bxgyBuyQty) : null,
              getQty: bxgyGetQty ? Number(bxgyGetQty) : null,
            },
            display: {
              ...(((metadata || {}) as any)?.display || {}),
              imageUrl: offerImageUrl || (((metadata || {}) as any)?.display?.imageUrl || ""),
            },
          },
        };
      } else if (discountKind === "bxgy_bundle") {
        payload = {
          ...base,
          code: null,
          type: "fixed_amount",
          value: "0",
          scope: "all",
          usageLimit: null,
          minSubtotal: null,
          isAutomatic: true,
          metadata: {
            ...(metadata || {}),
            kind: "deal",
            offerKind: "bxgy_bundle",
            bxgyBundle: {
              buy: bundleBuyLines
                .filter((l) => l.productId && l.quantity)
                .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
              get: bundleGetLines
                .filter((l) => l.productId && l.quantity)
                .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
            },
            display: {
              ...(((metadata || {}) as any)?.display || {}),
              imageUrl: offerImageUrl || (((metadata || {}) as any)?.display?.imageUrl || ""),
            },
          },
        };
      }
      if (!payload) throw new Error("Invalid discount kind");
      const res = await fetch(editing ? `/api/v1/discounts/${editing.id}` : "/api/v1/discounts", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(`Discount ${editing ? "updated" : "created"}`);
      setOpen(false);
      resetForm();
      void fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function fetchProducts(q: string) {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "100");
      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setProductOptions((data.data?.items || []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {}
  }

  async function fetchCategories(q: string) {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "100");
      const res = await fetch(`/api/v1/categories?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setCategoryOptions((data.data?.items || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch {}
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total discounts" value={metrics?.totalDiscounts ?? total} icon={Layers} tone="blue" />
        <MetricCard title="Active" value={Number(metrics?.activeCount ?? 0)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Draft" value={Number(metrics?.draftCount ?? 0)} icon={Clock} tone="amber" />
        <MetricCard title="Expired" value={Number(metrics?.expiredCount ?? 0)} icon={X} tone="rose" />
        <MetricCard title="Archived" value={Number(metrics?.archivedCount ?? 0)} icon={Archive} tone="slate" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total usage" value={Number(metrics?.totalUsage ?? 0)} icon={Users} tone="blue" />
        <MetricCard title="Discount given" value={formatCurrency(Number(metrics?.totalDiscountGiven ?? 0), { currency: metrics?.currency || "CAD", locale: "en-CA" })} icon={DollarSign} tone="emerald" />
        <MetricCard title="Discount (30d)" value={formatCurrency(Number(metrics?.totalDiscountGiven30d ?? 0), { currency: metrics?.currency || "CAD", locale: "en-CA" })} icon={DollarSign} tone="amber" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-7">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="coupon">Coupon</SelectItem>
                <SelectItem value="scheduled_offer">Scheduled offer</SelectItem>
                <SelectItem value="bxgy_generic">BXGY generic</SelectItem>
                <SelectItem value="bxgy_bundle">BXGY bundle</SelectItem>
                <SelectItem value="bundle_offer">Bundle offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                <SelectItem value="free_shipping">Free shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="categories">Categories</SelectItem>
                <SelectItem value="collections">Collections</SelectItem>
                <SelectItem value="customer_groups">Customer groups</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-7">
            <Checkbox id="activeNow" checked={activeNow} onCheckedChange={(v) => setActiveNow(!!v)} />
            <Label htmlFor="activeNow">Active now</Label>
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
              <DropdownMenuItem onClick={() => void printSelectedDiscounts()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllDiscounts()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(v) => (v ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Discount" : "New Discount"}
            className="max-w-2xl"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button
                onClick={() => {
                  resetForm();
                  setOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Discount
              </Button>
            }
          >
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Discount kind</Label>
                  <Select
                    value={discountKind}
                    onValueChange={(v) => {
                      const next = v as any;
                      setDiscountKind(next);
                      if (next === "coupon") {
                        setForm((s) => ({ ...s, isAutomatic: false }));
                      } else {
                        setForm((s) => ({ ...s, isAutomatic: true, code: "", scope: "all", usageLimit: "", minSubtotal: "" }));
                      }
                      if (next !== "bxgy_generic") {
                        setBxgyBuyQty("");
                        setBxgyGetQty("");
                      }
                      if (next !== "bxgy_bundle") {
                        setBundleBuyLines([]);
                        setBundleGetLines([]);
                      }
                      if (next !== "bundle_offer") {
                        setBundleRequiredQty("");
                      }
                      if (next === "bxgy_bundle") {
                        setProductIds([]);
                        setCategoryIds([]);
                      }
                    }}
                    disabled={!!editing && discountKind === "bundle_offer"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coupon">Coupon code</SelectItem>
                      <SelectItem value="scheduled_offer">Scheduled offer</SelectItem>
                      <SelectItem value="bxgy_generic">Buy X get Y (generic)</SelectItem>
                      <SelectItem value="bxgy_bundle">Buy X get Y (bundle)</SelectItem>
                      {editing && discountKind === "bundle_offer" ? (
                        <SelectItem value="bundle_offer">Bundle offer (legacy)</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                {discountKind === "scheduled_offer" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm((s) => ({ ...s, type: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                            <SelectItem value="free_shipping">Free shipping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Value</Label>
                        <Input value={form.value} onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Starts at</Label>
                        <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ends at</Label>
                        <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {discountKind === "coupon" && (
                  <>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm((s) => ({ ...s, type: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                            <SelectItem value="free_shipping">Free shipping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Value</Label>
                        <Input value={form.value} onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Min subtotal</Label>
                        <Input value={form.minSubtotal} onChange={(e) => setForm((s) => ({ ...s, minSubtotal: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Usage limit</Label>
                        <Input value={form.usageLimit} onChange={(e) => setForm((s) => ({ ...s, usageLimit: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Starts at</Label>
                        <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ends at</Label>
                        <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Scope</Label>
                        <Select value={form.scope} onValueChange={(v) => setForm((s) => ({ ...s, scope: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="products">Products</SelectItem>
                            <SelectItem value="categories">Categories</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {discountKind === "bundle_offer" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm((s) => ({ ...s, type: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                            <SelectItem value="free_shipping">Free shipping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Value</Label>
                        <Input value={form.value} onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Starts at</Label>
                        <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ends at</Label>
                        <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                {(discountKind === "scheduled_offer" || discountKind === "bundle_offer" || discountKind === "bxgy_generic" || discountKind === "bxgy_bundle") && (
                  <div className="sm:col-span-2 grid gap-2">
                    <Label>Offer image</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        id="offer-image"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0];
                          if (f) void uploadOfferImage(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingOfferImage}
                        onClick={() => {
                          const el = document.getElementById("offer-image") as HTMLInputElement | null;
                          el?.click();
                        }}
                      >
                        {uploadingOfferImage ? "Uploading..." : "Upload"}
                      </Button>
                      <Input
                        value={offerImageUrl}
                        onChange={(e) => setOfferImageUrl(e.target.value)}
                        placeholder="Or paste image URL"
                      />
                    </div>
                  </div>
                )}
                {discountKind === "bundle_offer" && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Bundle required quantity</Label>
                    <Input type="number" min={1} placeholder="e.g. 3" value={bundleRequiredQty} onChange={(e) => setBundleRequiredQty(e.target.value)} />
                  </div>
                )}
                {discountKind === "bxgy_generic" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Tag label</Label>
                        <Input
                          value={String((metadata as any)?.display?.tag || "")}
                          onChange={(e) =>
                            setMetadata((prev: any) => ({
                              ...(prev || {}),
                              display: { ...((prev || {})?.display || {}), tag: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Buy quantity (X)</Label>
                      <Input type="number" min={1} value={bxgyBuyQty} onChange={(e) => setBxgyBuyQty(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Get quantity (Y)</Label>
                      <Input type="number" min={1} value={bxgyGetQty} onChange={(e) => setBxgyGetQty(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Starts at</Label>
                        <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ends at</Label>
                        <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                {discountKind === "bxgy_bundle" && (
                  <div className="sm:col-span-2 grid gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Tag label</Label>
                        <Input
                          value={String((metadata as any)?.display?.tag || "")}
                          onChange={(e) =>
                            setMetadata((prev: any) => ({
                              ...(prev || {}),
                              display: { ...((prev || {})?.display || {}), tag: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="font-medium text-sm mb-2">Buy items</div>
                      <div className="grid gap-2">
                        {bundleBuyLines.map((l, idx) => (
                          <div key={`buy-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Select value={l.productId} onValueChange={(v) => setBundleBuyLines((prev) => prev.map((x, i) => i === idx ? { ...x, productId: v } : x))}>
                              <SelectTrigger className="sm:col-span-2">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {productOptions.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input type="number" min={1} placeholder="Qty" value={l.quantity} onChange={(e) => setBundleBuyLines((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                            <Button type="button" variant="outline" size="sm" onClick={() => setBundleBuyLines((prev) => prev.filter((_, i) => i !== idx))}>Remove</Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setBundleBuyLines((prev) => [...prev, { productId: "", quantity: "" }])}>Add buy item</Button>
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="font-medium text-sm mb-2">Get items (free)</div>
                      <div className="grid gap-2">
                        {bundleGetLines.map((l, idx) => (
                          <div key={`get-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Select value={l.productId} onValueChange={(v) => setBundleGetLines((prev) => prev.map((x, i) => i === idx ? { ...x, productId: v } : x))}>
                              <SelectTrigger className="sm:col-span-2">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {productOptions.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input type="number" min={1} placeholder="Qty" value={l.quantity} onChange={(e) => setBundleGetLines((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                            <Button type="button" variant="outline" size="sm" onClick={() => setBundleGetLines((prev) => prev.filter((_, i) => i !== idx))}>Remove</Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setBundleGetLines((prev) => [...prev, { productId: "", quantity: "" }])}>Add get item</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Starts at</Label>
                        <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ends at</Label>
                        <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                {(discountKind === "coupon" && form.scope === "products") || discountKind === "scheduled_offer" || discountKind === "bundle_offer" || discountKind === "bxgy_generic" ? (
                  <div className="sm:col-span-2 grid gap-2">
                    <Label>Target products</Label>
                    <Input placeholder="Search products" value={productsQ} onChange={(e) => { setProductsQ(e.target.value); void fetchProducts(e.target.value); }} />
                    <div className="max-h-48 overflow-auto no-scrollbar rounded border p-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {productOptions.map((p) => {
                          const checked = productIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 text-sm">
                              <Checkbox checked={checked} onCheckedChange={(v) => {
                                setProductIds((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)));
                              }} />
                              <span className="truncate">{p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {productIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {productIds.map((id) => {
                          const label = productOptions.find((p) => p.id === id)?.name || id;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1">
                              <span className="truncate max-w-[180px]">{label}</span>
                              <button
                                type="button"
                                className="ml-1 opacity-70 hover:opacity-100"
                                onClick={() => setProductIds((prev) => prev.filter((x) => x !== id))}
                                aria-label={`Remove ${label}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {(discountKind === "coupon" && form.scope === "categories") || discountKind === "scheduled_offer" || discountKind === "bundle_offer" || discountKind === "bxgy_generic" ? (
                  <div className="sm:col-span-2 grid gap-2">
                    <Label>Target categories</Label>
                    <Input placeholder="Search categories" value={categoriesQ} onChange={(e) => { setCategoriesQ(e.target.value); void fetchCategories(e.target.value); }} />
                    <div className="max-h-48 overflow-auto no-scrollbar rounded border p-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {categoryOptions.map((c) => {
                          const checked = categoryIds.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-center gap-2 text-sm">
                              <Checkbox checked={checked} onCheckedChange={(v) => {
                                setCategoryIds((prev) => (v ? [...prev, c.id] : prev.filter((id) => id !== c.id)));
                              }} />
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {categoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {categoryIds.map((id) => {
                          const label = categoryOptions.find((c) => c.id === id)?.name || id;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1">
                              <span className="truncate max-w-[180px]">{label}</span>
                              <button
                                type="button"
                                className="ml-1 opacity-70 hover:opacity-100"
                                onClick={() => setCategoryIds((prev) => prev.filter((x) => x !== id))}
                                aria-label={`Remove ${label}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
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
        title="Delete discount"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected discount."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
