"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { RefreshCcw, Bell, Inbox, CheckCircle2, Archive, Users, Calendar, Percent, Printer } from "lucide-react";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";

import { getNotificationColumns, getBroadcastColumns, type NotificationRow, type BroadcastRow, displayNotificationTitle } from "./columns";

const DEFAULT_LIMIT = 10;

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<(NotificationRow | BroadcastRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<NotificationRow | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [type, setType] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ type: "system_alert", title: "", message: "", actionUrl: "" });
  const [roles, setRoles] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState(false);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/notifications/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("Deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchNotifications();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSend() {
    if (!form.title || !form.message) {
      toast.error("Title and message are required");
      return;
    }
    if (!allUsers && selectedRoleSlugs.length === 0) {
      toast.error("Select at least one role or choose All users");
      return;
    }
    try {
      setSubmitting(true);
      const payload: any = { type: form.type || "system_alert", title: form.title, message: form.message };
      if (allUsers) payload.all = true;
      else payload.roleSlugs = selectedRoleSlugs;
      if (form.actionUrl) payload.actionUrl = form.actionUrl;
      const res = await fetch(`/api/v1/notifications/broadcast/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Send failed");
      toast.success(`Sent to ${data?.data?.count ?? 0} users`);
      setOpen(false);
      setForm({ type: "system_alert", title: "", message: "", actionUrl: "" });
      setSelectedRoleSlugs([]);
      setAllUsers(false);
      void fetchNotifications();
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo<ColumnDef<NotificationRow | BroadcastRow, any>[]>(() => {
    if (scope === "all") {
      return getBroadcastColumns() as unknown as ColumnDef<NotificationRow | BroadcastRow, any>[];
    }
    return getNotificationColumns({
      onView: (row) => {
        setViewTarget(row);
        setViewOpen(true);
      },
      onMarkRead: async (row) => {
        try {
          const res = await fetch(`/api/v1/notifications/${row.id}/read`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || "Failed to mark as read");
          toast.success("Marked as read");
          void fetchNotifications();
        } catch (e: any) {
          toast.error(e.message || "Action failed");
        }
      },
      onArchive: async (row) => {
        try {
          const res = await fetch(`/api/v1/notifications/${row.id}/archive`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || "Failed to archive");
          toast.success("Archived");
          void fetchNotifications();
        } catch (e: any) {
          toast.error(e.message || "Action failed");
        }
      },
      onDelete: async (row) => {
        setDeleteTarget(row as any);
        setDeleteOpen(true);
      },
    }) as unknown as ColumnDef<NotificationRow | BroadcastRow, any>[];
  }, [scope]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (scope) params.set("scope", scope);
      const res = await fetch(`/api/v1/notifications/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  const table = useDataTableInstance({
    data: items,
    columns: columns as any,
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
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    params.set("sort", "createdAt.desc");
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (scope) params.set("scope", scope);
    return params;
  }

  async function fetchAllNotificationsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: Array<NotificationRow | BroadcastRow> = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/notifications?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load notifications");
      const batch: Array<NotificationRow | BroadcastRow> = (data.data?.items || []).map((r: any) => ({ ...r }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  function renderPrintRows(rows: Array<any>, title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status / Target</div>
            <div className="col-span-2">Sent</div>
            <div className="col-span-2">Created</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-4">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.message}</div>
              </div>
              <div className="col-span-2">{r.type}</div>
              <div className="col-span-2">{r.status ?? r.target ?? "—"}</div>
              <div className="col-span-2">{typeof r.count === "number" ? String(r.count) : "—"}</div>
              <div className="col-span-2">{r.createdAt ? new Date(r.createdAt as any).toLocaleString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedNotifications() {
    const selected = (table as any).getSelectedRowModel?.().rows?.map((r: any) => r.original) || [];
    if (!selected.length) {
      toast.error("Select at least one row to print");
      return;
    }
    void print(renderPrintRows(selected, scope === "all" ? "Broadcasts (Selected)" : "Notifications (Selected)"));
  }

  async function printAllNotifications() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllNotificationsMatchingFilters();
      setPrintPreparing(false);
      void print(renderPrintRows(all, scope === "all" ? "Broadcasts" : "Notifications"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  useEffect(() => {
    void fetchNotifications();
    void fetchMetrics();
  }, [pageIndex, pageSize, status, type, scope]);

  useEffect(() => {
    if (scope === "all") {
      setStatus(undefined);
    }
  }, [scope]);

  async function fetchRoles() {
    try {
      const res = await fetch(`/api/v1/roles?page=1&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      const items = data?.data?.items || data?.items || [];
      setRoles(items.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug })));
    } catch {}
  }

  useEffect(() => {
    void fetchRoles();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (scope) params.set("scope", scope);
      const res = await fetch(`/api/v1/notifications?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load notifications");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/notifications/mark-all`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to mark all");
      toast.success(`Marked ${data.data?.count ?? 0} as read`);
      void fetchNotifications();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark all");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          if (o) setViewOpen(true);
          else {
            setViewOpen(false);
            setViewTarget(null);
          }
        }}
      >
        <AppDialogContent
          title="Notification"
          description={viewTarget?.title ? <span className="font-medium">{displayNotificationTitle({ type: viewTarget.type, title: viewTarget.title })}</span> : undefined}
          className="sm:max-w-[720px]"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!viewTarget) return;
                  void print(
                    <div className="p-6">
                      <div className="text-lg font-semibold">Notification</div>
                      <div className="mt-1 text-xs text-muted-foreground">{viewTarget.createdAt ? new Date(viewTarget.createdAt as any).toLocaleString() : ""}</div>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Title</div>
                          <div className="mt-1 text-sm font-medium">{displayNotificationTitle({ type: viewTarget.type, title: viewTarget.title }) || "—"}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Type</div>
                            <div className="mt-1 text-sm">{viewTarget.type || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Status</div>
                            <div className="mt-1 text-sm">{viewTarget.status || "—"}</div>
                          </div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Message</div>
                          <div className="mt-2 whitespace-pre-wrap text-sm">{viewTarget.message || "—"}</div>
                        </div>
                        {viewTarget.actionUrl ? (
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Action URL</div>
                            <div className="mt-1 text-sm break-words">{viewTarget.actionUrl}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>,
                  );
                }}
                disabled={loading || isPrinting || printPreparing || !viewTarget}
              >
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </div>
          }
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="mt-1 text-sm">{viewTarget?.type || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1 text-sm capitalize">{viewTarget?.status || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="mt-1 text-sm">{viewTarget?.createdAt ? new Date(viewTarget.createdAt as any).toLocaleString() : "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Action URL</div>
                <div className="mt-1 text-sm break-words">
                  {viewTarget?.actionUrl ? (
                    <a className="underline" href={viewTarget.actionUrl} target="_blank" rel="noreferrer">
                      {viewTarget.actionUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Message</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{viewTarget?.message || "—"}</div>
            </div>
          </div>
        </AppDialogContent>
      </Dialog>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard title="Total" value={metrics?.total ?? total} icon={Bell} tone="blue" />
        <MetricCard title="Unread" value={Number(metrics?.unread ?? 0)} icon={Inbox} tone="amber" />
        <MetricCard title="Read" value={Number(metrics?.read ?? 0)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Archived" value={Number(metrics?.archived ?? 0)} icon={Archive} tone="slate" />
        <MetricCard title="New (30d)" value={Number(metrics?.last30d ?? 0)} icon={Calendar} tone="violet" />
        <MetricCard title="Users" value={metrics?.distinctUsers != null ? Number(metrics.distinctUsers) : (scope === 'all' ? 0 : '—')} icon={Users} tone="rose" />
        <MetricCard title="Read rate" value={`${Number(metrics?.readRate ?? 0)}%`} icon={Percent} tone="emerald" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Button variant="outline" onClick={() => void fetchNotifications()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => void printSelectedNotifications()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllNotifications()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {scope !== "all" && (
            <Button variant="secondary" onClick={() => void markAllRead()} disabled={loading}>
              Mark all read
            </Button>
          )}
          <Button onClick={() => setOpen(true)} disabled={loading}>
            Send to Role
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchNotifications()}
            className="h-9 w-full sm:w-64 flex-1 min-w-[180px]"
          />
          <Select value={scope} onValueChange={(v) => setScope(v as any)}>
            <SelectTrigger className="h-9 w-full sm:w-[170px]"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">My notifications</SelectItem>
              <SelectItem value="all">All users</SelectItem>
            </SelectContent>
          </Select>
          {scope !== "all" && (
            <Select value={status} onValueChange={(v) => setStatus(v || undefined)}>
              <SelectTrigger className="h-9 w-full sm:w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Type (e.g. system_alert)"
            value={type || ""}
            onChange={(e) => setType(e.target.value || undefined)}
            className="h-9 w-full sm:w-72 flex-1 min-w-[200px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <FormModal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : setOpen(false))}
        title="Send Notification to Role"
        className="sm:max-w-lg"
        submitting={submitting}
        submitText="Send"
        onSubmit={handleSend}
      >
        <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Checkbox id="all-users" checked={allUsers} onCheckedChange={(v) => setAllUsers(Boolean(v))} />
              <Label htmlFor="all-users">All users</Label>
            </div>
            {!allUsers && (
              <div className="grid gap-2">
                <Label>Select roles</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedRoleSlugs.includes(r.slug)}
                        onCheckedChange={(v) =>
                          setSelectedRoleSlugs((prev) => (Boolean(v) ? Array.from(new Set([...prev, r.slug])) : prev.filter((s) => s !== r.slug)))
                        }
                      />
                      {r.name} <span className="text-muted-foreground">({r.slug})</span>
                    </label>
                  ))}
                </div>
                {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles loaded. Ensure you have permission to list roles.</span>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_alert">system_alert</SelectItem>
                    <SelectItem value="promotional">promotional</SelectItem>
                    <SelectItem value="order_created">order_created</SelectItem>
                    <SelectItem value="order_updated">order_updated</SelectItem>
                    <SelectItem value="order_shipped">order_shipped</SelectItem>
                    <SelectItem value="order_delivered">order_delivered</SelectItem>
                    <SelectItem value="product_review">product_review</SelectItem>
                    <SelectItem value="low_stock">low_stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action URL (optional)</Label>
                <Input value={form.actionUrl} onChange={(e) => setForm({ ...form, actionUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-32" />
            </div>
          </div>
      </FormModal>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete notification"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.title || deleteTarget.id}\".` : "This will permanently delete the selected notification."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
