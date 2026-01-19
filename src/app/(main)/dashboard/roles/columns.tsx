"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { UniversalBadge } from "@/components/common/universal-badge";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";

export type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string | Date;
  permissions: Array<{ id: string; name: string; slug: string; resource: string; action: string }>;
};

export function getRoleColumns(actions: {
  onEdit: (row: RoleRow) => void;
  onDelete: (row: RoleRow) => void;
}): ColumnDef<RoleRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium capitalize">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: "isSystem",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <UniversalBadge kind="type" value={row.original.isSystem ? "system" : "custom"} />
      ),
    },
    {
      accessorKey: "permissions",
      header: () => <div>Permissions</div>,
      cell: ({ row }) => (
        <div className="flex max-w-[520px] flex-wrap gap-1">
          {(row.original.permissions || []).slice(0, 6).map((p) => (
            <UniversalBadge
              key={p.slug}
              kind="action"
              value={p.action}
              label={`${p.resource}.${p.action}`}
            />
          ))}
          {(row.original.permissions || []).length > 6 ? (
            <UniversalBadge
              kind="type"
              value="more"
              label={`+${(row.original.permissions || []).length - 6}`}
            />
          ) : null}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
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
          <Button variant="outline" size="sm" onClick={() => actions.onEdit(row.original)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => actions.onDelete(row.original)} disabled={row.original.isSystem}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
