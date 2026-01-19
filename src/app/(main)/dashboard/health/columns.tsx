"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { Eye } from "lucide-react";

export type HealthRow = {
  id: string;
  service: string;
  status: string;
  responseTime?: number | null;
  error?: string | null;
  details?: Record<string, unknown> | null;
  checkedAt?: string | Date | null;
  createdAt: string | Date;
};

function statusLabel(status: string) {
  const raw = String(status || "").trim();
  if (!raw) return "Unknown";
  if (raw === "healthy") return "Healthy";
  if (raw === "degraded") return "Degraded";
  if (raw === "maintenance") return "Maintenance";
  if (raw === "skipped") return "Skipped";
  return raw;
}

function statusCardVariant(status: string) {
  if (status === "healthy") return "border-green-200";
  if (status === "degraded") return "border-yellow-200";
  if (status === "maintenance") return "border-slate-200";
  if (status === "skipped") return "border-slate-200";
  return "border-red-200";
}

function getObj(details: any, key: string): any | null {
  const v = details?.[key];
  if (!v) return null;
  if (typeof v !== "object") return null;
  return v;
}

function getHttpChecks(details: any): any[] {
  const v = details?.http;
  return Array.isArray(v) ? v : [];
}

function DetailsCell({ row }: { row: HealthRow }) {
  const isRtl = false;
  const [open, setOpen] = useState(false);
  const details: any = row.details || {};
  const db = getObj(details, "db");
  const fs = getObj(details, "fs");
  const redis = getObj(details, "redis");
  const smtp = getObj(details, "smtp");
  const proc = getObj(details, "process");
  const httpChecks = getHttpChecks(details);

  const cards: Array<{ key: string; title: string; data: any | null }> = [
    { key: "db", title: "Database", data: db },
    { key: "fs", title: "Filesystem", data: fs },
    { key: "redis", title: "Redis", data: redis },
    { key: "smtp", title: "SMTP", data: smtp },
    { key: "process", title: "Process", data: proc },
  ];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-1 h-4 w-4" /> View
        </Button>
      </DialogTrigger>
      <AppDialogContent
        dir={isRtl ? "rtl" : "ltr"}
        title="Health check details"
        className="w-[60vw] max-w-none sm:max-w-none"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className={statusCardVariant(String(row.status || ""))}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Overall</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <UniversalBadge kind="status" value={row.status} label={statusLabel(String(row.status || ""))} />
                <span className="text-sm text-muted-foreground">{row.service}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {row.responseTime ?? "-"} ms
              </div>
              {row.error ? (
                <div className="text-sm text-destructive">{row.error}</div>
              ) : (
                <div className="text-sm text-muted-foreground">OK</div>
              )}
            </CardContent>
          </Card>

          {cards.map((c) => {
            const st = String(c.data?.status || "unknown");
            const latency = c.data?.latencyMs ?? null;
            const err = c.data?.error ?? null;
            return (
              <Card key={c.key} className={statusCardVariant(st)}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UniversalBadge kind="status" value={st} label={statusLabel(st)} />
                    {latency != null ? <span className="text-sm text-muted-foreground">{latency} ms</span> : null}
                  </div>
                  {err ? (
                    <div className="text-sm text-destructive">{String(err)}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">OK</div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {httpChecks.length ? (
            <Card className="md:col-span-2">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">HTTP endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {httpChecks.map((h: any, i: number) => {
                    const st = String(h?.status || "unknown");
                    return (
                      <Card key={`${String(h?.url || i)}-${i}`} className={statusCardVariant(st)}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate" title={String(h?.url || "")}>{String(h?.url || "")}</div>
                            <UniversalBadge kind="status" value={st} label={statusLabel(st)} />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Latency: {h?.latencyMs ?? "-"} ms
                          </div>
                          {h?.httpStatus != null ? (
                            <div className="text-sm text-muted-foreground">HTTP: {h.httpStatus}</div>
                          ) : null}
                          {h?.error ? <div className="text-sm text-destructive">{String(h.error)}</div> : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}

export function getHealthColumns(): ColumnDef<HealthRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "service",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
      cell: ({ row }) => <span className="font-medium">{row.original.service}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <UniversalBadge kind="status" value={row.original.status} label={statusLabel(row.original.status)} />
      ),
    },
    {
      accessorKey: "responseTime",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Response (ms)" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.responseTime ?? "-"}</span>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Checked" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.createdAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.createdAt} /></span>
        </div>
      ),
    },
    {
      accessorKey: "error",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Error" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.original.error || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DetailsCell row={row.original} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
