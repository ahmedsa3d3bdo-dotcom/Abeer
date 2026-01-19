"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Users, UserPlus, UserCheck, Repeat, DollarSign, Printer } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/common/metric-card";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getCustomerColumns, type CustomerRow } from "./columns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LocalDate } from "@/components/common/local-datetime";
import { useNewNotifications } from "@/hooks/use-new-notifications";
import { formatCurrency } from "@/lib/utils";
import { usePrint } from "@/components/common/print/print-provider";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

const DEFAULT_LIMIT = 10;

export default function CustomersPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState<string>("CAD");

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewing, setViewing] = useState<CustomerRow | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [details, setDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isActive: true,
  });

  const { isNew } = useNewNotifications({ type: "customer_registered", limit: 200 });

  const columns = useMemo(
    () =>
      getCustomerColumns({
        onView: (row) => {
          setViewing(row);
          setDrawerOpen(true);
          void fetchCustomerOrders(row.id);
          void fetchCustomerDetails(row.id);
        },
        onDelete: (row) => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
      }, { currency }),
    [currency],
  );

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/customers/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Customer deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchCustomers();
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
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllCustomersMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: CustomerRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load customers");
      const batch: CustomerRow[] = (data.data?.items || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        createdAt: u.createdAt,
        ordersCount: u.ordersCount,
        totalSpent: Number(u.totalSpent ?? 0),
        avgOrderValue: Number(u.avgOrderValue ?? 0),
        lastOrderAt: u.lastOrderAt,
      }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (data.data?.currency) setCurrency(data.data.currency);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }

    return all;
  }

  async function printAllCustomers() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllCustomersMatchingFilters();
      setPrintPreparing(false);
      const c = currency;

      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Customers</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {all.length}</div>
          <div className="mt-4 rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
              <div className="col-span-4">Customer</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Orders</div>
              <div className="col-span-2 text-right">Spent</div>
              <div className="col-span-2 text-right">AOV</div>
            </div>
            {all.map((u) => (
              <div key={u.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">
                    {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="col-span-2">{u.isActive ? "Active" : "Inactive"}</div>
                <div className="col-span-2 text-right">{u.ordersCount ?? 0}</div>
                <div className="col-span-2 text-right">{formatCurrency(Number(u.totalSpent ?? 0), { currency: c, locale: "en-CA" })}</div>
                <div className="col-span-2 text-right">{formatCurrency(Number(u.avgOrderValue ?? 0), { currency: c, locale: "en-CA" })}</div>
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

  async function printSelectedCustomers() {
    const selectedIds = Object.keys((table as any)?.getState?.().rowSelection || {});
    if (!selectedIds.length) {
      toast.error("Select at least one customer to print");
      return;
    }

    try {
      setPrintPreparing(true);
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/v1/customers/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || `Failed to load customer ${id}`);
          return data.data;
        }),
      );
      setPrintPreparing(false);

      const c = details.find((d: any) => d?.currency)?.currency || currency;
      void print(
        <div className="p-6">
          <div className="text-lg font-semibold">Customers (Selected)</div>
          <div className="mt-1 text-xs text-muted-foreground">Total: {details.length}</div>
          {details.map((d: any, idx: number) => {
            const u = d?.user;
            const a = d?.aggregates;
            const title = u
              ? (u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email)
              : "Customer";
            return (
              <div key={String(u?.id || idx)} className={idx === details.length - 1 ? "" : "print-page-break"}>
                <div className="mt-4 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{title}</div>
                      <div className="text-sm text-muted-foreground">{u?.email}</div>
                      {u?.phone ? <div className="text-sm text-muted-foreground">{u.phone}</div> : null}
                    </div>
                    <div className="text-sm">{u?.isActive ? "Active" : "Inactive"}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Orders</div>
                      <div className="font-medium">{Number(a?.ordersCount ?? 0)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Total spent</div>
                      <div className="font-medium">{formatCurrency(Number(a?.totalSpent ?? 0), { currency: c, locale: "en-CA" })}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">AOV</div>
                      <div className="font-medium">{formatCurrency(Number(a?.avgOrderValue ?? 0), { currency: c, locale: "en-CA" })}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Joined</div>
                      <div className="font-medium">{u?.createdAt ? <LocalDate value={u.createdAt} /> : "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  useEffect(() => {
    if (drawerOpen && viewing?.id) {
      void fetchCustomerDetails(viewing.id);
      void fetchCustomerOrders(viewing.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, viewing?.id]);

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
    void fetchCustomers();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, pageIndex, pageSize]);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("isActive", String(status === "active"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/customers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load customers");
      setItems((data.data?.items || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        createdAt: u.createdAt,
        ordersCount: u.ordersCount,
        totalSpent: Number(u.totalSpent ?? 0),
        avgOrderValue: Number(u.avgOrderValue ?? 0),
        lastOrderAt: u.lastOrderAt,
      })));
      setTotal(data.data?.total || 0);
      if (data.data?.currency) setCurrency(data.data.currency);
    } catch (e: any) {
      toast.error(e.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("isActive", String(status === "active"));
      const res = await fetch(`/api/v1/customers/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
      if (data.data?.currency) setCurrency(data.data.currency);
    } catch {
      // ignore metrics errors
    }
  }

  async function fetchCustomerOrders(userId: string) {
    try {
      setOrdersLoading(true);
      const params = new URLSearchParams();
      params.set("userId", userId);
      params.set("limit", "20");
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load orders");
      setOrders(data.data?.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function fetchCustomerDetails(userId: string) {
    try {
      setDetailsLoading(true);
      const res = await fetch(`/api/v1/customers/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load details");
      setDetails(data.data || null);
      if (data.data?.currency) setCurrency(data.data.currency);
    } catch (e: any) {
      toast.error(e.message || "Failed to load details");
    } finally {
      setDetailsLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ email: "", password: "", firstName: "", lastName: "", isActive: true });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        isActive: form.isActive,
      };
      if (!editing) payload.password = form.password;
      const res = await fetch(editing ? `/api/v1/customers/${editing.id}` : "/api/v1/customers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "Customer updated" : "Customer created");
      setOpen(false);
      resetForm();
      void fetchCustomers();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total customers" value={metrics?.totalCustomers ?? total} icon={Users} tone="blue" />
        <MetricCard title="Active customers" value={metrics?.activeCustomers ?? "—"} icon={UserCheck} tone="emerald" />
        <MetricCard title="New last 30 days" value={metrics?.newCustomers30d ?? "—"} icon={UserPlus} tone="violet" />
        <MetricCard title="Total spent" value={formatCurrency(Number(metrics?.totalSpent ?? 0), { currency: metrics?.currency || currency, locale: "en-CA" })} icon={DollarSign} tone="emerald" />
        <MetricCard title="Avg order value" value={formatCurrency(Number(metrics?.avgOrderValue ?? 0), { currency: metrics?.currency || currency, locale: "en-CA" })} icon={DollarSign} tone="slate" />
        <MetricCard title="Returning customers" value={metrics?.returningCustomers ?? "—"} icon={Repeat} tone="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <Button variant="outline" onClick={() => void fetchCustomers()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedCustomers()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllCustomers()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit Customer" : "Create Customer"}
            className="sm:max-w-[520px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Customer
              </Button>
            }
          >
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Password{editing ? " (leave blank to keep)" : ""}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    placeholder={editing ? "••••••••" : "Strong password"}
                    disabled={!!editing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>First Name</Label>
                  <Input value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
                </div>
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
        <DataTable
          table={table as any}
          columns={columns as any}
          getRowClassName={(row: CustomerRow) => (isNew(row.id) ? "bg-amber-50/60" : undefined)}
          onRowClick={(row: CustomerRow) => {
            setViewing(row);
            setDrawerOpen(true);
          }}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      {/* Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(o) => setDrawerOpen(o)}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col overflow-hidden">
          <div className="shrink-0">
            <SheetHeader className="border-b">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <SheetTitle>Customer details</SheetTitle>
                  <SheetDescription>Overview and recent orders</SheetDescription>
                </div>
              </div>
            </SheetHeader>
          </div>
          {viewing && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="px-4 pb-6 pt-4 space-y-5">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{(viewing.firstName || viewing.lastName) ? `${viewing.firstName ?? ""} ${viewing.lastName ?? ""}`.trim() : viewing.email}</div>
                    <div className="text-sm text-muted-foreground break-words">{details?.user?.email || viewing.email}</div>
                    {details?.user?.phone ? (
                      <div className="text-sm text-muted-foreground break-words">{details.user.phone}</div>
                    ) : null}
                    
                  </div>
                
                  <UniversalBadge kind="active" value={viewing.isActive} label={viewing.isActive ? "ACTIVE" : "INACTIVE"} />
                  
                </div>
                <div className="flex justify-end">
                  <Button asChild variant="outline" size="sm">
                    <a href={`/dashboard/orders?userId=${encodeURIComponent(viewing.id)}`}>View all orders</a>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const tags: string[] = [];
                    const total = Number(details?.aggregates?.totalSpent ?? viewing.totalSpent ?? 0);
                    const ordersCount = Number(details?.aggregates?.ordersCount ?? viewing.ordersCount ?? 0);
                    const firstAt = details?.aggregates?.firstOrderAt ? new Date(details.aggregates.firstOrderAt) : null;
                    if (total >= 1000) tags.push("VIP");
                    if (ordersCount <= 2) tags.push("New");
                    if (firstAt && (Date.now() - firstAt.getTime()) / (1000*60*60*24) <= 30) tags.push("Recent");
                    return tags.length ? tags.map((t) => <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>) : null;
                  })()}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Total orders</div>
                    <div className="mt-1 text-lg font-semibold">{Number(details?.aggregates?.ordersCount ?? viewing.ordersCount ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Total spent</div>
                    <div className="mt-1 text-lg font-semibold">{formatCurrency(Number(details?.aggregates?.totalSpent ?? viewing.totalSpent ?? 0), { currency: details?.currency || currency, locale: "en-CA" })}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Avg order value</div>
                    <div className="mt-1 text-lg font-semibold">{formatCurrency(Number(details?.aggregates?.avgOrderValue ?? viewing.avgOrderValue ?? 0), { currency: details?.currency || currency, locale: "en-CA" })}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Last order</div>
                    <div className="mt-1 text-lg font-semibold">{(details?.aggregates?.lastOrderAt || viewing.lastOrderAt) ? <LocalDate value={(details?.aggregates?.lastOrderAt || viewing.lastOrderAt) as any} /> : "—"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">First order</div>
                    <div className="mt-1 text-lg font-semibold">{details?.aggregates?.firstOrderAt ? <LocalDate value={details.aggregates.firstOrderAt as any} /> : "—"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Refunded total</div>
                    <div className="mt-1 text-lg font-semibold">{formatCurrency(Number(details?.aggregates?.refundedTotal ?? 0), { currency: details?.currency || currency, locale: "en-CA" })}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 text-xs text-muted-foreground">Default shipping</div>
                    {detailsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : details?.shippingAddress ? (
                      <div className="text-sm leading-6">
                        <div className="font-medium">{details.shippingAddress.firstName} {details.shippingAddress.lastName}</div>
                        <div>{details.shippingAddress.addressLine1}</div>
                        {details.shippingAddress.addressLine2 ? <div>{details.shippingAddress.addressLine2}</div> : null}
                        <div>{details.shippingAddress.city}, {details.shippingAddress.state} {details.shippingAddress.postalCode}</div>
                        <div>{details.shippingAddress.country}</div>
                        <div className="text-muted-foreground">{details.shippingAddress.phone}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No shipping address</div>
                    )}
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 text-xs text-muted-foreground">Default billing</div>
                    {detailsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : details?.billingAddress ? (
                      <div className="text-sm leading-6">
                        <div className="font-medium">{details.billingAddress.firstName} {details.billingAddress.lastName}</div>
                        <div>{details.billingAddress.addressLine1}</div>
                        {details.billingAddress.addressLine2 ? <div>{details.billingAddress.addressLine2}</div> : null}
                        <div>{details.billingAddress.city}, {details.billingAddress.state} {details.billingAddress.postalCode}</div>
                        <div>{details.billingAddress.country}</div>
                        {details.billingAddress.phone ? <div className="text-muted-foreground">{details.billingAddress.phone}</div> : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No billing address</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">Recent orders</div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-4 bg-muted px-3 py-2 text-xs font-medium">
                      <div>Order</div>
                      <div>Status</div>
                      <div className="text-right">Total</div>
                      <div className="text-right">Date</div>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {ordersLoading ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                      ) : orders.length ? (
                        orders.map((o) => (
                          <div key={o.id} className="grid grid-cols-4 border-t px-3 py-2 text-sm">
                            <div className="truncate">{o.orderNumber}</div>
                            <div className="capitalize">{String(o.status)}</div>
                            <div className="text-right">{formatCurrency(Number(o.totalAmount || 0), { currency: o.currency || details?.currency || currency, locale: "en-CA" })}</div>
                            <div className="text-right text-muted-foreground"><LocalDate value={o.createdAt} /></div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">No orders</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete customer"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.email}\".` : "This will permanently delete the selected customer."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
