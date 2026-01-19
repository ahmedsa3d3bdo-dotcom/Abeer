"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

export type AdminSessionRow = {
  id: string;
  userEmail: string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string | Date;
  createdAt: string | Date;
  revokedAt: string | Date | null;
};

export function getAdminSessionColumns(actions: { onRevoke: (row: AdminSessionRow) => void }): ColumnDef<AdminSessionRow>[] {
  return [
    {
      accessorKey: "userEmail",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.userName || row.original.userEmail}</span>
          <span className="text-muted-foreground text-xs">{row.original.userEmail}</span>
        </div>
      ),
    },
    {
      accessorKey: "ipAddress",
      header: ({ column }) => <DataTableColumnHeader column={column} title="IP" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.ipAddress || "-"}</span>,
    },
    {
      accessorKey: "userAgent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Device" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground" title={row.original.userAgent || ""}>
          {(row.original.userAgent || "-").slice(0, 40)}
          {(row.original.userAgent || "").length > 40 ? "…" : ""}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "lastSeenAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last seen" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.lastSeenAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.lastSeenAt} /></span>
        </div>
      ),
    },
    {
      accessorKey: "revokedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.revokedAt ? "secondary" : "default"} className={row.original.revokedAt ? "" : "bg-green-600"}>
          {row.original.revokedAt ? "Revoked" : "Active"}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => actions.onRevoke(row.original)} disabled={!!row.original.revokedAt}>
            Revoke
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
