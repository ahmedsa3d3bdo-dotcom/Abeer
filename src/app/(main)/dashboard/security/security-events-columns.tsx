"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { Eye } from "lucide-react";

export type SecurityEventRow = {
  id: string;
  action: string;
  resource: string;
  ipAddress?: string | null;
  userEmail?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
  metadata?: any;
  changes?: any;
};

function titleFor(row: SecurityEventRow) {
  const kind = String(row?.metadata?.kind || "").trim();
  if (kind === "origin_block") return "Origin blocked";
  if (kind === "origin_invalid") return "Invalid origin";
  if (kind === "rate_limit_block") return "Rate limit blocked";
  if (kind === "login_failed") return "Login failed";
  if (kind === "login_lockout") return "Login lockout";
  if (row.action === "settings_change") return "Security settings changed";
  return "Security event";
}

function detailFor(row: SecurityEventRow) {
  const kind = String(row?.metadata?.kind || "").trim();
  if (kind === "origin_block") {
    const target = String(row?.metadata?.target || "");
    const origin = String(row?.metadata?.origin || "");
    return `${target}${origin ? ` · ${origin}` : ""}`;
  }
  if (kind === "origin_invalid") {
    const target = String(row?.metadata?.target || "");
    return target;
  }
  if (kind === "rate_limit_block") {
    const target = String(row?.metadata?.target || "");
    const limit = row?.metadata?.limit;
    const windowSec = row?.metadata?.windowSec;
    if (Number.isFinite(limit) && Number.isFinite(windowSec)) return `${target} · ${limit}/${windowSec}s`;
    return target;
  }
  if (kind === "login_failed") {
    const hint = String(row?.metadata?.emailHint || "");
    return hint ? `email: ${hint}` : "";
  }
  if (kind === "login_lockout") {
    const phase = String(row?.metadata?.phase || "");
    const scope = String(row?.metadata?.scope || "");
    const hint = String(row?.metadata?.emailHint || "");
    const parts = [phase && `phase: ${phase}`, scope && `scope: ${scope}`, hint && `email: ${hint}`].filter(Boolean);
    return parts.join(" · ");
  }
  return "";
}

export function getSecurityEventColumns(actions?: { onView?: (row: SecurityEventRow) => void }): ColumnDef<SecurityEventRow>[] {
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
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "metadata",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Event" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{titleFor(row.original)}</span>
          <span className="text-muted-foreground text-xs">{detailFor(row.original) || row.original.action}</span>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "userEmail",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actor" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.userEmail || "-"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "ipAddress",
      header: ({ column }) => <DataTableColumnHeader column={column} title="IP" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.ipAddress || "-"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm">
            <LocalDate value={row.original.createdAt} />
          </span>
          <span className="text-muted-foreground text-xs">
            <LocalTime value={row.original.createdAt} />
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => actions?.onView?.(row.original)}>
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
