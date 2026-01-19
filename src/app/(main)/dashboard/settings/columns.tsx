"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";

export type SettingRow = {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function getSettingColumns(params: {
  actions: { onEdit: (row: SettingRow) => void; onDelete: (row: SettingRow) => void };
}): ColumnDef<SettingRow>[] {
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
      accessorKey: "key",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Key" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.key}</span>
          {row.original.description ? (
            <span className="text-muted-foreground text-xs">{row.original.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => (
        <div
          className="max-w-[320px] min-w-0 truncate text-muted-foreground"
        >
          {row.original.value}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <UniversalBadge kind="type" value={row.original.type} label={String(row.original.type || "").toUpperCase()} />,
    },
    {
      accessorKey: "isPublic",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Visibility" />,
      cell: ({ row }) => <UniversalBadge kind="visibility" value={row.original.isPublic ? "public" : "private"} />,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.updatedAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.updatedAt} /></span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => params.actions.onEdit(row.original)}>
            <Pencil className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => params.actions.onDelete(row.original)}>
            <Trash2 className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
