"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Eye, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  ordersCount?: number;
  totalSpent?: number;
  avgOrderValue?: number;
  lastOrderAt?: string | Date | null;
};

export function getCustomerColumns(actions: {
  onView: (row: CustomerRow) => void;
  onDelete: (row: CustomerRow) => void;
}, opts?: { currency?: string }): ColumnDef<CustomerRow>[] {
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
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.firstName || row.original.lastName
              ? `${row.original.firstName ?? ""} ${row.original.lastName ?? ""}`.trim()
              : row.original.email}
          </span>
          <span className="text-muted-foreground text-xs">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="active" value={row.original.isActive} label={row.original.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      accessorKey: "ordersCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }) => <span className="text-sm">{row.original.ordersCount ?? 0}</span>,
    },
    {
      accessorKey: "totalSpent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Spent" />,
      cell: ({ row }) => {
        const v = Number(row.original.totalSpent ?? 0);
        const c = opts?.currency || "CAD";
        return <span className="text-sm">{formatCurrency(v, { currency: c, locale: "en-CA" })}</span>;
      },
    },
    {
      accessorKey: "avgOrderValue",
      header: ({ column }) => <DataTableColumnHeader column={column} title="AOV" />,
      cell: ({ row }) => {
        const v = Number(row.original.avgOrderValue ?? 0);
        const c = opts?.currency || "CAD";
        return <span className="text-sm">{formatCurrency(v, { currency: c, locale: "en-CA" })}</span>;
      },
    },
    {
      accessorKey: "lastOrderAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last order" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.lastOrderAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.lastOrderAt} /></span>
        </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onView(row.original);
            }}
          >
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDelete(row.original);
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
