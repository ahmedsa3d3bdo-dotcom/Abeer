"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2, CheckCircle2, PlayCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type RefundRow = {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  amount: string;
  currency: string;
  status: "pending" | "approved" | "rejected" | "processed" | string;
  reason?: string | null;
  processedAt?: string | Date | null;
  createdAt: string | Date;
};

export function getRefundColumns(actions: {
  onApprove: (row: RefundRow) => void;
  onProcess: (row: RefundRow) => void;
  onEdit: (row: RefundRow) => void;
  onDelete: (row: RefundRow) => void;
}): ColumnDef<RefundRow>[] {
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
      cell: ({ row }) => <span className="font-medium">{row.original.orderNumber || row.original.orderId}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const v = Number(row.original.amount ?? 0);
        const c = row.original.currency || "CAD";
        return <span>{formatCurrency(v, { currency: c, locale: "en-CA" })}</span>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <UniversalBadge kind="status" value={row.original.status} label={String(row.original.status || "").toUpperCase()} />
      ),
    },
    {
      accessorKey: "processedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Processed" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.processedAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.processedAt} /></span>
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
          <Button variant="outline" size="sm" onClick={() => actions.onApprove(row.original)} disabled={row.original.status !== "pending"}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.onProcess(row.original)} disabled={row.original.status !== "approved"}>
            <PlayCircle className="mr-1 h-4 w-4" /> Process
          </Button>
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
