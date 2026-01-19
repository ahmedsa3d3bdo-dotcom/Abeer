"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Trash2, Printer, FileText, AlertTriangle, XCircle, Layers } from "lucide-react";
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
import { usePrint } from "@/components/common/print/print-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getSystemLogColumns, type SystemLogRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function SystemLogsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SystemLogRow[]>([]);
  const [total, setTotal] = useState(0);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const [user, setUser] = useState("");
  const [path, setPath] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<SystemLogRow | null>(null);

  const levelOptions = useMemo(() => ["all", "error", "warn", "info", "debug"], []);
  const sourceOptions = useMemo(() => {
    const set = new Set<string>(["server", "client", "job"]);
    for (const r of items) {
      const s = String((r as any)?.source || "").trim();
      if (s) set.add(s);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const metrics = useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0, debug: 0 };
    const sources = new Set<string>();
    for (const r of items) {
      const lvl = String((r as any)?.level || "").toLowerCase();
      if (lvl === "error") counts.error += 1;
      else if (lvl === "warn" || lvl === "warning") counts.warn += 1;
      else if (lvl === "info") counts.info += 1;
      else if (lvl === "debug") counts.debug += 1;
      const src = String((r as any)?.source || "").trim();
      if (src) sources.add(src);
    }
    return {
      pageError: counts.error,
      pageWarn: counts.warn,
      pageInfo: counts.info,
      pageDebug: counts.debug,
      uniqueSources: sources.size,
    };
  }, [items]);

  const columns = useMemo(
    () =>
      getSystemLogColumns({
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

  useEffect(() => {
    void fetchLogs();
  }, [q, level, source, user, path, pageIndex, pageSize]);

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (level) params.set("level", level);
    if (source) params.set("source", source);
    if (user) params.set("user", user);
    if (path) params.set("path", path);
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllLogsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: SystemLogRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/system/logs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load system logs");

      const batch: SystemLogRow[] = (data.data?.items || []).map((r: any) => ({ ...r }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  function renderSystemLogsPrint(rows: SystemLogRow[], title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-2">Level</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-5">Message</div>
            <div className="col-span-3">Time</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-2">{String(r.level || "").toUpperCase()}</div>
              <div className="col-span-2">{r.source || "-"}</div>
              <div className="col-span-5">
                <div className="font-medium">{r.message}</div>
                <div className="text-xs text-muted-foreground">
                  {r.method ? `${r.method} ` : ""}
                  {r.path || ""}
                  {r.statusCode != null ? ` · ${r.statusCode}` : ""}
                </div>
              </div>
              <div className="col-span-3">{r.createdAt ? new Date(r.createdAt as any).toLocaleString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedLogs() {
    const selected = (table as any).getSelectedRowModel?.().rows?.map((r: any) => r.original as SystemLogRow) || [];
    if (!selected.length) {
      toast.error("Select at least one log to print");
      return;
    }
    void print(renderSystemLogsPrint(selected, "System Logs (Selected)"));
  }

  async function printAllLogs() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllLogsMatchingFilters();
      setPrintPreparing(false);
      void print(renderSystemLogsPrint(all, "System Logs"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  async function fetchLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (level) params.set("level", level);
      if (source) params.set("source", source);
      if (user) params.set("user", user);
      if (path) params.set("path", path);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");

      const res = await fetch(`/api/v1/system/logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load system logs");

      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(Number(data.data?.total || 0));
    } catch (e: any) {
      toast.error(e.message || "Failed to load system logs");
    } finally {
      setLoading(false);
    }
  }

  async function purgeRetention() {
    try {
      const res = await fetch(`/api/v1/system/logs`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to purge logs");
      toast.success(`Purged ${Number(data.data?.deleted || 0)} old logs`);
      void fetchLogs();
    } catch (e: any) {
      toast.error(e.message || "Failed to purge logs");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total logs" value={items.length.toLocaleString()} icon={FileText} tone="blue" />
        <MetricCard title="Errors (page)" value={metrics.pageError} icon={XCircle} tone="rose" />
        <MetricCard title="Warnings (page)" value={metrics.pageWarn} icon={AlertTriangle} tone="amber" />
        <MetricCard title="Sources (page)" value={metrics.uniqueSources} icon={Layers} tone="violet" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search message, stack, metadata" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="level">Level</Label>
            <Select value={level || "all"} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
              <SelectTrigger id="level" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x === "all" ? "All" : x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Source</Label>
            <Select value={source || "all"} onValueChange={(v) => setSource(v === "all" ? "" : v)}>
              <SelectTrigger id="source" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x === "all" ? "All" : x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user">User email</Label>
            <Input id="user" placeholder="e.g. admin@..." value={user} onChange={(e) => setUser(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="path">Path</Label>
            <Input id="path" placeholder="e.g. /api/v1/..." value={path} onChange={(e) => setPath(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchLogs()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedLogs()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllLogs()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="destructive" onClick={() => void purgeRetention()}>
            <Trash2 className="mr-1 h-4 w-4" /> Purge 90d+
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), setViewing(null)))}>
        <AppDialogContent
          title="System Log Details"
          description="Full log payload"
          className="sm:max-w-3xl"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!viewing) return;
                  void print(
                    <div className="p-6">
                      <div className="text-lg font-semibold">System Log Details</div>
                      <div className="mt-1 text-xs text-muted-foreground">{viewing.createdAt ? new Date(viewing.createdAt as any).toLocaleString() : ""}</div>
                      <div className="mt-4 grid gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Level</div>
                            <div className="mt-1 text-sm font-medium">{viewing.level}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Source</div>
                            <div className="mt-1 text-sm font-medium">{viewing.source}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">User</div>
                            <div className="mt-1 text-sm">{viewing.userEmail || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">IP</div>
                            <div className="mt-1 text-sm">{viewing.ipAddress || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Path</div>
                            <div className="mt-1 text-sm break-words">{viewing.path || "—"}</div>
                          </div>
                          <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Request ID</div>
                            <div className="mt-1 text-sm break-words">{viewing.requestId || "—"}</div>
                          </div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Message</div>
                          <div className="mt-2 whitespace-pre-wrap text-sm">{viewing.message || "—"}</div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Stack</div>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.stack ? String(viewing.stack) : "-"}</pre>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">Metadata</div>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.metadata && Object.keys(viewing.metadata).length ? JSON.stringify(viewing.metadata, null, 2) : "{}"}</pre>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-xs text-muted-foreground">User Agent</div>
                          <div className="mt-2 whitespace-pre-wrap break-words text-xs">{viewing.userAgent || "-"}</div>
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
                  <div className="text-xs text-muted-foreground">Level</div>
                  <div className="mt-1 font-medium break-words">{viewing.level}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="mt-1 font-medium break-words">{viewing.source}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="mt-1 font-medium break-words">{viewing.userEmail || "-"}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">IP</div>
                  <div className="mt-1 font-medium break-words">{viewing.ipAddress || "-"}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Path</div>
                  <div className="mt-1 font-medium break-words">{viewing.path || "-"}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Request ID</div>
                  <div className="mt-1 font-medium break-words">{viewing.requestId || "-"}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Stack</div>
                <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                  {viewing.stack ? String(viewing.stack) : "-"}
                </pre>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Metadata</div>
                <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                  {viewing.metadata && Object.keys(viewing.metadata).length ? JSON.stringify(viewing.metadata, null, 2) : "{}"}
                </pre>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">User Agent</div>
                <pre className="max-h-40 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                  {viewing.userAgent || "-"}
                </pre>
              </div>
            </div>
          ) : null}
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
