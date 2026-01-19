"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";

export type ShippingMethodRow = {
  id: string;
  name: string;
  code: string;
  carrier?: string | null;
  price: string;
  estimatedDays?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function getShippingMethodColumns(actions: { onEdit: (row: ShippingMethodRow) => void; onDelete: (row: ShippingMethodRow) => void }): ColumnDef<ShippingMethodRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.code}</span>
        </div>
      ),
    },
    {
      accessorKey: "carrier",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Carrier" />,
      cell: ({ row }) => <span className="text-sm">{row.original.carrier || "—"}</span>,
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => <span>${row.original.price}</span>,
    },
    {
      accessorKey: "estimatedDays",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ETA (days)" />,
      cell: ({ row }) => <span className="text-sm">{row.original.estimatedDays ?? "—"}</span>,
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>{row.original.isActive ? "Active" : "Inactive"}</Badge>
      ),
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
