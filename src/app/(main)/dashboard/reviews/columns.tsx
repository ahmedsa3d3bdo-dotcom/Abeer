"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Eye } from "lucide-react";

export type ReviewRow = {
  id: string;
  productId: string;
  productName: string;
  userId?: string | null;
  userName?: string | null;
  orderId?: string | null;
  rating: number;
  title?: string | null;
  content: string;
  isApproved: boolean;
  helpfulCount: number;
  reportCount: number;
  createdAt: string | Date;
};

export function getReviewColumns(actions: {
  onView: (row: ReviewRow) => void;
  onApprove: (row: ReviewRow) => void;
  onReject: (row: ReviewRow) => void;
  onDelete: (row: ReviewRow) => void;
}): ColumnDef<ReviewRow>[] {
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
      accessorKey: "productName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.productName}</span>
          <span className="text-muted-foreground text-xs">Rating: {row.original.rating}★</span>
        </div>
      ),
    },
    {
      accessorKey: "userName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.userName || "—"}</span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => <span className="text-sm">{row.original.title || "—"}</span>,
    },
    {
      accessorKey: "isApproved",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <UniversalBadge
          kind="status"
          value={row.original.isApproved ? "approved" : "pending"}
          label={row.original.isApproved ? "APPROVED" : "PENDING"}
        />
      ),
    },
    {
      accessorKey: "helpfulCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Helpful" />,
      cell: ({ row }) => <span className="text-sm">{row.original.helpfulCount}</span>,
    },
    {
      accessorKey: "reportCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reports" />,
      cell: ({ row }) => <span className="text-sm">{row.original.reportCount}</span>,
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
          {row.original.isApproved ? (
            <Button variant="outline" size="sm" onClick={() => actions.onReject(row.original)}>
              Reject
            </Button>
          ) : (
            <Button size="sm" onClick={() => actions.onApprove(row.original)}>
              Approve
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => actions.onDelete(row.original)}>
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
