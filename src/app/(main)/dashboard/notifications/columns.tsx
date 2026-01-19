"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CheckCircle2, Archive, Trash2, Eye } from "lucide-react";

export function displayNotificationTitle(input: { type?: string; title?: string }) {
  const title = String(input.title || "");
  const type = String(input.type || "");
  if (type !== "system_alert") return title;
  return title
    .replace(/\s*\(\d{4}-\d{2}-\d{2}T[^)]*Z\)\s*$/i, "")
    .replace(/\s*\(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}Z\)\s*$/i, "")
    .replace(/\s*-\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\s*$/i, "");
}

export type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  status: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  createdAt: string | Date;
};

export function getNotificationColumns(actions: {
  onView: (row: NotificationRow) => void;
  onMarkRead: (row: NotificationRow) => void;
  onArchive: (row: NotificationRow) => void;
  onDelete: (row: NotificationRow) => void;
}): ColumnDef<NotificationRow>[] {
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
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium whitespace-normal break-words">{displayNotificationTitle({ type: row.original.type, title: row.original.title })}</span>
          <span className="text-muted-foreground text-xs whitespace-normal break-words">{row.original.message}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <UniversalBadge kind="type" value={row.original.type} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="status" value={row.original.status} label={String(row.original.status || "").toUpperCase()} />,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.createdAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.createdAt} /></span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.onView(row.original)}>
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.onMarkRead(row.original)} disabled={row.original.status !== "unread"}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Read
          </Button>
          <Button variant="secondary" size="sm" onClick={() => actions.onArchive(row.original)} disabled={row.original.status === "archived"}>
            <Archive className="mr-1 h-4 w-4" /> Archive
          </Button>
          <Button variant="destructive" size="sm" onClick={() => actions.onDelete(row.original)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export type BroadcastRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  target: string; // roles or All users
  count: number; // recipients count
  targetedCount?: number;
  createdCount?: number;
  createdAt: string | Date;
};

export function getBroadcastColumns(): ColumnDef<BroadcastRow>[] {
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
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />, 
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium whitespace-normal break-words">{displayNotificationTitle({ type: row.original.type, title: row.original.title })}</span>
          <span className="text-muted-foreground text-xs whitespace-normal break-words">{row.original.message}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />, 
      cell: ({ row }) => <UniversalBadge kind="type" value={row.original.type} />,
    },
    {
      accessorKey: "target",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />, 
      cell: ({ row }) => <span className="text-sm">{row.original.target}</span>,
    },
    {
      accessorKey: "count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sent" />, 
      cell: ({ row }) => {
        const targeted = typeof row.original.targetedCount === "number" ? row.original.targetedCount : null;
        const created = typeof row.original.createdCount === "number" ? row.original.createdCount : null;
        if (targeted != null && created != null && targeted > 0) {
          return <span className="text-sm">{created}/{targeted}</span>;
        }
        return <span className="text-sm">{row.original.count}</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />, 
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.createdAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.createdAt} /></span>
        </div>
      ),
    },
  ];
}
