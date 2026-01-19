"use client";

import { ColumnDef } from "@tanstack/react-table";

import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";

export type SystemLogRow = {
  id: string;
  level: string;
  source: string;
  message: string;
  stack?: string | null;
  requestId?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
};

export function getSystemLogColumns(actions?: { onView?: (row: SystemLogRow) => void }): ColumnDef<SystemLogRow>[] {
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
      accessorKey: "level",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Level" />,
      cell: ({ row }) => (
        <UniversalBadge
          kind="level"
          value={row.original.level}
          label={String(row.original.level || "").toUpperCase()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "source",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
      cell: ({ row }) => (
        <UniversalBadge kind="source" value={row.original.source || "-"} label={row.original.source || "-"} />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "message",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Message" />,
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[480px]">
          <span className="font-medium truncate" title={row.original.message}>
            {row.original.message}
          </span>
          <span
            className="text-muted-foreground text-xs truncate"
            title={`${row.original.method ? `${row.original.method} ` : ""}${row.original.path || ""}${row.original.statusCode != null ? ` · ${row.original.statusCode}` : ""}`}
          >
            {row.original.method ? `${row.original.method} ` : ""}
            {row.original.path || ""}
            {row.original.statusCode != null ? ` · ${row.original.statusCode}` : ""}
          </span>
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
            Details
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
