"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Users, UserPlus, UserCheck, Repeat, DollarSign, ShoppingCart, TrendingUp, Calendar, MapPin, CreditCard, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/common/metric-card";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getCustomerColumns, type CustomerRow } from "./columns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LocalDate } from "@/components/common/local-datetime";
import { useNewNotifications } from "@/hooks/use-new-notifications";
import { formatCurrency } from "@/lib/utils";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import Link from "next/link";
import { Download } from "lucide-react";

const DEFAULT_LIMIT = 10;

export default function CustomersPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState<string>("CAD");

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total customers" value={metrics?.totalCustomers ?? total} icon={Users} tone="blue" />
        <MetricCard title="Active customers" value={metrics?.activeCustomers ?? "—"} icon={UserCheck} tone="emerald" />
        <MetricCard title="New last 30 days" value={metrics?.newCustomers30d ?? "—"} icon={UserPlus} tone="violet" />
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

          <Link href="/dashboard/customers/export">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </Link>

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
        <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col" suppressHydrationWarning>
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-xl">Customer Details</SheetTitle>
            <SheetDescription>Overview and recent orders</SheetDescription>
          </SheetHeader>
          
          {viewing && (
            <div className="flex-1 px-6 overflow-y-auto scrollbar-hide">
              <div className="py-6 space-y-6">

                {/* Header Card with Gradient */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-background p-6 shadow-sm">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -z-10" />
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate">
                          {(viewing.firstName || viewing.lastName) ? `${viewing.firstName ?? ""} ${viewing.lastName ?? ""}`.trim() : viewing.email}
                        </h3>
                        <div className="mt-2 text-sm text-muted-foreground break-words">{details?.user?.email || viewing.email}</div>
                        {details?.user?.phone && (
                          <div className="mt-1 text-sm text-muted-foreground break-words">{details.user.phone}</div>
                        )}
                      </div>
                      <UniversalBadge 
                        kind="active" 
                        value={viewing.isActive} 
                        label={viewing.isActive ? "ACTIVE" : "INACTIVE"} 
                      />
                    </div>

                    {/* Customer Tags */}
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const tags: string[] = [];
                        const total = Number(details?.aggregates?.totalSpent ?? viewing.totalSpent ?? 0);
                        const ordersCount = Number(details?.aggregates?.ordersCount ?? viewing.ordersCount ?? 0);
                        const firstAt = details?.aggregates?.firstOrderAt ? new Date(details.aggregates.firstOrderAt) : null;
                        if (total >= 1000) tags.push("VIP");
                        if (ordersCount <= 2) tags.push("New");
                        if (firstAt && (Date.now() - firstAt.getTime()) / (1000 * 60 * 60 * 24) <= 30) tags.push("Recent");
                        return tags.length ? tags.map((t) => (
                          <Badge 
                            key={t} 
                            variant="secondary" 
                            className="capitalize font-medium"
                          >
                            {t}
                          </Badge>
                        )) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Orders</div>
                    </div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                      {Number(details?.aggregates?.ordersCount ?? viewing.ordersCount ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Spent</div>
                    </div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(Number(details?.aggregates?.totalSpent ?? viewing.totalSpent ?? 0), { currency: details?.currency || currency, locale: "en-CA" }).replace(/^[A-Z]{2,3}\$?/, '$')}
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">Avg Order</div>
                    </div>
                    <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                      {formatCurrency(Number(details?.aggregates?.avgOrderValue ?? viewing.avgOrderValue ?? 0), { currency: details?.currency || currency, locale: "en-CA" }).replace(/^[A-Z]{2,3}\$?/, '$')}
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Last Order</div>
                    </div>
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {(details?.aggregates?.lastOrderAt || viewing.lastOrderAt) ? <LocalDate value={(details?.aggregates?.lastOrderAt || viewing.lastOrderAt) as any} /> : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="text-xs font-semibold uppercase tracking-wider">First Order</div>
                    </div>
                    <div className="text-lg font-bold">
                      {details?.aggregates?.firstOrderAt ? <LocalDate value={details.aggregates.firstOrderAt as any} /> : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 shadow-sm transition-all hover:shadow-md bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw className="h-5 w-5 text-muted-foreground" />
                      <div className="text-xs font-semibold uppercase tracking-wider">Refunded</div>
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(Number(details?.aggregates?.refundedTotal ?? 0), { currency: details?.currency || currency, locale: "en-CA" }).replace(/^[A-Z]{2,3}\$?/, '$')}
                    </div>
                  </div>
                </div>

                {/* Addresses Section */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-5 bg-muted/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-semibold">Default Shipping</div>
                    </div>
                    {detailsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : details?.shippingAddress ? (
                      <div className="text-sm leading-relaxed space-y-1">
                        <div className="font-semibold">{details.shippingAddress.firstName} {details.shippingAddress.lastName}</div>
                        <div>{details.shippingAddress.addressLine1}</div>
                        {details.shippingAddress.addressLine2 && <div>{details.shippingAddress.addressLine2}</div>}
                        <div>{details.shippingAddress.city}, {details.shippingAddress.state} {details.shippingAddress.postalCode}</div>
                        <div>{details.shippingAddress.country}</div>
                        <div className="text-muted-foreground pt-1">{details.shippingAddress.phone}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No shipping address</div>
                    )}
                  </div>

                  <div className="rounded-xl border p-5 bg-muted/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-semibold">Default Billing</div>
                    </div>
                    {detailsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : details?.billingAddress ? (
                      <div className="text-sm leading-relaxed space-y-1">
                        <div className="font-semibold">{details.billingAddress.firstName} {details.billingAddress.lastName}</div>
                        <div>{details.billingAddress.addressLine1}</div>
                        {details.billingAddress.addressLine2 && <div>{details.billingAddress.addressLine2}</div>}
                        <div>{details.billingAddress.city}, {details.billingAddress.state} {details.billingAddress.postalCode}</div>
                        <div>{details.billingAddress.country}</div>
                        {details.billingAddress.phone && <div className="text-muted-foreground pt-1">{details.billingAddress.phone}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No billing address</div>
                    )}
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                  <div className="bg-muted/50 px-5 py-4 border-b">
                    <div className="text-base font-semibold">Recent Orders</div>
                    <div className="text-xs text-muted-foreground mt-1">Latest customer purchases</div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 bg-muted/30 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <div className="col-span-4">Order</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-3 text-right">Date</div>
                  </div>

                  {ordersLoading ? (
                    <div className="p-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                      <div className="mt-3 text-sm font-medium text-muted-foreground">Loading orders...</div>
                    </div>
                  ) : orders.length ? (
                    <div className="divide-y max-h-80 overflow-y-auto scrollbar-hide">
                      {orders.map((o) => (
                        <div key={o.id} className="grid grid-cols-12 gap-3 px-5 py-4 text-sm hover:bg-muted/50 transition-colors">
                          <div className="col-span-4 font-mono font-semibold text-primary">#{o.orderNumber}</div>
                          <div className="col-span-3 capitalize font-medium">{String(o.status)}</div>
                          <div className="col-span-2 text-right font-bold">
                            {formatCurrency(Number(o.totalAmount || 0), { currency: o.currency || details?.currency || currency, locale: "en-CA" }).replace(/^[A-Z]{2,3}\$?/, '$')}
                          </div>
                          <div className="col-span-3 text-right text-xs text-muted-foreground">
                            <LocalDate value={o.createdAt} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="text-5xl mb-3">🛒</div>
                      <div className="text-base font-semibold">No orders yet</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        This customer hasn't placed any orders
                      </div>
                    </div>
                  )}
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
