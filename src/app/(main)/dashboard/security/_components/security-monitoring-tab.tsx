import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { Printer, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { toast } from "sonner";
import { usePrint } from "@/components/common/print/print-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { clampInt, type SecuritySettings } from "./security-shared";

import { getSecurityEventColumns, type SecurityEventRow } from "../security-events-columns";

export function SecurityMonitoringTab(props: {
  settings: SecuritySettings;
  setSettings: Dispatch<SetStateAction<SecuritySettings>>;
  disabled: boolean;
}) {
  const { settings, setSettings, disabled } = props;

  const [testingAlert, setTestingAlert] = useState(false);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsQ, setEventsQ] = useState("");
  const [eventsAction, setEventsAction] = useState("");
  const [eventsPageIndex, setEventsPageIndex] = useState(0);
  const [eventsPageSize, setEventsPageSize] = useState(10);

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsViewing, setEventsViewing] = useState<SecurityEventRow | null>(null);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  const emailsText = useMemo(() => {
    const list = settings.monitoring.notifications.emails || [];
    return list.join("\n");
  }, [settings.monitoring.notifications.emails]);

  const eventsColumns = useMemo(
    () =>
      getSecurityEventColumns({
        onView: (row) => {
          setEventsViewing(row);
          setEventsOpen(true);
        },
      }),
    [],
  );

  const eventsTable = useDataTableInstance({
    data: events,
    columns: eventsColumns,
    manualPagination: true,
    defaultPageIndex: eventsPageIndex,
    defaultPageSize: eventsPageSize,
    pageCount: Math.max(1, Math.ceil(eventsTotal / Math.max(1, eventsPageSize))),
    getRowId: (row) => row.id,
    onPaginationChange: ({ pageIndex: pi, pageSize: ps }) => {
      setEventsPageIndex(pi);
      setEventsPageSize(ps);
    },
  });

  async function fetchEvents() {
    try {
      setEventsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(eventsPageIndex + 1));
      params.set("limit", String(eventsPageSize));
      params.set("sort", "createdAt.desc");
      if (eventsQ) params.set("q", eventsQ);
      if (eventsAction) params.set("action", eventsAction);
      const res = await fetch(`/api/v1/security/logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load security events");
      setEvents((data.data?.items || []) as any);
      setEventsTotal(Number(data.data?.total || 0));
    } catch (e: any) {
      toast.error(e.message || "Failed to load security events");
    } finally {
      setEventsLoading(false);
    }

  }

  async function testAlert() {
    try {
      setTestingAlert(true);
      const res = await fetch("/api/v1/security/test-alert", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Failed to send test alert");
      toast.success(`Test alert sent${typeof data?.data?.emailsCount === "number" ? ` (emails: ${data.data.emailsCount})` : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send test alert");
    } finally {
      setTestingAlert(false);
    }
  }

  function getEventsListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    params.set("sort", "createdAt.desc");
    if (eventsQ) params.set("q", eventsQ);
    if (eventsAction) params.set("action", eventsAction);
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllEventsMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: SecurityEventRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getEventsListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/security/logs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load security events");

      const batch: SecurityEventRow[] = (data.data?.items || []).map((r: any) => ({ ...r }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }

    return all;
  }

  function renderEventsPrint(rows: SecurityEventRow[], title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-4">Event</div>
            <div className="col-span-3">Actor</div>
            <div className="col-span-2">IP</div>
            <div className="col-span-3">Time</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-4">
                <div className="font-medium">{String(r?.metadata?.kind || r.action || "Security event")}</div>
                <div className="text-xs text-muted-foreground">{r.action}</div>
              </div>
              <div className="col-span-3">{r.userEmail || "-"}</div>
              <div className="col-span-2">{r.ipAddress || "-"}</div>
              <div className="col-span-3">{r.createdAt ? new Date(r.createdAt as any).toLocaleString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedEvents() {
    const selected = (eventsTable as any).getSelectedRowModel?.().rows?.map((r: any) => r.original as SecurityEventRow) || [];
    if (!selected.length) {
      toast.error("Select at least one security event to print");
      return;
    }
    void print(renderEventsPrint(selected, "Security Events (Selected)"));
  }

  async function printAllEvents() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllEventsMatchingFilters();
      setPrintPreparing(false);
      void print(renderEventsPrint(all, "Security Events"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  useEffect(() => {
    void fetchEvents();
  }, [eventsQ, eventsAction, eventsPageIndex, eventsPageSize]);

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Alert rules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Rate limit spikes</div>
                <div className="text-xs text-muted-foreground">Blocked requests within 5 minutes</div>
              </div>
              <Switch
                checked={settings.monitoring.alerts.rateLimitSpikes.enabled}
                disabled={disabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: { ...s.monitoring, alerts: { ...s.monitoring.alerts, rateLimitSpikes: { ...s.monitoring.alerts.rateLimitSpikes, enabled: Boolean(v) } } },
                  }))
                }
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <Label>Threshold (5m)</Label>
              <Input
                type="number"
                disabled={disabled}
                value={settings.monitoring.alerts.rateLimitSpikes.threshold5m}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: {
                      ...s.monitoring,
                      alerts: {
                        ...s.monitoring.alerts,
                        rateLimitSpikes: {
                          ...s.monitoring.alerts.rateLimitSpikes,
                          threshold5m: clampInt(e.target.value, 1, 100000, s.monitoring.alerts.rateLimitSpikes.threshold5m),
                        },
                      },
                    },
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Repeated login failures</div>
                <div className="text-xs text-muted-foreground">Login failures within 5 minutes</div>
              </div>
              <Switch
                checked={settings.monitoring.alerts.repeatedLoginFailures.enabled}
                disabled={disabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: { ...s.monitoring, alerts: { ...s.monitoring.alerts, repeatedLoginFailures: { ...s.monitoring.alerts.repeatedLoginFailures, enabled: Boolean(v) } } },
                  }))
                }
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <Label>Threshold (5m)</Label>
              <Input
                type="number"
                disabled={disabled}
                value={settings.monitoring.alerts.repeatedLoginFailures.threshold5m}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: {
                      ...s.monitoring,
                      alerts: {
                        ...s.monitoring.alerts,
                        repeatedLoginFailures: {
                          ...s.monitoring.alerts.repeatedLoginFailures,
                          threshold5m: clampInt(e.target.value, 1, 100000, s.monitoring.alerts.repeatedLoginFailures.threshold5m),
                        },
                      },
                    },
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Origin blocks</div>
                <div className="text-xs text-muted-foreground">Blocked origins within 5 minutes</div>
              </div>
              <Switch
                checked={settings.monitoring.alerts.originBlocks.enabled}
                disabled={disabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: { ...s.monitoring, alerts: { ...s.monitoring.alerts, originBlocks: { ...s.monitoring.alerts.originBlocks, enabled: Boolean(v) } } },
                  }))
                }
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <Label>Threshold (5m)</Label>
              <Input
                type="number"
                disabled={disabled}
                value={settings.monitoring.alerts.originBlocks.threshold5m}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    monitoring: {
                      ...s.monitoring,
                      alerts: {
                        ...s.monitoring.alerts,
                        originBlocks: {
                          ...s.monitoring.alerts.originBlocks,
                          threshold5m: clampInt(e.target.value, 1, 100000, s.monitoring.alerts.originBlocks.threshold5m),
                        },
                      },
                    },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Notification targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={() => void testAlert()} disabled={disabled || testingAlert}>
              Test alert
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Admin notifications</div>
              <div className="text-xs text-muted-foreground">Send alerts to admin in-app notifications</div>
            </div>
            <Switch
              checked={settings.monitoring.notifications.inAppAdmins}
              disabled={disabled}
              onCheckedChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  monitoring: { ...s.monitoring, notifications: { ...s.monitoring.notifications, inAppAdmins: Boolean(v) } },
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Email targets (one per line)</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={disabled}
              value={emailsText}
              onChange={(e) => {
                const raw = String(e.target.value || "");
                const emails = raw
                  .split(/\r?\n/)
                  .map((x) => x.trim())
                  .filter(Boolean);
                setSettings((s) => ({
                  ...s,
                  monitoring: { ...s.monitoring, notifications: { ...s.monitoring.notifications, emails } },
                }));
              }}
              placeholder="security@example.com"
            />
            <div className="text-xs text-muted-foreground">This stores targets for future alert delivery. It does not send emails yet.</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Recent security events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="security-events-q">Search</Label>
                <Input id="security-events-q" placeholder="Search…" value={eventsQ} onChange={(e) => setEventsQ(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="security-events-action">Action</Label>
                <Input
                  id="security-events-action"
                  placeholder="e.g. settings_change"
                  value={eventsAction}
                  onChange={(e) => setEventsAction(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void fetchEvents()} disabled={eventsLoading}>
                <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={eventsLoading || printPreparing || isPrinting}>
                    <Printer className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Print
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void printSelectedEvents()}>Print selected</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void printAllEvents()}>Print all (matching filters)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <DataTable table={eventsTable as any} columns={eventsColumns as any} />
          </div>
          <DataTablePagination
            table={eventsTable as any}
            total={eventsTotal}
            pageIndex={eventsPageIndex}
            pageSize={eventsPageSize}
          />

          <Dialog open={eventsOpen} onOpenChange={(o) => (o ? setEventsOpen(true) : (setEventsOpen(false), setEventsViewing(null)))}>
            <AppDialogContent
              title="Security Event"
              description="Event details"
              className="sm:max-w-3xl"
              footer={
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!eventsViewing) return;
                      void print(
                        <div className="p-6">
                          <div className="text-lg font-semibold">Security Event</div>
                          <div className="mt-1 text-xs text-muted-foreground">{eventsViewing.createdAt ? new Date(eventsViewing.createdAt as any).toLocaleString() : ""}</div>
                          <div className="mt-4 grid gap-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-md border p-4">
                                <div className="text-xs text-muted-foreground">Action</div>
                                <div className="mt-1 text-sm font-medium">{eventsViewing.action}</div>
                              </div>
                              <div className="rounded-md border p-4">
                                <div className="text-xs text-muted-foreground">Resource</div>
                                <div className="mt-1 text-sm font-medium">{eventsViewing.resource}</div>
                              </div>
                              <div className="rounded-md border p-4">
                                <div className="text-xs text-muted-foreground">Actor</div>
                                <div className="mt-1 text-sm">{eventsViewing.userEmail || "—"}</div>
                              </div>
                              <div className="rounded-md border p-4">
                                <div className="text-xs text-muted-foreground">IP</div>
                                <div className="mt-1 text-sm">{eventsViewing.ipAddress || "—"}</div>
                              </div>
                            </div>
                            <div className="rounded-md border p-4">
                              <div className="text-xs text-muted-foreground">User Agent</div>
                              <div className="mt-2 whitespace-pre-wrap break-words text-xs">{eventsViewing.userAgent || "—"}</div>
                            </div>
                            <div className="rounded-md border p-4">
                              <div className="text-xs text-muted-foreground">Metadata</div>
                              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{eventsViewing.metadata && Object.keys(eventsViewing.metadata).length ? JSON.stringify(eventsViewing.metadata, null, 2) : "{}"}</pre>
                            </div>
                            <div className="rounded-md border p-4">
                              <div className="text-xs text-muted-foreground">Changes</div>
                              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{eventsViewing.changes && Object.keys(eventsViewing.changes).length ? JSON.stringify(eventsViewing.changes, null, 2) : "{}"}</pre>
                            </div>
                          </div>
                        </div>,
                      );
                    }}
                    disabled={eventsLoading || isPrinting || printPreparing || !eventsViewing}
                  >
                    <Printer className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Print
                  </Button>
                </div>
              }
            >
              {eventsViewing ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">Action</div>
                      <div className="mt-1 font-medium break-words">{eventsViewing.action}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">Resource</div>
                      <div className="mt-1 font-medium break-words">{eventsViewing.resource}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">Actor</div>
                      <div className="mt-1 font-medium break-words">{eventsViewing.userEmail || "-"}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">IP</div>
                      <div className="mt-1 font-medium break-words">{eventsViewing.ipAddress || "-"}</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium">Metadata</div>
                    <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                      {eventsViewing.metadata && Object.keys(eventsViewing.metadata).length ? JSON.stringify(eventsViewing.metadata, null, 2) : "{}"}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium">Changes</div>
                    <pre className="max-h-64 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">
                      {eventsViewing.changes && Object.keys(eventsViewing.changes).length ? JSON.stringify(eventsViewing.changes, null, 2) : "{}"}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium">User Agent</div>
                    <pre className="max-h-40 overflow-auto overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-3 text-xs">{eventsViewing.userAgent || "-"}</pre>
                  </div>
                </div>
              ) : null}
            </AppDialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
