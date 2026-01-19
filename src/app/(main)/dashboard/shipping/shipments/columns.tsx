"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";
import { UniversalBadge } from "@/components/common/universal-badge";

export type ShipmentRow = {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  shippingMethodId?: string | null;
  methodName?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  status: string;
  shippedAt?: string | Date | null;
  estimatedDeliveryAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  createdAt: string | Date;
};

export function getShipmentColumns(actions: { onEdit: (row: ShipmentRow) => void; onDelete: (row: ShipmentRow) => void }): ColumnDef<ShipmentRow>[] {
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
      accessorKey: "orderNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">#{row.original.orderNumber || "—"}</span>
          <span className="text-muted-foreground text-xs">{row.original.methodName || "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "trackingNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tracking" />,
      cell: ({ row }) => <span className="text-sm">{row.original.trackingNumber || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="status" value={row.original.status} label={String(row.original.status || "").toUpperCase()} />,
    },
    {
      accessorKey: "shippedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shipped" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.shippedAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.shippedAt} /></span>
        </div>
      ),
    },
    {
      accessorKey: "estimatedDeliveryAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ETA" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm"><LocalDate value={row.original.estimatedDeliveryAt} /></span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.onEdit(row.original)}>
            <Pencil className="mr-1 h-4 w-4" /> Update
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
