"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, FileText, PlusSquare, Edit3, Trash2, LogIn, LogOut, Users, Layers, Calendar, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
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

import { getAuditColumns, type AuditRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AuditRow | null>(null);

  const actionOptions = useMemo(
    () => ["all", "create", "update", "delete", "login", "logout"],
    [],
  );

  const columns = useMemo(
    () =>
      getAuditColumns({
        onView: (row) => {
          setViewing(row);
          setOpen(true);
        },
      }),
    [],
  );

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
    if (resource) params.set("resource", resource);
    if (action) params.set("action", action);
    if (user) params.set("user", user);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllAuditsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: AuditRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/audit?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load audit logs");
      const batch: AuditRow[] = (data.data?.items || []).map((r: any) => ({ ...r }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  function renderAuditPrint(rows: AuditRow[], title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-2">Action</div>
            <div className="col-span-3">Resource</div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">IP</div>
            <div className="col-span-2">Date</div>
          </div>
          {rows.map((a) => (
            <div key={a.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-2 capitalize">{a.action}</div>
              <div className="col-span-3">
                <div className="font-medium">{a.resource}</div>
                <div className="text-xs text-muted-foreground">{a.resourceId || "—"}</div>
              </div>
              <div className="col-span-3">{a.userEmail || "-"}</div>
              <div className="col-span-2">{a.ipAddress || "-"}</div>
              <div className="col-span-2">{a.createdAt ? new Date(a.createdAt as any).toLocaleString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedAudits() {
    const selected = (table as any).getSelectedRowModel?.().rows?.map((r: any) => r.original as AuditRow) || [];
    if (!selected.length) {
      toast.error("Select at least one audit log to print");
      return;
    }
    void print(renderAuditPrint(selected, "Audit Logs (Selected)"));
  }

  async function printAllAudits() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllAuditsMatchingFilters();
      setPrintPreparing(false);
      void print(renderAuditPrint(all, "Audit Logs"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  useEffect(() => {
    void fetchAudits();
    void fetchMetrics();
  }, [q, resource, action, user, pageIndex, pageSize]);

  async function fetchAudits() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (resource) params.set("resource", resource);
      if (action) params.set("action", action);
      if (user) params.set("user", user);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/audit?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load audit logs");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (resource) params.set("resource", resource);
      if (action) params.set("action", action);
      if (user) params.set("user", user);
      const res = await fetch(`/api/v1/audit/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-9">
        <MetricCard title="Total logs" value={metrics?.totalLogs ?? total} icon={FileText} tone="blue" />
        <MetricCard title="Create" value={Number(metrics?.createCount ?? 0)} icon={PlusSquare} tone="emerald" />
        <MetricCard title="Update" value={Number(metrics?.updateCount ?? 0)} icon={Edit3} tone="violet" />
        <MetricCard title="Delete" value={Number(metrics?.deleteCount ?? 0)} icon={Trash2} tone="rose" />
        <MetricCard title="Login" value={Number(metrics?.loginCount ?? 0)} icon={LogIn} tone="amber" />
        <MetricCard title="Logout" value={Number(metrics?.logoutCount ?? 0)} icon={LogOut} tone="slate" />
        <MetricCard title="New (30d)" value={Number(metrics?.last30dCount ?? 0)} icon={Calendar} tone="blue" />
        <MetricCard title="Users" value={Number(metrics?.distinctUsers ?? 0)} icon={Users} tone="emerald" />
        <MetricCard title="Resources" value={Number(metrics?.distinctResources ?? 0)} icon={Layers} tone="violet" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search IP or user agent" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource">Resource</Label>
            <Input id="resource" placeholder="e.g. role, permission" value={resource} onChange={(e) => setResource(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action">Action</Label>
            <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
              <SelectTrigger id="action" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "all" ? "All" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user">User email</Label>
            <Input id="user" placeholder="e.g. admin@..." value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchAudits()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedAudits()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllAudits()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), setViewing(null)))}>
        <AppDialogContent
          title="Audit Details"
          description="Action, resource, and change payload"
          className="sm:max-w-3xl"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!viewing) return;
                  void print(
                    <div className="p-6">
                      <div className="text-lg font-semibold">Audit Details</div>
                      <div className="mt-1 text-xs text-muted-foreground">{viewing.createdAt ? new Date(viewing.createdAt as any).toLocaleString() : ""}</div>
                      <div className="mt-4 grid gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Action</div>
                            <div className="mt-1 text-sm font-medium capitalize">{viewing.action}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Resource</div>
                            <div className="mt-1 text-sm font-medium">{viewing.resource}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{viewing.resourceId || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">User</div>
                            <div className="mt-1 text-sm">{viewing.userEmail || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">IP</div>
                            <div className="mt-1 text-sm">{viewing.ipAddress || "—"}</div>
                          </div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Changes</div>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.changes && Object.keys(viewing.changes).length ? JSON.stringify(viewing.changes, null, 2) : "{}"}</pre>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Metadata</div>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.metadata && Object.keys(viewing.metadata).length ? JSON.stringify(viewing.metadata, null, 2) : "{}"}</pre>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">User Agent</div>
                          <div className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.userAgent || "—"}</div>
                        </div>
                      </div>
                    </div>,
                  );
                }}
                disabled={loading || isPrinting || printPreparing || !viewing}
              >
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </div>
          }
        >
          {viewing ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Action</div>
                  <div className="mt-1 font-medium break-words capitalize">{viewing.action}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Resource</div>
                  <div className="mt-1 font-medium break-words">{viewing.resource}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="mt-1 font-medium break-words">{viewing.userEmail || "-"}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">IP</div>
                  <div className="mt-1 font-medium break-words">{viewing.ipAddress || "-"}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Changes</div>
                <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                  {viewing.changes && Object.keys(viewing.changes).length ? JSON.stringify(viewing.changes, null, 2) : "{} (no changes recorded)"}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Metadata</div>
                <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                  {viewing.metadata && Object.keys(viewing.metadata).length ? JSON.stringify(viewing.metadata, null, 2) : "{} (no metadata recorded)"}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">User Agent</div>
                <pre className="max-h-40 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">{viewing.userAgent || "-"}</pre>
              </div>
            </div>
          ) : null}
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
